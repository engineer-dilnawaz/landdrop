"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BackIcon, ChevronIcon, CloseIcon, CollapseAllIcon, CopyIcon, ExpandAllIcon, SearchIcon, TickIcon, copyText, useEscape } from "./ui";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** A message that is a JSON object or array; undefined for anything else. */
export function parseJson(text: string): Json | undefined {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) return undefined;
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    return undefined;
  }
}

/** Past this many lines the tree opens folded, so a huge paste never freezes the page. */
const OPEN_FOLDED_ABOVE = 2000;

/** A key one side of a comparison doesn't have. */
const MISSING = Symbol("missing");
type Slot = Json | typeof MISSING;
type Status = "same" | "changed" | "added" | "removed";

/** One side of a row: a line of JSON. */
interface Line {
  key?: string;
  /** A bracket, or a folded object or array. */
  body?: ReactNode;
  /** A string, number, true, false or null: drawn by the row so search can highlight it. */
  leaf?: Leaf;
  comma: boolean;
}

interface Leaf {
  /** As written in JSON: strings in quotes. */
  text: string;
  /** What search looks in: a string without its quotes. */
  raw: string;
  /** Its syntax colour. */
  colour: string;
}

interface Row {
  /** The node's path; an object or array folds by it. */
  id: string;
  depth: number;
  left?: Line;
  right?: Line;
  status: Status;
  /** The opening line of an object or array, which can fold. */
  folds?: boolean;
  folded?: boolean;
}

const isContainer = (v: Json): v is Json[] | { [key: string]: Json } => v !== null && typeof v === "object";
const at = (v: Json, key: string) => (v as Record<string, Json>)[key];
const keysOf = (v: Slot) => (v === MISSING || !isContainer(v) ? [] : Object.keys(v));
/** Both sides' keys: the left's in its order, then any only the right has. Arrays line up by index. */
function childKeys(a: Slot, b: Slot): string[] {
  const left = keysOf(a);
  const seen = new Set(left);
  return [...left, ...keysOf(b).filter((k) => !seen.has(k))];
}
const has = (v: Slot, key: string) => v !== MISSING && isContainer(v) && Object.prototype.hasOwnProperty.call(v, key);

/** Equal values, whatever order an object's keys are in. */
function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => has(b, k) && deepEqual(at(a, k), at(b, k)));
}

const sameKind = (a: Json, b: Json) => isContainer(a) && isContainer(b) && Array.isArray(a) === Array.isArray(b);

const leafOf = (v: Json): Leaf => ({
  text: typeof v === "string" ? JSON.stringify(v) : String(v),
  raw: String(v),
  colour: typeof v === "string" ? "hljs-string" : typeof v === "number" ? "hljs-number" : "hljs-literal",
});

function folded(v: Json[] | { [key: string]: Json }): ReactNode {
  const count = Array.isArray(v) ? v.length : Object.keys(v).length;
  const noun = Array.isArray(v) ? (count === 1 ? "item" : "items") : count === 1 ? "key" : "keys";
  return (
    <>
      {Array.isArray(v) ? "[" : "{"}
      <span data-pill className="cursor-pointer rounded bg-black/10 px-1 text-muted transition-colors hover:bg-black/20 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20" title="Expand">
        … {count} {noun}
      </span>
      {Array.isArray(v) ? "]" : "}"}
    </>
  );
}

/**
 * The rows to draw. One tree: `b` is `a` itself, and only the left side is shown. Comparing: both
 * trees merged key by key, so the same key sits on the same row on both sides.
 */
function buildRows(a: Json, b: Json, foldedIds: ReadonlySet<string>): Row[] {
  const rows: Row[] = [];
  const side = (v: Slot, line: Omit<Line, "body">, body: (v: Json) => ReactNode): Line | undefined =>
    v === MISSING ? undefined : { ...line, body: body(v) };

  function walk(a: Slot, b: Slot, key: string | undefined, id: string, depth: number, commaA: boolean, commaB: boolean) {
    const both = a !== MISSING && b !== MISSING;
    // An object on one side and a list or value on the other: shown as one removed and one added.
    if (both && !sameKind(a, b) && (isContainer(a) || isContainer(b))) {
      walk(a, MISSING, key, `${id}<`, depth, commaA, false);
      walk(MISSING, b, key, `${id}>`, depth, false, commaB);
      return;
    }
    const status: Status = a === MISSING ? "added" : b === MISSING ? "removed" : deepEqual(a, b) ? "same" : "changed";
    const node = (a === MISSING ? b : a) as Json;
    if (!isContainer(node)) {
      const leaf = (v: Slot, comma: boolean): Line | undefined => (v === MISSING ? undefined : { key, comma, leaf: leafOf(v) });
      rows.push({ id, depth, status, left: leaf(a, commaA), right: leaf(b, commaB) });
      return;
    }
    if (foldedIds.has(id)) {
      rows.push({
        id,
        depth,
        status,
        folds: true,
        folded: true,
        left: side(a, { key, comma: commaA }, (v) => folded(v as Json[])),
        right: side(b, { key, comma: commaB }, (v) => folded(v as Json[])),
      });
      return;
    }
    // Open, the brackets of a container both sides have stay plain: what differs inside is marked.
    const bracket: Status = both ? "same" : status;
    const open = Array.isArray(node) ? "[" : "{";
    const close = Array.isArray(node) ? "]" : "}";
    rows.push({
      id,
      depth,
      status: bracket,
      folds: true,
      left: side(a, { key, comma: false }, () => open),
      right: side(b, { key, comma: false }, () => open),
    });
    const keys = childKeys(a, b);
    const lastA = keys.findLastIndex((k) => has(a, k));
    const lastB = keys.findLastIndex((k) => has(b, k));
    keys.forEach((k, i) => {
      walk(
        has(a, k) ? at(a as Json, k) : MISSING,
        has(b, k) ? at(b as Json, k) : MISSING,
        Array.isArray(node) ? undefined : k,
        `${id}/${encodeURIComponent(k)}`,
        depth + 1,
        i < lastA,
        i < lastB,
      );
    });
    rows.push({
      id: `${id}#`,
      depth,
      status: bracket,
      left: side(a, { comma: commaA }, () => close),
      right: side(b, { comma: commaB }, () => close),
    });
  }

  walk(a, b, undefined, "", 0, false, false);
  return rows;
}

/** How many values changed, and how many keys or items only one side has. */
function countDiff(a: Json, b: Json, n = { changed: 0, added: 0, removed: 0 }) {
  if (sameKind(a, b)) {
    for (const k of childKeys(a, b)) {
      if (!has(a, k)) n.added++;
      else if (!has(b, k)) n.removed++;
      else countDiff(at(a, k), at(b, k), n);
    }
  } else if (!deepEqual(a, b)) n.changed++;
  return n;
}

/** Every object and array but the outermost: what "Collapse all" folds. */
const foldableIds = (a: Json, b: Json) => buildRows(a, b, new Set()).filter((r) => r.folds && r.id !== "").map((r) => r.id);

/** Folded from the start when there are too many lines to draw at once. */
function startFolded(a: Json, b: Json): Set<string> {
  const rows = buildRows(a, b, new Set());
  return rows.length > OPEN_FOLDED_ABOVE ? new Set(rows.filter((r) => r.folds && r.id !== "").map((r) => r.id)) : new Set();
}

/** Whether `text` contains the search, ignoring case; `query` is already lower case. */
const hits = (text: string | undefined, query: string) => !!query && text !== undefined && text.toLowerCase().includes(query);
const lineHits = (line: Line | undefined, query: string) => !!line && (hits(line.key, query) || hits(line.leaf?.raw, query));

/** Rows whose key or value, on either side, contains the search, in order. */
const matchIds = (rows: Row[], query: string) =>
  query ? rows.filter((r) => lineHits(r.left, query) || lineHits(r.right, query)).map((r) => r.id) : [];

// A match sets its own text colour too: a syntax colour on a highlight can be unreadable.
const CURRENT_MATCH = "rounded-sm bg-[#ffd33d] text-[#1f2328]";
const OTHER_MATCH = "rounded-sm bg-[#ffd33d]/25 text-foreground underline decoration-[#d4a72c] underline-offset-2";

/** `folded` with every object or array around `ids` opened, so they can be seen. */
function unfoldAround(folded: Set<string>, ids: string[]): Set<string> {
  const around = new Set<string>();
  for (let id of ids) {
    for (let cut = id.lastIndexOf("/"); cut >= 0; cut = id.lastIndexOf("/")) around.add((id = id.slice(0, cut)));
  }
  const next = new Set([...folded].filter((id) => !around.has(id)));
  return next.size === folded.size ? folded : next;
}

const TINT: Record<Status, { left: string; right: string }> = {
  same: { left: "", right: "" },
  changed: { left: "bg-amber-500/15", right: "bg-amber-500/15" },
  added: { left: "bg-black/[.03] dark:bg-white/[.03]", right: "bg-emerald-500/15" },
  removed: { left: "bg-red-500/15", right: "bg-black/[.03] dark:bg-white/[.03]" },
};

function Cell({ row, line, tint, query, current, onToggle }: {
  row: Row;
  line?: Line;
  tint: string;
  /** The search, lower case; the parts of this line it's found in are marked. */
  query: string;
  /** This row is the match Enter moved to. */
  current: boolean;
  onToggle: (id: string) => void;
}) {
  const mark = (text: string | undefined, colour: string) => (hits(text, query) ? (current ? CURRENT_MATCH : OTHER_MATCH) : colour);
  return (
    <div data-row={row.id} className={`relative whitespace-pre-wrap break-all py-px pr-3 ${tint}`} style={{ paddingLeft: `${row.depth * 2 + 2.5}ch` }}>
      {line && row.folds && (
        <button
          onClick={() => onToggle(row.id)}
          aria-expanded={!row.folded}
          aria-label={row.folded ? "Expand" : "Collapse"}
          className="absolute top-0.5 flex size-[1.2em] items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground"
          style={{ left: `${row.depth * 2 + 0.6}ch` }}
        >
          <span className={`flex transition-transform ${row.folded ? "-rotate-90" : ""}`}>
            <ChevronIcon size={13} />
          </span>
        </button>
      )}
      {line && (
        <>
          {line.key !== undefined && (
            <>
              <span className={mark(line.key, "hljs-attr")}>{JSON.stringify(line.key)}</span>
              :{" "}
            </>
          )}
          {/* A folded object's "… 10 keys" is a way to open it, like its arrow. */}
          <span onClick={(e) => row.folded && (e.target as HTMLElement).closest("[data-pill]") && onToggle(row.id)}>{line.body}</span>
          {line.leaf && <span className={mark(line.leaf.raw, line.leaf.colour)}>{line.leaf.text}</span>}
          {line.comma && ","}
        </>
      )}
    </div>
  );
}

/** Copies one JSON, formatted, from the top right corner of its pane; `side="left"` is the left half of a comparison. */
function CopyCorner({ json, label, side }: { json: Json; label: string; side?: "left" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        if (!copyText(JSON.stringify(json, null, 2))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={`absolute top-2 z-10 flex size-8 items-center justify-center rounded-lg bg-panel text-muted hover:bg-hover hover:text-foreground ${
        side === "left" ? "right-[calc(50%+0.75rem)]" : "right-3"
      }`}
    >
      {copied ? <TickIcon /> : <CopyIcon size={16} />}
    </button>
  );
}

const PILL = "rounded-full px-3 py-1.5 text-[13px] font-medium hover:bg-hover disabled:opacity-40";
/** A toggle that's on, and the main button: the accent's fill shade, readable with white text. */
const ON = "bg-accent-fill text-white hover:brightness-90";
/** Expand all, Collapse all and Edit in the header: labelled buttons, icon only on a phone. */
const HEADER_BUTTON = `${PILL} flex shrink-0 items-center gap-1.5 bg-field disabled:hover:bg-field`;

/** JSON pasted into a message, full screen: a tree that folds, and a side-by-side compare with other JSON. */
export function JsonViewer({ json, onClose }: { json: Json; onClose: () => void }) {
  const [folded, setFolded] = useState<Set<string>>(() => startFolded(json, json));
  /** Compare mode: what's typed in the right-hand box, and the JSON it was read as once "Compare" is pressed. */
  const [comparing, setComparing] = useState(false);
  const [draft, setDraft] = useState("");
  const [other, setOther] = useState<Json>();
  const [draftError, setDraftError] = useState<string>();
  /** The key search; `hit` is which match Enter has moved to. */
  const [query, setQuery] = useState("");
  const searchField = useRef<HTMLInputElement>(null);
  const [hit, setHit] = useState(0);
  useEscape(onClose);

  const showingDiff = comparing && other !== undefined;
  const right = showingDiff ? other : json;
  const rows = useMemo(() => buildRows(json, right, folded), [json, right, folded]);
  const allRows = useMemo(() => buildRows(json, right, new Set()), [json, right]);
  const search = query.trim().toLowerCase();
  const matches = useMemo(() => matchIds(allRows, search), [allRows, search]);
  const current = matches.length ? matches[Math.min(hit, matches.length - 1)] : undefined;
  // Brings the current match into view once its row is drawn.
  useEffect(() => {
    if (current) document.querySelector(`[data-row="${CSS.escape(current)}"]`)?.scrollIntoView({ block: "center" });
  }, [current]);
  const onSearch = (value: string) => {
    setQuery(value);
    setHit(0);
    setFolded((f) => unfoldAround(f, matchIds(allRows, value.trim().toLowerCase())));
  };
  const step = (by: number) => {
    if (!matches.length) return;
    const next = (Math.min(hit, matches.length - 1) + by + matches.length) % matches.length;
    setHit(next);
    setFolded((f) => unfoldAround(f, [matches[next]]));
  };
  const diff = useMemo(() => (showingDiff ? countDiff(json, other) : undefined), [showingDiff, json, other]);
  const toggle = (id: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const compare = () => {
    try {
      const parsed = JSON.parse(draft) as Json;
      setDraftError(undefined);
      setOther(parsed);
      setFolded(startFolded(json, parsed));
    } catch (err) {
      setDraftError(err instanceof SyntaxError ? err.message : "That isn't valid JSON.");
    }
  };

  const tree = (cells: "left" | "both") => (
    <div className={`code-colours grid min-w-0 font-mono text-[12.5px] leading-[1.6] md:text-[13px] ${cells === "both" ? "grid-cols-2 gap-x-3" : "grid-cols-1"}`}>
      {rows.map((row) => (
        <div key={row.id} className="contents">
          <Cell
            row={row}
            line={row.left}
            tint={cells === "both" ? TINT[row.status].left : ""}
            query={search}
            current={row.id === current}
            onToggle={toggle}
          />
          {cells === "both" && (
            <div>
              <Cell
                row={row}
                line={row.right}
                tint={TINT[row.status].right}
                query={search}
                current={row.id === current}
                onToggle={toggle}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="JSON" className="fixed inset-0 z-50 flex flex-col bg-panel text-foreground">
      <header className="flex items-center gap-1 bg-bar px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-6 md:pb-3 md:pt-3">
        <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-hover" aria-label="Back to the chat" title="Back">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[17px] font-medium">{comparing ? "Compare JSON" : "JSON"}</p>
          <p className="truncate text-[13px] text-muted">
            {diff
              ? diff.changed + diff.added + diff.removed === 0
                ? "No differences"
                : `${diff.changed} changed · ${diff.added} added · ${diff.removed} removed`
              : comparing
                ? "Paste the other JSON on the right"
                : "Use the arrows to fold objects and lists"}
          </p>
        </div>
        <button onClick={() => setFolded(new Set())} disabled={folded.size === 0} aria-label="Expand all" title="Expand all" className={HEADER_BUTTON}>
          <ExpandAllIcon size={16} />
          <span className="hidden sm:inline">Expand all</span>
        </button>
        <button onClick={() => setFolded(new Set(foldableIds(json, right)))} aria-label="Collapse all" title="Collapse all" className={HEADER_BUTTON}>
          <CollapseAllIcon size={16} />
          <span className="hidden sm:inline">Collapse all</span>
        </button>
        {showingDiff && (
          <button onClick={() => setOther(undefined)} className={HEADER_BUTTON}>
            <span className="sm:hidden">Edit</span>
            <span className="hidden sm:inline">Edit new JSON</span>
          </button>
        )}
        <button
          onClick={() => setComparing(!comparing)}
          aria-pressed={comparing}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${comparing ? ON : "bg-field hover:bg-hover"}`}
        >
          Compare
        </button>
      </header>
      {/* The search: the field takes 60% of the row; the match count and arrows take the other 40%. */}
      <div className="flex items-center gap-2 px-2 py-2 md:px-6">
        <div className="relative min-w-0 basis-[60%]">
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
            <SearchIcon size={16} />
          </span>
          <input
            ref={searchField}
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              step(e.shiftKey ? -1 : 1);
            }}
            placeholder="Search keys & values"
            aria-label="Search keys and values"
            spellCheck={false}
            className="w-full rounded-xl bg-field py-2 pl-9 pr-9 text-[14px] outline-none"
          />
          {query && (
            <button
              onClick={() => {
                onSearch("");
                searchField.current?.focus();
              }}
              aria-label="Clear search"
              title="Clear"
              className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
        <div className="flex min-w-0 basis-[40%] items-center gap-1">
          {search && (
            <>
              <span aria-live="polite" className="truncate px-1 text-[13px] tabular-nums text-muted">
                {matches.length ? `${Math.min(hit, matches.length - 1) + 1} of ${matches.length}` : "No matches"}
              </span>
              {matches.length > 1 && (
                <>
                  <button
                    onClick={() => step(-1)}
                    aria-label="Previous match"
                    title="Previous match (Shift+Enter)"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
                  >
                    <span className="flex rotate-180">
                      <ChevronIcon size={16} />
                    </span>
                  </button>
                  <button
                    onClick={() => step(1)}
                    aria-label="Next match"
                    title="Next match (Enter)"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
                  >
                    <ChevronIcon size={16} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {comparing && !showingDiff ? (
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div className="relative min-h-0">
            <div className="h-full overflow-auto py-2">{tree("left")}</div>
            <CopyCorner json={json} label="Copy this JSON" />
          </div>
          <div className="flex min-h-0 flex-col gap-2 p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste JSON to compare with"
              spellCheck={false}
              autoFocus
              className="min-h-0 flex-1 resize-none rounded-md bg-field p-3 font-mono text-[13px] leading-[1.6] outline-none"
            />
            {draftError && <p className="text-[13px] text-danger">{draftError}</p>}
            <button onClick={compare} disabled={!draft.trim()} className={`self-end rounded-full px-5 py-2 text-[14px] font-medium disabled:opacity-40 ${ON}`}>
              Compare
            </button>
          </div>
        </div>
      ) : (
        // The copy buttons sit outside the scrolling area, so they stay in the corners.
        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-auto py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{tree(showingDiff ? "both" : "left")}</div>
          {showingDiff ? (
            <>
              <CopyCorner json={json} label="Copy the original JSON" side="left" />
              <CopyCorner json={other} label="Copy the new JSON" />
            </>
          ) : (
            <CopyCorner json={json} label="Copy the formatted JSON" />
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
