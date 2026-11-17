import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { joinUrls } from "@landrop/lan-server/app";
import { startHost } from "@landrop/lan-server/host";
import { DEFAULT_LAN_PORT } from "@landrop/protocol";
import { BrowserWindow, Menu, Tray, app, dialog, powerMonitor, powerSaveBlocker, shell } from "electron";
import QRCode from "qrcode";

/**
 * LANDrop for Mac: runs the LANDrop host from the menu bar, so phones on this Wi-Fi can reach it
 * whenever the Mac is awake. With the user's permission it starts at login and keeps the Mac
 * from idling to sleep while plugged in.
 */

const PORT = DEFAULT_LAN_PORT;
// The same place `npm start` uses, so history is shared whichever way LANDrop runs. Each network gets its own folder in it.
const DATA_DIR = join(homedir(), ".landrop");
const WEB_DIR = app.isPackaged ? join(process.resourcesPath, "web") : join(__dirname, "../../web/out");
const ICON = join(__dirname, "../assets/trayTemplate.png");

interface Settings {
  askedAboutLogin: boolean;
  keepAwake: boolean;
}

const settingsFile = () => join(app.getPath("userData"), "settings.json");
let settings: Settings = { askedAboutLogin: false, keepAwake: false };
let tray: Tray | undefined;
let qrWindow: BrowserWindow | undefined;
let chatWindow: BrowserWindow | undefined;
let awakeBlocker: number | undefined;

// Settings and the chat window's storage live in "Application Support/LANDrop", not under the package's name.
app.setPath("userData", join(app.getPath("appData"), "LANDrop"));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Opening LANDrop again (from Finder or Launchpad) brings up the QR code.
  app.on("second-instance", () => void showQr());
  // Closing windows leaves LANDrop running in the menu bar.
  app.on("window-all-closed", () => {});
  app.whenReady().then(start, (err) => fail(err));
}

async function start() {
  try {
    settings = { ...settings, ...JSON.parse(readFileSync(settingsFile(), "utf8")) };
  } catch {
    // First run: defaults.
  }

  let server: Awaited<ReturnType<typeof startHost>>;
  try {
    server = await startHost({
      dataDir: DATA_DIR,
      port: PORT,
      webDir: existsSync(join(WEB_DIR, "index.html")) ? WEB_DIR : undefined,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EADDRINUSE") return fail(err);
    dialog.showErrorBox(
      "LANDrop is already running",
      `Another copy of LANDrop (perhaps started from Terminal) is using port ${PORT}. Quit it, then open LANDrop again.`,
    );
    return app.exit(1);
  }
  app.on("will-quit", () => void server.close());

  tray = new Tray(ICON);
  tray.setToolTip("LANDrop");
  // Built on every click, so the address and checkboxes are always current.
  const popUp = () => tray?.popUpContextMenu(menu());
  tray.on("click", popUp);
  tray.on("right-click", popUp);

  powerMonitor.on("on-ac", updateKeepAwake);
  powerMonitor.on("on-battery", updateKeepAwake);
  updateKeepAwake();

  if (app.isPackaged && !settings.askedAboutLogin) await askAboutLogin();
  // Started by the Mac at login: stay quietly in the menu bar.
  if (!app.getLoginItemSettings().wasOpenedAtLogin) await showQr();
}

function menu(): Menu {
  const urls = joinUrls(PORT);
  return Menu.buildFromTemplate([
    {
      label: urls.length ? `Running at ${urls[0].replace("http://", "")}` : "Not connected to a network",
      enabled: false,
    },
    { label: "Show QR Code to Join…", click: () => void showQr() },
    { label: "Open LANDrop", click: openChat },
    { type: "separator" },
    {
      label: "Start at Login",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      // Only the installed app can be a login item; a development build would register Electron itself.
      enabled: app.isPackaged,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    {
      label: "Keep Mac Awake While Plugged In",
      type: "checkbox",
      checked: settings.keepAwake,
      click: (item) => {
        settings.keepAwake = item.checked;
        saveSettings();
        updateKeepAwake();
      },
    },
    { type: "separator" },
    { label: "Quit LANDrop", click: () => app.quit() },
  ]);
}

async function askAboutLogin() {
  const { response } = await dialog.showMessageBox({
    type: "question",
    message: "Start LANDrop when you log in?",
    detail:
      "LANDrop runs quietly in the menu bar, so phones on this Wi-Fi can reach it whenever this Mac is awake. You can change this anytime from the menu bar icon.",
    buttons: ["Start at Login", "Not Now"],
    defaultId: 0,
    cancelId: 1,
  });
  app.setLoginItemSettings({ openAtLogin: response === 0 });
  settings.askedAboutLogin = true;
  saveSettings();
}

/** Stops idle sleep while on power, if the user asked; a closed lid still sleeps, which macOS doesn't let apps prevent. */
function updateKeepAwake() {
  const wanted = settings.keepAwake && !powerMonitor.isOnBatteryPower();
  if (wanted && awakeBlocker === undefined) awakeBlocker = powerSaveBlocker.start("prevent-app-suspension");
  if (!wanted && awakeBlocker !== undefined) {
    powerSaveBlocker.stop(awakeBlocker);
    awakeBlocker = undefined;
  }
}

function saveSettings() {
  writeFileSync(settingsFile(), JSON.stringify(settings));
}

async function showQr() {
  if (qrWindow) {
    qrWindow.show();
    app.focus({ steal: true });
    return;
  }
  const urls = joinUrls(PORT);
  const qr = urls[0] && (await QRCode.toDataURL(urls[0], { margin: 1, width: 480, errorCorrectionLevel: "M" }));
  qrWindow = new BrowserWindow({ width: 340, height: 540, resizable: false, title: "Join LANDrop", show: false });
  qrWindow.on("closed", () => (qrWindow = undefined));
  qrWindow.once("ready-to-show", () => {
    qrWindow?.show();
    app.focus({ steal: true });
  });
  await qrWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(qrPage(urls, qr))}`);
}

function openChat() {
  if (chatWindow) {
    chatWindow.show();
    app.focus({ steal: true });
    return;
  }
  chatWindow = new BrowserWindow({ width: 1100, height: 760, title: "LANDrop" });
  chatWindow.on("closed", () => (chatWindow = undefined));
  // Links to other sites open in the browser, not inside LANDrop.
  chatWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  void chatWindow.loadURL(`http://localhost:${PORT}/`);
  app.focus({ steal: true });
}

/** The QR window's page. Addresses are this Mac's own IPv4 addresses, so nothing here needs escaping. */
function qrPage(urls: string[], qr: string | undefined): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Join LANDrop</title>
<style>
  :root { color-scheme: light dark; --muted: #6e6e73; }
  @media (prefers-color-scheme: dark) { :root { --muted: #98989d; } }
  body { margin: 0; padding: 24px 20px; font: 13px -apple-system, system-ui, sans-serif; text-align: center; background: Canvas; color: CanvasText; user-select: none; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  p { color: var(--muted); margin: 4px 0; line-height: 1.4; }
  .qr { margin: 16px auto 12px; width: 240px; height: 240px; padding: 8px; background: #fff; border-radius: 12px; box-sizing: border-box; }
  .qr img { width: 100%; height: 100%; image-rendering: pixelated; }
  .url { font: 13px ui-monospace, monospace; color: CanvasText; user-select: text; }
  .help { margin-top: 16px; font-size: 12px; }
</style></head><body>
  <h1>Join LANDrop</h1>
  ${
    qr
      ? `<p>Scan with a phone camera. It must be on the same Wi-Fi as this Mac.</p>
  <div class="qr"><img src="${qr}" alt="QR code for ${urls[0]}"></div>
  ${urls.map((u) => `<p class="url">${u.replace("http://", "")}</p>`).join("")}
  <p class="help">Can't open it on Android? In Chrome, turn off Settings → Privacy and security → Always use secure connections.</p>`
      : `<p>This Mac isn't connected to a network. Join a Wi-Fi network, then open this again.</p>`
  }
  <p class="help">LANDrop keeps running in the menu bar when you close this window.</p>
</body></html>`;
}

function fail(err: unknown) {
  dialog.showErrorBox("LANDrop couldn't start", err instanceof Error ? err.message : String(err));
  app.exit(1);
}
