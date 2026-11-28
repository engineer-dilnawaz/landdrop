"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { HighlightRequest } from "./highlight.worker";
import type { Snippet } from "./snippets";
import { cleanMarkdown, useWorkerHtml } from "./text-viewer";
import { BackIcon, CopyIcon, TickIcon, copyText, useEscape } from "./ui";

/**
 * A curl command, code or Markdown pasted into the chat, shown full screen: line numbers and colours
 * for code, a formatted page for Markdown with its source a tap away. Nothing in it can run.
 */
export function SnippetViewer({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const markdown = snippet.kind === "markdown";
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  useEscape(onClose);

  const text = snippet.text;
  const lines = text.split("\n").length;
  const formatted = markdown && !showCode;
  const language = markdown ? "markdown" : snippet.language;
  // The plain text shows at once; colours, or the formatted page, follow when the worker has them.
  const codeRequest = useMemo<HighlightRequest | undefined>(() => (!formatted && language ? { kind: "code", text, language } : undefined), [formatted, language, text]);
  const markdownRequest = useMemo<HighlightRequest | undefined>(() => (formatted ? { kind: "markdown", text } : undefined), [formatted, text]);
  // Code in a language we don't know stays plain: highlight.js's own guess is wrong often enough that no colour beats wrong colour.
  const html = useWorkerHtml(codeRequest);
  const title = snippet.title;
  const markdownHtml = useWorkerHtml(markdownRequest);
  const page = useMemo(() => markdownHtml && cleanMarkdown(markdownHtml, ""), [markdownHtml]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-panel text-foreground">
      <header className="flex items-center gap-1 bg-bar px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-6 md:pb-3 md:pt-3">
        <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover" aria-label="Back to the chat" title="Back">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[17px] font-medium">{title}</p>
          <p className="truncate text-[13px] text-muted">
            {lines.toLocaleString()} {lines === 1 ? "line" : "lines"}
          </p>
        </div>
        {markdown && (
          <div role="group" aria-label="Show as" className="mr-1 flex shrink-0 rounded-xl bg-field p-0.5 text-[13px] font-medium">
            {(["Formatted", "Code"] as const).map((label) => (
              <button
                key={label}
                aria-pressed={(label === "Code") === showCode}
                onClick={() => setShowCode(label === "Code")}
                className={`rounded-[10px] px-3 py-1.5 transition-colors ${(label === "Code") === showCode ? "bg-panel" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            if (!copyText(text)) return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={copied ? "Copied" : "Copy"}
          title={copied ? "Copied" : "Copy"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          {copied ? <TickIcon /> : <CopyIcon size={20} />}
        </button>
      </header>
      <div className="min-h-0 flex-1 select-text overflow-auto pb-[env(safe-area-inset-bottom)]">
        {formatted && page !== undefined ? (
          // Cleaned by DOMPurify: see cleanMarkdown.
          <article className="markdown mx-auto max-w-3xl px-5 py-6 md:px-8" dangerouslySetInnerHTML={{ __html: page }} />
        ) : formatted ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">Formatting…</p>
        ) : (
          // Two columns of one <pre> each: cheap to draw even for a long paste.
          <div className="flex min-w-max font-mono text-[13px] leading-[1.6]">
            <pre aria-hidden className="sticky left-0 select-none bg-panel px-3 py-3 text-right text-muted">
              {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
            </pre>
            {html !== undefined ? (
              // Safe as HTML: it's highlight.js's escaped copy of the text, with colour spans added.
              <pre className="code-colours px-4 py-3" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <pre className="px-4 py-3">{text}</pre>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
