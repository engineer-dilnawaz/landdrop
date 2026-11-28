/**
 * The anonymous usage ping: a small count of how LANDrop is used, sent about once a day so its author can see
 * whether it helps people and what to improve. It never contains a message, a file or its name, a device name,
 * or an address. What it does contain is listed on the website's privacy page, and the menu can turn it off.
 */
export interface UsagePing {
  /** A random number made on this computer. It identifies no one, and only tells installs apart. */
  id: string;
  version: string;
  os: string;
  arch: string;
  /** Other devices that connected in the last 24 hours, and how many messages and files were sent: counts only. */
  guests: number;
  messages: number;
  files: number;
  /** Those guest devices by kind of device, as counts only: iPhone or iPad, Android, computer, other. */
  platforms: { ios: number; android: number; desktop: number; other: number };
}

export async function sendUsagePing(url: string, ping: UsagePing): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ping),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Offline, or the service is down. LANDrop works the same, and tomorrow's ping tries again.
  }
}

/** Passes feedback someone wrote on to the developer's website. Returns whether it was accepted. */
export async function sendFeedback(url: string, feedback: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
