import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  chatMembers,
  isAvailable,
  type Attachment,
  type AttachmentStatus,
  type Device,
  type KnownDevice,
  type Message,
  type ServerEvent,
} from "@landrop/protocol";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/** Delivers an event to the members of a chat (everyone for the group). */
type Broadcast = (event: ServerEvent, chatId: string) => void;

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
];

const REPLY_PREVIEW_LENGTH = 120;

/**
 * Chat history and attachments for the group and private chats, persisted on the host.
 * Private chats are only ever read by, delivered to, or downloaded by their two members.
 * Attachments are stored under the message id, never under the sender's file
 * name, so names can't escape the data directory.
 */
export class ChatStore {
  private readonly uploads = new Map<string, Upload>();

  private constructor(
    private readonly db: DatabaseSync,
    private readonly filesDir: string,
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
    const store = new ChatStore(db, filesDir, broadcast);
    await store.failInterruptedUploads();
    // Live files exist only in their senders' tabs, which a restart has disconnected.
    db.exec("DELETE FROM messages WHERE att_status = 'live'");
    return store;
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
    const rows = this.db.prepare("SELECT id, name, last_seen AS lastSeen, machine FROM devices").all() as unknown as (KnownDevice & {
      machine: string | null;
    })[];
    return rows.map(({ machine, ...d }) => (machine ? { ...d, machine } : d));
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
           FROM messages m WHERE (chat_id = 'group' OR chat_id LIKE ?)
             AND created_at > COALESCE((SELECT cleared_at FROM chat_clears c WHERE c.device_id = ? AND c.chat_id = m.chat_id), -1)
         ) WHERE rank <= ? ORDER BY created_at, seq`,
      )
      .all(`%${deviceId}%`, deviceId, limit) as unknown as MessageRow[];
    return rows.map(toMessage).filter((m) => this.canSee(m.chatId, deviceId));
  }

  /**
   * Deletes a chat's history for one device, like WhatsApp's "Delete chat": it stops receiving the
   * messages so far, while the others in the chat keep theirs. Returns the time it was cleared up to.
   */
  clearChat(chatId: string, deviceId: string): number {
    if (!this.canSee(chatId, deviceId)) throw new HttpError(404, "Chat not found");
    const before = Date.now();
    this.db
      .prepare(
        `INSERT INTO chat_clears (device_id, chat_id, cleared_at) VALUES (?, ?, ?)
         ON CONFLICT (device_id, chat_id) DO UPDATE SET cleared_at = excluded.cleared_at`,
      )
      .run(deviceId, chatId, before);
    return before;
  }

  createText(sender: Device, chatId: string, text: string, replyToId?: string): Message {
    this.assertCanPost(chatId, sender.id);
    const message: Message = {
      id: randomUUID(),
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: Date.now(),
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
    { live, ...file }: Omit<Attachment, "status" | "sha256"> & { live: boolean },
    replyToId?: string,
  ): Message {
    this.assertCanPost(chatId, sender.id);
    const message: Message = {
      id: randomUUID(),
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: Date.now(),
      attachment: { ...file, status: live ? "live" : "uploading" },
      ...this.replyTo(replyToId, chatId),
    };
    this.insert(message);
    this.broadcast({ type: "message:created", message }, chatId);
    return message;
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

  /** An attachment this device may read now: stored on the host ("ready") or streamed from its sender ("live"). */
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
    const moderating = isHost && chatMembers(message.chatId) === "everyone";
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

  // ---------- Internals ----------

  /** Whether a device may read a chat: everyone may read the group; only the two members a private chat. */
  private canSee(chatId: string, deviceId: string): boolean {
    const members = chatMembers(chatId);
    return members === "everyone" || (members !== undefined && members.includes(deviceId));
  }

  private assertCanPost(chatId: string, deviceId: string): void {
    const members = chatMembers(chatId);
    if (members === "everyone") return;
    if (!members?.includes(deviceId)) throw new HttpError(403, "You are not in this chat");
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
                               reply_to_id, reply_sender_id, reply_sender_name, reply_preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
