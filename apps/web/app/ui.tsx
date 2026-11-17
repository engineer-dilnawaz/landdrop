"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MAX_DEVICE_NAME_LENGTH, isAvailable, type Message } from "@landrop/protocol";
import type { Progress } from "./landrop";

/** Closes a dialog with Escape. */
export function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/**
 * Everything that pops up is a bottom sheet: it slides up from the bottom edge (centred and
 * width-capped on computers). A click on the dimmed backdrop, or Escape, closes it. Rendered on
 * <body> so no panel's stacking context can put it behind other parts of the page.
 */
export function Sheet({
  label,
  labelledBy,
  onClose,
  className = "",
  children,
}: {
  label?: string;
  labelledBy?: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  useEscape(onClose);
  return createPortal(
    <div className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#0b141a]/50 dark:bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        className={`sheet max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-panel pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(11,20,26,.22)] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="mx-auto mb-1 mt-2.5 block h-1 w-9 rounded-full bg-divider" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A row in a sheet's list of actions. */
export const SHEET_ITEM = "flex w-full items-center gap-4 px-6 py-3.5 text-left text-[15px] hover:bg-hover";

export const TEXT_BUTTON =
  "rounded-full px-5 py-2.5 text-[14px] font-medium text-accent hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent";
export const FILLED_BUTTON =
  "rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-105 disabled:opacity-40";

/** WhatsApp-style dialog with a text field for choosing your name in the chat. */
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
  useEscape(onCancel);
  return (
    <Sheet labelledBy="rename-title" onClose={onCancel}>
      <form
        className="px-6 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave(trimmed);
        }}
      >
        <h2 id="rename-title" className="text-[20px] font-medium">
          {welcome ? "Name this device" : "Your name"}
        </h2>
        <p className="mt-2 text-[14px] text-muted">
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
          className="mt-5 w-full border-b-2 border-accent bg-transparent pb-1.5 text-[16px] outline-none select-text [-webkit-user-select:text]"
        />
        <p className="mt-1 text-right text-[12px] text-muted tabular-nums">
          {MAX_DEVICE_NAME_LENGTH - name.length}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={TEXT_BUTTON}>
            {welcome ? "Skip" : "Cancel"}
          </button>
          <button type="submit" disabled={!canSave} className={FILLED_BUTTON}>
            {welcome ? "Join" : "Save"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** Message actions. */
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
  const a = message.attachment;
  const item = SHEET_ITEM;
  return (
    <Sheet label="Message actions" onClose={onClose}>
        <button onClick={onReply} className={item} autoFocus>
          <ReplyIcon size={20} />
          Reply
        </button>
        {message.text && (
          <button
            onClick={() => {
              copyText(message.text!);
              onClose();
            }}
            className={item}
          >
            <CopyIcon size={20} />
            Copy
          </button>
        )}
        {a && isAvailable(a) && (
          <a
            href={saveUrl}
            download={a.name}
            onClick={onClose}
            className={item}
            title={a.sha256 ? `SHA-256 ${a.sha256}` : "Streamed live from the sender"}
          >
            <SaveIcon size={20} />
            Save
          </a>
        )}
        {canRemove && (
          <button onClick={onRemove} className={`${item} text-danger`}>
            <TrashIcon />
            Remove for everyone
          </button>
        )}
        <button onClick={onClose} className={`${item} text-muted`}>
          <CloseIcon size={20} />
          Cancel
        </button>
    </Sheet>
  );
}

/** Clear or delete a chat, or leave a group. Clearing and deleting only affect this device, like WhatsApp. */
export function ChatSheet({
  title,
  action,
  onConfirm,
  onClose,
}: {
  title: string;
  /** "clear" the LANDrop group or a group, "delete" a private chat, "leave" a group. */
  action: "clear" | "delete" | "leave";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const text = {
    clear: [`Clear ${title}?`, "All messages so far are removed from this device. Everyone else keeps theirs.", "Clear chat"],
    delete: [`Delete chat with ${title}?`, `All messages are removed from this device. ${title} keeps their copy.`, "Delete chat"],
    leave: [`Leave ${title}?`, "You'll stop getting its messages and files. The others can add you back.", "Leave group"],
  }[action];
  return (
    <Sheet labelledBy="chat-sheet-title" onClose={onClose}>
      <div className="px-6 pt-3">
        <h2 id="chat-sheet-title" className="text-[20px] font-medium">
          {text[0]}
        </h2>
        <p className="mt-3 text-[14px] text-muted">{text[1]}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={TEXT_BUTTON} autoFocus>
            Cancel
          </button>
          <button onClick={onConfirm} className={`${FILLED_BUTTON} bg-danger`}>
            {text[2]}
          </button>
        </div>
      </div>
    </Sheet>
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

type IconProps = { size?: number };
const sized = (size = 24) => ({ ...iconProps, width: size, height: size, strokeWidth: 1.8 });

export const CopyIcon = ({ size }: IconProps) => (
  <svg {...sized(size)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const SaveIcon = ({ size }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
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

export function UploadProgress({ size, progress }: { size: number; progress?: Progress }) {
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
        className="h-1 overflow-hidden rounded-full bg-current/15"
      >
        <div className="h-full bg-accent transition-[width]" style={{ width: `${fraction * 100}%` }} />
      </div>
      <p className="text-[12px] tabular-nums opacity-65">
        {done >= size && size > 0
          ? "Verifying…"
          : `${Math.floor(fraction * 100)}%${progress ? ` · ${formatBytes(progress.bytesPerSecond)}/s` : ""}${
              remaining !== undefined ? ` · ${formatDuration(remaining)} left` : ""
            }`}
      </p>
    </div>
  );
}

/** WhatsApp-like avatar colours; each device keeps its own, also used for its name in the group. */
const AVATAR_COLOURS = [
  "#e5484d", "#f76b15", "#d6409f", "#8e4ec6", "#6e56cf", "#3e63dd",
  "#0090ff", "#00a2c7", "#12a594", "#29a383", "#46a758", "#a18072",
];

export function colourFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

const AVATAR_SIZES = {
  profile: "size-20 text-[30px]",
  list: "size-[49px] text-[18px]",
  header: "size-10 text-[15px]",
  small: "size-8 text-[13px]",
};

export function Avatar({
  name,
  seed,
  size = "small",
}: {
  name: string;
  /** What picks the colour: a device or chat id, so it survives renames. Defaults to the name. */
  seed?: string;
  size?: keyof typeof AVATAR_SIZES;
}) {
  const initials = name
    .split(/\s+/)
    // Skip separators like "·" and filler words, so "Mac · Chrome" reads "MC".
    .filter((w) => /^[\p{L}\p{N}]/u.test(w) && !/^(on|the)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${AVATAR_SIZES[size]}`}
      style={{ background: colourFor(seed ?? name) }}
    >
      {initials || "?"}
    </span>
  );
}

export const ReplyIcon = ({ size }: IconProps) => (
  <svg {...sized(size)}>
    <path d="m9 17-5-5 5-5" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

export const TrashIcon = ({ size = 20 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const ShareIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M12 15V3.5m0 0L7.5 8M12 3.5 16.5 8M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" />
  </svg>
);

export const MicIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);

export const PlayIcon = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />
  </svg>
);

export const PauseIcon = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
  </svg>
);

export const PeopleIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6" />
  </svg>
);

export const CloseIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const WifiIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0" />
    <circle cx="12" cy="19" r=".9" fill="currentColor" />
  </svg>
);

export const BackIcon = () => (
  <svg {...sized(24)} strokeWidth={2}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>
);

export const QrIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
  </svg>
);

export const PlusIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SendIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
  </svg>
);

export const FileIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M6.5 3h7l4 4v14h-11zM13.5 3v4h4" />
  </svg>
);

export const ImageIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="m4 17 5-5 4 4 2.5-2.5L20 17" />
  </svg>
);

export const CameraIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const FolderIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M3.5 6.5h6l2 2h9v10h-17z" />
  </svg>
);

export const ChatsIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
  </svg>
);

export const DevicesIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <rect x="2.5" y="5" width="13" height="10" rx="1.5" />
    <path d="M1.5 18h16" />
    <rect x="16.5" y="8" width="6" height="11" rx="1.5" />
  </svg>
);

export const SettingsIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
  </svg>
);

export const NewChatIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="M19.5 13v5.5a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2H11" />
    <path d="M17 3.5 20.5 7 12 15.5H8.5V12z" />
  </svg>
);

export const MenuIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
    <g fill="currentColor">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </g>
  </svg>
);

export const SearchIcon = ({ size = 20 }: IconProps) => (
  <svg {...sized(size)} strokeWidth={2}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...sized(20)} strokeWidth={2.2}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** A solid padlock, like WhatsApp's: readable even at small sizes. */
export const LockIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor" />
  </svg>
);

/** Message status after the time on your own messages. */
export const TickIcon = () => (
  <svg width={16} height={11} viewBox="0 0 16 11" aria-hidden>
    <path d="m1.5 5.5 3.5 3.5 7-7.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClockIcon = () => (
  <svg {...sized(14)} strokeWidth={2}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const AlertIcon = () => (
  <svg {...sized(14)} strokeWidth={2.2}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5M12 16v.5" />
  </svg>
);

/** The LANDrop drop-and-signal mark, drawn in the accent colour. */
export const Logo = ({ size = 72 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M12 6s-4.5 6-4.5 9a4.5 4.5 0 0 0 9 0c0-3-4.5-9-4.5-9z" />
    <path d="M4.5 8.5a11 11 0 0 1 15 0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
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
        className={`underline underline-offset-2 ${own ? "" : "text-[#027eb5] dark:text-[#53bdeb]"}`}
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

/** The ⋮ button: its actions open in a bottom sheet. */
export function DropdownMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; onSelect: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        className={`${ICON_BUTTON} ${open ? "bg-field" : ""}`}
      >
        <MenuIcon />
      </button>
      {open && (
        <Sheet label={label} onClose={() => setOpen(false)}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`${SHEET_ITEM} ${item.danger ? "text-danger" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </Sheet>
      )}
    </>
  );
}

export const ICON_BUTTON = "flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover";
/** Header bars of the list and the chat share one height so their borders meet, like WhatsApp Web. */
export const BAR = "flex h-16 shrink-0 items-center gap-2 bg-bar px-4 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0";
