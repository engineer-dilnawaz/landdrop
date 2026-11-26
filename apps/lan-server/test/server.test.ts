import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  GROUP_CHAT_ID,
  MAX_AVATAR_BYTES,
  MAX_ATTACHMENT_BYTES,
  MAX_FOLDER_LIST_BYTES,
  MAX_FOLDER_UPLOAD_BYTES,
  privateChatId,
  MAX_IMAGE_PREVIEW_BYTES,
  previewKind,
  PROTOCOL_VERSION,
  routes,
  type FolderFile,
  type FolderListing,
  type Group,
  type Message,
  type MessageInfo,
  type NetworkDevice,
  type ServerEvent,
} from "@landrop/protocol";
import { buildApp, contentDisposition, parseRange } from "../src/app.js";
import { startHost } from "../src/host.js";
import type { Network } from "../src/network.js";
import { hostsOf, parseGateway, parseNeighbours } from "../src/network.js";

let base: string;
let dataDir: string;
let app: Awaited<ReturnType<typeof buildApp>>;

async function start(isHost?: () => boolean, liveGraceMs?: number) {
  app = await buildApp({ dataDir, isHost, liveGraceMs });
  await app.listen({ host: "127.0.0.1", port: 0 });
  base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "landrop-test-"));
  await start();
});
afterEach(async () => {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
});

interface Identity {
  deviceId: string;
  deviceSecret: string;
}
const newIdentity = (): Identity => ({
  deviceId: randomBytes(16).toString("hex"),
  deviceSecret: randomBytes(32).toString("hex"),
});

interface Client {
  token: string;
  socket: WebSocket;
  welcome: Extract<ServerEvent, { type: "session:welcome" }>;
  waitFor<T extends ServerEvent["type"]>(
    type: T,
    match?: (e: Extract<ServerEvent, { type: T }>) => boolean,
  ): Promise<Extract<ServerEvent, { type: T }>>;
}

/** `tabId` stands for one open page; reusing it is that page reconnecting. */
function open(identity: Identity, name: string, tabId = randomBytes(16).toString("hex")) {
  const socket = new WebSocket(base.replace("http", "ws") + routes.ws);
  const events: ServerEvent[] = [];
  const listeners = new Set<() => void>();
  socket.on("message", (raw) => {
    events.push(JSON.parse(raw.toString()));
    listeners.forEach((l) => l());
  });
  const waitFor: Client["waitFor"] = (type, match = () => true) =>
    new Promise((resolve, reject) => {
      const check = () => {
        const found = events.find((e) => e.type === type && match(e as never));
        if (!found) return false;
        listeners.delete(check);
        clearTimeout(timer);
        resolve(found as never);
        return true;
      };
      const timer = setTimeout(() => {
        listeners.delete(check);
        reject(new Error(`Timed out waiting for ${type}`));
      }, 3000);
      if (!check()) listeners.add(check);
    });
  const ready = new Promise<void>((r) => socket.once("open", () => r())).then(() =>
    socket.send(JSON.stringify({ type: "hello", protocolVersion: PROTOCOL_VERSION, name, tabId, ...identity })),
  );
  return { socket, waitFor, ready };
}

async function join_(name: string, identity = newIdentity(), tabId?: string): Promise<Client> {
  const { socket, waitFor, ready } = open(identity, name, tabId);
  await ready;
  const welcome = await waitFor("session:welcome");
  return { token: welcome.token, socket, welcome, waitFor };
}

function api(client: Client, method: string, path: string, body?: unknown) {
  return fetch(base + path, {
    method,
    headers: {
      authorization: `Bearer ${client.token}`,
      ...(body !== undefined && { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const upload = (client: Client, id: string, data: Buffer) =>
  fetch(base + routes.attachmentData(id), {
    method: "PUT",
    headers: { authorization: `Bearer ${client.token}`, "content-type": "application/octet-stream" },
    body: new Uint8Array(data),
  });

async function attach(
  client: Client,
  data: Buffer,
  name = "video.mp4",
  mimeType = "video/mp4",
  chatId = GROUP_CHAT_ID,
): Promise<Message> {
  const res = await api(client, "POST", routes.messages, { chatId, attachment: { name, size: data.length, mimeType } });
  expect(res.status).toBe(201);
  return (await res.json()) as Message;
}

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const download = (client: Client, id: string) => fetch(base + routes.attachment(id) + `?token=${client.token}`);

describe("group chat", () => {
  it("shows every device who is online and drops them when they leave", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    await mac.waitFor("presence:update", (e) => e.online.some((d) => d.name === "iPhone"));
    phone.socket.close();
    await mac.waitFor("presence:update", (e) => e.online.length === 1 && e.online[0].name === "Mac");
  });

  it("delivers a text to everyone in the chat, attributed to its sender", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "hello everyone" });
    const { message } = await phone.waitFor("message:created");
    expect(message).toMatchObject({ senderId: mac.welcome.self.id, senderName: "Mac", text: "hello everyone" });
  });

  it("keeps history on the host across restarts, so devices that join later see earlier messages", async () => {
    const mac = await join_("Mac");
    await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "sent before restart" });
    mac.socket.close();
    await app.close();
    await start();
    const latecomer = await join_("iPhone");
    expect(latecomer.welcome.messages.map((m) => m.text)).toEqual(["sent before restart"]);
  });

  it("tells joining devices everyone's current name, so a rename shows on earlier messages too", async () => {
    const identity = newIdentity();
    const phone = await join_("Old name", identity);
    await api(phone, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "sent before the rename" });
    phone.socket.send(JSON.stringify({ type: "profile:update", name: "New name" }));
    await phone.waitFor("presence:update", (e) => e.online.some((d) => d.name === "New name"));
    phone.socket.close();

    const later = await join_("Laptop");
    expect(later.welcome.directory).toContainEqual(expect.objectContaining({ id: identity.deviceId, name: "New name" }));
    expect(later.welcome.messages[0].senderId).toBe(identity.deviceId);
  });

  it("refuses a device that claims another device's identity without its secret", async () => {
    const identity = newIdentity();
    await join_("Real iPhone", identity);
    const impostor = open({ deviceId: identity.deviceId, deviceSecret: newIdentity().deviceSecret }, "Fake");
    await impostor.ready;
    const code = await new Promise<number>((r) => impostor.socket.once("close", r));
    expect(code).toBe(1008);
  });

  it("lets a sender remove their own message for everyone, including its file", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const data = randomBytes(1000);
    const message = await attach(mac, data);
    await upload(mac, message.id, data);
    await api(mac, "POST", routes.attachmentChecksum(message.id), { sha256: sha256(data) });

    expect((await api(mac, "DELETE", routes.message(message.id))).status).toBe(204);
    expect((await phone.waitFor("message:deleted")).messageId).toBe(message.id);
    expect((await download(phone, message.id)).status).toBe(404);
    expect((await join_("Later")).welcome.messages).toEqual([]);
  });

  it("stops devices removing other people's messages, but lets the host moderate", async () => {
    await app.close();
    let hostAddressCheck = false;
    await start(() => hostAddressCheck);
    const phone = await join_("iPhone");
    const laptop = await join_("Laptop");
    const res = await api(phone, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "phone's message" });
    const { id } = (await res.json()) as Message;

    expect((await api(laptop, "DELETE", routes.message(id))).status).toBe(403);
    hostAddressCheck = true; // the same request, now coming from the host machine
    expect((await api(laptop, "DELETE", routes.message(id))).status).toBe(204);
  });

  it("keeps a reply's quote of the original, even after the original is removed", async () => {
    const mac = await join_("Mac");
    const original = (await (await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "Lunch at 1?" })).json()) as Message;
    const res = await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "Yes", replyToId: original.id });
    expect(((await res.json()) as Message).replyTo).toEqual({
      id: original.id,
      senderId: mac.welcome.self.id,
      senderName: "Mac",
      preview: "Lunch at 1?",
    });

    await api(mac, "DELETE", routes.message(original.id));
    const [reply] = (await join_("Later")).welcome.messages;
    expect(reply).toMatchObject({ text: "Yes", replyTo: { preview: "Lunch at 1?" } });
  });

  it("rejects a reply to a message that doesn't exist", async () => {
    const mac = await join_("Mac");
    const res = await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "?", replyToId: "00000000-0000-4000-8000-000000000000" });
    expect(res.status).toBe(400);
  });

  it("refuses clients that speak a different protocol version rather than misreading them", async () => {
    const socket = new WebSocket(base.replace("http", "ws") + routes.ws);
    await new Promise((r) => socket.once("open", r));
    socket.send(JSON.stringify({ type: "hello", protocolVersion: PROTOCOL_VERSION + 1, name: "Old", ...newIdentity() }));
    expect(await new Promise<number>((r) => socket.once("close", r))).toBe(1008);
  });
});

describe("groups", () => {
  async function team() {
    const ids = { mac: newIdentity(), iphone: newIdentity(), galaxy: newIdentity(), tv: newIdentity() };
    const mac = await join_("MacBook", ids.mac);
    const iphone = await join_("iPhone", ids.iphone);
    const galaxy = await join_("Galaxy", ids.galaxy);
    const tv = await join_("Living room TV", ids.tv);
    const res = await api(mac, "POST", routes.groups, { name: "Family", members: [ids.iphone.deviceId, ids.galaxy.deviceId] });
    expect(res.status).toBe(201);
    const group = (await res.json()) as Group;
    return { ids, mac, iphone, galaxy, tv, group };
  }

  it("lets only the chosen devices see the group and what is shared in it", async () => {
    const { ids, mac, galaxy, tv, group } = await team();
    expect(group.members.sort()).toEqual([ids.mac.deviceId, ids.iphone.deviceId, ids.galaxy.deviceId].sort());
    expect((await galaxy.waitFor("group:updated")).group.name).toBe("Family");

    await api(mac, "POST", routes.messages, { chatId: group.id, text: "dinner at 8" });
    expect((await galaxy.waitFor("message:created")).message.text).toBe("dinner at 8");
    const file = await attach(mac, Buffer.from("menu"), "menu.txt", "text/plain", group.id);

    // The TV isn't in it: it can't post, read the file, or find it in its history and groups.
    expect((await api(tv, "POST", routes.messages, { chatId: group.id, text: "hi" })).status).toBe(403);
    expect((await download(tv, file.id)).status).toBe(404);
    const tvAgain = await join_("Living room TV", ids.tv);
    expect(tvAgain.welcome.groups).toEqual([]);
    expect(tvAgain.welcome.messages.some((m) => m.chatId === group.id)).toBe(false);
    // A group message is never broadcast to it either: the first thing it hears is the LANDrop group.
    await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "hello all" });
    expect((await tv.waitFor("message:created")).message.text).toBe("hello all");
  });

  it("shows devices added later the messages from then on, not the group's history", async () => {
    const { ids, mac, iphone, tv, group } = await team();
    await api(mac, "POST", routes.messages, { chatId: group.id, text: "before the TV" });
    await new Promise((r) => setTimeout(r, 5));
    const res = await api(iphone, "PATCH", routes.group(group.id), { addMembers: [ids.tv.deviceId], name: "Home" });
    expect((await res.json()) as Group).toMatchObject({ name: "Home" });
    expect((await tv.waitFor("group:updated")).group.members).toContain(ids.tv.deviceId);
    await new Promise((r) => setTimeout(r, 5));
    await api(mac, "POST", routes.messages, { chatId: group.id, text: "welcome, TV" });
    await tv.waitFor("message:created", (e) => e.message.text === "welcome, TV");

    const tvAgain = await join_("Living room TV", ids.tv);
    expect(tvAgain.welcome.messages.filter((m) => m.chatId === group.id).map((m) => m.text)).toEqual(["welcome, TV"]);
  });

  it("stops delivering to a device that leaves, and deletes the group when the last one leaves", async () => {
    const { ids, mac, iphone, galaxy, group } = await team();
    expect((await api(galaxy, "POST", routes.leaveGroup(group.id))).status).toBe(204);
    expect(await galaxy.waitFor("group:left")).toMatchObject({ groupId: group.id });
    expect((await iphone.waitFor("group:updated", (e) => e.group.members.length === 2)).group.members).not.toContain(ids.galaxy.deviceId);
    expect((await api(galaxy, "POST", routes.messages, { chatId: group.id, text: "still here?" })).status).toBe(403);

    const file = await attach(mac, Buffer.from("photo"), "photo.png", "image/png", group.id);
    await upload(mac, file.id, Buffer.from("photo"));
    await api(iphone, "POST", routes.leaveGroup(group.id));
    await api(mac, "POST", routes.leaveGroup(group.id));
    // Nobody can see it any more, so nothing of it is kept.
    expect((await api(mac, "POST", routes.messages, { chatId: group.id, text: "anyone?" })).status).toBe(403);
    expect(await readdir(join(dataDir, "files"))).not.toContain(file.id);
  });

  it("needs at least one other device that has joined", async () => {
    const mac = await join_("MacBook");
    const res = await api(mac, "POST", routes.groups, { name: "Just me", members: [randomBytes(16).toString("hex")] });
    expect(res.status).toBe(400);
  });
});

describe("private chats", () => {
  async function trio() {
    const a = newIdentity();
    const b = newIdentity();
    const alice = await join_("Alice", a);
    const bob = await join_("Bob", b);
    const eve = await join_("Eve");
    return { alice, bob, eve, chatId: privateChatId(a.deviceId, b.deviceId) };
  }

  it("delivers a private message only to its two members", async () => {
    const { alice, bob, eve, chatId } = await trio();
    await api(alice, "POST", routes.messages, { chatId, text: "just between us" });
    expect((await bob.waitFor("message:created")).message).toMatchObject({ chatId, text: "just between us" });
    // A group message sent afterwards is the first thing Eve receives, so the private one never reached her.
    await api(alice, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "hello all" });
    expect((await eve.waitFor("message:created")).message.text).toBe("hello all");
  });

  it("deletes a chat for the device that asks only: the other person keeps their copy", async () => {
    const a = newIdentity();
    const b = newIdentity();
    const alice = await join_("Alice", a);
    const aliceOtherTab = await join_("Alice", a);
    const bob = await join_("Bob", b);
    const eve = await join_("Eve");
    const chatId = privateChatId(a.deviceId, b.deviceId);
    await api(bob, "POST", routes.messages, { chatId, text: "before" });
    await alice.waitFor("message:created");

    expect((await api(eve, "DELETE", routes.chat(chatId))).status).toBe(404); // not her chat to touch
    expect((await api(alice, "DELETE", routes.chat(chatId))).status).toBe(204);
    // Alice's other open tab drops the messages too.
    expect(await aliceOtherTab.waitFor("chat:cleared")).toMatchObject({ chatId });

    await api(bob, "POST", routes.messages, { chatId, text: "after" });
    await alice.waitFor("message:created", (e) => e.message.text === "after");
    const texts = async (identity: Identity, name: string) =>
      (await join_(name, identity)).welcome.messages.filter((m) => m.chatId === chatId).map((m) => m.text);
    expect(await texts(a, "Alice")).toEqual(["after"]); // gone for good, but the conversation carries on
    expect(await texts(b, "Bob")).toEqual(["before", "after"]);
  });

  it("keeps private history out of other devices' history, even after reconnecting", async () => {
    const { alice, chatId } = await trio();
    await api(alice, "POST", routes.messages, { chatId, text: "secret" });
    const eveAgain = await join_("Eve 2");
    expect(eveAgain.welcome.messages.map((m) => m.text)).not.toContain("secret");
    const bobHistory = (await join_("Bob", undefined)).welcome.messages;
    expect(bobHistory.map((m) => m.text)).not.toContain("secret"); // a different device named Bob is not Bob
  });

  it("stops a device posting into, downloading from, or removing in a private chat it isn't in", async () => {
    const { alice, eve, chatId } = await trio();
    expect((await api(eve, "POST", routes.messages, { chatId, text: "let me in" })).status).toBe(403);

    const data = randomBytes(500);
    const photo = await attach(alice, data, "private.jpg", "image/jpeg", chatId);
    await upload(alice, photo.id, data);
    await api(alice, "POST", routes.attachmentChecksum(photo.id), { sha256: sha256(data) });
    expect((await download(eve, photo.id)).status).toBe(404);
    expect((await fetch(base + routes.attachmentPreview(photo.id) + `?token=${eve.token}`)).status).toBe(404);
    expect((await api(eve, "DELETE", routes.message(photo.id))).status).toBe(404);
  });

  it("doesn't let the host remove other people's private messages", async () => {
    const { alice, bob, chatId } = await trio(); // every test device connects from the host
    const res = await api(alice, "POST", routes.messages, { chatId, text: "mine" });
    const { id } = (await res.json()) as Message;
    expect((await api(bob, "DELETE", routes.message(id))).status).toBe(403);
    expect((await api(alice, "DELETE", routes.message(id))).status).toBe(204);
  });

  it("rejects malformed chat ids and private chats with unknown devices", async () => {
    const { alice } = await trio();
    expect((await api(alice, "POST", routes.messages, { chatId: "dm:nonsense", text: "?" })).status).toBe(400);
    const stranger = privateChatId(alice.welcome.self.id, newIdentity().deviceId);
    expect((await api(alice, "POST", routes.messages, { chatId: stranger, text: "?" })).status).toBe(404);
  });

  it("only quotes messages from the same chat in a reply", async () => {
    const { alice, chatId } = await trio();
    const group = (await (await api(alice, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "in group" })).json()) as Message;
    const res = await api(alice, "POST", routes.messages, { chatId, text: "reply", replyToId: group.id });
    expect(res.status).toBe(400);
  });
});

describe("read receipts", () => {
  async function pair() {
    const a = newIdentity();
    const b = newIdentity();
    const alice = await join_("Alice", a);
    const bob = await join_("Bob", b);
    const chatId = privateChatId(a.deviceId, b.deviceId);
    return { a, b, alice, bob, chatId };
  }
  const send = async (client: Client, chatId: string, text: string) =>
    (await (await api(client, "POST", routes.messages, { chatId, text })).json()) as Message;
  const info = async (client: Client, id: string) => (await (await api(client, "GET", routes.messageInfo(id))).json()) as MessageInfo;

  it("tells the sender when the other person reads, and remembers it for when they come back", async () => {
    const { a, b, alice, bob, chatId } = await pair();
    const sent = await send(alice, chatId, "seen this?");
    expect((await api(bob, "POST", routes.chatRead(chatId), { upTo: sent.createdAt })).status).toBe(204);
    const { read } = await alice.waitFor("chat:read");
    expect(read).toEqual({ chatId, deviceId: b.deviceId, upTo: sent.createdAt });
    alice.socket.close();
    const again = await join_("Alice", a);
    expect(again.welcome.reads).toContainEqual(read);
  });

  it("keeps who read a private chat between its two members", async () => {
    const { alice, bob, chatId } = await pair();
    const eve = await join_("Eve");
    const sent = await send(alice, chatId, "just us");
    await api(bob, "POST", routes.chatRead(chatId), { upTo: sent.createdAt });
    expect((await api(eve, "POST", routes.chatRead(chatId), { upTo: sent.createdAt })).status).toBe(404);
    expect((await api(eve, "GET", routes.messageInfo(sent.id))).status).toBe(404);
    expect(eve.welcome.reads.some((r) => r.chatId === chatId)).toBe(false);
  });

  it("says when each message was first read, not when the chat was last opened", async () => {
    const { b, alice, bob, chatId } = await pair();
    const first = await send(alice, chatId, "one");
    await api(bob, "POST", routes.chatRead(chatId), { upTo: first.createdAt });
    const second = await send(alice, chatId, "two");
    // Not read yet: Bob read up to the first message only.
    expect((await info(alice, second.id)).reads).toEqual([]);
    await new Promise((r) => setTimeout(r, 5));
    await api(bob, "POST", routes.chatRead(chatId), { upTo: second.createdAt });
    const [firstRead] = (await info(alice, first.id)).reads;
    const [secondRead] = (await info(alice, second.id)).reads;
    expect(firstRead.deviceId).toBe(b.deviceId);
    expect(secondRead.at).toBeGreaterThan(firstRead.at);
  });

  it("doesn't count messages sent after a read, even if a device claims to have read ahead", async () => {
    const { alice, bob, chatId } = await pair();
    await api(bob, "POST", routes.chatRead(chatId), { upTo: Date.now() + 60_000 });
    const later = await send(alice, chatId, "after");
    expect((await info(alice, later.id)).reads).toEqual([]);
  });
});

describe("shared folders", () => {
  const folder: Record<string, Buffer> = {
    "beach.jpg": Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(5000)]),
    "day 1/notes.txt": Buffer.from("Sunscreen ☀️ and towels"),
    "day 1/empty.txt": Buffer.alloc(0),
    "day 1/clips/wave.mp4": randomBytes(20_000),
    "page.html": Buffer.from("<script>alert(1)</script>"),
  };
  // What a sender sends: the list of files, and their bytes back to back in that order.
  const files = Object.entries(folder).map(([path, data]) => ({ path, size: data.length }));
  const bytes = Buffer.concat(Object.values(folder));

  const announce = (client: Client, attachment: object) => api(client, "POST", routes.messages, { chatId: GROUP_CHAT_ID, attachment });
  /** Shares the folder in the group, uploading it unless it's live. */
  async function share(client: Client, { live = false, uploaded = !live }: { live?: boolean; uploaded?: boolean } = {}): Promise<Message> {
    const res = await announce(client, { name: "Trip", size: bytes.length, mimeType: "application/zip", live, folder: { files } });
    expect(res.status).toBe(201);
    const message = (await res.json()) as Message;
    if (uploaded) {
      await upload(client, message.id, bytes);
      await api(client, "POST", routes.attachmentChecksum(message.id), { sha256: sha256(bytes) });
    }
    return message;
  }
  /** Plays the sender's page: answers the host's requests for the folder's bytes. Returns what was asked for. */
  function serveFolder(sender: Client) {
    const asked: number[] = [];
    sender.socket.on("message", (raw) => {
      const event = JSON.parse(raw.toString()) as ServerEvent;
      if (event.type !== "stream:request") return;
      asked.push(event.start);
      void fetch(base + routes.streamData(event.requestId), {
        method: "PUT",
        headers: { authorization: `Bearer ${sender.token}`, "content-type": "application/octet-stream" },
        body: new Uint8Array(bytes.subarray(event.start, event.end + 1)),
      });
    });
    return asked;
  }
  const list = async (client: Client, id: string, dir = "") =>
    (await (await api(client, "GET", routes.folderFiles(id) + `?dir=${encodeURIComponent(dir)}`)).json()) as FolderListing;
  const fileUrl = (client: Client, id: string, path: string, preview = false) =>
    base + routes.folderFile(id) + `?token=${client.token}&path=${encodeURIComponent(path)}${preview ? "&preview=1" : ""}`;
  const fileOf = async (client: Client, id: string, path: string) => Buffer.from(await (await fetch(fileUrl(client, id, path))).arrayBuffer());

  /** Unzips with macOS's own tools, checking every file's CRC; returns the folder as extracted. */
  async function unzipped(zip: Buffer): Promise<Record<string, Buffer>> {
    const dir = await mkdtemp(join(tmpdir(), "landrop-zip-"));
    try {
      await writeFile(join(dir, "Trip.zip"), zip);
      execFileSync("unzip", ["-tq", join(dir, "Trip.zip")]);
      // ditto is what Finder's Archive Utility uses.
      execFileSync("ditto", ["-x", "-k", join(dir, "Trip.zip"), join(dir, "out")]);
      const out: Record<string, Buffer> = {};
      for (const path of Object.keys(folder)) out[path] = await readFile(join(dir, "out", path));
      return out;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("lets others open a folder and get each file exactly as sent, or all of it as a zip any Mac can open", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    const sent = await share(alice);
    expect(sent.attachment).toMatchObject({ name: "Trip.zip", mimeType: "application/zip", size: bytes.length, folder: { files: 5 } });
    // Opened a level at a time: each subfolder shows what it holds in total.
    expect(await list(bob, sent.id)).toEqual({
      folders: [{ name: "day 1", files: 3, size: folder["day 1/notes.txt"].length + folder["day 1/clips/wave.mp4"].length }],
      files: [files[0], files[4]],
    });
    expect((await list(bob, sent.id, "day 1")).folders).toEqual([{ name: "clips", files: 1, size: 20_000 }]);
    for (const [path, data] of Object.entries(folder)) expect((await fileOf(bob, sent.id, path)).equals(data)).toBe(true);
    const zip = await download(bob, sent.id);
    const body = Buffer.from(await zip.arrayBuffer());
    expect(Number(zip.headers.get("content-length"))).toBe(body.length);
    expect(await unzipped(body)).toEqual(folder);
  });

  it("shows photos and videos inside a folder inline and in ranges, but everything else only as a download", async () => {
    const alice = await join_("Alice");
    const sent = await share(alice);
    const photo = await fetch(fileUrl(alice, sent.id, "beach.jpg", true));
    expect(photo.headers.get("content-type")).toBe("image/jpeg");
    expect(photo.headers.get("content-security-policy")).toContain("sandbox");
    const clip = await fetch(fileUrl(alice, sent.id, "day 1/clips/wave.mp4", true), { headers: { range: "bytes=100-199" } });
    expect(clip.status).toBe(206);
    expect(Buffer.from(await clip.arrayBuffer()).equals(folder["day 1/clips/wave.mp4"].subarray(100, 200))).toBe(true);
    const page = await fetch(fileUrl(alice, sent.id, "page.html", true));
    expect(page.headers.get("content-type")).toBe("application/octet-stream");
    expect(page.headers.get("content-disposition")).toMatch(/^attachment/);
  });

  it("lists a live folder without asking the sender, then streams each file and the zip from the sender's page", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    const asked = serveFolder(alice);
    const sent = await share(alice, { live: true });
    // Opening the folder is instant: the host already knows what's in it.
    expect((await list(bob, sent.id)).files.map((f) => f.path)).toEqual(["beach.jpg", "page.html"]);
    expect(asked).toEqual([]);
    expect((await fileOf(bob, sent.id, "day 1/notes.txt")).equals(folder["day 1/notes.txt"])).toBe(true);
    expect(await unzipped(Buffer.from(await (await download(bob, sent.id)).arrayBuffer()))).toEqual(folder);
  });

  it("can be opened the moment it's sent: while it uploads, the sender's page serves it", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    serveFolder(alice);
    const sent = await share(alice, { uploaded: false });
    expect(sent.attachment?.status).toBe("uploading");
    expect((await fileOf(bob, sent.id, "beach.jpg")).equals(folder["beach.jpg"])).toBe(true);
    // A plain file still can't be read half-uploaded; only folders have their sender to fall back on.
    const plain = await attach(alice, randomBytes(100));
    expect((await download(bob, plain.id)).status).toBe(409);
  });

  it("shares a folder of any number of files, listed gzipped, and zips it so any Mac can open it", async () => {
    const alice = await join_("Alice");
    // Over 65,535 files, the most a plain zip holds, so the zip needs its zip64 records.
    const many = Array.from({ length: 70_000 }, (_, i) => ({ path: `node_modules/pkg-${i % 700}/file-${i}.js`, size: 1 }));
    const body = gzipSync(JSON.stringify({ chatId: GROUP_CHAT_ID, attachment: { name: "Huge", size: many.length, live: true, folder: { files: many } } }));
    const res = await fetch(base + routes.messages, {
      method: "POST",
      headers: { authorization: `Bearer ${alice.token}`, "content-type": "application/json", "content-encoding": "gzip" },
      body: new Uint8Array(body),
    });
    expect(res.status).toBe(201);
    const sent = (await res.json()) as Message;
    expect(sent.attachment?.folder).toEqual({ files: 70_000 });
    const top = await list(alice, sent.id, "node_modules");
    expect(top.folders.length).toBe(700);
    expect(top.folders[2]).toEqual({ name: "pkg-2", files: 100, size: 100 });
    // The sender's page serves each file's single byte.
    alice.socket.on("message", (raw) => {
      const event = JSON.parse(raw.toString()) as ServerEvent;
      if (event.type !== "stream:request") return;
      void fetch(base + routes.streamData(event.requestId), {
        method: "PUT",
        headers: { authorization: `Bearer ${alice.token}`, "content-type": "application/octet-stream" },
        body: new Uint8Array(event.end - event.start + 1).fill(120),
      });
    });
    const dir = await mkdtemp(join(tmpdir(), "landrop-zip-"));
    try {
      await writeFile(join(dir, "Huge.zip"), Buffer.from(await (await download(alice, sent.id)).arrayBuffer()));
      execFileSync("unzip", ["-tq", join(dir, "Huge.zip")]);
      expect(execFileSync("unzip", ["-p", join(dir, "Huge.zip"), "node_modules/pkg-5/file-69305.js"]).toString()).toBe("x");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("lets a page from another LAN address send a gzipped list (the browser asks first)", async () => {
    const res = await fetch(base + routes.messages, {
      method: "OPTIONS",
      headers: {
        origin: "http://192.168.0.20:3001",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type,content-encoding",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toContain("content-encoding");
  });

  it("refuses a list that would unpack past the limit, however small it is compressed", async () => {
    const alice = await join_("Alice");
    const bomb = gzipSync(Buffer.alloc(MAX_FOLDER_LIST_BYTES + 1, " "));
    const res = await fetch(base + routes.messages, {
      method: "POST",
      headers: { authorization: `Bearer ${alice.token}`, "content-type": "application/json", "content-encoding": "gzip" },
      body: new Uint8Array(bomb),
    });
    expect(res.status).toBe(413);
  });

  it("uploads folders up to 2 GB, where single files must go live past 500 MB", async () => {
    const alice = await join_("Alice");
    const big = MAX_ATTACHMENT_BYTES + 1;
    const one = (size: number) => ({ files: [{ path: "film.mp4", size }] });
    expect((await announce(alice, { name: "Trip", size: big, folder: one(big) })).status).toBe(201);
    expect((await announce(alice, { name: "film.mp4", size: big, mimeType: "video/mp4" })).status).toBe(400);
    const tooBig = MAX_FOLDER_UPLOAD_BYTES + 1;
    expect((await announce(alice, { name: "Trip", size: tooBig, folder: one(tooBig) })).status).toBe(400);
    expect((await announce(alice, { name: "Trip", size: tooBig, live: true, folder: one(tooBig) })).status).toBe(201);
  });

  it("refuses a folder whose list could escape it when unzipped, or doesn't match its bytes", async () => {
    const alice = await join_("Alice");
    const send = (list: FolderFile[], size = list.reduce((sum, f) => sum + f.size, 0)) =>
      announce(alice, { name: "Trip", size, folder: { files: list } }).then((r) => r.status);
    expect(await send([{ path: "../../.ssh/authorized_keys", size: 1 }])).toBe(400);
    expect(await send([{ path: "/etc/passwd", size: 1 }])).toBe(400);
    expect(await send([{ path: "a\\..\\b", size: 1 }])).toBe(400);
    expect(await send([{ path: "a.txt", size: 1 }, { path: "a.txt", size: 1 }])).toBe(400);
    expect(await send([{ path: "a.txt", size: 1 }], 2)).toBe(400);
  });

  it("won't list a file that isn't a folder, or serve paths that aren't in the folder", async () => {
    const alice = await join_("Alice");
    const data = randomBytes(100);
    const plain = await attach(alice, data);
    await upload(alice, plain.id, data);
    await api(alice, "POST", routes.attachmentChecksum(plain.id), { sha256: sha256(data) });
    expect((await api(alice, "GET", routes.folderFiles(plain.id))).status).toBe(415);
    const sent = await share(alice);
    expect((await fetch(fileUrl(alice, sent.id, "../landrop.db"))).status).toBe(404);
  });
});

describe("profile photos", () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(200)]);
  const putPhoto = (client: Client, id: string, body: Buffer, type = "image/jpeg") =>
    fetch(base + routes.deviceAvatar(id), {
      method: "PUT",
      headers: { authorization: `Bearer ${client.token}`, "content-type": type },
      body: new Uint8Array(body),
    });

  it("shows everyone a device's new photo, and the photo is exactly what was uploaded", async () => {
    const a = newIdentity();
    const alice = await join_("Alice", a);
    const bob = await join_("Bob");
    expect((await putPhoto(alice, a.deviceId, jpeg)).status).toBe(200);
    const { device } = await bob.waitFor("device:updated");
    expect(device).toMatchObject({ id: a.deviceId, avatarAt: expect.any(Number) });
    const photo = await fetch(base + routes.deviceAvatar(a.deviceId) + `?token=${bob.token}`);
    expect(photo.headers.get("content-type")).toBe("image/jpeg");
    expect(Buffer.from(await photo.arrayBuffer()).equals(jpeg)).toBe(true);
  });

  it("only lets a device change its own photo, and only to a real image", async () => {
    const a = newIdentity();
    const alice = await join_("Alice", a);
    const bob = await join_("Bob");
    expect((await putPhoto(bob, a.deviceId, jpeg)).status).toBe(403);
    // Labelled as an image, but it's a web page: refused rather than served back as one.
    expect((await putPhoto(alice, a.deviceId, Buffer.from("<script>alert(1)</script>"))).status).toBe(415);
    expect((await putPhoto(alice, a.deviceId, Buffer.concat([jpeg, Buffer.alloc(MAX_AVATAR_BYTES)]))).status).toBe(413);
  });

  it("removes a photo for everyone", async () => {
    const a = newIdentity();
    const alice = await join_("Alice", a);
    await putPhoto(alice, a.deviceId, jpeg);
    expect((await api(alice, "DELETE", routes.deviceAvatar(a.deviceId))).status).toBe(200);
    expect((await fetch(base + routes.deviceAvatar(a.deviceId) + `?token=${alice.token}`)).status).toBe(404);
    const later = await join_("Bob");
    expect(later.welcome.directory.find((d) => d.id === a.deviceId)?.avatarAt).toBeUndefined();
  });
});

describe("attachments", () => {
  it("lets everyone download exactly the sender's bytes once the SHA-256 is verified", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const data = randomBytes(5 * 1024 * 1024);
    const message = await attach(mac, data);
    expect((await phone.waitFor("message:created")).message.attachment?.status).toBe("uploading");

    // Not downloadable until verified: a half-uploaded file must never be handed out.
    expect((await download(phone, message.id)).status).toBe(409);
    expect(await (await upload(mac, message.id, data)).json()).toEqual({ sha256: sha256(data) });
    await api(mac, "POST", routes.attachmentChecksum(message.id), { sha256: sha256(data) });

    const ready = await phone.waitFor("message:updated");
    expect(ready.message.attachment).toMatchObject({ status: "ready", sha256: sha256(data) });
    await phone.waitFor("attachment:progress", (e) => e.messageId === message.id && e.bytesReceived === data.length);
    const res = await download(phone, message.id);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(sha256(Buffer.from(await res.arrayBuffer()))).toBe(sha256(data));
  });

  it("marks the attachment failed when the checksum does not match", async () => {
    const mac = await join_("Mac");
    const data = randomBytes(64 * 1024);
    const message = await attach(mac, data);
    await upload(mac, message.id, data);
    expect((await api(mac, "POST", routes.attachmentChecksum(message.id), { sha256: "0".repeat(64) })).status).toBe(422);
    expect((await mac.waitFor("message:updated")).message.attachment?.status).toBe("failed");
    expect((await download(mac, message.id)).status).toBe(409);
  });

  it("caps uploads at 500 MB so one upload can't fill the host's disk; bigger files must go live", async () => {
    const mac = await join_("Mac");
    const file = { name: "huge.iso", size: MAX_ATTACHMENT_BYTES + 1, mimeType: "application/octet-stream" };
    expect((await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, attachment: file })).status).toBe(400);
    const res = await api(mac, "POST", routes.messages, { chatId: GROUP_CHAT_ID, attachment: { ...file, live: true } });
    expect(res.status).toBe(201);
    expect(((await res.json()) as Message).attachment?.status).toBe("live");
  });

  it("only accepts a body whose length matches what was announced to the chat", async () => {
    const mac = await join_("Mac");
    const message = await attach(mac, randomBytes(1000));
    const chunked = await fetch(base + routes.attachmentData(message.id), {
      method: "PUT",
      headers: { authorization: `Bearer ${mac.token}`, "content-type": "application/octet-stream" },
      body: new Blob([randomBytes(1000)]).stream(),
      duplex: "half",
    } as RequestInit);
    expect(chunked.status).toBe(411);
    expect((await upload(mac, message.id, randomBytes(2000))).status).toBe(400);
  });

  it("only lets the sender upload the bytes for its own attachment", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const data = randomBytes(100);
    const message = await attach(mac, data);
    expect((await upload(phone, message.id, data)).status).toBe(403);
  });

  it("fails an unfinished attachment when its sender leaves, so nobody waits forever", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const message = await attach(mac, randomBytes(100));
    mac.socket.close();
    const failed = await phone.waitFor("message:updated", (e) => e.message.id === message.id);
    expect(failed.message.attachment?.status).toBe("failed");
  });
});

/** Byte i of a test live file; deterministic so any range can be checked. */
const liveByte = (i: number) => i % 251;
const liveBytes = (start: number, end: number) => Buffer.from(Array.from({ length: end - start + 1 }, (_, k) => liveByte(start + k)));

/** Plays the sender's tab: answers each stream request with exactly the bytes asked for. */
function serveLive(sender: Client) {
  const requests: { start: number; end: number }[] = [];
  sender.socket.on("message", (raw) => {
    const event = JSON.parse(raw.toString()) as ServerEvent;
    if (event.type !== "stream:request") return;
    requests.push({ start: event.start, end: event.end });
    void fetch(base + routes.streamData(event.requestId), {
      method: "PUT",
      headers: { authorization: `Bearer ${sender.token}`, "content-type": "application/octet-stream" },
      body: new Uint8Array(liveBytes(event.start, event.end)),
    });
  });
  return requests;
}

async function goLive(sender: Client, size: number, chatId = GROUP_CHAT_ID): Promise<Message> {
  const res = await api(sender, "POST", routes.messages, {
    chatId,
    attachment: { name: "movie.mp4", size, mimeType: "video/mp4", live: true },
  });
  expect(res.status).toBe(201);
  return (await res.json()) as Message;
}

describe("live files", () => {
  it("streams a file of any size straight from the sender's tab, never storing it on the host", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const requests = serveLive(mac);
    const size = 20 * 1024 * 1024 + 7; // several relay pieces, with an uneven tail
    const message = await goLive(mac, size);

    const res = await download(phone, message.id);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(liveBytes(0, size - 1))).toBe(true);
    expect(requests.length).toBeGreaterThan(1);
    expect(await readdir(join(dataDir, "files"))).toEqual([]);
  });

  it("serves only the requested range, so a phone can start a huge video anywhere without fetching the rest", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const requests = serveLive(mac);
    const size = 40 * 1024 ** 3; // 40 GB: only what's watched ever crosses the network
    const message = await goLive(mac, size);

    const res = await fetch(base + routes.attachmentPreview(message.id) + `?token=${phone.token}`, {
      headers: { range: "bytes=30000000000-30000000099" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe(`bytes 30000000000-30000000099/${size}`);
    expect(Buffer.from(await res.arrayBuffer()).equals(liveBytes(30_000_000_000, 30_000_000_099))).toBe(true);
    expect(requests).toEqual([{ start: 30_000_000_000, end: 30_000_000_099 }]);
  });

  it("stops asking the sender for more once a viewer stops reading, like a paused or closed video", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const requests = serveLive(mac);
    const message = await goLive(mac, 200 * 1024 * 1024);

    const reader = (await download(phone, message.id)).body!.getReader();
    await reader.read();
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 300));
    const afterStop = requests.length;
    await new Promise((r) => setTimeout(r, 300));
    expect(requests.length).toBe(afterStop);
    expect(afterStop).toBeLessThan(10); // nowhere near the ~100 pieces of the whole file
  });

  it("removes a live file from the chat when its sender leaves, telling everyone why", async () => {
    await app.close();
    await start(undefined, 50);
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const message = await goLive(mac, 1000);

    mac.socket.close();
    const deleted = await phone.waitFor("message:deleted", (e) => e.messageId === message.id);
    expect(deleted.reason).toBe("sender-offline");
    expect((await download(phone, message.id)).status).toBe(404);
  });

  it("keeps a live file through a brief reconnect of the same page, which still holds the file", async () => {
    await app.close();
    await start(undefined, 500);
    const identity = newIdentity();
    const tabId = randomBytes(16).toString("hex");
    const mac = await join_("Mac", identity, tabId);
    const phone = await join_("iPhone");
    const message = await goLive(mac, 1000);

    mac.socket.close();
    await phone.waitFor("presence:update", (e) => e.online.length === 1);
    const back = await join_("Mac", identity, tabId);
    serveLive(back);
    await new Promise((r) => setTimeout(r, 700)); // past the grace period
    const res = await download(phone, message.id);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(liveBytes(0, 999))).toBe(true);
  });

  it("tells a viewer the sender is gone with an error, not an empty file", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const message = await goLive(mac, 1000);
    mac.socket.close();
    await phone.waitFor("presence:update", (e) => e.online.length === 1);
    expect((await download(phone, message.id)).status).toBe(503); // within the grace period
  });

  it("only lets the sender's own page answer for its live file, and keeps private ones private", async () => {
    const mac = await join_("Mac");
    const phone = await join_("iPhone");
    const laptop = await join_("Laptop");
    const message = await goLive(mac, 1000, privateChatId(mac.welcome.self.id, phone.welcome.self.id));

    expect((await download(laptop, message.id)).status).toBe(404);
    // Another device can't slip its own bytes into the sender's stream.
    const pending = download(phone, message.id);
    const request = await mac.waitFor("stream:request");
    const forged = await fetch(base + routes.streamData(request.requestId), {
      method: "PUT",
      headers: { authorization: `Bearer ${laptop.token}`, "content-type": "application/octet-stream" },
      body: new Uint8Array(1000),
    });
    expect(forged.status).toBe(404);
    serveLive(mac);
    await fetch(base + routes.streamData(request.requestId), {
      method: "PUT",
      headers: { authorization: `Bearer ${mac.token}`, "content-type": "application/octet-stream" },
      body: new Uint8Array(liveBytes(0, 999)),
    });
    expect(Buffer.from(await (await pending).arrayBuffer()).equals(liveBytes(0, 999))).toBe(true);
  });
});

describe("previews", () => {
  async function sendReady(client: Client, data: Buffer, name: string, mimeType: string) {
    const message = await attach(client, data, name, mimeType);
    await upload(client, message.id, data);
    await api(client, "POST", routes.attachmentChecksum(message.id), { sha256: sha256(data) });
    return message;
  }
  const preview = (client: Client, id: string, headers: Record<string, string> = {}) =>
    fetch(base + routes.attachmentPreview(id) + `?token=${client.token}`, { headers });

  it("shows photos inline, labelled with their type and locked down so they can't run script", async () => {
    const mac = await join_("Mac");
    const photo = await sendReady(mac, randomBytes(2048), "IMG_1.jpeg", "image/jpeg");
    const res = await preview(mac, photo.id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    await res.arrayBuffer();
  });

  it("never previews types that can carry code, even if the sender labels them that way", async () => {
    const mac = await join_("Mac");
    const page = await sendReady(mac, Buffer.from("<script>alert(1)</script>"), "x.html", "text/html");
    const svg = await sendReady(mac, Buffer.from("<svg onload='alert(1)'/>"), "x.svg", "image/svg+xml");
    expect((await preview(mac, page.id)).status).toBe(415);
    expect((await preview(mac, svg.id)).status).toBe(415);
  });

  it("streams video in byte ranges so iPhone Safari can play and seek", async () => {
    const mac = await join_("Mac");
    const data = randomBytes(10_000);
    const video = await sendReady(mac, data, "clip.mp4", "video/mp4");
    const res = await preview(mac, video.id, { range: "bytes=100-199" });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 100-199/10000");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(data.subarray(100, 200));
    const beyond = await preview(mac, video.id, { range: "bytes=20000-" });
    expect(beyond.status).toBe(416);
  });

  it("plays voice messages in the chat, as browsers record them, with seeking", async () => {
    const mac = await join_("Mac");
    const data = randomBytes(4000);
    // Chrome records WebM; Safari records MP4. Both must play inline, not download.
    for (const [name, type] of [["Voice message 10.42.webm", "audio/webm"], ["Voice message 10.43.m4a", "audio/mp4"]]) {
      const voice = await sendReady(mac, data, name, type);
      const res = await preview(mac, voice.id, { range: "bytes=0-99" });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe(type);
      expect(res.headers.get("content-disposition")).toMatch(/^inline;/);
      await res.arrayBuffer();
    }
  });

  it("keeps very large photos as downloads instead of decoding them inline on a phone", () => {
    expect(previewKind({ mimeType: "image/png", size: MAX_IMAGE_PREVIEW_BYTES })).toBe("image");
    expect(previewKind({ mimeType: "image/png", size: MAX_IMAGE_PREVIEW_BYTES + 1 })).toBeUndefined();
    expect(previewKind({ mimeType: "VIDEO/MP4", size: MAX_ATTACHMENT_BYTES })).toBe("video");
  });

  it("parses the range forms browsers send", () => {
    expect(parseRange("bytes=0-", 10)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseRange("bytes=5-50", 10)).toEqual({ start: 5, end: 9 });
    expect(parseRange("bytes=0-1,4-5", 10)).toBeUndefined();
    expect(parseRange("bytes=10-", 10)).toBe("unsatisfiable");
  });
});

describe("one address for everything", () => {
  it("tells a page opened as localhost which network addresses phones can scan to join", async () => {
    const { urls } = (await (await fetch(base + routes.join)).json()) as { urls: string[] };
    const port = new URL(base).port;
    // A phone can't open "localhost", and a wrong port would reach nothing.
    for (const url of urls) {
      expect(url).toMatch(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${port}$`));
      expect(url).not.toContain("127.0.0.1");
    }
  });

  it("serves the app and the API from the same port, so phones only need one address", async () => {
    const webDir = join(dataDir, "web");
    await mkdir(join(webDir, "_next", "static"), { recursive: true });
    await writeFile(join(webDir, "index.html"), "<!doctype html><title>LANDrop</title>");
    await writeFile(join(webDir, "_next", "static", "app-3f9a.js"), "console.log(1)");
    await app.close();
    app = await buildApp({ dataDir, webDir });
    await app.listen({ host: "127.0.0.1", port: 0 });
    base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;

    const page = await fetch(base + "/");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("<title>LANDrop</title>");
    // An updated LANDrop must reach phones on their next visit…
    expect(page.headers.get("cache-control")).toBe("no-cache");
    // …while content-hashed build files are fetched once and never again.
    const asset = await fetch(base + "/_next/static/app-3f9a.js");
    expect(asset.headers.get("cache-control")).toContain("immutable");

    expect((await fetch(base + routes.health)).status).toBe(200);
    const phone = await join_("iPhone");
    expect(phone.welcome.self.name).toBe("iPhone");
  });
});

describe("other devices on the network", () => {
  async function startWithScan(scan: () => Promise<NetworkDevice[]>) {
    await app.close();
    app = await buildApp({ dataDir, scanNetwork: scan });
    await app.listen({ host: "127.0.0.1", port: 0 });
    base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  }
  const list = async (token?: string) =>
    fetch(base + routes.network, { headers: token ? { authorization: `Bearer ${token}` } : {} });

  it("lists only devices not already on LANDrop, so the picker doesn't show anyone twice", async () => {
    // Test clients connect from 127.0.0.1, so that address stands for a device using LANDrop.
    await startWithScan(async () => [{ address: "127.0.0.1" }, { address: "192.168.0.50", name: "Living-Room-TV" }]);
    const alice = await join_("Alice");
    const res = await list(alice.token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ devices: [{ address: "192.168.0.50", name: "Living-Room-TV" }] });
  });

  it("is only for devices that joined: the network's contents are not for passers-by", async () => {
    await startWithScan(async () => [{ address: "192.168.0.50" }]);
    expect((await list()).status).toBe(401);
  });

  it("reuses a recent scan, so many people opening the picker don't flood the network", async () => {
    let scans = 0;
    await startWithScan(async () => (scans++, [{ address: "192.168.0.50" }]));
    const alice = await join_("Alice");
    await Promise.all([list(alice.token), list(alice.token), list(alice.token)]);
    expect(scans).toBe(1);
  });

  it("reads the neighbour tables of macOS, Windows and Linux, skipping who didn't answer", () => {
    const mac = [
      "? (192.168.0.1) at 30:b5:c2:5c:fd:20 on en0 ifscope [ethernet]",
      "? (192.168.0.2) at (incomplete) on en0 ifscope [ethernet]",
      "? (192.168.0.100) at 46:55:ef:65:44:a3 on en0 ifscope [ethernet]",
      "? (192.168.0.255) at ff:ff:ff:ff:ff:ff on en0 ifscope [ethernet]",
      "? (224.0.0.251) at 1:0:5e:0:0:fb on en0 ifscope permanent [ethernet]",
    ].join("\n");
    expect(parseNeighbours(mac).map((n) => n.address)).toEqual(["192.168.0.1", "192.168.0.100"]);

    const windows = [
      "Interface: 192.168.0.102 --- 0x5",
      "  Internet Address      Physical Address      Type",
      "  192.168.0.1           30-b5-c2-5c-fd-20     dynamic",
      "  192.168.0.255         ff-ff-ff-ff-ff-ff     static",
    ].join("\n");
    expect(parseNeighbours(windows)).toEqual([{ address: "192.168.0.1", mac: "30:b5:c2:5c:fd:20" }]);

    const linux = [
      "IP address       HW type     Flags       HW address            Mask     Device",
      "192.168.0.1      0x1         0x2         30:b5:c2:5c:fd:20     *        wlan0",
      "192.168.0.7      0x1         0x0         00:00:00:00:00:00     *        wlan0",
    ].join("\n");
    expect(parseNeighbours(linux).map((n) => n.address)).toEqual(["192.168.0.1"]);
  });

  it("knocks on every address of a home network, but only around this machine on a huge one", () => {
    const home = hostsOf({ address: "192.168.0.102", netmask: "255.255.255.0" });
    expect(home).toHaveLength(254);
    expect(home[0]).toBe("192.168.0.1");
    expect(home.at(-1)).toBe("192.168.0.254");
    // A /8 would be 16 million packets; the /24 around this machine is where home devices are.
    const huge = hostsOf({ address: "10.20.30.40", netmask: "255.0.0.0" });
    expect(huge).toHaveLength(254);
    expect(huge[0]).toBe("10.20.30.1");
  });
});

describe("one phone, several browsers", () => {
  it("gives every browser on one phone the same machine id, so lists can show that phone once", async () => {
    // Joins happen in order, so each lookup answers for the next browser to join.
    const machines = ["4a:11:22:33:44:55", "4a:11:22:33:44:55", "9e:66:77:88:99:00"];
    await app.close();
    app = await buildApp({ dataDir, machineOf: async () => machines.shift() });
    await app.listen({ host: "127.0.0.1", port: 0 });
    base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;

    const samsungInternet = await join_("Samsung");
    const samsungChrome = await join_("Android phone · Chrome");
    const laptop = await join_("Windows PC · Edge");
    const known = await laptop.waitFor("presence:update", (e) => e.online.filter((d) => d.machine).length === 3);
    const machineOf = (c: Client) => known.online.find((d) => d.id === c.welcome.self.id)?.machine;

    expect(machineOf(samsungInternet)).toBe(machineOf(samsungChrome));
    expect(machineOf(laptop)).not.toBe(machineOf(samsungInternet));
    // Others only need to compare machines; the phone's hardware address isn't handed out.
    expect(machineOf(samsungInternet)).not.toContain("4a:11");

    // Remembered while the phone is away, so it still shows once under "Not online".
    samsungInternet.socket.close();
    samsungChrome.socket.close();
    const later = await join_("Mac · Safari");
    const directory = later.welcome.directory.filter((d) => d.id !== later.welcome.self.id && d.id !== laptop.welcome.self.id);
    expect(new Set(directory.map((d) => d.machine)).size).toBe(1);
  });
});

describe("network boundary", () => {
  it("rejects browser pages served from outside the local network", async () => {
    expect((await fetch(base + routes.health, { headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await fetch(base + routes.health, { headers: { origin: "http://192.168.1.20:3000" } })).status).toBe(200);
    const socket = new WebSocket(base.replace("http", "ws") + routes.ws, { headers: { origin: "https://evil.example" } });
    const status = await new Promise<number>((r) =>
      socket.once("unexpected-response", (req, res) => {
        req.destroy();
        r(res.statusCode!);
      }),
    );
    expect(status).toBe(403);
  });

  it("never lets a received file name carry a path or break the header", () => {
    const header = contentDisposition("../../etc/passwd\r\nSet-Cookie: x");
    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain('filename=".._.._etc_passwdSet-Cookie: x"');
    expect(contentDisposition("résumé.pdf")).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf");
  });
});

describe("history per network", () => {
  // A free port, so the restarted server can listen on the same one.
  const freePort = async () => {
    const probe = await buildApp({ dataDir: await mkdtemp(join(tmpdir(), "landrop-port-")) });
    await probe.listen({ host: "127.0.0.1", port: 0 });
    const { port } = probe.server.address() as { port: number };
    await probe.close();
    return port;
  };
  const until = async (done: () => boolean) => {
    for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 20));
    expect(done()).toBe(true);
  };

  // Two different Wi-Fis whose routers use the same common address, as most home routers do.
  const home = { gateway: "192.168.0.1", router: "3c:78:95:1e:4d:9c" };
  const office = { gateway: "192.168.0.1", router: "a4:2b:b0:11:22:33" };
  const homeId = "3c-78-95-1e-4d-9c";
  const officeId = "a4-2b-b0-11-22-33";
  const pause = () => new Promise((r) => setTimeout(r, 50));

  it("keeps each network's history in its own folder, and switches when the computer changes network", async () => {
    let network: Network | undefined = home;
    const host = await startHost({ dataDir, port: await freePort(), readNetwork: async () => network, checkMs: 10 });
    try {
      expect(existsSync(join(dataDir, "networks", homeId, "landrop.db"))).toBe(true);

      // Dropping off Wi-Fi for a moment isn't a new network: home's history stays open.
      network = undefined;
      await pause();
      expect(host.networkId()).toBe(homeId);

      // Same router address, different router: a different network, so a different history.
      network = office;
      await until(() => host.networkId() === officeId);
      expect(existsSync(join(dataDir, "networks", officeId, "landrop.db"))).toBe(true);
    } finally {
      await host.close();
    }
  });

  it("stays on the same history when the router's hardware address can't be read for a moment", async () => {
    let network: Network | undefined = home;
    const host = await startHost({ dataDir, port: await freePort(), readNetwork: async () => network, checkMs: 10 });
    try {
      network = { gateway: home.gateway };
      await pause();
      expect(host.networkId()).toBe(homeId);
      // But a different router address is a different network, even unidentified: never home's history.
      network = { gateway: "10.0.0.1" };
      await until(() => host.networkId() === "10-0-0-1");
    } finally {
      await host.close();
    }
  });

  it("moves history kept under the router's address to the router, once its hardware address can be read", async () => {
    // Kept while macOS hadn't given LANDrop Local Network access, so only the address was known.
    let network: Network = { gateway: home.gateway };
    let host = await startHost({ dataDir, port: await freePort(), readNetwork: async () => network, checkMs: 60_000 });
    await host.close();
    await writeFile(join(dataDir, "networks", "192-168-0-1", "files", "m1"), "attachment");

    network = home;
    host = await startHost({ dataDir, port: await freePort(), readNetwork: async () => network, checkMs: 60_000 });
    await host.close();
    expect(existsSync(join(dataDir, "networks", homeId, "files", "m1"))).toBe(true);
    expect(existsSync(join(dataDir, "networks", "192-168-0-1"))).toBe(false);
  });

  it("gives history from before networks were tracked to the network the computer is on", async () => {
    // The previous version kept everything directly in the data folder.
    await (await buildApp({ dataDir })).close();
    await writeFile(join(dataDir, "files", "m1"), "attachment");

    const host = await startHost({ dataDir, port: await freePort(), readNetwork: async () => home, checkMs: 60_000 });
    await host.close();

    const folder = join(dataDir, "networks", homeId);
    expect(existsSync(join(folder, "landrop.db"))).toBe(true);
    expect(existsSync(join(folder, "files", "m1"))).toBe(true);
    expect(existsSync(join(dataDir, "landrop.db"))).toBe(false);
  });
});

describe("parseGateway", () => {
  it("reads the router from macOS, Windows and Linux routing tables", () => {
    expect(parseGateway("   route to: default\ndestination: default\n    gateway: 192.168.0.1\n  interface: en0\n")).toBe("192.168.0.1");
    expect(
      parseGateway("Network Destination        Netmask          Gateway       Interface  Metric\n          0.0.0.0          0.0.0.0      10.0.0.138       10.0.0.12     25\n"),
    ).toBe("10.0.0.138");
    expect(
      parseGateway("Iface\tDestination\tGateway \tFlags\nwlan0\t00000000\t0100A8C0\t0003\nwlan0\t0000A8C0\t00000000\t0001\n"),
    ).toBe("192.168.0.1");
    expect(parseGateway("")).toBeUndefined();
  });
});

describe("host message hook", () => {
  // Why: the host app turns this into a system notification, so it must fire for what others send
  // to the host, and never echo the host's own messages or leak chats the host isn't part of.
  async function startWithHook() {
    await app.close();
    const seen: { message: Message; groupName?: string }[] = [];
    let fromHost = false;
    app = await buildApp({ dataDir, isHost: () => fromHost, onMessage: (e) => seen.push(e) });
    await app.listen({ host: "127.0.0.1", port: 0 });
    base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    return { seen, asHost: (on: boolean) => (fromHost = on) };
  }
  const post = (client: Client, chatId: string, text: string) => api(client, "POST", routes.messages, { chatId, text });

  it("reports what a guest sends to everyone, but not the host's own messages", async () => {
    const { seen, asHost } = await startWithHook();
    asHost(true);
    const host = await join_("Host");
    asHost(false);
    const guest = await join_("Guest");

    await post(guest, GROUP_CHAT_ID, "hello host");
    expect(seen.map((e) => e.message.text)).toEqual(["hello host"]);

    asHost(true);
    await post(host, GROUP_CHAT_ID, "hello guests");
    asHost(false);
    expect(seen).toHaveLength(1);
  });

  it("stays quiet about private chats the host isn't in", async () => {
    const { seen, asHost } = await startWithHook();
    asHost(true);
    await join_("Host");
    asHost(false);
    const alice = await join_("Alice");
    const bob = await join_("Bob");

    await post(alice, privateChatId(alice.welcome.self.id, bob.welcome.self.id), "secret");
    expect(seen).toEqual([]);
  });
});

describe("forwarding messages", () => {
  // Why: "forward" must hand the other chat its own copy, so removing the original later doesn't
  // break it, and it must never expose a chat or a file the forwarder couldn't already see.
  const forward = (client: Client, messageId: string, chatId: string) => api(client, "POST", routes.forward, { messageId, chatId });

  it("copies a text message into another chat as the forwarder's own", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    const sent = (await (await api(alice, "POST", routes.messages, { chatId: GROUP_CHAT_ID, text: "see you at 5" })).json()) as Message;
    const chatId = privateChatId(bob.welcome.self.id, alice.welcome.self.id);

    const res = await forward(bob, sent.id, chatId);

    expect(res.status).toBe(201);
    const copy = (await res.json()) as Message;
    expect(copy).toMatchObject({ chatId, text: "see you at 5", senderId: bob.welcome.self.id });
    expect(copy.id).not.toBe(sent.id);
  });

  it("copies a stored file, which stays downloadable after the original is removed", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    const data = Buffer.from("forwarded bytes");
    const original = await attach(alice, data, "notes.txt", "text/plain");
    await upload(alice, original.id, data);
    await api(alice, "POST", routes.attachmentChecksum(original.id), { sha256: sha256(data) });
    const chatId = privateChatId(bob.welcome.self.id, alice.welcome.self.id);

    const copy = (await (await forward(bob, original.id, chatId)).json()) as Message;
    await api(alice, "DELETE", routes.message(original.id));

    expect(copy.attachment).toMatchObject({ name: "notes.txt", status: "ready", sha256: sha256(data) });
    const res = await download(bob, copy.id);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(data);
  });

  it("refuses a file that isn't stored on the host yet", async () => {
    const alice = await join_("Alice");
    const pending = await attach(alice, Buffer.from("not uploaded"));

    expect((await forward(alice, pending.id, GROUP_CHAT_ID)).status).toBe(409);
  });

  it("refuses messages from chats the forwarder can't see", async () => {
    const alice = await join_("Alice");
    const bob = await join_("Bob");
    const eve = await join_("Eve");
    const secret = (await (await api(alice, "POST", routes.messages, { chatId: privateChatId(alice.welcome.self.id, bob.welcome.self.id), text: "private" })).json()) as Message;

    expect((await forward(eve, secret.id, GROUP_CHAT_ID)).status).toBe(404);
  });
});
