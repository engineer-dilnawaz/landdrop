/** One thing a release added, with a way to try it. */
export interface Feature {
  title: string;
  description: string;
  /** What to do to see it working. */
  tryIt: string;
}

/** What each release added, newest first. Add an entry here when a release ships something people will notice. */
export const RELEASES: { version: string; features: Feature[] }[] = [
  {
    version: "0.2.5",
    features: [
      {
        title: "Updates without leaving LANDrop",
        description: "Check for Updates now downloads the new version here, with progress at the top of the window, then restarts into it.",
        tryIt: "Open the LANDrop menu and choose Check for Updates.",
      },
      {
        title: "Pins everyone in the chat can see",
        description: "A pinned message shows on both devices in a private chat or group. Pinning chats to the top of your list stays your own choice.",
        tryIt: "Press and hold a message and choose Pin, then look at the other device.",
      },
      {
        title: "A name for the whole Wi-Fi chat",
        description: "Rename the chat everyone shares and every connected device sees the new name.",
        tryIt: "Open the chat menu and choose Rename chat.",
      },
      {
        title: "Install LANDrop on your phone",
        description: "Add LANDrop to your home screen so it opens like an app, full screen.",
        tryIt: "Open LANDrop on your phone and tap Install on the banner, or Settings → Install app.",
      },
      {
        title: "A tidier device list",
        description: "Devices that have been away for a week and have no chat with you are forgotten, so old test phones stop piling up.",
        tryIt: "Open Devices; only the phones and computers you actually use are listed.",
      },
    ],
  },
  {
    version: "0.2.4",
    features: [
      {
        title: "Sweet animal avatars",
        description: "Twenty friendly animals to choose from: a panda, a fox, a deer and more.",
        tryIt: "Settings → Profile → pick one, or tap See all 20.",
      },
      {
        title: "Frame your own photo",
        description: "Pick a photo and choose exactly which part becomes your picture: drag to move it, slide to zoom.",
        tryIt: "Settings → Profile → Use your own photo.",
      },
      {
        title: "A viewer for code, cURL and Markdown",
        description: "Paste code, a cURL command or Markdown and open it full screen, coloured for its language, ready to copy.",
        tryIt: 'Paste curl https://example.com -H "Accept: application/json" into a chat, send it, then tap View cURL.',
      },
      {
        title: "Open up JSON",
        description: "In the JSON viewer, tap a folded “… 3 keys” to unfold that object.",
        tryIt: "Send a .json file and open it.",
      },
      {
        title: "Name your group chat",
        description: "The shared chat is now the Wi-Fi Lounge, and you can call it anything.",
        tryIt: "Open the chat menu and choose Rename chat.",
      },
    ],
  },
];

function newer(a: string, b: string): boolean {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

/** Everything added after `previous` up to `current`, newest release first. */
export function releasesSince(previous: string, current: string) {
  return RELEASES.filter((r) => newer(r.version, previous) && !newer(r.version, current));
}
