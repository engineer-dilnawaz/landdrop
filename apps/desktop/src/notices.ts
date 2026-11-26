import type { Message } from "@landrop/protocol";

/** What a new-message notification says. `preview: false` hides the message itself, for shared screens. */
export function describeMessage(
  { message, groupName }: { message: Message; groupName?: string },
  preview: boolean,
): { title: string; body: string } {
  const title = groupName ? `${message.senderName} in ${groupName}` : message.senderName;
  if (!preview) return { title, body: "New message" };
  const { attachment, text } = message;
  if (!attachment) return { title, body: text ?? "New message" };
  if (attachment.folder) return { title, body: `Shared a folder: ${attachment.name}` };
  if (attachment.mimeType.startsWith("image/")) return { title, body: "Sent a photo" };
  if (attachment.mimeType.startsWith("video/")) return { title, body: "Sent a video" };
  if (attachment.mimeType.startsWith("audio/")) return { title, body: "Sent an audio message" };
  return { title, body: `Sent a file: ${attachment.name}` };
}

export interface Release {
  version: string;
  /** The release page, the fallback when no installer for this computer is attached. */
  url: string;
  /** Direct link to this computer's installer, when the release has one. */
  installerUrl?: string;
  /** The release notes boiled down to a short list of what changed. */
  highlights: string[];
}

/** The installer a release attaches for this computer, named like LANDrop-mac-arm64.dmg. */
function installerName(platform: NodeJS.Platform, arch: string): string | undefined {
  if (platform === "darwin") return `LANDrop-mac-${arch === "arm64" ? "arm64" : "x64"}.dmg`;
  if (platform === "win32") return "LANDrop-win-x64.exe";
  return undefined;
}

/** Turns GitHub release notes into plain bullet points: drops headings, authors, links and the changelog footer. */
export function highlightsOf(notes: string | null | undefined): string[] {
  return (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[*-]\s/.test(line))
    .map((line) =>
      line
        .replace(/^[*-]\s+/, "")
        .replace(/\s+by @\S+ in \S+$/, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 8);
}

export function releaseFrom(
  json: { tag_name: string; html_url: string; body?: string | null; assets?: { name: string; browser_download_url: string }[] },
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): Release {
  const wanted = installerName(platform, arch);
  return {
    version: json.tag_name.replace(/^v/, ""),
    url: json.html_url,
    installerUrl: json.assets?.find((a) => a.name === wanted)?.browser_download_url,
    highlights: highlightsOf(json.body),
  };
}

/** Compares dotted version numbers, like 0.1.10 and 0.1.9. */
export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}
