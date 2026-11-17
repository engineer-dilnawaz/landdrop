"use client";

import { createSHA256 } from "hash-wasm";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  DEFAULT_LAN_PORT,
  GROUP_CHAT_ID,
  MAX_ATTACHMENT_BYTES,
  PROTOCOL_VERSION,
  chatMembers,
  isAvailable,
  isGroupId,
  previewKind,
  privateChatId,
  routes,
  type ClientMessage,
  type Device,
  type Group,
  type KnownDevice,
  type Message,
  type NetworkDevice,
  type ServerEvent,
} from "@landrop/protocol";
import { ChatList, type ChatKind, type ChatSummary } from "./chat-list";
import { ChatView, type OpenChat } from "./chat-view";
import { guessDeviceName } from "./device-name";
import { DevicePicker, type PickableDevice } from "./device-picker";
import { GroupInfoSheet, GroupMembersSheet, type Contact } from "./group-sheets";
import { JoinDialog } from "./join-dialog";
import { MediaViewer } from "./media-viewer";
import { BottomTabs, Rail, type Panel } from "./nav";
import { Settings } from "./settings";
import { Sidebar } from "./sidebar";
import {
  ChatSheet,
  CloseIcon,
  LockIcon,
  Logo,
  MessageSheet,
  PlusIcon,
  RenameDialog,
  formatBytes,
  formatDay,
  formatTime,
} from "./ui";

const LAN_PORT = Number(process.env.NEXT_PUBLIC_LANDROP_PORT ?? DEFAULT_LAN_PORT);
/**
 * The built app is served by the LAN server itself, so it talks to whatever address it was opened
 * from. Only `next dev` serves the page separately and must point at the server's port.
 */
const serverHost = () => (process.env.NODE_ENV === "development" ? `${location.hostname}:${LAN_PORT}` : location.host);
const HASH_SLICE_BYTES = 8 * 1024 * 1024;
const RECONNECT_MS = 2000;
const IDENTITY_KEY = "landrop.identity";
const READ_KEY = "landrop.read";

export interface Progress {
  bytesReceived: number;
  bytesPerSecond: number;
}

interface State {
  connection: "connecting" | "online" | "offline";
  self?: Device;
  token?: string;
  isHost: boolean;
  online: Device[];
  /** Every known device by id with its current name, so renames apply to earlier messages too. */
  devices: Record<string, KnownDevice>;
  messages: Message[];
  /** The groups this device is in, by id. */
  groups: Record<string, Group>;
  progress: Record<string, Progress>;
  /** Newest message time read in each chat on this device ("*" covers chats never opened). Server clock. */
  readAt?: Record<string, number>;
  notice?: string;
}

type Action =
  /** `using`: this device was watching or saving the file a message:deleted event removes. */
  | { type: "event"; event: ServerEvent; using?: boolean }
  | { type: "disconnected" }
  | { type: "notice"; notice?: string }
  | { type: "loadRead"; stored: Record<string, number> | null }
  | { type: "read"; chatId: string };

const initialState: State = { connection: "connecting", isHost: false, online: [], devices: {}, messages: [], groups: {}, progress: {} };

function upsert(messages: Message[], message: Message): Message[] {
  const index = messages.findIndex((m) => m.id === message.id);
  if (index === -1) return [...messages, message];
  const next = [...messages];
  next[index] = message;
  return next;
}

/** Merges presence into the directory; a device that just went offline was last seen now. */
function withPresence(devices: Record<string, KnownDevice>, before: Device[], online: Device[]) {
  const next = { ...devices };
  const now = Date.now();
  for (const d of before) if (!online.some((o) => o.id === d.id) && next[d.id]) next[d.id] = { ...next[d.id], lastSeen: now };
  for (const d of online) next[d.id] = { ...next[d.id], ...d, lastSeen: now };
  return next;
}

/**
 * Each browser has its own identity, so a phone used from two browsers is two devices. The ones on
 * one phone or computer (same `machine`) are shown as one contact.
 */
function contacts(devices: KnownDevice[], selfMachine: string | undefined): KnownDevice[][] {
  const byMachine = new Map<string, KnownDevice[]>();
  for (const d of devices) {
    // Our own other browsers aren't someone to chat with.
    if (selfMachine && d.machine === selfMachine) continue;
    const key = d.machine ?? d.id;
    byMachine.set(key, [...(byMachine.get(key) ?? []), d]);
  }
  return [...byMachine.values()];
}

/** Every private chat with the phone or computer `chatId` is with: one per browser on it. */
function contactChats(devices: Record<string, KnownDevice>, selfId: string, chatId: string): string[] {
  const members = chatMembers(chatId);
  const machine = Array.isArray(members) ? devices[members.find((id) => id !== selfId) ?? ""]?.machine : undefined;
  if (!machine) return [chatId];
  return Object.values(devices)
    .filter((d) => d.machine === machine && d.id !== selfId)
    .map((d) => privateChatId(selfId, d.id));
}

function reducer(state: State, action: Action): State {
  if (action.type === "disconnected") return { ...state, connection: "offline", online: [], token: undefined };
  if (action.type === "notice") return { ...state, notice: action.notice };
  if (action.type === "loadRead") {
    if (state.readAt) return state;
    // A device's first visit: everything already in the history counts as read.
    const newest = Math.max(0, ...state.messages.map((m) => m.createdAt));
    return { ...state, readAt: action.stored ?? { "*": newest } };
  }
  if (action.type === "read") {
    const ids = state.self ? contactChats(state.devices, state.self.id, action.chatId) : [action.chatId];
    const newest = Math.max(0, ...state.messages.filter((m) => ids.includes(m.chatId)).map((m) => m.createdAt));
    if (!state.readAt || ids.every((id) => newest <= (state.readAt?.[id] ?? 0))) return state;
    return { ...state, readAt: { ...state.readAt, ...Object.fromEntries(ids.map((id) => [id, newest])) } };
  }
  const e = action.event;
  switch (e.type) {
    case "session:welcome":
      return {
        ...state,
        connection: "online",
        self: e.self,
        token: e.token,
        isHost: e.isHost,
        online: e.online,
        devices: withPresence(Object.fromEntries(e.directory.map((d) => [d.id, d])), [], e.online),
        messages: e.messages,
        groups: Object.fromEntries(e.groups.map((g) => [g.id, g])),
      };
    case "presence:update":
      return { ...state, online: e.online, devices: withPresence(state.devices, state.online, e.online) };
    case "group:updated":
      return { ...state, groups: { ...state.groups, [e.group.id]: e.group } };
    case "group:left": {
      const groups = { ...state.groups };
      delete groups[e.groupId];
      return { ...state, groups, messages: state.messages.filter((m) => m.chatId !== e.groupId) };
    }
    case "chat:cleared":
      return { ...state, messages: state.messages.filter((m) => m.chatId !== e.chatId || m.createdAt > e.before) };
    case "message:created":
    case "message:updated":
      return { ...state, messages: upsert(state.messages, e.message) };
    case "message:deleted": {
      const progress = { ...state.progress };
      delete progress[e.messageId];
      const gone = state.messages.find((m) => m.id === e.messageId);
      // Only someone watching or saving a live file needs to know why it vanished.
      const notice =
        e.reason === "sender-offline" && action.using && gone?.attachment
          ? `“${gone.attachment.name}” is no longer available. ${state.devices[gone.senderId]?.name ?? gone.senderName} went offline.`
          : state.notice;
      return { ...state, messages: state.messages.filter((m) => m.id !== e.messageId), progress, notice };
    }
    case "stream:request":
      return state;
    case "attachment:progress":
      return { ...state, progress: { ...state.progress, [e.messageId]: e } };
    case "error":
      return { ...state, notice: e.message };
  }
}

/** The open chat lives in the URL hash, so the browser's back button returns to the list. */
const serverBase = () => `${location.protocol}//${serverHost()}`;

/** The host's addresses on its networks, which other devices can open. */
async function fetchNetworkAddresses(): Promise<string[]> {
  const res = await fetch(serverBase() + routes.join);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return ((await res.json()) as { urls: string[] }).urls;
}

/** The other devices on the host's Wi-Fi that aren't using LANDrop. The host scans, so this takes a few seconds. */
async function fetchNetworkDevices(token: string): Promise<NetworkDevice[]> {
  const res = await fetch(serverBase() + routes.network, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return ((await res.json()) as { devices: NetworkDevice[] }).devices;
}

/** Sends the host exactly the bytes a viewer asked for. The browser reads just that slice from disk. */
async function serveLiveRange(
  { requestId, messageId, start, end }: Extract<ServerEvent, { type: "stream:request" }>,
  liveFiles: Map<string, File>,
  /** Live files still being announced; a viewer can ask for one before the announcement returns its id. */
  announcements: Set<Promise<unknown>>,
  token: string | undefined,
) {
  if (!liveFiles.has(messageId)) await Promise.allSettled(announcements);
  const file = liveFiles.get(messageId);
  if (!file) return; // Not held by this page; the host times the request out.
  await fetch(serverBase() + routes.streamData(requestId), {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" },
    body: file.slice(start, end + 1),
  }).catch(() => {
    // The viewer stopped (seeked or closed) and the host cut this piece short.
  });
}

function chatIdFromHash(): string | undefined {
  const match = /^#\/chat\/(.+)$/.exec(location.hash);
  const id = match && decodeURIComponent(match[1]);
  return id && (chatMembers(id) || isGroupId(id)) ? id : undefined;
}

export default function LanDrop() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [chatId, setChatId] = useState<string>();
  /** Unsent text per chat, like WhatsApp drafts. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<Message>();
  /** Mirrors chatId for socket and visibility handlers, which outlive a render. */
  const chatIdRef = useRef<string | undefined>(undefined);
  /** The message whose press-and-hold menu is open. */
  const [selected, setSelected] = useState<Message>();
  /** The chat whose press-and-hold menu is open in the list. */
  const [heldChat, setHeldChat] = useState<ChatSummary>();
  /** Picking devices for a new group, or to add to the open group. */
  const [groupPicker, setGroupPicker] = useState<"create" | "add">();
  const [groupInfo, setGroupInfo] = useState(false);
  const [leaving, setLeaving] = useState<Group>();
  const [dragging, setDragging] = useState(false);
  /** The name dialog: "rename" from the avatar, "welcome" when a new device first joins. */
  const [renaming, setRenaming] = useState<"rename" | "welcome">();
  /** Set for a brand-new device, whose guessed name the user should confirm once it has joined. */
  const askForName = useRef(false);
  const [inviting, setInviting] = useState(false);
  /** The "Available devices" screen, shown in place of the chat list. */
  /** What the list column shows: chats, the device list (WhatsApp's "New chat") or settings. */
  const [panel, setPanel] = useState<Panel>("chats");
  const picking = panel === "devices";
  /** The picker's "Also on this Wi-Fi" list; undefined until the first scan finishes. */
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>();
  /** dragenter/dragleave fire for every child element; count them so the overlay doesn't flicker. */
  const dragDepth = useRef(0);
  const [viewing, setViewing] = useState<string>();
  const socketRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | undefined>(undefined);
  const identityRef = useRef<Identity | null>(null);
  /** Uploads in progress by message id, so they can be stopped if the connection drops. */
  const uploadsRef = useRef(new Map<string, { stopped: boolean; xhr?: XMLHttpRequest }>());
  /** This page's id: live files are held in its memory, so they belong to it rather than to the device. */
  const tabIdRef = useRef<string>(undefined);
  /** Files over the upload cap, by message id, served live to whoever watches or saves them. */
  const liveFilesRef = useRef(new Map<string, File>());
  const liveAnnouncementsRef = useRef(new Set<Promise<unknown>>());
  /** Attachments this device has played or saved, so their sudden removal can be explained. */
  const usedRef = useRef(new Set<string>());

  const selfId = state.self?.id;

  async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(serverBase() + path, {
      method,
      headers: {
        authorization: `Bearer ${tokenRef.current}`,
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return undefined as T;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `Request failed (${res.status})`);
    return json as T;
  }

  useEffect(() => {
    const loaded = loadIdentity();
    identityRef.current = loaded.identity;
    askForName.current = loaded.isNew;
    tabIdRef.current = randomHex(16);
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const open = () => {
      clearTimeout(retry);
      const scheme = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${scheme}://${serverHost()}${routes.ws}`);
      socketRef.current = socket;
      socket.onopen = () => {
        const { deviceId, deviceSecret, name } = identityRef.current!;
        const hello: ClientMessage = {
          type: "hello",
          protocolVersion: PROTOCOL_VERSION,
          deviceId,
          deviceSecret,
          tabId: tabIdRef.current!,
          name,
        };
        socket.send(JSON.stringify(hello));
      };
      socket.onmessage = (raw) => {
        const event = JSON.parse(raw.data) as ServerEvent;
        if (event.type === "session:welcome") {
          tokenRef.current = event.token;
          // A first visit opens on "Available devices", to show straight away who else is around.
          if (askForName.current) {
            setRenaming("welcome");
            setPanel("devices");
          }
          askForName.current = false;
        }
        if (event.type === "stream:request") {
          return void serveLiveRange(event, liveFilesRef.current, liveAnnouncementsRef.current, tokenRef.current);
        }
        if (event.type === "message:deleted") liveFilesRef.current.delete(event.messageId);
        dispatch({ type: "event", event, using: event.type === "message:deleted" && usedRef.current.has(event.messageId) });
        if (event.type === "session:welcome") dispatch({ type: "loadRead", stored: loadReadState() });
        // Messages arriving in the chat on screen are read as they arrive.
        const open = chatIdRef.current;
        // The reducer ignores messages from other chats; the open one may span several browsers of one phone.
        const arrived = event.type === "session:welcome" || event.type === "message:created";
        if (open && arrived && document.visibilityState === "visible") dispatch({ type: "read", chatId: open });
      };
      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        tokenRef.current = undefined;
        for (const upload of uploadsRef.current.values()) {
          upload.stopped = true;
          upload.xhr?.abort();
        }
        dispatch({ type: "disconnected" });
        retry = setTimeout(open, RECONNECT_MS);
      };
    };

    // Phones suspend background pages; reconnect the moment the user comes back.
    const onVisible = () => {
      const s = socketRef.current;
      if (document.visibilityState !== "visible") return;
      if (!s || s.readyState >= WebSocket.CLOSING) open();
      if (chatIdRef.current) dispatch({ type: "read", chatId: chatIdRef.current });
    };
    const onHash = () => {
      const id = chatIdFromHash();
      chatIdRef.current = id;
      setChatId(id);
      if (id) dispatch({ type: "read", chatId: id });
    };
    // Playing a video or saving a file anywhere (bubble, menu, viewer) marks it in use. Listened for
    // in the capture phase because media events don't bubble.
    const onUse = (e: Event) => {
      const target = e.target as HTMLElement;
      const url = target instanceof HTMLMediaElement ? target.currentSrc : target.closest?.("a[download]")?.getAttribute("href");
      const id = url && /\/messages\/([^/]+)\/attachment/.exec(url)?.[1];
      if (id) usedRef.current.add(id);
    };
    document.addEventListener("play", onUse, true);
    document.addEventListener("click", onUse, true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("hashchange", onHash);
    onHash();
    open();
    return () => {
      disposed = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("play", onUse, true);
      document.removeEventListener("click", onUse, true);
      window.removeEventListener("hashchange", onHash);
      socketRef.current?.close();
    };
  }, []);

  // Read state is per device and only ever written here; changes come from the handlers above.
  useEffect(() => {
    if (!state.readAt) return;
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(state.readAt));
    } catch {
      // Not persisted; unread counts reset on reload.
    }
  }, [state.readAt]);

  // Rescanned each time the picker opens; the previous list stays up meanwhile.
  const token = state.token;
  useEffect(() => {
    if (!picking || !token) return;
    let cancelled = false;
    fetchNetworkDevices(token).then(
      (devices) => !cancelled && setNetworkDevices(devices),
      () => !cancelled && setNetworkDevices([]),
    );
    return () => {
      cancelled = true;
    };
  }, [picking, token]);

  function openChat(id: string | undefined) {
    // Each chat keeps its own draft; replies and picked files belong to the chat they were made in.
    setReplyTo(undefined);
    setFiles([]);
    if (id) {
      // Marked as opened from inside LANDrop, so closing can go back to the list. Like WhatsApp, only one
      // chat sits above the list: switching chats replaces it, so Back always returns to the list.
      const url = `#/chat/${encodeURIComponent(id)}`;
      if (history.state?.openedHere && chatIdFromHash()) history.replaceState(history.state, "", url);
      else history.pushState({ openedHere: true }, "", url);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else if (chatIdFromHash()) {
      // The phone's back gesture keeps working; a chat opened straight from a link has no list to go back to.
      if (history.state?.openedHere) history.back();
      else location.replace("#");
    }
  }

  function rename(name: string) {
    setRenaming(undefined);
    const current = identityRef.current;
    if (!current || !name || name === current.name) return;
    identityRef.current = { ...current, name };
    saveIdentity(identityRef.current);
    const update: ClientMessage = { type: "profile:update", name };
    socketRef.current?.send(JSON.stringify(update));
  }

  function chooseFiles(picked: File[]) {
    setFiles((current) => [...current, ...picked]);
    dispatch({ type: "notice", notice: undefined });
  }

  /** Sends the typed text and picked files, plus `extra` files such as a voice message just recorded. */
  async function send(extra: File[] = []) {
    // The contact's browser that's open now, which may not be the one the chat was opened with.
    const chatId = activeChat?.id;
    if (!chatId) return;
    if (state.connection !== "online") {
      return dispatch({ type: "notice", notice: "Not connected to the LANDrop host yet. Reconnecting…" });
    }
    const body = (drafts[chatId] ?? "").trim();
    const toUpload = [...files, ...extra];
    if (!body && toUpload.length === 0) return;
    // The reply quote goes on the first message sent: the text, or else the first attachment.
    let replyToId = replyTo?.id;
    setDrafts((d) => ({ ...d, [chatId]: "" }));
    setFiles([]);
    setReplyTo(undefined);
    try {
      if (body) {
        await api<Message>(routes.messages, "POST", { chatId, text: body, replyToId });
        replyToId = undefined;
      }
      for (const file of toUpload) {
        // Over the cap, the file isn't uploaded: it stays on this device and is streamed to whoever opens it.
        const live = file.size > MAX_ATTACHMENT_BYTES;
        const announcement = api<Message>(routes.messages, "POST", {
          chatId,
          replyToId,
          attachment: { name: file.name, size: file.size, mimeType: file.type || "application/octet-stream", live },
        });
        if (live) liveAnnouncementsRef.current.add(announcement);
        const message = await announcement.finally(() => liveAnnouncementsRef.current.delete(announcement));
        replyToId = undefined;
        if (!live) void uploadAttachment(message.id, file);
        else {
          liveFilesRef.current.set(message.id, file);
          dispatch({
            type: "notice",
            notice: `${file.name} is shared live from this device. Keep LANDrop open here, or it leaves the chat.`,
          });
        }
      }
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't send: ${(err as Error).message}` });
    }
  }

  async function uploadAttachment(messageId: string, file: File) {
    const control: { stopped: boolean; xhr?: XMLHttpRequest } = { stopped: false };
    uploadsRef.current.set(messageId, control);
    try {
      // Upload and hash in parallel: the host hashes what arrives, we hash the original.
      const [, sha256] = await Promise.all([putFile(routes.attachmentData(messageId), file, control), hashFile(file, control)]);
      await api(routes.attachmentChecksum(messageId), "POST", { sha256 });
    } catch (err) {
      if (!control.stopped) dispatch({ type: "notice", notice: `${file.name} failed to send: ${(err as Error).message}` });
    } finally {
      uploadsRef.current.delete(messageId);
    }
  }

  function putFile(path: string, file: File, control: { stopped: boolean; xhr?: XMLHttpRequest }) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      control.xhr = xhr;
      xhr.open("PUT", serverBase() + path);
      xhr.setRequestHeader("authorization", `Bearer ${tokenRef.current}`);
      xhr.setRequestHeader("content-type", "application/octet-stream");
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(new Error(safeMessage(xhr.responseText) ?? `HTTP ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Connection to the host was lost"));
      xhr.onabort = () => reject(new Error("Upload stopped"));
      // The browser streams the File from disk; it is never read into memory here.
      xhr.send(file);
    });
  }

  async function deleteChat(chat: ChatSummary) {
    setHeldChat(undefined);
    // A phone used from several browsers is one chat here, but one chat per browser on the host.
    const ids = chat.kind !== "private" ? [chat.id] : (people.find((p) => p.id === chat.id)?.chatIds ?? [chat.id]);
    try {
      await Promise.all(ids.map((id) => api(routes.chat(id), "DELETE")));
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't delete the chat: ${(err as Error).message}` });
    }
  }

  async function createGroup(deviceIds: string[], name: string) {
    // Your other browsers join too, so the group shows wherever you open LANDrop.
    const ownBrowsers = Object.values(state.devices).filter((d) => d.id !== selfId && selfMachine && d.machine === selfMachine);
    try {
      const group = await api<Group>(routes.groups, "POST", { name, members: [...deviceIds, ...ownBrowsers.map((d) => d.id)] });
      dispatch({ type: "event", event: { type: "group:updated", group } });
      setGroupPicker(undefined);
      setPanel("chats");
      openChat(group.id);
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't create the group: ${(err as Error).message}` });
    }
  }

  async function updateGroup(id: string, change: { name?: string; addMembers?: string[] }) {
    try {
      dispatch({ type: "event", event: { type: "group:updated", group: await api<Group>(routes.group(id), "PATCH", change) } });
      setGroupPicker(undefined);
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't change the group: ${(err as Error).message}` });
    }
  }

  async function leaveGroup(group: Group) {
    setLeaving(undefined);
    setGroupInfo(false);
    if (activeChat?.id === group.id) openChat(undefined);
    try {
      await api(routes.leaveGroup(group.id), "POST");
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't leave the group: ${(err as Error).message}` });
    }
  }

  async function removeMessage(message: Message) {
    setSelected(undefined);
    const upload = uploadsRef.current.get(message.id);
    if (upload) {
      upload.stopped = true;
      upload.xhr?.abort();
    }
    try {
      await api(routes.message(message.id), "DELETE");
    } catch (err) {
      dispatch({ type: "notice", notice: `Couldn't remove: ${(err as Error).message}` });
    }
  }

  /** A device's current name; the name stored on the message is only a fallback for devices not in the directory. */
  const nameOf = (id: string | undefined, fallback: string) => (id && state.devices[id]?.name) || fallback;
  const isOnline = (id: string) => state.online.some((d) => d.id === id);
  const urls = (messageId: string) => ({
    download: `${serverBase()}${routes.attachment(messageId)}?token=${state.token}`,
    preview: `${serverBase()}${routes.attachmentPreview(messageId)}?token=${state.token}`,
  });

  const otherDevices = selfId ? Object.values(state.devices).filter((d) => d.id !== selfId) : [];
  const selfMachine = selfId ? state.devices[selfId]?.machine : undefined;
  const people = selfId
    ? contacts(otherDevices, state.devices[selfId]?.machine).map((members) => {
        const online = members.filter((d) => isOnline(d.id));
        const lastSeen = Math.max(...members.map((d) => d.lastSeen));
        // Talk to the browser open now, else the one used last.
        const lead = online[0] ?? members.find((d) => d.lastSeen === lastSeen)!;
        return {
          id: privateChatId(selfId, lead.id),
          name: lead.name,
          online: online.length > 0,
          lastSeen,
          chatIds: members.map((d) => privateChatId(selfId, d.id)),
          deviceIds: members.map((d) => d.id),
        };
      })
    : [];

  // ---------- Open chat ----------

  const others = state.online.filter((d) => d.id !== selfId);
  const activeChat = ((): (OpenChat & { chatIds: string[] }) | undefined => {
    if (!chatId || !selfId) return undefined;
    const group = state.groups[chatId];
    if (group) {
      const names = group.members.filter((id) => id !== selfId).map((id) => nameOf(id, "Unknown device"));
      return { id: chatId, chatIds: [chatId], title: group.name, kind: "group", online: false, subtitle: [...names, "You"].join(", ") };
    }
    const members = chatMembers(chatId);
    if (members === "everyone") {
      return {
        id: chatId,
        chatIds: [chatId],
        title: "LANDrop group",
        kind: "everyone",
        online: false,
        subtitle: others.length ? [...others.map((d) => d.name), "You"].join(", ") : "Only you are online",
      };
    }
    const otherId = members?.find((id) => id !== selfId);
    const other = otherId ? state.devices[otherId] : undefined;
    if (!members?.includes(selfId) || !other) return undefined;
    const person = people.find((p) => p.chatIds.includes(chatId));
    // Our own other browsers aren't listed, but a chat with one can still be opened by its link.
    const { id, name, online, lastSeen, chatIds } = person ?? {
      id: chatId,
      name: other.name,
      online: isOnline(other.id),
      lastSeen: other.lastSeen,
      chatIds: [chatId],
    };
    return { id, chatIds, title: name, kind: "private", online, subtitle: online ? "online" : formatLastSeen(lastSeen) };
  })();
  const chatMessages = activeChat ? state.messages.filter((m) => activeChat.chatIds.includes(m.chatId)) : [];

  // ---------- Chat list ----------

  const lastByChat = new Map<string, Message>();
  const unreadByChat = new Map<string, number>();
  for (const m of state.messages) {
    lastByChat.set(m.chatId, m);
    const read = state.readAt?.[m.chatId] ?? state.readAt?.["*"] ?? Infinity;
    if (m.senderId !== selfId && m.createdAt > read) unreadByChat.set(m.chatId, (unreadByChat.get(m.chatId) ?? 0) + 1);
  }
  const summarize = (id: string, title: string, kind: ChatKind, online: boolean, chatIds = [id]): ChatSummary => {
    const last = chatIds
      .map((c) => lastByChat.get(c))
      .reduce<Message | undefined>((a, b) => (!b || (a && a.createdAt >= b.createdAt) ? a : b), undefined);
    const who = !last ? "" : last.senderId === selfId ? "You: " : kind !== "private" ? `${nameOf(last.senderId, last.senderName)}: ` : "";
    return {
      id,
      title,
      kind,
      online,
      preview: last && who + messagePreview(last),
      lastAt: last?.createdAt,
      unread: chatIds.reduce((sum, c) => sum + (unreadByChat.get(c) ?? 0), 0),
    };
  };
  // Like WhatsApp: the LANDrop group, your groups, and conversations that have happened. A private chat
  // opened from the device list shows while it's open, and drops out again if it's left without a message.
  const chats: ChatSummary[] = selfId
    ? [
        summarize(GROUP_CHAT_ID, "LANDrop group", "everyone", false),
        ...Object.values(state.groups).map((g) => summarize(g.id, g.name, "group", false)),
        ...people.map((p) => summarize(p.id, p.name, "private", p.online, p.chatIds)),
      ]
        .filter((c) => c.kind !== "private" || c.lastAt !== undefined || c.id === activeChat?.id)
        // Most recent conversation first; an empty one just opened sits at the end.
        .sort((a, b) => (b.lastAt ?? -1) - (a.lastAt ?? -1))
    : [];
  const openGroup = activeChat?.kind === "group" ? state.groups[activeChat.id] : undefined;
  /** Phones and computers that can be put in a group: all of them for a new one, those not in it yet for the open one. */
  const groupContacts: Contact[] = people
    .filter((p) => groupPicker !== "add" || !p.deviceIds.some((id) => openGroup?.members.includes(id)))
    .map((p) => ({ key: p.id, name: p.name, deviceIds: p.deviceIds, online: p.online, status: p.online ? "online" : formatLastSeen(p.lastSeen) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  const pickableDevices: PickableDevice[] = people
    .map((p) => ({ chatId: p.id, name: p.name, online: p.online, status: p.online ? "online" : formatLastSeen(p.lastSeen) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!isFileDrag(e) || !activeChat) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!isFileDrag(e) || !activeChat) return;
      e.preventDefault(); // required for the drop event to fire
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!isFileDrag(e) || !activeChat) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!isFileDrag(e) || !activeChat) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      // Browsers hand folders over as empty File entries that can't be read; leave them out.
      const items = [...e.dataTransfer.items].filter((item) => item.kind === "file");
      const folders = items.filter((item) => item.webkitGetAsEntry()?.isDirectory).length;
      const dropped = items.filter((item) => !item.webkitGetAsEntry()?.isDirectory).map((item) => item.getAsFile()!);
      chooseFiles(dropped.filter(Boolean));
      if (folders) dispatch({ type: "notice", notice: "Folders can't be sent yet. Drop the files inside them instead." });
    },
  };
  // Presence carries the latest name, including renames made in another tab of this browser.
  const selfName = (selfId && state.devices[selfId]?.name) || state.self?.name;
  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  return (
    // App chrome, not a document: no text selection or iOS callouts anywhere except text fields.
    <div
      {...dropHandlers}
      className="relative flex h-dvh bg-app select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
    >
      {/* Phone: one screen at a time. Wider screens: icon rail, list and open chat side by side, like WhatsApp Web. */}
      <Rail
        panel={panel}
        unread={totalUnread}
        selfName={selfName}
        selfId={selfId}
        onPanel={setPanel}
        onInvite={() => setInviting(true)}
      />
      <Sidebar hidden={!!activeChat}>
        {panel === "devices" ? (
          <DevicePicker
            devices={pickableDevices}
            network={networkDevices}
            onPick={(id) => {
              setPanel("chats");
              openChat(id);
            }}
            onBack={() => setPanel("chats")}
            onInvite={() => setInviting(true)}
          />
        ) : panel === "settings" ? (
          <Settings selfName={selfName} selfId={selfId} onRename={() => setRenaming("rename")} />
        ) : (
          <ChatList
            chats={chats}
            activeId={activeChat?.id}
            connection={state.connection}
            onOpen={openChat}
            onHold={setHeldChat}
            onInvite={() => setInviting(true)}
            onNewChat={() => setPanel("devices")}
            onNewGroup={() => setGroupPicker("create")}
            onSettings={() => setPanel("settings")}
          />
        )}
        <BottomTabs panel={panel} unread={totalUnread} onPanel={setPanel} />
      </Sidebar>
      <section className={`${activeChat ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {activeChat ? (
          <ChatView
            chat={activeChat}
            messages={chatMessages}
            selfId={selfId}
            nameOf={nameOf}
            progress={state.progress}
            urls={urls}
            composer={{
              text: drafts[activeChat.id] ?? "",
              files,
              replyTo,
              setText: (text) => setDrafts((d) => ({ ...d, [activeChat.id]: text })),
              removeFile: (index) => setFiles((current) => current.filter((_, i) => i !== index)),
              chooseFiles,
              cancelReply: () => setReplyTo(undefined),
              send: (extra) => void send(extra),
              notice: (notice) => dispatch({ type: "notice", notice }),
            }}
            onBack={() => openChat(undefined)}
            onInvite={() => setInviting(true)}
            onGroupInfo={() => setGroupInfo(true)}
            onLeaveGroup={() => setLeaving(openGroup)}
            onClearChat={() =>
              setHeldChat(
                chats.find((c) => c.id === activeChat.id) ?? {
                  id: activeChat.id,
                  title: activeChat.title,
                  kind: activeChat.kind,
                  online: activeChat.online,
                  unread: 0,
                },
              )
            }
            onOpenMedia={(m) => setViewing(m.id)}
            onOpenSender={(deviceId) => {
              if (!selfId || deviceId === selfId) return;
              // Their phone or computer as a whole, talking to whichever of its browsers is open now.
              openChat(people.find((p) => p.deviceIds.includes(deviceId))?.id ?? privateChatId(selfId, deviceId));
            }}
            onReply={setReplyTo}
            onLongPress={setSelected}
          />
        ) : (
          // WhatsApp Web's welcome pane while no chat is open.
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 border-b-[6px] border-accent bg-bar px-10 text-center">
            <span className="text-accent">
              <Logo size={96} />
            </span>
            <p className="text-[30px] font-light">LANDrop</p>
            <p className="max-w-md text-[14px] leading-6 text-muted">
              Send and receive messages and files of any size with every device on this Wi-Fi. Pick a chat to start.
            </p>
            <p className="absolute bottom-8 flex items-center gap-1.5 text-[13px] text-muted">
              <LockIcon />
              Everything stays on your network
            </p>
          </div>
        )}
      </section>

      {state.notice && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 z-30 flex w-[min(92vw,30rem)] -translate-x-1/2 items-start justify-between gap-3 rounded-lg bg-[#323739] py-3 pl-5 pr-2 text-[14px] text-white shadow-xl md:bottom-6"
        >
          <span className="pt-0.5">{state.notice}</span>
          <button
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
            onClick={() => dispatch({ type: "notice" })}
            aria-label="Dismiss"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {viewing && (
        <MediaViewer
          items={chatMessages.filter((m) => m.attachment && isAvailable(m.attachment) && ["image", "video"].includes(previewKind(m.attachment) ?? ""))}
          startId={viewing}
          urls={urls}
          describe={(m) => `${m.senderId === selfId ? "You" : nameOf(m.senderId, m.senderName)} · ${formatDay(m.createdAt)} at ${formatTime(m.createdAt)}`}
          onClose={() => setViewing(undefined)}
        />
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-panel/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-accent">
            <PlusIcon />
            <p className="text-[17px] font-semibold">Drop to attach</p>
            <p className="text-[13px] text-muted">Any size. Over {formatBytes(MAX_ATTACHMENT_BYTES)} is shared live from this device</p>
          </div>
        </div>
      )}

      {renaming && (
        <RenameDialog
          current={selfName ?? ""}
          welcome={renaming === "welcome"}
          onSave={rename}
          onCancel={() => setRenaming(undefined)}
        />
      )}
      {inviting && <JoinDialog networkAddresses={fetchNetworkAddresses} onClose={() => setInviting(false)} />}

      {heldChat && (
        <ChatSheet
          title={heldChat.title}
          action={heldChat.kind === "private" ? "delete" : "clear"}
          onConfirm={() => {
            // A deleted private chat leaves the list, so it can't stay open either.
            if (heldChat.kind === "private" && activeChat?.id === heldChat.id) openChat(undefined);
            void deleteChat(heldChat);
          }}
          onClose={() => setHeldChat(undefined)}
        />
      )}
      {leaving && (
        <ChatSheet title={leaving.name} action="leave" onConfirm={() => void leaveGroup(leaving)} onClose={() => setLeaving(undefined)} />
      )}
      {groupPicker && (
        <GroupMembersSheet
          mode={groupPicker}
          contacts={groupContacts}
          onSubmit={(ids, name) =>
            groupPicker === "create" ? createGroup(ids, name) : openGroup ? updateGroup(openGroup.id, { addMembers: ids }) : Promise.resolve()
          }
          onClose={() => setGroupPicker(undefined)}
        />
      )}
      {groupInfo && openGroup && !groupPicker && !leaving && (
        <GroupInfoSheet
          group={openGroup}
          selfId={selfId}
          nameOf={(id) => nameOf(id, "Unknown device")}
          isOnline={isOnline}
          canAdd={people.some((p) => !p.deviceIds.some((id) => openGroup.members.includes(id)))}
          onRename={(name) => updateGroup(openGroup.id, { name })}
          onAdd={() => setGroupPicker("add")}
          onLeave={() => setLeaving(openGroup)}
          onClose={() => setGroupInfo(false)}
        />
      )}
      {selected && (
        <MessageSheet
          message={selected}
          saveUrl={urls(selected.id).download}
          // Senders can remove their own messages; the host can moderate the group only (enforced again by the server).
          canRemove={selected.senderId === selfId || (state.isHost && selected.chatId === GROUP_CHAT_ID)}
          onReply={() => {
            setReplyTo(selected);
            setSelected(undefined);
          }}
          onRemove={() => removeMessage(selected)}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  );
}

/** One-line description of a message for the chat list. */
function messagePreview(m: Message): string {
  if (m.text) return m.text.replace(/\s+/g, " ");
  const a = m.attachment!;
  const kind = previewKind(a);
  if (kind === "audio") return a.name.startsWith("Voice message") ? "🎤 Voice message" : `🎵 ${a.name}`;
  if (a.mimeType === "image/gif") return "👾 GIF";
  return kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : `📄 ${a.name}`;
}

/** "last seen today at 3:20 PM", "last seen yesterday at …", or a date, like WhatsApp. */
function formatLastSeen(at: number): string {
  const date = new Date(at);
  const time = formatTime(at);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `last seen today at ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${time}`;
  return `last seen ${date.toLocaleDateString([], { day: "numeric", month: "short" })} at ${time}`;
}

function loadReadState(): Record<string, number> | null {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "null");
  } catch {
    return null;
  }
}

// ---------- Identity ----------

interface Identity {
  deviceId: string;
  deviceSecret: string;
  name: string;
}

/** A device keeps the same identity across reloads so its messages stay attributed to it. */
function loadIdentity(): { identity: Identity; isNew: boolean } {
  try {
    const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "null") as Identity | null;
    if (stored?.deviceId && stored.deviceSecret && stored.name) return { identity: stored, isNew: false };
  } catch {
    // Storage unavailable (e.g. private browsing): fall through to a fresh identity for this visit.
  }
  const name = guessDeviceName(navigator.userAgent, navigator.maxTouchPoints);
  const identity = { deviceId: randomHex(16), deviceSecret: randomHex(32), name };
  saveIdentity(identity);
  return { identity, isNew: true };
}

function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Not persisted; the identity lasts for this visit only.
  }
}

/** crypto.getRandomValues works on plain-HTTP LAN pages, unlike crypto.randomUUID. */
function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Helpers ----------

async function hashFile(file: File, control: { stopped: boolean }): Promise<string> {
  const hasher = await createSHA256();
  hasher.init();
  for (let offset = 0; offset < file.size; offset += HASH_SLICE_BYTES) {
    if (control.stopped) throw new Error("Stopped");
    // One slice in memory at a time; awaiting each read keeps the UI responsive.
    hasher.update(new Uint8Array(await file.slice(offset, offset + HASH_SLICE_BYTES).arrayBuffer()));
  }
  return hasher.digest("hex");
}

function safeMessage(body: string): string | undefined {
  try {
    return JSON.parse(body).message;
  } catch {
    return undefined;
  }
}
