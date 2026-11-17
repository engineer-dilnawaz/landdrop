"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MAX_ATTACHMENT_BYTES, type Message } from "@landrop/protocol";
import { Bubble, TIME_GAP_MS } from "./bubble";
import { ChatAvatar, type ChatKind } from "./chat-list";
import { RecorderFallback, RecordingBar, canRecordHere, useVoiceRecorder } from "./voice";
import type { Progress } from "./landrop";
import {
  BackIcon,
  CameraIcon,
  CloseIcon,
  DropdownMenu,
  FileIcon,
  FolderIcon,
  ICON_BUTTON,
  ImageIcon,
  LockIcon,
  MicIcon,
  PlusIcon,
  QrIcon,
  SHEET_ITEM,
  SendIcon,
  Sheet,
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
  onOpenImage,
  onReply,
  onLongPress,
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
  onOpenImage: (message: Message) => void;
  onReply: (message: Message) => void;
  onLongPress: (message: Message) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorder = useVoiceRecorder(composer.notice);
  // Only rendered once connected, never on the server, so reading the browser here is safe.
  const canRecord = canRecordHere();
  const scrollerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /** Whether the view stays at the newest message as the chat grows: until the user scrolls up. */
  const atBottomRef = useRef(true);
  const { text, files, replyTo } = composer;

  // Open at the newest message, and follow new ones as they arrive, like a chat app.
  useLayoutEffect(() => {
    atBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.id, messages.length]);

  // Photos and videos finish loading after the chat opens and grow, pushing the newest message out
  // of view; so does the phone keyboard opening. Stay at the bottom unless the user scrolled up.
  useEffect(() => {
    const scroller = scrollerRef.current!;
    const onScroll = () => {
      atBottomRef.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    };
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
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
            { label: "Close chat", onSelect: onBack },
            { label: chat.kind === "private" ? "Delete chat" : "Clear chat", onSelect: onClearChat, danger: true },
            ...(chat.kind === "group" ? [{ label: "Leave group", onSelect: onLeaveGroup, danger: true }] : []),
          ]}
        />
      </header>

      <div className="wallpaper flex min-h-0 flex-1 flex-col">
        <main ref={scrollerRef} className="flex-1 overflow-y-auto px-3 pb-2 pt-2 md:px-[7%]" aria-live="polite">
          <div ref={contentRef} className="mx-auto flex max-w-4xl flex-col">
            <p className="mx-auto mb-2 mt-2 flex max-w-md items-center gap-1.5 rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[12.5px] text-[#54656f] shadow-[0_1px_.5px_rgba(11,20,26,.13)] dark:bg-[#182229] dark:text-[#ffd279]">
              <LockIcon />
              {chat.kind === "everyone"
                ? "Messages here go to everyone on this Wi-Fi who opens LANDrop. Nothing goes to the internet."
                : chat.kind === "group"
                  ? "Only the devices in this group see its messages and files. They stay on this Wi-Fi."
                  : `Messages here are only between you and ${chat.title}, and stay on this Wi-Fi.`}
            </p>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const startsRun = newDay || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > TIME_GAP_MS;
              const own = m.senderId === selfId;
              const { download, preview } = urls(m.id);
              return (
                <div key={m.id} className={startsRun ? "mt-3" : "mt-0.5"}>
                  {newDay && (
                    <p className="mx-auto mb-3 mt-1 w-fit rounded-lg bg-panel px-3 py-1.5 text-center text-[12.5px] text-muted uppercase shadow-[0_1px_.5px_rgba(11,20,26,.13)]">
                      {formatDay(m.createdAt)}
                    </p>
                  )}
                  <Bubble
                    message={m}
                    nameOf={nameOf}
                    own={own}
                    showSender={chat.kind !== "private" && !own && startsRun}
                    first={startsRun}
                    progress={progress[m.id]}
                    downloadUrl={download}
                    previewUrl={preview}
                    onOpenImage={() => onOpenImage(m)}
                    onReply={() => onReply(m)}
                    onLongPress={() => {
                      // iOS may already have started selecting under the finger; clear it before the menu opens.
                      window.getSelection()?.removeAllRanges();
                      onLongPress(m);
                    }}
                    onQuoteTap={showMessage}
                  />
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
                className="min-w-0 flex-1 rounded-md border-l-4 bg-field px-3 py-1.5 text-[13px] leading-[17px]"
                style={{ borderColor: colourFor(replyTo.senderId ?? replyTo.senderName) }}
              >
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
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 md:mx-24">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-panel py-1.5 pl-3 pr-1.5 text-[13px] shadow-sm">
                  <FileIcon size={16} />
                  <span className="max-w-44 truncate">{f.name}</span>
                  <span className="text-muted">{formatBytes(f.size)}</span>
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
            {recorder.active ? (
              <RecordingBar
                seconds={recorder.seconds}
                onCancel={recorder.cancel}
                onSend={async () => {
                  const voice = await recorder.stop();
                  if (voice) composer.send([voice]);
                }}
              />
            ) : (
              <>
                <AttachMenu onFiles={composer.chooseFiles} />
                <div className="flex min-h-[42px] flex-1 items-end rounded-lg bg-panel px-3 md:bg-field dark:bg-field">
                  <textarea
                    value={text}
                    onChange={(e) => composer.setText(e.target.value)}
                    onKeyDown={(e) => {
                      // On phones Return adds a line, like WhatsApp; on computers Enter sends.
                      if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
                        e.preventDefault();
                        composer.send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message"
                    aria-label="Message"
                    className="max-h-36 min-h-[42px] flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-5 outline-none placeholder:text-muted select-text [-webkit-user-select:text] [field-sizing:content]"
                  />
                </div>
                {/* Like WhatsApp: send once there's something to send, otherwise the voice message mic. */}
                {text.trim() || files.length ? (
                  <button
                    onClick={() => composer.send()}
                    aria-label="Send"
                    className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-white"
                  >
                    <SendIcon />
                  </button>
                ) : canRecord ? (
                  <button
                    onClick={() => void recorder.start()}
                    aria-label="Record a voice message"
                    title="Record a voice message"
                    className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-white"
                  >
                    <MicIcon />
                  </button>
                ) : (
                  <RecorderFallback onFile={(file) => composer.send([file])} />
                )}
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

/** WhatsApp's "+" button: a sheet of things to attach. Each opens the file picker for its kind; Folder arrives with folder sharing. */
function AttachMenu({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [open, setOpen] = useState(false);
  const pick = (input: HTMLInputElement) => {
    onFiles([...(input.files ?? [])]);
    input.value = "";
    setOpen(false);
  };
  const picker = (label: string, icon: ReactNode, colour: string, attrs: React.InputHTMLAttributes<HTMLInputElement>, extra = "") => (
    <label className={`${SHEET_ITEM} cursor-pointer ${extra}`}>
      <span style={{ color: colour }}>{icon}</span>
      {label}
      <input type="file" multiple className="hidden" onChange={(e) => pick(e.target)} {...attrs} />
    </label>
  );
  return (
    <>
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
          {picker("Document", <FileIcon />, "#7f66ff", {})}
          {picker("Photos & videos", <ImageIcon />, "#007bfc", { accept: "image/*,video/*" })}
          {picker("Camera", <CameraIcon />, "#ff2e74", { accept: "image/*,video/*", capture: "environment", multiple: false }, "md:hidden")}
          <div className={`${SHEET_ITEM} cursor-default opacity-50 hover:bg-transparent`} aria-disabled="true">
            <span className="text-[#ffbc38]">
              <FolderIcon />
            </span>
            Folder
            <span className="ml-auto rounded-full border border-divider px-2 text-[11px] text-muted">Soon</span>
          </div>
        </Sheet>
      )}
    </>
  );
}
