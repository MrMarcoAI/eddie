import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { codeTokens } from './codeTokens';

// Markdown text styling. Heading sizes live on line classes (see decorations.ts)
// so the "#" marks scale with the title text.
const markdownStyle = HighlightStyle.define([
  { tag: t.processingInstruction, color: 'var(--text-muted)' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--accent)' },
  { tag: t.url, color: 'var(--text-muted)' },
  { tag: t.labelName, color: 'var(--text-muted)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)' },
  { tag: t.quote, color: 'var(--text-quote)' },
  { tag: t.atom, color: 'var(--accent)' },
  { tag: t.contentSeparator, color: 'var(--text-muted)' },
  { tag: t.meta, color: 'var(--text-muted)' },

  // Code inside fenced blocks and front matter
  ...codeTokens.map(({ class: _, ...style }) => style),
]);

const editorTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--bg)', color: 'var(--text)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--font-size)',
      lineHeight: '1.65',
    },
    '.cm-content': {
      maxWidth: 'var(--measure)',
      margin: '0 auto',
      padding: '12vh 24px 40vh',
      caretColor: 'var(--accent)',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--accent)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
      { backgroundColor: 'var(--selection) !important' },

    '.cm-h1': { fontSize: '2em', fontWeight: '700', lineHeight: '1.25', paddingTop: '0.6em' },
    '.cm-h2': { fontSize: '1.5em', fontWeight: '700', lineHeight: '1.3', paddingTop: '0.5em' },
    '.cm-h3': { fontSize: '1.25em', fontWeight: '700', paddingTop: '0.4em' },
    '.cm-h4, .cm-h5, .cm-h6': { fontWeight: '700' },
    '.cm-h5, .cm-h6': { color: 'var(--text-quote)' },

    '.cm-quote': { borderLeft: '3px solid var(--accent)', paddingLeft: '14px' },
    '.cm-inline-code': { backgroundColor: 'var(--bg-code)', borderRadius: '4px', padding: '1px 3px' },
    '.cm-codeblock': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.9em',
      backgroundColor: 'var(--bg-code)',
      padding: '0 12px',
    },
    '.cm-codeblock-first': { borderTopLeftRadius: '6px', borderTopRightRadius: '6px' },
    '.cm-codeblock-last': { borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' },
    '.cm-table': { fontFamily: 'var(--font-mono)', fontSize: '0.9em' },
    '.cm-frontmatter': { fontFamily: 'var(--font-mono)', fontSize: '0.85em' },
    '.cm-frontmatter, .cm-frontmatter span': { color: 'var(--text-muted)' },
    // Nested selectors so the accent wins over the muted Markdown marks
    '.cm-list-mark, .cm-list-mark span': { color: 'var(--accent)' },
    '.cm-task, .cm-task span': { color: 'var(--accent)', cursor: 'pointer' },
  },
  { dark: true },
);

export const theme = [editorTheme, syntaxHighlighting(markdownStyle)];
