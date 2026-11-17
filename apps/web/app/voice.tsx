"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, PauseIcon, PlayIcon, SendIcon, TrashIcon } from "./ui";

/**
 * Browsers only allow the microphone on secure pages (localhost or HTTPS). Phones reach LANDrop
 * over plain http, so there the mic button hands over to the phone's own recorder instead.
 */
export const canRecordHere = () =>
  typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/** Opus in WebM where the browser records it (Chrome, Firefox, Edge); MP4 on Safari. */
function recordingType(): { mimeType?: string; extension: string } {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return { mimeType: "audio/webm;codecs=opus", extension: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4")) return { mimeType: "audio/mp4", extension: "m4a" };
  return { extension: "webm" };
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Recording {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  extension: string;
  startedAt: number;
}

/** Records a voice message from the microphone. `stop` returns it as a file, ready to send. */
export function useVoiceRecorder(onError: (message: string) => void) {
  const recording = useRef<Recording>(undefined);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((Date.now() - recording.current!.startedAt) / 1000), 250);
    return () => clearInterval(timer);
  }, [active]);

  // Leaving the chat mid-recording releases the microphone.
  useEffect(() => () => release(), []);

  function release() {
    recording.current?.stream.getTracks().forEach((t) => t.stop());
    recording.current = undefined;
    setActive(false);
    setSeconds(0);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, extension } = recordingType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const current: Recording = { recorder, stream, chunks: [], extension, startedAt: Date.now() };
      recorder.ondataavailable = (e) => e.data.size && current.chunks.push(e.data);
      recorder.start(250);
      recording.current = current;
      setSeconds(0);
      setActive(true);
    } catch (err) {
      onError(
        (err as Error).name === "NotAllowedError"
          ? "LANDrop can't use the microphone. Allow it in your browser's site settings, then try again."
          : "Couldn't start recording. Is a microphone connected?",
      );
    }
  }

  function stop(): Promise<File | undefined> {
    const current = recording.current;
    if (!current) return Promise.resolve(undefined);
    return new Promise((resolve) => {
      current.recorder.onstop = () => {
        const type = (current.recorder.mimeType || `audio/${current.extension}`).split(";")[0];
        const blob = new Blob(current.chunks, { type });
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
        release();
        resolve(blob.size ? new File([blob], `Voice message ${time}.${current.extension}`, { type }) : undefined);
      };
      current.recorder.stop();
    });
  }

  return { active, seconds, start, stop, cancel: release };
}

/** Replaces the message field while recording, like WhatsApp: discard, the running time, send. */
export function RecordingBar({ seconds, onCancel, onSend }: { seconds: number; onCancel: () => void; onSend: () => void }) {
  return (
    <div className="flex flex-1 items-center gap-2" role="group" aria-label="Recording a voice message">
      <button onClick={onCancel} aria-label="Delete recording" className="flex size-[42px] items-center justify-center rounded-full text-muted hover:bg-hover">
        <TrashIcon size={22} />
      </button>
      <div className="flex min-h-[42px] flex-1 items-center gap-3 rounded-lg bg-panel px-4 md:bg-field dark:bg-field">
        <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-danger motion-reduce:animate-none" />
        <span className="text-[15px] tabular-nums" aria-live="off">
          {formatClock(seconds)}
        </span>
        <span className="truncate text-[14px] text-muted">Recording…</span>
      </div>
      <button
        onClick={onSend}
        aria-label="Send voice message"
        className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-white"
      >
        <SendIcon />
      </button>
    </div>
  );
}

/** Where recording isn't allowed: the phone's own recorder (Android) or an audio file (iPhone), sent once picked. */
export function RecorderFallback({ onFile }: { onFile: (file: File) => void }) {
  return (
    <label
      aria-label="Record a voice message"
      title="Record a voice message"
      className="flex size-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white"
    >
      <MicIcon />
      <input
        type="file"
        accept="audio/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
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
