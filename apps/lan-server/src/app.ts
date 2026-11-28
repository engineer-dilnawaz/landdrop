import { createHash, randomBytes } from "node:crypto";
import { hostname, networkInterfaces } from "node:os";
import type { Socket } from "node:net";
import { PassThrough, Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import type { z } from "zod";
import {
  ClientMessageSchema,
  GROUP_CHAT_ID,
  CreateGroupRequestSchema,
  CreateMessageRequestSchema,
  ForwardMessageRequestSchema,
  HISTORY_LIMIT,
  MAX_AVATAR_BYTES,
  MAX_FOLDER_LIST_BYTES,
  MAX_TEXT_LENGTH,
  MarkReadRequestSchema,
  PROTOCOL_VERSION,
  SubmitChecksumRequestSchema,
  UpdateChatMetaRequestSchema,
  UpdateGroupRequestSchema,
  previewKind,
  routes,
  type Attachment,
  type Device,
  type FolderFile,
  type Message,
  type NetworkDevice,
  type ServerEvent,
} from "@landrop/protocol";
import { ChatStore, HttpError } from "./chat.js";
import { LiveFiles, type TabKey } from "./live.js";
import { hardwareAddressOf, scanNetwork as scanHostNetwork } from "./network.js";
import { FolderIndex } from "./folder.js";
import { zipFolder } from "./zip.js";
import { isAllowedOrigin } from "./origin.js";

export interface AppOptions {
  dataDir: string;
  logger?: boolean;
  heartbeatMs?: number;
  /** Decides whether a remote address is the host machine; tests substitute their own. */
  isHost?: (address: string | undefined) => boolean;
  /** How long a disconnected tab's live files wait for it to reconnect before leaving the chat. */
  liveGraceMs?: number;
  /** The built web app. Served at "/", so devices open one address for both the app and the API. */
  webDir?: string;
  /** Lists the other devices on the host's network; tests substitute their own. */
  scanNetwork?: () => Promise<NetworkDevice[]>;
  /**
   * What identifies the phone or computer at an address, shared by all its browsers: by default its
   * Wi-Fi hardware address, or "host" for this machine. Tests substitute their own.
   */
  machineOf?: (address: string) => Promise<string | undefined>;
  /**
   * Called for each message a device other than the host sends to a chat the host takes part in,
   * so the host app can tell its user about it. `groupName` is set when the chat is a group.
   */
  onMessage?: (event: { message: Message; groupName?: string }) => void;
}

interface Session {
  device: Device;
  token: string;
  tab: TabKey;
  /** Where the device connects from, so network scans can leave out devices already using LANDrop. */
  address: string;
}

/**
 * Live files are fetched from the sender in pieces that start small, because players often read a
 * few KB and hang up, and double up to the maximum for sustained playback and downloads.
 * A viewer holds at most one piece in host memory.
 */
const LIVE_FIRST_PIECE_BYTES = 128 * 1024;
const LIVE_MAX_PIECE_BYTES = 2 * 1024 * 1024;

/** Network scans are reused this long, so everyone opening "Available devices" at once costs one scan. */
const NETWORK_SCAN_TTL_MS = 15_000;

type MessageParams = { id: string };

export async function buildApp({
  dataDir,
  logger = false,
  heartbeatMs = 15_000,
  isHost = isHostAddress,
  liveGraceMs = 10_000,
  webDir,
  scanNetwork = scanHostNetwork,
  machineOf = async (address) => (isHost(address) ? "host" : hardwareAddressOf(address)),
  onMessage,
}: AppOptions) {
  const app = Fastify({
    // Shutdown must not wait on a client that never finishes reading a response (e.g. a sleeping phone).
    forceCloseConnections: true,
    logger: logger && {
      // Download URLs carry the session token in the query string; keep it out of logs.
      serializers: {
        req: (req: FastifyRequest) => ({ method: req.method, url: req.url.split("?")[0], from: req.ip }),
      },
    },
  });

  /** One entry per open socket; a device may have several tabs open. */
  const sessions = new Map<WebSocket, Session>();
  const sessionByToken = new Map<string, Session>();
  /** Devices that have connected from the host machine itself, i.e. the host app's own chat window. */
  const hostDeviceIds = new Set<string>();

  const online = (): Device[] => [...new Map([...sessions.values()].map((s) => [s.device.id, s.device])).values()];
  /** Sends to every connected device, or only to the members of a private chat or group (plus any devices in `alsoTo`). */
  const broadcast = (event: ServerEvent, chatId: string = GROUP_CHAT_ID, alsoTo: string[] = []) => {
    const members = store.members(chatId) ?? [];
    const data = JSON.stringify(event);
    for (const [socket, session] of sessions) {
      if (members !== "everyone" && !members.includes(session.device.id) && !alsoTo.includes(session.device.id)) continue;
      if (socket.readyState === socket.OPEN) socket.send(data);
    }
  };

  // A browser that never sends a readable HTTP request never reaches a route. The usual cause is one
  // insisting on HTTPS (Chrome's "Always use secure connections"); log it so "the page won't load on
  // that phone" can be traced. Resets are just phones dropping idle connections, so they're skipped.
  // Runs before Fastify's own handler, which closes the socket and loses its address.
  app.server.prependListener("clientError", (err: NodeJS.ErrnoException, socket: Socket) => {
    if (err.code === "ECONNRESET") return;
    app.log.warn(
      { from: socket.remoteAddress, code: err.code },
      "unreadable request: is that browser forcing HTTPS? LANDrop serves plain HTTP on the local network",
    );
  });

  const store = await ChatStore.open(dataDir, broadcast);
  const sendToTab = (tab: TabKey, event: ServerEvent) => {
    for (const [socket, session] of sessions) {
      if (session.tab !== tab || socket.readyState !== socket.OPEN) continue;
      socket.send(JSON.stringify(event));
      return true;
    }
    return false;
  };
  const live = new LiveFiles(sendToTab, (id) => store.removeLive(id), liveGraceMs);
  // Sockets finish closing after shutdown starts; by then the store must no longer be written to.
  let shuttingDown = false;
  app.addHook("preClose", async () => {
    shuttingDown = true;
  });
  app.addHook("onClose", async () => {
    live.close();
    store.close();
  });

  const authenticate = (request: FastifyRequest, allowQueryToken = false): Session => {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : allowQueryToken
        ? (request.query as { token?: string }).token
        : undefined;
    const session = token ? sessionByToken.get(token) : undefined;
    if (!session) throw new HttpError(401, "Missing or invalid session token");
    return session;
  };

  const parse = <S extends z.ZodType>(schema: S, data: unknown): z.infer<S> => {
    const result = schema.safeParse(data);
    if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request");
    return result.data;
  };

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    // content-encoding: big folders' lists of files are sent gzipped.
    allowedHeaders: ["authorization", "content-type", "content-encoding"],
  });
  await app.register(websocket, { options: { maxPayload: MAX_TEXT_LENGTH * 2 } });
  // Registered after the websocket plugin so its hooks still close rejected upgrade sockets.
  app.addHook("onRequest", async (request) => {
    if (!isAllowedOrigin(request.headers.origin)) throw new HttpError(403, "Origin not allowed");
  });

  if (webDir) {
    await app.register(fastifyStatic, {
      root: webDir,
      cacheControl: false, // set per file below
      setHeaders: (res, path) => {
        // Build assets have content hashes in their names and never change; pages must be rechecked
        // so an updated LANDrop reaches phones on their next visit.
        const immutable = /[\\/]_next[\\/]static[\\/]/.test(path);
        res.setHeader("cache-control", immutable ? "public, max-age=31536000, immutable" : "no-cache");
      },
    });
  }

  // Attachment bodies are streamed by the route itself, never buffered by a parser.
  app.addContentTypeParser("application/octet-stream", (_request, _payload, done) => done(null));
  // Profile photos: read from the raw request by their route, which checks what the bytes really are.
  app.addContentTypeParser(/^image\//, (_request, _payload, done) => done(null));

  // ---------- Control plane ----------

  app.get(routes.health, async () => ({ ok: true, protocolVersion: PROTOCOL_VERSION, host: hostname() }));

  // Read on each request: the host may have changed networks since it started.
  app.get(routes.join, async () => ({ urls: joinUrls((app.server.address() as { port: number }).port) }));
  // Only this computer's own app may ask; guests' browsers get nothing.
  app.get(routes.usage, async (request, reply) => {
    if (!isHost(request.socket.remoteAddress)) return reply.code(403).send({ message: "Only the host can read this" });
    return store.usageSince(Date.now() - 24 * 60 * 60 * 1000);
  });

  let networkScan: { at: number; devices: Promise<NetworkDevice[]> } | undefined;
  app.get(routes.network, async (request) => {
    authenticate(request);
    if (!networkScan || Date.now() - networkScan.at > NETWORK_SCAN_TTL_MS) {
      const devices = scanNetwork();
      networkScan = { at: Date.now(), devices };
      devices.catch(() => (networkScan = undefined)); // try again next time
    }
    const usingLanDrop = new Set([...sessions.values()].map((s) => s.address));
    return { devices: (await networkScan.devices).filter((d) => !usingLanDrop.has(d.address)) };
  });

  app.get(routes.ws, { websocket: true }, (socket, request) => {
    let session: Session | undefined;
    let alive = true;
    socket.on("pong", () => (alive = true));
    const heartbeat = setInterval(() => {
      if (!alive) return socket.terminate();
      alive = false;
      socket.ping();
    }, heartbeatMs);

    const reply = (event: ServerEvent) => socket.send(JSON.stringify(event));

    socket.on("message", (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        return reply({ type: "error", message: "Malformed message" });
      }
      // Checked before the schema: an older page's hello doesn't match today's, and must still learn to reload.
      const hello = json as { type?: unknown; protocolVersion?: unknown } | null;
      if (!session && hello?.type === "hello" && hello.protocolVersion !== PROTOCOL_VERSION) {
        reply({ type: "error", message: "This page is out of date. Reload to update LANDrop." });
        return socket.close(1008, "Unsupported protocol version");
      }
      const parsed = ClientMessageSchema.safeParse(json);
      if (!parsed.success) return reply({ type: "error", message: "Invalid message" });
      const message = parsed.data;

      if (message.type === "hello") {
        if (session) return reply({ type: "error", message: "Already joined" });
        if (!store.authenticateDevice(message.deviceId, message.deviceSecret, message.name)) {
          reply({ type: "error", message: "This device identity is already used by another device." });
          return socket.close(1008, "Device identity mismatch");
        }
        session = {
          device: { id: message.deviceId, name: message.name },
          token: randomBytes(32).toString("base64url"),
          // Scoped to the device so another device can't claim this tab's live files.
          tab: `${message.deviceId}:${message.tabId}`,
          address: normalizeAddress(request.socket.remoteAddress),
        };
        live.tabConnected(session.tab);
        for (const other of sessions.values()) {
          if (other.device.id === session.device.id) other.device.name = session.device.name;
        }
        sessions.set(socket, session);
        sessionByToken.set(session.token, session);
        const { device, address } = session;
        // Worked out after joining, so a slow lookup never delays it; lists group browsers once it's known.
        machineOf(address)
          .then((key) => {
            if (!key || !sessions.has(socket)) return;
            // Hashed: other devices only need to compare machines, not learn hardware addresses.
            const machine = createHash("sha256").update(key).digest("hex").slice(0, 16);
            store.setMachine(device.id, machine);
            for (const s of sessions.values()) if (s.device.id === device.id) s.device.machine = machine;
            broadcast({ type: "presence:update", online: online() });
          })
          .catch((err) => app.log.warn(err, "couldn't identify the device's machine"));
        reply({
          type: "session:welcome",
          self: session.device,
          token: session.token,
          online: online(),
          directory: store.directory(),
          messages: store.history(session.device.id, HISTORY_LIMIT),
          groups: store.groupsOf(session.device.id),
          reads: store.readsFor(session.device.id),
          chatMeta: store.metaFor(session.device.id),
          isHost: isHost(request.socket.remoteAddress),
        });
        if (isHost(request.socket.remoteAddress)) hostDeviceIds.add(session.device.id);
        return broadcast({ type: "presence:update", online: online() });
      }

      if (!session) return reply({ type: "error", message: "Send hello first" });

      if (message.type === "profile:update") {
        store.rename(session.device.id, message.name);
        for (const s of sessions.values()) if (s.device.id === session.device.id) s.device.name = message.name;
        broadcast({ type: "presence:update", online: online() });
      }
    });

    socket.on("close", () => {
      clearInterval(heartbeat);
      if (!session) return;
      sessions.delete(socket);
      sessionByToken.delete(session.token);
      const { id } = session.device;
      if (!shuttingDown && ![...sessions.values()].some((s) => s.device.id === id)) {
        store.touch(id);
        store.failUploadsFrom(id).catch((err) => app.log.error(err, "failing uploads failed"));
      }
      if (!shuttingDown) live.tabDisconnected(session.tab);
      broadcast({ type: "presence:update", online: online() });
    });
  });

  // Room for a folder's list of files, which can run to tens of megabytes; senders gzip big ones.
  /** Lets the host app know about a message from another device, if the host is in that chat. */
  const tellHost = (message: Message, request: FastifyRequest) => {
    if (!onMessage || isHost(request.socket.remoteAddress)) return;
    const members = store.members(message.chatId);
    if (members === "everyone" || (members && members.some((id) => hostDeviceIds.has(id)))) {
      onMessage({ message, groupName: store.groupName(message.chatId) });
    }
  };

  app.post(routes.messages, { bodyLimit: MAX_FOLDER_LIST_BYTES, preParsing: gunzipBody }, async (request, reply) => {
    const { device, tab } = authenticate(request);
    const body = parse(CreateMessageRequestSchema, request.body);
    const message =
      "text" in body
        ? store.createText(device, body.chatId, body.text, body.replyToId)
        : store.createAttachment(device, body.chatId, body.attachment, body.replyToId);
    // A folder's sender also serves it while it uploads, so it can be opened straight away.
    if (message.attachment?.status === "live" || message.attachment?.folder) live.own(message.id, tab);
    // Indexed now, while its list is in hand, so the first person to open it doesn't wait.
    if ("attachment" in body && body.attachment.folder) indexOf(message.id, body.attachment.folder.files);
    tellHost(message, request);
    return reply.code(201).send(message);
  });

  app.post(routes.forward, async (request, reply) => {
    const { device } = authenticate(request);
    const body = parse(ForwardMessageRequestSchema, request.body);
    const message = await store.forward(device, body.messageId, body.chatId);
    tellHost(message, request);
    return reply.code(201).send(message);
  });

  app.delete<{ Params: MessageParams }>(routes.message(":id"), async (request, reply) => {
    const { device } = authenticate(request);
    await store.remove(request.params.id, device.id, isHost(request.socket.remoteAddress));
    return reply.code(204).send();
  });

  app.delete<{ Params: MessageParams }>(routes.chat(":id"), async (request, reply) => {
    const { device } = authenticate(request);
    const before = store.clearChat(request.params.id, device.id);
    // Every open tab of this device drops the messages; nobody else's copy changes.
    for (const [socket, s] of sessions) {
      if (s.device.id === device.id) socket.send(JSON.stringify({ type: "chat:cleared", chatId: request.params.id, before } satisfies ServerEvent));
    }
    return reply.code(204).send();
  });

  app.post<{ Params: MessageParams }>(routes.chatRead(":id"), async (request, reply) => {
    const { device } = authenticate(request);
    const { upTo } = parse(MarkReadRequestSchema, request.body);
    const read = store.markRead(request.params.id, device.id, upTo);
    // Everyone in the chat updates their ticks, including this device's other tabs.
    if (read) broadcast({ type: "chat:read", read }, read.chatId);
    return reply.code(204).send();
  });

  app.get<{ Params: MessageParams }>(routes.messageInfo(":id"), async (request) => {
    const { device } = authenticate(request);
    return store.messageInfo(request.params.id, device.id);
  });

  app.post(routes.groups, async (request, reply) => {
    const { device } = authenticate(request);
    const { name, members } = parse(CreateGroupRequestSchema, request.body);
    return reply.code(201).send(store.createGroup(device.id, name, members));
  });

  app.patch<{ Params: MessageParams }>(routes.group(":id"), async (request) => {
    const { device } = authenticate(request);
    return store.updateGroup(request.params.id, device.id, parse(UpdateGroupRequestSchema, request.body));
  });

  app.patch<{ Params: { chatId: string } }>(routes.chatMeta(":chatId"), async (request) => {
    const { device } = authenticate(request);
    return store.updateMeta(request.params.chatId, device.id, parse(UpdateChatMetaRequestSchema, request.body));
  });

  app.post<{ Params: MessageParams }>(routes.leaveGroup(":id"), async (request, reply) => {
    const { device } = authenticate(request);
    await store.leaveGroup(request.params.id, device.id);
    return reply.code(204).send();
  });

  // ---------- Profile photos ----------

  app.put<{ Params: MessageParams }>(routes.deviceAvatar(":id"), async (request) => {
    const { device } = authenticate(request);
    if (request.params.id !== device.id) throw new HttpError(403, "You can only change your own photo");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request.raw as AsyncIterable<Buffer>) {
      size += chunk.length;
      // Stop reading early rather than buffer an oversized body.
      if (size > MAX_AVATAR_BYTES) throw new HttpError(413, "That photo is too large");
      chunks.push(chunk);
    }
    const updated = await store.setAvatar(device.id, Buffer.concat(chunks));
    broadcast({ type: "device:updated", device: updated });
    return updated;
  });

  app.delete<{ Params: MessageParams }>(routes.deviceAvatar(":id"), async (request) => {
    const { device } = authenticate(request);
    if (request.params.id !== device.id) throw new HttpError(403, "You can only change your own photo");
    const updated = await store.removeAvatar(device.id);
    broadcast({ type: "device:updated", device: updated });
    return updated;
  });

  app.get<{ Params: MessageParams }>(routes.deviceAvatar(":id"), async (request, reply) => {
    authenticate(request, true);
    const avatar = await store.avatar(request.params.id);
    if (!avatar) throw new HttpError(404, "No photo");
    // The URL carries the photo's version, so it can be cached until it changes.
    return reply
      .header("content-type", avatar.type)
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; sandbox")
      .header("cache-control", "private, max-age=31536000, immutable")
      .send(avatar.data);
  });

  // ---------- Data plane ----------

  app.put<{ Params: MessageParams }>(routes.attachmentData(":id"), async (request) => {
    const { device } = authenticate(request);
    const length = request.headers["content-length"];
    return store.receive(request.params.id, device.id, request.raw, length === undefined ? undefined : Number(length));
  });

  app.put<{ Params: MessageParams }>(routes.streamData(":id"), async (request, reply) => {
    const { tab } = authenticate(request);
    await live.deliver(request.params.id, tab, request.raw, Number(request.headers["content-length"]));
    return reply.code(204).send();
  });

  app.post<{ Params: MessageParams }>(routes.attachmentChecksum(":id"), async (request) => {
    const { device } = authenticate(request);
    const { sha256 } = parse(SubmitChecksumRequestSchema, request.body);
    return store.verify(request.params.id, device.id, sha256);
  });

  app.get<{ Params: MessageParams }>(routes.attachment(":id"), async (request, reply) => {
    const { device } = authenticate(request, true);
    const attachment = store.availableAttachment(request.params.id, device.id);
    // A neutral type and "attachment" disposition: downloads are saved, never rendered or executed.
    reply
      .header("content-type", "application/octet-stream")
      .header("content-disposition", contentDisposition(attachment.name));
    if (attachment.folder) return sendFolderZip(reply, request.params.id, attachment);
    return sendFile(request, reply, request.params.id, attachment);
  });

  app.get<{ Params: MessageParams }>(routes.attachmentPreview(":id"), async (request, reply) => {
    const { device } = authenticate(request, true);
    const attachment = store.availableAttachment(request.params.id, device.id);
    if (!previewKind(attachment)) throw new HttpError(415, "This attachment has no preview");
    // Only allow-listed image, video and audio types reach here. The sandboxing CSP means that even a
    // file mislabelled by its sender can't run script if someone opens this URL directly.
    reply
      .header("content-type", attachment.mimeType.toLowerCase())
      .header("content-disposition", contentDisposition(attachment.name).replace(/^attachment/, "inline"))
      .header("content-security-policy", "default-src 'none'; sandbox")
      .header("cache-control", "private, max-age=3600");
    return sendFile(request, reply, request.params.id, attachment);
  });

  /**
   * Sends an attachment, honouring a single Range request so videos can stream and seek (required by
   * iOS Safari). Stored files come from disk; live files from their sender's tab.
   */
  const sendFile = (request: FastifyRequest, reply: FastifyReply, id: string, attachment: Attachment) =>
    sendSlice(request, reply, id, attachment, 0, attachment.size);

  /** Sends `length` bytes of an attachment from `base` as if they were a whole file: one file inside a folder's zip. */
  const sendSlice = async (request: FastifyRequest, reply: FastifyReply, id: string, attachment: Attachment, base: number, length: number) => {
    reply.header("x-content-type-options", "nosniff").header("accept-ranges", "bytes");
    const range = parseRange(request.headers.range, length);
    if (range === "unsatisfiable") {
      return reply.code(416).header("content-range", `bytes */${length}`).send();
    }
    const { start, end } = range ?? { start: 0, end: length - 1 };
    const body = await readBytes(id, attachment, base + start, base + end);
    if (range) reply.code(206).header("content-range", `bytes ${start}-${end}/${length}`);
    return reply.header("content-length", end - start + 1).send(body);
  };

  /** Bytes [start, end] of an attachment: from disk once it's stored, until then from its sender's tab. */
  const readBytes = async (id: string, attachment: Attachment, start: number, end: number): Promise<AsyncIterable<Buffer>> => {
    if (attachment.status !== "ready") return streamLive(id, start, end);
    return end < start ? Readable.from([]) : store.openFile(id, { start, end });
  };

  // ---------- Shared folders ----------

  /**
   * Indexes of recently opened folders: a folder never changes. Kept to about two million files in
   * all, so a few huge folders can't use up the host's memory.
   */
  const folderIndexes = new Map<string, FolderIndex>();
  const indexOf = (id: string, files?: FolderFile[]) => {
    let index = folderIndexes.get(id);
    if (index) folderIndexes.delete(id); // re-added below as the most recent
    else index = new FolderIndex(files ?? store.folderFiles(id));
    folderIndexes.set(id, index);
    let cached = [...folderIndexes.values()].reduce((sum, i) => sum + i.files.length, 0);
    for (const [key, old] of folderIndexes) {
      if (cached <= FOLDER_INDEX_BUDGET || key === id) break;
      folderIndexes.delete(key);
      cached -= old.files.length;
    }
    return index;
  };
  const folderAttachment = (id: string, deviceId: string) => {
    const attachment = store.availableAttachment(id, deviceId);
    if (!attachment.folder) throw new HttpError(415, "This attachment isn't a folder");
    return attachment;
  };

  app.get<{ Params: MessageParams; Querystring: { dir?: string } }>(routes.folderFiles(":id"), async (request) => {
    const { device } = authenticate(request);
    folderAttachment(request.params.id, device.id);
    return indexOf(request.params.id).list(request.query.dir ?? "");
  });

  app.get<{ Params: MessageParams; Querystring: { path?: string; preview?: string } }>(routes.folderFile(":id"), async (request, reply) => {
    const { device } = authenticate(request, true);
    const { id } = request.params;
    const attachment = folderAttachment(id, device.id);
    const found = indexOf(id).find(request.query.path ?? "");
    if (!found) throw new HttpError(404, "That file isn't in this folder");
    const { file, start } = found;
    const name = file.path.split("/").pop()!;
    const mimeType = typeFromName(name);
    // Same rules as attachments: only allow-listed photos, videos and audio show inline, sandboxed.
    if (request.query.preview && mimeType && previewKind({ mimeType, size: file.size })) {
      reply
        .header("content-type", mimeType)
        .header("content-disposition", contentDisposition(name).replace(/^attachment/, "inline"))
        .header("content-security-policy", "default-src 'none'; sandbox")
        .header("cache-control", "private, max-age=3600");
    } else {
      reply.header("content-type", "application/octet-stream").header("content-disposition", contentDisposition(name));
    }
    return sendSlice(request, reply, id, attachment, start, file.size);
  });

  /** The whole folder as a zip, built as it downloads. It can't resume part-way, so ranges aren't offered. */
  const sendFolderZip = (reply: FastifyReply, id: string, attachment: Attachment) => {
    const { size, stream } = zipFolder(indexOf(id).files, () => readBytes(id, attachment, 0, attachment.size - 1));
    return reply.header("x-content-type-options", "nosniff").header("content-length", size).send(stream);
  };

  /**
   * Relays bytes [start, end] of a live file piece by piece. The next piece is only requested once
   * the viewer has taken the current one: players open many ranges and read a little of each, and
   * fetching ahead would make the sender read far more than anyone watches. The first piece is
   * awaited before responding, so an offline sender is a clean error status; a sender lost mid-way
   * aborts the response, so the viewer's download fails instead of silently ending short.
   */
  const streamLive = async (id: string, start: number, end: number) => {
    const out = new PassThrough();
    if (end < start) return out.end();
    let size = LIVE_FIRST_PIECE_BYTES;
    const fetchPiece = (at: number) => {
      const piece = live.request(id, at, Math.min(end, at + size - 1));
      size = Math.min(size * 2, LIVE_MAX_PIECE_BYTES);
      return piece;
    };
    // Resolves when the viewer wants more, or has gone (a destroyed stream never drains).
    const writable = () =>
      new Promise<void>((resolve) => {
        const done = () => {
          out.off("drain", done).off("close", done);
          resolve();
        };
        out.on("drain", done).on("close", done);
      });
    const first = await fetchPiece(start);
    void (async () => {
      for (let at = start, piece = first; ; piece = await fetchPiece(at)) {
        at += piece.length;
        if (!out.write(piece)) await writable();
        if (out.destroyed) return;
        if (at > end) return out.end();
      }
    })().catch((err: Error) => out.destroy(err));
    return out;
  };

  return app;
}

/** How many files' worth of folder indexes the host keeps in memory. */
const FOLDER_INDEX_BUDGET = 2_000_000;

/**
 * Unpacks a gzipped request body. The route's body limit then applies to the unpacked bytes, so a
 * small compressed body can't expand without bound.
 */
async function gunzipBody(request: FastifyRequest, _reply: FastifyReply, payload: Readable) {
  if (request.headers["content-encoding"] !== "gzip") return payload;
  // The length on the wire is the compressed one; the unpacked body is measured against the limit instead.
  delete request.headers["content-length"];
  return payload.pipe(createGunzip());
}

/** Parses a single "bytes=" range. Multi-range requests are answered with the whole file. */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | "unsatisfiable" | undefined {
  const match = header && /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return undefined;
  const [start, end] =
    match[1] === ""
      ? [Math.max(0, size - Number(match[2])), size - 1] // suffix range: the last N bytes
      : [Number(match[1]), match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1)];
  return start > end || start >= size ? "unsatisfiable" : { start, end };
}

/** The addresses other devices on this machine's networks can open to reach LANDrop. */
export function joinUrls(port: number): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => `http://${net!.address}:${port}`);
}

/** True when the request comes from the machine running this server. */
function isHostAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = normalizeAddress(address);
  if (normalized === "127.0.0.1" || normalized === "::1") return true;
  return Object.values(networkInterfaces()).some((nets) => nets?.some((n) => n.address === normalized));
}

/** IPv4 clients of a dual-stack server appear as "::ffff:192.168.0.5". */
function normalizeAddress(address: string | undefined): string {
  return (address ?? "").replace(/^::ffff:/, "");
}

/** Builds an attachment header that can't smuggle paths, quotes or header breaks. */
export function contentDisposition(name: string): string {
  const safe = name.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim() || "download";
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").replace(/["%]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Types for files inside a folder, which carry only their names. Only ones LANDrop can preview. */
const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
};

export function typeFromName(name: string): string | undefined {
  return TYPES_BY_EXTENSION[name.split(".").pop()!.toLowerCase()];
}
