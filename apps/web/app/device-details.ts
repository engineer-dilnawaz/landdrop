import type { FeedbackDevice } from "@landrop/protocol";
import { guessDeviceName } from "./device-name";

const version = (ua: string, pattern: RegExp) => ua.match(pattern)?.[1]?.replace(/_/g, ".");

/**
 * What this device tells every website anyway, in plain words: the kind of device, its system, the browser, the screen size
 * and the language. It is shown to the person before they send feedback, and nothing else about the device goes with it.
 * `hostSystem` is set inside the LANDrop app on the host computer, which knows its own system exactly.
 */
export function deviceDetails(hostSystem?: string): FeedbackDevice {
  const ua = navigator.userAgent;
  const kind = guessDeviceName(ua, navigator.maxTouchPoints).split(" · ")[0];
  const os = hostSystem
    ? hostSystem
    : /iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? // Safari's own version is the iPhone's version; the "OS 18_7" in the user agent stopped moving, so it can be years behind.
        `${/iPad/.test(ua) ? "iPadOS" : "iOS"} ${version(ua, /Version\/(\d+(?:\.\d+)?)/) ?? version(ua, /OS (\d+[_.]\d+)/) ?? ""}`.trim()
      : /Android/.test(ua)
        ? // Chrome and Samsung Internet always say "Android 10", so only Firefox's number is real.
          /Firefox\//.test(ua)
          ? `Android ${version(ua, /Android (\d+(?:\.\d+)?)/) ?? ""}`.trim()
          : undefined // "Android phone" already says it, and the number is unknown
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "macOS"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : undefined;
  const browser = hostSystem
    ? "LANDrop app"
    : /Edg(?:e|A|iOS)?\//.test(ua)
      ? `Edge ${version(ua, /Edg(?:e|A|iOS)?\/(\d+)/) ?? ""}`
      : /SamsungBrowser/.test(ua)
        ? `Samsung Internet ${version(ua, /SamsungBrowser\/(\d+)/) ?? ""}`
        : /OPR\/|OPT\//.test(ua)
          ? `Opera ${version(ua, /OP[RT]\/(\d+)/) ?? ""}`
          : /Firefox\/|FxiOS/.test(ua)
            ? `Firefox ${version(ua, /(?:Firefox|FxiOS)\/(\d+)/) ?? ""}`
            : /Chrome\/|CriOS/.test(ua)
              ? `Chrome ${version(ua, /(?:Chrome|CriOS)\/(\d+)/) ?? ""}`
              : /Safari\//.test(ua)
                ? `Safari ${version(ua, /Version\/(\d+(?:\.\d+)?)/) ?? ""}`
                : undefined;
  return {
    device: kind === "Device" ? undefined : kind,
    os,
    browser: browser?.trim(),
    screen: `${screen.width}×${screen.height}`,
    language: navigator.language,
  };
}

/** The same details as short lines for the preview, skipping any the browser did not give. */
export function deviceLines(details: FeedbackDevice): { label: string; value: string }[] {
  return [
    { label: "Device", value: details.device },
    { label: "System", value: details.os },
    { label: "Browser", value: details.browser },
    { label: "Screen", value: details.screen },
    { label: "Language", value: details.language },
  ].filter((l): l is { label: string; value: string } => Boolean(l.value));
}
