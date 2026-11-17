import { chatMembers, type Group, type KnownDevice, type Message } from "@landrop/protocol";

/** WhatsApp's ticks: one grey, two grey once everyone has it, two blue once everyone has read it. */
export type Receipt = "sent" | "delivered" | "read";

/** How far each device has read each chat: chat id → device id → time. */
export type Reads = Record<string, Record<string, number>>;

export interface ReceiptContext {
  devices: Record<string, KnownDevice>;
  isOnline: (id: string) => boolean;
  groups: Record<string, Group>;
  reads: Reads;
}

/** Someone a message went to: one phone or computer, however many of its browsers have joined. */
export interface Recipient {
  key: string;
  name: string;
  deviceIds: string[];
  /** When one of their browsers first read it, if any has; filled in from message info. */
  readAt?: number;
  read: boolean;
  delivered: boolean;
}

/** Devices not seen for this long before a message don't hold back its ticks in the LANDrop group. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

/** Who a message was for, grouped by phone or computer; the sender's own browsers aren't counted. */
export function recipientsOf(m: Message, ctx: ReceiptContext): Recipient[] {
  const sender = m.senderId ? ctx.devices[m.senderId] : undefined;
  const fromSender = (d: KnownDevice) => d.id === m.senderId || (!!sender?.machine && d.machine === sender.machine);
  const members = chatMembers(m.chatId);
  const ids =
    members === "everyone"
      ? Object.values(ctx.devices)
          .filter((d) => ctx.isOnline(d.id) || d.lastSeen >= m.createdAt - STALE_MS)
          .map((d) => d.id)
      : (members ?? ctx.groups[m.chatId]?.members ?? []);
  const people = new Map<string, KnownDevice[]>();
  for (const id of ids) {
    const d = ctx.devices[id];
    if (!d || fromSender(d)) continue;
    const key = d.machine ?? d.id;
    people.set(key, [...(people.get(key) ?? []), d]);
  }
  const reads = ctx.reads[m.chatId] ?? {};
  return [...people].map(([key, devices]) => {
    const lead = devices.reduce((a, b) => (b.lastSeen > a.lastSeen ? b : a));
    const read = devices.some((d) => (reads[d.id] ?? 0) >= m.createdAt);
    return {
      key,
      name: lead.name,
      deviceIds: devices.map((d) => d.id),
      read,
      // Connected since it was sent: it reached them, live or in the history they loaded.
      delivered: read || devices.some((d) => ctx.isOnline(d.id) || d.lastSeen >= m.createdAt),
    };
  });
}

export function receiptOf(m: Message, ctx: ReceiptContext): Receipt {
  const recipients = recipientsOf(m, ctx);
  if (recipients.length && recipients.every((r) => r.read)) return "read";
  if (recipients.length && recipients.every((r) => r.delivered)) return "delivered";
  return "sent";
}
