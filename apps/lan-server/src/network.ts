import { execFile } from "node:child_process";
import dgram from "node:dgram";
import { lookupService } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import type { NetworkDevice } from "@landrop/protocol";

/** Larger networks are only scanned around this machine, so a scan stays a few hundred packets. */
const MAX_SCAN_HOSTS = 1024;
/** How long devices get to answer the knock before the neighbour table is read. */
const ANSWER_MS = 1500;
const NAME_TIMEOUT_MS = 1500;

/**
 * Finds the devices on this machine's networks the way "who's on my Wi-Fi" apps do, without the
 * router's password: knock on every address so the system learns who is there, then read its
 * neighbour (ARP) table. Names come from the system resolver, which asks the router's DNS and,
 * on macOS, Bonjour; many phones announce neither, and they appear by address alone.
 */
export async function scanNetwork(): Promise<NetworkDevice[]> {
  const subnets = localSubnets();
  await knock(subnets.flatMap(hostsOf));
  const own = new Set(subnets.map((s) => s.address));
  const found = parseNeighbours(await readNeighbours()).filter(
    (n) => !own.has(n.address) && subnets.some((s) => inSubnet(n.address, s)),
  );
  return Promise.all(found.map(async ({ address }) => ({ address, name: await nameOf(address) })));
}

interface Subnet {
  address: string;
  netmask: string;
}

function localSubnets(): Subnet[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => ({ address: n!.address, netmask: n!.netmask }));
}

const toInt = (ip: string) => ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
const toIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");

function inSubnet(ip: string, { address, netmask }: Subnet): boolean {
  const mask = toInt(netmask);
  return ((toInt(ip) & mask) >>> 0) === ((toInt(address) & mask) >>> 0);
}

/** Every host address in the subnet, or the /24 around this machine when the subnet is huge. */
export function hostsOf({ address, netmask }: Subnet): string[] {
  let mask = toInt(netmask);
  if (~mask >>> 0 >= MAX_SCAN_HOSTS) mask = 0xffffff00;
  const network = (toInt(address) & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const hosts: string[] = [];
  for (let n = network + 1; n < broadcast; n++) hosts.push(toIp(n));
  return hosts;
}

/** An empty UDP packet to each address makes the system resolve its hardware address; whether anything answers doesn't matter. */
async function knock(hosts: string[]): Promise<void> {
  const socket = dgram.createSocket("udp4");
  socket.on("error", () => {}); // unreachable hosts are expected
  for (const host of hosts) socket.send(Buffer.alloc(0), 9, host, () => {}); // port 9: "discard"
  await new Promise((resolve) => setTimeout(resolve, ANSWER_MS));
  socket.close();
}

/** The hardware (MAC) address the system has seen for a nearby IPv4 address, if any. */
export async function hardwareAddressOf(address: string): Promise<string | undefined> {
  return parseNeighbours(await readNeighbours()).find((n) => n.address === address)?.mac;
}

async function readNeighbours(): Promise<string> {
  if (process.platform === "linux") return readFile("/proc/net/arp", "utf8").catch(() => "");
  const args = process.platform === "win32" ? ["-a"] : ["-an"];
  return new Promise((resolve) => execFile("arp", args, { timeout: 5000 }, (_err, stdout) => resolve(stdout ?? "")));
}

/**
 * The devices in a neighbour table, from `arp -an` (macOS), `arp -a` (Windows) or /proc/net/arp
 * (Linux): one address and hardware address per line. Addresses that haven't answered,
 * broadcast and multicast entries are skipped.
 */
export function parseNeighbours(table: string): { address: string; mac: string }[] {
  const seen = new Map<string, string>();
  for (const line of table.split("\n")) {
    const address = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)?.[1];
    const mac = line.match(/\b([0-9a-f]{1,2}(?:[:-][0-9a-f]{1,2}){5})\b/i)?.[1]?.toLowerCase().replace(/-/g, ":");
    if (!address || !mac || seen.has(address)) continue;
    const first = parseInt(mac.split(":")[0], 16);
    // 00:00:00:00:00:00 is Linux's "incomplete"; an odd first byte is multicast or broadcast.
    if (/^0{1,2}(:0{1,2}){5}$/.test(mac) || first & 1) continue;
    seen.set(address, mac);
  }
  return [...seen].map(([address, mac]) => ({ address, mac }));
}

async function nameOf(address: string): Promise<string | undefined> {
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, NAME_TIMEOUT_MS));
  const lookup = lookupService(address, 0).then(
    ({ hostname }) => (hostname === address ? undefined : hostname.replace(/\.(local|lan|home)\.?$/i, "")),
    () => undefined,
  );
  return Promise.race([lookup, timeout]);
}
