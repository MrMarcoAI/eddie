import { LanguageDescription, type Language } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightCode, tagHighlighter } from '@lezer/highlight';
import MarkdownIt from 'markdown-it';
import { codeTokens } from '../editor/codeTokens';

export type Mode = 'dark' | 'light';

const FRONT_MATTER = /^---\n[\s\S]*?\n---(\n|$)/;
const highlighter = tagHighlighter(codeTokens.map(({ tag, class: cls }) => ({ tag, class: cls })));

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Loads the code languages used in the document, since markdown-it highlights synchronously. */
async function loadLanguages(markdown: string): Promise<Map<string, Language>> {
  const loaded = new Map<string, Language>();
  for (const [, name] of markdown.matchAll(/^\s*(?:```|~~~)\s*([\w+#.-]+)/gm)) {
    const desc = LanguageDescription.matchLanguageName(languages, name, true);
    if (desc && !loaded.has(name)) loaded.set(name, (await desc.load()).language);
  }
  return loaded;
}

function highlight(code: string, language: Language | undefined): string {
  if (!language) return escape(code);
  let html = '';
  highlightCode(
    code,
    language.parser.parse(code),
    highlighter,
    (text, classes) => (html += classes ? `<span class="${classes}">${escape(text)}</span>` : escape(text)),
    () => (html += '\n'),
  );
  return html;
}

async function renderMermaid(diagrams: string[], mode: Mode): Promise<string[]> {
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: mode === 'dark' ? 'dark' : 'neutral',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  });
  const out: string[] = [];
  for (const [i, code] of diagrams.entries()) {
    try {
      out.push(`<figure class="mermaid">${(await mermaid.render(`eddie-mermaid-${i}`, code)).svg}</figure>`);
    } catch {
      out.push(`<pre class="code"><code>${escape(code)}</code></pre>`);
    }
  }
  return out;
}

/** Converts a document to a self-contained HTML page (styles inline, diagrams as SVG). */
export async function renderHtml(content: string, title: string, mode: Mode): Promise<string> {
  const markdown = content.replace(FRONT_MATTER, '');
  const langs = await loadLanguages(markdown);
  const diagrams: string[] = [];

  const md = new MarkdownIt({ html: true, linkify: true });
  md.renderer.rules.fence = (tokens, idx) => {
    const { info, content: code } = tokens[idx];
    const lang = info.trim().split(/\s+/)[0];
    if (lang === 'mermaid') return `<!--mermaid:${diagrams.push(code) - 1}-->`;
    return `<pre class="code"><code>${highlight(code, langs.get(lang))}</code></pre>\n`;
  };

  let body = md
    .render(markdown)
    .replace(
      /<li>(\s*<p>)?\[([ xX])\]\s/g,
      (_, p = '', mark) => `<li class="task">${p}<input type="checkbox" tabindex="-1"${mark === ' ' ? '' : ' checked'}> `,
    );

  if (diagrams.length) {
    const svgs = await renderMermaid(diagrams, mode);
    body = body.replace(/<!--mermaid:(\d+)-->/g, (_, i) => svgs[+i]);
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="eddie">
<title>${escape(title)}</title>
<style>${css(mode)}</style>
</head>
<body>
<main>
${body}</main>
</body>
</html>
`;
}

const PALETTES: Record<Mode, string> = {
  dark: `
  --bg: #151515; --bg-code: #20201f; --text: #f9f9f7; --text-quote: #c3c2b7; --text-muted: #97958d;
  --border: rgba(225, 224, 217, 0.12); --accent: #ff2bd6; --link: #ff2bd6;
  --code-keyword: #e48bd8; --code-string: #b5cf8a; --code-number: #e5b77a;
  --code-function: #8ab8e6; --code-type: #7fcfc4; --code-property: #d7c9a7;`,
  light: `
  --bg: #ffffff; --bg-code: #f4f3ef; --text: #1a1a19; --text-quote: #4a4945; --text-muted: #6b6a64;
  --border: #e3e1da; --accent: #ff2bd6; --link: #b30d91;
  --code-keyword: #8a2d8a; --code-string: #4f7a1f; --code-number: #a35a00;
  --code-function: #1d6fb8; --code-type: #127a6e; --code-property: #7a5a1e;`,
};

function css(mode: Mode): string {
  return `
:root {${PALETTES[mode]}
  color-scheme: ${mode};
}
* { box-sizing: border-box; }
html { background: var(--bg); color: var(--text); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 16px/1.65 "Helvetica Neue", Helvetica, Arial, sans-serif; }
main { max-width: 70ch; margin: 0 auto; padding: 64px 24px 96px; }
h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.25; margin: 1.6em 0 0.5em; }
h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; } h4 { font-size: 1em; }
h5, h6 { font-size: 1em; color: var(--text-quote); }
main > :first-child { margin-top: 0; }
p, ul, ol, blockquote, pre, table, figure { margin: 0 0 1em; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
strong { font-weight: 700; }
blockquote { margin-left: 0; padding-left: 14px; border-left: 3px solid var(--accent); color: var(--text-quote); }
ul, ol { padding-left: 1.5em; }
li::marker { color: var(--accent); }
li.task { list-style: none; margin-left: -1.4em; }
li.task input { accent-color: var(--accent); pointer-events: none; margin: 0 0.4em 0 0; vertical-align: -1px; }
code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em; }
:not(pre) > code { background: var(--bg-code); border-radius: 4px; padding: 1px 4px; }
pre.code { background: var(--bg-code); border-radius: 6px; padding: 12px 14px; overflow-x: auto; line-height: 1.5; }
table { border-collapse: collapse; font-size: 0.95em; }
th, td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
th { font-weight: 700; }
hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
img { max-width: 100%; }
figure.mermaid { text-align: center; }
figure.mermaid svg { max-width: 100%; height: auto; }
::selection { background: rgba(255, 43, 214, 0.3); }
${codeTokens.map((c) => `.${c.class} { color: ${c.color};${c.fontStyle ? ` font-style: ${c.fontStyle};` : ''} }`).join('\n')}
@page { margin: 18mm 16mm; }
@media print {
  main { max-width: none; padding: 0; }
  pre, table, figure, blockquote { break-inside: avoid; }
  h1, h2, h3, h4 { break-after: avoid; }
}
`;
}
