"use client";

import { useState } from "react";
import { MAX_GROUP_NAME_LENGTH, type Group } from "@landrop/protocol";
import { ChatAvatar } from "./chat-list";
import { Avatar, FILLED_BUTTON, PlusIcon, SHEET_ITEM, Sheet, TEXT_BUTTON, TickIcon } from "./ui";

/** A phone or computer to pick: every browser on it joins together, so the group shows wherever it's opened. */
export interface Contact {
  key: string;
  name: string;
  deviceIds: string[];
  online: boolean;
  status: string;
}

const FIELD =
  "w-full border-b-2 border-accent bg-transparent pb-1.5 text-[16px] outline-none select-text [-webkit-user-select:text]";

/** Picks devices for a new group (with its name) or to add to one. */
export function GroupMembersSheet({
  mode,
  contacts,
  onSubmit,
  onClose,
}: {
  mode: "create" | "add";
  contacts: Contact[];
  onSubmit: (deviceIds: string[], name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = picked.length > 0 && (mode === "add" || name.trim().length > 0) && !busy;
  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  return (
    <Sheet labelledBy="group-members-title" onClose={onClose}>
      <form
        className="flex flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready) return;
          setBusy(true);
          const ids = contacts.filter((c) => picked.includes(c.key)).flatMap((c) => c.deviceIds);
          await onSubmit(ids, name.trim()).finally(() => setBusy(false));
        }}
      >
        <div className="px-6 pt-3">
          <h2 id="group-members-title" className="text-[20px] font-medium">
            {mode === "create" ? "New group" : "Add devices"}
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            {mode === "create"
              ? "Only the devices you pick see what's shared in it."
              : "They'll see messages from now on, not what was shared before."}
          </p>
          {mode === "create" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_GROUP_NAME_LENGTH}
              placeholder="Group name"
              aria-label="Group name"
              autoFocus
              className={`${FIELD} mt-5`}
            />
          )}
        </div>
        <ul className="mt-3 max-h-[45dvh] overflow-y-auto" aria-label="Devices">
          {contacts.map((c) => {
            const on = picked.includes(c.key);
            return (
              <li key={c.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(c.key)}
                  className="flex w-full items-center gap-4 px-6 py-2.5 text-left hover:bg-hover"
                >
                  <ChatAvatar chat={{ id: c.key, title: c.name, kind: "private", online: c.online }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{c.name}</span>
                    <span className="block truncate text-[13px] text-muted">{c.status}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
                      on ? "border-accent bg-accent text-white" : "border-muted/50"
                    }`}
                  >
                    {on && <TickIcon />}
                  </span>
                </button>
              </li>
            );
          })}
          {contacts.length === 0 && (
            <li className="px-6 py-6 text-center text-[14px] text-muted">
              {mode === "create"
                ? "No other devices have joined yet. Add one with the QR code first."
                : "Every device that has joined is already in this group."}
            </li>
          )}
        </ul>
        <div className="mt-2 flex justify-end gap-2 px-6">
          <button type="button" onClick={onClose} className={TEXT_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={!ready} className={FILLED_BUTTON}>
            {mode === "create" ? `Create${picked.length ? ` with ${picked.length}` : ""}` : `Add${picked.length ? ` ${picked.length}` : ""}`}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** A group's name and members, like WhatsApp's group info. */
export function GroupInfoSheet({
  group,
  selfId,
  nameOf,
  isOnline,
  canAdd,
  onRename,
  onAdd,
  onLeave,
  onClose,
}: {
  group: Group;
  selfId?: string;
  nameOf: (id: string) => string;
  isOnline: (id: string) => boolean;
  /** False when every device that has joined is already in it. */
  canAdd: boolean;
  onRename: (name: string) => Promise<void>;
  onAdd: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  // You first, then online devices, then by name.
  const members = [...group.members].sort(
    (a, b) =>
      Number(b === selfId) - Number(a === selfId) || Number(isOnline(b)) - Number(isOnline(a)) || nameOf(a).localeCompare(nameOf(b)),
  );

  return (
    <Sheet labelledBy="group-info-title" onClose={onClose}>
      <div className="flex flex-col items-center px-6 pt-3 text-center">
        <ChatAvatar chat={{ id: group.id, title: group.name, kind: "group", online: false }} size="list" />
        {editing ? (
          <form
            className="mt-3 flex w-full items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const next = name.trim();
              if (next && next !== group.name) await onRename(next);
              setEditing(false);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_GROUP_NAME_LENGTH}
              aria-label="Group name"
              autoFocus
              onFocus={(e) => e.target.select()}
              className={FIELD}
            />
            <button type="submit" disabled={!name.trim()} className={TEXT_BUTTON}>
              Save
            </button>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-3 rounded-lg px-2 hover:bg-hover" title="Rename group">
            <h2 id="group-info-title" className="text-[22px] font-medium">
              {group.name}
            </h2>
          </button>
        )}
        <p className="mt-1 text-[14px] text-muted">Group · {group.members.length} devices</p>
      </div>

      <ul className="mt-4 max-h-[40dvh] overflow-y-auto border-t border-divider" aria-label="Members">
        {canAdd && (
          <li>
            <button onClick={onAdd} className={SHEET_ITEM}>
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-white">
                <PlusIcon size={22} />
              </span>
              Add devices
            </button>
          </li>
        )}
        {members.map((id) => (
          <li key={id} className="flex items-center gap-4 px-6 py-2.5">
            <Avatar name={nameOf(id)} seed={id} />
            <span className="min-w-0 flex-1 truncate text-[16px]">{id === selfId ? "You" : nameOf(id)}</span>
            <span className="text-[13px] text-muted">{id === selfId || isOnline(id) ? "online" : ""}</span>
          </li>
        ))}
      </ul>
      <button onClick={onLeave} className={`${SHEET_ITEM} border-t border-divider text-danger`}>
        Leave group
      </button>
    </Sheet>
  );
}
