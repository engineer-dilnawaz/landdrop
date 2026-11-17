import { createHash, randomBytes } from "node:crypto";
import { hostname, networkInterfaces } from "node:os";
import type { Socket } from "node:net";
import { PassThrough } from "node:stream";
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
  HISTORY_LIMIT,
  MAX_TEXT_LENGTH,
  MarkReadRequestSchema,
  PROTOCOL_VERSION,
  SubmitChecksumRequestSchema,
  UpdateGroupRequestSchema,
  previewKind,
  routes,
  type Attachment,
  type Device,
  type NetworkDevice,
  type ServerEvent,
} from "@landrop/protocol";
import { ChatStore, HttpError } from "./chat.js";
import { LiveFiles, type TabKey } from "./live.js";
import { hardwareAddressOf, scanNetwork as scanHostNetwork } from "./network.js";
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
    allowedHeaders: ["authorization", "content-type"],
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

  // ---------- Control plane ----------

  app.get(routes.health, async () => ({ ok: true, protocolVersion: PROTOCOL_VERSION, host: hostname() }));

  // Read on each request: the host may have changed networks since it started.
  app.get(routes.join, async () => ({ urls: joinUrls((app.server.address() as { port: number }).port) }));

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
          isHost: isHost(request.socket.remoteAddress),
        });
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

  app.post(routes.messages, async (request, reply) => {
    const { device, tab } = authenticate(request);
    const body = parse(CreateMessageRequestSchema, request.body);
    const message =
      "text" in body
        ? store.createText(device, body.chatId, body.text, body.replyToId)
        : store.createAttachment(device, body.chatId, body.attachment, body.replyToId);
    if (message.attachment?.status === "live") live.own(message.id, tab);
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

  app.post<{ Params: MessageParams }>(routes.leaveGroup(":id"), async (request, reply) => {
    const { device } = authenticate(request);
    await store.leaveGroup(request.params.id, device.id);
    return reply.code(204).send();
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
  const sendFile = async (request: FastifyRequest, reply: FastifyReply, id: string, attachment: Attachment) => {
    reply.header("x-content-type-options", "nosniff").header("accept-ranges", "bytes");
    const range = parseRange(request.headers.range, attachment.size);
    if (range === "unsatisfiable") {
      return reply.code(416).header("content-range", `bytes */${attachment.size}`).send();
    }
    const { start, end } = range ?? { start: 0, end: attachment.size - 1 };
    const body = attachment.status === "live" ? await streamLive(id, start, end) : store.openFile(id, range);
    if (range) reply.code(206).header("content-range", `bytes ${start}-${end}/${attachment.size}`);
    return reply.header("content-length", end - start + 1).send(body);
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
