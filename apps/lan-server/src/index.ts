import { networkInterfaces, homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_LAN_PORT } from "@landrop/protocol";
import { buildApp } from "./app.js";

const port = Number(process.env.LANDROP_PORT ?? DEFAULT_LAN_PORT);
const webPort = Number(process.env.LANDROP_WEB_PORT ?? 3000);

// Chat history and attachments are kept here until the host clears the chat.
const dataDir = process.env.LANDROP_DATA_DIR ?? join(homedir(), ".landrop");
const app = await buildApp({ dataDir, logger: true });
await app.listen({ host: "0.0.0.0", port });

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);
console.log(
  lanAddresses.length
    ? `\nLANDrop is running. Open on any device on this network:\n${lanAddresses.map((a) => `  http://${a}:${webPort}`).join("\n")}\n`
    : "\nLANDrop is running, but no LAN interface was found. Is this machine on a network?\n",
);

const shutdown = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
