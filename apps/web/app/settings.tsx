"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  FEEDBACK_AREAS,
  FEEDBACK_FREQUENCIES,
  FEEDBACK_KINDS,
  FEEDBACK_TAGS,
  MAX_DEVICE_NAME_LENGTH,
  MAX_FEEDBACK_LENGTH,
  type FeedbackArea,
  type FeedbackDevice,
  type FeedbackFrequency,
  type FeedbackKind,
  type FeedbackRequest,
  type FeedbackTag,
} from "@landrop/protocol";
import { useInstallApp } from "./install-app";
import { CropSheet } from "./crop-sheet";
import { deviceDetails, deviceLines } from "./device-details";
import { AVATARS, AvatarArt, avatarPicture,  type AvatarId } from "./avatars";
import { Avatar, BackIcon, BellIcon, CameraIcon, ChatsIcon, ChevronIcon, DoubleTickIcon, FILLED_BUTTON, ICON_BUTTON, ImageIcon, InstallIcon, NewChatIcon, PeopleIcon, Sheet, SunIcon, TickIcon, UserIcon } from "./ui";

export type Theme = "system" | "light" | "dark";

interface NotificationSettings {
  notifications: boolean;
  previews: boolean;
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
export type SettingsPage = "profile" | "appearance" | "chats" | "notifications" | "feedback";

const PAGES: { id: SettingsPage; label: string; hint: string; icon: ReactNode }[] = [
  { id: "profile", label: "Profile", hint: "Your name and avatar", icon: <PeopleIcon /> },
  { id: "appearance", label: "Appearance", hint: "Light, dark or follow this device", icon: <SunIcon /> },
  { id: "chats", label: "Chats", hint: "Colour, text size and wallpaper", icon: <ChatsIcon /> },
  { id: "notifications", label: "Notifications", hint: "Alerts for new messages", icon: <BellIcon /> },
  { id: "feedback", label: "Send feedback", hint: "Report a problem or suggest an idea", icon: <NewChatIcon /> },
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
  const app = useInstallApp();
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
          <Avatar name={selfName ?? "?"} seed={selfId} size="xl" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px]">{selfName ?? "Joining…"}</span>
            <span className="block text-[14px] text-muted">Your profile</span>
          </span>
        </button>
        <div className="pt-1">
          {PAGES.filter((p) => p.id !== "profile" && (p.id !== "notifications" || inHostApp())).map((p) => row(p.id, p.label, p.hint, p.icon))}
          {app.kind !== "none" && (
            <button onClick={app.install} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-hover">
              <span className="flex size-10 shrink-0 items-center justify-center text-muted">
                <InstallIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px]">Install app</span>
                <span className="block truncate text-[13px] text-muted">Add LANDrop to your home screen</span>
              </span>
            </button>
          )}
          {app.sheet}
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
  onFeedback,
  onBack,
}: {
  page: SettingsPage;
  selfName?: string;
  selfId?: string;
  /** Saves a new name. */
  onRename: (name: string) => void;
  /** A new profile photo, or undefined to remove it. */
  onPhoto: (photo: Blob | undefined) => void;
  /** Sends feedback to the developer through the host; rejects with a message to show. */
  onFeedback: (feedback: FeedbackRequest) => Promise<void>;
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
          {page === "profile" && <ProfilePage selfName={selfName} selfId={selfId} onRename={onRename} onPhoto={onPhoto} />}
          {page === "appearance" && <AppearancePage />}
          {page === "chats" && <ChatLooks />}
          {page === "notifications" && <HostNotifications />}
          {page === "feedback" && <FeedbackPage onSend={onFeedback} />}
        </div>
      </div>
    </div>
  );
}

const FEEDBACK_LABELS: Record<FeedbackKind, string> = { problem: "Problem", idea: "Idea", other: "Something else" };
const AREA_LABELS: Record<FeedbackArea, string> = {
  joining: "Joining or the QR code",
  sending: "Sending files",
  chat: "Chat and messages",
  folders: "Folders",
  install: "Installing or updating",
  other: "Something else",
};
const FREQUENCY_LABELS: Record<FeedbackFrequency, string> = { always: "Every time", sometimes: "Sometimes", once: "Just once" };
const TAG_LABELS: Record<FeedbackTag, string> = {
  "wont-connect": "Won't connect",
  slow: "Too slow",
  froze: "Froze or crashed",
  failed: "File didn't arrive",
  confusing: "Confusing",
  "looks-wrong": "Looks wrong",
};

/** Report a problem, suggest an idea or say anything else, mostly by choosing. It goes to the developer through the host computer. */
function FeedbackPage({ onSend }: { onSend: (feedback: FeedbackRequest) => Promise<void> }) {
  const [kind, setKind] = useState<FeedbackKind>("problem");
  const [area, setArea] = useState<FeedbackArea | "">("");
  const [frequency, setFrequency] = useState<FeedbackFrequency>();
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();
  // Read after the page loads: a browser's details are not known while the page is built, and the LANDrop app adds its own system.
  const [details, setDetails] = useState<FeedbackDevice>();
  useEffect(() => {
    let live = true;
    const info = window.landrop?.app?.info();
    void (info ?? Promise.resolve(undefined)).then((host) => live && setDetails(deviceDetails(host?.system)));
    return () => {
      live = false;
    };
  }, []);
  const problem = kind === "problem";
  const ready = (message.trim().length >= 3 || (problem && tags.length > 0)) && state !== "sending";
  const toggleTag = (tag: FeedbackTag) => setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));

  async function send() {
    setState("sending");
    setError(undefined);
    try {
      await onSend({
        kind,
        area: area || undefined,
        ...(problem && { frequency, tags }),
        message: message.trim() || undefined,
        device: details,
        email: email.trim() || undefined,
      });
      setMessage("");
      setTags([]);
      setFrequency(undefined);
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <section className="px-5 py-10 text-center">
        <p className="text-[18px] font-medium">Thank you</p>
        <p className="mt-1 text-[14px] text-muted">It reached the developer, who reads every one.</p>
        <button onClick={() => setState("idle")} className={`${FILLED_BUTTON} mt-6`}>
          Send another
        </button>
      </section>
    );
  }

  const chip = (on: boolean) => `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[14px] transition-colors ${on ? "bg-accent-fill text-white" : "bg-field hover:bg-hover"}`;
  const label = "mt-5 mb-2 text-[13px] font-medium text-muted";
  return (
    <section className="px-5 py-5">
      <p className="text-[13px] text-muted">
        Pick what fits, and add a few words only if you want to. Only your choices, your words and the device details below are sent. Never your chats or files.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="What is this about">
        {FEEDBACK_KINDS.map((k) => (
          <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
            {FEEDBACK_LABELS[k]}
          </button>
        ))}
      </div>

      <p className={label}>Which part?</p>
      <div className="relative">
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as FeedbackArea | "")}
          aria-label="Which part of LANDrop"
          className={`h-12 w-full appearance-none rounded-2xl bg-field pl-4 pr-11 text-[16px] outline-none transition-colors focus:bg-hover ${area ? "" : "text-muted"}`}
        >
          <option value="">Choose one</option>
          {FEEDBACK_AREAS.map((a) => (
            <option key={a} value={a}>
              {AREA_LABELS[a]}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
          <ChevronIcon />
        </span>
      </div>

      {problem && (
        <>
          <p className={label}>What happened?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="What happened">
            {FEEDBACK_TAGS.map((t) => (
              <button key={t} role="checkbox" aria-checked={tags.includes(t)} onClick={() => toggleTag(t)} className={chip(tags.includes(t))}>
                {tags.includes(t) && <TickIcon />}
                {TAG_LABELS[t]}
              </button>
            ))}
          </div>
          <p className={label}>How often?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How often">
            {FEEDBACK_FREQUENCIES.map((f) => (
              <button key={f} role="radio" aria-checked={frequency === f} onClick={() => setFrequency(f)} className={chip(frequency === f)}>
                {FREQUENCY_LABELS[f]}
              </button>
            ))}
          </div>
        </>
      )}

      <p className={label}>{problem ? "Anything else? (optional)" : "Tell us a little"}</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MAX_FEEDBACK_LENGTH}
        rows={4}
        aria-label="Your message"
        placeholder={problem ? "What were you trying to do?" : kind === "idea" ? "What would make LANDrop better for you?" : "Anything you like"}
        className="w-full resize-none rounded-2xl bg-field p-4 text-[16px] outline-none transition-colors placeholder:text-muted focus:bg-hover"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={120}
        aria-label="Email, optional"
        placeholder="Email (optional, only if you want a reply)"
        className="mt-3 h-12 w-full rounded-2xl bg-field px-4 text-[16px] outline-none transition-colors placeholder:text-muted focus:bg-hover"
      />
      {details && (
        <details className="group mt-4 rounded-2xl bg-field px-4 py-3" aria-label="Device details sent with your feedback">
          <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">Your device details will be sent too</span>
              <span className="block truncate text-[12px] text-muted">{[details.device, details.os, details.browser].filter(Boolean).join(" · ")}</span>
            </span>
            <span aria-hidden className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180">
              <ChevronIcon />
            </span>
          </summary>
          <p className="mt-3 text-[12px] text-muted">So the problem can be reproduced. No name, no network and no address.</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[13px]">
            {deviceLines(details).map((line) => (
              <div key={line.label} className="contents">
                <dt className="text-muted">{line.label}</dt>
                <dd className="break-words">{line.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-red-600">
          {error}
        </p>
      )}
      <button onClick={() => void send()} disabled={!ready} className={`${FILLED_BUTTON} mt-4`}>
        {state === "sending" ? "Sending…" : "Send"}
      </button>
    </section>
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
            className={`group relative flex flex-col items-stretch gap-2 rounded-xl p-2 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none ${
              theme === id ? "bg-chip-on" : "bg-field"
            }`}
          >
            <ThemePreview mode={id} />
            <span className="flex items-center justify-between px-1 text-[14px] font-medium">
              {label}
              <span
                aria-hidden
                className={`flex size-5 items-center justify-center rounded-full transition-colors duration-300 ${
                  theme === id ? "bg-accent-fill text-white" : "bg-muted/35"
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
      <span className={`h-3 w-14 rounded-md ${dark ? "bg-[#18181b]" : "bg-white"}`} />
      <span className={`ml-auto h-3 w-10 rounded-md ${dark ? "bg-[#065f46]" : "bg-[#d1fae5]"}`} />
      <span className={`h-3 w-12 rounded-md ${dark ? "bg-[#18181b]" : "bg-white"}`} />
    </div>
  );
  return (
    <div aria-hidden className="relative h-20 overflow-hidden rounded-lg">
      {scene(mode === "dark")}
      {mode === "system" && <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">{scene(true)}</div>}
    </div>
  );
}

const AVATAR_KEY = "landrop.avatar";
/** How many avatars show in the quick row; the rest are behind the "+N" tile. */
const QUICK_AVATARS = 6;

function readAvatar(): AvatarId | undefined {
  try {
    const saved = localStorage.getItem(AVATAR_KEY);
    return AVATARS.find((a) => a.id === saved)?.id;
  } catch {
    return undefined;
  }
}

function rememberAvatar(id: AvatarId | undefined) {
  try {
    if (id) localStorage.setItem(AVATAR_KEY, id);
    else localStorage.removeItem(AVATAR_KEY);
  } catch {
    // Private browsing: the avatar still applies until reload.
  }
}

/** Your picture and name: pick an avatar or your own photo on top, change your name below. */
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
  /** A photo picked here, shown at once while it uploads. */
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState<string>();
  const [browsing, setBrowsing] = useState(false);
  const [cropping, setCropping] = useState<File>();
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo]);

  async function chooseAvatar(id: AvatarId) {
    setBrowsing(false);
    setPhoto(undefined);
    setChosen(id);
    setError(undefined);
    rememberAvatar(id);
    try {
      onPhoto(await avatarPicture(id));
    } catch {
      setError("That avatar couldn’t be set. Try again.");
    }
  }

  function usePhoto(square: Blob) {
    setCropping(undefined);
    setPhoto(URL.createObjectURL(square));
    setChosen(undefined);
    rememberAvatar(undefined);
    onPhoto(square);
  }

  // The quick row shows the first few; one chosen from further down takes the last place, so it's always visible.
  const quick: (typeof AVATARS)[number][] = AVATARS.slice(0, QUICK_AVATARS);
  const picked = AVATARS.find((a) => a.id === chosen);
  if (picked && !quick.includes(picked)) quick[QUICK_AVATARS - 1] = picked;

  return (
    <div className="flex flex-col gap-8 px-5 py-6">
      <section aria-label="Your picture" className="flex flex-col items-center">
        <div className="relative">
          <div key={photo ?? chosen ?? "current"} className="pop-in flex size-28 items-center justify-center overflow-hidden rounded-full">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked photo
              <img src={photo} alt="" className="size-full object-cover" />
            ) : picked ? (
              <AvatarArt id={picked.id} className="size-full" />
            ) : (
              <Avatar name={selfName ?? "?"} seed={selfId} size="profile" />
            )}
          </div>
          <button
            onClick={() => file.current?.click()}
            aria-label="Choose your own photo"
            title="Choose your own photo"
            className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full bg-accent-fill text-white transition-transform hover:scale-110 active:scale-95"
          >
            <CameraIcon size={20} />
          </button>
        </div>
        <p className="mt-4 max-w-xs text-center text-[14px] text-muted">Everyone on this Wi-Fi sees this next to your name.</p>
      </section>

      <section aria-labelledby="avatar-title">
        <div className="flex items-baseline justify-between">
          <h3 id="avatar-title" className="text-[15px] font-medium">
            Pick an avatar
          </h3>
          <button onClick={() => setBrowsing(true)} className="rounded-lg px-2 py-1 text-[13px] font-medium text-chip-on-ink transition-colors hover:bg-hover">
            See all {AVATARS.length}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-labelledby="avatar-title">
          {quick.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={chosen === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => void chooseAvatar(a.id)}
              className={`aspect-square max-w-14 flex-1 rounded-2xl p-1 transition-all duration-300 hover:scale-105 active:scale-95 motion-reduce:transition-none ${chosen === a.id ? "bg-chip-on" : "hover:bg-hover"}`}
            >
              <AvatarArt id={a.id} className="size-full rounded-full" />
            </button>
          ))}
        </div>

        <button
          onClick={() => file.current?.click()}
          className="mt-4 flex w-full items-center gap-3.5 rounded-2xl bg-field px-4 py-3 text-left transition-all hover:bg-hover active:scale-[0.99]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-panel">
            <ImageIcon size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-medium">Use your own photo</span>
            <span className="block text-[13px] text-muted">JPEG or PNG. It’s cropped to a square.</span>
          </span>
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = "";
            if (picked) setCropping(picked);
          }}
        />
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      </section>

      <NameForm selfName={selfName} onRename={onRename} />

      {cropping && <CropSheet file={cropping} onDone={usePhoto} onClose={() => setCropping(undefined)} />}
      {browsing && <AvatarSheet chosen={chosen} onPick={(id) => void chooseAvatar(id)} onClose={() => setBrowsing(false)} />}
    </div>
  );
}

/** Every avatar, to pick from. A centred modal on computers, a bottom sheet on phones. */
function AvatarSheet({ chosen, onPick, onClose }: { chosen?: AvatarId; onPick: (id: AvatarId) => void; onClose: () => void }) {
  return (
    <Sheet labelledBy="avatars-title" onClose={onClose}>
      <h2 id="avatars-title" className="px-6 pb-3 pt-1 text-[20px] font-semibold tracking-tight">
        Pick an avatar
      </h2>
      <div className="grid grid-cols-4 gap-1 px-3 pb-2 sm:grid-cols-5" role="radiogroup" aria-labelledby="avatars-title">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            role="radio"
            aria-checked={chosen === a.id}
            onClick={() => onPick(a.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all duration-200 hover:scale-105 active:scale-95 ${chosen === a.id ? "bg-chip-on" : "hover:bg-hover"}`}
          >
            <AvatarArt id={a.id} className="size-14 rounded-full" />
            <span className="text-[12px] text-muted">{a.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Your display name: what the other devices see next to your messages. */
function NameForm({ selfName, onRename }: { selfName?: string; onRename: (name: string) => void }) {
  // What's typed; until something is, the saved name shows.
  const [typed, setTyped] = useState<string>();
  const [saved, setSaved] = useState(false);
  const value = typed ?? selfName ?? "";
  const trimmed = value.trim();
  const changed = !!trimmed && trimmed !== selfName;
  return (
    <form
      aria-labelledby="name-title"
      className="rounded-3xl bg-field p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed) return;
        onRename(trimmed);
        setTyped(undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }}
    >
      <h3 id="name-title" className="text-[15px] font-medium">
        Display name
      </h3>
      <p className="mt-0.5 text-[13px] text-muted">Shown next to your messages and in the device list.</p>
      <div className="relative mt-4">
        <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <UserIcon size={20} />
        </span>
        <input
          value={value}
          onChange={(e) => {
            setTyped(e.target.value);
            setSaved(false);
          }}
          maxLength={MAX_DEVICE_NAME_LENGTH}
          aria-labelledby="name-title"
          placeholder="Your name"
          className="h-12 w-full rounded-2xl bg-panel pl-11 pr-14 text-[16px] outline-none transition-colors placeholder:text-muted focus:bg-chip-on"
        />
        <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] tabular-nums text-muted">
          {trimmed.length}/{MAX_DEVICE_NAME_LENGTH}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && (
          <span role="status" className="pop-in flex items-center gap-1.5 text-[13px] font-medium text-chip-on-ink">
            <TickIcon /> Saved
          </span>
        )}
        <button type="submit" disabled={!changed} className={FILLED_BUTTON}>
          Save name
        </button>
      </div>
    </form>
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
        className="absolute inset-y-1 left-1 rounded-lg bg-panel transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
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
        className="relative h-6 w-10 shrink-0 rounded-full bg-field transition-colors peer-checked:bg-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
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
        <div className="relative ml-2 w-fit max-w-[80%] rounded-(--bubble-radius) bg-bubble-in px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading)">
          Did the photos come through? 📸
          <span className="float-right mt-2 -mb-1.5 ml-2.5 text-[11px] leading-4 opacity-60">9:41</span>
        </div>
        <div className="relative mt-2 mr-2 w-fit max-w-[80%] self-end rounded-(--bubble-radius) bg-bubble-out px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink">
          All of them, thanks!
          <span className="float-right mt-2 -mb-1.5 ml-2.5 inline-flex items-center gap-1 text-[11px] leading-4">
            <span className="opacity-60">9:42</span>
            <span className="text-[#53bdeb]">
              <DoubleTickIcon />
            </span>
          </span>
        </div>
        <div className="relative mr-2 w-fit max-w-[80%] self-end rounded-(--bubble-radius) bg-bubble-out px-3 pt-2 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink">
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
            className={`flex aspect-square items-center justify-center rounded-full transition ${
              accent === id ? "" : "hover:scale-105"
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
            <span className="block h-14 w-full overflow-hidden rounded-lg">
              <span className={`wallpaper wall-tile wall-${id} block size-full`} />
            </span>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">Only changes how LANDrop looks on this device.</p>
    </section>
  );
}
