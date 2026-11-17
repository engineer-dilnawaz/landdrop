"use client";

import type { NetworkDevice } from "@landrop/protocol";
import { ChatAvatar } from "./chat-list";
import { BackIcon, ICON_BUTTON, QrIcon, WifiIcon } from "./ui";

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
  onBack,
  onInvite,
}: {
  devices: PickableDevice[];
  /** Everything else on the Wi-Fi, from the host's scan; undefined while it runs. */
  network: NetworkDevice[] | undefined;
  onPick: (chatId: string) => void;
  onBack: () => void;
  onInvite: () => void;
}) {
  const online = devices.filter((d) => d.online);
  const offline = devices.filter((d) => !d.online);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 px-2 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0">
        <button onClick={onBack} className={`${ICON_BUTTON} text-foreground`} aria-label="Back to chats">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-medium leading-tight">Devices</h1>
          <p className="truncate text-[13px] text-muted">Pick one to start a private chat</p>
        </div>
        <button onClick={onInvite} className={ICON_BUTTON} aria-label="Add a device: show QR code" title="Add a device">
          <QrIcon />
        </button>
      </header>
      <button onClick={onInvite} className="flex h-[72px] w-full shrink-0 items-center gap-[15px] pl-[13px] text-left hover:bg-hover">
        <span aria-hidden className="flex size-[49px] items-center justify-center rounded-full bg-accent text-white">
          <QrIcon />
        </span>
        <span className="text-[17px]">Add a device</span>
      </button>

      <div className="flex-1 overflow-y-auto">
        {devices.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
            <p className="text-[15px] text-muted">No other devices have joined yet.</p>
            <button onClick={onInvite} className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white">
              Show QR code to join
            </button>
          </div>
        )}
        <DeviceSection title="Online" devices={online} onPick={onPick} />
        <DeviceSection title="Not online" devices={offline} onPick={onPick} />
        <NetworkSection devices={network} onInvite={onInvite} />
      </div>
    </div>
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
      <h2 className="px-6 pb-2 pt-5 text-[15px] text-accent">{title}</h2>
      <ul>
        {devices.map((d) => (
          <li key={d.chatId}>
            <button
              onClick={() => onPick(d.chatId)}
              className="flex h-[72px] w-full items-center gap-[15px] pl-[13px] text-left hover:bg-hover active:bg-hover"
            >
              <ChatAvatar chat={{ id: d.chatId, title: d.name, kind: "private", online: d.online }} />
              <div className="flex h-full min-w-0 flex-1 flex-col justify-center border-b border-divider pr-4">
                <p className="truncate text-[17px]">{d.name}</p>
                <p className="truncate text-[14px] text-muted">{d.status}</p>
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
      <h2 className="px-6 pb-2 pt-5 text-[15px] text-accent">Also on this Wi-Fi</h2>
      {!devices ? (
        <p className="px-6 py-2 text-[14px] text-muted">Looking for devices on this Wi-Fi…</p>
      ) : (
        <ul>
          {devices.map((d) => (
            <li key={d.address}>
              <button
                onClick={onInvite}
                className="flex h-[72px] w-full items-center gap-[15px] pl-[13px] text-left hover:bg-hover active:bg-hover"
              >
                <span aria-hidden className="flex size-[49px] shrink-0 items-center justify-center rounded-full bg-field text-muted">
                  <WifiIcon />
                </span>
                <div className="flex h-full min-w-0 flex-1 flex-col justify-center border-b border-divider pr-4">
                  <p className="truncate text-[17px]">{d.name ?? d.address}</p>
                  <p className="truncate text-[14px] text-muted">
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
