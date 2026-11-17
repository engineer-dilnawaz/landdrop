"use client";

import { useSyncExternalStore } from "react";
import { Avatar, LockIcon, Logo } from "./ui";

const ACCENT_KEY = "landrop.accent";
export type Accent = "green" | "blue";

// The choice is a class on <html>, set before first paint by the script in layout.tsx.
const accentListeners = new Set<() => void>();
const readAccent = (): Accent => (document.documentElement.classList.contains("accent-blue") ? "blue" : "green");

function setAccent(accent: Accent) {
  document.documentElement.classList.toggle("accent-blue", accent === "blue");
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // Private browsing: the colour still applies until reload.
  }
  accentListeners.forEach((listener) => listener());
}

function useAccent(): Accent {
  return useSyncExternalStore(
    (listener) => {
      accentListeners.add(listener);
      return () => accentListeners.delete(listener);
    },
    readAccent,
    () => "green",
  );
}

/** WhatsApp-style settings, shown in the list column. Sections get added here as features land. */
export function Settings({ selfName, selfId, onRename }: { selfName?: string; selfId?: string; onRename: () => void }) {
  const accent = useAccent();
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
