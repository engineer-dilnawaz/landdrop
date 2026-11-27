import type { ReactNode } from "react";

export type EmptyKind = "search" | "unread" | "groups" | "private" | "devices";

/** A flat illustration for a list with nothing in it: a soft disc, the subject in the accent colour. */
function Art({ kind }: { kind: EmptyKind }) {
  return (
    <svg viewBox="0 0 96 96" className="size-24 text-accent" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity=".1" />
      {kind === "search" && (
        <>
          <circle cx="43" cy="43" r="17" fill="none" stroke="currentColor" strokeWidth="6" />
          <path d="m56 56 15 15" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <path d="M36 43h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".45" />
        </>
      )}
      {kind === "unread" && (
        <>
          <path d="M26 28h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H50L36 78V66h-10a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8Z" fill="currentColor" />
          <path d="m36 47 8 8 16-16" fill="none" stroke="var(--panel)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "groups" && (
        <>
          <circle cx="30" cy="40" r="8" fill="currentColor" opacity=".55" />
          <circle cx="66" cy="40" r="8" fill="currentColor" opacity=".55" />
          <path d="M16 70c0-8 6-13 14-13 3 0 5 .6 7 1.8-3 3-4.5 7-4.5 11.2Zm64 0c0-8-6-13-14-13-3 0-5 .6-7 1.8 3 3 4.5 7 4.5 11.2Z" fill="currentColor" opacity=".55" />
          <circle cx="48" cy="36" r="11" fill="currentColor" />
          <path d="M28 74c0-11 9-18 20-18s20 7 20 18Z" fill="currentColor" />
        </>
      )}
      {kind === "private" && (
        <>
          <path d="M26 28h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H50L36 78V66h-10a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8Z" fill="currentColor" opacity=".35" />
          <rect x="35" y="43" width="26" height="19" rx="5" fill="currentColor" />
          <path d="M40 43v-4a8 8 0 0 1 16 0v4" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {kind === "devices" && (
        <>
          <rect x="18" y="30" width="44" height="30" rx="5" fill="currentColor" opacity=".55" />
          <rect x="30" y="64" width="20" height="5" rx="2.5" fill="currentColor" opacity=".55" />
          <rect x="58" y="38" width="20" height="34" rx="5" fill="currentColor" />
          <circle cx="68" cy="66" r="2" fill="var(--panel)" />
        </>
      )}
    </svg>
  );
}

/** A list with nothing to show: the picture, what it means, and optionally the next step. */
export function EmptyState({ kind, title, children, action }: { kind: EmptyKind; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-in flex flex-col items-center px-8 py-12 text-center">
      <Art kind={kind} />
      <p className="mt-5 text-[16px] font-semibold tracking-tight">{title}</p>
      {children && <p className="mt-1.5 max-w-[16rem] text-[14px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
