"use client";

import { useEffect, useState } from "react";
import { MAX_DEVICE_NAME_LENGTH, isAvailable, type Message } from "@landrop/protocol";
import type { Progress } from "./landrop";

export function ImageViewer({
  name,
  url,
  downloadUrl,
  onClose,
}: {
  name: string;
  url: string;
  downloadUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="text-[17px] text-ios-blue" autoFocus>
          Done
        </button>
        <p className="min-w-0 truncate text-[15px] font-semibold">{name}</p>
        <a href={downloadUrl} download={name} className="text-ios-blue" aria-label={`Save ${name}`}>
          <SaveIcon />
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next */}
      <img src={url} alt={name} className="min-h-0 flex-1 object-contain pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

/** iOS-style alert with a text field for choosing your name in the chat. */
export function RenameDialog({
  current,
  welcome = false,
  onSave,
  onCancel,
}: {
  current: string;
  /** First join: confirm or change the guessed name, so keeping the guess is allowed too. */
  welcome?: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(current);
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && (welcome || trimmed !== current);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-10" onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-bar/95 text-center backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave(trimmed);
        }}
      >
        <div className="px-4 pb-4 pt-5">
          <h2 id="rename-title" className="text-[17px] font-semibold">
            {welcome ? "Name this device" : "Your name"}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {welcome
              ? "Everyone in the chat sees this name. Make it easy to recognise, like “Alex’s Galaxy S24”."
              : "This is how everyone in the chat sees you."}
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            maxLength={MAX_DEVICE_NAME_LENGTH}
            autoFocus
            enterKeyHint="done"
            aria-label="Your name"
            className="mt-3 w-full rounded-[8px] border border-separator bg-background px-2.5 py-1.5 text-[16px] outline-none select-text [-webkit-user-select:text] focus:border-ios-blue"
          />
        </div>
        <div className="grid grid-cols-2 border-t border-separator text-[17px]">
          <button type="button" onClick={onCancel} className="border-r border-separator py-2.5 text-ios-blue">
            {welcome ? "Skip" : "Cancel"}
          </button>
          <button type="submit" disabled={!canSave} className="py-2.5 font-semibold text-ios-blue disabled:opacity-35">
            {welcome ? "Join" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** iOS-style press-and-hold menu for a message. */
export function MessageSheet({
  message,
  saveUrl,
  canRemove,
  onReply,
  onRemove,
  onClose,
}: {
  message: Message;
  saveUrl: string;
  canRemove: boolean;
  onReply: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const a = message.attachment;
  const item = "block w-full border-t border-separator py-4 text-center text-[20px] first:border-t-0";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Message actions"
        className="mb-[max(0.5rem,env(safe-area-inset-bottom))] flex w-full max-w-md flex-col gap-2 px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[14px] bg-bar/95 backdrop-blur-xl">
          <button onClick={onReply} className={`${item} text-ios-blue`}>
            Reply
          </button>
          {message.text && (
            <button
              onClick={() => {
                copyText(message.text!);
                onClose();
              }}
              className={`${item} text-ios-blue`}
            >
              Copy
            </button>
          )}
          {a && isAvailable(a) && (
            <a href={saveUrl} download={a.name} onClick={onClose} className={`${item} text-ios-blue`}>
              Save
            </a>
          )}
          {canRemove && (
            <button onClick={onRemove} className={`${item} text-ios-red`}>
              Remove for everyone
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full rounded-[14px] bg-bar py-4 text-[20px] font-semibold text-ios-blue" autoFocus>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Press-and-hold menu for a chat in the list. Deleting only affects this device, like WhatsApp. */
export function ChatSheet({
  title,
  isGroup,
  onDelete,
  onClose,
}: {
  title: string;
  isGroup: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-sheet-title"
        className="mb-[max(0.5rem,env(safe-area-inset-bottom))] flex w-full max-w-md flex-col gap-2 px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[14px] bg-bar/95 backdrop-blur-xl">
          <div className="px-4 py-3 text-center">
            <p id="chat-sheet-title" className="text-[13px] font-semibold text-muted">
              {isGroup ? "Clear the LANDrop group?" : `Delete chat with ${title}?`}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {isGroup
                ? "All messages so far are removed from this device. Everyone else keeps theirs."
                : `All messages are removed from this device. ${title} keeps their copy.`}
            </p>
          </div>
          <button onClick={onDelete} className="block w-full border-t border-separator py-4 text-center text-[20px] text-ios-red">
            {isGroup ? "Clear chat" : "Delete chat"}
          </button>
        </div>
        <button onClick={onClose} className="w-full rounded-[14px] bg-bar py-4 text-[20px] font-semibold text-ios-blue" autoFocus>
          Cancel
        </button>
      </div>
    </div>
  );
}

export const ACTION_CLASS =
  "flex size-7 items-center justify-center rounded-full text-muted hover:bg-bubble-other hover:text-foreground";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={ACTION_CLASS}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy"}
      onClick={() => {
        if (!copyText(text)) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const SaveIcon = () => (
  <svg {...iconProps}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

/**
 * The async Clipboard API only exists on secure origins, and LAN pages are plain
 * HTTP, so copy through a temporary selection, which works there too (incl. iOS Safari).
 */
export function copyText(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  field.remove();
  return ok;
}

export function UploadProgress({ size, progress, own }: { size: number; progress?: Progress; own: boolean }) {
  const done = progress?.bytesReceived ?? 0;
  const fraction = size > 0 ? done / size : 0;
  const remaining = progress && progress.bytesPerSecond > 0 ? (size - done) / progress.bytesPerSecond : undefined;
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        className={`h-1 overflow-hidden rounded-full ${own ? "bg-white/30" : "bg-separator"}`}
      >
        <div
          className={`h-full transition-[width] ${own ? "bg-white" : "bg-ios-blue"}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <p className={`text-[12px] tabular-nums ${own ? "text-white/75" : "text-muted"}`}>
        {done >= size && size > 0
          ? "Verifying…"
          : `${Math.floor(fraction * 100)}%${progress ? ` · ${formatBytes(progress.bytesPerSecond)}/s` : ""}${
              remaining !== undefined ? ` · ${formatDuration(remaining)} left` : ""
            }`}
      </p>
    </div>
  );
}

const AVATAR_SIZES = {
  list: "size-12 text-[17px]",
  large: "size-8 text-[12px] ring-2 ring-bar",
  small: "size-7 text-[11px]",
};

export function Avatar({ name, size = "large" }: { name: string; size?: keyof typeof AVATAR_SIZES }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => !/^(on|the)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-linear-to-b from-[#a5abb8] to-[#858994] font-semibold text-white ${
        AVATAR_SIZES[size]
      }`}
    >
      {initials || "?"}
    </span>
  );
}

export const ReplyIcon = () => (
  <svg {...iconProps}>
    <path d="m9 17-5-5 5-5" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

export const GroupIcon = () => (
  <svg {...iconProps} width={20} height={20}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const BackIcon = () => (
  <svg {...iconProps} width={24} height={24} strokeWidth={2.5}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/** A panel outline; its divider is filled in while the panel is pinned open. */
export const SidebarIcon = ({ pinned }: { pinned: boolean }) => (
  <svg {...iconProps} width={22} height={22}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
    {pinned && <path d="M4.5 5.5h3v13h-3z" fill="currentColor" stroke="none" />}
  </svg>
);

/** Side by side on wider screens, the chat list and chat headers share one height so their borders meet. */
export const HEADER_HEIGHT = "md:h-[72px] md:shrink-0 md:py-0";

export const QrIcon = () => (
  <svg {...iconProps} width={22} height={22}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v3h-3" />
  </svg>
);

export const WifiIcon = () => (
  <svg {...iconProps} width={22} height={22}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...iconProps} width={18} height={18} strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ArrowUpIcon = () => (
  <svg {...iconProps} width={16} height={16} strokeWidth={3}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const FileIcon = () => (
  <svg {...iconProps} width={20} height={20}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const LONG_TEXT_CHARS = 600;
const LONG_TEXT_LINES = 12;

/** Returns the shortened text when a message is long enough to collapse, else undefined. */
export function truncateLongText(text: string): string | undefined {
  const lines = text.split("\n");
  if (text.length <= LONG_TEXT_CHARS && lines.length <= LONG_TEXT_LINES) return undefined;
  const head = lines.slice(0, LONG_TEXT_LINES).join("\n").slice(0, LONG_TEXT_CHARS);
  // Cut at a word boundary so the preview doesn't end mid-word.
  const lastSpace = head.search(/\s\S*$/);
  return (lastSpace > LONG_TEXT_CHARS / 2 ? head.slice(0, lastSpace) : head).trimEnd();
}

/** Day separator label, like WhatsApp: Today, Yesterday, a weekday this week, else the date. */
const TIME_FORMAT = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit", hourCycle: "h12" });

/** "5:20 PM": always 12-hour with AM/PM, whatever the device's region uses ("17:20", "5:20 pm", "5:20 p.m."). */
export function formatTime(at: number): string {
  return TIME_FORMAT.formatToParts(at)
    .map((part) => (part.type === "dayPeriod" ? part.value.replace(/\./g, "").toUpperCase() : part.value))
    .join("");
}

export function formatDay(at: number): string {
  const date = new Date(at);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (today.getTime() - at < 7 * 86_400_000) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function linkify(text: string, own: boolean) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline underline-offset-2 ${own ? "text-white" : "text-ios-blue"}`}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 || value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.ceil(seconds % 60)}s`;
}
