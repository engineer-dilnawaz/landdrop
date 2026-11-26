"use client";

import { useSyncExternalStore } from "react";

export type Os = "mac" | "win";

const BASE = "https://github.com/engineer-dilnawaz/landdrop/releases/latest/download/";

/** The installers each release carries, named exactly as the release workflow publishes them. */
export const DOWNLOADS = {
  "mac-arm64": { file: "LANDrop-mac-arm64.dmg", label: "Download for Mac", short: "Mac (Apple silicon)", os: "mac" },
  "mac-x64": { file: "LANDrop-mac-x64.dmg", label: "Download for Mac (Intel)", short: "Mac (Intel)", os: "mac" },
  "win-x64": { file: "LANDrop-win-x64.exe", label: "Download for Windows", short: "Windows", os: "win" },
} as const;

export type DownloadKey = keyof typeof DOWNLOADS;
export const downloadUrl = (key: DownloadKey) => BASE + DOWNLOADS[key].file;

// Browsers hide which chip a Mac has. Chromium will say when asked; elsewhere Apple silicon is the
// common case, and the other installers are always listed beside the recommended one.
let intelMac = false;
let asked = false;
const listeners = new Set<() => void>();

function askArchitecture() {
  if (asked) return;
  asked = true;
  const data = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> } }).userAgentData;
  data?.getHighEntropyValues(["architecture"]).then(
    (values) => {
      if (values.architecture === "x86") {
        intelMac = true;
        listeners.forEach((listener) => listener());
      }
    },
    () => {},
  );
}

function recommended(): DownloadKey {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "win-x64";
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) {
    askArchitecture();
    return intelMac ? "mac-x64" : "mac-arm64";
  }
  return "mac-arm64";
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The installer that fits this computer: Mac (Apple silicon or Intel) or Windows. */
export const useRecommended = (): DownloadKey => useSyncExternalStore(subscribe, recommended, () => "mac-arm64");
