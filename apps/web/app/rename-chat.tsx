"use client";

import { useState } from "react";
import { MAX_LOUNGE_NAME_LENGTH } from "@landrop/protocol";
import { DEFAULT_LOUNGE_NAME } from "./lounge";
import { FILLED_BUTTON, Sheet, TEXT_BUTTON } from "./ui";

/** Names the chat everyone shares; every device sees the new name. */
export function RenameChatSheet({ current, onSave, onClose }: { current: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(current);
  const trimmed = name.trim();
  return (
    <Sheet labelledBy="rename-chat-title" onClose={onClose}>
      <form
        className="px-6 pb-2 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
      >
        <h2 id="rename-chat-title" className="text-[20px] font-medium tracking-tight">
          Rename this chat
        </h2>
        <p className="mt-1 text-[14px] text-muted">Call it anything. Everyone on this Wi-Fi sees the new name.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_LOUNGE_NAME_LENGTH}
          aria-label="Chat name"
          placeholder={DEFAULT_LOUNGE_NAME}
          className="mt-4 h-11 w-full rounded-xl bg-field px-4 text-[16px] outline-none transition-colors placeholder:text-muted focus:bg-hover"
        />
        <p className="mt-1.5 text-right text-[12px] tabular-nums text-muted">
          {trimmed.length}/{MAX_LOUNGE_NAME_LENGTH}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => onSave("")} disabled={current === DEFAULT_LOUNGE_NAME} className={TEXT_BUTTON}>
            Use “{DEFAULT_LOUNGE_NAME}”
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className={TEXT_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={!trimmed || trimmed === current} className={FILLED_BUTTON}>
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
