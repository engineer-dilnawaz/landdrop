"use client";

import { AvatarArt, defaultAvatar } from "./avatars";
import { Add, ArrowDown2, Edit2, User, ArrowLeft, Back, Camera, Clock, Copy, Danger, Devices, DocumentDownload, DocumentText, EmojiHappy, Export, Folder2, Forward, Gallery, InfoCircle, Lock1, MessageAdd1, Messages1, More, Notification, Pause, People, Play, Scan, SearchNormal1, Send2, Setting2, Sun1, Trash, Wifi } from "iconsax-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
    // Phones keep the bottom sheet. From tablet width up it's a centred modal over a blurred backdrop.
    <div className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#0b141a]/50 md:items-center md:bg-[#0b141a]/35 md:p-6 md:backdrop-blur-md dark:bg-black/60 dark:md:bg-black/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        className={`sheet max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-panel pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-[85dvh] md:max-w-md md:rounded-3xl md:pb-4 md:pt-2 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="mx-auto mb-1 mt-2.5 block h-1 w-9 rounded-full bg-divider md:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A row in a sheet's list of actions. */
export const SHEET_ITEM = "flex w-full items-center gap-4 px-6 py-3.5 text-left text-[15px] transition-colors hover:bg-hover active:bg-field";

export const TEXT_BUTTON =
  "rounded-lg px-4 py-2.5 text-[14px] font-medium text-chip-on-ink transition-all hover:bg-hover active:scale-[0.97] disabled:opacity-40 disabled:hover:bg-transparent";
export const FILLED_BUTTON =
  "rounded-lg bg-accent-fill px-5 py-2.5 text-[14px] font-medium text-white transition-all hover:brightness-90 active:scale-[0.97] disabled:opacity-40";

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
          className="mt-5 w-full rounded-lg bg-field px-3 py-2 text-[16px] outline-none select-text [-webkit-user-select:text]"
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
  onSelect,
  onForward,
  pinned,
  onPin,
  onInfo,
  onRemove,
  onClose,
}: {
  message: Message;
  saveUrl: string;
  canRemove: boolean;
  onReply: () => void;
  /** Starts picking several messages, beginning with this one. */
  onSelect: () => void;
  /** Sends a copy to another chat; absent when the message can't be copied (a live or unfinished file). */
  onForward?: () => void;
  /** This is the chat's pinned message. */
  pinned: boolean;
  /** Pins this message to the top of the chat, or unpins it. */
  onPin: () => void;
  /** Your own messages: who has read them. */
  onInfo?: () => void;
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
        {onForward && (
          <button onClick={onForward} className={item}>
            <ForwardIcon size={20} />
            Forward
          </button>
        )}
        <button onClick={onPin} className={item}>
          <PinIcon size={20} />
          {pinned ? "Unpin" : "Pin"}
        </button>
        <button onClick={onSelect} className={item}>
          <TickIcon />
          Select
        </button>
        {onInfo && (
          <button onClick={onInfo} className={item}>
            <InfoIcon />
            Info
          </button>
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

/** What a held chat in the list can do: pin it to the top, or clear or delete it. */
export function ChatActionsSheet({
  title,
  pinned,
  deleteLabel,
  onPin,
  onRename,
  onDelete,
  onClose,
}: {
  title: string;
  pinned: boolean;
  /** "Clear chat" or "Delete chat". */
  deleteLabel: string;
  onPin: () => void;
  /** The shared chat can be renamed; others can't. */
  onRename?: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet label={`${title} actions`} onClose={onClose}>
      <h2 className="truncate px-6 pb-1 pt-1 text-[17px] font-medium">{title}</h2>
      <button onClick={onPin} className={SHEET_ITEM} autoFocus>
        <PinIcon size={20} />
        {pinned ? "Unpin from top" : "Pin to top"}
      </button>
      {onRename && (
        <button onClick={onRename} className={SHEET_ITEM}>
          <EditIcon />
          Rename chat
        </button>
      )}
      <button onClick={onDelete} className={`${SHEET_ITEM} text-danger`}>
        <TrashIcon />
        {deleteLabel}
      </button>
      <button onClick={onClose} className={`${SHEET_ITEM} text-muted`}>
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

/**
 * The app's icons are Iconsax's: thin, even strokes that turn solid with `bold`, used for the
 * active tab. Each keeps the name and default size the app already used.
 */
type IconProps = { size?: number; bold?: boolean };
type Glyph = typeof Copy;
const icon = (Glyph: Glyph, defaultSize: number, variant: "Linear" | "Bold" = "Linear") =>
  function AppIcon({ size = defaultSize, bold }: IconProps) {
    return <Glyph size={size} color="currentColor" variant={bold ? "Bold" : variant} aria-hidden />;
  };

export const CopyIcon = icon(Copy, 24);
export const SaveIcon = icon(DocumentDownload, 24);
export const ReplyIcon = icon(Back, 24);
export const ForwardIcon = icon(Forward, 24);
export const BellIcon = icon(Notification, 24);
export const SunIcon = icon(Sun1, 24);
export const TrashIcon = icon(Trash, 20);
export const ShareIcon = icon(Export, 24);
export const SmileyIcon = icon(EmojiHappy, 24);
export const PlayIcon = icon(Play, 22, "Bold");
export const PauseIcon = icon(Pause, 22, "Bold");
export const PeopleIcon = icon(People, 24);
export const WifiIcon = icon(Wifi, 24);
export const BackIcon = icon(ArrowLeft, 24);
export const QrIcon = icon(Scan, 24);
export const PlusIcon = icon(Add, 24);
export const SendIcon = icon(Send2, 22, "Bold");
export const FileIcon = icon(DocumentText, 24);
export const ImageIcon = icon(Gallery, 24);
export const CameraIcon = icon(Camera, 24);
export const FolderIcon = icon(Folder2, 24);
export const ChatsIcon = icon(Messages1, 24);
export const DevicesIcon = icon(Devices, 24);
export const SettingsIcon = icon(Setting2, 24);
export const NewChatIcon = icon(MessageAdd1, 24);
export const SearchIcon = icon(SearchNormal1, 20);
export const ChevronIcon = icon(ArrowDown2, 20);
export const LockIcon = icon(Lock1, 16);
export const InfoIcon = icon(InfoCircle, 20);
export const ClockIcon = icon(Clock, 14);
export const AlertIcon = icon(Danger, 14);
/** Iconsax has no pin, so this one is drawn to match: the same thin rounded stroke. */
export const EditIcon = icon(Edit2, 20);
export const UserIcon = icon(User, 20);

export const PinIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 16.5V22" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1Z" />
  </svg>
);

/** Three dots, standing up: the menu button. */
export const MenuIcon = ({ size = 24 }: IconProps) => <More size={size} color="currentColor" variant="Linear" aria-hidden style={{ transform: "rotate(90deg)" }} />;

const sized = (size = 24) => ({ ...iconProps, width: size, height: size, strokeWidth: 1.8 });

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
  xl: "size-28 text-[40px]",
  profile: "size-20 text-[30px]",
  list: "size-[49px] text-[18px]",
  header: "size-10 text-[15px]",
  small: "size-8 text-[13px]",
};

/** Finds the profile photo for an avatar's seed (a device or private chat id); provided by the app. */
export const AvatarPhotos = createContext<(seed: string) => string | undefined>(() => undefined);

export function Avatar({
  name,
  seed,
  size = "small",
}: {
  name: string;
  /** What picks the default avatar: a device or chat id, so it survives renames. Defaults to the name. */
  seed?: string;
  size?: keyof typeof AVATAR_SIZES;
}) {
  const photo = useContext(AvatarPhotos)(seed ?? "");
  const [failed, setFailed] = useState<string>();
  if (photo && failed !== photo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host
      <img
        src={photo}
        alt=""
        draggable={false}
        onError={() => setFailed(photo)}
        className={`shrink-0 rounded-full bg-field object-cover ${AVATAR_SIZES[size]}`}
      />
    );
  // No picture chosen: one of the preset avatars, picked from the id so a device always looks the same.
  return <AvatarArt id={defaultAvatar(seed ?? name)} className={`shrink-0 rounded-full ${AVATAR_SIZES[size]}`} />;
}

export const CloseIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

/** A spinning three-quarter circle, drawn as an icon (the app uses no borders). */
export const Spinner = ({ size = 12, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={`shrink-0 animate-spin motion-reduce:animate-none ${className}`}>
    <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" />
  </svg>
);

/** Two chevrons opening apart: unfold everything. */
export const ExpandAllIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
  </svg>
);

/** Two chevrons closing together: fold everything. */
export const CollapseAllIcon = ({ size = 24 }: IconProps) => (
  <svg {...sized(size)}>
    <path d="m7 4 5 5 5-5M7 20l5-5 5 5" />
  </svg>
);

/** A solid padlock, like WhatsApp's: readable even at small sizes. */
/** Message status after the time on your own messages. */
export const TickIcon = () => (
  <svg width={16} height={11} viewBox="0 0 16 11" aria-hidden>
    <path d="m1.5 5.5 3.5 3.5 7-7.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Two ticks: delivered, or (in blue) read. */
export const DoubleTickIcon = () => (
  <svg width={18} height={11} viewBox="0 0 18 11" aria-hidden>
    <path
      d="m1.5 5.5 3.5 3.5 7-7.5M7.8 8.2l.8.8 7-7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** The LANDrop drop-and-signal mark, drawn in the accent colour. */
/**
 * The app icon's mark: a drop under two signal arcs. `animated` sends the arcs out in turn, inner
 * then outer, like the drop is being broadcast (still for people who ask for less motion).
 */
export const Logo = ({ size = 72, animated = false }: IconProps & { animated?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={animated ? "logo-animated" : undefined}>
    <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <path className="logo-arc logo-arc-outer" d="M3.3 6.7a10.6 10.6 0 0 1 17.4 0" opacity={0.35} />
      <path className="logo-arc logo-arc-inner" d="M5.5 9.3a7.6 7.6 0 0 1 13 0" opacity={0.55} />
    </g>
    <path fill="currentColor" d="M12 6.6S8.3 11.8 8.3 14.1a3.7 3.7 0 0 0 7.4 0C15.7 11.8 12 6.6 12 6.6Z" />
  </svg>
);

const LONG_TEXT_CHARS = 600;
const LONG_TEXT_LINES = 12;

const EMOJI = /^(\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u;

/** How many emoji a message is made of, when it's nothing but emoji (spaces allowed); otherwise 0. */
export function emojiOnlyCount(text: string): number {
  let count = 0;
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    if (/^\s+$/.test(segment)) continue;
    // Digits and # are emoji components too; on their own they're just text.
    if (!EMOJI.test(segment) || /^[\d#*]$/.test(segment)) return 0;
    count++;
  }
  return count;
}

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

/** A run of emoji, with skin tones, flags and joined sequences kept whole. */
const EMOJI_RUN = /((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\u200d|\ufe0f|\u20e3)*)/u;

/** Turns links into links, and sets emoji a little bigger than the text around them, like WhatsApp. */
export function linkify(text: string, own: boolean, biggerEmoji = true) {
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
    ) : biggerEmoji ? (
      part.split(EMOJI_RUN).map((piece, j) =>
        j % 2 === 1 ? (
          <span key={`${i}-${j}`} className="align-[-0.08em] text-[1.3em] leading-none">
            {piece}
          </span>
        ) : (
          piece
        ),
      )
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

export const ICON_BUTTON = "flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-all hover:bg-hover active:scale-90";
/** Header bars of the list and the chat share one height so their borders meet, like WhatsApp Web. */
export const BAR = "flex h-16 shrink-0 items-center gap-2 bg-bar px-4 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0";
