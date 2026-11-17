"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FolderFile, FolderListing, Message } from "@landrop/protocol";
import { MediaViewer, type MediaItem } from "./media-viewer";
import { TextViewer, isTextName } from "./text-viewer";
import { BackIcon, CloseIcon, FolderIcon, SaveIcon, formatBytes, useEscape } from "./ui";

/** Kinds the folder can show inline; the host decides for itself what it will actually serve inline. */
const MEDIA: Record<string, "image" | "video"> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  mp4: "video",
  m4v: "video",
  mov: "video",
  webm: "video",
};
/** Rows drawn at a time in a long folder. */
const ROWS_PER_PAGE = 300;
const extension = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
const mediaKind = (name: string) => MEDIA[extension(name)];

/**
 * A shared folder opened inside LANDrop, like a folder on a computer: subfolders to go into, photos
 * and videos to view, text and code to read, and other files to save one at a time. The chat bubble downloads it all.
 */
export function FolderBrowser({
  message,
  listDir,
  fileUrl,
  onClose,
}: {
  message: Message;
  /** What's directly inside a subfolder ("" for the top); the host lists one level at a time, so any size opens at once. */
  listDir: (dir: string) => Promise<FolderListing>;
  /** One file's address; `preview` shows a photo or video inline instead of saving it. */
  fileUrl: (path: string, preview?: boolean) => string;
  onClose: () => void;
}) {
  const name = message.attachment!.name.replace(/\.zip$/, "");
  const [dir, setDir] = useState("");
  // Keyed by the subfolder it lists, so a level that's still loading never shows the previous one.
  const [loaded, setLoaded] = useState<{ dir: string; listing?: FolderListing; failed?: boolean }>();
  const [viewing, setViewing] = useState<string>();
  /** A text or code file open for reading. */
  const [reading, setReading] = useState<FolderFile>();
  useEscape(() => (viewing || reading ? undefined : dir ? setDir(dir.split("/").slice(0, -1).join("/")) : onClose()));

  useEffect(() => {
    let cancelled = false;
    listDir(dir)
      .then((listing) => !cancelled && setLoaded({ dir, listing }))
      .catch(() => !cancelled && setLoaded({ dir, failed: true }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listed once per folder and level
  }, [message.id, dir]);

  const listing = loaded?.dir === dir ? loaded.listing : undefined;
  // A level can hold tens of thousands of files: draw a page of rows at a time, more as they scroll into view.
  const [shown, setShown] = useState({ dir, rows: ROWS_PER_PAGE });
  const rows = shown.dir === dir ? shown.rows : ROWS_PER_PAGE;
  const more = (node: HTMLElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(([seen]) => {
      if (!seen.isIntersecting) return;
      observer.disconnect();
      setShown({ dir, rows: rows + ROWS_PER_PAGE });
    });
    observer.observe(node);
    return () => observer.disconnect();
  };
  const failed = loaded?.dir === dir && loaded.failed;
  const path = dir ? dir.split("/") : [];
  const fileName = (path: string) => path.split("/").pop()!;
  const media: MediaItem[] = (listing?.files ?? []).flatMap((f) => {
    const kind = mediaKind(f.path);
    return kind ? [{ id: f.path, name: fileName(f.path), kind, src: fileUrl(f.path, true), download: fileUrl(f.path), title: [name, ...path].join(" › ") }] : [];
  });

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-40 flex flex-col bg-panel text-foreground">
      <header className="flex items-center gap-1 border-b border-divider bg-bar px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-6 md:pt-3 md:pb-3">
        <button
          onClick={() => (dir ? setDir(path.slice(0, -1).join("/")) : onClose())}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-hover"
          aria-label={dir ? "Up one folder" : "Close"}
          title={dir ? "Up one folder" : "Close"}
        >
          {dir ? <BackIcon /> : <CloseIcon />}
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[17px] font-medium">{path.at(-1) ?? name}</p>
          {/* The path so far; each part goes back there. */}
          <nav aria-label="Folder path" className="flex min-w-0 items-center gap-1 overflow-x-auto text-[13px] text-muted [scrollbar-width:none]">
            {[name, ...path].map((part, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                <button onClick={() => setDir(path.slice(0, i).join("/"))} className="rounded hover:text-foreground hover:underline" disabled={i === path.length}>
                  {part}
                </button>
              </span>
            ))}
          </nav>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {failed ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">
            This folder couldn’t be opened. If it’s shared live, the sender may have gone offline.
          </p>
        ) : !listing ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">Opening “{name}”…</p>
        ) : (
          <ul aria-label={`In ${path.at(-1) ?? name}`} className="mx-auto max-w-4xl md:py-2">
            {listing.folders.slice(0, rows).map((f) => (
              <li key={f.name}>
                <button onClick={() => setDir([...path, f.name].join("/"))} className="flex w-full items-center gap-4 px-5 py-2.5 text-left hover:bg-hover">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#ffbc38]/15 text-[#e0a020]">
                    <FolderIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{f.name}</span>
                    <span className="block text-[13px] text-muted">
                      {f.files.toLocaleString()} {f.files === 1 ? "file" : "files"} · {formatBytes(f.size)}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </button>
              </li>
            ))}
            {listing.files.slice(0, Math.max(0, rows - listing.folders.length)).map((f) => {
              const name = fileName(f.path);
              const kind = mediaKind(name);
              const text = !kind && isTextName(name);
              const row = (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-field text-[10px] font-bold uppercase text-muted">
                    {kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host
                      <img src={fileUrl(f.path, true)} alt="" loading="lazy" className="size-full object-cover" />
                    ) : kind === "video" ? (
                      <video src={`${fileUrl(f.path, true)}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
                    ) : (
                      extension(name).slice(0, 4) || "file"
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{name}</span>
                    <span className="block text-[13px] text-muted">{formatBytes(f.size)}</span>
                  </span>
                </>
              );
              return (
                <li key={f.path} className="flex items-center hover:bg-hover">
                  {kind || text ? (
                    <button
                      onClick={() => (kind ? setViewing(f.path) : setReading(f))}
                      className="flex min-w-0 flex-1 items-center gap-4 py-2.5 pl-5 text-left"
                    >
                      {row}
                    </button>
                  ) : (
                    <a href={fileUrl(f.path)} download={name} className="flex min-w-0 flex-1 items-center gap-4 py-2.5 pl-5">
                      {row}
                    </a>
                  )}
                  <a
                    href={fileUrl(f.path)}
                    download={name}
                    aria-label={`Save ${name}`}
                    title="Save"
                    className="mr-3 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-field hover:text-foreground"
                  >
                    <SaveIcon size={20} />
                  </a>
                </li>
              );
            })}
            {listing.folders.length + listing.files.length > rows && (
              <li ref={more} className="px-6 py-4 text-center text-[13px] text-muted">
                Showing {rows.toLocaleString()} of {(listing.folders.length + listing.files.length).toLocaleString()}…
              </li>
            )}
            {listing.folders.length === 0 && listing.files.length === 0 && (
              <li className="px-6 py-12 text-center text-[14px] text-muted">This folder is empty.</li>
            )}
          </ul>
        )}
      </div>
      {viewing && <MediaViewer items={media} startId={viewing} onClose={() => setViewing(undefined)} />}
      {reading && (
        <TextViewer
          name={fileName(reading.path)}
          path={reading.path}
          fileUrl={fileUrl}
          title={[name, ...reading.path.split("/").slice(0, -1)].join(" › ")}
          size={reading.size}
          src={fileUrl(reading.path)}
          download={fileUrl(reading.path)}
          onClose={() => setReading(undefined)}
        />
      )}
    </div>,
    document.body,
  );
}
