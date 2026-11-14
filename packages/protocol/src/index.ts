import { z } from "zod";

/**
 * LANDrop wire protocol. Shared by every client and the LAN server.
 * Bump PROTOCOL_VERSION on any incompatible change; the server refuses
 * clients that speak a different version instead of misinterpreting them.
 */
export const PROTOCOL_VERSION = 6;
export const DEFAULT_LAN_PORT = 4545;
export const API_PREFIX = "/api/v1";

export const MAX_TEXT_LENGTH = 64 * 1024;
/** Files up to this size are uploaded to the host and stay available; larger ones are streamed live from the sender. */
export const MAX_ATTACHMENT_BYTES = 500 * 1024 * 1024;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_DEVICE_NAME_LENGTH = 64;
/** How many recent messages per chat a device receives when it joins. */
export const HISTORY_LIMIT = 500;

// ---------- Devices ----------

/** A device is a chat participant. Its id and secret are created by the client and kept across reloads. */
export interface Device {
  id: string;
  name: string;
  /**
   * The same for every browser on one phone or computer, so lists can show it once. Opaque; set
   * once the host has worked it out, and missing for devices it couldn't (e.g. behind a VPN).
   */
  machine?: string;
}

/** A device as listed in the directory: every device that has ever joined. */
export interface KnownDevice extends Device {
  /** When the device was last connected (ms since epoch). */
  lastSeen: number;
}

/** Something else on the host's network (a phone, TV, the router) that isn't using LANDrop. */
export interface NetworkDevice {
  address: string;
  /** Only when the device or the router gives one out; many phones don't. */
  name?: string;
}

const DeviceNameSchema = z.string().trim().min(1).max(MAX_DEVICE_NAME_LENGTH);

// ---------- Chats ----------

/** The chat every device is in. */
export const GROUP_CHAT_ID = "group";

/** A private chat between two devices has one id, whichever of them asks for it. */
export function privateChatId(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `dm:${first}:${second}`;
}

/** "everyone" for the group, the two device ids for a private chat, undefined for anything malformed. */
export function chatMembers(chatId: string): "everyone" | [string, string] | undefined {
  if (chatId === GROUP_CHAT_ID) return "everyone";
  const match = /^dm:([0-9a-f]{32}):([0-9a-f]{32})$/.exec(chatId);
  return match && match[1] < match[2] ? [match[1], match[2]] : undefined;
}

const ChatIdSchema = z.string().refine((id) => chatMembers(id) !== undefined, "Unknown chat");

// ---------- Messages ----------

/**
 * "live": never uploaded; the host fetches each requested byte range from the sender's open tab,
 * so it is only available while that tab is connected and is removed when the sender leaves.
 */
export type AttachmentStatus = "uploading" | "ready" | "failed" | "live";

/** Readable now: stored on the host, or live from a sender who is still connected. */
export const isAvailable = (attachment: Pick<Attachment, "status">) =>
  attachment.status === "ready" || attachment.status === "live";

export interface Attachment {
  name: string;
  size: number;
  mimeType: string;
  status: AttachmentStatus;
  /** Set once the sender's checksum matched what the host received. */
  sha256?: string;
}

/** A snapshot of the message being replied to, kept even if the original is later removed. */
export interface ReplyPreview {
  id: string;
  /** Absent on quotes saved before sender ids were recorded. */
  senderId?: string;
  senderName: string;
  preview: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  /** The sender's name when the message was sent. Clients show the current name from the directory instead. */
  senderName: string;
  createdAt: number;
  text?: string;
  attachment?: Attachment;
  replyTo?: ReplyPreview;
}

const ReplyToIdSchema = z.string().uuid().optional();

export const CreateMessageRequestSchema = z.union([
  z.object({ chatId: ChatIdSchema, text: z.string().trim().min(1).max(MAX_TEXT_LENGTH), replyToId: ReplyToIdSchema }),
  z.object({
    chatId: ChatIdSchema,
    replyToId: ReplyToIdSchema,
    attachment: z
      .object({
        name: z.string().min(1).max(MAX_FILE_NAME_LENGTH),
        size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        mimeType: z.string().max(255).default("application/octet-stream"),
        /** Streamed from the sender instead of uploaded; the only way to share a file over the upload cap. */
        live: z.boolean().default(false),
      })
      .refine((a) => a.live || a.size <= MAX_ATTACHMENT_BYTES, "Files over 500 MB are shared live from the sender"),
  }),
]);
export type CreateMessageRequest = z.input<typeof CreateMessageRequestSchema>;

export const SubmitChecksumRequestSchema = z.object({
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

// ---------- Previews ----------

/**
 * Only formats a browser displays without running code are previewed. SVG is
 * excluded because it can carry scripts; everything else stays a download.
 */
const PREVIEWABLE_IMAGES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/heic"]);
const PREVIEWABLE_VIDEOS = new Set(["video/mp4", "video/quicktime", "video/webm"]);
/** Larger photos stay downloads so a phone isn't asked to decode a huge image inline. */
export const MAX_IMAGE_PREVIEW_BYTES = 30 * 1024 * 1024;

export function previewKind(attachment: Pick<Attachment, "mimeType" | "size">): "image" | "video" | undefined {
  const type = attachment.mimeType.toLowerCase();
  if (PREVIEWABLE_IMAGES.has(type)) return attachment.size <= MAX_IMAGE_PREVIEW_BYTES ? "image" : undefined;
  if (PREVIEWABLE_VIDEOS.has(type)) return "video";
  return undefined;
}

// ---------- WebSocket: client -> server ----------

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    protocolVersion: z.number().int(),
    deviceId: z.string().regex(/^[0-9a-f]{32}$/),
    deviceSecret: z.string().regex(/^[0-9a-f]{64}$/),
    /** New on every page load. Live files belong to the tab that holds them, not to the device. */
    tabId: z.string().regex(/^[0-9a-f]{32}$/),
    name: DeviceNameSchema,
  }),
  z.object({ type: z.literal("profile:update"), name: DeviceNameSchema }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ---------- WebSocket: server -> client ----------

export type ServerEvent =
  | {
      type: "session:welcome";
      self: Device;
      token: string;
      online: Device[];
      /** Every device that has joined, with its current name, so renames show on earlier messages too. */
      directory: KnownDevice[];
      messages: Message[];
      /** True only for the machine running the LAN server. */
      isHost: boolean;
    }
  | { type: "presence:update"; online: Device[] }
  /** To every tab of the device that deleted the chat: drop its messages up to `before`. */
  | { type: "chat:cleared"; chatId: string; before: number }
  | { type: "message:created"; message: Message }
  | { type: "message:updated"; message: Message }
  | {
      type: "message:deleted";
      messageId: string;
      chatId: string;
      /** Set when a live file left with its sender rather than being removed by someone. */
      reason?: "sender-offline";
    }
  /** To the tab holding a live file: PUT bytes [start, end] (inclusive) of it to routes.streamData(requestId). */
  | { type: "stream:request"; requestId: string; messageId: string; start: number; end: number }
  | { type: "attachment:progress"; messageId: string; bytesReceived: number; bytesPerSecond: number }
  | { type: "error"; message: string };

// ---------- HTTP routes ----------

export const routes = {
  health: `${API_PREFIX}/health`,
  /** GET → { urls: string[] }: addresses other devices on the network can open to join. */
  join: `${API_PREFIX}/join`,
  /** GET → { devices: NetworkDevice[] }: what else is on the host's network, minus devices using LANDrop. Takes a few seconds. */
  network: `${API_PREFIX}/network`,
  ws: `${API_PREFIX}/ws`,
  messages: `${API_PREFIX}/messages`,
  /** DELETE: deletes the chat's history for this device only; the others in it keep theirs. */
  chat: (id: string) => `${API_PREFIX}/chats/${id}`,
  message: (id: string) => `${API_PREFIX}/messages/${id}`,
  attachmentData: (id: string) => `${API_PREFIX}/messages/${id}/attachment/data`,
  attachmentChecksum: (id: string) => `${API_PREFIX}/messages/${id}/attachment/checksum`,
  attachment: (id: string) => `${API_PREFIX}/messages/${id}/attachment`,
  attachmentPreview: (id: string) => `${API_PREFIX}/messages/${id}/attachment/preview`,
  streamData: (requestId: string) => `${API_PREFIX}/streams/${requestId}`,
} as const;
