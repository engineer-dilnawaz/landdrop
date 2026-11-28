"use client";

import { useEffect, useState } from "react";
import { FILLED_BUTTON, InstallIcon, RestartIcon, Sheet, TEXT_BUTTON } from "./ui";
import { releasesSince } from "./whats-new";

/** Where an update is, as the host app reports it. */
type UpdateState =
  | { phase: "idle" }
  | { phase: "available"; version: string }
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
        download(): Promise<void>;
        onState(listener: (state: UpdateState) => void): () => void;
      };
      app?: {
        info(): Promise<{ version: string; previous?: string; system?: string } | undefined>;
        seen(): Promise<void>;
      };
    };
  }
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Dev only: `?update=downloading` or `?update=ready` shows the bar in a browser, where there is no host app. */
function previewState(): UpdateState | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const which = new URLSearchParams(location.search).get("update");
  if (which === "available") return { phase: "available", version: "0.2.5" };
  if (which === "downloading") return { phase: "downloading", version: "0.2.5", received: 56_000_000, total: 133_000_000 };
  if (which === "ready") return { phase: "ready", version: "0.2.5" };
  return undefined;
}

/** A strip across the top of the window while a new version downloads, and once it's ready to restart into. */
export function UpdateBar() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  useEffect(() => {
    const preview = previewState();
    if (preview) return setState(preview);
    const update = window.landrop?.update;
    if (!update) return;
    void update.get().then((current) => current && setState(current));
    return update.onState(setState);
  }, []);
  if (state.phase !== "available" && state.phase !== "downloading" && state.phase !== "ready") return null;

  const available = state.phase === "available";
  const downloading = state.phase === "downloading";
  const ready = state.phase === "ready";
  const percent = downloading && state.total ? Math.min(100, Math.round((state.received / state.total) * 100)) : 0;
  const BUTTON = `${FILLED_BUTTON} flex items-center gap-1.5 !px-3.5 !py-1.5`;
  return (
    <div role="status" className="page-in mx-3 mt-[max(0.75rem,env(safe-area-inset-top))] mb-1 shrink-0 rounded-2xl bg-chip-on px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span aria-hidden className={`relative flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-fill text-white `}>
          {available && <span className="update-ripple absolute inset-0 rounded-full bg-accent-fill" />}
          <span className={`relative ${downloading ? "update-bob" : ""}`}>
            <InstallIcon size={20} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-5">
            {available ? `LANDrop ${state.version} is available` : downloading ? `Downloading LANDrop ${state.version}` : `LANDrop ${state.version} is ready`}
          </p>
          <p className="truncate text-[12px] leading-4 tabular-nums text-chip-on-ink">
            {available
              ? "Download it here, then restart into it"
              : downloading
                ? state.total
                  ? `${percent}% · ${megabytes(state.received)} of ${megabytes(state.total)}`
                  : megabytes(state.received)
                : "Restart to finish updating"}
          </p>
        </div>
        {available && (
          <button onClick={() => void window.landrop?.update?.download()} className={BUTTON}>
            <InstallIcon size={16} />
            Update
          </button>
        )}
        {ready && (
          <button onClick={() => void window.landrop?.update?.install()} className={BUTTON}>
            <RestartIcon size={16} />
            Restart
          </button>
        )}
      </div>
      {downloading && (
        <div
          role="progressbar"
          aria-label="Download progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-accent-fill/25"
        >
          <div className="update-fill h-full rounded-full bg-accent-fill transition-[width] duration-300 ease-linear" style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
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
