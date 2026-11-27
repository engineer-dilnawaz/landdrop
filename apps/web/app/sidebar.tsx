"use client";

import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

const SIDEBAR_KEY = "landrop.sidebar";
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 400;

interface Layout {
  width: number;
}

const DEFAULT_LAYOUT: Layout = { width: DEFAULT_WIDTH };
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
 * The chat list column on wider screens, beside the open chat like WhatsApp Web. Its right edge
 * drags to resize. On phones it is the whole screen and none of this applies.
 */
export function Sidebar({
  hidden,
  children,
}: {
  /** Phone only: hidden while a chat is open. */
  hidden: boolean;
  children: ReactNode;
}) {
  const { width } = useSyncExternalStore(subscribe, readLayout, () => DEFAULT_LAYOUT);
  const asideRef = useRef<HTMLElement>(null);
  const resizing = useRef(false);

  function resizeTo(next: number, persist: boolean) {
    setLayout({ width: clampWidth(next) }, persist);
  }

  return (
    <aside
      ref={asideRef}
      style={{ "--list-w": `${width}px` } as CSSProperties}
      className={`${hidden ? "hidden md:flex" : "flex"} relative min-h-0 w-full flex-col bg-panel md:w-(--list-w) md:shrink-0 `}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat list"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        className="absolute inset-y-0 right-0 z-10 hidden w-1.5 translate-x-1/2 cursor-col-resize outline-none hover:bg-accent/40 focus-visible:bg-accent/60 md:block"
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
        }}
        onDoubleClick={() => resizeTo(DEFAULT_WIDTH, true)}
        onKeyDown={(e) => {
          const step = e.key === "ArrowLeft" ? -16 : e.key === "ArrowRight" ? 16 : 0;
          if (!step) return;
          e.preventDefault();
          resizeTo(width + step, true);
        }}
      />
    </aside>
  );
}
