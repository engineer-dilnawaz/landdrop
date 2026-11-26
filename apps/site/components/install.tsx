"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, TickCircle } from "iconsax-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGuide } from "@/components/guide-os";
import { MAC_SCENES, WIN_SCENES } from "@/components/scenes";
import { cn } from "@/lib/utils";
import type { Os } from "@/lib/platform";

const K = ({ children }: { children: ReactNode }) => <kbd className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-medium text-foreground">{children}</kbd>;

interface Step {
  title: string;
  body: ReactNode;
}

const STEPS: Record<Os, Step[]> = {
  mac: [
    { title: "Download LANDrop", body: <>Get the free installer for your Mac, a single <K>.dmg</K> file of about 120 MB. The page picks Apple silicon or Intel for you.</> },
    { title: "Move it to Applications", body: "Open the downloaded file and drag the LANDrop icon onto the Applications folder." },
    { title: "Allow it the first time", body: <>LANDrop isn’t notarized by Apple yet, so macOS asks first. Open it once, then go to System Settings, Privacy &amp; Security, and click <K>Open Anyway</K>.</> },
    { title: "Let devices connect", body: <>When macOS asks whether LANDrop can accept incoming network connections, click <K>Allow</K>. Without it, phones can’t reach your Mac.</> },
    { title: "Scan to join", body: "Click the LANDrop icon in the menu bar and choose Show QR Code. Any device on the same Wi-Fi scans it and opens LANDrop in its browser." },
    { title: "Turn on notifications", body: <>macOS asks the first time LANDrop wants to alert you about a message: click <K>Allow</K>. If no alerts show up, open System Settings, Notifications, choose LANDrop and switch on <K>Allow Notifications</K>.</> },
  ],
  win: [
    { title: "Download LANDrop", body: <>Get the free installer, <K>LANDrop-win-x64.exe</K>. It’s a single file of about 120 MB.</> },
    { title: "Run the installer", body: "Open the downloaded file. LANDrop installs for your account, with no administrator password, and opens by itself." },
    { title: "Allow it the first time", body: <>LANDrop isn’t code-signed yet, so Windows SmartScreen may warn. Click <K>More info</K>, then <K>Run anyway</K>.</> },
    { title: "Let devices connect", body: <>When Windows Firewall asks, keep <K>Private networks</K> ticked and click <K>Allow access</K>. Without it, phones can’t reach this PC.</> },
    { title: "Scan to join", body: "Click the LANDrop icon in the system tray (bottom right, under the ^ arrow if it’s hidden) and choose Show QR Code to Join. Any device on the same Wi-Fi scans it and opens LANDrop in its browser." },
    { title: "Turn on notifications", body: "LANDrop alerts you about new messages. If none show up, open Settings, System, Notifications, switch on LANDrop, and check that Do not disturb is off." },
  ],
};

const SCENES: Record<Os, ReactNode[]> = { mac: MAC_SCENES, win: WIN_SCENES };
const STEP_MS = 4800;

export function Install() {
  const { os, setOs } = useGuide();
  const steps = STEPS[os];
  // The step belongs to the OS it was picked in, so switching computer starts again at step one.
  const [position, setPosition] = useState<{ os: Os; index: number }>({ os, index: 0 });
  const index = position.os === os ? position.index : 0;
  const touched = useRef(false);
  const stage = useRef<HTMLDivElement>(null);

  const go = (next: number, byUser = false) => {
    if (byUser) touched.current = true;
    setPosition({ os, index: next });
  };

  // Walk through on its own while the guide is on screen, until someone takes over.
  useEffect(() => {
    const element = stage.current;
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) {
        timer = setInterval(() => {
          if (!touched.current) setPosition((p) => ({ os, index: ((p.os === os ? p.index : 0) + 1) % STEPS[os].length }));
        }, STEP_MS);
      }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [os]);

  return (
    <section id="install" className="scroll-mt-14 border-b py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tighter sm:text-5xl">Set up in about two minutes</h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Your computer becomes the hub everyone connects to. You install it once; every other device just scans a code.
        </p>

        <ToggleGroup
          value={[os]}
          onValueChange={(value) => value[0] && (touched.current = true, setOs(value[0] as Os))}
          variant="outline"
          spacing={0}
          className="mt-8"
          aria-label="Which computer will host LANDrop?"
        >
          <ToggleGroupItem value="mac" className="px-5">Mac</ToggleGroupItem>
          <ToggleGroupItem value="win" className="px-5">Windows</ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_1.15fr]">
          <ol className="relative" aria-label="Installation steps">
            <span aria-hidden className="absolute bottom-5 left-[15px] top-5 w-px bg-border" />
            {steps.map((step, i) => {
              const active = i === index;
              return (
                <li key={`${os}-${step.title}`}>
                  <button
                    onClick={() => go(i, true)}
                    aria-current={active ? "step" : undefined}
                    className="group relative flex w-full gap-4 rounded-lg py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold tabular-nums transition-all duration-300",
                        active && "scale-110 border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_18%,transparent)]",
                        i < index && "border-primary/40 bg-primary/10 text-primary",
                      )}
                    >
                      {i < index ? <TickCircle size={18} color="currentColor" variant="Bold" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-1">
                      <strong className={cn("block text-[17px] font-semibold tracking-tight transition-colors", !active && "text-muted-foreground group-hover:text-foreground")}>{step.title}</strong>
                      <span
                        className={cn(
                          "grid text-[15px] leading-relaxed text-muted-foreground transition-all duration-500 ease-out",
                          active ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <span className="overflow-hidden">{step.body}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div>
            <div ref={stage}>
              <Card className="relative aspect-[4/3] gap-0 overflow-hidden bg-muted/50 p-0 shadow-sm max-sm:aspect-[3/4]">
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px]" />
                {os === "mac" && (
                  <div aria-hidden className="relative z-10 flex h-7 items-center gap-4 border-b bg-background/70 px-3.5 text-xs font-semibold backdrop-blur">
                    <span />
                    <span>Finder</span>
                    <span>File</span>
                    <span>Edit</span>
                    <span className="ml-auto flex items-center gap-3">
                      <Image src="/icon.svg" alt="" width={15} height={15} />
                      9:41
                    </span>
                  </div>
                )}
                <div key={`${os}-${index}`} className="scene-in relative grid flex-1 place-items-center p-5" role="tabpanel">
                  {SCENES[os][index]}
                </div>
              </Card>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                Step {index + 1} of {steps.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="Previous step" disabled={index === 0} onClick={() => go(Math.max(0, index - 1), true)}>
                  <ArrowLeft size={18} color="currentColor" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Next step" disabled={index === steps.length - 1} onClick={() => go(Math.min(steps.length - 1, index + 1), true)}>
                  <ArrowRight size={18} color="currentColor" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
