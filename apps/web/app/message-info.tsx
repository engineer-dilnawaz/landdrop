"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  /** The offline list can be long (every browser that ever joined), so it starts short. */
  const [showAllWaiting, setShowAllWaiting] = useState(false);
  const WAITING_SHOWN = 4;

  const when = (at: number | undefined) => (at === undefined ? "" : `${formatDay(at)}, ${formatTime(at)}`);
  const row = (r: Recipient, detail: string) => (
    <li key={r.key} className="mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-2">
      <Avatar name={r.name} seed={r.deviceIds[0]} />
      <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium">{selfId && r.deviceIds.includes(selfId) ? "You" : r.name}</span>
      {detail && <span className="shrink-0 text-[13px] tabular-nums text-muted">{detail}</span>}
    </li>
  );
  const section = (title: string, hint: string | undefined, people: Recipient[], tick: "read" | "delivered" | undefined, rows: ReactNode) =>
    people.length > 0 && (
      <section className="pb-1">
        <h3 className="flex items-center gap-2 px-6 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {tick && (
            <span className={tick === "read" ? "text-[#53bdeb]" : ""}>
              <DoubleTickIcon />
            </span>
          )}
          {title}
          <span className="rounded-md bg-field px-1.5 tabular-nums normal-case tracking-normal">{people.length}</span>
        </h3>
        {hint && <p className="px-6 pb-1 text-[13px] leading-snug text-muted">{hint}</p>}
        <ul>{rows}</ul>
      </section>
    );

  const tile = (count: number, label: string, tone?: string) => (
    <div className="rounded-2xl bg-field px-3 py-3 text-center">
      <p className={`text-[22px] font-semibold leading-none tabular-nums ${tone ?? ""}`}>{count}</p>
      <p className="mt-1.5 text-[12px] text-muted">{label}</p>
    </div>
  );

  const shownWaiting = showAllWaiting ? waiting : waiting.slice(0, WAITING_SHOWN);
  const hidden = waiting.length - shownWaiting.length;
  const text = message.text ?? `📄 ${message.attachment?.name ?? "Attachment"}`;
  const mine = !senderName;
  return (
    <Sheet labelledBy="message-info-title" onClose={onClose}>
      <div className="px-6 pb-2 pt-3">
        <h2 id="message-info-title" className="text-[20px] font-semibold tracking-tight">
          Message info
        </h2>
        {/* The clamp sits on an inner element: on the padded box it would show a sliver of the next line. */}
        <div className={`mt-3 flex ${mine ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${mine ? "bg-bubble-out text-bubble-out-ink" : "bg-bubble-in text-foreground"}`}
          >
            <span className="line-clamp-4 whitespace-pre-wrap break-words text-[14.5px] leading-snug">{text}</span>
          </div>
        </div>
        <p className={`mt-2 text-[12px] text-muted ${mine ? "text-right" : ""}`}>
          {senderName ? `Sent by ${senderName}, ` : "Sent "}
          {when(message.createdAt)}
        </p>
        {recipients.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Summary">
            {tile(read.length, "Read", read.length ? "text-[#0e7fb5] dark:text-[#53bdeb]" : "")}
            {tile(delivered.length, "Delivered")}
            {tile(waiting.length, "Waiting")}
          </div>
        )}
      </div>
      <div className="max-h-[46dvh] overflow-y-auto pb-1">
        {section("Read by", undefined, read, "read", read.map((r) => row(r, info ? when(readAt(r)) : failed ? "" : "…")))}
        {section("Delivered to", "Has it, hasn’t opened the chat yet.", delivered, "delivered", delivered.map((r) => row(r, "")))}
        {section(
          "Not delivered yet",
          "Offline since it was sent. They get it when they’re back.",
          waiting,
          undefined,
          <>
            {shownWaiting.map((r) => row(r, ""))}
            {(hidden > 0 || showAllWaiting) && waiting.length > WAITING_SHOWN && (
              <li className="px-3">
                <button
                  onClick={() => setShowAllWaiting((all) => !all)}
                  className="mx-3 rounded-xl px-3 py-2 text-[14px] font-medium text-accent transition-colors hover:bg-hover"
                >
                  {showAllWaiting ? "Show fewer" : `Show ${hidden} more`}
                </button>
              </li>
            )}
          </>,
        )}
        {recipients.length === 0 && (
          <p className="px-6 py-8 text-center text-[14px] text-muted">Nobody else is in this chat, apart from your own devices.</p>
        )}
      </div>
    </Sheet>
  );
}
