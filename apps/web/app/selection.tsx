"use client";

import { ChatAvatar, type ChatSummary } from "./chat-list";
import { CloseIcon, CopyIcon, ForwardIcon, ICON_BUTTON, SHEET_ITEM, SaveIcon, Sheet, TrashIcon, TEXT_BUTTON, FILLED_BUTTON, useEscape } from "./ui";

/** Replaces the chat header while messages are being picked: how many, and what can be done with them all. */
export function SelectionBar({
  count,
  canCopy,
  canDownload,
  canForward,
  canDelete,
  onCopy,
  onDownload,
  onForward,
  onDelete,
  onCancel,
}: {
  count: number;
  canCopy: boolean;
  canDownload: boolean;
  canForward: boolean;
  /** Only when every picked message is yours to remove. */
  canDelete: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onForward: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  useEscape(onCancel);
  const action = (label: string, icon: React.ReactNode, enabled: boolean, onClick: () => void, danger = false) => (
    <button
      onClick={onClick}
      disabled={!enabled}
      aria-label={label}
      title={label}
      className={`${ICON_BUTTON} disabled:opacity-30 disabled:hover:bg-transparent ${danger ? "text-danger" : "text-foreground"}`}
    >
      {icon}
    </button>
  );
  return (
    <header className="z-10 flex h-16 shrink-0 items-center gap-1 bg-bar px-2 pt-[env(safe-area-inset-top)] box-content md:box-border md:gap-2 md:px-4 md:pt-0">
      <button onClick={onCancel} className={`${ICON_BUTTON} text-foreground`} aria-label="Cancel selection">
        <CloseIcon />
      </button>
      <p className="min-w-0 flex-1 truncate pl-1 text-[17px] font-medium" aria-live="polite">
        {count} selected
      </p>
      {action("Copy", <CopyIcon size={22} />, canCopy, onCopy)}
      {action("Save files", <SaveIcon size={22} />, canDownload, onDownload)}
      {action("Forward", <ForwardIcon size={22} />, canForward, onForward)}
      {action("Remove for everyone", <TrashIcon />, canDelete, onDelete, true)}
    </header>
  );
}

/** Pick the chat to forward the selected messages to. */
export function ForwardSheet({ chats, count, onPick, onClose }: { chats: ChatSummary[]; count: number; onPick: (chat: ChatSummary) => void; onClose: () => void }) {
  return (
    <Sheet label="Forward to" onClose={onClose}>
      <h2 className="px-6 pb-2 pt-1 text-[17px] font-medium">Forward {count === 1 ? "message" : `${count} messages`} to</h2>
      {chats.length === 0 && <p className="px-6 py-4 text-[14px] text-muted">There are no other chats yet.</p>}
      {chats.map((chat) => (
        <button key={chat.id} onClick={() => onPick(chat)} className={SHEET_ITEM}>
          <ChatAvatar chat={chat} size="header" />
          <span className="min-w-0 flex-1 truncate">{chat.title}</span>
        </button>
      ))}
    </Sheet>
  );
}

/** Removing messages is for everyone and can't be undone, so it asks first. */
export function ConfirmRemoveSheet({ count, onConfirm, onClose }: { count: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet label="Remove messages" onClose={onClose}>
      <div className="px-6 pb-2 pt-2">
        <h2 className="text-[17px] font-medium">Remove {count === 1 ? "this message" : `${count} messages`} for everyone?</h2>
        <p className="mt-1 text-[14px] text-muted">They disappear from every device in this chat. This can&apos;t be undone.</p>
      </div>
      <div className="flex justify-end gap-2 px-4 pt-2">
        <button onClick={onClose} className={TEXT_BUTTON} autoFocus>
          Cancel
        </button>
        <button onClick={onConfirm} className={`${FILLED_BUTTON} !bg-danger`}>
          Remove
        </button>
      </div>
    </Sheet>
  );
}
