"use client";

import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { HighlightRequest } from "./highlight.worker";
import { BackIcon, CopyIcon, SaveIcon, TickIcon, copyText, formatBytes, useEscape } from "./ui";

/** Shown at most; the rest of a bigger file is a download away. One request, so it opens at once. */
const MAX_TEXT_BYTES = 1024 * 1024;

const TEXT_EXTENSIONS = new Set(
  (
    "txt md markdown rst log csv tsv json jsonc json5 xml yml yaml toml ini cfg conf env properties " +
    "js mjs cjs jsx ts mts cts tsx vue svelte astro css scss sass less html htm svg " +
    "py rb php pl lua r go rs java kt kts swift scala groovy gradle dart c h cc cpp hpp cs m mm " +
    "sh bash zsh fish ps1 bat cmd sql graphql gql proto prisma tf hcl dockerfile makefile cmake lock patch diff"
  ).split(" "),
);
/** Text files that usually have no extension. */
const TEXT_NAMES = /^(dockerfile|makefile|readme|license|licence|changelog|authors|procfile|gemfile|podfile|\.[\w.-]+rc|\.gitignore|\.gitattributes|\.editorconfig|\.env(\.\w+)?)$/i;

/** highlight.js's name for each kind of file it colours; others show as plain text. */
const LANGUAGES: Record<string, string> = {
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "typescript",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript", vue: "xml", svelte: "xml", astro: "xml",
  json: "json", jsonc: "json", json5: "json", md: "markdown", markdown: "markdown",
  css: "css", scss: "scss", sass: "scss", less: "less", html: "xml", htm: "xml", xml: "xml", svg: "xml",
  yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini", cfg: "ini", conf: "ini", env: "ini", properties: "ini",
  py: "python", rb: "ruby", php: "php", pl: "perl", lua: "lua", r: "r", go: "go", rs: "rust",
  java: "java", kt: "kotlin", kts: "kotlin", gradle: "kotlin", swift: "swift", c: "c", h: "c",
  cc: "cpp", cpp: "cpp", hpp: "cpp", cs: "csharp", m: "objectivec", mm: "objectivec",
  sh: "bash", bash: "bash", zsh: "bash", fish: "bash", sql: "sql", graphql: "graphql", gql: "graphql",
  diff: "diff", patch: "diff", makefile: "makefile",
};
const languageOf = (name: string) =>
  LANGUAGES[name.includes(".") ? name.split(".").pop()!.toLowerCase() : name.toLowerCase()] ?? (/^\.(env|[\w-]+rc)/i.test(name) ? "ini" : undefined);

/** Whether a file can be read as text, judged by its name. */
export function isTextName(name: string): boolean {
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return TEXT_EXTENSIONS.has(extension) || TEXT_NAMES.test(name);
}

type Loaded = { text: string; truncated: boolean } | { error: string };

const isMarkdown = (name: string) => /\.(md|markdown)$/i.test(name);

/** HTML the worker made from `request`, once it's ready; undefined until then, or with no request. */
export function useWorkerHtml(request: HighlightRequest | undefined): string | undefined {
  const [done, setDone] = useState<{ request: HighlightRequest; html: string }>();
  useEffect(() => {
    if (!request) return;
    const worker = new Worker(new URL("./highlight.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<{ html?: string }>) => {
      if (data.html !== undefined) setDone({ request, html: data.html });
      worker.terminate();
    };
    worker.postMessage(request);
    return () => worker.terminate();
  }, [request]);
  return done && done.request === request ? done.html : undefined;
}

/** Joins a link in a Markdown file to the file's own folder: "../docs/a.png" from "app/README.md" is "docs/a.png". */
function resolvePath(from: string, link: string): string | undefined {
  const parts = from.split("/").slice(0, -1);
  for (const part of decodeURIComponent(link.split(/[?#]/)[0]).split("/")) {
    if (part === "..") {
      if (!parts.length) return undefined;
      parts.pop();
    } else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

/**
 * Markdown's HTML, made safe: no scripts, frames, forms or event handlers. Pictures from inside the
 * folder show; web links open in a new tab; other links (to files in the folder) are left as text.
 */
export function cleanMarkdown(html: string, path: string, fileUrl?: (path: string, preview?: boolean) => string): string {
  const hook = (node: Element) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") ?? "";
      if (/^(https?:|mailto:)/i.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      } else if (!href.startsWith("#")) node.removeAttribute("href");
    }
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") ?? "";
      if (!/^(https?:|data:image\/)/i.test(src)) {
        // A pasted message has no folder to take pictures from, so only web and inline pictures show.
        const inFolder = fileUrl && resolvePath(path, src);
        if (inFolder && fileUrl) node.setAttribute("src", fileUrl(inFolder, true));
        else node.removeAttribute("src");
      }
      node.setAttribute("loading", "lazy");
    }
  };
  DOMPurify.addHook("afterSanitizeAttributes", hook);
  try {
    return DOMPurify.sanitize(html, { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form", "button", "textarea", "select"] });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}

/**
 * A text or code file from a shared folder, shown full screen with line numbers and colours. Markdown
 * shows formatted, like a README on GitHub, with its source a tap away. Nothing in a file can run.
 */
export function TextViewer({ name, path, title, size, src, download, fileUrl, onClose }: {
  name: string;
  /** Its path in the folder, which a README's pictures are relative to. */
  path: string;
  /** Where it is in the folder. */
  title: string;
  size: number;
  src: string;
  download: string;
  /** Another file in the folder: for a README's pictures. */
  fileUrl: (path: string, preview?: boolean) => string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded>();
  const markdown = isMarkdown(name);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  useEscape(onClose);

  useEffect(() => {
    const controller = new AbortController();
    fetch(src, { headers: { range: `bytes=0-${MAX_TEXT_BYTES - 1}` }, signal: controller.signal })
      .then(async (res) => {
        // An empty file has no bytes to ask for.
        if (res.status === 416) return setLoaded({ text: "", truncated: false });
        if (!res.ok) throw new Error(res.status === 410 || res.status === 503 ? "The sender is offline." : `Couldn't open it (${res.status}).`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        // A NUL byte early on means it's binary after all, whatever its name says.
        if (bytes.subarray(0, 8000).includes(0)) throw new Error("This file isn't text.");
        setLoaded({ text: new TextDecoder().decode(bytes), truncated: size > bytes.length });
      })
      .catch((err: Error) => !controller.signal.aborted && setLoaded({ error: err.message }));
    return () => controller.abort();
  }, [src, size]);

  const text = loaded && "text" in loaded ? loaded.text.replace(/\r\n?/g, "\n").replace(/\n$/, "") : undefined;
  const language = languageOf(name);
  const formatted = markdown && !showCode;
  // The plain text shows at once; colours, or the formatted README, follow when the worker has them.
  const codeRequest = useMemo<HighlightRequest | undefined>(() => (text && language ? { kind: "code", text, language } : undefined), [text, language]);
  const markdownRequest = useMemo<HighlightRequest | undefined>(() => (text && markdown ? { kind: "markdown", text } : undefined), [text, markdown]);
  const html = useWorkerHtml(codeRequest);
  const markdownHtml = useWorkerHtml(markdownRequest);
  const readme = useMemo(
    () => markdownHtml && cleanMarkdown(markdownHtml, path, fileUrl),
    // fileUrl is a new function each render but always gives the same addresses; cleaning a big README once is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markdownHtml, path],
  );
  const lines = text?.split("\n").length ?? 0;
  const truncated = !!loaded && "truncated" in loaded && loaded.truncated;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-50 flex flex-col bg-panel text-foreground">
      <header className="flex items-center gap-1 bg-bar px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-6 md:pb-3 md:pt-3">
        <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-hover" aria-label="Back to the folder" title="Back">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[17px] font-medium">{name}</p>
          <p className="truncate text-[13px] text-muted">
            {title} · {formatBytes(size)}
            {text && ` · ${lines.toLocaleString()} ${lines === 1 ? "line" : "lines"}${truncated ? " shown" : ""}`}
          </p>
        </div>
        {markdown && (
          <div role="group" aria-label="Show as" className="mr-1 flex shrink-0 rounded-full bg-field p-0.5 text-[13px] font-medium">
            {(["Formatted", "Code"] as const).map((label) => (
              <button
                key={label}
                aria-pressed={(label === "Code") === showCode}
                onClick={() => setShowCode(label === "Code")}
                className={`rounded-full px-3 py-1.5 ${(label === "Code") === showCode ? "bg-panel" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {text && (
          <button
            onClick={() => {
              // The file's own text, line endings and all, not the copy tidied up for showing.
              if (!copyText(loaded && "text" in loaded ? loaded.text : text)) return;
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label={copied ? "Copied" : `Copy the text of ${name}`}
            title={copied ? "Copied" : truncated ? `Copy (the first ${formatBytes(MAX_TEXT_BYTES)} shown)` : "Copy"}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
          >
            {copied ? <TickIcon /> : <CopyIcon size={20} />}
          </button>
        )}
        <a
          href={download}
          download={name}
          aria-label={`Save ${name}`}
          title="Save"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
        >
          <SaveIcon size={20} />
        </a>
      </header>
      {truncated && (
        <p className="bg-field px-5 py-2 text-[13px] text-muted">
          Showing the first {formatBytes(MAX_TEXT_BYTES)} of {formatBytes(size)}. Save it to see the whole file.
        </p>
      )}
      <div className="min-h-0 flex-1 select-text overflow-auto pb-[env(safe-area-inset-bottom)]">
        {!loaded ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">Opening “{name}”…</p>
        ) : "error" in loaded ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">{loaded.error}</p>
        ) : !text ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">This file is empty.</p>
        ) : formatted && readme !== undefined ? (
          // Cleaned by DOMPurify: see cleanMarkdown.
          <article className="markdown mx-auto max-w-3xl px-5 py-6 md:px-8" dangerouslySetInnerHTML={{ __html: readme }} />
        ) : formatted ? (
          <p className="px-6 py-12 text-center text-[14px] text-muted">Formatting “{name}”…</p>
        ) : (
          // Two columns of one <pre> each: cheap to draw even for tens of thousands of lines.
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
