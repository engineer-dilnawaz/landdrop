"use client";

import { useLayoutEffect, useRef } from "react";
import { MAX_ATTACHMENT_BYTES, type Message } from "@landrop/protocol";
import { Bubble, TIME_GAP_MS } from "./bubble";
import { ChatAvatar } from "./chat-list";
import type { Progress } from "./landrop";
import { ArrowUpIcon, BackIcon, PlusIcon, formatBytes, formatDay } from "./ui";

export interface OpenChat {
  id: string;
  title: string;
  isGroup: boolean;
  online: boolean;
  /** Members online (group) or "online" / "last seen …" (private chat). */
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
    send: () => void;
  };
  onBack: () => void;
  onOpenImage: (message: Message) => void;
  onReply: (message: Message) => void;
  onLongPress: (message: Message) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { text, files, replyTo } = composer;

  // Open at the newest message, and follow new ones as they arrive, like a chat app.
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.id, messages.length]);

  function showMessage(id: string) {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 700, delay: 250 });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-separator bg-bar/80 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex size-9 shrink-0 items-center justify-center text-ios-blue md:hidden"
          aria-label="Back to chats"
        >
          <BackIcon />
        </button>
        <span className="md:ml-2">
          <ChatAvatar chat={chat} />
        </span>
        <div className="min-w-0 flex-1 pl-1">
          <h2 className="truncate text-[17px] font-semibold leading-tight">{chat.title}</h2>
          <p className={`truncate text-[13px] ${chat.online && !chat.isGroup ? "text-ios-green" : "text-muted"}`}>
            {chat.subtitle}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pb-2 pt-3" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col">
          {messages.length === 0 && (
            <p className="mx-auto mt-16 max-w-64 rounded-xl bg-bubble-other px-4 py-3 text-center text-[13px] text-muted">
              {chat.isGroup
                ? "Messages here go to everyone on this Wi-Fi who opens LANDrop."
                : `Messages here are only between you and ${chat.title}.`}
            </p>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const startsRun = newDay || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > TIME_GAP_MS;
            const endsRun = !next || next.senderId !== m.senderId || next.createdAt - m.createdAt > TIME_GAP_MS;
            const { download, preview } = urls(m.id);
            return (
              <div key={m.id} className={startsRun ? "mt-2" : "mt-0.5"}>
                {newDay && (
                  <p className="mx-auto my-2 w-fit rounded-full bg-bubble-other px-3 py-1 text-center text-[11px] font-medium text-muted">
                    {formatDay(m.createdAt)}
                  </p>
                )}
                <Bubble
                  message={m}
                  nameOf={nameOf}
                  own={m.senderId === selfId}
                  // In a private chat, like WhatsApp, the other person needs no avatar beside each message.
                  showAvatar={chat.isGroup}
                  tail={endsRun}
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

      <footer className="border-t border-separator bg-bar/80 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {replyTo && (
            <div className="ml-11 flex items-center gap-2 rounded-lg border-l-[3px] border-ios-blue bg-bubble-other/60 px-2.5 py-1.5">
              <div className="min-w-0 flex-1 text-[13px] leading-[17px]">
                <p className="font-semibold text-ios-blue">
                  Replying to {replyTo.senderId === selfId ? "yourself" : nameOf(replyTo.senderId, replyTo.senderName)}
                </p>
                <p className="truncate text-muted">{replyTo.text ?? `📄 ${replyTo.attachment?.name}`}</p>
              </div>
              <button className="shrink-0 text-muted" aria-label="Cancel reply" onClick={composer.cancelReply}>
                ✕
              </button>
            </div>
          )}
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pl-11">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-full bg-bubble-other px-2.5 py-1 text-[12px]"
                >
                  <span className="max-w-44 truncate">{f.name}</span>
                  <span className="text-muted">{formatBytes(f.size)}</span>
                  <button aria-label={`Remove ${f.name}`} className="text-muted" onClick={() => composer.removeFile(i)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bubble-other text-muted">
              <PlusIcon />
              <span className="sr-only">
                Attach files of any size (over {formatBytes(MAX_ATTACHMENT_BYTES)} they are shared live from this device)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  composer.chooseFiles([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="flex min-h-9 flex-1 items-end rounded-[18px] border border-separator bg-background pl-3.5 pr-1">
              <textarea
                value={text}
                onChange={(e) => composer.setText(e.target.value)}
                onKeyDown={(e) => {
                  // On phones Return adds a line, like Messages; on computers Enter sends.
                  if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
                    e.preventDefault();
                    composer.send();
                  }
                }}
                rows={1}
                placeholder="Message"
                aria-label="Message"
                className="max-h-36 min-h-[34px] flex-1 resize-none bg-transparent py-[7px] text-[16px] leading-5 outline-none select-text [-webkit-user-select:text] [field-sizing:content]"
              />
              {(text.trim() || files.length > 0) && (
                <button
                  onClick={composer.send}
                  aria-label="Send"
                  className="my-[3px] ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-ios-blue text-white"
                >
                  <ArrowUpIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
