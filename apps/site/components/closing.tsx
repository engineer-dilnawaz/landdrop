import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { DownloadButton } from "@/components/download";
import { cn } from "@/lib/utils";

export function Closing() {
  return (
    <>
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-500 px-8 py-16 text-center text-white sm:py-20">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tighter sm:text-5xl">Turn your computer into the hub of the room</h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">Free download. Phones join with a scan, and nothing ever leaves your network.</p>
          <div className="mt-8 flex justify-center">
            <DownloadButton className="bg-white text-emerald-950 hover:bg-white/90" />
          </div>
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Image src="/icon.svg" alt="" width={20} height={20} />
            LANDrop
          </span>
          <span>Everything stays on your Wi-Fi.</span>
          <span className="ml-auto flex items-center gap-5">
            <a className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-muted-foreground")} href="https://github.com/engineer-dilnawaz/landrop">Source on GitHub</a>
            <a className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-muted-foreground")} href="https://github.com/engineer-dilnawaz/landrop/releases">Releases</a>
            <span>Made by Dilnawaz Khan</span>
          </span>
        </div>
      </footer>
    </>
  );
}
