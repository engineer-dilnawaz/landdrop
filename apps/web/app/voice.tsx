"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./ui";

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}


const BARS = 36;
/** Bigger audio files aren't fetched a second time just to draw them; they get a stand-in shape. */
const MAX_WAVEFORM_BYTES = 10 * 1024 * 1024;

/** A steady pseudo-random shape from the message id, shown until (or instead of) the real waveform. */
function placeholderBars(seed: string): number[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: BARS }, () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return 0.25 + ((h >>> 0) % 1000) / 1600;
  });
}

/** The loudness of each slice of the recording, from 0.12 to 1, and its exact length. */
function useWaveform(src: string, seed: string, size: number) {
  const [wave, setWave] = useState<{ bars: number[]; duration?: number }>(() => ({ bars: placeholderBars(seed) }));
  useEffect(() => {
    if (size > MAX_WAVEFORM_BYTES || typeof AudioContext === "undefined") return;
    let cancelled = false;
    const context = new AudioContext();
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((audio) => {
        const samples = audio.getChannelData(0);
        const step = Math.floor(samples.length / BARS) || 1;
        const levels = Array.from({ length: BARS }, (_, i) => {
          let sum = 0;
          for (let j = i * step; j < Math.min((i + 1) * step, samples.length); j++) sum += samples[j] * samples[j];
          return Math.sqrt(sum / step);
        });
        const loudest = Math.max(...levels) || 1;
        if (!cancelled) setWave({ bars: levels.map((l) => Math.max(0.12, l / loudest)), duration: audio.duration });
      })
      // Formats this browser can't decode keep the stand-in shape; playback doesn't depend on it.
      .catch(() => {})
      .finally(() => void context.close());
    return () => {
      cancelled = true;
    };
  }, [src, size]);
  return wave;
}

/** A voice message or audio file in a bubble: play/pause, its waveform (tap or drag to seek), and the time. */
export function VoicePlayer({
  id,
  src,
  size,
  own,
  onError,
}: {
  id: string;
  src: string;
  size: number;
  own: boolean;
  onError: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [metaDuration, setMetaDuration] = useState<number>();
  const wave = useWaveform(src, id, size);
  const duration = wave.duration ?? metaDuration;

  // Recordings made with MediaRecorder carry no duration in their header. If the waveform couldn't be
  // decoded to give it, seeking to the end makes the browser work it out; playback then starts from 0.
  const readDuration = (el: HTMLAudioElement) => {
    if (Number.isFinite(el.duration)) return setMetaDuration(el.duration);
    el.currentTime = Number.MAX_SAFE_INTEGER;
    el.addEventListener(
      "durationchange",
      () => {
        if (!Number.isFinite(el.duration)) return;
        setMetaDuration(el.duration);
        el.currentTime = 0;
      },
      { once: true },
    );
  };

  const progress = duration ? Math.min(1, time / duration) : 0;
  const playhead = Math.floor(progress * BARS);
  return (
    <div className="flex w-64 max-w-full items-center gap-3 py-1 md:w-72">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => readDuration(e.currentTarget)}
        onTimeUpdate={(e) => duration && setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onError={onError}
      />
      <button
        onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
        aria-label={playing ? "Pause" : "Play voice message"}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${own ? "bg-black/10 dark:bg-white/15" : "bg-accent text-white"}`}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="relative h-8">
          <div aria-hidden className="flex h-full items-center justify-between">
            {wave.bars.map((level, i) => (
              <span
                key={i}
                className={`voice-bar w-[3px] rounded-full transition-colors duration-150 ${
                  i < playhead || (progress > 0 && i === playhead) ? "bg-accent" : "bg-current opacity-30"
                } ${playing && i === playhead ? "voice-bar-live" : ""}`}
                style={{ height: `${level * 100}%`, animationDelay: `${i * 12}ms` }}
              />
            ))}
          </div>
          {/* Invisible over the waveform: tap or drag anywhere on it to seek, and arrow keys work too. */}
          <input
            type="range"
            min={0}
            max={duration ?? 0}
            step={0.1}
            value={time}
            disabled={!duration}
            aria-label="Position"
            onChange={(e) => {
              const t = Number(e.target.value);
              setTime(t);
              if (audio.current) audio.current.currentTime = t;
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>
        <span className="text-[12px] tabular-nums opacity-65">{formatClock(playing || time ? time : (duration ?? 0))}</span>
      </div>
    </div>
  );
}
