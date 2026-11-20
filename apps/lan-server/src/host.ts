import { existsSync } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { buildApp, type AppOptions } from "./app.js";
import { currentNetwork, type Network } from "./network.js";

/** How often the host checks whether this computer has moved to another network. */
const NETWORK_CHECK_MS = 10_000;
/** Where history goes while the computer isn't on any network. */
const NO_NETWORK = "no-network";

type HostOptions = Omit<AppOptions, "dataDir"> & {
  /** Each network's history is kept in its own folder under here. */
  dataDir: string;
  port: number;
  readNetwork?: () => Promise<Network | undefined>;
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
  readNetwork = currentNetwork,
  checkMs = NETWORK_CHECK_MS,
  onNetworkChange,
  ...options
}: HostOptions) {
  let network = await readNetwork();
  let current = network ? idOf(network) : NO_NETWORK;
  await adoptLegacyHistory(dataDir, current);
  const open = async (id: string) => {
    if (network) await adoptHistoryByAddress(dataDir, network);
    const app = await buildApp({ ...options, dataDir: join(dataDir, "networks", id) });
    await app.listen({ host: "0.0.0.0", port });
    return app;
  };
  // Undefined only if reopening after a network change failed; the next check tries again.
  let app: Awaited<ReturnType<typeof open>> | undefined = await open(current);

  let switching: Promise<void> | undefined;
  const check = async () => {
    const seen = await readNetwork();
    // Briefly losing Wi-Fi isn't joining another network; wait to see where the computer ends up.
    if (!seen) return;
    // Nor is a moment when the router's hardware address can't be read, while its address is unchanged.
    const sameRouter = !seen.router && network?.router && seen.gateway === network.gateway;
    const next = sameRouter ? current : idOf(seen);
    if (next === current && app) return;
    await app?.close();
    app = undefined;
    network = seen;
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

/** A network's folder name: its router's hardware address, or only its address when that can't be read. */
const idOf = ({ router, gateway }: Network) => (router ?? gateway).replace(/[:.]/g, "-");

/**
 * History kept while the router's hardware address couldn't be read (macOS hadn't given Local
 * Network access) is under the router's address. Once the hardware address is known, that history
 * moves to it, so it isn't left behind, and the address alone no longer stands for this network.
 */
async function adoptHistoryByAddress(dataDir: string, network: Network): Promise<void> {
  if (!network.router) return;
  const byAddress = join(dataDir, "networks", idOf({ gateway: network.gateway }));
  const byRouter = join(dataDir, "networks", idOf(network));
  if (existsSync(byAddress) && !existsSync(byRouter)) await rename(byAddress, byRouter);
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
