"use client";

import { useEffect, useState } from "react";
import type { Message, MessageInfo } from "@landrop/protocol";
import type { Recipient } from "./receipts";
import { Avatar, DoubleTickIcon, Sheet, formatDay, formatTime } from "./ui";

/**
 * WhatsApp's message info: who has read one of your messages and when, who has it but hasn't read
 * it yet, and who hasn't been online since it was sent.
 */
export function MessageInfoSheet({
  message,
  recipients,
  selfId,
  senderName,
  loadInfo,
  onClose,
}: {
  message: Message;
  selfId?: string;
  /** Someone else's message in a group; undefined for your own. */
  senderName?: string;
  /** Kept current as people read and come online, so the sheet updates while it's open. */
  recipients: Recipient[];
  loadInfo: () => Promise<MessageInfo>;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<MessageInfo>();
  const [failed, setFailed] = useState(false);
  const readCount = recipients.filter((r) => r.read).length;

  // Fetched again whenever someone else reads it, for the time they did.
  useEffect(() => {
    let cancelled = false;
    loadInfo()
      .then((next) => !cancelled && setInfo(next))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadInfo is a new function each render
  }, [message.id, readCount]);

  const readAt = (r: Recipient) => {
    const times = info?.reads.filter((x) => r.deviceIds.includes(x.deviceId)).map((x) => x.at) ?? [];
    return times.length ? Math.min(...times) : undefined;
  };
  const read = recipients.filter((r) => r.read).sort((a, b) => (readAt(a) ?? 0) - (readAt(b) ?? 0));
  const delivered = recipients.filter((r) => !r.read && r.delivered);
  const waiting = recipients.filter((r) => !r.delivered);

  const section = (title: string, people: Recipient[], tick: "read" | "delivered" | undefined, detail: (r: Recipient) => string) =>
    people.length > 0 && (
      <section className="border-t border-divider py-2">
        <h3 className="flex items-center gap-2 px-6 py-1.5 text-[14px] text-muted">
          {tick && (
            <span className={tick === "read" ? "text-[#53bdeb]" : ""}>
              <DoubleTickIcon />
            </span>
          )}
          {title}
        </h3>
        <ul>
          {people.map((r) => (
            <li key={r.key} className="flex items-center gap-4 px-6 py-2">
              <Avatar name={r.name} seed={r.deviceIds[0]} />
              <span className="min-w-0 flex-1 truncate text-[16px]">{selfId && r.deviceIds.includes(selfId) ? "You" : r.name}</span>
              <span className="shrink-0 text-[13px] text-muted">{detail(r)}</span>
            </li>
          ))}
        </ul>
      </section>
    );

  const when = (at: number | undefined) => (at === undefined ? "" : `${formatDay(at)}, ${formatTime(at)}`);
  return (
    <Sheet labelledBy="message-info-title" onClose={onClose}>
      <div className="px-6 pt-3 pb-3">
        <h2 id="message-info-title" className="text-[20px] font-medium">
          Message info
        </h2>
        <p
          className={`mt-2 line-clamp-3 rounded-lg px-3 py-2 text-[14.5px] ${
            senderName ? "mr-10 bg-bubble-in text-foreground" : "ml-10 bg-bubble-out text-bubble-out-ink"
          }`}
        >
          {message.text ?? `📄 ${message.attachment?.name ?? "Attachment"}`}
        </p>
        <p className={`mt-1.5 text-[12px] text-muted ${senderName ? "" : "text-right"}`}>
          {senderName ? `Sent by ${senderName}, ` : "Sent "}
          {when(message.createdAt)}
        </p>
      </div>
      <div className="max-h-[50dvh] overflow-y-auto">
        {section("Read by", read, "read", (r) => (info ? when(readAt(r)) : failed ? "" : "…"))}
        {section("Delivered to", delivered, "delivered", () => "")}
        {section("Not delivered yet", waiting, undefined, () => "Offline since it was sent")}
        {recipients.length === 0 && (
          <p className="border-t border-divider px-6 py-6 text-center text-[14px] text-muted">Nobody else is in this chat, apart from your own devices.</p>
        )}
      </div>
    </Sheet>
  );
}
