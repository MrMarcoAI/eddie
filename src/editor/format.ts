import { EditorSelection, type EditorState } from '@codemirror/state';
import type { EditorView, KeyBinding } from '@codemirror/view';

/** Wraps each selection in `mark` (e.g. "**"), or unwraps it if it is already wrapped. */
function toggleWrap(mark: string) {
  return (view: EditorView) => {
    const { state } = view;
    const n = mark.length;
    view.dispatch(
      state.changeByRange((range) => {
        const before = state.sliceDoc(range.from - n, range.from);
        const after = state.sliceDoc(range.to, range.to + n);
        if (before === mark && after === mark) {
          return {
            changes: [
              { from: range.from - n, to: range.from },
              { from: range.to, to: range.to + n },
            ],
            range: EditorSelection.range(range.from - n, range.to - n),
          };
        }
        return {
          changes: [
            { from: range.from, insert: mark },
            { from: range.to, insert: mark },
          ],
          range: EditorSelection.range(range.from + n, range.to + n),
        };
      }),
      { userEvent: 'input.format' },
    );
    return true;
  };
}

/** [text](url): selects "url" to type over, or puts a selected URL in place and selects the text. */
function insertLink(view: EditorView) {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const text = state.sliceDoc(range.from, range.to);
      if (/^https?:\/\/\S+$/.test(text)) {
        return {
          changes: { from: range.from, to: range.to, insert: `[](${text})` },
          range: EditorSelection.cursor(range.from + 1),
        };
      }
      const start = range.from + text.length + 3;
      return {
        changes: { from: range.from, to: range.to, insert: `[${text}](url)` },
        range: EditorSelection.range(start, start + 3),
      };
    }),
    { userEvent: 'input.format' },
  );
  return true;
}

/** Sets the current lines to heading `level`, or back to plain text if they already are. */
function toggleHeading(level: number) {
  return (view: EditorView) => {
    const { state } = view;
    const prefix = '#'.repeat(level) + ' ';
    const changes = linesOf(state).map((line) => {
      const current = /^#{1,6}\s+/.exec(line.text)?.[0] ?? '';
      return { from: line.from, to: line.from + current.length, insert: current === prefix ? '' : prefix };
    });
    view.dispatch({ changes, userEvent: 'input.format' });
    return true;
  };
}

function linesOf(state: EditorState) {
  const lines = new Map<number, { from: number; text: string }>();
  for (const r of state.selection.ranges) {
    for (let n = state.doc.lineAt(r.from).number; n <= state.doc.lineAt(r.to).number; n++) {
      lines.set(n, state.doc.line(n));
    }
  }
  return [...lines.values()];
}

export const formatKeymap: KeyBinding[] = [
  { key: 'Mod-b', run: toggleWrap('**'), preventDefault: true },
  { key: 'Mod-i', run: toggleWrap('*'), preventDefault: true },
  { key: 'Mod-e', run: toggleWrap('`'), preventDefault: true },
  { key: 'Mod-Shift-k', run: insertLink, preventDefault: true },
  { key: 'Mod-1', run: toggleHeading(1), preventDefault: true },
  { key: 'Mod-2', run: toggleHeading(2), preventDefault: true },
  { key: 'Mod-3', run: toggleHeading(3), preventDefault: true },
];
