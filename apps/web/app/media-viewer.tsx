"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BackIcon, CloseIcon, PlayIcon, SaveIcon, useEscape } from "./ui";

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
/** How far a swipe has to travel before it moves to the next photo. */
const SWIPE_PX = 60;

interface Zoom {
  scale: number;
  x: number;
  y: number;
}
const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };

/** One photo or video to show: from a chat, or from inside a shared folder. */
export interface MediaItem {
  id: string;
  name: string;
  kind: "image" | "video";
  src: string;
  download: string;
  /** The header line: who sent it and when, or where it is in a folder. */
  title: string;
}

/**
 * A chat's photos and videos full screen, like WhatsApp: swipe, arrow keys or the side buttons move
 * between them, double-tap, pinch or scroll to zoom a photo and drag to look around it.
 */
export function MediaViewer({
  items,
  startId,
  onClose,
}: {
  /** The photos and videos to move between, in order. */
  items: MediaItem[];
  startId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((m) => m.id === startId)));
  const [dx, setDx] = useState(0);
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; zoom: Zoom; distance?: number; moved: boolean }>(undefined);
  const lastTap = useRef(0);
  useEscape(onClose);

  const current = items[index];
  const go = (next: number) => {
    if (next < 0 || next >= items.length) return;
    setIndex(next);
    setZoom(NO_ZOOM);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    strip.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  // A message deleted while it's open closes the viewer.
  useEffect(() => {
    if (!current) onClose();
  }, [current, onClose]);
  if (!current) return null;
  const isVideo = current.kind === "video";

  /** Keeps a zoomed photo from being dragged off the screen. */
  const clamp = (z: Zoom): Zoom => {
    const scale = Math.min(MAX_ZOOM, Math.max(1, z.scale));
    // The photo's own size before zooming: it can be dragged until its edge meets the screen's edge.
    const photo = stage.current?.firstElementChild?.children[index]?.querySelector("img");
    const box = stage.current?.getBoundingClientRect();
    const maxX = photo && box ? Math.max(0, (photo.offsetWidth * scale - box.width) / 2) : 0;
    const maxY = photo && box ? Math.max(0, (photo.offsetHeight * scale - box.height) / 2) : 0;
    return { scale, x: Math.max(-maxX, Math.min(maxX, z.x)), y: Math.max(-maxY, Math.min(maxY, z.y)) };
  };

  /** Zooms in on the point tapped, or back out. */
  const toggleZoom = (clientX: number, clientY: number) => {
    if (isVideo) return;
    if (zoom.scale > 1) return setZoom(NO_ZOOM);
    const box = stage.current!.getBoundingClientRect();
    const px = clientX - box.left - box.width / 2;
    const py = clientY - box.top - box.height / 2;
    setZoom(clamp({ scale: DOUBLE_TAP_ZOOM, x: -px * (DOUBLE_TAP_ZOOM - 1), y: -py * (DOUBLE_TAP_ZOOM - 1) }));
  };

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      // Buttons keep their clicks, and the video's own controls along the bottom stay with the video.
      if ((e.target as Element).closest("button")) return;
      if (e.target instanceof HTMLVideoElement && e.clientY > e.target.getBoundingClientRect().bottom - 56) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        zoom,
        distance: pointers.current.size === 2 && !isVideo ? distance() : undefined,
        moved: false,
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || !pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const mx = e.clientX - d.x;
      const my = e.clientY - d.y;
      if (Math.abs(mx) > 6 || Math.abs(my) > 6) d.moved = true;
      if (d.distance && pointers.current.size === 2) {
        setZoom(clamp({ ...d.zoom, scale: (d.zoom.scale * distance()) / d.distance }));
      } else if (d.zoom.scale > 1) {
        setZoom(clamp({ ...d.zoom, x: d.zoom.x + mx, y: d.zoom.y + my }));
      } else if (!d.distance) {
        // Resist at either end, like a phone's photo viewer.
        const atEnd = (mx > 0 && index === 0) || (mx < 0 && index === items.length - 1);
        setDx(atEnd ? mx / 3 : mx);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      const d = drag.current;
      if (!d || pointers.current.size > 0) return;
      drag.current = undefined;
      setDragging(false);
      if (d.zoom.scale === 1 && !d.distance) {
        if (dx <= -SWIPE_PX) go(index + 1);
        else if (dx >= SWIPE_PX) go(index - 1);
      }
      setDx(0);
      if (!d.moved && e.pointerType !== "mouse") {
        // Double-tap on touch screens; mice use the dblclick event below.
        const now = Date.now();
        if (now - lastTap.current < 300) toggleZoom(e.clientX, e.clientY);
        lastTap.current = now;
      }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      drag.current = undefined;
      setDragging(false);
      setDx(0);
    },
    onDoubleClick: (e: React.MouseEvent) => toggleZoom(e.clientX, e.clientY),
    onWheel: (e: React.WheelEvent) => {
      if (isVideo) return;
      setZoom((z) => {
        const next = clamp({ ...z, scale: z.scale * Math.exp(-e.deltaY * 0.002) });
        return next.scale === 1 ? NO_ZOOM : next;
      });
    },
  };

  const a = current;
  const { download } = current;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={a.name} className="fixed inset-0 z-50 flex flex-col bg-[#0b141a] text-[#e9edef]">
      <div className="flex items-center gap-2 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-4">
        <button onClick={onClose} className={`${BUTTON} md:hidden`} aria-label="Back">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-[16px]">{current.title}</p>
          <p className="truncate text-[13px] text-[#8696a0]">
            {items.length > 1 && `${index + 1} of ${items.length} · `}
            {a.name}
          </p>
        </div>
        <a href={download} download={a.name} className={BUTTON} aria-label={`Save ${a.name}`} title="Save">
          <SaveIcon size={22} />
        </a>
        <button onClick={onClose} className={`${BUTTON} hidden md:flex`} autoFocus aria-label="Close" title="Close">
          <CloseIcon />
        </button>
      </div>

      <div ref={stage} className="relative min-h-0 flex-1 touch-none overflow-hidden select-none" {...handlers}>
        <div
          className={`flex h-full ${dx === 0 ? "transition-transform duration-300 ease-out motion-reduce:transition-none" : ""}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dx}px))` }}
        >
          {items.map((m, i) => (
            <div key={m.id} className="flex h-full w-full shrink-0 items-center justify-center p-2 md:p-6">
              {/* Only the photos either side of this one are loaded, so long chats stay quick. */}
              {Math.abs(i - index) <= 1 && (
                <Slide
                  item={m}
                  src={m.src}
                  active={i === index}
                  zoom={i === index ? zoom : NO_ZOOM}
                  dragging={dragging}
                />
              )}
            </div>
          ))}
        </div>
        {index > 0 && (
          <button onClick={() => go(index - 1)} className={`${SIDE_BUTTON} left-4`} aria-label="Previous">
            <span className="rotate-180">
              <Arrow />
            </span>
          </button>
        )}
        {index < items.length - 1 && (
          <button onClick={() => go(index + 1)} className={`${SIDE_BUTTON} right-4`} aria-label="Next">
            <Arrow />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div
          ref={strip}
          className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] md:justify-center"
          aria-label="All photos and videos"
        >
          {items.map((m, i) => (
            <button
              key={m.id}
              onClick={() => go(i)}
              aria-label={`${i + 1} of ${items.length}`}
              aria-current={i === index}
              className={`relative size-12 shrink-0 overflow-hidden rounded-md transition ${
                i === index ? "ring-2 ring-accent" : "opacity-55 hover:opacity-90"
              }`}
            >
              {m.kind === "video" ? (
                <>
                  <video src={`${m.src}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                    <PlayIcon size={16} />
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host
                <img src={m.src} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
      {items.length <= 1 && <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />}
    </div>,
    document.body,
  );
}

function Slide({ item, src, active, zoom, dragging }: { item: MediaItem; src: string; active: boolean; zoom: Zoom; dragging: boolean }) {
  const a = item;
  if (a.kind === "video") {
    // Plays only while it's the one on screen; swiping away pauses it.
    return active ? (
      <video src={src} controls autoPlay playsInline className="max-h-full max-w-full" />
    ) : (
      <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="max-h-full max-w-full" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next
    <img
      src={src}
      alt={a.name}
      draggable={false}
      className={`max-h-full max-w-full object-contain ${zoom.scale > 1 ? "cursor-grab" : "cursor-zoom-in"} ${
        dragging ? "" : "transition-transform duration-200 ease-out"
      }`}
      style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }}
    />
  );
}

const BUTTON = "flex size-10 shrink-0 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10";
const SIDE_BUTTON =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 md:flex";

const Arrow = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
