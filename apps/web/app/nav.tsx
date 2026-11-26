"use client";

import type { ReactNode } from "react";
import { Avatar, ChatsIcon, DevicesIcon, QrIcon, SettingsIcon } from "./ui";

/** Which list the left column shows, like WhatsApp's Chats / Settings tabs. */
export type Panel = "chats" | "devices" | "settings";

interface NavProps {
  panel: Panel;
  unread: number;
  selfName?: string;
  selfId?: string;
  onPanel: (panel: Panel) => void;
  onInvite: () => void;
}

/** The narrow icon strip on the far left of WhatsApp Web. Computers only. */
export function Rail({ panel, unread, selfName, selfId, onPanel, onInvite }: NavProps) {
  return (
    <nav
      aria-label="LANDrop"
      className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-divider bg-bar py-3 md:flex"
    >
      <RailButton label="Chats" active={panel === "chats"} onClick={() => onPanel("chats")} badge={unread}>
        <ChatsIcon bold={panel === "chats"} />
      </RailButton>
      <RailButton label="Devices" active={panel === "devices"} onClick={() => onPanel("devices")}>
        <DevicesIcon bold={panel === "devices"} />
      </RailButton>
      <RailButton label="Add a device: show QR code" onClick={onInvite}>
        <QrIcon />
      </RailButton>
      <span className="flex-1" />
      {/* Your avatar opens Settings, like WhatsApp Web's profile picture. */}
      <button
        onClick={() => onPanel("settings")}
        aria-current={panel === "settings" ? "page" : undefined}
        className={`rounded-full ring-offset-2 ring-offset-bar ${panel === "settings" ? "ring-2 ring-accent" : ""}`}
        aria-label={`You are ${selfName ?? "joining"}. Open settings`}
        title={selfName}
      >
        <Avatar name={selfName ?? "?"} seed={selfId} />
      </button>
    </nav>
  );
}

function RailButton({
  label,
  active = false,
  badge = 0,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={badge ? `${label}, ${badge} unread` : label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`relative flex size-10 items-center justify-center rounded-full ${
        active ? "bg-field text-foreground" : "text-muted hover:bg-hover"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-1 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-bar bg-accent px-1 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/** WhatsApp's bottom tab bar on phones. */
export function BottomTabs({ panel, unread, onPanel }: Pick<NavProps, "panel" | "unread" | "onPanel">) {
  const tabs: { id: Panel; label: string; icon: (bold: boolean) => ReactNode }[] = [
    { id: "chats", label: "Chats", icon: (bold) => <ChatsIcon bold={bold} /> },
    { id: "devices", label: "Devices", icon: (bold) => <DevicesIcon bold={bold} /> },
    { id: "settings", label: "Settings", icon: (bold) => <SettingsIcon bold={bold} /> },
  ];
  return (
    <nav
      aria-label="LANDrop"
      className="grid shrink-0 grid-cols-3 border-t border-divider bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onPanel(t.id)}
          aria-current={panel === t.id ? "page" : undefined}
          className="flex flex-col items-center gap-1 pb-2 pt-2.5 text-[12px] font-medium"
        >
          <span
            className={`relative flex h-8 w-16 items-center justify-center rounded-full ${
              panel === t.id ? "bg-chip-on text-chip-on-ink" : "text-muted"
            }`}
          >
            {t.icon(panel === t.id)}
            {t.id === "chats" && unread > 0 && (
              <span className="absolute -top-1 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          <span className={panel === t.id ? "text-foreground" : "text-muted"}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
