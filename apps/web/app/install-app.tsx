"use client";

import { useState, useSyncExternalStore } from "react";
import { CloseIcon, FILLED_BUTTON, Logo, Sheet, ShareIcon, TEXT_BUTTON } from "./ui";

/** Chrome's own "install" offer; it only exists once the browser decides the page can be installed. */
type InstallOffer = Event & { prompt(): Promise<void> };

const DISMISSED_KEY = "landrop.install-dismissed";
let offer: InstallOffer | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    offer = e as InstallOffer;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    offer = undefined;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Where installing makes sense: a phone's browser that isn't already running LANDrop as an app. */
type Kind = "none" | "ios" | "android" | "android-ready";

function read(): Kind {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  if (!ios && !android) return "none";
  const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  if (installed) return "none";
  return ios ? "ios" : offer ? "android-ready" : "android";
}

function dismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** What the install button does, and the steps sheet for browsers that can't install with one tap. */
export function useInstallApp() {
  const kind = useSyncExternalStore(subscribe, read, (): Kind => "none");
  const [steps, setSteps] = useState(false);
  const [hidden, setHidden] = useState(dismissed);
  return {
    kind,
    /** The banner is offered until it's dismissed; the Settings row stays. */
    banner: kind !== "none" && !hidden,
    dismiss() {
      setHidden(true);
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // Private browsing: it simply asks again next time.
      }
    },
    install() {
      if (offer) void offer.prompt();
      else setSteps(true);
    },
    sheet: steps ? <InstallSteps ios={kind === "ios"} onClose={() => setSteps(false)} /> : null,
  };
}

/** A card at the top of the chat list: add LANDrop to the home screen. Phones only. */
export function InstallBanner({ install, onDismiss }: { install: () => void; onDismiss: () => void }) {
  return (
    <div className="page-in mx-3 mb-3 flex items-center gap-3 rounded-xl bg-chip-on p-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-panel text-accent">
        <Logo size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-5">Install LANDrop</p>
        <p className="text-[13px] leading-5 text-chip-on-ink">Open it from your home screen, like an app.</p>
      </div>
      <button onClick={install} className={`${FILLED_BUTTON} !px-4 !py-2`}>
        Install
      </button>
      <button onClick={onDismiss} aria-label="Not now" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-chip-on-ink hover:bg-hover">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

function InstallSteps({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  const steps = ios
    ? [
        <>
          Tap the <ShareIcon size={18} /> Share button in Safari&rsquo;s toolbar.
        </>,
        <>Scroll down and choose &ldquo;Add to Home Screen&rdquo;.</>,
        <>Tap Add. LANDrop appears with the other apps.</>,
      ]
    : [
        <>Tap the &#8942; menu at the top right of Chrome.</>,
        <>Choose &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</>,
        <>Confirm. LANDrop appears with the other apps.</>,
      ];
  return (
    <Sheet labelledBy="install-title" onClose={onClose}>
      <h2 id="install-title" className="px-6 pb-1 pt-1 text-[20px] font-semibold tracking-tight">
        Install LANDrop
      </h2>
      <p className="px-6 pb-3 text-[14px] text-muted">It opens full screen, with no browser bars.</p>
      <ol className="flex flex-col gap-3 px-6 pb-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px]">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chip-on text-[13px] font-semibold text-chip-on-ink">{i + 1}</span>
            <span className="inline-flex flex-wrap items-center gap-1.5 pt-px">{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex justify-end px-5 pt-2">
        <button onClick={onClose} className={TEXT_BUTTON} autoFocus>
          Got it
        </button>
      </div>
    </Sheet>
  );
}
