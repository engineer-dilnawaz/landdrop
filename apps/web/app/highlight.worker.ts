/**
 * Colours code, and turns Markdown into HTML, off the page's thread: a big file takes a moment, and
 * the page must never freeze. highlight.js escapes the code it's given. Markdown can carry raw HTML,
 * so the page cleans that output before showing it.
 */
import hljs from "highlight.js/lib/common";
import dart from "highlight.js/lib/languages/dart";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import elixir from "highlight.js/lib/languages/elixir";
import groovy from "highlight.js/lib/languages/groovy";
import haskell from "highlight.js/lib/languages/haskell";
import matlab from "highlight.js/lib/languages/matlab";
import powershell from "highlight.js/lib/languages/powershell";
import scala from "highlight.js/lib/languages/scala";
import { Marked } from "marked";

// The common set lacks these popular languages; each is small.
for (const [name, language] of Object.entries({ dart, dockerfile, elixir, groovy, haskell, matlab, powershell, scala })) hljs.registerLanguage(name, language);

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const markdown = new Marked({
  gfm: true,
  renderer: {
    // Code blocks in a README are coloured too, when they name a language highlight.js knows.
    code({ text, lang }) {
      const language = lang?.split(/\s/)[0];
      const html = language && hljs.getLanguage(language) ? hljs.highlight(text, { language, ignoreIllegals: true }).value : escape(text);
      return `<pre class="code-colours"><code>${html}</code></pre>\n`;
    },
  },
});

export type HighlightRequest = { kind: "code"; text: string; language: string } | { kind: "markdown"; text: string };

self.onmessage = ({ data }: MessageEvent<HighlightRequest>) => {
  try {
    const html =
      data.kind === "markdown"
        ? (markdown.parse(data.text, { async: false }) as string)
        : hljs.highlight(data.text, { language: data.language, ignoreIllegals: true }).value;
    self.postMessage({ html });
  } catch {
    self.postMessage({ html: undefined });
  }
};
