"use client";

import { useEffect, useState } from "react";
import { FILLED_BUTTON, Sheet, TEXT_BUTTON } from "./ui";
import { releasesSince } from "./whats-new";

/** Where an update is, as the host app reports it. */
type UpdateState =
  | { phase: "idle" }
  | { phase: "downloading"; version: string; received: number; total: number }
  | { phase: "ready"; version: string }
  | { phase: "failed"; version: string; message: string };

declare global {
  interface Window {
    /** Present only in the LANDrop app on the host computer, not in a browser. */
    landrop?: {
      notifications?: {
        get(): Promise<{ notifications: boolean; previews: boolean }>;
        set(change: { notifications?: boolean; previews?: boolean }): Promise<{ notifications: boolean; previews: boolean }>;
      };
      update?: {
        get(): Promise<UpdateState | undefined>;
        install(): Promise<void>;
        onState(listener: (state: UpdateState) => void): () => void;
      };
      app?: {
        info(): Promise<{ version: string; previous?: string } | undefined>;
        seen(): Promise<void>;
      };
    };
  }
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** A strip across the top of the window while a new version downloads, and once it's ready to restart into. */
export function UpdateBar() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  useEffect(() => {
    const update = window.landrop?.update;
    if (!update) return;
    void update.get().then((current) => current && setState(current));
    return update.onState(setState);
  }, []);
  if (state.phase !== "downloading" && state.phase !== "ready") return null;

  const downloading = state.phase === "downloading";
  const percent = downloading && state.total ? Math.min(100, Math.round((state.received / state.total) * 100)) : 0;
  return (
    <div role="status" className="page-in flex h-11 shrink-0 items-center gap-3 bg-chip-on px-4 text-[13px] text-chip-on-ink">
      <span className="font-medium">{downloading ? `Downloading LANDrop ${state.version}` : `LANDrop ${state.version} is ready`}</span>
      {downloading ? (
        <>
          <span
            role="progressbar"
            aria-label="Download progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 max-w-sm flex-1 overflow-hidden rounded-full bg-panel"
          >
            <span className="block h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </span>
          <span className="tabular-nums">{state.total ? `${percent}% · ${megabytes(state.received)} of ${megabytes(state.total)}` : megabytes(state.received)}</span>
        </>
      ) : (
        <>
          <span className="flex-1">Restart to finish updating.</span>
          <button onClick={() => void window.landrop?.update?.install()} className={`${FILLED_BUTTON} !px-4 !py-1.5`}>
            Restart to update
          </button>
        </>
      )}
    </div>
  );
}

/** The first launch after an update: what changed, with something to try for each thing. */
export function WhatsNew() {
  const [shown, setShown] = useState<ReturnType<typeof releasesSince>>();
  useEffect(() => {
    void window.landrop?.app?.info().then((info) => {
      if (!info?.previous) return;
      const releases = releasesSince(info.previous, info.version);
      if (releases.length) setShown(releases);
      // Nothing to show for this version: remember it, so the next update compares from here.
      else void window.landrop?.app?.seen();
    });
  }, []);
  if (!shown) return null;
  const close = () => {
    setShown(undefined);
    void window.landrop?.app?.seen();
  };
  return (
    <Sheet labelledBy="whats-new-title" onClose={close} className="md:!max-w-xl">
      <h2 id="whats-new-title" className="px-6 pb-1 pt-1 text-[22px] font-semibold tracking-tight">
        What&rsquo;s new in LANDrop
      </h2>
      <p className="px-6 pb-4 text-[14px] text-muted">LANDrop just updated. Here&rsquo;s what&rsquo;s different, and how to try it.</p>
      <div className="flex flex-col gap-6 px-6 pb-2">
        {shown.map((release) => (
          <section key={release.version} aria-label={`Version ${release.version}`}>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Version {release.version}</h3>
            <ul className="flex flex-col gap-3">
              {release.features.map((feature) => (
                <li key={feature.title} className="rounded-2xl bg-field p-4">
                  <p className="text-[15px] font-medium">{feature.title}</p>
                  <p className="mt-1 text-[14px] text-muted">{feature.description}</p>
                  <p className="mt-2 text-[13px] text-chip-on-ink">
                    <span className="font-semibold">Try it:</span> {feature.tryIt}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="flex justify-end px-5 pt-3">
        <button onClick={close} className={TEXT_BUTTON} autoFocus>
          Got it
        </button>
      </div>
    </Sheet>
  );
}
