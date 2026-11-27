import { useSyncExternalStore } from "react";

/** What the chat everyone on the Wi-Fi shares is called until someone names it. */
export const DEFAULT_LOUNGE_NAME = "Wi-Fi Lounge";
export const MAX_LOUNGE_NAME = 40;

const KEY = "landrop.lounge.name";
const listeners = new Set<() => void>();
let name: string | undefined;

// Like the theme, the name belongs to this device: it changes what you see here, not what others see.
function read(): string {
  if (name === undefined) {
    try {
      name = localStorage.getItem(KEY)?.trim().slice(0, MAX_LOUNGE_NAME) || DEFAULT_LOUNGE_NAME;
    } catch {
      name = DEFAULT_LOUNGE_NAME;
    }
  }
  return name;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The shared chat's name on this device. */
export const useLoungeName = (): string => useSyncExternalStore(subscribe, read, () => DEFAULT_LOUNGE_NAME);

/** Names the shared chat; an empty name puts the default back. */
export function setLoungeName(next: string) {
  const trimmed = next.trim().slice(0, MAX_LOUNGE_NAME);
  name = trimmed || DEFAULT_LOUNGE_NAME;
  try {
    if (trimmed && trimmed !== DEFAULT_LOUNGE_NAME) localStorage.setItem(KEY, trimmed);
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing: the name still applies until reload.
  }
  listeners.forEach((listener) => listener());
}
