"use client";

import { useRef, useState } from "react";
import { isAvailable, previewKind, type Message } from "@landrop/protocol";
import type { Progress } from "./landrop";
import { SparkleField } from "./sparkle-field";
import {
  ACTION_CLASS,
  Avatar,
  CopyButton,
  FileIcon,
  ReplyIcon,
  SaveIcon,
  UploadProgress,
  formatBytes,
  linkify,
  truncateLongText,
} from "./ui";

export const TIME_GAP_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 450;
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
  showAvatar,
  tail,
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
  /** Group chats show the sender's avatar; private chats don't need it. */
  showAvatar: boolean;
  tail: boolean;
  progress?: Progress;
  downloadUrl: string;
  previewUrl: string;
  onOpenImage: () => void;
  onReply: () => void;
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
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const timeTone = own ? "text-white/70" : "text-muted";
  // Messages-style corners: the last bubble of a run gets the tighter "tail" corner.
  const shape = own
    ? tail
      ? "rounded-[18px] rounded-br-[4px]"
      : "rounded-[18px]"
    : tail
      ? "rounded-[18px] rounded-bl-[4px]"
      : "rounded-[18px]";

  // Swipe right to reply; press and hold for the remove sheet. Vertical drags stay with the page scroll.
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

  const actions = (
    <div className="flex shrink-0 items-center self-center text-muted">
      {message.text && <CopyButton text={message.text} />}
      {a && isAvailable(a) && (
        <a
          href={downloadUrl}
          download={a.name}
          className={ACTION_CLASS}
          aria-label={`Save ${a.name}`}
          title={a.sha256 ? `Save · SHA-256 ${a.sha256}` : "Save · streamed live from the sender"}
        >
          <SaveIcon />
        </a>
      )}
    </div>
  );

  return (
    <div id={`message-${message.id}`} className={`relative flex items-end gap-1 ${own ? "justify-end" : "justify-start"}`}>
      <span
        aria-hidden
        className="absolute left-0 top-1/2 -translate-y-1/2 text-muted"
        style={{ opacity: dx / SWIPE_TRIGGER_PX, transform: `translateY(-50%) scale(${dx >= SWIPE_TRIGGER_PX ? 1.15 : 1})` }}
      >
        <ReplyIcon />
      </span>
      {!own && showAvatar && (
        // The sender's avatar marks the end of their run of messages; earlier bubbles keep the space so they line up.
        <div className="w-7 shrink-0" title={senderName}>
          {tail && <Avatar name={senderName} size="small" />}
        </div>
      )}
      {own && actions}
      <div
        {...handlers}
        aria-label={own ? undefined : `${senderName}:`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        // "isolate" lets a live file's sparkles sit between the bubble colour and its content.
        className={`relative isolate max-w-[72%] touch-pan-y text-[16px] leading-[21px] select-none [-webkit-touch-callout:none] [-webkit-user-select:none] ${
          dx ? "" : "transition-transform"
        } ${shape} ${own ? "bg-ios-blue text-white" : "bg-bubble-other text-foreground"} ${
          // Media sits inside the bubble with a thin frame, like WhatsApp, leaving room for the time below it.
          // Live media gets a wider frame so its sparkles show around it.
          preview ? (a?.status === "live" ? "p-2" : "p-1") : "px-3 py-[7px]"
        }`}
      >
        {message.replyTo && (
          <button
            onClick={() => onQuoteTap(message.replyTo!.id)}
            className={`mb-1 block w-full rounded-lg border-l-[3px] px-2 py-1 text-left text-[13px] leading-[17px] ${
              own ? "border-white/70 bg-white/15" : "border-ios-blue bg-background/50"
            }`}
          >
            <span className={`block font-semibold ${own ? "text-white" : "text-ios-blue"}`}>
              {nameOf(message.replyTo.senderId, message.replyTo.senderName)}
            </span>
            <span className={`line-clamp-2 ${own ? "text-white/85" : "text-muted"}`}>{message.replyTo.preview}</span>
          </button>
        )}
        {message.text && (
          // WhatsApp-style time: floated into the last line when it fits, otherwise wrapped onto its own line.
          <p className="whitespace-pre-wrap wrap-break-word">
            {linkify(shortText ?? message.text, own)}
            {shortText !== undefined && (
              <>
                {"… "}
                <button onClick={() => setExpanded(true)} className={`font-semibold ${own ? "text-white" : "text-ios-blue"}`}>
                  Read more
                </button>
              </>
            )}
            <time className={`float-right ml-2 mt-[5px] text-[11px] leading-4 ${timeTone}`}>{time}</time>
          </p>
        )}
        {a && preview === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next
          <img
            src={previewUrl}
            alt={a.name}
            loading="lazy"
            draggable={false}
            onError={() => setPreviewFailed(true)}
            onClick={() => !gestureConsumedClick.current && onOpenImage()}
            className="block max-h-80 min-h-24 min-w-24 max-w-full cursor-zoom-in rounded-[14px] bg-background/30 object-cover"
          />
        )}
        {a && preview === "video" && (
          <video
            // "#t=0.1" makes iOS Safari load and show the first frame instead of a blank box.
            src={`${previewUrl}#t=0.1`}
            controls
            playsInline
            preload="metadata"
            onError={() => setPreviewFailed(true)}
            className="block max-h-80 max-w-full rounded-[14px] bg-black"
          />
        )}
        {preview && (
          <div className="flex justify-end px-1.5 pt-0.5">
            <time className={`text-[11px] leading-4 ${timeTone}`}>{time}</time>
          </div>
        )}
        {a && !preview && (
          <div className="flex min-w-52 flex-col gap-1.5 py-0.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${own ? "bg-white/20" : "bg-background"}`}
              >
                <FileIcon />
              </span>
              <div className="min-w-0">
                <p className="break-all text-[15px] font-medium leading-5">{a.name}</p>
                <p className={`text-[12px] ${own ? "text-white/75" : "text-muted"}`}>
                  {formatBytes(a.size)}
                  {a.status === "ready" && " · ✓ verified"}
                  {a.status === "failed" && " · didn't finish sending"}
                  {a.status === "live" && (own ? " · live from this device, keep LANDrop open" : " · live while the sender is online")}
                </p>
              </div>
            </div>
            {a.status === "uploading" && <UploadProgress size={a.size} progress={progress} own={own} />}
            <time className={`self-end text-[11px] leading-4 ${timeTone}`}>{time}</time>
          </div>
        )}
        {a?.status === "live" && (
          <span className="absolute inset-0 -z-10 rounded-[inherit]">
            <SparkleField />
          </span>
        )}
      </div>
      {!own && actions}
    </div>
  );
}

/** Full-screen photo viewer, like tapping a photo in Messages. */
