"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cropPhoto } from "./avatars";
import { FILLED_BUTTON, Sheet, TEXT_BUTTON } from "./ui";

/** Width of the square the picture is framed in, in pixels. */
const FRAME = 280;
const MAX_ZOOM = 4;

/** Frame a picked photo: drag to move it, slide to zoom. The circle is what everyone will see. */
export function CropSheet({ file, onDone, onClose }: { file: File; onDone: (photo: Blob) => void; onClose: () => void }) {
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const drag = useRef<{ x: number; y: number; from: { x: number; y: number } }>(null);

  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // At zoom 1 the shorter side just fills the frame, so there are never empty corners.
  const base = size ? FRAME / Math.min(size.width, size.height) : 1;
  const scale = base * zoom;
  const shown = size ? { width: size.width * scale, height: size.height * scale } : { width: FRAME, height: FRAME };

  /** Keep the photo covering the frame. */
  function clamp(x: number, y: number, width = shown.width, height = shown.height) {
    return { x: Math.min(0, Math.max(FRAME - width, x)), y: Math.min(0, Math.max(FRAME - height, y)) };
  }

  /** Zoom around the middle of the frame. */
  function zoomTo(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(1, next));
    if (!size) return;
    const ratio = (base * value) / scale;
    const x = FRAME / 2 - (FRAME / 2 - offset.x) * ratio;
    const y = FRAME / 2 - (FRAME / 2 - offset.y) * ratio;
    setZoom(value);
    setOffset(clamp(x, y, size.width * base * value, size.height * base * value));
  }

  function load(image: HTMLImageElement) {
    const next = { width: image.naturalWidth, height: image.naturalHeight };
    const fit = FRAME / Math.min(next.width, next.height);
    // Start centred; the photo is still free to move from here.
    setSize(next);
    setOffset({ x: (FRAME - next.width * fit) / 2, y: (FRAME - next.height * fit) / 2 });
  }

  async function save() {
    if (!size) return;
    setBusy(true);
    setError(undefined);
    try {
      onDone(await cropPhoto(file, -offset.x / scale, -offset.y / scale, FRAME / scale));
    } catch {
      setError("That photo couldn’t be used. Try another one.");
      setBusy(false);
    }
  }

  return (
    <Sheet labelledBy="crop-title" onClose={onClose}>
      <h2 id="crop-title" className="px-6 pb-1 pt-1 text-[20px] font-semibold tracking-tight">
        Frame your photo
      </h2>
      <p className="px-6 pb-4 text-[14px] text-muted">Drag to move it, slide to zoom. The circle is what others see.</p>
      <div className="flex flex-col items-center gap-5 px-6">
        <div
          className="relative touch-none select-none overflow-hidden rounded-3xl bg-field"
          style={{ width: FRAME, height: FRAME, cursor: "grab" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, from: offset };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) setOffset(clamp(d.from.x + e.clientX - d.x, d.from.y + e.clientY - d.y));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => zoomTo(zoom - e.deltaY / 400)}
        >
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked photo
            <img
              src={url}
              alt=""
              draggable={false}
              onLoad={(e) => load(e.currentTarget)}
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={{ width: shown.width, height: shown.height, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          )}
          {/* Dims everything outside the round picture. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(circle at center, transparent ${FRAME / 2 - 1}px, rgb(0 0 0 / 0.55) ${FRAME / 2}px)` }}
          />
        </div>
        <label className="flex w-full max-w-[280px] items-center gap-3 text-[13px] text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="h-1.5 flex-1 accent-accent-fill"
          />
        </label>
        {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2 px-5">
        <button type="button" onClick={onClose} className={TEXT_BUTTON}>
          Cancel
        </button>
        <button type="button" onClick={() => void save()} disabled={!size || busy} className={FILLED_BUTTON}>
          Use photo
        </button>
      </div>
    </Sheet>
  );
}
