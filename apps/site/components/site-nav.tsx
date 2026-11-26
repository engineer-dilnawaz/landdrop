import Image from "next/image";
import { DownloadButton } from "@/components/download";

const LINKS = [
  { href: "#install", label: "Install" },
  { href: "#features", label: "How to use" },
  { href: "#help", label: "Help" },
  { href: "https://github.com/engineer-dilnawaz/landdrop", label: "GitHub" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <a href="#top" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
          <Image src="/icon.svg" alt="" width={28} height={28} priority />
          LANDrop
        </a>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Page">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <DownloadButton size="default" short className="ml-auto md:ml-0" />
      </div>
    </header>
  );
}
