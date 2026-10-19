import { indentLess, indentMore } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import type { ChangeSpec, EditorState, Line } from '@codemirror/state';
import { EditorView, type KeyBinding } from '@codemirror/view';

// indent, marker, space after the marker
const ITEM = /^(\s*)([-*+]|\d+[.)])(\s+)/;

function item(line: Line) {
  const m = ITEM.exec(line.text);
  return m && { indent: m[1].length, marker: m[2], content: m[0].length };
}

function selectedLines(state: EditorState): Line[] {
  const lines = new Map<number, Line>();
  for (const r of state.selection.ranges) {
    for (let n = state.doc.lineAt(r.from).number; n <= state.doc.lineAt(r.to).number; n++) {
      lines.set(n, state.doc.line(n));
    }
  }
  return [...lines.values()];
}

/** Nearest earlier list item whose indent satisfies `fits`, stopping at blank lines. */
function previousItem(state: EditorState, line: Line, fits: (indent: number) => boolean) {
  for (let n = line.number - 1; n >= 1; n--) {
    const prev = state.doc.line(n);
    if (!prev.text.trim()) return null;
    const it = item(prev);
    if (it && fits(it.indent)) return it;
  }
  return null;
}

function reindent(line: Line, from: number, to: number, marker: string, nested: boolean): ChangeSpec[] {
  const changes: ChangeSpec[] = [{ from: line.from, to: line.from + from, insert: ' '.repeat(to) }];
  // A numbered item that becomes a sublist starts counting again
  if (nested && /^\d/.test(marker)) {
    changes.push({ from: line.from + from, to: line.from + from + marker.length - 1, insert: '1' });
  }
  return changes;
}

/** Tab / Shift+Tab: nest list items under the previous item, or fall back to plain indentation. */
function shiftItems(dir: 1 | -1) {
  return (view: EditorView) => {
    const lines = selectedLines(view.state);
    if (!lines.every(item)) return dir > 0 ? indentMore(view) : indentLess(view);
    const changes: ChangeSpec[] = [];
    for (const line of lines) {
      const it = item(line)!;
      if (dir > 0) {
        const parent = previousItem(view.state, line, (i) => i <= it.indent);
        if (parent && parent.content > it.indent) {
          changes.push(...reindent(line, it.indent, parent.content, it.marker, true));
        }
      } else if (it.indent > 0) {
        const parent = previousItem(view.state, line, (i) => i < it.indent);
        changes.push(...reindent(line, it.indent, parent ? parent.indent : 0, it.marker, false));
      }
    }
    view.dispatch({ changes, userEvent: 'input.indent' });
    return true;
  };
}

export const listKeymap: KeyBinding[] = [
  { key: 'Tab', run: shiftItems(1) },
  { key: 'Shift-Tab', run: shiftItems(-1) },
];

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const SAFE_URL = /^(https?:|mailto:)/i;

function linkAt(state: EditorState, pos: number): string | null {
  for (let node: ReturnType<typeof syntaxTree>['topNode'] | null = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
    if (node.name === 'URL') return state.sliceDoc(node.from, node.to);
    if (node.name === 'Link' || node.name === 'Autolink') {
      const url = node.getChild('URL');
      return url ? state.sliceDoc(url.from, url.to) : null;
    }
  }
  return null;
}

/** Checkbox toggling on click, and Cmd/Ctrl+click to open links in the browser. */
export const clickHandlers = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) return false;

    const task = target.closest('.cm-task');
    if (task) {
      const from = view.posAtDOM(task);
      const checked = view.state.sliceDoc(from + 1, from + 2).toLowerCase() === 'x';
      view.dispatch({ changes: { from: from + 1, to: from + 2, insert: checked ? ' ' : 'x' } });
      event.preventDefault();
      return true;
    }

    if (isMac ? event.metaKey : event.ctrlKey) {
      const url = linkAt(view.state, pos)?.replace(/^<|>$/g, '');
      if (url && SAFE_URL.test(url)) {
        window.open(url, '_blank', 'noopener');
        event.preventDefault();
        return true;
      }
    }
    return false;
  },
});
