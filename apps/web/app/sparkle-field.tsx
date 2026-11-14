"use client";

import { useEffect, useRef } from "react";

/** Roughly one dot per this many square pixels. */
const AREA_PER_DOT = 90;
const MAX_DOTS = 700;

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
}

/**
 * Twinkling, drifting dots behind a bubble's content, like a spoiler effect but never covering
 * anything: it marks a live file as temporary, there only while its sender is online.
 */
export function SparkleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Dots take the bubble's text colour, so they suit both sent and received bubbles.
    const color = getComputedStyle(canvas).color;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const resize = () => {
      const dpr = devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_DOTS, Math.round((width * height) / AREA_PER_DOT));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.5 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.004,
      }));
      if (still) draw(0);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (const d of dots) {
        if (!still) {
          d.x = (d.x + d.vx + width) % width;
          d.y = (d.y + d.vy + height) % height;
        }
        ctx.globalAlpha = still ? 0.5 : 0.15 + 0.6 * Math.abs(Math.sin(now * d.speed + d.phase));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      draw(now);
      if (visible) frame = requestAnimationFrame(loop);
    };

    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    // Only animate while on screen; a long chat may hold many live files.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !still) frame = requestAnimationFrame(loop);
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full rounded-[inherit]"
    />
  );
}
