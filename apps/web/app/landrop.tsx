"use client";

import { createSHA256 } from "hash-wasm";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  DEFAULT_LAN_PORT,
  GROUP_CHAT_ID,
  MAX_ATTACHMENT_BYTES,
  PROTOCOL_VERSION,
  chatMembers,
  previewKind,
  privateChatId,
  routes,
  type ClientMessage,
  type Device,
  type KnownDevice,
  type Message,
  type ServerEvent,
} from "@landrop/protocol";
import { ChatList, type ChatSummary } from "./chat-list";
import { ChatView, type OpenChat } from "./chat-view";
import { Sidebar } from "./sidebar";
import { ImageViewer, MessageSheet, PlusIcon, RenameDialog, formatBytes } from "./ui";

const LAN_PORT = Number(process.env.NEXT_PUBLIC_LANDROP_PORT ?? DEFAULT_LAN_PORT);
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

const initialState: State = { connection: "connecting", isHost: false, online: [], devices: {}, messages: [], progress: {} };

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
  for (const d of online) next[d.id] = { id: d.id, name: d.name, lastSeen: now };
  return next;
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
    const newest = Math.max(0, ...state.messages.filter((m) => m.chatId === action.chatId).map((m) => m.createdAt));
    if (!state.readAt || newest <= (state.readAt[action.chatId] ?? 0)) return state;
    return { ...state, readAt: { ...state.readAt, [action.chatId]: newest } };
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
      };
    case "presence:update":
      return { ...state, online: e.online, devices: withPresence(state.devices, state.online, e.online) };
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
const serverBase = () => `${location.protocol}//${location.hostname}:${LAN_PORT}`;

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
  return match && chatMembers(decodeURIComponent(match[1])) ? decodeURIComponent(match[1]) : undefined;
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
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  /** dragenter/dragleave fire for every child element; count them so the overlay doesn't flicker. */
  const dragDepth = useRef(0);
  const [viewing, setViewing] = useState<Message>();
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
    identityRef.current = loadIdentity();
    tabIdRef.current = randomHex(16);
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const open = () => {
      clearTimeout(retry);
      const scheme = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${scheme}://${location.hostname}:${LAN_PORT}${routes.ws}`);
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
        if (event.type === "session:welcome") tokenRef.current = event.token;
        if (event.type === "stream:request") {
          return void serveLiveRange(event, liveFilesRef.current, liveAnnouncementsRef.current, tokenRef.current);
        }
        if (event.type === "message:deleted") liveFilesRef.current.delete(event.messageId);
        dispatch({ type: "event", event, using: event.type === "message:deleted" && usedRef.current.has(event.messageId) });
        if (event.type === "session:welcome") dispatch({ type: "loadRead", stored: loadReadState() });
        // Messages arriving in the chat on screen are read as they arrive.
        const open = chatIdRef.current;
        const arrived = event.type === "session:welcome" || (event.type === "message:created" && event.message.chatId === open);
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

  function openChat(id: string | undefined) {
    // Each chat keeps its own draft; replies and picked files belong to the chat they were made in.
    setReplyTo(undefined);
    setFiles([]);
    if (id) location.hash = `/chat/${encodeURIComponent(id)}`;
    else if (chatIdFromHash()) history.back();
  }

  function rename(name: string) {
    setRenaming(false);
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

  async function send() {
    if (!chatId) return;
    if (state.connection !== "online") {
      return dispatch({ type: "notice", notice: "Not connected to the LANDrop host yet. Reconnecting…" });
    }
    const body = (drafts[chatId] ?? "").trim();
    const toUpload = files;
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

  // ---------- Chat list ----------

  const lastByChat = new Map<string, Message>();
  const unreadByChat = new Map<string, number>();
  for (const m of state.messages) {
    lastByChat.set(m.chatId, m);
    const read = state.readAt?.[m.chatId] ?? state.readAt?.["*"] ?? Infinity;
    if (m.senderId !== selfId && m.createdAt > read) unreadByChat.set(m.chatId, (unreadByChat.get(m.chatId) ?? 0) + 1);
  }
  const summarize = (id: string, title: string, isGroup: boolean, online: boolean): ChatSummary => {
    const last = lastByChat.get(id);
    const who = !last ? "" : last.senderId === selfId ? "You: " : isGroup ? `${nameOf(last.senderId, last.senderName)}: ` : "";
    return {
      id,
      title,
      isGroup,
      online,
      preview: last && who + messagePreview(last),
      lastAt: last?.createdAt,
      unread: unreadByChat.get(id) ?? 0,
    };
  };
  const chats: ChatSummary[] = selfId
    ? [
        summarize(GROUP_CHAT_ID, "LANDrop group", true, false),
        ...Object.values(state.devices)
          .filter((d) => d.id !== selfId)
          .map((d) => summarize(privateChatId(selfId, d.id), d.name, false, isOnline(d.id))),
      ].sort(
        // Most recent conversation first, like WhatsApp; people never messaged come after, online ones first.
        (a, b) => (b.lastAt ?? -1) - (a.lastAt ?? -1) || Number(b.online) - Number(a.online) || a.title.localeCompare(b.title),
      )
    : [];

  // ---------- Open chat ----------

  const others = state.online.filter((d) => d.id !== selfId);
  const activeChat = ((): OpenChat | undefined => {
    if (!chatId || !selfId) return undefined;
    const members = chatMembers(chatId);
    if (members === "everyone") {
      return {
        id: chatId,
        title: "LANDrop group",
        isGroup: true,
        online: false,
        subtitle: others.length ? [...others.map((d) => d.name), "You"].join(", ") : "Only you are online",
      };
    }
    const otherId = members?.find((id) => id !== selfId);
    const other = otherId ? state.devices[otherId] : undefined;
    if (!members?.includes(selfId) || !other) return undefined;
    const online = isOnline(other.id);
    return {
      id: chatId,
      title: other.name,
      isGroup: false,
      online,
      subtitle: online ? "online" : formatLastSeen(other.lastSeen),
    };
  })();
  const chatMessages = activeChat ? state.messages.filter((m) => m.chatId === activeChat.id) : [];

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

  return (
    // App chrome, not a document: no text selection or iOS callouts anywhere except text fields.
    <div
      {...dropHandlers}
      className="relative flex h-dvh bg-background select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
    >
      {/* Phone: one screen at a time. Wider screens: the list beside the open chat, like WhatsApp Desktop. */}
      <Sidebar hidden={!!activeChat}>
        {({ compact, pinned, togglePinned }) => (
          <ChatList
            chats={chats}
            activeId={activeChat?.id}
            selfName={selfName}
            connection={state.connection}
            compact={compact}
            pinned={pinned}
            onTogglePinned={togglePinned}
            onOpen={openChat}
            onRename={() => setRenaming(true)}
          />
        )}
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
              send: () => void send(),
            }}
            onBack={() => openChat(undefined)}
            onOpenImage={setViewing}
            onReply={setReplyTo}
            onLongPress={setSelected}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
            <p className="text-[17px] font-semibold text-foreground">LANDrop</p>
            <p className="max-w-72 text-[13px]">Pick a chat to start. Everything stays on this Wi-Fi network.</p>
          </div>
        )}
      </section>

      {state.notice && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 z-30 flex w-[min(92vw,28rem)] -translate-x-1/2 items-start justify-between gap-3 rounded-2xl bg-bar px-3 py-2 text-[13px] shadow-lg ring-1 ring-ios-red/40"
        >
          <span>{state.notice}</span>
          <button className="shrink-0 text-muted" onClick={() => dispatch({ type: "notice" })} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {viewing?.attachment && (
        <ImageViewer
          name={viewing.attachment.name}
          url={urls(viewing.id).preview}
          downloadUrl={urls(viewing.id).download}
          onClose={() => setViewing(undefined)}
        />
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-ios-blue bg-background/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-ios-blue">
            <PlusIcon />
            <p className="text-[17px] font-semibold">Drop to attach</p>
            <p className="text-[13px] text-muted">Any size. Over {formatBytes(MAX_ATTACHMENT_BYTES)} is shared live from this device</p>
          </div>
        </div>
      )}

      {renaming && <RenameDialog current={selfName ?? ""} onSave={rename} onCancel={() => setRenaming(false)} />}

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
  return kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : `📄 ${a.name}`;
}

/** "last seen today at 3:20 PM", "last seen yesterday at …", or a date, like WhatsApp. */
function formatLastSeen(at: number): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
function loadIdentity(): Identity {
  try {
    const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "null") as Identity | null;
    if (stored?.deviceId && stored.deviceSecret && stored.name) return stored;
  } catch {
    // Storage unavailable (e.g. private browsing): fall through to a fresh identity for this visit.
  }
  const identity = { deviceId: randomHex(16), deviceSecret: randomHex(32), name: defaultDeviceName() };
  saveIdentity(identity);
  return identity;
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

function defaultDeviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\/|FxiOS/.test(ua)
      ? "Firefox"
      : /Chrome\/|CriOS/.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${browser} on ${os}`;
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
