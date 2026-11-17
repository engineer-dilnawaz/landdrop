import type { FolderFile, FolderListing } from "@landrop/protocol";

/**
 * A shared folder's files, indexed for opening: what's in each subfolder, and where each file's
 * bytes start (the files are sent back to back, in list order). Built once per folder.
 */
export class FolderIndex {
  private readonly byPath = new Map<string, { file: FolderFile; start: number }>();

  constructor(readonly files: FolderFile[]) {
    let start = 0;
    for (const file of files) {
      this.byPath.set(file.path, { file, start });
      start += file.size;
    }
  }

  /** A file and where its bytes start, or undefined if the folder has no such file. */
  find(path: string): { file: FolderFile; start: number } | undefined {
    return this.byPath.get(path);
  }

  /** What's directly inside `dir` ("" for the top), sorted by name the way people expect (2 before 10). */
  list(dir: string): FolderListing {
    const prefix = dir ? `${dir}/` : "";
    const folders = new Map<string, { files: number; size: number }>();
    const files: FolderFile[] = [];
    for (const file of this.files) {
      if (!file.path.startsWith(prefix)) continue;
      const slash = file.path.indexOf("/", prefix.length);
      if (slash === -1) files.push(file);
      else {
        const name = file.path.slice(prefix.length, slash);
        const folder = folders.get(name) ?? { files: 0, size: 0 };
        folders.set(name, { files: folder.files + 1, size: folder.size + file.size });
      }
    }
    const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
    return {
      folders: [...folders].map(([name, f]) => ({ name, ...f })).sort((a, b) => byName(a.name, b.name)),
      files: files.sort((a, b) => byName(a.path, b.path)),
    };
  }
}
