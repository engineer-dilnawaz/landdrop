import { DocumentText, Devices, Gallery, Mobile, Monitor, TickCircle, Video } from "iconsax-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DownloadButton, OtherDownloads } from "@/components/download";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div className="rise">
          <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-primary" /> Free for Mac and Windows
          </Badge>
          <h1 className="text-5xl font-semibold leading-[1.04] tracking-tighter sm:text-6xl">
            Your Wi-Fi is
            <br />
            the cloud now.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Chat and send files of any size between every phone, tablet and computer in the room. It all moves across your own network, so
            nothing is uploaded anywhere.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DownloadButton />
            <a href="#install" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-[15px]")}>
              See how it works
            </a>
          </div>
          <OtherDownloads className="mt-4 text-sm text-muted-foreground" />
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {["No accounts", "No file size limit", "Works without internet"].map((point) => (
              <li key={point} className="flex items-center gap-2">
                <TickCircle size={18} color="currentColor" className="text-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <NetworkCard />
      </div>
    </section>
  );
}

const NODES = [
  { label: "iPhone", Icon: Mobile, x: 82, y: 70, delay: 0.1 },
  { label: "Android", Icon: Mobile, x: 322, y: 62, delay: 0.25 },
  { label: "iPad", Icon: Devices, x: 336, y: 270, delay: 0.4 },
  { label: "Windows PC", Icon: Monitor, x: 66, y: 268, delay: 0.55 },
];

function NetworkCard() {
  return (
    <Card className="rise gap-0 overflow-hidden p-0 shadow-sm [animation-delay:0.15s]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex size-2">
            <span className="ripple absolute inset-0 rounded-full bg-primary" />
            <span className="relative size-2 rounded-full bg-primary" />
          </span>
          Home Wi-Fi
        </span>
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          4 devices online
        </Badge>
      </div>

      <div className="relative mx-auto aspect-[400/340] w-full max-w-md">
        <svg viewBox="0 0 400 340" className="absolute inset-0 size-full" aria-hidden>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx="200" cy="170" r="50" fill="none" stroke="var(--primary)" strokeWidth="1.2" className="ripple origin-center [transform-box:fill-box]" style={{ animationDelay: `${i * 1.2}s` }} />
          ))}
          {NODES.map((node) => (
            <line key={node.label} x1="200" y1="170" x2={node.x} y2={node.y} stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.5" className="link-flow" />
          ))}
        </svg>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-md">
          <Monitor size={20} color="currentColor" /> Host
        </div>
        {NODES.map(({ label, Icon, x, y, delay }) => (
          <div
            key={label}
            className="rise absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-sm"
            style={{ left: `${(x / 400) * 100}%`, top: `${(y / 340) * 100}%`, animationDelay: `${delay}s` }}
          >
            <Icon size={18} color="currentColor" className="text-muted-foreground" />
            {label}
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Transfers</p>
        <ul className="space-y-2.5">
          <Transfer Icon={Video} name="Beach trip.mov" sub="iPhone to everyone" duration="7s" />
          <Transfer Icon={Video} name="Final cut 4K.mp4" sub="From Windows PC · 38 GB" tag="Live" />
          <Transfer Icon={DocumentText} name="Lease.pdf" sub="Galaxy S24 to iPad" tag="Private" duration="5s" />
        </ul>
      </div>

      <dl className="grid grid-cols-3 divide-x border-t text-center">
        {[
          ["38 GB", "moved today"],
          ["0 bytes", "sent to the internet"],
          ["112 MB/s", "across your Wi-Fi"],
        ].map(([value, label]) => (
          <div key={label} className="px-2 py-3">
            <dd className="text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
            <dt className="text-[11px] leading-tight text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Transfer({ Icon, name, sub, tag, duration }: { Icon: typeof Video | typeof Gallery; name: string; sub: string; tag?: string; duration?: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={18} color="currentColor" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
        {duration && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="bar-run h-full rounded-full bg-primary" style={{ animationDuration: duration }} />
          </div>
        )}
      </div>
      {tag && (
        <Badge variant="secondary" className="rounded-full text-[11px]">
          {tag}
        </Badge>
      )}
    </li>
  );
}
