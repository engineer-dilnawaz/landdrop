<div align="center">

<img src="site/icon.svg" width="96" height="96" alt="LANDrop icon">

# LANDrop

**Chat and share files of any size with every device on your Wi-Fi.**
No cloud, no accounts, no app to install on phones.

[![Latest release](https://img.shields.io/github/v/release/engineer-dilnawaz/landrop?label=release)](https://github.com/engineer-dilnawaz/landrop/releases/latest)
![Platform](https://img.shields.io/badge/host-macOS%20%7C%20Windows-black)
![Clients](https://img.shields.io/badge/clients-any%20web%20browser-blue)

[**Download for Mac (Apple silicon)**](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-mac-arm64.dmg) · [Mac (Intel)](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-mac-x64.dmg) · [Windows](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-win-x64.exe) · [Website](https://landdrop.vercel.app) · [Releases](https://github.com/engineer-dilnawaz/landrop/releases)

</div>

---

## Why LANDrop

Moving a video from an Android phone to a Mac, or a document from a Windows laptop to an iPhone, still usually means a cloud upload, a cable, or a messaging app that compresses everything. LANDrop turns your Mac into a private hub on your local network: every phone, tablet and computer on the same Wi-Fi can chat and exchange files directly, at network speed.

- **Private by design.** Messages and files travel only over your own network and are stored on your Mac. Nothing is sent to the internet.
- **No size limit.** Share a 40 GB file. Files too big to copy are streamed live from the sender's device, so others can watch or save them while the sender is online.
- **Every device.** iPhone, Android, iPad, Windows, Linux and Mac: anything with a modern browser can join.
- **Zero setup for guests.** Scan a QR code and you're in. No app store, no sign-up.

## Features

| | |
|---|---|
| **Group and private chat** | Message everyone on the network, or a single device privately. |
| **File sharing** | Photos, videos and documents of any size, with in-chat previews. |
| **Live streaming of large files** | Huge files are served straight from the sender's device instead of being copied first. |
| **Device discovery** | See who is online on your network in real time. |
| **QR join** | The Mac shows a QR code; any device scans it to open LANDrop in its browser. |
| **Menu bar / tray app** | Runs quietly in the Mac menu bar or Windows tray, can start at login, and can keep the Mac awake while plugged in. |

## Getting started

### 1. Install on your Mac

1. Download [`LANDrop-mac-arm64.dmg`](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-mac-arm64.dmg) (Apple silicon: M1 and newer) or [`LANDrop-mac-x64.dmg`](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-mac-x64.dmg) (Intel Macs).
2. Open the dmg and drag **LANDrop** into **Applications**.
3. Open LANDrop. Because it isn't notarized by Apple yet, macOS will block the first launch. Go to **System Settings → Privacy & Security** and click **Open Anyway**.
4. When macOS asks whether LANDrop may accept incoming network connections, click **Allow**. Without this, other devices can't reach it.

#### Windows

1. Download [`LANDrop-win-x64.exe`](https://github.com/engineer-dilnawaz/landrop/releases/latest/download/LANDrop-win-x64.exe).
2. Run it; LANDrop installs itself and opens. If SmartScreen warns that it's from an unknown publisher (it isn't code-signed yet), click **More info → Run anyway**.
3. When Windows Firewall asks, allow LANDrop on **private networks**. Without this, other devices can't reach it.
4. LANDrop lives in the system tray; click its icon to show the QR code.

### 2. Connect your devices

1. Click the LANDrop icon in the menu bar (Mac) or system tray (Windows) to show the QR code.
2. On any phone or computer **on the same Wi-Fi**, scan the code (or type the address shown under it).
3. LANDrop opens in the browser. Pick a name and start chatting.

### Troubleshooting

<details>
<summary><b>A phone can't open LANDrop</b></summary>

Make sure the phone is on the same Wi-Fi as the Mac, not on mobile data. On Android Chrome, turn off **Settings → Privacy and security → Always use secure connections**: LANDrop runs over plain HTTP on your local network, and that setting blocks it.
</details>

<details>
<summary><b>LANDrop stops working when my Mac sleeps</b></summary>

A sleeping Mac can't answer other devices. From the menu bar icon, turn on **Keep Mac Awake While Plugged In**. Closing a laptop lid still puts it to sleep.
</details>

<details>
<summary><b>"Another copy of LANDrop is using port 4545"</b></summary>

A LANDrop server is already running, for example one started from Terminal. Quit it, then open LANDrop again.
</details>

## How it works

```
 ┌──────────────┐      Wi-Fi / LAN (HTTP + WebSocket, port 4545)      ┌──────────────┐
 │   iPhone     │ ◄──────────────────────────┐   ┌───────────────────► │   Android    │
 └──────────────┘                            │   │                     └──────────────┘
                                       ┌─────┴───┴─────┐
                                       │  Mac (host)   │  chat history + files
                                       │  LANDrop app  │  stored in ~/.landrop
                                       └─────┬───┬─────┘
 ┌──────────────┐                            │   │                     ┌──────────────┐
 │   Windows    │ ◄──────────────────────────┘   └───────────────────► │     iPad     │
 └──────────────┘                                                      └──────────────┘
```

The Mac app embeds a small server that serves the web app and relays chat in real time. Guests only need a browser. Nothing is routed through the internet.

## Project structure

This is an npm workspaces monorepo built with [Turborepo](https://turbo.build).

| Path | What it is |
|---|---|
| `apps/desktop` | Electron menu bar / tray app for macOS and Windows; embeds the LAN server. |
| `apps/lan-server` | Fastify server: HTTP API, WebSocket chat, file storage and live streaming. |
| `apps/web` | Next.js client (static export) that every device opens in its browser. |
| `packages/protocol` | Shared types and constants used by the server and clients. |
| `site` | The marketing website, deployed to [landdrop.vercel.app](https://landdrop.vercel.app). |

## Development

Requires Node.js 22 or newer.

```bash
npm install

npm run dev        # web app on :3000 plus the LAN server on :4545, with reload
npm test           # server tests (Vitest)
npm run typecheck  # TypeScript across all workspaces
npm run build      # build all workspaces
npm run dist:mac        # Apple silicon .dmg (apps/desktop/release)
npm run dist:mac-intel  # Intel Mac .dmg
npm run dist:win        # Windows installer (.exe)
```

To run the server headless without the Mac app, build the web app and start it:

```bash
npm run build
npm start --workspace @landrop/lan-server
```

| Environment variable | Default | Purpose |
|---|---|---|
| `LANDROP_PORT` | `4545` | Port the server listens on. |
| `LANDROP_DATA_DIR` | `~/.landrop` | Where chat history and attachments are stored. |
| `LANDROP_WEB_DIR` | `apps/web/out` | Location of the built web app. |

## Roadmap

- Folder sharing, browsable inside the app
- Private groups with chosen devices
- Voice messages
- Rich media viewer for photos, videos and GIFs
- Emoji and GIF picker
- Message info and read receipts
- Chat bubble customisation
- Separate history per Wi-Fi network
- Shareable QR code and invite link
- Redesigned app and Mac menu bar actions

## Author

Built by [Dilnawaz Khan](https://github.com/engineer-dilnawaz).

## Licence

Copyright © 2026 Dilnawaz Khan. All rights reserved. The source is public so you can read how LANDrop works, but it is not open source: you may not copy, redistribute or rebrand it. See [LICENSE](LICENSE). The app itself is free to download and use.
