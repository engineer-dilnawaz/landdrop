import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { homedir, release, tmpdir } from "node:os";
import { join } from "node:path";
import { joinUrls } from "@landrop/lan-server/app";
import { startHost } from "@landrop/lan-server/host";
import { DEFAULT_LAN_PORT } from "@landrop/protocol";
import { BrowserWindow, Menu, Notification, Tray, app, nativeImage, clipboard, dialog, ipcMain, powerMonitor, powerSaveBlocker, shell, ShareMenu, type MenuItemConstructorOptions } from "electron";
import QRCode from "qrcode";
import { describeMessage, isNewer, releaseFrom, type Release } from "./notices";
import { MAX_SCREENSHOTS, parseReport, saveReport } from "./reports";

/**
 * LANDrop for Mac and Windows: runs the LANDrop host from the menu bar or system tray, so phones on this
 * Wi-Fi can reach it whenever the computer is awake. With the user's permission it starts at login and keeps
 * the computer from idling to sleep while plugged in.
 */

// Overridable like the terminal server's, so a development build can run beside the installed app.
const PORT = Number(process.env.LANDROP_PORT ?? DEFAULT_LAN_PORT);
// The same place `npm start` uses, so history is shared whichever way LANDrop runs. Each network gets its own folder in it.
const DATA_DIR = process.env.LANDROP_DATA_DIR ?? join(homedir(), ".landrop");
const WEB_DIR = app.isPackaged ? join(process.resourcesPath, "web") : join(__dirname, "../../web/out");
const MAC = process.platform === "darwin";
// The Mac menu bar tints a template image to match; the Windows tray needs the full-colour icon.
const ICON = MAC ? join(__dirname, "../assets/trayTemplate.png") : nativeImage.createFromPath(join(__dirname, "../assets/icon.png")).resize({ width: 32, height: 32 });
const COMPUTER = MAC ? "Mac" : "computer";
const TRAY = MAC ? "menu bar" : "system tray";
const REPO = "engineer-dilnawaz/landdrop";
const WEBSITE = "https://landdrop.vercel.app";

/** How often a running LANDrop looks for a newer release. */
const UPDATE_CHECK_MS = 6 * 60 * 60 * 1000;

interface Settings {
  askedAboutLogin: boolean;
  keepAwake: boolean;
  notifications: boolean;
  /** Show the message itself in notifications, not just that one arrived. */
  previews: boolean;
  /** The newest release the user was already told about, so each one is announced once. */
  announcedVersion?: string;
}

const settingsFile = () => join(app.getPath("userData"), "settings.json");
let settings: Settings = { askedAboutLogin: false, keepAwake: false, notifications: true, previews: true };
let availableUpdate: Release | undefined;
let tray: Tray | undefined;
let qrWindow: BrowserWindow | undefined;
let chatWindow: BrowserWindow | undefined;
let reportWindow: BrowserWindow | undefined;
let awakeBlocker: number | undefined;

// Settings and the chat window's storage live in "Application Support/LANDrop", not under the package's name.
// A development build gets its own, so it doesn't share settings or the single-instance lock with the installed app.
app.setPath("userData", join(app.getPath("appData"), app.isPackaged ? "LANDrop" : "LANDrop Dev"));

// Windows shows toasts under this name; without it they appear as "electron.app.LANDrop".
if (process.platform === "win32") app.setAppUserModelId("app.landrop.desktop");

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
      onMessage: notifyMessage,
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

  app.setAboutPanelOptions({
    applicationName: "LANDrop",
    applicationVersion: app.getVersion(),
    version: "",
    copyright: "© 2026 LANDrop",
    credits: "Share messages and files with every device on your Wi-Fi.",
  });
  // Rebuilt on focus, so its checkboxes match changes made from the menu bar icon.
  app.on("browser-window-focus", () => Menu.setApplicationMenu(appMenu()));
  Menu.setApplicationMenu(appMenu());
  ipcMain.handle("report:submit", (event, input) => {
    // Only the report form may save reports.
    if (event.sender !== reportWindow?.webContents) return false;
    const report = parseReport(input);
    if (!report) return false;
    saveReport(join(app.getPath("userData"), "reports.db"), report, {
      appVersion: app.getVersion(),
      osVersion: `${MAC ? "macOS" : process.platform} ${process.getSystemVersion()} (${release()})`,
    });
    return true;
  });
  // Only the chat window's settings page may read or change these.
  const notificationSettings = () => ({ notifications: settings.notifications, previews: settings.previews });
  ipcMain.handle("notifications:get", (event) => (event.sender === chatWindow?.webContents ? notificationSettings() : undefined));
  ipcMain.handle("notifications:set", (event, change: { notifications?: unknown; previews?: unknown }) => {
    if (event.sender !== chatWindow?.webContents) return undefined;
    if (typeof change?.notifications === "boolean") settings.notifications = change.notifications;
    if (typeof change?.previews === "boolean") settings.previews = change.previews;
    saveSettings();
    return notificationSettings();
  });
  ipcMain.handle("qr:save", async (event) => {
    if (!qrWindow || event.sender !== qrWindow.webContents || !joinUrls(PORT)[0]) return;
    const { filePath } = await dialog.showSaveDialog(qrWindow, {
      defaultPath: join(app.getPath("downloads"), "Join LANDrop.png"),
      filters: [{ name: "PNG image", extensions: ["png"] }],
    });
    if (filePath) await writeFile(filePath, await qrImage(joinUrls(PORT)[0]));
  });
  ipcMain.handle("qr:share", async (event) => {
    // The share sheet only exists on macOS; the QR page doesn't offer the button elsewhere.
    if (!MAC) return;
    const url = joinUrls(PORT)[0];
    if (!qrWindow || event.sender !== qrWindow.webContents || !url) return;
    // Shared as a file, so apps like Messages and AirDrop receive the image itself.
    const file = join(tmpdir(), "Join LANDrop.png");
    await writeFile(file, await qrImage(url));
    new ShareMenu({ filePaths: [file], texts: [`Join LANDrop on our Wi-Fi: ${url}`] }).popup({ window: qrWindow });
  });

  tray = new Tray(ICON);
  tray.setToolTip("LANDrop");
  // Built on every click, so the address and checkboxes are always current.
  const popUp = () => tray?.popUpContextMenu(menu());
  tray.on("click", popUp);
  tray.on("right-click", popUp);

  powerMonitor.on("on-ac", updateKeepAwake);
  powerMonitor.on("on-battery", updateKeepAwake);
  updateKeepAwake();

  void checkForUpdates({ quiet: true });
  setInterval(() => void checkForUpdates({ quiet: true }), UPDATE_CHECK_MS).unref();

  if (app.isPackaged && !settings.askedAboutLogin) await askAboutLogin();
  // Started by the Mac at login: stay quietly in the menu bar or tray.
  if (!app.getLoginItemSettings().wasOpenedAtLogin) await showQr();
}

function menu(): Menu {
  const urls = joinUrls(PORT);
  return Menu.buildFromTemplate([
    {
      label: urls.length ? `Running at ${urls[0].replace("http://", "")}` : "Not connected to a network",
      enabled: false,
    },
    ...quickActions(),
    { type: "separator" },
    ...optionItems(),
    { type: "separator" },
    ...(availableUpdate
      ? [{ label: `Update Available: LANDrop ${availableUpdate.version}…`, click: () => void showUpdate(availableUpdate!) } satisfies MenuItemConstructorOptions]
      : []),
    { label: "About LANDrop", click: () => app.showAboutPanel() },
    { label: "Check for Updates…", click: () => void checkForUpdates() },
    { type: "separator" },
    { label: "Quit LANDrop", click: () => app.quit() },
  ]);
}

function quickActions(): MenuItemConstructorOptions[] {
  return [
    { label: "Open LANDrop", accelerator: "CmdOrCtrl+O", click: openChat },
    { label: "Show QR Code to Join…", accelerator: "CmdOrCtrl+J", click: () => void showQr() },
    {
      label: "Copy Join Address",
      accelerator: "CmdOrCtrl+Shift+C",
      enabled: joinUrls(PORT).length > 0,
      click: () => clipboard.writeText(joinUrls(PORT)[0]),
    },
  ];
}

function optionItems(): MenuItemConstructorOptions[] {
  return [
    {
      label: "Start at Login",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      // Only the installed app can be a login item; a development build would register Electron itself.
      enabled: app.isPackaged,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    {
      label: "Notify Me About New Messages",
      type: "checkbox",
      checked: settings.notifications,
      click: (item) => {
        settings.notifications = item.checked;
        saveSettings();
      },
    },
    {
      label: "Show Message Text in Notifications",
      type: "checkbox",
      checked: settings.previews,
      enabled: settings.notifications,
      click: (item) => {
        settings.previews = item.checked;
        saveSettings();
      },
    },
    {
      label: `Keep ${COMPUTER === "Mac" ? "Mac" : "Computer"} Awake While Plugged In`,
      type: "checkbox",
      checked: settings.keepAwake,
      click: (item) => {
        settings.keepAwake = item.checked;
        saveSettings();
        updateKeepAwake();
      },
    },
  ];
}

/** The menu at the top of the screen, shown while a LANDrop window is open. */
function appMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: "LANDrop",
      submenu: [
        { label: "About LANDrop", click: () => app.showAboutPanel() },
        { label: "Check for Updates…", click: () => void checkForUpdates() },
        { type: "separator" },
        ...optionItems(),
        { type: "separator" },
        ...(MAC ? ([{ role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }] as const) : []),
        { label: "Quit LANDrop", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    { label: "File", submenu: [...quickActions(), { type: "separator" }, { role: "close" }] },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" } as const]),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "LANDrop Website", click: () => void shell.openExternal(WEBSITE) },
        { label: "Release Notes", click: () => void shell.openExternal(`https://github.com/${REPO}/releases`) },
        { label: "Report a Problem…", click: () => void showReportForm() },
      ],
    },
  ]);
}

/**
 * LANDrop lives in the menu bar, with no Dock icon or app menu. While one of its windows is open it
 * becomes a regular app, so the window can be found with Cmd-Tab and the menu at the top of the screen.
 */
function trackWindow(window: BrowserWindow) {
  void app.dock?.show();
  window.on("closed", () => {
    if (BrowserWindow.getAllWindows().length === 0) app.dock?.hide();
  });
}

/** Tells the user a message arrived, unless they're already looking at LANDrop. */
function notifyMessage(event: Parameters<typeof describeMessage>[0]) {
  if (!settings.notifications || !Notification.isSupported() || chatWindow?.isFocused()) return;
  const { title, body } = describeMessage(event, settings.previews);
  const notification = new Notification({ title, body });
  notification.on("click", openChat);
  notification.show();
}

/**
 * Asks GitHub for the latest release. A manual check always answers; the background one stays quiet
 * unless there is something new it hasn't announced yet. LANDrop itself never needs the internet.
 */
async function checkForUpdates({ quiet = false } = {}) {
  let latest: Release;
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    latest = releaseFrom((await response.json()) as Parameters<typeof releaseFrom>[0]);
  } catch {
    if (quiet) return;
    await dialog.showMessageBox({
      type: "warning",
      message: "Couldn't check for updates",
      detail: "Checking needs an internet connection. LANDrop itself keeps working on your Wi-Fi without one.",
    });
    return;
  }
  if (!isNewer(latest.version, app.getVersion())) {
    availableUpdate = undefined;
    if (!quiet) await dialog.showMessageBox({ message: "LANDrop is up to date", detail: `You have the latest version, ${app.getVersion()}.` });
    return;
  }
  availableUpdate = latest;
  if (!quiet) return showUpdate(latest);
  if (settings.announcedVersion === latest.version) return;
  settings.announcedVersion = latest.version;
  saveSettings();
  if (!Notification.isSupported()) return void showUpdate(latest);
  const notification = new Notification({ title: `LANDrop ${latest.version} is available`, body: "Click to see what's new." });
  notification.on("click", () => void showUpdate(latest));
  notification.show();
}

/** Shows what's new in a release and offers the installer for this computer. */
async function showUpdate(release: Release) {
  const { response } = await dialog.showMessageBox({
    message: `LANDrop ${release.version} is available`,
    detail: [
      `You have ${app.getVersion()}.`,
      ...(release.highlights.length ? ["", "What's new:", ...release.highlights.map((line) => `•  ${line}`)] : []),
      "",
      process.platform === "darwin"
        ? "Download it, quit LANDrop, then drag the new LANDrop into Applications."
        : "Download it, then run the installer. It replaces this version.",
    ].join("\n"),
    buttons: ["Download", "Later"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) void shell.openExternal(release.installerUrl ?? release.url);
}

async function askAboutLogin() {
  const { response } = await dialog.showMessageBox({
    type: "question",
    message: "Start LANDrop when you log in?",
    detail:
      `LANDrop runs quietly in the ${TRAY}, so phones on this Wi-Fi can reach it whenever this ${COMPUTER} is awake. You can change this anytime from the ${TRAY} icon.`,
    buttons: ["Start at Login", "Not Now"],
    defaultId: 0,
    cancelId: 1,
  });
  app.setLoginItemSettings({ openAtLogin: response === 0 });
  settings.askedAboutLogin = true;
  saveSettings();
}

/** Stops idle sleep while on power, if the user asked; a closed lid still sleeps, which neither macOS nor Windows lets apps prevent. */
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
  qrWindow = new BrowserWindow({
    width: 340,
    height: 590,
    resizable: false,
    title: "Join LANDrop",
    show: false,
    webPreferences: { preload: join(__dirname, "preload.cjs") },
  });
  qrWindow.on("closed", () => (qrWindow = undefined));
  trackWindow(qrWindow);
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
  chatWindow = new BrowserWindow({ width: 1100, height: 760, title: "LANDrop", webPreferences: { preload: join(__dirname, "preload.cjs") } });
  chatWindow.on("closed", () => (chatWindow = undefined));
  trackWindow(chatWindow);
  // Links to other sites open in the browser, not inside LANDrop.
  chatWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  void chatWindow.loadURL(`http://localhost:${PORT}/`);
  app.focus({ steal: true });
}

/** The join QR code as a PNG, the same code the QR window shows. */
function qrImage(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { margin: 2, width: 960, errorCorrectionLevel: "M" });
}

async function showReportForm() {
  if (reportWindow) {
    reportWindow.show();
    app.focus({ steal: true });
    return;
  }
  reportWindow = new BrowserWindow({
    width: 460,
    height: 680,
    resizable: false,
    title: "Report a Problem",
    show: false,
    webPreferences: { preload: join(__dirname, "preload.cjs") },
  });
  reportWindow.on("closed", () => (reportWindow = undefined));
  trackWindow(reportWindow);
  reportWindow.once("ready-to-show", () => {
    reportWindow?.show();
    app.focus({ steal: true });
  });
  await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(reportPage())}`);
}

/** The report form. Everything typed goes through the preload's submitReport, which the main process checks. */
function reportPage(): string {
  const about = `LANDrop ${app.getVersion()} · macOS ${process.getSystemVersion()}`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Report a Problem</title>
<style>
  :root { color-scheme: light dark; --muted: #6e6e73; --field: #fff; --line: #d2d2d7; --accent: #00a884; }
  @media (prefers-color-scheme: dark) { :root { --muted: #98989d; --field: #2c2c2e; --line: #3a3a3c; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px 24px; font: 13px -apple-system, system-ui, sans-serif; background: Canvas; color: CanvasText; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  p { color: var(--muted); margin: 0; line-height: 1.4; }
  label { display: block; margin-top: 16px; font-weight: 500; }
  .kinds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 8px; padding: 3px; border-radius: 9px; background: var(--line); }
  .kinds input { position: absolute; opacity: 0; }
  .kinds span { display: block; padding: 5px 0; text-align: center; border-radius: 7px; cursor: default; font-weight: 400; }
  .kinds input:checked + span { background: var(--field); font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
  .kinds input:focus-visible + span { outline: 2px solid var(--accent); }
  input[type=text], input[type=email], textarea { display: block; width: 100%; margin-top: 6px; padding: 7px 9px; font: inherit; color: inherit;
    background: var(--field); border: 1px solid var(--line); border-radius: 7px; outline: none; }
  input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
  textarea { height: 150px; resize: none; }
  .about { margin-top: 14px; font-size: 12px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  button { font: inherit; padding: 6px 16px; border-radius: 7px; border: 1px solid var(--line); background: var(--field); color: inherit; }
  button[type=submit] { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 500; }
  button:disabled { opacity: .5; }
  .shots { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; align-items: center; }
  .shot { position: relative; width: 72px; height: 54px; border-radius: 6px; overflow: hidden; border: 1px solid var(--line); }
  .shot img { width: 100%; height: 100%; object-fit: cover; }
  .shot button { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; padding: 0; border-radius: 50%; border: 0;
    background: rgba(0,0,0,.6); color: #fff; font-size: 12px; line-height: 18px; }
  .hint { font-size: 12px; }
  body.dragging form { outline: 2px dashed var(--accent); outline-offset: -8px; border-radius: 10px; }
  .error { color: #e5484d; margin-top: 10px; display: none; }
  .done { display: none; text-align: center; padding-top: 140px; }
  .done h1 { margin-bottom: 8px; }
  body.sent form { display: none; } body.sent .done { display: block; }
</style></head><body>
  <form id="form">
    <h1>Report a Problem</h1>
    <p>Tell us what went wrong or what you'd like LANDrop to do.</p>
    <div class="kinds" role="radiogroup" aria-label="Type">
      <label style="margin:0"><input type="radio" name="kind" value="problem" checked><span>Problem</span></label>
      <label style="margin:0"><input type="radio" name="kind" value="idea"><span>Idea</span></label>
      <label style="margin:0"><input type="radio" name="kind" value="other"><span>Other</span></label>
    </div>
    <label>Summary<input type="text" name="summary" maxlength="200" required placeholder="Photos from my phone don't arrive" autofocus></label>
    <label>What happened<textarea name="details" maxlength="5000" placeholder="What you did, what you expected, and what happened instead."></textarea></label>
    <label>Email <span style="color:var(--muted);font-weight:400">(optional, if you'd like a reply)</span><input type="email" name="contact" maxlength="200" placeholder="you@example.com"></label>
    <label>Screenshots <span style="color:var(--muted);font-weight:400">(optional, up to ${MAX_SCREENSHOTS})</span></label>
    <div class="shots" id="shots">
      <button type="button" id="attach">Attach Screenshot…</button>
      <input type="file" id="picker" accept="image/png,image/jpeg,image/gif,image/webp,image/heic" multiple hidden>
    </div>
    <p class="hint">You can also paste a screenshot or drop one here.</p>
    <p class="about">Sent with the report: ${about}</p>
    <p class="error" id="error">The report couldn't be saved. Check the summary, and that each screenshot is an image under 10 MB.</p>
    <div class="actions">
      <button type="button" onclick="window.close()">Cancel</button>
      <button type="submit" id="send">Send Report</button>
    </div>
  </form>
  <div class="done">
    <h1>Thanks for the report</h1>
    <p>It's saved on this ${COMPUTER}.</p>
    <div class="actions" style="justify-content:center"><button type="button" onclick="window.close()">Close</button></div>
  </div>
  <script>
    const MAX = ${MAX_SCREENSHOTS};
    const form = document.getElementById("form");
    const shots = document.getElementById("shots");
    const picker = document.getElementById("picker");
    const attach = document.getElementById("attach");
    let screenshots = [];

    function render() {
      shots.querySelectorAll(".shot").forEach((el) => el.remove());
      screenshots.forEach((shot, i) => {
        const tile = document.createElement("div");
        tile.className = "shot";
        const img = document.createElement("img");
        img.src = shot.url;
        img.alt = shot.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + shot.name);
        remove.onclick = () => { URL.revokeObjectURL(shot.url); screenshots.splice(i, 1); render(); };
        tile.append(img, remove);
        shots.insertBefore(tile, attach);
      });
      attach.hidden = screenshots.length >= MAX;
    }
    async function add(files) {
      for (const file of files) {
        if (screenshots.length >= MAX || !file.type.startsWith("image/")) continue;
        screenshots.push({ name: file.name || "Pasted screenshot.png", type: file.type, data: new Uint8Array(await file.arrayBuffer()), url: URL.createObjectURL(file) });
      }
      render();
    }
    attach.onclick = () => picker.click();
    picker.onchange = () => { add([...picker.files]); picker.value = ""; };
    document.addEventListener("paste", (e) => add([...e.clipboardData.files]));
    document.addEventListener("dragover", (e) => { e.preventDefault(); document.body.classList.add("dragging"); });
    document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dragging"); });
    document.addEventListener("drop", (e) => { e.preventDefault(); document.body.classList.remove("dragging"); add([...e.dataTransfer.files]); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.screenshots = screenshots.map(({ name, type, data }) => ({ name, type, data }));
      document.getElementById("send").disabled = true;
      const ok = await window.landrop.submitReport(data).catch(() => false);
      document.getElementById("send").disabled = false;
      if (ok) document.body.classList.add("sent");
      else document.getElementById("error").style.display = "block";
    });
  </script>
</body></html>`;
}

/** The QR window's page. Addresses are this computer's own IPv4 addresses, so nothing here needs escaping. */
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
  .actions { display: flex; gap: 8px; justify-content: center; margin: 14px 0 4px; }
  .actions button { font: inherit; padding: 6px 14px; border-radius: 7px; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); background: Canvas; color: CanvasText; }
  .actions button:active { opacity: .7; }
</style></head><body>
  <h1>Join LANDrop</h1>
  ${
    qr
      ? `<p>Scan with a phone camera. It must be on the same Wi-Fi as this ${COMPUTER}.</p>
  <div class="qr"><img src="${qr}" alt="QR code for ${urls[0]}"></div>
  ${urls.map((u) => `<p class="url">${u.replace("http://", "")}</p>`).join("")}
  <div class="actions">
    <button onclick="window.landrop.saveQr()">Save Image…</button>
    ${MAC ? '<button onclick="window.landrop.shareQr()">Share…</button>' : ""}
  </div>
  <p class="help">Can't open it on Android? In Chrome, turn off Settings → Privacy and security → Always use secure connections.</p>`
      : `<p>This ${COMPUTER} isn't connected to a network. Join a Wi-Fi network, then open this again.</p>`
  }
  <p class="help">LANDrop keeps running in the ${TRAY} when you close this window.</p>
</body></html>`;
}

function fail(err: unknown) {
  dialog.showErrorBox("LANDrop couldn't start", err instanceof Error ? err.message : String(err));
  app.exit(1);
}
