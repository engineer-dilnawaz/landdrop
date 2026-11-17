"use client";

import { useSyncExternalStore } from "react";
import { Avatar, DoubleTickIcon, TickIcon } from "./ui";

export type Theme = "system" | "light" | "dark";

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
  shape: ["rounded", "round", "sharp"],
  tail: ["on", "off"],
  wall: ["doodles", "plain", "sky", "mint", "blush", "dusk"],
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
export function Settings({ selfName, selfId, onRename }: { selfName?: string; selfId?: string; onRename: () => void }) {
  const theme = useTheme();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center px-5 pt-[env(safe-area-inset-top)] box-content md:box-border md:pt-0">
        <h1 className="text-[22px] font-bold">Settings</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <button onClick={onRename} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-hover">
          <Avatar name={selfName ?? "?"} seed={selfId} size="profile" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px]">{selfName ?? "Joining…"}</span>
            <span className="block text-[14px] text-muted">Tap to change your name</span>
          </span>
        </button>

        <section aria-labelledby="theme-title" className="border-t border-divider px-5 py-5">
          <h2 id="theme-title" className="text-[15px] text-muted">
            Theme
          </h2>
          <Segmented label="theme-title" options={THEMES} value={theme} onChange={setTheme} />
          <p className="mt-2 text-[13px] text-muted">System follows this device’s light or dark setting.</p>
        </section>

        <ChatLooks />
      </div>
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
  ["doodles", "Doodles"],
  ["plain", "Plain"],
  ["sky", "Sky"],
  ["mint", "Mint"],
  ["blush", "Blush"],
  ["dusk", "Dusk"],
];

/** WhatsApp's chat settings: how bubbles and the chat background look, with a preview. */
function ChatLooks() {
  const [accent, setAccent] = useLook("accent");
  const [text, setText] = useLook("text");
  const [shape, setShape] = useLook("shape");
  const [tail, setTail] = useLook("tail");
  const [wall, setWall] = useLook("wall");
  return (
    <section aria-labelledby="chats-title" className="border-t border-divider px-5 py-5">
      <h2 id="chats-title" className="text-[15px] text-muted">
        Chats
      </h2>

      {/* The real bubble and wallpaper styles, so the preview is exactly what chats will look like. */}
      <div aria-hidden className="wallpaper mt-3 flex flex-col gap-1 overflow-hidden rounded-xl px-4 py-4">
        <div className="tail-in relative w-fit max-w-[80%] rounded-(--bubble-radius) rounded-tl-none bg-bubble-in px-[9px] pt-1.5 pb-2 text-(length:--chat-text) leading-(--chat-leading) shadow-[0_1px_.5px_rgba(11,20,26,.13)] ml-2">
          Did the photos come through? 📸
          <span className="float-right mt-2 -mb-1.5 ml-2.5 text-[11px] leading-4 opacity-60">9:41</span>
        </div>
        <div className="tail-out relative mt-2 w-fit max-w-[80%] self-end rounded-(--bubble-radius) rounded-tr-none bg-bubble-out px-[9px] pt-1.5 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink shadow-[0_1px_.5px_rgba(11,20,26,.13)] mr-2">
          All of them, thanks!
          <span className="float-right mt-2 -mb-1.5 ml-2.5 inline-flex items-center gap-1 text-[11px] leading-4">
            <span className="opacity-60">9:42</span>
            <span className="text-[#53bdeb]">
              <DoubleTickIcon />
            </span>
          </span>
        </div>
        <div className="relative w-fit max-w-[80%] self-end rounded-(--bubble-radius) bg-bubble-out px-[9px] pt-1.5 pb-2 text-(length:--chat-text) leading-(--chat-leading) text-bubble-out-ink shadow-[0_1px_.5px_rgba(11,20,26,.13)] mr-2">
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

      <h3 id="shape-title" className="mt-5 text-[14px] text-muted">
        Bubble shape
      </h3>
      <Segmented
        label="shape-title"
        options={[
          ["rounded", "Rounded"],
          ["round", "Round"],
          ["sharp", "Sharp"],
        ]}
        value={shape}
        onChange={setShape}
      />
      <label className="relative mt-3 flex cursor-pointer items-center justify-between gap-4 py-1 text-[15px]">
        Tail on the first bubble
        <input
          type="checkbox"
          role="switch"
          checked={tail === "on"}
          onChange={(e) => setTail(e.target.checked ? "on" : "off")}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-field transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
        />
      </label>

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
