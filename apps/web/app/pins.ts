import { useSyncExternalStore } from "react";

/** How many chats can sit at the top of the list. */
export const MAX_PINNED_CHATS = 2;

const CHATS_KEY = "landrop.pinned.chats";

interface Pins {
  /** Chat ids, pinned to the top of the list. */
  chats: string[];
}

const NONE: Pins = { chats: [] };
let pins: Pins | undefined;
const listeners = new Set<() => void>();

function parse<T>(key: string, fallback: T, valid: (value: unknown) => boolean): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

// Pins belong to this device, like the theme: they only change what you see here. The snapshot is
// cached so the same object is handed back until a pin changes, as useSyncExternalStore requires.
function read(): Pins {
  pins ??= {
    chats: parse<string[]>(CHATS_KEY, [], (v) => Array.isArray(v) && v.every((id) => typeof id === "string")).slice(0, MAX_PINNED_CHATS),
  };
  return pins;
}

function write(next: Pins) {
  pins = next;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(next.chats));
  } catch {
    // Private browsing: the pins still apply until reload.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePins = (): Pins => useSyncExternalStore(subscribe, read, () => NONE);

/** Pins a chat to the top; false when two are already pinned. */
export function pinChat(id: string): boolean {
  const current = read();
  if (current.chats.includes(id)) return true;
  if (current.chats.length >= MAX_PINNED_CHATS) return false;
  write({ ...current, chats: [...current.chats, id] });
  return true;
}

export function unpinChat(id: string) {
  const current = read();
  write({ ...current, chats: current.chats.filter((c) => c !== id) });
}
