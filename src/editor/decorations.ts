import { syntaxTree } from '@codemirror/language';
import type { Range } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

const HEADINGS: Record<string, string> = {
  ATXHeading1: 'cm-h1',
  ATXHeading2: 'cm-h2',
  ATXHeading3: 'cm-h3',
  ATXHeading4: 'cm-h4',
  ATXHeading5: 'cm-h5',
  ATXHeading6: 'cm-h6',
  SetextHeading1: 'cm-h1',
  SetextHeading2: 'cm-h2',
};

const inlineCode = Decoration.mark({ class: 'cm-inline-code' });
const listMark = Decoration.mark({ class: 'cm-list-mark' });
const taskMark = Decoration.mark({ class: 'cm-task' });

/** Invisible spacer that pads a table cell so pipes line up (text is untouched). */
class CellPad extends WidgetType {
  constructor(readonly width: number) {
    super();
  }
  eq(other: CellPad) {
    return other.width === this.width;
  }
  toDOM() {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.style.width = `${this.width}ch`;
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

function lineClass(view: EditorView, from: number, to: number, cls: string, out: Range<Decoration>[]) {
  const doc = view.state.doc;
  const first = doc.lineAt(from).number;
  // Nodes that end with a newline would otherwise spill onto the next line
  const last = doc.lineAt(to > from && doc.lineAt(to).from === to ? to - 1 : to).number;
  for (let n = first; n <= last; n++) {
    let c = cls;
    if (cls === 'cm-codeblock') {
      if (n === first) c += ' cm-codeblock-first';
      if (n === last) c += ' cm-codeblock-last';
    }
    out.push(Decoration.line({ class: c }).range(doc.line(n).from));
  }
}

/** Positions of unescaped pipes in a table row. */
function pipes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '|') out.push(i);
  }
  return out;
}

function alignTable(view: EditorView, from: number, to: number, out: Range<Decoration>[]) {
  const doc = view.state.doc;
  const rows: { from: number; ends: number[]; widths: number[] }[] = [];
  for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
    const line = doc.line(n);
    const p = pipes(line.text);
    // Cell boundaries: each pipe ends the cell before it; a row without a
    // trailing pipe ends its last cell at the end of the line.
    const leading = line.text.trimStart().startsWith('|');
    const ends = leading ? p.slice(1) : p.slice();
    const trailing = line.text.trimEnd().endsWith('|');
    if (!trailing) ends.push(line.text.trimEnd().length);
    const starts = [leading ? p[0] + 1 : 0, ...ends.slice(0, -1).map((e) => e + 1)];
    rows.push({ from: line.from, ends, widths: ends.map((e, i) => e - starts[i]) });
  }
  const max: number[] = [];
  for (const r of rows) r.widths.forEach((w, i) => (max[i] = Math.max(max[i] ?? 0, w)));
  for (const r of rows) {
    r.widths.forEach((w, i) => {
      if (w < max[i]) out.push(Decoration.widget({ widget: new CellPad(max[i] - w), side: -1 }).range(r.from + r.ends[i]));
    });
  }
}

function build(view: EditorView): DecorationSet {
  const out: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        if (HEADINGS[name]) lineClass(view, node.from, node.to, HEADINGS[name], out);
        else if (name === 'Blockquote') lineClass(view, node.from, node.to, 'cm-quote', out);
        else if (name === 'Frontmatter') {
          lineClass(view, node.from, node.to, 'cm-frontmatter', out);
          return false;
        }
        else if (name === 'FencedCode' || name === 'CodeBlock') {
          lineClass(view, node.from, node.to, 'cm-codeblock', out);
          return false;
        } else if (name === 'Table') {
          lineClass(view, node.from, node.to, 'cm-table', out);
          alignTable(view, node.from, node.to, out);
        } else if (name === 'InlineCode') out.push(inlineCode.range(node.from, node.to));
        else if (name === 'ListMark') out.push(listMark.range(node.from, node.to));
        else if (name === 'TaskMarker') out.push(taskMark.range(node.from, node.to));
      },
    });
  }
  return Decoration.set(out, true);
}

export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = build(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
