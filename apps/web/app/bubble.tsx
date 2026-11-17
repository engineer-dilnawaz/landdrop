"use client";

import { useRef, useState } from "react";
import { isAvailable, previewKind, type Attachment, type Message } from "@landrop/protocol";
import type { Progress } from "./landrop";
import { SparkleField } from "./sparkle-field";
import {
  AlertIcon,
  ChevronIcon,
  ClockIcon,
  CopyIcon,
  ReplyIcon,
  SaveIcon,
  TickIcon,
  UploadProgress,
  colourFor,
  copyText,
  formatBytes,
  formatTime,
  linkify,
  truncateLongText,
} from "./ui";

export const TIME_GAP_MS = 15 * 60 * 1000;
export const LONG_PRESS_MS = 450;
const SWIPE_TRIGGER_PX = 56;
const SWIPE_MAX_PX = 72;

interface Gesture {
  x: number;
  y: number;
  swiping: boolean;
  longPressed: boolean;
  /** Current swipe offset; read on release, where React state from this render would be stale. */
  dx: number;
  timer?: ReturnType<typeof setTimeout>;
}

export function Bubble({
  message,
  nameOf,
  own,
  showSender,
  first,
  progress,
  downloadUrl,
  previewUrl,
  onReply,
  onLongPress,
  onQuoteTap,
  onOpenImage,
}: {
  message: Message;
  nameOf: (id: string | undefined, fallback: string) => string;
  own: boolean;
  /** Group chats name the sender at the top of their run of messages, like WhatsApp. */
  showSender: boolean;
  /** First message of a run: it gets the tail. */
  first: boolean;
  progress?: Progress;
  downloadUrl: string;
  previewUrl: string;
  onOpenImage: () => void;
  onReply: () => void;
  /** Press and hold, right-click, or the ⌄ button: the message's actions. */
  onLongPress: () => void;
  onQuoteTap: (id: string) => void;
}) {
  const a = message.attachment;
  const senderName = nameOf(message.senderId, message.senderName);
  const [dx, setDx] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  /** Set when the last press was a long press or swipe, so its trailing click doesn't also open the photo. */
  const gestureConsumedClick = useRef(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const shortText = message.text && !expanded ? truncateLongText(message.text) : undefined;
  // Previews only once the host has verified the bytes (or live from the sender); formats this browser can't show fall back to the file card.
  const preview = a && isAvailable(a) && !previewFailed ? previewKind(a) : undefined;
  const meta = <Meta at={message.createdAt} own={own} status={a?.status} />;

  // Swipe right to reply; press and hold for the actions. Vertical drags stay with the page scroll.
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const g: Gesture = { x: e.clientX, y: e.clientY, swiping: false, longPressed: false, dx: 0 };
      g.timer = setTimeout(() => {
        g.longPressed = true;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
      gesture.current = g;
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      if (!g) return;
      const mx = e.clientX - g.x;
      const my = e.clientY - g.y;
      if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(g.timer);
      if (!g.swiping && !g.longPressed && mx > 10 && Math.abs(mx) > Math.abs(my) * 1.5) {
        g.swiping = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (g.swiping) {
        g.dx = Math.max(0, Math.min(mx, SWIPE_MAX_PX));
        setDx(g.dx);
      }
    },
    onPointerUp: () => {
      const g = gesture.current;
      if (!g) return;
      clearTimeout(g.timer);
      gestureConsumedClick.current = g.longPressed || g.swiping;
      if (g.swiping && g.dx >= SWIPE_TRIGGER_PX) {
        navigator.vibrate?.(10);
        onReply();
      }
      setDx(0);
      gesture.current = null;
    },
    onPointerCancel: () => {
      clearTimeout(gesture.current?.timer);
      gesture.current = null;
      setDx(0);
    },
    // Right-click on computers; on Android a long press also fires this, which the timer has already handled.
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!gesture.current?.longPressed) onLongPress();
    },
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`relative flex items-center gap-2 ${own ? "flex-row-reverse justify-start" : "justify-start"}`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-bar text-muted shadow"
        style={{ opacity: dx / SWIPE_TRIGGER_PX, transform: `translateY(-50%) scale(${dx >= SWIPE_TRIGGER_PX ? 1.15 : 1})` }}
      >
        <ReplyIcon size={18} />
      </span>
      <div
        {...handlers}
        aria-label={own ? undefined : `${senderName}:`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        // "isolate" lets a live file's sparkles sit between the bubble colour and its content.
        className={`group relative isolate max-w-[85%] touch-pan-y rounded-[7.5px] text-[14.5px] leading-[19px] shadow-[0_1px_.5px_rgba(11,20,26,.13)] select-none [-webkit-touch-callout:none] [-webkit-user-select:none] md:max-w-[65%] ${
          dx ? "" : "transition-transform"
        } ${own ? "bg-bubble-out text-bubble-out-ink" : "bg-bubble-in text-foreground"} ${
          first ? (own ? "tail-out rounded-tr-none" : "tail-in rounded-tl-none") : ""
        } ${
          // Media fills the bubble with a thin frame, like WhatsApp; live media gets a wider one so its sparkles show.
          preview ? (a?.status === "live" ? "p-2" : "p-[3px]") : "px-[9px] pb-2 pt-1.5"
        }`}
      >
        {/* WhatsApp's ⌄ on hover: the same actions as press and hold. */}
        <button
          onClick={onLongPress}
          aria-label="Message actions"
          className="absolute right-1 top-1 z-10 hidden size-6 items-center justify-center rounded-full bg-inherit text-muted opacity-0 shadow-[-6px_0_8px_var(--bubble-in)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:flex"
          style={own ? { boxShadow: "-6px 0 8px var(--bubble-out)" } : undefined}
        >
          <ChevronIcon />
        </button>
        {showSender && (
          <p className={`text-[13px] font-medium ${preview ? "px-1.5 pb-1 pt-0.5" : "pb-0.5"}`} style={{ color: colourFor(message.senderId ?? senderName) }}>
            {senderName}
          </p>
        )}
        {message.replyTo && (
          <button
            onClick={() => onQuoteTap(message.replyTo!.id)}
            className="mb-1 block w-full overflow-hidden rounded-md border-l-4 bg-black/5 px-2 py-1.5 text-left text-[13px] leading-[17px] dark:bg-black/20"
            style={{ borderColor: colourFor(message.replyTo.senderId ?? message.replyTo.senderName) }}
          >
            <span className="block font-medium" style={{ color: colourFor(message.replyTo.senderId ?? message.replyTo.senderName) }}>
              {nameOf(message.replyTo.senderId, message.replyTo.senderName)}
            </span>
            <span className="line-clamp-2 opacity-70">{message.replyTo.preview}</span>
          </button>
        )}
        {message.text && (
          // WhatsApp-style time: floated into the last line when it fits, otherwise wrapped onto its own line.
          <p className={`whitespace-pre-wrap wrap-break-word ${preview ? "px-1.5 pt-1" : ""}`}>
            {linkify(shortText ?? message.text, own)}
            {shortText !== undefined && (
              <>
                {"… "}
                <button onClick={() => setExpanded(true)} className="font-medium text-[#027eb5] dark:text-[#53bdeb]">
                  Read more
                </button>
              </>
            )}
            <span className="float-right ml-2.5 mt-2 -mb-1.5">{meta}</span>
          </p>
        )}
        {a && preview === "image" && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next */}
            <img
              src={previewUrl}
              alt={a.name}
              loading="lazy"
              draggable={false}
              onError={() => setPreviewFailed(true)}
              onClick={() => !gestureConsumedClick.current && onOpenImage()}
              className="block max-h-80 min-h-24 min-w-40 max-w-full cursor-zoom-in rounded-[5px] bg-black/10 object-cover md:max-w-[330px]"
            />
            {!message.text && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-end rounded-b-[5px] bg-linear-to-b from-transparent to-black/45 px-2 pb-1 text-white">
                <Meta at={message.createdAt} own={own} status={a.status} onMedia />
              </span>
            )}
          </div>
        )}
        {a && preview === "video" && (
          <>
            <video
              // "#t=0.1" makes iOS Safari load and show the first frame instead of a blank box.
              src={`${previewUrl}#t=0.1`}
              controls
              playsInline
              preload="metadata"
              onError={() => setPreviewFailed(true)}
              className="block max-h-80 max-w-full rounded-[5px] bg-black md:max-w-[330px]"
            />
            {!message.text && <div className="flex justify-end px-1.5 pt-1">{meta}</div>}
          </>
        )}
        {a && !preview && (
          <div className={`flex min-w-60 flex-col gap-1 md:min-w-72 ${message.text ? "mb-1" : ""}`}>
            <div className="-mx-1 flex items-center gap-2.5 rounded-md bg-black/5 p-2.5 dark:bg-black/20">
              <span className="flex h-10 w-[34px] shrink-0 items-end justify-center rounded-[4px] bg-[#e5484d] pb-1 text-[9px] font-bold uppercase text-white">
                {extension(a.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-all text-[14.5px] leading-5">{a.name}</p>
                <p className="text-[12px] opacity-65">
                  {formatBytes(a.size)}
                  {a.status === "ready" && " · ✓ verified"}
                  {a.status === "failed" && " · didn't finish sending"}
                  {a.status === "live" && (own ? " · live from this device, keep LANDrop open" : " · live while the sender is online")}
                </p>
              </div>
              {isAvailable(a) && (
                <a
                  href={downloadUrl}
                  download={a.name}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Save ${a.name}`}
                  title={a.sha256 ? `Save · SHA-256 ${a.sha256}` : "Save · streamed live from the sender"}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current opacity-60 hover:opacity-100"
                >
                  <SaveIcon size={18} />
                </a>
              )}
            </div>
            {a.status === "uploading" && <UploadProgress size={a.size} progress={progress} />}
            {!message.text && <div className="flex justify-end pt-0.5">{meta}</div>}
          </div>
        )}
        {a?.status === "live" && (
          <span className="absolute inset-0 -z-10 rounded-[inherit]">
            <SparkleField />
          </span>
        )}
      </div>
      <QuickActions
        text={message.text}
        save={a && isAvailable(a) ? { url: downloadUrl, name: a.name } : undefined}
      />
    </div>
  );
}

const QUICK_ACTION =
  "flex size-8 items-center justify-center rounded-full bg-panel/90 text-muted shadow-[0_1px_2px_rgba(11,20,26,.2)] hover:text-foreground";

/** Copy and Save, always beside the bubble; the press-and-hold sheet has every action. */
function QuickActions({ text, save }: { text?: string; save?: { url: string; name: string } }) {
  const [copied, setCopied] = useState(false);
  if (!text && !save) return null;
  return (
    <div className="flex shrink-0 gap-1">
      {text && (
        <button
          onClick={() => {
            if (!copyText(text)) return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={copied ? "Copied" : "Copy message"}
          title={copied ? "Copied" : "Copy"}
          className={QUICK_ACTION}
        >
          {copied ? <TickIcon /> : <CopyIcon />}
        </button>
      )}
      {save && (
        <a
          href={save.url}
          download={save.name}
          aria-label={`Save ${save.name}`}
          title="Save"
          className={QUICK_ACTION}
        >
          <SaveIcon />
        </a>
      )}
    </div>
  );
}

/** Time, and on your own messages WhatsApp's status: clock while sending, a tick once the host has it. */
function Meta({
  at,
  own,
  status,
  onMedia = false,
}: {
  at: number;
  own: boolean;
  status?: Attachment["status"];
  onMedia?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] leading-4 ${onMedia ? "" : "opacity-60"}`}>
      <time>{formatTime(at)}</time>
      {own &&
        (status === "uploading" ? (
          <span aria-label="Sending">
            <ClockIcon />
          </span>
        ) : status === "failed" ? (
          <span aria-label="Didn't finish sending" className="text-danger">
            <AlertIcon />
          </span>
        ) : (
          <span aria-label="Sent">
            <TickIcon />
          </span>
        ))}
    </span>
  );
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && name.length - dot <= 5 ? name.slice(dot + 1) : "file";
}
