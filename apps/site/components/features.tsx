import type { ReactNode } from "react";
import { DocumentText, Gallery, Lock1, Messages1, Monitor, TickCircle, Video } from "iconsax-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function Bubble({ who, children, me = false }: { who?: string; children: ReactNode; me?: boolean }) {
  return (
    <div className={cn("max-w-[85%] rounded-2xl border px-3 py-2 text-sm", me ? "ml-auto border-transparent bg-primary text-primary-foreground" : "bg-card")}>
      {who && <small className="mb-0.5 block text-xs font-medium text-primary">{who}</small>}
      {children}
    </div>
  );
}

const FEATURES: { id: string; label: string; Icon: typeof Messages1; title: string; text: string; points: string[]; visual: ReactNode }[] = [
  {
    id: "chat",
    label: "Chat with everyone",
    Icon: Messages1,
    title: "One room for every device",
    text: "Everyone who joins lands in the same group chat, whatever they’re holding.",
    points: ["See who’s online right now", "Name your device so others know it’s you", "History stays on your computer until you clear it"],
    visual: (
      <div className="space-y-2.5">
        <Bubble who="Sara’s iPhone">Is the printer document on someone’s laptop?</Bubble>
        <Bubble who="Windows PC">Sending it now</Bubble>
        <Bubble me>Got it, thanks!</Bubble>
      </div>
    ),
  },
  {
    id: "files",
    label: "Send photos and files",
    Icon: Gallery,
    title: "Full quality, full speed",
    text: "Photos and videos arrive exactly as they were taken, with no compression, at the speed of your Wi-Fi.",
    points: ["Drop files into the chat or pick them from your phone", "Preview images and videos right in the chat", "Anyone can save a file to their own device"],
    visual: (
      <div className="space-y-2.5">
        <Bubble who="Galaxy S24">Sending the sunset ones</Bubble>
        <div className="flex max-w-[85%] items-center gap-3 rounded-2xl border bg-card p-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <DocumentText size={20} color="currentColor" />
          </span>
          <div className="text-sm">
            <b className="block font-medium">IMG_2048.HEIC</b>
            <small className="text-xs text-muted-foreground">8.4 MB</small>
          </div>
        </div>
        <Bubble me>Wow, the original quality</Bubble>
      </div>
    ),
  },
  {
    id: "stream",
    label: "Stream huge files",
    Icon: Video,
    title: "No size limit. Really.",
    text: "Files too big to copy are streamed straight from the device that has them. Others watch or save while the sender stays online.",
    points: ["Share a 40 GB movie without waiting for an upload", "Start watching before the whole file has moved", "Nothing piles up on your computer’s disk"],
    visual: (
      <div className="space-y-2.5">
        <Bubble who="Windows PC">Here’s the full edit, 38 GB</Bubble>
        <div className="max-w-[85%] overflow-hidden rounded-2xl border bg-card">
          <div className="grid aspect-video place-items-center bg-zinc-950 text-white">
            <span className="grid size-12 place-items-center rounded-full bg-white/15">▶</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 text-xs">
            <span className="tabular-nums text-muted-foreground">12:04</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="bar-run h-full rounded-full bg-primary" />
            </div>
            <Badge className="rounded-full text-[11px]">Live</Badge>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "private",
    label: "Talk privately",
    Icon: Lock1,
    title: "Message one device, not the room",
    text: "Pick a device to start a private conversation. Only the two of you see it.",
    points: ["Send private files the same way", "Switch between group and private chats in one tap", "Private groups of several devices are built in too"],
    visual: (
      <div className="space-y-2">
        {["Sara’s iPhone", "Kitchen iPad", "Windows PC"].map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm">
            {name}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> Online
            </span>
          </div>
        ))}
        <Bubble me>Here’s the recipe, just for you</Bubble>
      </div>
    ),
  },
  {
    id: "tray",
    label: "Lives in your menu bar",
    Icon: Monitor,
    title: "Always there, never in the way",
    text: "LANDrop runs quietly in your menu bar or system tray, so devices can join whenever your computer is awake.",
    points: ["Show the join code in one click", "Start automatically when you log in", "Keep the computer awake while it’s plugged in"],
    visual: (
      <div className="w-full max-w-xs rounded-xl border bg-card p-1.5 text-sm shadow-lg">
        <p className="px-3 py-2 text-xs text-muted-foreground">Running at 192.168.1.24:4545</p>
        <p className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Show QR Code to Join…</p>
        <p className="px-3 py-2">Open LANDrop</p>
        <p className="flex items-center gap-2 px-3 py-2"><TickCircle size={16} color="currentColor" className="text-primary" />Start at Login</p>
        <p className="flex items-center gap-2 px-3 py-2"><TickCircle size={16} color="currentColor" className="text-primary" />Keep Computer Awake While Plugged In</p>
        <p className="px-3 py-2">Quit LANDrop</p>
      </div>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-14 border-b bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-2xl text-4xl font-semibold tracking-tighter sm:text-5xl">Everything you’d use a chat app for, minus the internet</h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">Once devices have joined, LANDrop works like a group chat for everyone on your Wi-Fi, built for moving real files.</p>
        <Tabs defaultValue="chat" orientation="vertical" className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <TabsList className="flex h-auto w-full flex-row gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:overflow-visible" aria-label="Features">
            {FEATURES.map(({ id, label, Icon }) => (
              <TabsTrigger key={id} value={id} className="h-10 flex-none justify-start gap-2.5 px-3 text-sm data-active:border-border data-active:bg-card data-active:shadow-sm lg:flex-initial">
                <Icon size={18} color="currentColor" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {FEATURES.map(({ id, title, text, points, visual }) => (
            <TabsContent key={id} value={id}>
              <Card className="scene-in grid gap-8 p-6 sm:p-8 md:grid-cols-2">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-3 text-[15px] text-muted-foreground">{text}</p>
                  <ul className="mt-5 space-y-2.5 text-[15px]">
                    {points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <TickCircle size={20} color="currentColor" className="mt-0.5 shrink-0 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border bg-muted/40 p-4">{visual}</div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
