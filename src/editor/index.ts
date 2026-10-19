import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { EditorState, Prec } from '@codemirror/state';
import { drawSelection, EditorView, keymap } from '@codemirror/view';
import { markdownDecorations } from './decorations';
import { formatKeymap } from './format';
import { clickHandlers, listKeymap } from './lists';
import { theme } from './theme';

function createState(content: string, onChange: (content: string) => void): EditorState {
  return EditorState.create({
    doc: content,
    extensions: [
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      yamlFrontmatter({ content: markdown({ base: markdownLanguage, codeLanguages: languages }) }),
      Prec.high(keymap.of([...listKeymap, ...formatKeymap])),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdownDecorations,
      clickHandlers,
      theme,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChange(u.state.doc.toString());
      }),
    ],
  });
}

export interface Editor {
  view: EditorView;
  /** Replaces the document (and its undo history), e.g. when opening another doc. */
  load(content: string): void;
}

export function createEditor(parent: HTMLElement, onChange: (content: string) => void): Editor {
  const view = new EditorView({ parent, state: createState('', onChange) });
  return {
    view,
    load(content) {
      view.setState(createState(content, onChange));
    },
  };
}
