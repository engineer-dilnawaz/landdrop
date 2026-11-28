"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { isAvailable, previewKind, type Attachment, type Message } from "@landrop/protocol";
import type { Progress } from "./landrop";
import { SparkleField } from "./sparkle-field";
import type { Receipt } from "./receipts";
import { VoicePlayer, formatClock } from "./voice";
import { JsonViewer, parseJson } from "./json-viewer";
import { detectSnippet } from "./snippets";
import { SnippetViewer } from "./snippet-viewer";
import {
  AlertIcon,
  ChevronIcon,
  ClockIcon,
  CopyIcon,
  FolderIcon,
  DoubleTickIcon,
  PlayIcon,
  ReplyIcon,
  SaveIcon,
  PinIcon,
  TickIcon,
  UploadProgress,
  colourFor,
  copyText,
  emojiOnlyCount,
  formatBytes,
  formatTime,
  linkify,
  truncateLongText,
} from "./ui";

export const TIME_GAP_MS = 15 * 60 * 1000;
export const LONG_PRESS_MS = 450;
const SWIPE_TRIGGER_PX = 56;
const SWIPE_MAX_PX = 72;
/** Small labels over a photo or video: "GIF", a video's length. */
const BADGE = "pointer-events-none absolute rounded-full bg-black/50 px-1.5 py-px text-[11px] font-medium text-white";

const VideoIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm14 3.2 4-2.7v9l-4-2.7Z" />
  </svg>
);

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
  progress,
  downloadUrl,
  previewUrl,
  onReply,
  onLongPress,
  onQuoteTap,
  onOpenMedia,
  onOpenFolder,
  avatar,
  receipt,
  pinned = false,
}: {
  message: Message;
  nameOf: (id: string | undefined, fallback: string) => string;
  own: boolean;
  /** Group chats name the sender at the top of their run of messages, like WhatsApp. */
  showSender: boolean;
  progress?: Progress;
  downloadUrl: string;
  previewUrl: string;
  onOpenMedia: () => void;
  onOpenFolder: () => void;
  onReply: () => void;
  /** Press and hold, right-click, or the ⌄ button: the message's actions. */
  onLongPress: () => void;
  onQuoteTap: (id: string) => void;
  /** Others' messages: their picture beside the first of a run, or the space it takes. */
  avatar?: ReactNode;
  /** Your own messages' ticks. */
  receipt?: Receipt;
  /** This is the chat's pinned message: a pin shows beside its time. */
  pinned?: boolean;
}) {
  const a = message.attachment;
  const senderName = nameOf(message.senderId, message.senderName);
  const [dx, setDx] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  /** Set when the last press was a long press or swipe, so its trailing click doesn't also open the photo. */
  const gestureConsumedClick = useRef(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [videoLength, setVideoLength] = useState<number>();
  const [expanded, setExpanded] = useState(false);
  /** A message that is JSON gets a button that opens it full screen, formatted. */
  const json = useMemo(() => (message.text ? parseJson(message.text) : undefined), [message.text]);
  const [viewingJson, setViewingJson] = useState(false);
  /** A curl command, code or Markdown gets the same kind of button. */
  const snippet = useMemo(() => (json === undefined && message.text ? detectSnippet(message.text) : undefined), [json, message.text]);
  const [viewingSnippet, setViewingSnippet] = useState(false);
  const hasViewer = json !== undefined || snippet !== undefined;
  const shortText = message.text && !expanded ? truncateLongText(message.text) : undefined;
  /** Like WhatsApp, a message of just one to three emoji shows them big; more emoji a step up from text. */
  const emojis = message.text ? emojiOnlyCount(message.text) : 0;
  const emojiSize = emojis === 0 ? "" : (["text-[48px] leading-[58px]", "text-[40px] leading-[50px]", "text-[34px] leading-[44px]"][emojis - 1] ?? "text-[24px] leading-8");
  // Previews only once the host has verified the bytes (or live from the sender); formats this browser can't show fall back to the file card.
  const preview = a && isAvailable(a) && !previewFailed ? previewKind(a) : undefined;
  /** Photos and videos fill the bubble; voice messages sit inside it like text. */
  const media = preview === "image" || preview === "video";
  const meta = <Meta at={message.createdAt} own={own} status={a?.status} receipt={receipt} pinned={pinned} />;

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
        className="pointer-events-none absolute left-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-bar text-muted"
        style={{ opacity: dx / SWIPE_TRIGGER_PX, transform: `translateY(-50%) scale(${dx >= SWIPE_TRIGGER_PX ? 1.15 : 1})` }}
      >
        <ReplyIcon size={18} />
      </span>
      {avatar && <span className="shrink-0 self-start">{avatar}</span>}
      <div
        {...handlers}
        aria-label={own ? undefined : `${senderName}:`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        // "isolate" lets a live file's sparkles sit between the bubble colour and its content.
        className={`group relative isolate min-w-0 max-w-[85%] touch-pan-y rounded-(--bubble-radius) text-(length:--chat-text) leading-(--chat-leading) select-none [-webkit-touch-callout:none] [-webkit-user-select:none] md:max-w-[65%] ${
          dx ? "" : "transition-transform"
        } ${own ? "bg-bubble-out text-bubble-out-ink" : "bg-bubble-in text-foreground"} ${
          // Media fills the bubble with a thin frame; live media gets a wider one so its sparkles show.
          media ? (a?.status === "live" ? "p-2" : "p-[3px]") : "px-3 pb-2 pt-2"
        }`}
      >
        {/* WhatsApp's ⌄ on hover: the same actions as press and hold. */}
        <button
          onClick={onLongPress}
          aria-label="Message actions"
          className="absolute right-1 top-1 z-10 hidden size-6 items-center justify-center rounded-full bg-inherit text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:flex"
        >
          <ChevronIcon />
        </button>
        {showSender && (
          <p className={`text-[13px] font-medium ${media ? "px-1.5 pb-1 pt-0.5" : "pb-0.5"}`} style={{ color: colourFor(message.senderId ?? senderName) }}>
            {senderName}
          </p>
        )}
        {message.replyTo && (
          <button
            onClick={() => onQuoteTap(message.replyTo!.id)}
            className="relative mb-1 block w-full overflow-hidden rounded-md bg-black/5 py-1.5 pl-3 pr-2 text-left text-[13px] leading-[17px] dark:bg-black/20"
          >
            {/* The quoted sender's colour as a bar down the left. */}
            <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: colourFor(message.replyTo.senderId ?? message.replyTo.senderName) }} />
            <span className="block font-medium" style={{ color: colourFor(message.replyTo.senderId ?? message.replyTo.senderName) }}>
              {nameOf(message.replyTo.senderId, message.replyTo.senderName)}
            </span>
            <span className="line-clamp-2 opacity-70">{message.replyTo.preview}</span>
          </button>
        )}
        {message.text && (
          // WhatsApp-style time: floated into the last line when it fits, otherwise wrapped onto its own line.
          <p className={`whitespace-pre-wrap wrap-break-word ${media ? "px-1.5 pt-1" : ""} ${emojiSize}`}>
            {linkify(shortText ?? message.text, own, emojis === 0)}
            {shortText !== undefined && (
              <>
                {"… "}
                <button onClick={() => setExpanded(true)} className="font-medium text-[#027eb5] dark:text-[#53bdeb]">
                  Read more
                </button>
              </>
            )}
            {/* With a JSON button below, the time goes under that instead. */}
            {!hasViewer && <span className="float-right ml-2.5 mt-2 -mb-1.5">{meta}</span>}
          </p>
        )}
        {json !== undefined && (
          <button
            onClick={() => !gestureConsumedClick.current && setViewingJson(true)}
            className="mt-2 flex w-full min-w-44 items-center justify-center gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-[14px] font-medium hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/30"
          >
            <span aria-hidden className="font-mono text-[13px] opacity-70">
              {"{ }"}
            </span>
            View JSON
          </button>
        )}
        {snippet && (
          <button
            onClick={() => !gestureConsumedClick.current && setViewingSnippet(true)}
            className="mt-2 flex w-full min-w-44 items-center justify-center gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-[14px] font-medium transition-colors hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/30"
          >
            <span aria-hidden className="font-mono text-[13px] opacity-70">
              {snippet.kind === "markdown" ? "M↓" : "</>"}
            </span>
            {snippet.label}
          </button>
        )}
        {hasViewer && <div className="mt-1.5 -mb-0.5 flex justify-end">{meta}</div>}
        {a && preview === "image" && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next */}
            <img
              src={previewUrl}
              alt={a.name}
              loading="lazy"
              draggable={false}
              onError={() => setPreviewFailed(true)}
              onClick={() => !gestureConsumedClick.current && onOpenMedia()}
              className="block max-h-80 min-h-24 min-w-40 max-w-full cursor-zoom-in rounded-(--media-radius) bg-black/10 object-cover md:max-w-[330px]"
            />
            {/* GIFs already loop in the bubble; the badge says why it's moving. */}
            {a.mimeType === "image/gif" && <span className={`${BADGE} left-2 top-2`}>GIF</span>}
            {!message.text && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-end rounded-b-(--media-radius) bg-linear-to-b from-transparent to-black/45 px-2 pb-1 text-white">
                <Meta at={message.createdAt} own={own} status={a.status} receipt={receipt} pinned={pinned} onMedia />
              </span>
            )}
          </div>
        )}
        {a && preview === "video" && (
          <>
            <button
              onClick={() => !gestureConsumedClick.current && onOpenMedia()}
              aria-label={`Play ${a.name}`}
              className="relative block min-h-24 min-w-40 max-w-full overflow-hidden rounded-(--media-radius) bg-black md:max-w-[330px]"
            >
              {/* A still frame; it plays full screen. "#t=0.1" makes iOS Safari show that frame instead of a blank box. */}
              <video
                src={`${previewUrl}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setVideoLength(e.currentTarget.duration)}
                onError={() => setPreviewFailed(true)}
                className="pointer-events-none block max-h-80 max-w-full"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-black/45 pl-1 text-white backdrop-blur-sm">
                  <PlayIcon size={30} />
                </span>
              </span>
              {videoLength !== undefined && (
                <span className={`${BADGE} bottom-1.5 left-2 flex items-center gap-1`}>
                  <VideoIcon />
                  {formatClock(videoLength)}
                </span>
              )}
              {!message.text && (
                <span className="pointer-events-none absolute bottom-0 right-0 flex h-9 items-end px-2 pb-1 text-white">
                  <Meta at={message.createdAt} own={own} status={a.status} receipt={receipt} pinned={pinned} onMedia />
                </span>
              )}
            </button>
          </>
        )}
        {a && preview === "audio" && (
          <div className={message.text ? "mb-1" : ""}>
            <VoicePlayer id={message.id} src={previewUrl} size={a.size} own={own} onError={() => setPreviewFailed(true)} />
            {!message.text && <div className="-mt-4 flex justify-end">{meta}</div>}
          </div>
        )}
        {a && !preview && (
          <div className={`flex min-w-60 flex-col gap-1 md:min-w-72 ${message.text ? "mb-1" : ""}`}>
            <div className="-mx-1 flex items-center gap-2.5 rounded-md bg-black/5 p-2.5 dark:bg-black/20">
              {a.folder ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-[#ffbc38] text-white">
                  <FolderIcon size={24} />
                </span>
              ) : (
                <span className="flex h-10 w-[34px] shrink-0 items-end justify-center rounded-[4px] bg-[#e5484d] pb-1 text-[9px] font-bold uppercase text-white">
                  {extension(a.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-all text-[14.5px] leading-5">{a.folder ? a.name.replace(/\.zip$/, "") : a.name}</p>
                <p className="text-[12px] opacity-65">
                  {a.folder && `${a.folder.files.toLocaleString()} ${a.folder.files === 1 ? "file" : "files"} · `}
                  {formatBytes(a.size)}
                  {a.status === "ready" && " · ✓ verified"}
                  {a.status === "failed" && " · didn't finish sending"}
                  {a.status === "live" && (own ? " · live from this device, keep LANDrop open" : " · live while the sender is online")}
                </p>
              </div>
            </div>
            {/* Folders open inside LANDrop, like a folder on the computer; the zip is the secondary way. */}
            {a.folder && isAvailable(a) && (
              <button
                onClick={() => !gestureConsumedClick.current && onOpenFolder()}
                className="-mx-1 rounded-md py-2 text-[14px] font-medium text-[#027eb5] hover:bg-black/5 dark:text-[#53bdeb] dark:hover:bg-black/20"
              >
                Open folder
              </button>
            )}
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
      {/* Outside the bubble: React passes a portal's events up through its parents, and the bubble's would start a long press. */}
      {viewingJson && json !== undefined && <JsonViewer json={json} onClose={() => setViewingJson(false)} />}
      {viewingSnippet && snippet && <SnippetViewer snippet={snippet} onClose={() => setViewingSnippet(false)} />}
    </div>
  );
}

const QUICK_ACTION =
  "flex size-8 items-center justify-center rounded-full bg-panel/90 text-muted hover:text-foreground";

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
  receipt = "sent",
  pinned = false,
  onMedia = false,
}: {
  at: number;
  own: boolean;
  status?: Attachment["status"];
  receipt?: Receipt;
  pinned?: boolean;
  onMedia?: boolean;
}) {
  // Faded on bubbles; full white over photos. Blue ticks are never faded.
  const faded = onMedia ? "" : "opacity-60";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] leading-4">
      {pinned && (
        <span aria-label="Pinned" title="Pinned" className={faded}>
          <PinIcon size={12} />
        </span>
      )}
      <time className={faded}>{formatTime(at)}</time>
      {own &&
        (status === "uploading" ? (
          <span aria-label="Sending" className={faded}>
            <ClockIcon />
          </span>
        ) : status === "failed" ? (
          <span aria-label="Didn't finish sending" className="text-danger">
            <AlertIcon />
          </span>
        ) : receipt === "read" ? (
          <span aria-label="Read" className="text-[#53bdeb]">
            <DoubleTickIcon />
          </span>
        ) : (
          <span aria-label={receipt === "delivered" ? "Delivered" : "Sent"} className={faded}>
            {receipt === "delivered" ? <DoubleTickIcon /> : <TickIcon />}
          </span>
        ))}
    </span>
  );
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && name.length - dot <= 5 ? name.slice(dot + 1) : "file";
}
