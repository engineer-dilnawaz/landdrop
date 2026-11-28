import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  GROUP_CHAT_ID,
  MAX_AVATAR_BYTES,
  MAX_GROUP_MEMBERS,
  chatMembers,
  isAvailable,
  isGroupId,
  type Attachment,
  type AttachmentStatus,
  type ChatRead,
  type Device,
  type FolderFile,
  type ChatMeta,
  type Group,
  type KnownDevice,
  type Message,
  type MessageInfo,
  type ServerEvent,
  type UpdateChatMetaRequest,
} from "@landrop/protocol";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/** Delivers an event to the members of a chat (everyone for the group), and to any extra devices named. */
type Broadcast = (event: ServerEvent, chatId: string, alsoTo?: string[]) => void;

interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  created_at: number;
  text: string | null;
  att_name: string | null;
  att_size: number | null;
  att_mime: string | null;
  att_status: AttachmentStatus | null;
  att_sha256: string | null;
  att_folder_files: number | null;
  reply_to_id: string | null;
  reply_sender_id: string | null;
  reply_sender_name: string | null;
  reply_preview: string | null;
}

interface Upload {
  chatId: string;
  controller: AbortController;
  /** SHA-256 of the bytes that arrived; set when the body is complete. */
  receivedHash?: string;
  progress: { lastAt: number; lastBytes: number };
}

const PROGRESS_INTERVAL_MS = 250;
const STREAM_CHUNK_BYTES = 1024 * 1024;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  text TEXT,
  att_name TEXT,
  att_size INTEGER,
  att_mime TEXT,
  att_status TEXT,
  att_sha256 TEXT
);
CREATE INDEX IF NOT EXISTS messages_created_at ON messages (created_at);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  PRIMARY KEY (group_id, device_id)
);
-- One row each time a device reads further, so message info can say when each message was first read.
CREATE TABLE IF NOT EXISTS chat_reads (
  chat_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  up_to INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_reads_chat ON chat_reads (chat_id, device_id, up_to);
-- A shared folder's files (JSON), in the order of its bytes; can run to tens of megabytes, so
-- kept out of the messages table and read only when the folder is opened.
CREATE TABLE IF NOT EXISTS folder_lists (
  message_id TEXT PRIMARY KEY,
  files TEXT NOT NULL
);
-- However a folder's message goes, its list goes with it.
CREATE TRIGGER IF NOT EXISTS folder_lists_cleanup AFTER DELETE ON messages BEGIN
  DELETE FROM folder_lists WHERE message_id = old.id;
END;
-- What a chat's members share: its one pinned message and, for the LANDrop group, its name.
CREATE TABLE IF NOT EXISTS chat_meta (
  chat_id TEXT PRIMARY KEY,
  pinned_message_id TEXT,
  name TEXT
);
CREATE TABLE IF NOT EXISTS chat_clears (
  device_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  cleared_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, chat_id)
);
`;

/** Columns added after the first release; applied to existing databases on startup. */
const ADDED_COLUMNS = [
  "reply_to_id TEXT",
  "reply_sender_name TEXT",
  "reply_preview TEXT",
  "reply_sender_id TEXT",
  // Messages from before private chats existed all belong to the group.
  "chat_id TEXT NOT NULL DEFAULT 'group'",
  // How many files a shared folder holds; set only for folders.
  "att_folder_files INTEGER",
];

const REPLY_PREVIEW_LENGTH = 120;
const IDLE_DEVICE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Chat history and attachments for the group and private chats, persisted on the host.
 * Private chats are only ever read by, delivered to, or downloaded by their two members.
 * Attachments are stored under the message id, never under the sender's file
 * name, so names can't escape the data directory.
 */
export class ChatStore {
  private readonly uploads = new Map<string, Upload>();
  private lastTime = 0;

  private constructor(
    private readonly db: DatabaseSync,
    private readonly filesDir: string,
    private readonly avatarsDir: string,
    private readonly broadcast: Broadcast,
  ) {}

  static async open(dataDir: string, broadcast: Broadcast): Promise<ChatStore> {
    const filesDir = join(dataDir, "files");
    await mkdir(filesDir, { recursive: true });
    const db = new DatabaseSync(join(dataDir, "landrop.db"));
    db.exec(SCHEMA);
    const existing = new Set((db.prepare("PRAGMA table_info(messages)").all() as { name: string }[]).map((c) => c.name));
    for (const column of ADDED_COLUMNS) {
      if (!existing.has(column.split(" ")[0])) db.exec(`ALTER TABLE messages ADD COLUMN ${column}`);
    }
    db.exec("CREATE INDEX IF NOT EXISTS messages_chat ON messages (chat_id, created_at)");
    const deviceColumns = (db.prepare("PRAGMA table_info(devices)").all() as { name: string }[]).map((c) => c.name);
    if (!deviceColumns.includes("machine")) db.exec("ALTER TABLE devices ADD COLUMN machine TEXT");
    if (!deviceColumns.includes("avatar_at")) db.exec("ALTER TABLE devices ADD COLUMN avatar_at INTEGER");
    await mkdir(join(dataDir, "avatars"), { recursive: true });
    const store = new ChatStore(db, filesDir, join(dataDir, "avatars"), broadcast);
    await store.failInterruptedUploads();
    // Live files exist only in their senders' tabs, which a restart has disconnected.
    db.exec("DELETE FROM messages WHERE att_status = 'live'");
    await store.pruneIdleDevices();
    return store;
  }

  /**
   * Forgets devices that have been away a week and have no private chat or group of their own. Their
   * messages in the shared chat stay, under the name they were sent with. Every new browser or cleared
   * browser storage makes a new device, so without this the list only ever grows. A device that comes
   * back simply joins again.
   */
  async pruneIdleDevices(): Promise<number> {
    const idle = this.db
      .prepare(
        `SELECT id FROM devices
         WHERE last_seen < ?
           AND NOT EXISTS (SELECT 1 FROM messages WHERE chat_id LIKE 'dm:%' AND chat_id LIKE '%' || devices.id || '%')
           AND NOT EXISTS (SELECT 1 FROM group_members WHERE device_id = devices.id)
           AND NOT EXISTS (SELECT 1 FROM groups WHERE created_by = devices.id)`,
      )
      .all(Date.now() - IDLE_DEVICE_MS) as { id: string }[];
    for (const { id } of idle) {
      this.db.prepare("DELETE FROM devices WHERE id = ?").run(id);
      this.db.prepare("DELETE FROM chat_reads WHERE device_id = ?").run(id);
      this.db.prepare("DELETE FROM chat_clears WHERE device_id = ?").run(id);
      await rm(join(this.avatarsDir, id), { force: true });
    }
    return idle.length;
  }

  close(): void {
    for (const upload of this.uploads.values()) upload.controller.abort();
    this.db.close();
  }

  // ---------- Devices ----------

  /**
   * Trust on first use: the first hello for a device id records a hash of its
   * secret; later hellos must present the same secret, so nobody else can post
   * under that device's name.
   */
  authenticateDevice(id: string, secret: string, name: string): boolean {
    const hash = createHash("sha256").update(secret).digest();
    const row = this.db.prepare("SELECT secret_hash FROM devices WHERE id = ?").get(id) as
      | { secret_hash: string }
      | undefined;
    if (row && !timingSafeEqual(Buffer.from(row.secret_hash, "hex"), hash)) return false;
    this.db
      .prepare(
        `INSERT INTO devices (id, name, secret_hash, last_seen) VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen`,
      )
      .run(id, name, hash.toString("hex"), Date.now());
    return true;
  }

  /** Every device that has ever joined, with its current name and when it was last connected. */
  directory(): KnownDevice[] {
    const rows = this.db
      .prepare("SELECT id, name, last_seen AS lastSeen, machine, avatar_at AS avatarAt FROM devices")
      .all() as unknown as (KnownDevice & { machine: string | null; avatarAt: number | null })[];
    return rows.map(({ machine, avatarAt, ...d }) => ({ ...d, ...(machine && { machine }), ...(avatarAt && { avatarAt }) }));
  }

  // ---------- Profile photos ----------

  /** Sets a device's profile photo. Only real JPEG, PNG or WebP images are kept, whatever they're labelled. */
  async setAvatar(id: string, data: Buffer): Promise<KnownDevice> {
    if (data.length === 0 || data.length > MAX_AVATAR_BYTES) throw new HttpError(413, "That photo is too large");
    if (!imageType(data)) throw new HttpError(415, "Choose a JPEG, PNG or WebP photo");
    await writeFile(join(this.avatarsDir, id), data);
    this.db.prepare("UPDATE devices SET avatar_at = ? WHERE id = ?").run(this.clock(), id);
    return this.knownDevice(id);
  }

  async removeAvatar(id: string): Promise<KnownDevice> {
    await rm(join(this.avatarsDir, id), { force: true });
    this.db.prepare("UPDATE devices SET avatar_at = NULL WHERE id = ?").run(id);
    return this.knownDevice(id);
  }

  /** A device's profile photo and its image type, or undefined if it has none. */
  async avatar(id: string): Promise<{ data: Buffer; type: string } | undefined> {
    const known = this.directory().find((d) => d.id === id);
    if (!known?.avatarAt) return undefined;
    const data = await readFile(join(this.avatarsDir, id)).catch(() => undefined);
    const type = data && imageType(data);
    return data && type ? { data, type } : undefined;
  }

  private knownDevice(id: string): KnownDevice {
    return this.directory().find((d) => d.id === id)!;
  }

  /** Records which phone or computer a device (one browser) runs on. */
  setMachine(id: string, machine: string): void {
    this.db.prepare("UPDATE devices SET machine = ? WHERE id = ?").run(machine, id);
  }

  /** Records that a device was connected until now. */
  touch(id: string): void {
    this.db.prepare("UPDATE devices SET last_seen = ? WHERE id = ?").run(Date.now(), id);
  }

  rename(id: string, name: string): void {
    this.db.prepare("UPDATE devices SET name = ? WHERE id = ?").run(name, id);
  }

  // ---------- Messages ----------

  /** The most recent messages of every chat this device is in, up to `limit` per chat, oldest first. */
  history(deviceId: string, limit: number): Message[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM (
           SELECT *, rowid AS seq, ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at DESC, rowid DESC) AS rank
           FROM messages m WHERE (chat_id = 'group' OR chat_id LIKE ?
             OR chat_id IN (SELECT group_id FROM group_members WHERE device_id = ?))
             AND created_at > COALESCE((SELECT cleared_at FROM chat_clears c WHERE c.device_id = ? AND c.chat_id = m.chat_id), -1)
         ) WHERE rank <= ? ORDER BY created_at, seq`,
      )
      .all(`%${deviceId}%`, deviceId, deviceId, limit) as unknown as MessageRow[];
    return rows.map(toMessage).filter((m) => this.canSee(m.chatId, deviceId));
  }

  /**
   * Deletes a chat's history for one device, like WhatsApp's "Delete chat": it stops receiving the
   * messages so far, while the others in the chat keep theirs. Returns the time it was cleared up to.
   */
  clearChat(chatId: string, deviceId: string): number {
    if (!this.canSee(chatId, deviceId)) throw new HttpError(404, "Chat not found");
    const before = this.clock();
    this.db
      .prepare(
        `INSERT INTO chat_clears (device_id, chat_id, cleared_at) VALUES (?, ?, ?)
         ON CONFLICT (device_id, chat_id) DO UPDATE SET cleared_at = excluded.cleared_at`,
      )
      .run(deviceId, chatId, before);
    return before;
  }

  // ---------- Read receipts ----------

  /** Records that a device has read a chat up to `upTo`; returns the new read, or nothing if it isn't further than before. */
  markRead(chatId: string, deviceId: string, upTo: number): ChatRead | undefined {
    if (!this.canSee(chatId, deviceId)) throw new HttpError(404, "Chat not found");
    // From the same clock as messages, so one sent in the same millisecond still counts as after the read.
    const now = this.clock();
    // Nobody can have read a message that doesn't exist yet.
    const capped = Math.min(upTo, now);
    const { furthest } = this.db
      .prepare("SELECT MAX(up_to) AS furthest FROM chat_reads WHERE chat_id = ? AND device_id = ?")
      .get(chatId, deviceId) as { furthest: number | null };
    if (furthest !== null && capped <= furthest) return undefined;
    this.db.prepare("INSERT INTO chat_reads (chat_id, device_id, up_to, at) VALUES (?, ?, ?, ?)").run(chatId, deviceId, capped, now);
    return { chatId, deviceId, upTo: capped };
  }

  /** How far each member has read each chat this device is in. */
  readsFor(deviceId: string): ChatRead[] {
    const rows = this.db
      .prepare("SELECT chat_id AS chatId, device_id AS deviceId, MAX(up_to) AS upTo FROM chat_reads GROUP BY chat_id, device_id")
      .all() as unknown as ChatRead[];
    return rows.filter((r) => this.canSee(r.chatId, deviceId));
  }

  /** Who has read a message and when each first did; for anyone in its chat. */
  messageInfo(id: string, deviceId: string): MessageInfo {
    const message = this.get(id);
    if (!message || !this.canSee(message.chatId, deviceId)) throw new HttpError(404, "Message not found");
    const reads = this.db
      .prepare("SELECT device_id AS deviceId, MIN(at) AS at FROM chat_reads WHERE chat_id = ? AND up_to >= ? AND device_id != ? GROUP BY device_id")
      .all(message.chatId, message.createdAt, message.senderId ?? "") as unknown as MessageInfo["reads"];
    return { reads };
  }

  createText(sender: Device, chatId: string, text: string, replyToId?: string): Message {
    this.assertCanPost(chatId, sender.id);
    const message: Message = {
      id: randomUUID(),
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: this.clock(),
      text,
      ...this.replyTo(replyToId, chatId),
    };
    this.insert(message);
    this.broadcast({ type: "message:created", message }, chatId);
    return message;
  }

  createAttachment(
    sender: Device,
    chatId: string,
    { live, folder, ...file }: Omit<Attachment, "status" | "sha256" | "folder"> & { live: boolean; folder?: { files: FolderFile[] } },
    replyToId?: string,
  ): Message {
    this.assertCanPost(chatId, sender.id);
    const message: Message = {
      id: randomUUID(),
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: this.clock(),
      // A folder is always a zip, whatever its sender labelled it, so it downloads as one.
      attachment: folder
        ? {
            ...file,
            name: file.name.endsWith(".zip") ? file.name : `${file.name}.zip`,
            mimeType: "application/zip",
            folder: { files: folder.files.length },
            status: live ? "live" : "uploading",
          }
        : { ...file, status: live ? "live" : "uploading" },
      ...this.replyTo(replyToId, chatId),
    };
    this.insert(message);
    if (folder) this.db.prepare("INSERT INTO folder_lists (message_id, files) VALUES (?, ?)").run(message.id, JSON.stringify(folder.files));
    this.broadcast({ type: "message:created", message }, chatId);
    return message;
  }

  /**
   * Sends a copy of a message `sender` can see to `chatId`. A stored file is copied on disk, so
   * nothing is downloaded or uploaded again; a file still uploading or shared live from its
   * sender isn't here to copy, so it can't be forwarded.
   */
  async forward(sender: Device, messageId: string, chatId: string): Promise<Message> {
    const source = this.get(messageId);
    if (!source || !this.canSee(source.chatId, sender.id)) throw new HttpError(404, "Message not found");
    this.assertCanPost(chatId, sender.id);
    const { attachment } = source;
    if (attachment && attachment.status !== "ready") throw new HttpError(409, "This file isn't stored here, so it can't be forwarded");
    const message: Message = {
      id: randomUUID(),
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: this.clock(),
      ...(source.text !== undefined && { text: source.text }),
      ...(attachment && { attachment: { ...attachment } }),
    };
    if (attachment) {
      await copyFile(this.filePath(source.id), this.filePath(message.id));
      // The row's checksum is written below: insert() only carries the fields every message has.
    }
    this.insert(message);
    if (attachment) {
      this.db.prepare("UPDATE messages SET att_sha256 = ? WHERE id = ?").run(attachment.sha256 ?? null, message.id);
      if (attachment.folder) {
        this.db.prepare("INSERT INTO folder_lists (message_id, files) SELECT ?, files FROM folder_lists WHERE message_id = ?").run(message.id, source.id);
      }
    }
    const stored = this.get(message.id)!;
    this.broadcast({ type: "message:created", message: stored }, chatId);
    return stored;
  }

  /** What's in a shared folder, in the order of its bytes. */
  folderFiles(id: string): FolderFile[] {
    const row = this.db.prepare("SELECT files FROM folder_lists WHERE message_id = ?").get(id) as { files: string } | undefined;
    if (!row) throw new HttpError(422, "This folder can't be opened");
    return JSON.parse(row.files) as FolderFile[];
  }

  /** Streams an attachment to disk, hashing as bytes arrive. Memory use is bounded by stream buffers. */
  async receive(id: string, senderId: string, body: Readable, contentLength: number | undefined): Promise<{ sha256: string }> {
    const message = this.uploadable(id, senderId);
    const attachment = message.attachment!;
    if (this.uploads.has(id)) throw new HttpError(409, "Attachment is already uploading");
    if (contentLength === undefined) throw new HttpError(411, "Content-Length is required");
    if (contentLength !== attachment.size) {
      throw new HttpError(400, `Content-Length ${contentLength} does not match declared size ${attachment.size}`);
    }

    const upload: Upload = {
      chatId: message.chatId,
      controller: new AbortController(),
      progress: { lastAt: performance.now(), lastBytes: 0 },
    };
    this.uploads.set(id, upload);
    const hash = createHash("sha256");
    let received = 0;
    const meter = new Transform({
      transform: (chunk: Buffer, _encoding, callback) => {
        received += chunk.length;
        if (received > attachment.size) return callback(new HttpError(400, "Body exceeds declared size"));
        hash.update(chunk);
        this.reportProgress(id, upload, received);
        callback(null, chunk);
      },
    });

    try {
      await pipeline(body, meter, createWriteStream(this.filePath(id), { highWaterMark: STREAM_CHUNK_BYTES }), {
        signal: upload.controller.signal,
      });
    } catch (err) {
      await this.fail(id);
      throw err instanceof HttpError ? err : new HttpError(400, "Upload interrupted");
    }
    if (received !== attachment.size) {
      await this.fail(id);
      throw new HttpError(400, "Upload incomplete");
    }
    upload.receivedHash = hash.digest("hex");
    this.reportProgress(id, upload, received, true);
    return { sha256: upload.receivedHash };
  }

  /**
   * The sender submits the SHA-256 it computed from the original file. Only a
   * match makes the attachment downloadable, proving the host holds exactly the sender's bytes.
   */
  async verify(id: string, senderId: string, sha256: string): Promise<Message> {
    this.uploadable(id, senderId);
    const received = this.uploads.get(id)?.receivedHash;
    if (!received) throw new HttpError(409, "Attachment has not been fully uploaded");
    if (received !== sha256) {
      await this.fail(id);
      throw new HttpError(422, "Checksum mismatch");
    }
    this.uploads.delete(id);
    this.db.prepare("UPDATE messages SET att_status = 'ready', att_sha256 = ? WHERE id = ?").run(received, id);
    return this.emitUpdated(id);
  }

  /** An attachment this device may read now (see isAvailable). */
  availableAttachment(id: string, deviceId: string): Attachment {
    const message = this.get(id);
    const attachment = message && this.canSee(message.chatId, deviceId) ? message.attachment : undefined;
    if (!attachment) throw new HttpError(404, "Attachment not found");
    if (!isAvailable(attachment)) throw new HttpError(409, `Attachment is ${attachment.status}`);
    return attachment;
  }

  /** Streams the stored file, or the inclusive byte range [start, end] of it. */
  openFile(id: string, range?: { start: number; end: number }) {
    return createReadStream(this.filePath(id), { highWaterMark: STREAM_CHUNK_BYTES, ...range });
  }

  /** The sender left, so its unfinished attachments (started or not) can't complete. */
  async failUploadsFrom(senderId: string): Promise<void> {
    const rows = this.db
      .prepare("SELECT id FROM messages WHERE sender_id = ? AND att_status = 'uploading'")
      .all(senderId) as { id: string }[];
    for (const { id } of rows) await this.fail(id);
  }

  /**
   * Removes a message (and its file) for everyone. Senders may remove their own; the host may
   * also remove anyone's in the group, but never in private chats it isn't part of.
   */
  async remove(id: string, deviceId: string, isHost: boolean): Promise<void> {
    const message = this.get(id);
    if (!message || !this.canSee(message.chatId, deviceId)) throw new HttpError(404, "Message not found");
    const moderating = isHost && this.members(message.chatId) === "everyone";
    if (message.senderId !== deviceId && !moderating) throw new HttpError(403, "You can only remove your own messages");
    this.uploads.get(id)?.controller.abort();
    this.uploads.delete(id);
    this.db.prepare("DELETE FROM messages WHERE id = ?").run(id);
    await rm(this.filePath(id), { force: true });
    this.broadcast({ type: "message:deleted", messageId: id, chatId: message.chatId }, message.chatId);
  }

  /** A live file's sender left: it can't be read any more, so it leaves the chat. */
  removeLive(id: string): void {
    const message = this.get(id);
    if (message?.attachment?.status !== "live") return;
    this.db.prepare("DELETE FROM messages WHERE id = ?").run(id);
    this.broadcast({ type: "message:deleted", messageId: id, chatId: message.chatId, reason: "sender-offline" }, message.chatId);
  }

  // ---------- Groups ----------

  /** Who is in a chat: "everyone" for the LANDrop group, device ids for a private chat or group, undefined if there's no such chat. */
  members(chatId: string): "everyone" | string[] | undefined {
    if (!isGroupId(chatId)) return chatMembers(chatId);
    const rows = this.db.prepare("SELECT device_id FROM group_members WHERE group_id = ?").all(chatId) as { device_id: string }[];
    return rows.length ? rows.map((r) => r.device_id) : undefined;
  }

  // ---------- Pinned message and name ----------

  private metaOf(chatId: string): ChatMeta {
    const row = this.db.prepare("SELECT pinned_message_id AS pinned, name FROM chat_meta WHERE chat_id = ?").get(chatId) as
      | { pinned: string | null; name: string | null }
      | undefined;
    return { chatId, ...(row?.pinned && { pinnedMessageId: row.pinned }), ...(row?.name && { name: row.name }) };
  }

  /** The pinned message and name of every chat a device is in that has either. */
  metaFor(deviceId: string): ChatMeta[] {
    const rows = this.db.prepare("SELECT chat_id FROM chat_meta").all() as { chat_id: string }[];
    return rows
      .map((r) => r.chat_id)
      .filter((id) => {
        const members = this.members(id);
        return members === "everyone" || !!members?.includes(deviceId);
      })
      .map((id) => this.metaOf(id));
  }

  /** Any member may pin or unpin a message, or name the LANDrop group; everyone in the chat sees it. */
  updateMeta(chatId: string, deviceId: string, change: UpdateChatMetaRequest): ChatMeta {
    const members = this.members(chatId);
    if (members !== "everyone" && !members?.includes(deviceId)) throw new HttpError(404, "Chat not found");
    if (change.name !== undefined && chatId !== GROUP_CHAT_ID) throw new HttpError(400, "Only the LANDrop group is named here");
    if (change.pinnedMessageId && this.get(change.pinnedMessageId)?.chatId !== chatId) throw new HttpError(404, "Message not found");
    const current = this.metaOf(chatId);
    const pinned = change.pinnedMessageId === undefined ? current.pinnedMessageId : change.pinnedMessageId;
    const name = change.name === undefined ? current.name : change.name || undefined;
    this.db
      .prepare(
        `INSERT INTO chat_meta (chat_id, pinned_message_id, name) VALUES (?, ?, ?)
         ON CONFLICT (chat_id) DO UPDATE SET pinned_message_id = excluded.pinned_message_id, name = excluded.name`,
      )
      .run(chatId, pinned ?? null, name ?? null);
    const meta = this.metaOf(chatId);
    this.broadcast({ type: "chat:meta", meta }, chatId);
    return meta;
  }

  /** The groups a device is in. */
  groupsOf(deviceId: string): Group[] {
    const ids = this.db.prepare("SELECT group_id FROM group_members WHERE device_id = ?").all(deviceId) as { group_id: string }[];
    return ids.map((r) => this.group(r.group_id)!);
  }

  createGroup(creatorId: string, name: string, memberIds: string[]): Group {
    const members = this.knownDevices([creatorId, ...memberIds]);
    if (members.length < 2) throw new HttpError(400, "Choose at least one other device");
    const id = `grp:${randomBytes(16).toString("hex")}`;
    this.db.prepare("INSERT INTO groups (id, name, created_by, created_at) VALUES (?, ?, ?, ?)").run(id, name, creatorId, Date.now());
    const add = this.db.prepare("INSERT INTO group_members (group_id, device_id) VALUES (?, ?)");
    for (const member of members) add.run(id, member);
    const group = this.group(id)!;
    this.broadcast({ type: "group:updated", group }, id);
    return group;
  }

  /** Any member may rename a group or add devices. Added devices see the group's messages from now on, not its history. */
  updateGroup(id: string, deviceId: string, change: { name?: string; addMembers?: string[] }): Group {
    const current = this.group(id);
    if (!current?.members.includes(deviceId)) throw new HttpError(404, "Group not found");
    if (change.name) this.db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(change.name, id);
    const added = this.knownDevices(change.addMembers ?? []).filter((m) => !current.members.includes(m));
    if (current.members.length + added.length > MAX_GROUP_MEMBERS) throw new HttpError(400, `A group can have up to ${MAX_GROUP_MEMBERS} devices`);
    const add = this.db.prepare("INSERT INTO group_members (group_id, device_id) VALUES (?, ?)");
    const clear = this.db.prepare("INSERT OR REPLACE INTO chat_clears (device_id, chat_id, cleared_at) VALUES (?, ?, ?)");
    const now = this.clock();
    for (const member of added) {
      add.run(id, member);
      clear.run(member, id, now);
    }
    const group = this.group(id)!;
    this.broadcast({ type: "group:updated", group }, id);
    return group;
  }

  /** A device leaves a group. The last one out deletes it, with its messages and files. */
  async leaveGroup(id: string, deviceId: string): Promise<void> {
    const current = this.group(id);
    if (!current?.members.includes(deviceId)) throw new HttpError(404, "Group not found");
    this.db.prepare("DELETE FROM group_members WHERE group_id = ? AND device_id = ?").run(id, deviceId);
    this.db.prepare("DELETE FROM chat_clears WHERE device_id = ? AND chat_id = ?").run(deviceId, id);
    this.broadcast({ type: "group:left", groupId: id }, id, [deviceId]);
    if (current.members.length > 1) {
      this.broadcast({ type: "group:updated", group: this.group(id)! }, id);
      return;
    }
    const files = this.db.prepare("SELECT id FROM messages WHERE chat_id = ? AND att_name IS NOT NULL").all(id) as { id: string }[];
    for (const { id: messageId } of files) {
      this.uploads.get(messageId)?.controller.abort();
      this.uploads.delete(messageId);
      await rm(this.filePath(messageId), { force: true });
    }
    this.db.prepare("DELETE FROM messages WHERE chat_id = ?").run(id);
    this.db.prepare("DELETE FROM chat_clears WHERE chat_id = ?").run(id);
    this.db.prepare("DELETE FROM chat_reads WHERE chat_id = ?").run(id);
    this.db.prepare("DELETE FROM groups WHERE id = ?").run(id);
  }

  groupName(id: string): string | undefined {
    return this.group(id)?.name;
  }

  private group(id: string): Group | undefined {
    const row = this.db.prepare("SELECT id, name, created_by AS createdBy, created_at AS createdAt FROM groups WHERE id = ?").get(id) as
      | Omit<Group, "members">
      | undefined;
    if (!row) return undefined;
    const members = this.db.prepare("SELECT device_id FROM group_members WHERE group_id = ? ORDER BY device_id").all(id) as { device_id: string }[];
    return { ...row, members: members.map((m) => m.device_id) };
  }

  /** The ids that belong to devices that have joined, without repeats. */
  private knownDevices(ids: string[]): string[] {
    const known = this.db.prepare("SELECT 1 FROM devices WHERE id = ?");
    return [...new Set(ids)].filter((id) => known.get(id));
  }

  // ---------- Internals ----------

  /**
   * Message and clear times, never the same twice: a message sent the same millisecond a chat was
   * cleared (or a device added to a group) must still count as after it.
   */
  private clock(): number {
    this.lastTime = Math.max(Date.now(), this.lastTime + 1);
    return this.lastTime;
  }

  /** Whether a device may read a chat: everyone may read the LANDrop group; only their members a private chat or group. */
  private canSee(chatId: string, deviceId: string): boolean {
    const members = this.members(chatId);
    return members === "everyone" || (members !== undefined && members.includes(deviceId));
  }

  private assertCanPost(chatId: string, deviceId: string): void {
    const members = this.members(chatId);
    if (members === "everyone") return;
    if (!members?.includes(deviceId)) throw new HttpError(403, "You are not in this chat");
    if (isGroupId(chatId)) return;
    const other = members[0] === deviceId ? members[1] : members[0];
    if (!this.db.prepare("SELECT 1 FROM devices WHERE id = ?").get(other)) throw new HttpError(404, "Unknown device");
  }

  private replyTo(replyToId: string | undefined, chatId: string): Pick<Message, "replyTo"> {
    if (!replyToId) return {};
    const original = this.get(replyToId);
    if (!original || original.chatId !== chatId) throw new HttpError(400, "The message you replied to no longer exists");
    const preview = original.text ?? `📄 ${original.attachment?.name ?? "Attachment"}`;
    return {
      replyTo: {
        id: original.id,
        senderId: original.senderId,
        senderName: original.senderName,
        preview: preview.slice(0, REPLY_PREVIEW_LENGTH),
      },
    };
  }

  private uploadable(id: string, senderId: string): Message {
    const message = this.get(id);
    if (!message?.attachment) throw new HttpError(404, "Attachment not found");
    if (message.senderId !== senderId) throw new HttpError(403, "Only the sender can upload this attachment");
    if (message.attachment.status !== "uploading") throw new HttpError(409, `Attachment is ${message.attachment.status}`);
    return message;
  }

  private async fail(id: string): Promise<void> {
    const upload = this.uploads.get(id);
    this.uploads.delete(id);
    upload?.controller.abort();
    const result = this.db.prepare("UPDATE messages SET att_status = 'failed' WHERE id = ? AND att_status = 'uploading'").run(id);
    await rm(this.filePath(id), { force: true });
    if (result.changes > 0) this.emitUpdated(id);
  }

  /** Uploads can't survive a restart: mark them failed and drop partial files. */
  private async failInterruptedUploads(): Promise<void> {
    const rows = this.db.prepare("SELECT id FROM messages WHERE att_status = 'uploading'").all() as { id: string }[];
    this.db.exec("UPDATE messages SET att_status = 'failed' WHERE att_status = 'uploading'");
    await Promise.all(rows.map((r) => rm(this.filePath(r.id), { force: true })));
  }

  private reportProgress(id: string, upload: Upload, bytes: number, force = false): void {
    const now = performance.now();
    const elapsedMs = now - upload.progress.lastAt;
    if (!force && elapsedMs < PROGRESS_INTERVAL_MS) return;
    const bytesPerSecond = elapsedMs > 0 ? ((bytes - upload.progress.lastBytes) * 1000) / elapsedMs : 0;
    upload.progress = { lastAt: now, lastBytes: bytes };
    this.broadcast({ type: "attachment:progress", messageId: id, bytesReceived: bytes, bytesPerSecond }, upload.chatId);
  }

  private insert(m: Message): void {
    this.db
      .prepare(
        `INSERT INTO messages (id, chat_id, sender_id, sender_name, created_at, text, att_name, att_size, att_mime, att_status,
                               att_folder_files, reply_to_id, reply_sender_id, reply_sender_name, reply_preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        m.id,
        m.chatId,
        m.senderId,
        m.senderName,
        m.createdAt,
        m.text ?? null,
        m.attachment?.name ?? null,
        m.attachment?.size ?? null,
        m.attachment?.mimeType ?? null,
        m.attachment?.status ?? null,
        m.attachment?.folder?.files ?? null,
        m.replyTo?.id ?? null,
        m.replyTo?.senderId ?? null,
        m.replyTo?.senderName ?? null,
        m.replyTo?.preview ?? null,
      );
  }

  private get(id: string): Message | undefined {
    const row = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as unknown as MessageRow | undefined;
    return row && toMessage(row);
  }

  private emitUpdated(id: string): Message {
    const message = this.get(id)!;
    this.broadcast({ type: "message:updated", message }, message.chatId);
    return message;
  }

  private filePath(id: string): string {
    return join(this.filesDir, id);
  }
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    createdAt: row.created_at,
    ...(row.text !== null && { text: row.text }),
    ...(row.att_name !== null && {
      attachment: {
        name: row.att_name,
        size: row.att_size!,
        mimeType: row.att_mime!,
        status: row.att_status!,
        ...(row.att_sha256 !== null && { sha256: row.att_sha256 }),
        ...(row.att_folder_files !== null && { folder: { files: row.att_folder_files } }),
      },
    }),
    ...(row.reply_to_id !== null && {
      replyTo: {
        id: row.reply_to_id,
        ...(row.reply_sender_id !== null && { senderId: row.reply_sender_id }),
        senderName: row.reply_sender_name!,
        preview: row.reply_preview!,
      },
    }),
  };
}

/** What an image really is, from its first bytes: JPEG, PNG or WebP, else undefined. */
function imageType(data: Buffer): string | undefined {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (data.length >= 12 && data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}
