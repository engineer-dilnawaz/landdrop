// Draws LANDrop's icon (a drop under Wi-Fi waves) and writes every size the Mac app, the chat app
// and the website use. Run with Electron, which renders the SVG: `npm run icons`.
const { app, BrowserWindow } = require("electron");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "../../..");

/**
 * The icon on a 1024 grid. `inset` and `radius` shape the blue tile: the Mac app uses Apple's grid
 * (a rounded square with a margin); browser icons fill their square. Small icons get one bold wave,
 * as two thin ones blur together. `mono` is the black menu bar version, which macOS recolours.
 */
function svg({ inset = 0, radius = 0, waves = 2, mono = false }) {
  const tile = 1024 - inset * 2;
  // Drop and waves are drawn for the Mac grid's 824 tile, then scaled to fill this tile.
  const k = tile / 824;
  const fg = mono ? "#000" : "#fff";
  const arcs =
    waves === 2
      ? `<path d="M190 320 A260 260 0 0 1 634 320" opacity="${mono ? 1 : 0.55}"/>
         <path d="M115 230 A360 360 0 0 1 709 230" opacity="${mono ? 1 : 0.3}"/>`
      : `<path d="M160 300 A300 300 0 0 1 664 300" stroke-width="64" opacity="${mono ? 1 : 0.6}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3ff"/><stop offset="1" stop-color="#0066e0"/></linearGradient></defs>
  ${mono ? "" : `<rect x="${inset}" y="${inset}" width="${tile}" height="${tile}" rx="${radius}" fill="url(#g)"/>`}
  <g transform="translate(${inset} ${inset}) scale(${k})">
    <path d="M412 230 C412 230 285 400 285 485 A127 127 0 0 0 539 485 C539 400 412 230 412 230 Z" fill="${fg}"/>
    <g fill="none" stroke="${fg}" stroke-linecap="round" stroke-width="44">${arcs}</g>
  </g>
</svg>`;
}

const mac = svg({ inset: 100, radius: 185 });
const favicon = svg({ radius: 230, waves: 1 });
// iOS rounds home screen icons itself and needs an opaque square.
const touch = svg({});
const tray = svg({ waves: 1, mono: true });

/** One hidden window draws every size, top-left, and each is captured from there. */
let win;
async function render(source, size, out) {
  const page = `<html><body style="margin:0;background:transparent"><img width="${size}" height="${size}" src="data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}"></body></html>`;
  await win.loadURL(`data:text/html;base64,${Buffer.from(page).toString("base64")}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  writeFileSync(join(root, out), image.toPNG());
}

app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true },
  });
  writeFileSync(join(root, "apps/web/app/icon.svg"), favicon);
  writeFileSync(join(root, "site/icon.svg"), favicon);
  await render(mac, 1024, "apps/desktop/assets/icon.png");
  await render(touch, 180, "apps/web/app/apple-icon.png");
  await render(touch, 180, "site/apple-touch-icon.png");
  await render(tray, 18, "apps/desktop/assets/trayTemplate.png");
  await render(tray, 36, "apps/desktop/assets/trayTemplate@2x.png");
  app.quit();
});
