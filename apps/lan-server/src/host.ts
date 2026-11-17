import { existsSync } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { buildApp, type AppOptions } from "./app.js";
import { currentNetworkId } from "./network.js";

/** How often the host checks whether this computer has moved to another network. */
const NETWORK_CHECK_MS = 10_000;
/** Where history goes while the computer isn't on any network. */
const NO_NETWORK = "no-network";

type HostOptions = Omit<AppOptions, "dataDir"> & {
  /** Each network's history is kept in its own folder under here. */
  dataDir: string;
  port: number;
  networkId?: () => Promise<string | undefined>;
  checkMs?: number;
  onNetworkChange?: (networkId: string) => void;
};

/**
 * Runs LANDrop with a separate history for each network, so chats and files from home stay at
 * home when the computer joins another Wi-Fi, and come back when it returns. When the network
 * changes, the server restarts on the same port with that network's history; devices reconnect
 * on their own.
 */
export async function startHost({
  dataDir,
  port,
  networkId = currentNetworkId,
  checkMs = NETWORK_CHECK_MS,
  onNetworkChange,
  ...options
}: HostOptions) {
  let current = (await networkId()) ?? NO_NETWORK;
  await adoptLegacyHistory(dataDir, current);
  const open = async (id: string) => {
    const app = await buildApp({ ...options, dataDir: join(dataDir, "networks", id) });
    await app.listen({ host: "0.0.0.0", port });
    return app;
  };
  // Undefined only if reopening after a network change failed; the next check tries again.
  let app: Awaited<ReturnType<typeof open>> | undefined = await open(current);

  let switching: Promise<void> | undefined;
  const check = async () => {
    const next = await networkId();
    // Briefly losing Wi-Fi isn't joining another network; wait to see where the computer ends up.
    if (!next || (next === current && app)) return;
    await app?.close();
    app = undefined;
    app = await open(next);
    current = next;
    onNetworkChange?.(current);
  };
  const timer = setInterval(() => {
    switching ??= check()
      .catch((err) => console.error("LANDrop couldn't switch to the new network's history:", err))
      .finally(() => (switching = undefined));
  }, checkMs);
  timer.unref();

  return {
    networkId: () => current,
    async close() {
      clearInterval(timer);
      await switching;
      await app?.close();
    },
  };
}

/**
 * History from before it was kept per network sits directly in the data folder. It belongs to
 * the network the computer is on when it first starts with this version.
 */
async function adoptLegacyHistory(dataDir: string, networkId: string): Promise<void> {
  if (!existsSync(join(dataDir, "landrop.db")) || existsSync(join(dataDir, "networks"))) return;
  const target = join(dataDir, "networks", networkId);
  await mkdir(target, { recursive: true });
  for (const name of await readdir(dataDir)) {
    if (name === "files" || name.startsWith("landrop.db")) await rename(join(dataDir, name), join(target, name));
  }
}
