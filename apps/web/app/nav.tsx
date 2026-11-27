"use client";

import type { ReactNode } from "react";
import { Avatar, ChatsIcon, DevicesIcon, Logo, QrIcon, SettingsIcon } from "./ui";

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
      className="hidden w-[72px] shrink-0 flex-col items-center gap-2 bg-bar py-4 md:flex"
    >
      {/* The mark, so the app is recognisable at a glance. */}
      <span aria-hidden className="mb-3 flex size-11 items-center justify-center text-accent">
        <Logo size={34} />
      </span>
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
        className={`group relative flex size-11 items-center justify-center rounded-2xl transition-colors ${panel === "settings" ? "bg-chip-on" : "hover:bg-hover"}`}
        aria-label={`You are ${selfName ?? "joining"}. Open settings`}
        title={selfName}
      >
        <span className="flex transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110">
          <Avatar name={selfName ?? "?"} seed={selfId} />
        </span>
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
      className={`group relative flex size-11 items-center justify-center rounded-2xl transition-colors active:scale-95 ${
        active ? "bg-chip-on text-chip-on-ink" : "text-muted hover:bg-hover hover:text-foreground"
      }`}
    >
      {/* A flat marker on the rail's edge shows where you are. */}
      {active && <span aria-hidden className="absolute -left-3.5 h-5 w-1 rounded-r-full bg-accent-fill" />}
      <span className="flex transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.18]">{children}</span>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-lg bg-accent-fill px-1 text-[10px] font-semibold tabular-nums text-white">
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
      className="grid shrink-0 grid-cols-3 bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onPanel(t.id)}
          aria-current={panel === t.id ? "page" : undefined}
          className="group flex flex-col items-center gap-1 pb-2 pt-2.5 text-[12px] font-medium"
        >
          <span
            className={`relative flex h-8 w-16 items-center justify-center rounded-2xl transition-colors ${
              panel === t.id ? "bg-chip-on text-chip-on-ink" : "text-muted"
            }`}
          >
            <span className="flex transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.18] group-active:scale-90">{t.icon(panel === t.id)}</span>
            {t.id === "chats" && unread > 0 && (
              <span className="absolute -top-1 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-lg bg-accent-fill px-1 text-[10px] font-semibold tabular-nums text-white">
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
