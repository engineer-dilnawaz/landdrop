"use client";

import { Avatar, GroupIcon, SidebarIcon } from "./ui";

export interface ChatSummary {
  id: string;
  title: string;
  isGroup: boolean;
  online: boolean;
  /** Last message line, already prefixed with "You: " or the sender's name in the group. */
  preview?: string;
  lastAt?: number;
  unread: number;
}

export function ChatList({
  chats,
  activeId,
  selfName,
  connection,
  compact,
  pinned,
  onTogglePinned,
  onOpen,
  onRename,
}: {
  chats: ChatSummary[];
  activeId?: string;
  selfName?: string;
  connection: "connecting" | "online" | "offline";
  /** Collapsed to a rail: only avatars show. */
  compact: boolean;
  pinned: boolean;
  onTogglePinned: () => void;
  onOpen: (id: string) => void;
  onRename: () => void;
}) {
  // Hidden rather than removed, so the list keeps its layout while the rail slides open.
  const railHidden = `transition-opacity ${compact ? "opacity-0" : ""}`;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-separator bg-bar/80 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          onClick={onTogglePinned}
          className="hidden size-12 shrink-0 items-center justify-center rounded-full text-ios-blue hover:bg-bubble-other md:flex"
          aria-label={pinned ? "Collapse chat list" : "Keep chat list open"}
          aria-pressed={pinned}
          title={pinned ? "Collapse · opens on hover" : "Keep open"}
        >
          <SidebarIcon pinned={pinned} />
        </button>
        <div className={`min-w-0 flex-1 ${railHidden}`}>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Chats</h1>
          <p className={`truncate text-[13px] ${connection === "offline" ? "text-ios-red" : "text-muted"}`}>
            {connection === "online"
              ? "LANDrop · on this Wi-Fi"
              : connection === "connecting"
                ? "connecting…"
                : "Can't reach the host. Retrying…"}
          </p>
        </div>
        <button
          onClick={onRename}
          tabIndex={compact ? -1 : undefined}
          className={`shrink-0 rounded-full ${railHidden}`}
          aria-label={`You are ${selfName ?? "joining"}. Change your name`}
          title={`${selfName ?? ""} · tap to rename`}
        >
          <Avatar name={selfName ?? "?"} />
        </button>
      </header>

      <ul className="flex-1 overflow-y-auto" aria-label="Chats">
        {chats.map((chat) => (
          <li key={chat.id}>
            <button
              onClick={() => onOpen(chat.id)}
              aria-current={chat.id === activeId ? "page" : undefined}
              title={compact ? chat.title : undefined}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                chat.id === activeId ? "bg-bubble-other" : "active:bg-bubble-other md:hover:bg-bubble-other/60"
              }`}
            >
              <span className="relative shrink-0">
                <ChatAvatar chat={chat} />
                {compact && chat.unread > 0 && (
                  <UnreadBadge count={chat.unread} className="absolute -top-1 -right-1.5 border-2 border-background" />
                )}
              </span>
              <div className={`min-w-0 flex-1 border-b border-separator/60 pb-2.5 ${railHidden}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[17px] font-semibold">{chat.title}</p>
                  {chat.lastAt !== undefined && (
                    <span className={`shrink-0 text-[13px] ${chat.unread ? "text-ios-blue" : "text-muted"}`}>
                      {formatListTime(chat.lastAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 text-[15px] leading-5 text-muted">
                    {chat.preview ?? (chat.online ? "Online · tap to start a private chat" : "Tap to start a private chat")}
                  </p>
                  {chat.unread > 0 && <UnreadBadge count={chat.unread} />}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ios-blue px-1.5 text-[12px] font-semibold text-white ${className}`}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ChatAvatar({ chat }: { chat: Pick<ChatSummary, "title" | "isGroup" | "online"> }) {
  return (
    <span className="relative shrink-0">
      {chat.isGroup ? (
        <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-ios-blue text-white">
          <GroupIcon />
        </span>
      ) : (
        <Avatar name={chat.title} size="list" />
      )}
      {chat.online && !chat.isGroup && (
        <span
          aria-label="online"
          className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background bg-ios-green"
        />
      )}
    </span>
  );
}

/** Today: the time; yesterday: "Yesterday"; this week: the weekday; otherwise a short date. */
function formatListTime(at: number): string {
  const date = new Date(at);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (today.getTime() - at < 7 * 86_400_000) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { day: "numeric", month: "numeric", year: "2-digit" });
}
