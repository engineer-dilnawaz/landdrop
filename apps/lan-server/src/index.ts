import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_LAN_PORT } from "@landrop/protocol";
import QRCode from "qrcode";
import { joinUrls } from "./app.js";
import { startHost } from "./host.js";

const port = Number(process.env.LANDROP_PORT ?? DEFAULT_LAN_PORT);

// Chat history and attachments are kept here, one folder per network, until the host clears the chat.
const dataDir = process.env.LANDROP_DATA_DIR ?? join(homedir(), ".landrop");
// The built web app (`npm run build`); without it the server runs API-only, for `next dev`.
const builtWeb = process.env.LANDROP_WEB_DIR ?? fileURLToPath(new URL("../../web/out", import.meta.url));
const webDir = existsSync(join(builtWeb, "index.html")) ? builtWeb : undefined;
const host = await startHost({
  dataDir,
  port,
  logger: true,
  webDir,
  onNetworkChange: (network) => console.log(`\nThis computer moved to another network (${network}); showing that network's history.\n`),
});

const urls = joinUrls(port);
if (!webDir) {
  console.log("\nLANDrop server is running without the app. Run `npm run build` first, or use `npm run dev` and open port 3000.\n");
} else if (!urls.length) {
  console.log("\nLANDrop is running, but no LAN interface was found. Is this machine on a network?\n");
} else {
  // Phones join by pointing the camera at this code.
  const qr = await QRCode.toString(urls[0], { type: "terminal", small: true });
  console.log(`\nLANDrop is running. Scan to join, or open on any device on this network:\n\n${qr}\n${urls.map((u) => `  ${u}`).join("\n")}\n`);
}

const shutdown = async () => {
  await host.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
