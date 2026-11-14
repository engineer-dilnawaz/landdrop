"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

const SIDEBAR_KEY = "landrop.sidebar";
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 360;
/** Wide enough for the 48px avatars, so a collapsed list still shows who's who. */
export const RAIL_WIDTH = 80;

interface Layout {
  pinned: boolean;
  width: number;
}

const DEFAULT_LAYOUT: Layout = { pinned: true, width: DEFAULT_WIDTH };
const clampWidth = (width: number) => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

// The layout lives in localStorage, read through useSyncExternalStore so the server render
// (which can't see it) and the first client render agree, then the saved layout takes over.
let layout: Layout | undefined;
const listeners = new Set<() => void>();

function readLayout(): Layout {
  if (layout) return layout;
  try {
    const stored = JSON.parse(localStorage.getItem(SIDEBAR_KEY) ?? "null") as Partial<Layout> | null;
    layout = {
      pinned: typeof stored?.pinned === "boolean" ? stored.pinned : DEFAULT_LAYOUT.pinned,
      width: typeof stored?.width === "number" ? clampWidth(stored.width) : DEFAULT_LAYOUT.width,
    };
  } catch {
    layout = DEFAULT_LAYOUT;
  }
  return layout;
}

function setLayout(next: Layout, persist = true) {
  layout = next;
  if (persist) {
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next));
    } catch {
      // Private browsing: the layout still applies until reload.
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The chat list column on wider screens: pinned beside the chat, or collapsed to a rail of
 * avatars that slides open over the chat while hovered. Its right edge drags to resize.
 * On phones it is the whole screen and none of this applies.
 */
export function Sidebar({
  hidden,
  children,
}: {
  /** Phone only: hidden while a chat is open. */
  hidden: boolean;
  children: (sidebar: { compact: boolean; pinned: boolean; togglePinned: () => void }) => ReactNode;
}) {
  const { pinned, width } = useSyncExternalStore(subscribe, readLayout, () => DEFAULT_LAYOUT);
  const [peeking, setPeeking] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const resizing = useRef(false);
  const open = pinned || peeking;

  function togglePinned() {
    setLayout({ pinned: !pinned, width });
    // Unpinning with the pointer on the list would otherwise leave it open until the pointer moves.
    setPeeking(false);
  }

  function resizeTo(next: number, persist: boolean) {
    setLayout({ pinned, width: clampWidth(next) }, persist);
  }

  return (
    <aside
      ref={asideRef}
      style={{ "--list-w": `${width}px`, "--rail-w": `${RAIL_WIDTH}px` } as CSSProperties}
      className={`${hidden ? "hidden md:flex" : "flex"} relative w-full flex-col md:shrink-0 ${
        pinned ? "md:w-(--list-w)" : "md:w-(--rail-w)"
      }`}
      onMouseEnter={() => setPeeking(true)}
      onMouseLeave={() => !resizing.current && setPeeking(false)}
      // Keyboard users open the collapsed list by tabbing into it.
      onFocus={() => setPeeking(true)}
      onBlur={(e) => {
        if (!asideRef.current?.contains(e.relatedTarget as Node | null) && !asideRef.current?.matches(":hover")) {
          setPeeking(false);
        }
      }}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col bg-background md:border-r md:border-separator ${
          pinned
            ? ""
            : `md:absolute md:inset-y-0 md:left-0 md:z-30 md:overflow-hidden md:transition-[width] md:duration-200 ${
                peeking ? "md:w-(--list-w) md:shadow-2xl" : "md:w-(--rail-w)"
              }`
        }`}
      >
        {/* Laid out at full width even while clipped to the rail, so nothing reflows as it slides open. */}
        <div className="flex min-h-0 flex-1 flex-col md:w-(--list-w)">
          {children({ compact: !open, pinned, togglePinned })}
        </div>
        {open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat list"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            aria-valuenow={width}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            className="absolute inset-y-0 right-0 z-10 hidden w-1.5 translate-x-1/2 cursor-col-resize outline-none hover:bg-ios-blue/40 focus-visible:bg-ios-blue/60 md:block"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              resizing.current = true;
            }}
            onPointerMove={(e) => {
              if (!resizing.current) return;
              const left = asideRef.current?.getBoundingClientRect().left ?? 0;
              resizeTo(e.clientX - left, false);
            }}
            onPointerUp={() => {
              if (!resizing.current) return;
              resizing.current = false;
              resizeTo(width, true);
              if (!asideRef.current?.matches(":hover")) setPeeking(false);
            }}
            onDoubleClick={() => resizeTo(DEFAULT_WIDTH, true)}
            onKeyDown={(e) => {
              const step = e.key === "ArrowLeft" ? -16 : e.key === "ArrowRight" ? 16 : 0;
              if (!step) return;
              e.preventDefault();
              resizeTo(width + step, true);
            }}
          />
        )}
      </div>
    </aside>
  );
}
