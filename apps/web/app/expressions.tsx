"use client";

import { useEffect, useRef, useState } from "react";

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_KEY;
/** GIF search is only offered when this build has a Giphy key. */
export const hasGifSearch = !!GIPHY_KEY;

type Tab = "emoji" | "gif";

/** WhatsApp's emoji and GIF panel, opened from the smiley in the message field. */
export function ExpressionPanel({
  onEmoji,
  onGif,
  onError,
}: {
  onEmoji: (emoji: string) => void;
  onGif: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("emoji");
  return (
    <div className="flex h-[min(340px,45dvh)] flex-col overflow-hidden rounded-lg bg-panel md:mx-24">
      <div className="min-h-0 flex-1">{tab === "emoji" ? <EmojiTab onEmoji={onEmoji} /> : <GifTab onGif={onGif} onError={onError} />}</div>
      {hasGifSearch && (
        <div role="tablist" aria-label="Emoji or GIF" className="flex justify-center gap-1 border-t border-divider py-1.5">
          {(["emoji", "gif"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1 text-[13px] font-medium ${tab === t ? "bg-accent/15 text-accent" : "text-muted hover:bg-hover"}`}
            >
              {t === "emoji" ? "Emoji" : "GIF"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "#00a884" → "0, 168, 132", the form the emoji picker's colours take. */
function rgb(hex: string): string | undefined {
  const m = hex.trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? m.slice(1).map((h) => parseInt(h, 16)).join(", ") : undefined;
}

/** The emoji picker. Its emoji list is part of the app, so it works without internet. */
function EmojiTab({ onEmoji }: { onEmoji: (emoji: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const pick = useRef(onEmoji);
  useEffect(() => {
    pick.current = onEmoji;
  });

  useEffect(() => {
    let cancelled = false;
    // Loaded the first time the panel opens, so the emoji list doesn't slow down opening LANDrop.
    void Promise.all([import("emoji-mart"), import("@emoji-mart/data")]).then(([{ Picker }, { default: data }]) => {
      if (cancelled || !host.current) return;
      const style = getComputedStyle(document.documentElement);
      const picker = new Picker({
        data,
        onEmojiSelect: (emoji: { native: string }) => pick.current(emoji.native),
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        set: "native",
        dynamicWidth: true,
        previewPosition: "none",
        skinTonePosition: "search",
        navPosition: "top",
        maxFrequentRows: 2,
      }) as unknown as HTMLElement;
      // Match the app: its accent colour and the panel behind it.
      const accent = rgb(style.getPropertyValue("--accent"));
      const background = rgb(style.getPropertyValue("--panel"));
      if (accent) picker.style.setProperty("--rgb-accent", accent);
      if (background) picker.style.setProperty("--rgb-background", background);
      picker.style.setProperty("--shadow", "none");
      picker.style.setProperty("--border-radius", "0");
      picker.style.width = "100%";
      picker.style.height = "100%";
      host.current.replaceChildren(picker);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={host} className="size-full [&>em-emoji-picker]:h-full" aria-label="Emoji" />;
}

interface Gif {
  id: string;
  title: string;
  images: {
    fixed_width: { webp?: string; url: string; width: string; height: string };
    downsized_medium?: { url: string; size?: string };
    original: { url: string; size?: string };
  };
}

/** Giphy's search, with what's trending before anything is typed. */
function GifTab({ onGif, onError }: { onGif: (file: File) => void; onError: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>();
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    // Wait for a pause in typing; the free key allows 100 searches an hour.
    const timer = setTimeout(
      () => {
        const q = query.trim();
        const params = new URLSearchParams({ api_key: GIPHY_KEY!, limit: "30", rating: "pg-13", ...(q && { q }) });
        fetch(`https://api.giphy.com/v1/gifs/${q ? "search" : "trending"}?${params}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((body: { data: Gif[] }) => {
            setGifs(body.data);
            setFailed(false);
          })
          .catch((err: Error) => err.name !== "AbortError" && setFailed(true));
      },
      query ? 350 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function send(gif: Gif) {
    setSending(gif.id);
    try {
      // The GIF itself is sent, not a link, so everyone gets it even without internet.
      const source = gif.images.downsized_medium?.url ?? gif.images.original.url;
      const blob = await fetch(source).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))));
      const name = `${(gif.title.replace(/\s+GIF.*$/i, "").replace(/[\\/:*?"<>|]/g, "").trim() || "GIF").slice(0, 80)}.gif`;
      onGif(new File([blob], name, { type: "image/gif" }));
    } catch {
      onError("Couldn't get that GIF from Giphy. Check this device's internet connection.");
    } finally {
      setSending(undefined);
    }
  }

  return (
    <div className="flex size-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs via GIPHY"
          aria-label="Search GIFs"
          className="w-full rounded-lg bg-field px-3 py-2 text-[14px] outline-none placeholder:text-muted select-text [-webkit-user-select:text]"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {failed ? (
          <p className="py-10 text-center text-[14px] text-muted">GIFs need an internet connection on this device. Emoji work without one.</p>
        ) : gifs === undefined ? (
          <p className="py-10 text-center text-[14px] text-muted">Loading GIFs…</p>
        ) : gifs.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-muted">No GIFs found for “{query.trim()}”.</p>
        ) : (
          <ul className="columns-2 gap-1.5 sm:columns-3 md:columns-4" aria-label="GIFs">
            {gifs.map((gif) => {
              const still = gif.images.fixed_width;
              return (
                <li key={gif.id} className="mb-1.5 break-inside-avoid">
                  <button
                    onClick={() => void send(gif)}
                    disabled={!!sending}
                    aria-label={`Send ${gif.title || "GIF"}`}
                    className="relative block w-full overflow-hidden rounded-md bg-field disabled:cursor-wait"
                    style={{ aspectRatio: `${still.width} / ${still.height}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Giphy's own animated previews */}
                    <img src={still.webp ?? still.url} alt="" loading="lazy" className="size-full object-cover" />
                    {sending === gif.id && <span className="absolute inset-0 animate-pulse bg-black/40" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Giphy's terms ask for this attribution wherever its search is shown. */}
      <p className="pb-1 text-center text-[10px] font-semibold tracking-wide text-muted">Powered by GIPHY</p>
    </div>
  );
}
