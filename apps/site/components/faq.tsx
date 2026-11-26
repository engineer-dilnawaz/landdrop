"use client";

import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useGuide } from "@/components/guide-os";
import type { Os } from "@/lib/platform";

const ITEMS: { q: string; a: ReactNode; os?: Os }[] = [
  { q: "Is LANDrop free?", a: "Yes. The app is free, and other devices don’t need anything installed." },
  { q: "Which computers can host it?", a: "Macs (Apple silicon or Intel) and Windows PCs. Any device with a modern web browser can join: iPhone, iPad, Android, Windows, Linux or another Mac." },
  { q: "Where are my messages and files kept?", os: "mac", a: "On the Mac running LANDrop, in a folder called .landrop in your home folder. Nothing is sent to a server, and the chat stays until you clear it." },
  { q: "Where are my messages and files kept?", os: "win", a: "On the PC running LANDrop, in a folder called .landrop in your user folder, for example C:\\Users\\you\\.landrop. Nothing is sent to a server, and the chat stays until you clear it." },
  { q: "Does it need the internet?", a: "No. Devices only need to be on the same Wi-Fi or local network as the computer running LANDrop." },
  { q: "macOS says it can’t verify LANDrop", os: "mac", a: "LANDrop isn’t notarized by Apple yet. Open it once, then go to System Settings, Privacy & Security, and click Open Anyway. You only need to do this the first time." },
  { q: "Windows says it protected my PC", os: "win", a: "LANDrop isn’t code-signed yet, so SmartScreen warns about it. Click More info, then Run anyway. You only need to do this the first time." },
  { q: "A phone can’t reach my Windows PC", os: "win", a: "Windows Firewall is probably blocking it. Open Windows Security, Firewall & network protection, Allow an app through firewall, find LANDrop and tick Private. Also check the phone is on the same Wi-Fi, and that this network is set to Private in Settings, Network & internet, Wi-Fi." },
  { q: "I don’t get notifications on my Mac", os: "mac", a: "Open System Settings, Notifications, choose LANDrop and switch on Allow Notifications. Also check Focus isn’t on. In LANDrop, Settings, Notifications lets you turn alerts off, or hide the message text so a banner only says who wrote." },
  { q: "I don’t get notifications on Windows", os: "win", a: "Open Settings, System, Notifications and switch on LANDrop. Check Do not disturb is off. In LANDrop, Settings, Notifications lets you turn alerts off, or hide the message text so a banner only says who wrote." },
  { q: "A phone can’t open LANDrop", a: "Check the phone is on the same Wi-Fi as the computer running LANDrop, not mobile data. On Android Chrome, turn off Settings, Privacy and security, Always use secure connections. LANDrop runs on your local network without https, and that setting blocks it." },
  { q: "LANDrop stops working when my Mac sleeps", os: "mac", a: "A sleeping Mac can’t answer other devices. From the menu bar icon, turn on Keep Mac Awake While Plugged In. Closing a laptop’s lid still puts it to sleep." },
  { q: "LANDrop stops working when my PC sleeps", os: "win", a: "A sleeping PC can’t answer other devices. From the tray icon, turn on Keep Computer Awake While Plugged In. Closing a laptop’s lid may still put it to sleep." },
  { q: "“Another copy of LANDrop is using port 4545”", a: "LANDrop is already running somewhere, for example from Terminal. Quit that copy, then open LANDrop again." },
];

/** Questions and fixes: the answers for the visitor's own computer, and the ones that apply to both. */
export function Faq() {
  const { os } = useGuide();
  const items = ITEMS.filter((item) => !item.os || item.os === os);
  return (
    <section id="help" className="scroll-mt-14 border-b py-20">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="text-4xl font-semibold tracking-tighter sm:text-5xl">Questions and fixes</h2>
        <p className="mt-3 text-muted-foreground">Showing answers for {os === "mac" ? "Mac" : "Windows"}. Change it in the setup guide above.</p>
        <Accordion className="mt-8 rounded-xl border px-5">
          {items.map((item) => (
            <AccordionItem key={`${item.os}-${item.q}`} value={`${item.os}-${item.q}`}>
              <AccordionTrigger className="py-4 text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
