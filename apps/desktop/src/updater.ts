import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, constants, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Where updates are kept until they are installed. */
const UPDATE_DIR = join(tmpdir(), "landrop-update");

/**
 * Downloads an installer, reporting how far it got, and checks it against the release's checksum when GitHub
 * gives one. A partial or altered file is deleted rather than ever being run.
 */
export async function downloadInstaller(
  url: string,
  sha256: string | undefined,
  onProgress: (received: number, total: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`The download failed (${response.status})`);
  const total = Number(response.headers.get("content-length")) || 0;
  await rm(UPDATE_DIR, { recursive: true, force: true });
  await mkdir(UPDATE_DIR, { recursive: true });
  const file = join(UPDATE_DIR, basename(new URL(url).pathname));
  const hash = createHash("sha256");
  let received = 0;
  let lastReport = 0;
  const count = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      received += chunk.length;
      hash.update(chunk);
      // A few reports a second is plenty for a progress bar.
      if (Date.now() - lastReport > 150) {
        lastReport = Date.now();
        onProgress(received, total);
      }
      done(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body as never), count, createWriteStream(file), { signal });
    if (total && received !== total) throw new Error("The download was cut short");
    if (sha256 && hash.digest("hex") !== sha256) throw new Error("The download didn't match its checksum");
  } catch (err) {
    await rm(file, { force: true });
    throw err;
  }
  onProgress(received, total || received);
  return file;
}

/** The checksum GitHub lists for a release file ("sha256:…"), if it lists one. */
export function checksumOf(digest: string | undefined): string | undefined {
  return /^sha256:([0-9a-f]{64})$/.exec(digest ?? "")?.[1];
}

/** The .app that is running, e.g. /Applications/LANDrop.app. */
export const runningBundle = () => dirname(dirname(dirname(process.execPath)));

/** Whether this copy can be replaced where it sits: not run from a disk image, not read-only. */
export async function canReplaceInPlace(bundle: string): Promise<boolean> {
  if (bundle.startsWith("/Volumes/") || bundle.includes("/AppTranslocation/")) return false;
  try {
    await access(dirname(bundle), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Waits for LANDrop to exit, copies the app out of the disk image over the old one, and opens it. The
// downloaded file never had the browser's quarantine mark, so macOS doesn't ask about it again. If any
// step fails the old app is left alone and the disk image is opened for a manual drag.
const MAC_INSTALL = `
dmg="$1"; target="$2"; pid="$3"
while kill -0 "$pid" 2>/dev/null; do sleep 0.3; done
mnt=$(mktemp -d /tmp/landrop-mnt.XXXXXX)
if hdiutil attach -nobrowse -readonly -noverify -mountpoint "$mnt" "$dmg" >/dev/null 2>&1; then
  src=$(ls -d "$mnt"/*.app 2>/dev/null | head -1)
  if [ -n "$src" ] && rm -rf "$target.new" && ditto "$src" "$target.new" && rm -rf "$target" && mv "$target.new" "$target"; then
    hdiutil detach "$mnt" -quiet; rmdir "$mnt"; rm -f "$dmg"; open "$target"; exit 0
  fi
  hdiutil detach "$mnt" -quiet
fi
rmdir "$mnt"
open "$dmg"
`;

/** Replaces the installed app with the downloaded one after this process exits, then opens it. */
export function installOnMac(dmg: string, bundle: string): void {
  spawn("/bin/sh", ["-c", MAC_INSTALL, "landrop-update", dmg, bundle, String(process.pid)], { detached: true, stdio: "ignore" }).unref();
}

/** Runs the Windows installer silently; it closes LANDrop, replaces it and starts the new one. */
export function installOnWindows(installer: string): void {
  spawn(installer, ["/S", "--force-run"], { detached: true, stdio: "ignore" }).unref();
}
