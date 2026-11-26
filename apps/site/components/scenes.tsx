import Image from "next/image";
import type { ReactNode } from "react";
import { Folder2, ShieldTick } from "iconsax-react";
import { cn } from "@/lib/utils";

/** A small app window: macOS traffic lights, or a Windows title bar with its buttons. */
function Window({ title, win = false, className, children }: { title: string; win?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("w-full max-w-[400px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl", win && "rounded-lg", className)}>
      {win ? (
        <div className="flex h-8 items-center border-b pl-3 text-xs font-medium">
          {title}
          <span className="ml-auto px-3 tracking-[0.4em] text-muted-foreground">✕</span>
        </div>
      ) : (
        <div className="relative flex h-8 items-center border-b px-3 text-xs font-medium">
          <span className="flex gap-1.5">
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
          </span>
          <span className="absolute inset-x-0 text-center text-muted-foreground">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

const Logo = ({ size = 56 }: { size?: number }) => <Image src="/icon.svg" alt="" width={size} height={size} />;

function Progress() {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="fill-bar h-full w-0 rounded-full bg-primary" />
    </div>
  );
}

function FakeButton({ children, primary = false, attention = false }: { children: ReactNode; primary?: boolean; attention?: boolean }) {
  return (
    <span className={cn("inline-block rounded-md px-3.5 py-1.5 text-center text-[13px] font-medium", primary ? "bg-primary text-primary-foreground" : "bg-muted", attention && "attention")}>
      {children}
    </span>
  );
}

function Switch({ on = false, flip = false }: { on?: boolean; flip?: boolean }) {
  return (
    <span
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:content-['']",
        on ? "bg-primary after:translate-x-4" : flip ? "flip-on bg-muted-foreground/35" : "bg-muted-foreground/35",
      )}
    />
  );
}

function Download({ file, win = false }: { file: string; win?: boolean }) {
  return (
    <Window title="Downloads" win={win}>
      <div className="flex items-center gap-4 p-5">
        <Logo />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file}</p>
          <p className="text-xs text-muted-foreground">From github.com</p>
          <Progress />
        </div>
      </div>
    </Window>
  );
}

function Drag() {
  return (
    <Window title="LANDrop">
      <div className="flex items-center justify-around px-3 pb-8 pt-7 text-center text-xs font-medium">
        <figure className="relative z-10 m-0">
          <div className="drag-icon">
            <Logo />
          </div>
          LANDrop
        </figure>
        <svg viewBox="0 0 70 20" className="h-5 w-[70px] text-muted-foreground" aria-hidden>
          <path d="M2 10h62m-8-7 8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
        </svg>
        <figure className="m-0">
          <div className="receive mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Folder2 size={28} color="currentColor" />
          </div>
          Applications
        </figure>
      </div>
    </Window>
  );
}

function Privacy() {
  return (
    <Window title="Privacy & Security">
      <div className="p-5">
        <div className="mb-3 grid gap-1 text-xs text-muted-foreground">
          <span>Wi-Fi</span>
          <span>General</span>
          <b className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-foreground">Privacy &amp; Security</b>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-[13px]">
          <ShieldTick size={22} color="currentColor" className="shrink-0 text-muted-foreground" />
          <p className="m-0 flex-1">“LANDrop” was blocked to protect your Mac.</p>
          <FakeButton primary attention>
            Open Anyway
          </FakeButton>
        </div>
      </div>
    </Window>
  );
}

function MacFirewall() {
  return (
    <div className="w-full max-w-[300px] rounded-xl border bg-card p-5 text-center shadow-xl">
      <Logo size={52} />
      <h4 className="mt-2.5 text-[15px] font-semibold leading-snug">Do you want “LANDrop” to accept incoming network connections?</h4>
      <p className="my-2 mb-4 text-[13px] text-muted-foreground">This lets phones and computers on your Wi-Fi reach it.</p>
      <div className="grid grid-cols-2 gap-2">
        <FakeButton>Deny</FakeButton>
        <FakeButton primary attention>
          Allow
        </FakeButton>
      </div>
    </div>
  );
}

const QR_SIZE = 21;

/** The cells of a decorative QR code: three finder squares and scattered cells, the same every time. */
function buildQr(): boolean[] {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, 14], [14, 0]]) {
      const y = r - fr;
      const x = c - fc;
      if (y >= 0 && y < 7 && x >= 0 && x < 7) return y === 0 || y === 6 || x === 0 || x === 6 || (y > 1 && y < 5 && x > 1 && x < 5) ? 1 : 0;
    }
    return -1;
  };
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    const f = finder(Math.floor(i / QR_SIZE), i % QR_SIZE);
    return f === 1 || (f === -1 && rand() >= 0.5);
  });
}
const QR_CELLS = buildQr();

function Qr() {
  return (
    <div aria-hidden className="grid size-[124px] shrink-0 grid-cols-[repeat(21,1fr)] rounded-lg bg-white p-2.5">
      {QR_CELLS.map((dark, i) => (
        <i key={i} className={dark ? "bg-zinc-950" : ""} />
      ))}
    </div>
  );
}

function Join({ win = false }: { win?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <Window title="Join LANDrop" win={win} className="w-auto">
        <div className="p-4 text-center text-xs text-muted-foreground">
          <Qr />
          <p className="mt-2">192.168.1.24:4545</p>
        </div>
      </Window>
      <div aria-hidden className="relative h-[210px] w-[112px] rounded-[22px] bg-zinc-950 p-1.5 shadow-xl">
        <div className="relative grid size-full place-items-center overflow-hidden rounded-2xl bg-card">
          <div className="p-2 text-center text-[11px]">
            <Logo size={28} />
            <b className="mt-1 block text-xs">You’re in</b>4 devices nearby
          </div>
          <div className="fade-out-late absolute inset-0 grid place-items-center bg-zinc-800">
            <div className="relative size-16 overflow-hidden rounded-xl border-2 border-white">
              <span className="scan-line absolute inset-x-0 top-0 h-0.5 bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacNotifications() {
  return (
    <Window title="Notifications">
      <div className="p-5">
        <div className="mb-3 grid gap-1 text-xs text-muted-foreground">
          <span>Wi-Fi</span>
          <b className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-foreground">Notifications</b>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-[13px]">
          <Logo size={30} />
          <p className="m-0 flex-1 leading-tight">
            <b>LANDrop</b>
            <br />
            <small className="text-xs text-muted-foreground">Allow Notifications</small>
          </p>
          <Switch flip />
        </div>
      </div>
    </Window>
  );
}

function WinInstaller() {
  return (
    <Window title="LANDrop Setup" win>
      <div className="flex items-center gap-4 p-5">
        <Logo />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installing LANDrop…</p>
          <p className="text-xs text-muted-foreground">It opens by itself when it’s done</p>
          <Progress />
        </div>
      </div>
    </Window>
  );
}

function SmartScreen() {
  return (
    <div className="w-full max-w-[360px] overflow-hidden rounded-lg border bg-card shadow-xl">
      <div className="bg-[#1b4fa0] p-5 text-white">
        <h4 className="mb-2 text-[17px] font-semibold leading-snug">Windows protected your PC</h4>
        <p className="text-[12.5px] leading-relaxed opacity-90">Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.</p>
        <p className="mt-2.5 text-[12.5px] font-semibold">App: LANDrop-win-x64.exe</p>
      </div>
      <div className="flex justify-end gap-2 p-4">
        <FakeButton primary attention>
          Run anyway
        </FakeButton>
        <FakeButton>Don’t run</FakeButton>
      </div>
    </div>
  );
}

function Check({ on = false, children }: { on?: boolean; children: ReactNode }) {
  return (
    <div className="my-2 flex items-start gap-2 text-[12.5px] leading-snug">
      <span className={cn("mt-px flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] text-[10px] leading-none", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{on && "✓"}</span>
      {children}
    </div>
  );
}

function WinFirewall() {
  return (
    <Window title="Windows Security Alert" win>
      <div className="p-5">
        <p className="mb-2.5 text-[13px] leading-relaxed">Windows Defender Firewall has blocked some features of LANDrop. Allow it to communicate on:</p>
        <Check on>Private networks, such as my home or work network</Check>
        <Check>Public networks, such as those in airports and coffee shops (not recommended)</Check>
        <div className="mt-3.5 flex justify-end gap-2">
          <FakeButton primary attention>
            Allow access
          </FakeButton>
          <FakeButton>Cancel</FakeButton>
        </div>
      </div>
    </Window>
  );
}

function WinNotifications() {
  return (
    <Window title="Settings · Notifications" win>
      <div className="space-y-2 p-5 text-[13px]">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <p className="m-0 flex-1">Get notifications from apps and other senders</p>
          <Switch on />
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <Logo size={30} />
          <p className="m-0 flex-1 leading-tight">
            <b>LANDrop</b>
            <br />
            <small className="text-xs text-muted-foreground">Banners and sounds</small>
          </p>
          <Switch flip />
        </div>
      </div>
    </Window>
  );
}

export const MAC_SCENES = [
  <Download key="d" file="LANDrop-mac-arm64.dmg" />,
  <Drag key="m" />,
  <Privacy key="p" />,
  <MacFirewall key="f" />,
  <Join key="j" />,
  <MacNotifications key="n" />,
];

export const WIN_SCENES = [
  <Download key="d" file="LANDrop-win-x64.exe" win />,
  <WinInstaller key="i" />,
  <SmartScreen key="s" />,
  <WinFirewall key="f" />,
  <Join key="j" win />,
  <WinNotifications key="n" />,
];
