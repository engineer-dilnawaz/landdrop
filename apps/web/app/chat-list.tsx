"use client";

import { InstallBanner, useInstallApp } from "./install-app";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { LONG_PRESS_MS } from "./bubble";
import { EmptyState } from "./empty-state";
import {
  Avatar,
  CloseIcon,
  DropdownMenu,
  ICON_BUTTON,
  NewChatIcon,
  PeopleIcon,
  PinIcon,
  QrIcon,
  SearchIcon,
  Spinner,
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
  /** Pinned to the top of the list on this device. */
  pinned?: boolean;
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
  const app = useInstallApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const q = query.trim().toLowerCase();
  const unreadChats = chats.filter((c) => c.unread > 0).length;
  const shown = chats
    .filter(FILTERS.find((f) => f.id === filter)!.keep)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-1 px-4 pt-[env(safe-area-inset-top)] box-content md:box-border md:pl-5 md:pt-0">
        <h1 className="flex-1 text-[22px] font-semibold tracking-tight text-accent md:text-foreground">
          <span className="md:hidden">LANDrop</span>
          <span className="hidden md:inline">Chats</span>
        </h1>
        <button onClick={onInvite} className={`${ICON_BUTTON} md:hidden`} aria-label="Add a device: show QR code" title="Add a device">
          <QrIcon />
        </button>
        <button onClick={onNewChat} className={`${ICON_BUTTON} hidden bg-field text-foreground hover:bg-hover md:flex`} aria-label="New chat" title="New chat">
          <NewChatIcon size={20} />
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
        <div
          role="status"
          className={`page-in mx-3 mb-3 flex items-center gap-3 rounded-xl p-3 ${
            connection === "offline" ? "bg-amber-500/10" : "bg-field"
          }`}
        >
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              connection === "offline" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-panel text-muted"
            }`}
          >
            <WifiIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium leading-5">{connection === "offline" ? "Can't reach the LANDrop host" : "Connecting…"}</p>
            <p className="flex items-center gap-1.5 text-[13px] leading-5 text-muted">
              <Spinner size={12} />
              {connection === "offline" ? "Trying again automatically" : "Finding the host on this Wi-Fi"}
            </p>
          </div>
        </div>
      )}

      {app.banner && <InstallBanner install={app.install} onDismiss={app.dismiss} />}
      {app.sheet}

      <label className="mx-3 flex h-10 shrink-0 items-center gap-2.5 rounded-xl bg-field px-3 text-muted transition-colors focus-within:bg-hover">
        <SearchIcon size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats and messages"
          aria-label="Search chats"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted select-text [-webkit-user-select:text]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            title="Clear"
            className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-foreground"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </label>
      {/* Scrolls sideways when the column is too narrow for every chip, like WhatsApp. */}
      <div
        className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2 pt-3 [scrollbar-width:none]"
        role="group"
        aria-label="Filter chats"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium transition-colors active:scale-95 ${
              filter === f.id ? "bg-foreground text-panel" : "bg-field text-muted hover:bg-hover hover:text-foreground"
            }`}
          >
            {f.label}
            {f.id === "unread" && unreadChats > 0 && (
              <span className={`rounded-md px-1.5 text-[11px] font-semibold tabular-nums ${filter === f.id ? "bg-panel/20" : "bg-accent-fill text-white"}`}>{unreadChats}</span>
            )}
          </button>
        ))}
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-20 md:pb-2" aria-label="Chats">
        {shown.map((chat, i) => (
          <Fragment key={chat.id}>
            {/* With pinned chats, the list reads in two groups. */}
            {chat.pinned && !shown[i - 1]?.pinned && <GroupLabel>Pinned</GroupLabel>}
            {!chat.pinned && shown[i - 1]?.pinned && <GroupLabel>All chats</GroupLabel>}
          <li>
            <button
              {...pressable(chat)}
              aria-current={chat.id === activeId ? "page" : undefined}
              className={`flex h-[68px] w-full items-center gap-3.5 rounded-2xl px-3 text-left transition-colors ${
                chat.id === activeId ? "bg-field" : "hover:bg-hover active:bg-field"
              }`}
            >
              <ChatAvatar chat={chat} />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15.5px] font-medium">{chat.title}</p>
                  {chat.lastAt !== undefined && (
                    <span className={`shrink-0 text-[12px] tabular-nums ${chat.unread ? "font-medium text-accent" : "text-muted"}`}>
                      {formatListTime(chat.lastAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1 text-[13.5px] text-muted">
                    <Preview text={chat.preview} />
                  </p>
                  {(chat.pinned || chat.unread > 0) && (
                    <span className="flex shrink-0 items-center gap-1.5">
                      {chat.pinned && (
                        <span className="text-muted" title="Pinned" aria-label="Pinned">
                          <PinIcon size={16} />
                        </span>
                      )}
                      {chat.unread > 0 && <UnreadBadge count={chat.unread} />}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
          </Fragment>
        ))}
        {shown.length === 0 && (q || filter !== "all") && (
          <li>
            {q ? (
              <EmptyState kind="search" title="No chats found">
                Nothing matches “{query.trim()}”. Try a different name or word.
              </EmptyState>
            ) : filter === "unread" ? (
              <EmptyState kind="unread" title="You’re all caught up">
                There are no unread chats right now.
              </EmptyState>
            ) : filter === "groups" ? (
              <EmptyState kind="groups" title="No groups yet" action={<EmptyAction onClick={onNewGroup}>New group</EmptyAction>}>
                Put a few devices together and chat with just them.
              </EmptyState>
            ) : (
              <EmptyState kind="private" title="No private chats yet" action={<EmptyAction onClick={onNewChat}>Start a chat</EmptyAction>}>
                Pick a device to message it directly. Only the two of you see it.
              </EmptyState>
            )}
          </li>
        )}
      </ul>

      {/* WhatsApp's floating "new chat" button, on phones. */}
      <button
        onClick={onNewChat}
        aria-label="New chat"
        className="absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-2xl bg-accent-fill text-white transition-transform active:scale-95 md:hidden"
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

function EmptyAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-accent-fill px-5 py-2.5 text-[14px] font-medium text-white transition-transform active:scale-95">
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <li aria-hidden className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </li>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-lg bg-accent-fill px-1.5 text-[12px] font-semibold tabular-nums text-white"
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
        <span aria-hidden className={`flex items-center justify-center rounded-full bg-accent-fill text-white ${box}`}>
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
        // A dot set into a panel-coloured disc, so it reads against any avatar without a border.
        <span aria-label="online" className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-panel">
          <span className="size-2.5 rounded-full bg-accent" />
        </span>
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
