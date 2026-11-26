"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { MAX_DEVICE_NAME_LENGTH } from "@landrop/protocol";
import { AVATARS, AvatarArt, avatarPicture, defaultAvatar, type AvatarId } from "./avatars";
import { Avatar, BackIcon, BellIcon, ChatsIcon, DoubleTickIcon, FILLED_BUTTON, ICON_BUTTON, PeopleIcon, SunIcon, TickIcon } from "./ui";

export type Theme = "system" | "light" | "dark";

interface NotificationSettings {
  notifications: boolean;
  previews: boolean;
}
declare global {
  interface Window {
    /** Present only in the LANDrop app on the host computer, not in a browser. */
    landrop?: { notifications?: { get(): Promise<NotificationSettings>; set(change: Partial<NotificationSettings>): Promise<NotificationSettings> } };
  }
}

// Both choices are classes on <html>, applied before first paint by the script in layout.tsx,
// which also follows the device while the theme is "system".
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const changed = () => listeners.forEach((listener) => listener());

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the choice still applies until reload.
  }
}

/**
 * The chat looks: each is a data attribute on <html> (data-accent, data-text, …) that globals.css
 * styles, saved as "landrop.<name>". The first option of each is the default and has no attribute.
 */
const LOOKS = {
  accent: ["green", "blue", "purple", "pink", "orange", "teal", "red", "graphite"],
  text: ["medium", "small", "large"],
  wall: ["doodles", "plain", "dots", "grid", "lines", "waves"],
} as const;
type Look = keyof typeof LOOKS;
type LookValue<L extends Look> = (typeof LOOKS)[L][number];

function readLook<L extends Look>(look: L): LookValue<L> {
  const value = document.documentElement.dataset[look];
  return (LOOKS[look] as readonly string[]).includes(value ?? "") ? (value as LookValue<L>) : LOOKS[look][0];
}
function setLook<L extends Look>(look: L, value: LookValue<L>) {
  if (value === LOOKS[look][0]) delete document.documentElement.dataset[look];
  else document.documentElement.dataset[look] = value;
  save(`landrop.${look}`, value);
  changed();
}
function useLook<L extends Look>(look: L): [LookValue<L>, (value: LookValue<L>) => void] {
  const value = useSyncExternalStore(subscribe, () => readLook(look), () => LOOKS[look][0]);
  return [value, (next) => setLook(look, next)];
}

let theme: Theme | undefined;
function readTheme(): Theme {
  if (!theme) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("landrop.theme");
    } catch {
      // Storage unavailable: follow the device.
    }
    theme = saved === "light" || saved === "dark" ? saved : "system";
  }
  return theme;
}
function setTheme(next: Theme) {
  theme = next;
  save("landrop.theme", next);
  window.dispatchEvent(new Event("landrop:theme"));
  changed();
}

const THEMES = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
] as const;

const useTheme = () => useSyncExternalStore(subscribe, readTheme, (): Theme => "system");

/** WhatsApp-style settings, shown in the list column. Sections get added here as features land. */
export type SettingsPage = "profile" | "appearance" | "chats" | "notifications";

const PAGES: { id: SettingsPage; label: string; hint: string; icon: ReactNode }[] = [
  { id: "profile", label: "Profile", hint: "Your name and avatar", icon: <PeopleIcon /> },
  { id: "appearance", label: "Appearance", hint: "Light, dark or follow this device", icon: <SunIcon /> },
  { id: "chats", label: "Chats", hint: "Colour, text size and wallpaper", icon: <ChatsIcon /> },
  { id: "notifications", label: "Notifications", hint: "Alerts for new messages", icon: <BellIcon /> },
];

/** Pop-up alerts come from the host app, so only its own window has that page. */
const inHostApp = () => typeof window !== "undefined" && !!window.landrop?.notifications;

/** The list of settings on the left: your profile, then each group of options. The details open beside it. */
export function Settings({
  selfName,
  selfId,
  page,
  onPage,
}: {
  selfName?: string;
  selfId?: string;
  /** The page open on the right; on a phone, none until one is tapped. */
  page?: SettingsPage;
  onPage: (page: SettingsPage) => void;
}) {
  const row = (id: SettingsPage, label: string, hint: string, icon: ReactNode) => (
    <button
      key={id}
      onClick={() => onPage(id)}
      aria-current={page === id ? "page" : undefined}
      className={`flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-hover ${page === id ? "md:bg-hover" : ""}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px]">{label}</span>
        <span className="block truncate text-[13px] text-muted">{hint}</span>
      </span>
    </button>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center px-5 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0">
        <h1 className="text-[22px] font-bold">Settings</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => onPage("profile")}
          className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-hover ${page === "profile" ? "md:bg-hover" : ""}`}
        >
          <Avatar name={selfName ?? "?"} seed={selfId} size="profile" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px]">{selfName ?? "Joining…"}</span>
            <span className="block text-[14px] text-muted">Your profile</span>
          </span>
        </button>
        <div className="border-t border-divider pt-1">
          {PAGES.filter((p) => p.id !== "profile" && (p.id !== "notifications" || inHostApp())).map((p) => row(p.id, p.label, p.hint, p.icon))}
        </div>
      </div>
    </div>
  );
}

/** The page chosen in the settings list, shown on the right (a full screen on phones, with a way back). */
export function SettingsDetail({
  page,
  selfName,
  selfId,
  onRename,
  onPhoto,
  onBack,
}: {
  page: SettingsPage;
  selfName?: string;
  selfId?: string;
  /** Saves a new name. */
  onRename: (name: string) => void;
  /** A new profile photo, or undefined to remove it. */
  onPhoto: (photo: Blob | undefined) => void;
  /** Phones only: back to the list. */
  onBack: () => void;
}) {
  const title = PAGES.find((p) => p.id === page)!.label;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel md:bg-bar">
      <header className="flex h-16 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] box-content md:box-border md:px-8 md:pt-0">
        <button onClick={onBack} className={`${ICON_BUTTON} text-foreground md:hidden`} aria-label="Back to settings">
          <BackIcon />
        </button>
        <h2 className="pl-2 text-[22px] font-bold md:pl-0">{title}</h2>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div key={page} className="page-in mx-auto w-full max-w-xl">
          {page === "profile" && <ProfilePage key={selfName} selfName={selfName} selfId={selfId} onRename={onRename} onPhoto={onPhoto} />}
          {page === "appearance" && <AppearancePage />}
          {page === "chats" && <ChatLooks />}
          {page === "notifications" && <HostNotifications />}
        </div>
      </div>
    </div>
  );
}

function AppearancePage() {
  const theme = useTheme();
  return (
    <section aria-labelledby="theme-title" className="px-5 py-5">
      <h3 id="theme-title" className="text-[15px] font-medium">
        Theme
      </h3>
      <p className="mt-1 text-[13px] text-muted">Choose how LANDrop looks. System follows this device’s light or dark setting.</p>
      <div className="mt-4 grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby="theme-title">
        {THEMES.map(([id, label]) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            onClick={() => setTheme(id)}
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] motion-reduce:transition-none ${
              theme === id ? "border-accent shadow-sm ring-2 ring-accent/30" : "border-divider hover:border-muted/50"
            }`}
          >
            <ThemePreview mode={id} />
            <span className="flex items-center justify-between px-1 text-[14px] font-medium">
              {label}
              <span
                aria-hidden
                className={`flex size-5 items-center justify-center rounded-full border transition-colors duration-300 ${
                  theme === id ? "border-accent bg-accent text-white" : "border-divider"
                }`}
              >
                {theme === id && (
                  <span className="pop-in">
                    <TickIcon />
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** A miniature chat in the theme's own colours; "system" shows both halves. */
function ThemePreview({ mode }: { mode: Theme }) {
  const scene = (dark: boolean) => (
    <div className={`absolute inset-0 flex flex-col gap-1.5 p-2 ${dark ? "bg-[#09090b]" : "bg-[#fafafa]"}`}>
      <span className={`h-1.5 w-8 rounded-full ${dark ? "bg-[#27272a]" : "bg-[#e4e4e7]"}`} />
      <span className={`h-3 w-14 rounded-md ${dark ? "bg-[#18181b]" : "bg-white shadow-sm"}`} />
      <span className={`ml-auto h-3 w-10 rounded-md ${dark ? "bg-[#065f46]" : "bg-[#d1fae5]"}`} />
      <span className={`h-3 w-12 rounded-md ${dark ? "bg-[#18181b]" : "bg-white shadow-sm"}`} />
    </div>
  );
  return (
    <div aria-hidden className="relative h-20 overflow-hidden rounded-lg border border-divider">
      {scene(mode === "dark")}
      {mode === "system" && <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">{scene(true)}</div>}
    </div>
  );
}

const AVATAR_KEY = "landrop.avatar";
function readAvatar(): AvatarId | undefined {
  try {
    const saved = localStorage.getItem(AVATAR_KEY);
    return AVATARS.find((a) => a.id === saved)?.id;
  } catch {
    return undefined;
  }
}

/** Your avatar and name: pick one of the set on top, change your name below. */
function ProfilePage({
  selfName,
  selfId,
  onRename,
  onPhoto,
}: {
  selfName?: string;
  selfId?: string;
  onRename: (name: string) => void;
  onPhoto: (photo: Blob | undefined) => void;
}) {
  const [chosen, setChosen] = useState<AvatarId | undefined>(readAvatar);
  const [error, setError] = useState<string>();
  const [name, setName] = useState(selfName ?? "");
  const current = chosen ?? defaultAvatar(selfId ?? selfName ?? "");
  const trimmed = name.trim();
  async function choose(id: AvatarId) {
    setChosen(id);
    setError(undefined);
    try {
      localStorage.setItem(AVATAR_KEY, id);
    } catch {
      // Private browsing: the avatar still applies until reload.
    }
    try {
      onPhoto(await avatarPicture(id));
    } catch {
      setError("That avatar couldn't be set. Try again.");
    }
  }
  return (
    <div className="flex flex-col gap-8 px-5 py-6">
      <section aria-labelledby="avatar-title" className="flex flex-col items-center gap-5">
        <div key={current} className="pop-in overflow-hidden rounded-full shadow-md ring-4 ring-panel">
          <AvatarArt id={current} className="size-28" />
        </div>
        <div className="w-full">
          <h3 id="avatar-title" className="text-[15px] font-medium">
            Avatar
          </h3>
          <p className="mt-1 text-[13px] text-muted">Everyone on this Wi-Fi sees the one you pick.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6" role="radiogroup" aria-labelledby="avatar-title">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                role="radio"
                aria-checked={current === a.id}
                aria-label={a.label}
                title={a.label}
                onClick={() => void choose(a.id)}
                className={`relative aspect-square overflow-hidden rounded-full transition-all duration-300 hover:scale-105 active:scale-95 motion-reduce:transition-none ${
                  current === a.id ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : "opacity-80 hover:opacity-100"
                }`}
              >
                <AvatarArt id={a.id} className="size-full" />
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </div>
      </section>

      <form
        aria-labelledby="name-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed && trimmed !== selfName) onRename(trimmed);
        }}
      >
        <h3 id="name-title" className="text-[15px] font-medium">
          Name
        </h3>
        <p className="mt-1 text-[13px] text-muted">How you appear to the other devices in chats.</p>
        <div className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_DEVICE_NAME_LENGTH}
            aria-labelledby="name-title"
            placeholder="Your name"
            className="h-10 min-w-0 flex-1 rounded-lg border border-divider bg-panel px-3 text-[15px] outline-none transition-shadow placeholder:text-muted focus:ring-2 focus:ring-accent/40"
          />
          <button type="submit" disabled={!trimmed || trimmed === selfName} className={`${FILLED_BUTTON} !rounded-lg !py-0`}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/** A row of options with a highlight that slides to the chosen one. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Id of the heading that names the choice. */
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = options.findIndex(([id]) => id === value);
  return (
    <div
      className="relative mt-3 grid rounded-xl bg-field p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      role="radiogroup"
      aria-labelledby={label}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-lg bg-panel shadow-[0_1px_2px_rgba(11,20,26,.15)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(([id, text]) => (
        <button
          key={id}
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`relative rounded-lg py-2 text-[15px] transition-colors duration-300 ${
            value === id ? "font-medium text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`relative mt-3 flex items-center justify-between gap-4 py-1 text-[15px] ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        {label}
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 rounded-full bg-field transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

/** Pop-up alerts for new messages. They come from the host app, so only its own window offers them. */
function HostNotifications() {
  const bridge = typeof window === "undefined" ? undefined : window.landrop?.notifications;
  const [state, setState] = useState<NotificationSettings>();
  useEffect(() => {
    void bridge?.get().then(setState);
  }, [bridge]);
  if (!bridge || !state) return null;
  const change = (next: Partial<NotificationSettings>) => void bridge.set(next).then(setState);
  return (
    <section aria-labelledby="notify-title" className="px-5 py-5">
      <h3 id="notify-title" className="sr-only">
        Notifications
      </h3>
      <SwitchRow label="Notify me about new messages" checked={state.notifications} onChange={(on) => change({ notifications: on })} />
      <SwitchRow
        label="Show message text"
        hint="Off hides the message, so a banner only says who wrote."
        checked={state.previews}
        disabled={!state.notifications}
        onChange={(on) => change({ previews: on })}
      />
    </section>
  );
}

/** Each chat colour's swatch: its light-mode accent. */
const SWATCHES: Record<LookValue<"accent">, string> = {
  green: "#00a884",
  blue: "#1f6bff",
  purple: "#7c4dff",
  pink: "#e5397a",
  orange: "#e8710a",
  teal: "#0a9396",
  red: "#e5484d",
  graphite: "#54656f",
};

const WALLPAPERS: [LookValue<"wall">, string][] = [
  ["plain", "Plain"],
  ["doodles", "Doodles"],
  ["dots", "Dots"],
  ["grid", "Grid"],
  ["lines", "Lines"],
  ["waves", "Waves"],
];

/** WhatsApp's chat settings: how bubbles and the chat background look, with a preview. */
function ChatLooks() {
  const [accent, setAccent] = useLook("accent");
  const [text, setText] = useLook("text");
  const [wall, setWall] = useLook("wall");
  return (
    <section aria-labelledby="chats-title" className="px-5 py-5">
      <h3 id="chats-title" className="sr-only">
        Chats
      </h3>

      {/* The real bubble and wallpaper styles, so the preview is exactly what chats will look like. */}
      <div aria-hidden className="wallpaper mt-3 flex flex-col gap-1 overflow-hidden rounded-xl px-4 py-4">
        <div className="relative ml-2 w-fit max-w-[80%] rounded-(--bubble-radius) border border-divider bg-bubble-in px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading) shadow-sm">
          Did the photos come through? 📸
          <span className="float-right mt-2 -mb-1.5 ml-2.5 text-[11px] leading-4 opacity-60">9:41</span>
        </div>
        <div className="relative mt-2 mr-2 w-fit max-w-[80%] self-end rounded-(--bubble-radius) border border-transparent bg-bubble-out px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink shadow-sm">
          All of them, thanks!
          <span className="float-right mt-2 -mb-1.5 ml-2.5 inline-flex items-center gap-1 text-[11px] leading-4">
            <span className="opacity-60">9:42</span>
            <span className="text-[#53bdeb]">
              <DoubleTickIcon />
            </span>
          </span>
        </div>
        <div className="relative mr-2 w-fit max-w-[80%] self-end rounded-(--bubble-radius) border border-transparent bg-bubble-out px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink shadow-sm">
          See you at 5
          <span className="float-right mt-2 -mb-1.5 ml-2.5 inline-flex items-center gap-1 text-[11px] leading-4 opacity-60">
            9:42
            <TickIcon />
          </span>
        </div>
      </div>

      <h3 id="colour-title" className="mt-5 text-[14px] text-muted">
        Colour
      </h3>
      <div className="mt-3 grid grid-cols-8 gap-2" role="radiogroup" aria-labelledby="colour-title">
        {LOOKS.accent.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={accent === id}
            aria-label={id[0].toUpperCase() + id.slice(1)}
            title={id[0].toUpperCase() + id.slice(1)}
            onClick={() => setAccent(id)}
            className={`flex aspect-square items-center justify-center rounded-full ring-offset-2 ring-offset-panel transition ${
              accent === id ? "ring-2 ring-foreground/70" : "hover:scale-105"
            }`}
            style={{ background: SWATCHES[id] }}
          >
            {accent === id && (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <h3 id="text-title" className="mt-5 text-[14px] text-muted">
        Text size
      </h3>
      <Segmented
        label="text-title"
        options={[
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ]}
        value={text}
        onChange={setText}
      />

      <h3 id="wall-title" className="mt-5 text-[14px] text-muted">
        Wallpaper
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="wall-title">
        {WALLPAPERS.map(([id, label]) => (
          // Each tile shows that wallpaper by setting it just on the tile.
          <button
            key={id}
            role="radio"
            aria-checked={wall === id}
            onClick={() => setWall(id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[13px] ${wall === id ? "bg-field font-medium" : "text-muted hover:bg-hover"}`}
          >
            <span className={`block h-14 w-full overflow-hidden rounded-lg border-2 ${wall === id ? "border-accent" : "border-divider"}`}>
              <span className={`wallpaper wall-${id} block size-full`} />
            </span>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">Only changes how LANDrop looks on this device.</p>
    </section>
  );
}
