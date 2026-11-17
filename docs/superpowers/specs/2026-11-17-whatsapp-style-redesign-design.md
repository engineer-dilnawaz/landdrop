# LANDrop chat app: WhatsApp-style redesign

Date: 2026-11-17
Status: draft, awaiting owner approval
Scope: `apps/web` (the chat app every device opens in its browser). The Mac menu bar app is out of scope.

## Why

The owner wants LANDrop's chat app to feel exactly like WhatsApp, because WhatsApp is the chat UI everyone already knows. Today it imitates iOS Messages (pure black, iOS blue, iOS sheets), which the owner finds unprofessional and not "ours". A familiar layout makes LANDrop instantly usable for every guest who scans the QR code.

The approved reference is the mockup `whatsapp-style-v5.html` (kept in the brainstorm session folder). It shows the WhatsApp Web layout, tailed bubbles, ticks, the doodle wallpaper, the attach menu and a message-info panel.

## Goals

1. Every existing screen and behaviour gets a WhatsApp look and feel, on desktop and phone, light and dark.
2. The chat background is a dense doodle wallpaper like WhatsApp's, drawn by us (devices, Wi-Fi, files, chat bubbles, mic, music, stars, hearts, and so on: about 32 drawings, about 36px apart).
3. The accent colour is **WhatsApp green by default**. Each user can switch to **LANDrop blue** in Settings, and the choice is remembered on that device.
4. The layout has room for the upcoming features (voice notes, private groups, emoji/GIFs, read receipts and message info, folders, chat themes), so they slot in later without another redesign.

## Non-goals

- Building any of the upcoming features. They stay invisible until built, except "Folder · Soon" in the attach menu (the owner asked for folder sharing first).
- Message reactions (the 👍 in the mockup is illustration only).
- Changes to the server, the protocol, or the chat logic in `landrop.tsx` (connection, uploads, live streaming, read markers, contacts).
- The Mac menu bar app, history per network, or QR sharing. Those are separate pieces of work.
- A light/dark switch. The app keeps following the device's system setting.

## Anti-goals (failure even if it "works")

- Losing any current behaviour. The full inventory of today's behaviour is in the appendix, and each item must still work.
- Loading anything from the internet. Web fonts and CDNs are banned: the app must work on a Wi-Fi with no internet. The system font stack stays.
- Copying WhatsApp's own artwork, logo, name or wallpaper. Layout and feel only; all drawings and icons are ours.
- Dead UI: no visible button that does nothing.

## Constraints

- Next.js 16 static export served by the LAN server, React 19, Tailwind CSS v4, no component library. No new runtime dependencies.
- It must work on iPhone Safari, Android Chrome and Samsung Internet, and desktop Chrome, Safari, Firefox and Edge.
- Safe-area insets and `h-dvh` behaviour on phones must keep working.
- Accessibility attributes listed in the appendix must be kept or replaced with equivalents.
- Review flow: the owner checks the result in the dev preview (`http://localhost:3001`, which talks to a test server on port 4546 with throwaway data). Nothing is committed or pushed until the owner approves.

## Approaches considered

1. **Restyle the existing components in place (chosen).** Replace the iOS design tokens with new ones and rework each component's markup and classes. `landrop.tsx` keeps owning all state and behaviour, and the component props stay the boundary. Lowest risk to uploads, live streaming and read state; no new dependencies.
2. Add a component library (shadcn/Radix). Rejected: new dependencies, and its default look is generic, the opposite of the goal.
3. Rewrite the UI from scratch. Rejected: high risk of breaking working behaviour for no visible gain.

Scope choice: the owner picked "restyle plus room for upcoming features" over a plain restyle.

## The design

### Colours and tokens

Rename the tokens in `globals.css` from iOS names to roles. Values follow the approved mockup.

| Role | Light | Dark |
|---|---|---|
| app background (behind panels) | #d1d7db | #0b141a |
| panel (lists, sheets) | #ffffff | #111b21 |
| bar (headers, composer, rail) | #f0f2f5 | #202c33 |
| hover | #f5f6f6 | #202c33 |
| selected / field | #f0f2f5 | #2a3942 |
| text | #111b21 | #e9edef |
| muted text | #667781 | #8696a0 |
| divider | #e9edef | #222d34 |
| wallpaper base | #efeae2 | #0b141a |
| wallpaper doodles | #ddd5c8 | #1c272e |
| incoming bubble | #ffffff | #202c33 |
| read/ticks blue | #53bdeb | #53bdeb |
| danger | #ea0038 | #f15c6d |

Accent sets, switched by a class on the root element:

| | Green light | Green dark | Blue light | Blue dark |
|---|---|---|---|---|
| accent | #00a884 | #00a884 | #1f6bff | #3b82f6 |
| outgoing bubble | #d9fdd3 | #005c4b | #d6e6ff | #144d9e |
| outgoing bubble text | #111b21 | #e9edef | #111b21 | #e9edef |
| chip on / its text | #e7fce3 / #008069 | #103529 / #00a884 | #e3edff / #1747b8 | #13294d / #7fb0ff |

- The online dot uses the accent.
- Unread counts use the accent with panel-coloured text.
- The accent preference is stored in localStorage `landrop.accent` (`"green"` | `"blue"`, default green). Reading it must not flash the wrong colour on load (set the class before first paint, for example with an inline script in `layout.tsx`).

### Avatars and sender colours

- Initials avatars get a deterministic colour per device: hash the device id into a fixed palette of about 12 colours that read well in both themes. This replaces today's grey gradient.
- In the group chat, the sender's name inside the bubble uses that device's colour.
- The group avatar is the accent colour with a Wi-Fi icon.

### Wallpaper

- One SVG tile of our own doodles (about 32 drawings, about 36px spacing, light jitter and rotation), applied as a CSS mask over a wallpaper-coloured layer. One asset then serves both themes.
- It is a static file in the app (no network).
- It fills the message area only; headers and the composer sit on solid bars.

### Desktop layout (md and up), like WhatsApp Web

```
┌────┬──────────────────┬───────────────────────────────────────────┐
│rail│ LANDrop   ✎  ⋮   │ (avatar) Chat name                🔍  ⋮   │
│ 💬 │ [ Search…      ] │ subtitle (online / members)               │
│ 🖥 │ All Unread Priv. │░░░░░░░ doodle wallpaper ░░░░░░░░░░░░░░░░░░│
│ ▦  │ ──────────────── │   [day pill]                              │
│    │ (av) Name   9:41 │ ◤bubble in          bubble out◥ 9:32 ✓    │
│    │      preview  (2)│                                           │
│ ⚙  │ (av) Name   Yest │                                           │
│(me)│                  │ [+] [ Type a message                ] [➤] │
└────┴──────────────────┴───────────────────────────────────────────┘
```

**Left rail** (64px, bar colour), top to bottom:
- **Chats:** shows the total unread badge.
- **Devices:** opens the existing DevicePicker in the list column.
- **Add a device:** opens the JoinDialog QR code.
- A spacer.
- **Settings.**
- **Your avatar:** opens rename.

The rail replaces today's collapse-to-avatars "peek" sidebar mode and its pin toggle. Those go away.

**List column:**
- Keeps today's drag-to-resize handle, with the same limits, keyboard arrows, double-click reset and `landrop.sidebar` storage. The `pinned` field is no longer used.
- Header: title "LANDrop", a new-chat button (opens DevicePicker), and a ⋮ menu with "Add a device" and "Settings".
- Search field "Search or start a new chat": filters the list by chat title and preview text, client-side.
- Filter chips: All, Unread, Private. A Groups chip appears only once private groups exist.
- Rows: WhatsApp metrics (72px tall, 49px avatar, divider starting after the avatar), name, time, preview, unread count. A ✓ precedes your own last message.
- **Connection banner:**
  - Offline: WhatsApp-style banner at the top of the list, "Can't reach the LANDrop host. Retrying…", in an amber/yellow tone.
  - Connecting: a subtle "Connecting…" line in the same place.
- Press-and-hold and right-click on rows still open the chat actions (Clear/Delete chat).

**Chat column:**
- **Header:** avatar, name, subtitle (members or online / last seen), search icon (placeholder: hidden until in-chat search exists), and a ⋮ menu with "Clear chat" or "Delete chat" (the same ChatSheet as today).
- **Message area:** the wallpaper; centered day pills; a first system pill at the top of every chat, "🔒 Messages and files stay on this Wi-Fi. Nothing goes to the internet."
- **Empty state when no chat is open:** the LANDrop logo, "LANDrop", "Send and receive messages and files with every device on this Wi-Fi.", and a lock line "Everything stays on your network".

### Bubbles

- WhatsApp shape: 7.5px radius, a small tail at the **top** of the **first** bubble in a run. Today the tail is on the last one, so the grouping logic needs a "first in run" flag. Same grouping rules (same sender, same day, at most 15 minutes apart).
- Own bubbles go right in the outgoing colour; others go left in white or the dark bubble colour, with a soft shadow.
- Group: the sender's name in their colour at the top of the first bubble of a run. The small sender avatar beside bubbles is removed, as in WhatsApp.
- The time sits inside the bubble at bottom right.
- Own messages show a status icon after the time:
  - clock while uploading
  - one grey tick once stored on the host
  - a warning icon if sending failed
  - Double and blue ticks wait for the read-receipts feature.
- **Hover (desktop):** a small ⌄ chevron appears in the bubble's top-right corner. It opens a dropdown with the same actions as today's MessageSheet: Reply, Copy, Save, Remove for everyone (`canRemove` rules unchanged). This replaces today's hover copy/save icons.
- **Phone:** long-press opens the same actions as a bottom sheet in the new style. Swipe-right-to-reply stays exactly as today.
- Reply quote inside the bubble: WhatsApp-style tinted block with an accent bar on the left in the quoted sender's colour. Tapping it jumps to the original and flashes it (as today).
- Images and videos fill the bubble with a 3px inset. The time sits over the media bottom-right on a dark gradient. Clicking an image opens the viewer; videos keep native controls.
- Files: a WhatsApp document card (type badge, name, size and status line, download circle button). The status texts from today stay (verified, didn't finish sending, live from this device…, live while the sender is online).
- Upload progress: a thin progress bar and the same label text inside the file card.
- Live files: keep the sparkle effect.
- Long text "Read more" truncation, linkify, and pre-wrap stay.

### Composer

- Bar colour, with a `+` attach button (opens the attach menu), the message field ("Type a message", auto-grow, same Enter/Shift+Enter rules and phone rule), and a round accent send button.
- The send button is always visible but inactive until there is text or a file. (WhatsApp swaps to a mic when empty; the mic slot is reserved for voice notes.)
- **Attach menu**, a popover above `+`:
  - **Document:** any file.
  - **Photos & videos:** the file picker limited to `image/*,video/*`.
  - **Camera:** phones only, `capture`.
  - **Folder:** disabled, with a "Soon" pill.
- Reply banner and picked-file chips sit above the field in WhatsApp style.
- Paste-to-attach and drag-and-drop stay. The drop overlay is restyled to the accent with the same texts.
- The emoji button and mic are reserved slots, not rendered until those features exist.

### Dialogs, sheets and viewers

All restyled to WhatsApp's modal style: centred card, title, body, and right-aligned text buttons in the accent (danger actions in the danger colour). On phones, action lists use bottom sheets.
- **RenameDialog:** both modes and all copy unchanged.
- **ChatSheet:** copy unchanged.
- **MessageSheet:** a dropdown on desktop, a bottom sheet on phone.
- **JoinDialog:** QR code on white (unchanged rules), URL copy pill, address chips.
- **ImageViewer:** WhatsApp-style dark overlay. Header with the sender's name and time on the left; Save and ✕ on the right. Escape, backdrop click and Done behaviour kept.
- **Notice toast:** becomes a WhatsApp-style snackbar at the bottom of the screen, keeping `role="alert"` and the dismiss button.
- **New: Settings panel.** It opens in the list column like WhatsApp's settings:
  - your avatar and name (tap to rename)
  - "Chat colour: Green / Blue"
  - an "About LANDrop" line ("Everything stays on this Wi-Fi")

### Phone layout (below md), like WhatsApp on Android

- **List screen:**
  - Top bar with "LANDrop", and an icon that opens the JoinDialog QR code.
  - Search field and chips.
  - Rows.
  - A floating accent "new chat" button at bottom right that opens DevicePicker.
  - A bottom tab bar: Chats, Devices, Settings.
- **Chat screen:**
  - Full screen, with a back arrow, avatar and name.
  - Wallpaper.
  - Composer pinned to the bottom with safe-area padding.
  - The URL hash and browser-back behaviour stay as today.

### Structure for upcoming features (built in now, invisible)

- **Attach menu:** a list of items where each can be enabled or disabled (Folder ships disabled).
- **Composer:** a trailing action slot that will later switch between send and mic.
- **Chat list filters:** defined as a list, so a Groups chip can be added later.
- **Message dropdown and sheet:** take an actions list, so Info, React or Forward can be added later.
- **Right-side panel slot on desktop:** for message info (read by / delivered to) and chat info later. Not rendered now.
- **Settings:** a list of sections, so chat themes and wallpaper choice can be added later.

## Verification

- `npm run typecheck` and `npm run lint` in `apps/web` pass, and `npm run build` succeeds.
- A manual walkthrough in the dev preview, with two browser windows as two devices (plus one phone-sized window), covering every item in the appendix inventory, in light and dark and in green and blue. Before-and-after screenshots for the owner.
- The approval gate: the owner reviews `http://localhost:3001` and approves before any commit or push.

## Left to the builder

- Exact component split, and whether to add small new files (for example `rail.tsx`, `settings.tsx`, `attach-menu.tsx`) or extend existing ones.
- Icon drawings (our own SVGs, matching the mockup's line style).
- Exact doodle drawings beyond the mockup's set, keeping density and stroke as approved.
- Exact animation timings, within WhatsApp's restrained feel.

## Appendix: behaviour that must survive

Taken from a full read of `apps/web/app` on 2026-11-17.

### Connection and identity
- WebSocket reconnect every 2s and on tab focus.
- Uploads abort on disconnect.
- The offline indicator.
- The not-connected send notice.
- A first visit opens RenameDialog in welcome mode plus the DevicePicker.
- Device-name guessing.

### Read state and chat list
- Read markers: initial history counts as read; markers apply across a contact's browsers; stored in `landrop.read`.
- Unread counts and badges, with 99+.
- Chat list contents:
  - The group is always shown.
  - Private chats only when they have messages or are open.
  - Sorted by last message.
  - Preview prefixes: "You: ", the sender's name in the group, and 📷 / 🎥 / 📄.
  - List time format: today, Yesterday, weekday, d/m/yy.

### Chat screen
- Open chat in the URL hash; browser Back returns to the list.
- Subtitles: group members and "Only you are online"; private online / last seen variants.
- Per-chat drafts. Picked files and the reply target are cleared when switching chats.
- Messages: day separators, 15-minute grouping, auto-scroll with the 48px scrolled-up exception, quote jump with flash.

### Sending
- Paste files, with pasted images renamed.
- Enter / Shift+Enter, and the phone Enter rule.
- Files up to 500 MB: upload, SHA-256 hash, progress label, "Verifying…".
- Files over 500 MB are live from this tab, with their notice.
- Send failure notices.

### Message actions
- Long-press (450ms with a vibrate) and right-click on bubbles and rows; movement over 8px cancels; a click after a hold or swipe is swallowed.
- Swipe to reply: 10px start, 1.5× the vertical movement, 72px maximum, 56px threshold, with a vibrate.
- Copy, works over plain HTTP with the execCommand fallback.
- Save link with its SHA-256 or live title.
- Remove for everyone, with the `canRemove` rule.
- Clear group / delete private chat, with their copy.
- Usage tracking, and the "no longer available" notice when a sender goes offline.

### Message content
- Long text truncation (600 characters or 12 lines) with Read more.
- Linkify with safe link attributes.
- Image and video preview rules, with fallback to the file card.
- File card status texts.
- Upload progress bar with ARIA.
- Live-file sparkles, with reduced motion respected.

### Devices and joining
- Drag-and-drop with the depth counter, the folder notice and the overlay texts.
- DevicePicker:
  - Online and Not online sections; offline devices can still be messaged.
  - "Also on this Wi-Fi" scan with invite.
  - Empty state.
- JoinDialog:
  - Loopback address lookup.
  - QR states.
  - Copy pill.
  - Address chips.

### Dialogs and layout
- ImageViewer: Done, Save, Escape, backdrop.
- RenameDialog validation: max length, select on focus, Enter submits.
- The list resize handle with its ARIA and keyboard support.
- Every Escape-to-close.
- Every `aria-*` and role listed in the inventory: dialogs, alert, progressbar, separator, `aria-current`, `aria-live`, `aria-busy`, labels.
- `select-none` across the app with text selection allowed in the field.
- `colorScheme` metadata.

## Changes made during review

- Every pop-up (dialogs, ⋮ menus, the attach menu, message actions) is a bottom sheet, drawn on `<body>` so no panel can cover it.
- Rounded corners use `corner-shape: superellipse(1.5)` for Figma-style squircles; circles stay round. Safari doesn't support it yet and keeps ordinary rounded corners.
- The lock in the "end-to-end on your Wi-Fi" notices is a solid padlock, readable at 16px.
