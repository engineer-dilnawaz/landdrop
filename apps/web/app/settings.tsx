"use client";

import { useSyncExternalStore } from "react";
import { Avatar, LockIcon, Logo } from "./ui";

export type Accent = "green" | "blue";
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

const readAccent = (): Accent => (document.documentElement.classList.contains("accent-blue") ? "blue" : "green");
function setAccent(accent: Accent) {
  document.documentElement.classList.toggle("accent-blue", accent === "blue");
  save("landrop.accent", accent);
  changed();
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

const useAccent = () => useSyncExternalStore(subscribe, readAccent, (): Accent => "green");
const useTheme = () => useSyncExternalStore(subscribe, readTheme, (): Theme => "system");

/** WhatsApp-style settings, shown in the list column. Sections get added here as features land. */
export function Settings({ selfName, selfId, onRename }: { selfName?: string; selfId?: string; onRename: () => void }) {
  const accent = useAccent();
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
          <div className="relative mt-3 grid grid-cols-3 rounded-xl bg-field p-1" role="radiogroup" aria-labelledby="theme-title">
            {/* The highlight slides to the chosen option. */}
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-panel shadow-[0_1px_2px_rgba(11,20,26,.15)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
              style={{ transform: `translateX(${THEMES.findIndex(([id]) => id === theme) * 100}%)` }}
            />
            {THEMES.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={`relative rounded-lg py-2 text-[15px] transition-colors duration-300 ${
                  theme === id ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">System follows this device’s light or dark setting.</p>
        </section>

        <section aria-labelledby="accent-title" className="border-t border-divider px-5 py-5">
          <h2 id="accent-title" className="text-[15px] text-muted">
            Chat colour
          </h2>
          <div className="mt-3 flex gap-3" role="radiogroup" aria-labelledby="accent-title">
            {(
              [
                ["green", "Green", "#00a884"],
                ["blue", "Blue", "#1f6bff"],
              ] as const
            ).map(([id, label, swatch]) => (
              <button
                key={id}
                role="radio"
                aria-checked={accent === id}
                onClick={() => setAccent(id)}
                className={`flex flex-1 items-center gap-3 rounded-xl border-2 px-4 py-3 text-[15px] ${
                  accent === id ? "border-accent" : "border-divider hover:bg-hover"
                }`}
              >
                <span className="size-6 rounded-full" style={{ background: swatch }} />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">Only changes how LANDrop looks on this device.</p>
        </section>

        <section className="flex flex-col items-center gap-2 border-t border-divider px-8 py-8 text-center">
          <span className="text-accent">
            <Logo size={48} />
          </span>
          <p className="text-[15px]">LANDrop</p>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <LockIcon />
            Messages and files stay on this Wi-Fi.
          </p>
        </section>
      </div>
    </div>
  );
}
