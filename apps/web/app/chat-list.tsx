"use client";

import { useRef, useState } from "react";
import { LONG_PRESS_MS } from "./bubble";
import {
  Avatar,
  DropdownMenu,
  ICON_BUTTON,
  NewChatIcon,
  PeopleIcon,
  QrIcon,
  SearchIcon,
  TickIcon,
  WifiIcon,
  colourFor,
  formatTime,
} from "./ui";

/** The LANDrop group everyone is in, a private chat with one device, or a group of chosen devices. */
export type ChatKind = "everyone" | "private" | "group";

export interface ChatSummary {
  id: string;
  title: string;
  kind: ChatKind;
  online: boolean;
  /** Last message line, already prefixed with "You: " or the sender's name in the group. */
  preview?: string;
  lastAt?: number;
  unread: number;
}

/** WhatsApp's filter chips. */
const FILTERS = [
  { id: "all", label: "All", keep: () => true },
  { id: "unread", label: "Unread", keep: (c: ChatSummary) => c.unread > 0 },
  { id: "private", label: "Private", keep: (c: ChatSummary) => c.kind === "private" },
  { id: "groups", label: "Groups", keep: (c: ChatSummary) => c.kind === "group" },
] as const;

export function ChatList({
  chats,
  activeId,
  connection,
  onOpen,
  onHold,
  onInvite,
  onNewChat,
  onNewGroup,
  onSettings,
}: {
  chats: ChatSummary[];
  activeId?: string;
  connection: "connecting" | "online" | "offline";
  onOpen: (id: string) => void;
  /** Press and hold, or right-click: the chat's menu. */
  onHold: (chat: ChatSummary) => void;
  /** Shows the QR code other devices scan to join. */
  onInvite: () => void;
  /** Opens the list of devices to start a private chat with. */
  onNewChat: () => void;
  /** Starts a group of chosen devices. */
  onNewGroup: () => void;
  onSettings: () => void;
}) {
  const pressable = usePressAndHold(onOpen, onHold);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const q = query.trim().toLowerCase();
  const shown = chats
    .filter(FILTERS.find((f) => f.id === filter)!.keep)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-1 px-4 pt-[env(safe-area-inset-top)] box-content md:box-border md:pl-5 md:pt-0">
        <h1 className="flex-1 text-[22px] font-bold text-accent md:text-foreground">LANDrop</h1>
        <button onClick={onInvite} className={`${ICON_BUTTON} md:hidden`} aria-label="Add a device: show QR code" title="Add a device">
          <QrIcon />
        </button>
        <DropdownMenu
          label="Menu"
          items={[
            { label: "New chat", onSelect: onNewChat },
            { label: "New group", onSelect: onNewGroup },
            { label: "Add a device", onSelect: onInvite },
            { label: "Settings", onSelect: onSettings },
          ]}
        />
      </header>

      {connection !== "online" && (
        <p
          role="status"
          className={`mx-3 mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] ${
            connection === "offline" ? "bg-banner text-banner-ink" : "text-muted"
          }`}
        >
          <WifiIcon size={20} />
          {connection === "offline" ? "Can't reach the LANDrop host. Retrying…" : "Connecting…"}
        </p>
      )}

      <label className="mx-3 flex h-9 shrink-0 items-center gap-5 rounded-lg bg-field px-3 text-muted">
        <SearchIcon size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or start a new chat"
          aria-label="Search chats"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted select-text [-webkit-user-select:text]"
        />
      </label>
      {/* Scrolls sideways when the column is too narrow for every chip, like WhatsApp. */}
      <div
        className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-1.5 pt-2.5 [scrollbar-width:none]"
        role="group"
        aria-label="Filter chats"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`shrink-0 rounded-full px-3.5 py-1 text-[14px] ${
              filter === f.id ? "bg-chip-on text-chip-on-ink" : "bg-field text-muted hover:brightness-95"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="flex-1 overflow-y-auto pb-20 md:pb-0" aria-label="Chats">
        {shown.map((chat) => (
          <li key={chat.id}>
            <button
              {...pressable(chat)}
              aria-current={chat.id === activeId ? "page" : undefined}
              className={`flex h-[72px] w-full items-center gap-[15px] pl-[13px] text-left ${
                chat.id === activeId ? "bg-field" : "hover:bg-hover active:bg-hover"
              }`}
            >
              <ChatAvatar chat={chat} />
              <div className="flex h-full min-w-0 flex-1 flex-col justify-center border-b border-divider pr-[15px]">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[17px]">{chat.title}</p>
                  {chat.lastAt !== undefined && (
                    <span className={`shrink-0 text-[12px] ${chat.unread ? "text-accent" : "text-muted"}`}>
                      {formatListTime(chat.lastAt)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1 text-[14px] text-muted">
                    <Preview text={chat.preview} />
                  </p>
                  {chat.unread > 0 && <UnreadBadge count={chat.unread} />}
                </div>
              </div>
            </button>
          </li>
        ))}
        {shown.length === 0 && (q || filter !== "all") && (
          <li className="px-8 py-10 text-center text-[14px] text-muted">
            {q
              ? `No chats match “${query.trim()}”.`
              : filter === "unread"
                ? "No unread chats."
                : filter === "groups"
                  ? "No groups yet. Start one from the menu."
                  : "No private chats yet."}
          </li>
        )}
      </ul>

      {/* WhatsApp's floating "new chat" button, on phones. */}
      <button
        onClick={onNewChat}
        aria-label="New chat"
        className="absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg md:hidden"
      >
        <NewChatIcon />
      </button>
    </div>
  );
}

/** Your own last message gets WhatsApp's tick instead of a "You:" label. */
function Preview({ text }: { text?: string }) {
  if (!text) return <span className="truncate">No messages yet</span>;
  if (!text.startsWith("You: ")) return <span className="truncate">{text}</span>;
  return (
    <>
      <span className="shrink-0 text-muted">
        <TickIcon />
      </span>
      <span className="truncate">{text.slice(5)}</span>
    </>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-bold text-panel"
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ChatAvatar({
  chat,
  size = "list",
}: {
  chat: Pick<ChatSummary, "id" | "title" | "kind" | "online">;
  size?: "list" | "header";
}) {
  const box = size === "list" ? "size-[49px]" : "size-10";
  const icon = size === "list" ? 26 : 22;
  return (
    <span className="relative shrink-0">
      {chat.kind === "everyone" ? (
        <span aria-hidden className={`flex items-center justify-center rounded-full bg-accent text-white ${box}`}>
          <WifiIcon size={icon} />
        </span>
      ) : chat.kind === "group" ? (
        <span aria-hidden className={`flex items-center justify-center rounded-full text-white ${box}`} style={{ background: colourFor(chat.id) }}>
          <PeopleIcon size={icon} />
        </span>
      ) : (
        <Avatar name={chat.title} seed={chat.id} size={size} />
      )}
      {chat.online && chat.kind === "private" && (
        <span
          aria-label="online"
          className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-panel bg-accent"
        />
      )}
    </span>
  );
}

/** Today: the time; yesterday: "Yesterday"; this week: the weekday; otherwise a short date. */
function formatListTime(at: number): string {
  const date = new Date(at);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(at);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (today.getTime() - at < 7 * 86_400_000) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { day: "numeric", month: "numeric", year: "2-digit" });
}

/** A tap opens the chat; holding it (or right-clicking) opens its menu instead. */
function usePressAndHold(onOpen: (id: string) => void, onHold: (chat: ChatSummary) => void) {
  const press = useRef<{ x: number; y: number; held: boolean; timer?: ReturnType<typeof setTimeout> }>(undefined);
  return (chat: ChatSummary) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const p: NonNullable<typeof press.current> = { x: e.clientX, y: e.clientY, held: false };
      p.timer = setTimeout(() => {
        p.held = true;
        navigator.vibrate?.(10);
        onHold(chat);
      }, LONG_PRESS_MS);
      press.current = p;
    },
    // Scrolling the list isn't holding.
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) clearTimeout(p.timer);
    },
    onPointerUp: () => clearTimeout(press.current?.timer),
    onPointerCancel: () => clearTimeout(press.current?.timer),
    // Right-click on computers; on Android a long press also fires this, which the timer has already handled.
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!press.current?.held) onHold(chat);
    },
    onClick: () => {
      const held = press.current?.held;
      press.current = undefined;
      if (!held) onOpen(chat.id);
    },
  });
}
