import type { FolderFile } from "@landrop/protocol";

/**
 * A folder ready to send: its files back to back, pointing at the originals, so nothing is read or
 * copied. The host serves it file by file using `files`. Made with `archiveFolder`.
 */
export class FolderArchive extends File {
  constructor(
    parts: Blob[],
    name: string,
    readonly files: FolderFile[],
  ) {
    super(parts, `${name}.zip`, { type: "application/zip" });
  }
}

export interface PickedFolder {
  name: string;
  files: { path: string; file: File }[];
}

/** How far reading a folder has got. `found` grows while `scanning`: a dropped folder's total isn't known until the end. */
export interface FolderReading {
  read: number;
  found: number;
  scanning: boolean;
}

/** System clutter that nobody means to share. */
const JUNK = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|\._[^/]*)$/i;

/** Lets the page paint and respond. */
const yieldToPage = (): Promise<void> => {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
};

/**
 * For loops over a big folder's hundreds of thousands of files: call it each time round, and every
 * few milliseconds it pauses for the page, so the screen never freezes. Also where stopping takes effect.
 */
function breather(signal?: AbortSignal) {
  let since = performance.now();
  return async () => {
    signal?.throwIfAborted();
    if (performance.now() - since < 8) return;
    await yieldToPage();
    signal?.throwIfAborted();
    since = performance.now();
  };
}

/** The folder's name in a folder picker's list, where every file's path starts with it. */
export const pickedFolderName = (list: FileList) => list[0]?.webkitRelativePath.split("/")[0] || "Folder";

/** From a folder picker (`webkitdirectory`): every file carries its path, starting with the folder's name. */
export async function folderFromPicker(list: FileList, onProgress: (reading: FolderReading) => void, signal: AbortSignal): Promise<PickedFolder> {
  const name = pickedFolderName(list);
  const files: PickedFolder["files"] = [];
  const breathe = breather(signal);
  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    if (file.webkitRelativePath && !JUNK.test(file.webkitRelativePath)) files.push({ path: file.webkitRelativePath.slice(name.length + 1), file });
    onProgress({ read: i + 1, found: list.length, scanning: false });
    await breathe();
  }
  return { name, files };
}

/** Folders listed at once while walking a dropped folder. */
const WALKERS = 6;
/** File details asked for at once. Asking for every file together floods the browser and freezes the page. */
const FILE_GROUP = 200;

/**
 * From a dropped folder: walks it, subfolders included. Big folders take a while (the system lists
 * every file), so it goes a few folders and a few hundred files at a time, pausing for the page as it
 * goes so the screen never freezes. `onProgress` reports how far it's got; `signal` stops it.
 */
export async function folderFromDrop(
  entry: FileSystemDirectoryEntry,
  onProgress: (reading: FolderReading) => void,
  signal: AbortSignal,
): Promise<PickedFolder> {
  const files: PickedFolder["files"] = [];
  const queue: { dir: FileSystemDirectoryEntry; prefix: string }[] = [{ dir: entry, prefix: "" }];
  let listing = 0;
  let found = 0;
  const report = () => onProgress({ read: files.length, found, scanning: queue.length + listing > 0 });
  const breathe = breather(signal);

  const list = async (dir: FileSystemDirectoryEntry, prefix: string) => {
    const reader = dir.createReader();
    // readEntries hands them over in batches until it returns none.
    for (;;) {
      await breathe();
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) return;
      const fileEntries: FileSystemFileEntry[] = [];
      for (const child of batch) {
        if (child.isDirectory) queue.push({ dir: child as FileSystemDirectoryEntry, prefix: `${prefix}${child.name}/` });
        else if (!JUNK.test(prefix + child.name)) fileEntries.push(child as FileSystemFileEntry);
      }
      found += fileEntries.length;
      report();
      for (let i = 0; i < fileEntries.length; i += FILE_GROUP) {
        const group = fileEntries.slice(i, i + FILE_GROUP);
        const got = await Promise.all(group.map((child) => new Promise<File>((resolve, reject) => child.file(resolve, reject))));
        got.forEach((file, k) => files.push({ path: prefix + group[k].name, file }));
        report();
        await breathe();
      }
    }
  };

  const walker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) {
        // Others may still find subfolders; done once nobody is listing.
        if (!listing) return;
        await new Promise((resolve) => setTimeout(resolve, 5));
        signal.throwIfAborted();
        continue;
      }
      listing++;
      try {
        await list(next.dir, next.prefix);
      } finally {
        listing--;
      }
    }
  };
  await Promise.all(Array.from({ length: WALKERS }, walker));
  report();
  return { name: entry.name, files };
}

/** Files per Blob when joining a folder's files: small enough that each join is quick. */
const JOIN_SLICE = 2000;

/** Joins a folder's files into one sendable file, a slice at a time. No file's contents are read. */
export async function archiveFolder(folder: PickedFolder, signal: AbortSignal): Promise<FolderArchive> {
  if (!folder.files.length) throw new Error(`“${folder.name}” has no files to send.`);
  const breathe = breather(signal);
  const parts: Blob[] = [];
  const files: FolderFile[] = [];
  for (let i = 0; i < folder.files.length; i += JOIN_SLICE) {
    const slice = folder.files.slice(i, i + JOIN_SLICE);
    parts.push(new Blob(slice.map((f) => f.file)));
    for (const { path, file } of slice) files.push({ path, size: file.size });
    await breathe();
  }
  return new FolderArchive(parts, folder.name, files);
}

/**
 * The request announcing a folder, as JSON in a Blob. Its list of files can run to tens of
 * megabytes, so it's written a slice at a time instead of in one JSON.stringify that would freeze the page.
 */
export async function folderAnnouncement(
  request: { chatId: string; replyToId?: string; attachment: { name: string; size: number; mimeType: string; live: boolean } },
  files: FolderFile[],
): Promise<Blob> {
  // The attachment goes last, so the request's closing "}}" is where the folder goes.
  const { attachment, ...rest } = request;
  const head = JSON.stringify({ ...rest, attachment });
  const parts: string[] = [`${head.slice(0, -2)},"folder":{"files":[`];
  const breathe = breather();
  for (let i = 0; i < files.length; i++) {
    parts.push(i ? `,${JSON.stringify(files[i])}` : JSON.stringify(files[i]));
    await breathe();
  }
  parts.push("]}}}");
  return new Blob(parts, { type: "application/json" });
}
