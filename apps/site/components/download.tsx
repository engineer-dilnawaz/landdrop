"use client";

import { Import } from "iconsax-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOWNLOADS, downloadUrl, useRecommended, type DownloadKey } from "@/lib/platform";

/** The installer for this visitor's computer. */
export function DownloadButton({ className, size = "lg", short = false }: { className?: string; size?: "lg" | "default"; short?: boolean }) {
  const key = useRecommended();
  return (
    <a href={downloadUrl(key)} className={cn(buttonVariants({ size }), "h-11 gap-2 px-5 text-[15px]", size === "default" && "h-9 px-3.5 text-sm", className)}>
      <Import size={size === "lg" ? 20 : 18} color="currentColor" />
      {short ? "Download" : DOWNLOADS[key].label}
    </a>
  );
}

/** The installers that weren't recommended, so anyone can pick another. */
export function OtherDownloads({ className }: { className?: string }) {
  const recommended = useRecommended();
  const others = (Object.keys(DOWNLOADS) as DownloadKey[]).filter((key) => key !== recommended);
  return (
    <p className={className}>
      Also for{" "}
      {others.map((key, i) => (
        <span key={key}>
          {i > 0 && ", "}
          <a href={downloadUrl(key)} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            {DOWNLOADS[key].short}
          </a>
        </span>
      ))}
      . Phones just use their browser.
    </p>
  );
}
