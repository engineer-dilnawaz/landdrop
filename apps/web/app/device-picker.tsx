"use client";

import type { NetworkDevice } from "@landrop/protocol";
import { ChatAvatar } from "./chat-list";
import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { ICON_BUTTON, QrIcon, Spinner, WifiIcon } from "./ui";

export interface PickableDevice {
  /** The private chat with this device. */
  chatId: string;
  name: string;
  online: boolean;
  /** "online" or "last seen …". */
  status: string;
}

/**
 * Every device that has joined LANDrop, to start a private chat with, like WhatsApp's "New chat".
 * Devices that are offline can still be messaged: the host keeps the messages until they're back.
 */
export function DevicePicker({
  devices,
  network,
  onPick,
  onInvite,
}: {
  devices: PickableDevice[];
  /** Everything else on the Wi-Fi, from the host's scan; undefined while it runs. */
  network: NetworkDevice[] | undefined;
  onPick: (chatId: string) => void;
  onInvite: () => void;
}) {
  const online = devices.filter((d) => d.online);
  const offline = devices.filter((d) => !d.online);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 px-2 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0">
        <div className="min-w-0 flex-1 pl-3">
          <h1 className="text-[20px] font-semibold leading-tight tracking-tight">Devices</h1>
          <p className="truncate text-[13px] text-muted">Pick one to start a private chat</p>
        </div>
        <button onClick={onInvite} className={ICON_BUTTON} aria-label="Add a device: show QR code" title="Add a device">
          <QrIcon />
        </button>
      </header>
      <button
        onClick={onInvite}
        className="mx-3 mb-1 mt-1 flex shrink-0 items-center gap-3.5 rounded-2xl bg-chip-on px-3 py-3 text-left text-chip-on-ink transition-colors hover:brightness-95 active:scale-[0.99]"
      >
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-fill text-white">
          <QrIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[15.5px] font-medium text-foreground">Add a device</span>
          <span className="block text-[13px]">Show the QR code to join</span>
        </span>
      </button>

      <div className="flex-1 overflow-y-auto">
        {devices.length === 0 && (
          <EmptyState
            kind="devices"
            title="No other devices yet"
            action={
              <button onClick={onInvite} className="rounded-xl bg-accent-fill px-5 py-2.5 text-[14px] font-medium text-white transition-transform active:scale-95">
                Show QR code to join
              </button>
            }
          >
            Phones and computers on this Wi-Fi appear here once they scan the code.
          </EmptyState>
        )}
        <DeviceSection title="Online" devices={online} onPick={onPick} />
        <DeviceSection title="Not online" devices={offline} onPick={onPick} />
        <NetworkSection devices={network} onInvite={onInvite} />
      </div>
    </div>
  );
}

function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 px-5 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
      {count !== undefined && <span className="rounded-md bg-field px-1.5 tabular-nums">{count}</span>}
    </h2>
  );
}

function DeviceSection({
  title,
  devices,
  onPick,
}: {
  title: string;
  devices: PickableDevice[];
  onPick: (chatId: string) => void;
}) {
  if (!devices.length) return null;
  return (
    <section aria-label={title}>
      <SectionTitle count={devices.length}>{title}</SectionTitle>
      <ul className="px-2">
        {devices.map((d) => (
          <li key={d.chatId}>
            <button
              onClick={() => onPick(d.chatId)}
              className="flex h-[68px] w-full items-center gap-3.5 rounded-2xl px-3 text-left transition-colors hover:bg-hover active:bg-field"
            >
              <ChatAvatar chat={{ id: d.chatId, title: d.name, kind: "private", online: d.online }} />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <p className="truncate text-[15.5px] font-medium">{d.name}</p>
                <p className="truncate text-[13.5px] text-muted">{d.status}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Devices on the same Wi-Fi that aren't using LANDrop. Nothing can be sent to them until someone
 * opens LANDrop there, so picking one shows the QR code to join.
 */
function NetworkSection({ devices, onInvite }: { devices: NetworkDevice[] | undefined; onInvite: () => void }) {
  if (devices?.length === 0) return null;
  return (
    <section aria-label="Also on this Wi-Fi" aria-busy={!devices}>
      <SectionTitle count={devices?.length}>Also on this Wi-Fi</SectionTitle>
      {!devices ? (
        <p className="flex items-center gap-2 px-5 py-2 text-[14px] text-muted">
          <Spinner size={12} />
          Looking for devices on this Wi-Fi…
        </p>
      ) : (
        <ul className="px-2">
          {devices.map((d) => (
            <li key={d.address}>
              <button
                onClick={onInvite}
                className="flex h-[68px] w-full items-center gap-3.5 rounded-2xl px-3 text-left transition-colors hover:bg-hover active:bg-field"
              >
                <span aria-hidden className="flex size-[49px] shrink-0 items-center justify-center rounded-full bg-field text-muted">
                  <WifiIcon />
                </span>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <p className="truncate text-[15.5px] font-medium">{d.name ?? d.address}</p>
                  <p className="truncate text-[13.5px] text-muted">
                    {d.name ? `${d.address} · ` : ""}Not on LANDrop · tap to invite
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
