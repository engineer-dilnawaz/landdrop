"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MAX_ATTACHMENT_BYTES, type Message } from "@landrop/protocol";
import { Bubble, TIME_GAP_MS } from "./bubble";
import { ChatAvatar, type ChatKind } from "./chat-list";
import { FolderArchive } from "./folder";
import type { Receipt } from "./receipts";
import { SelectionBar } from "./selection";
import type { Progress, ReadingFolder } from "./landrop";
import {
  Avatar,
  BackIcon,
  CameraIcon,
  CloseIcon,
  DropdownMenu,
  FILLED_BUTTON,
  FileIcon,
  FolderIcon,
  ICON_BUTTON,
  ImageIcon,
  LockIcon,
  PinIcon,
  PlusIcon,
  QrIcon,
  SHEET_ITEM,
  SendIcon,
  Sheet,
  Spinner,
  TickIcon,
  colourFor,
  formatBytes,
  formatDay,
} from "./ui";

/**
 * Browsers name every pasted screenshot or copied image "image.png"; give each a distinct,
 * recognisable name so several pasted images can be told apart in the chat.
 */
function namePasted(file: File): File {
  if (!/^image\.\w+$/.test(file.name)) return file;
  const stamp = new Date().toLocaleString([], { dateStyle: "short", timeStyle: "medium" }).replace(/[/:]/g, ".");
  return new File([file], `Pasted image ${stamp}${file.name.slice(file.name.lastIndexOf("."))}`, { type: file.type });
}

export interface OpenChat {
  id: string;
  title: string;
  kind: ChatKind;
  online: boolean;
  /** Who is in it or online, or "online" / "last seen …" for a private chat. */
  subtitle: string;
}

export function ChatView({
  chat,
  messages,
  selfId,
  nameOf,
  progress,
  urls,
  composer,
  onBack,
  onInvite,
  onGroupInfo,
  onLeaveGroup,
  onClearChat,
  onOpenMedia,
  onOpenFolder,
  onOpenSender,
  receiptOf,
  onReply,
  onLongPress,
  selection,
  pinned,
  chatPinned,
  onTogglePinChat,
  onRename,
}: {
  chat: OpenChat;
  messages: Message[];
  selfId?: string;
  nameOf: (id: string | undefined, fallback: string) => string;
  progress: Record<string, Progress>;
  urls: (messageId: string) => { download: string; preview: string };
  composer: {
    text: string;
    files: File[];
    replyTo?: Message;
    setText: (text: string) => void;
    removeFile: (index: number) => void;
    chooseFiles: (files: File[]) => void;
    /** What a folder picker returned: the folder's files with their paths. */
    pickFolder: (list: FileList) => void;
    /** A folder dropped in; it's listed file by file, shown in `readingFolders` until it's ready. */
    dropFolder: (entry: FileSystemDirectoryEntry) => void;
    readingFolders: ReadingFolder[];
    cancelReply: () => void;
    /** Sends what's typed and picked, plus `extra` files (a voice message). */
    send: (extra?: File[]) => void;
    notice: (text: string) => void;
  };
  /** Leaves the chat: back to the list on phones, the welcome screen on computers. */
  onBack: () => void;
  /** Shows the join QR code, with Save and Share, so more devices can join. */
  onInvite: () => void;
  /** A group's members, name and settings. */
  onGroupInfo: () => void;
  /** Asks first. */
  onLeaveGroup: () => void;
  /** Clear the group or delete a private chat (asks first). */
  onClearChat: () => void;
  onOpenMedia: (message: Message) => void;
  onOpenFolder: (message: Message) => void;
  /** Opens the private chat with whoever sent a message. */
  onOpenSender: (deviceId: string) => void;
  /** The ticks on one of your messages. */
  receiptOf: (message: Message) => Receipt;
  onReply: (message: Message) => void;
  onLongPress: (message: Message) => void;
  /** The chat's pinned message, shown as a banner under the header. */
  pinned?: { id: string; sender: string; preview: string; onUnpin: () => void };
  /** This chat is pinned to the top of the list. */
  chatPinned: boolean;
  onTogglePinChat: () => void;
  /** Names the shared chat; only that chat has it. */
  onRename: () => void;
  /** Set while several messages are being picked: which are, and what can be done with them. */
  selection?: {
    ids: ReadonlySet<string>;
    canCopy: boolean;
    canDownload: boolean;
    canForward: boolean;
    canDelete: boolean;
    onToggle: (message: Message) => void;
    onCopy: () => void;
    onDownload: () => void;
    onForward: () => void;
    onDelete: () => void;
    onCancel: () => void;
  };
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /** Whether the view stays at the newest message as the chat grows: until the user scrolls up. */
  const atBottomRef = useRef(true);
  const { text, files, replyTo } = composer;
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const touch = () => matchMedia("(pointer: coarse)").matches;

  // Open at the newest message, and follow new ones as they arrive, like a chat app.
  useLayoutEffect(() => {
    atBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.id, messages.length]);

  // Photos and videos finish loading after the chat opens and grow, pushing the newest message out
  // of view; so does the phone keyboard opening. Stay at the bottom unless the user scrolled up.
  useEffect(() => {
    const scroller = scrollerRef.current!;
    let height = scroller.clientHeight;
    const onScroll = () => {
      // The keyboard opening shrinks the list and the browser shifts it while it settles: that isn't the user scrolling up.
      if (scroller.clientHeight !== height) return;
      atBottomRef.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    };
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
      height = scroller.clientHeight;
    });
    scroller.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(scroller);
    observer.observe(contentRef.current!);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  function showMessage(id: string) {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 700, delay: 250 });
  }

  /** Pasting an image or file anywhere in the chat attaches it, like dropping it. */
  function attachPasted(e: React.ClipboardEvent) {
    const pasted = [...e.clipboardData.files];
    if (!pasted.length) return;
    // Copied text (e.g. alongside an image from a web page) still goes into the message as usual.
    if (!e.clipboardData.types.includes("text/plain")) e.preventDefault();
    composer.chooseFiles(pasted.map(namePasted));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPaste={attachPasted}>
      {selection ? (
        <SelectionBar
          count={selection.ids.size}
          canCopy={selection.canCopy}
          canDownload={selection.canDownload}
          canForward={selection.canForward}
          canDelete={selection.canDelete}
          onCopy={selection.onCopy}
          onDownload={selection.onDownload}
          onForward={selection.onForward}
          onDelete={selection.onDelete}
          onCancel={selection.onCancel}
        />
      ) : (
      <header className="z-10 flex h-16 shrink-0 items-center gap-1 bg-bar px-2 pt-[env(safe-area-inset-top)] box-content md:box-border md:gap-3 md:px-4 md:pt-0">
        <button onClick={onBack} className={`${ICON_BUTTON} text-foreground md:hidden`} aria-label="Back to chats">
          <BackIcon />
        </button>
        {/* Like WhatsApp, a group's name opens its info. */}
        <button
          onClick={chat.kind === "group" ? onGroupInfo : undefined}
          disabled={chat.kind !== "group"}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
          aria-label={chat.kind === "group" ? `${chat.title}: group info` : undefined}
        >
          <ChatAvatar chat={chat} size="header" />
          <span className="min-w-0 flex-1 pl-2 md:pl-0">
            <span className="block truncate text-[16px] font-medium leading-tight">{chat.title}</span>
            <span className="block truncate text-[13px] text-muted">{chat.subtitle}</span>
          </span>
        </button>
        {chat.kind === "everyone" && (
          <button onClick={onInvite} className={ICON_BUTTON} aria-label="Invite devices: show QR code" title="Invite devices">
            <QrIcon />
          </button>
        )}
        <DropdownMenu
          label="Chat menu"
          items={[
            ...(chat.kind === "everyone" ? [{ label: "Invite devices", onSelect: onInvite }] : []),
            ...(chat.kind === "group" ? [{ label: "Group info", onSelect: onGroupInfo }] : []),
            { label: chatPinned ? "Unpin chat" : "Pin chat to top", onSelect: onTogglePinChat },
            ...(chat.kind === "everyone" ? [{ label: "Rename chat", onSelect: onRename }] : []),
            { label: "Close chat", onSelect: onBack },
            { label: chat.kind === "private" ? "Delete chat" : "Clear chat", onSelect: onClearChat, danger: true },
            ...(chat.kind === "group" ? [{ label: "Leave group", onSelect: onLeaveGroup, danger: true }] : []),
          ]}
        />
      </header>
      )}

      {pinned && !selection && (
        <div className="page-in z-10 flex shrink-0 items-center gap-1 bg-bar px-3 py-1.5">
          <button
            onClick={() => showMessage(pinned.id)}
            aria-label="Go to the pinned message"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-hover"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <PinIcon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-medium leading-4 text-accent">Pinned · {pinned.sender}</span>
              <span className="block truncate text-[13px] leading-[18px] text-muted">{pinned.preview}</span>
            </span>
          </button>
          <button onClick={pinned.onUnpin} aria-label="Unpin message" title="Unpin" className={`${ICON_BUTTON} !size-8`}>
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      <div className="wallpaper flex min-h-0 flex-1 flex-col">
        <main ref={scrollerRef} className="flex-1 overflow-y-auto px-3 pb-2 pt-2 md:px-[7%]" aria-live="polite">
          <div ref={contentRef} className="mx-auto flex max-w-4xl flex-col">
            <div className="page-in mx-auto mb-3 mt-2 flex w-full max-w-md items-start gap-3 rounded-xl bg-panel/85 p-3 backdrop-blur">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <LockIcon />
              </span>
              <div className="min-w-0 text-left">
                <p className="text-[13px] font-medium leading-5">
                  {chat.kind === "everyone" ? "Open to everyone here" : chat.kind === "group" ? "Just this group" : "Just the two of you"}
                </p>
                <p className="text-[12.5px] leading-[18px] text-muted">
                  {chat.kind === "everyone"
                    ? "Messages here go to everyone on this Wi-Fi who opens LANDrop. Nothing goes to the internet."
                    : chat.kind === "group"
                      ? "Only the devices in this group see its messages and files. They stay on this Wi-Fi."
                      : `Messages here are only between you and ${chat.title}, and stay on this Wi-Fi.`}
                </p>
              </div>
            </div>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const startsRun = newDay || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > TIME_GAP_MS;
              const own = m.senderId === selfId;
              const { download, preview } = urls(m.id);
              return (
                <div key={m.id} className={`${startsRun ? "mt-3" : "mt-0.5"} ${i >= messages.length - 6 ? "message-in" : ""}`}>
                  {newDay && (
                    <p className="mx-auto mb-3 mt-1 w-fit rounded-full bg-panel/85 px-3 py-1 text-center text-[11px] font-medium tracking-wider text-muted uppercase backdrop-blur">
                      {formatDay(m.createdAt)}
                    </p>
                  )}
                  <div className={`relative rounded-lg transition-colors ${selection ? "cursor-pointer pl-8" : ""} ${selection?.ids.has(m.id) ? "bg-accent/15" : ""}`}>
                  {selection && (
                    <>
                      <span
                        aria-hidden
                        className={`absolute left-1.5 top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-full ${
                          selection.ids.has(m.id) ? "bg-accent-fill text-white" : "bg-muted/35"
                        }`}
                      >
                        {selection.ids.has(m.id) && <TickIcon />}
                      </span>
                      <button
                        onClick={() => selection.onToggle(m)}
                        aria-pressed={selection.ids.has(m.id)}
                        aria-label={`Select message from ${nameOf(m.senderId, m.senderName)}`}
                        className="absolute inset-0 z-20"
                      />
                    </>
                  )}
                  <Bubble
                    message={m}
                    nameOf={nameOf}
                    own={own}
                    showSender={chat.kind !== "private" && !own && startsRun}
                    progress={progress[m.id]}
                    pinned={pinned?.id === m.id}
                    downloadUrl={download}
                    previewUrl={preview}
                    onOpenMedia={() => onOpenMedia(m)}
                    onOpenFolder={() => onOpenFolder(m)}
                    onReply={() => onReply(m)}
                    onLongPress={() => {
                      // iOS may already have started selecting under the finger; clear it before the menu opens.
                      window.getSelection()?.removeAllRanges();
                      onLongPress(m);
                    }}
                    onQuoteTap={showMessage}
                    receipt={own ? receiptOf(m) : undefined}
                    // Like WhatsApp: the sender's picture beside the first message of their run, the rest lined up under it.
                    avatar={
                      own ? undefined : startsRun ? (
                        // In a group it opens a private chat with them; in a private chat you're already there.
                        chat.kind !== "private" && m.senderId ? (
                          <button
                            onClick={() => onOpenSender(m.senderId!)}
                            aria-label={`Message ${nameOf(m.senderId, m.senderName)}`}
                            title={`Message ${nameOf(m.senderId, m.senderName)}`}
                            className="block shrink-0 rounded-full transition-opacity hover:opacity-80"
                          >
                            <Avatar name={nameOf(m.senderId, m.senderName)} seed={m.senderId} />
                          </button>
                        ) : (
                          <Avatar name={nameOf(m.senderId, m.senderName)} seed={m.senderId ?? m.senderName} />
                        )
                      ) : (
                        <span className="block size-8 shrink-0" />
                      )
                    }
                  />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </main>
      </div>

      <footer className="z-10 bg-bar px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:px-4">
        <div className="flex flex-col gap-1.5">
          {replyTo && (
            <div className="flex items-center gap-2 rounded-lg bg-panel/60 p-1.5 md:mx-24">
              <div
                className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-field py-1.5 pl-4 pr-3 text-[13px] leading-[17px]"
              >
                {/* The sender's colour as a bar down the left. */}
                <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: colourFor(replyTo.senderId ?? replyTo.senderName) }} />
                <p className="font-medium" style={{ color: colourFor(replyTo.senderId ?? replyTo.senderName) }}>
                  Replying to {replyTo.senderId === selfId ? "yourself" : nameOf(replyTo.senderId, replyTo.senderName)}
                </p>
                <p className="truncate text-muted">{replyTo.text ?? `📄 ${replyTo.attachment?.name}`}</p>
              </div>
              <button className={ICON_BUTTON} aria-label="Cancel reply" onClick={composer.cancelReply}>
                <CloseIcon size={20} />
              </button>
            </div>
          )}
          {(files.length > 0 || composer.readingFolders.length > 0) && (
            <ul className="flex flex-wrap gap-1.5 md:mx-24">
              {composer.readingFolders.map((r) => (
                <li key={r.id} className="flex min-w-60 flex-col gap-1.5 rounded-lg bg-panel py-2 pl-3 pr-1.5 text-[13px]" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <Spinner size={16} className="text-[#ffbc38]" />
                    <span className="max-w-44 truncate">{r.name}</span>
                    <span className="flex-1 text-muted">
                      {r.read.toLocaleString()} of {r.found.toLocaleString()} files
                      {r.scanning ? ", finding more…" : `, ${(r.found - r.read).toLocaleString()} left`}
                    </span>
                    <button
                      aria-label={`Stop adding ${r.name}`}
                      title="Stop"
                      className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover"
                      onClick={r.stop}
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                  <span className="mr-1.5 h-1 overflow-hidden rounded-full bg-field">
                    <span className="block h-full rounded-full bg-[#ffbc38] transition-[width]" style={{ width: `${r.found ? (r.read / r.found) * 100 : 0}%` }} />
                  </span>
                </li>
              ))}
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-panel py-1.5 pl-3 pr-1.5 text-[13px]">
                  {f instanceof FolderArchive ? (
                    <span className="text-[#ffbc38]">
                      <FolderIcon size={16} />
                    </span>
                  ) : (
                    <FileIcon size={16} />
                  )}
                  <span className="max-w-44 truncate">{f instanceof FolderArchive ? f.name.replace(/\.zip$/, "") : f.name}</span>
                  <span className="text-muted">
                    {f instanceof FolderArchive && `${f.files.length.toLocaleString()} ${f.files.length === 1 ? "file" : "files"} · `}
                    {formatBytes(f.size)}
                  </span>
                  <button
                    aria-label={`Remove ${f.name}`}
                    className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover"
                    onClick={() => composer.removeFile(i)}
                  >
                    <CloseIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-1.5">
                <AttachMenu onFiles={composer.chooseFiles} onFolder={composer.pickFolder} onDropFolder={composer.dropFolder} />
                <div className="flex min-h-[42px] min-w-0 flex-1 items-end rounded-lg bg-panel px-3 md:bg-field dark:bg-field">
                  <textarea
                    ref={fieldRef}
                    value={text}
                    onChange={(e) => composer.setText(e.target.value)}
                    onKeyDown={(e) => {
                      // On phones Return adds a line, like WhatsApp; on computers Enter sends.
                      if (e.key === "Enter" && !e.shiftKey && !touch()) {
                        e.preventDefault();
                        composer.send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message"
                    aria-label="Message"
                    className="max-h-36 min-h-[42px] min-w-0 max-w-full flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-5 outline-none placeholder:text-muted select-text [-webkit-user-select:text] [field-sizing:content]"
                  />
                </div>
                <button
                  onClick={() => composer.send()}
                  disabled={!text.trim() && !files.length}
                  aria-label="Send"
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent-fill text-white disabled:opacity-40"
                >
                  <SendIcon />
                </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** iPhones and iPads can't pick folders in the browser; they can still open folders others share. */
const canPickFolders = () =>
  typeof navigator !== "undefined" && !/iP(hone|ad|od)/.test(navigator.userAgent) && !(/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
/** The LANDrop Mac app picks folders with the Mac's own picker, which asks nothing more. */
const inMacApp = () => typeof navigator !== "undefined" && /Electron\//.test(navigator.userAgent);

type FolderHandler = (list: FileList) => void;

/** A file input that picks a whole folder, each file with its path inside it. */
function FolderInput({ onFolder, inputRef }: { onFolder: FolderHandler; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      // Not in React's types.
      {...{ webkitdirectory: "" }}
      onChange={(e) => {
        if (e.target.files?.length) onFolder(e.target.files);
        e.target.value = "";
      }}
    />
  );
}

/**
 * Sending a folder from a browser. Dropping one in needs no more questions; choosing one makes the
 * browser ask first ("Upload … files to this site?"), a prompt no website can replace, so this says so.
 */
function FolderSheet({
  onFolder,
  onDropFolder,
  onFiles,
  onClose,
}: {
  onFolder: FolderHandler;
  onDropFolder: (entry: FileSystemDirectoryEntry) => void;
  onFiles: (files: File[]) => void;
  onClose: () => void;
}) {
  const [over, setOver] = useState(false);
  // The chat behind has its own drop handling; this sheet keeps its drags to itself.
  const drag = (e: React.DragEvent, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(entering);
  };
  return (
    <Sheet labelledBy="folder-sheet-title" onClose={onClose}>
      <div className="px-6 pb-2 pt-2">
        <h2 id="folder-sheet-title" className="text-[19px] font-medium">
          Send a folder
        </h2>
        <p className="mt-1 text-[14px] text-muted">It’s added straight away, whatever its size, and opens for others the moment you send it.</p>
        <div
          onDragEnter={(e) => drag(e, true)}
          onDragOver={(e) => drag(e, true)}
          onDragLeave={(e) => drag(e, false)}
          onDrop={(e) => {
            drag(e, false);
            // Folders are added as folders; any plain files dropped with them go in as files.
            const items = [...e.dataTransfer.items].filter((item) => item.kind === "file");
            const entries = items.map((item) => item.webkitGetAsEntry());
            onFiles(items.filter((_, i) => !entries[i]?.isDirectory).map((item) => item.getAsFile()!).filter(Boolean));
            for (const entry of entries) if (entry?.isDirectory) onDropFolder(entry as FileSystemDirectoryEntry);
            onClose();
          }}
          className={`mt-5 flex flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center transition-colors pointer-coarse:hidden ${
            over ? "bg-accent/10" : "bg-field"
          }`}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#ffbc38] text-white">
            <FolderIcon size={30} />
          </span>
          <p className="text-[16px] font-medium">Drop a folder here</p>
          <p className="text-[13px] text-muted">From Finder or File Explorer</p>
        </div>
        <label className={`${FILLED_BUTTON} mt-5 flex cursor-pointer justify-center`}>
          Choose folder…
          <FolderInput
            onFolder={(list) => {
              onFolder(list);
              onClose();
            }}
          />
        </label>
        <p className="mt-2 text-center text-[12.5px] text-muted">Your browser asks you to confirm before it shares a folder.</p>
      </div>
    </Sheet>
  );
}

/**
 * WhatsApp's "+" button: a sheet of things to attach. Choosing one closes the sheet at once and opens
 * the file picker for its kind. The pickers stay mounted outside the sheet, so a phone's picker or
 * camera can finish and deliver the files after the sheet is gone.
 */
function AttachMenu({
  onFiles,
  onFolder,
  onDropFolder,
}: {
  onFiles: (files: File[]) => void;
  onFolder: FolderHandler;
  onDropFolder: (entry: FileSystemDirectoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [folderSheet, setFolderSheet] = useState(false);
  const documentRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const choose = (input: React.RefObject<HTMLInputElement | null>) => {
    setOpen(false);
    input.current?.click();
  };
  const received = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles([...(e.target.files ?? [])]);
    e.target.value = "";
  };
  const item = (label: string, icon: ReactNode, colour: string, input: React.RefObject<HTMLInputElement | null>, extra = "") => (
    <button onClick={() => choose(input)} className={`${SHEET_ITEM} ${extra}`}>
      <span style={{ color: colour }}>{icon}</span>
      {label}
    </button>
  );
  const folderIcon = (
    <span className="text-[#ffbc38]">
      <FolderIcon />
    </span>
  );
  return (
    <>
      <input ref={documentRef} type="file" multiple className="hidden" onChange={received} />
      <input ref={mediaRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={received} />
      <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={received} />
      <FolderInput inputRef={folderRef} onFolder={onFolder} />
      <button
        onClick={() => setOpen(true)}
        aria-label="Attach"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Attach files of any size (over ${formatBytes(MAX_ATTACHMENT_BYTES)} they are shared live from this device)`}
        className={`${ICON_BUTTON} size-[42px] text-foreground transition-transform ${open ? "rotate-45 bg-field" : ""}`}
      >
        <PlusIcon />
      </button>
      {open && (
        <Sheet label="Attach" onClose={() => setOpen(false)}>
          {item("Document", <FileIcon />, "#7f66ff", documentRef)}
          {item("Photos & videos", <ImageIcon />, "#007bfc", mediaRef)}
          {item("Camera", <CameraIcon />, "#ff2e74", cameraRef, "md:hidden")}
          {!canPickFolders() ? (
            <div className={`${SHEET_ITEM} cursor-default opacity-50 hover:bg-transparent`} aria-disabled="true">
              {folderIcon}
              Folder
              <span className="ml-auto text-[12px] text-muted">Not on iPhone or iPad</span>
            </div>
          ) : (
            <button
              className={SHEET_ITEM}
              onClick={() => {
                setOpen(false);
                if (inMacApp()) folderRef.current?.click();
                else setFolderSheet(true);
              }}
            >
              {folderIcon}
              Folder
            </button>
          )}
        </Sheet>
      )}
      {folderSheet && <FolderSheet onFolder={onFolder} onDropFolder={onDropFolder} onFiles={onFiles} onClose={() => setFolderSheet(false)} />}
    </>
  );
}
