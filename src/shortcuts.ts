const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

interface Combo {
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** Physical key (event.code), so Option dead keys and keyboard layouts don't matter. */
  code?: string;
  /** Typed character, for keys whose position changes between layouts. */
  key?: string;
  /** Display-only label for keys handled elsewhere. */
  label?: string;
}

export type GlobalAction =
  | 'toggleSidebar'
  | 'newDoc'
  | 'newFolder'
  | 'search'
  | 'exportMd'
  | 'exportHtml'
  | 'exportPdf'
  | 'help';

interface Shortcut {
  name: string;
  combos: Combo[];
  /** Handled here; the rest are handled by the editor and only listed in the panel. */
  action?: GlobalAction;
}

const MOD = { mod: true };

export const SHORTCUTS: Shortcut[] = [
  { name: 'Mostrar / esconder panel', combos: [{ ...MOD, code: 'Period' }], action: 'toggleSidebar' },
  { name: 'Nuevo documento', combos: [{ alt: true, code: 'KeyN' }], action: 'newDoc' },
  { name: 'Nueva carpeta', combos: [{ alt: true, shift: true, code: 'KeyN' }], action: 'newFolder' },
  { name: 'Buscar documentos', combos: [{ ...MOD, code: 'KeyK' }], action: 'search' },
  { name: 'Negrita', combos: [{ ...MOD, code: 'KeyB' }] },
  { name: 'Cursiva', combos: [{ ...MOD, code: 'KeyI' }] },
  { name: 'Insertar link', combos: [{ ...MOD, shift: true, code: 'KeyK' }] },
  { name: 'Código en línea', combos: [{ ...MOD, code: 'KeyE' }] },
  { name: 'Título H1 / H2 / H3', combos: [{ ...MOD, label: '1 / 2 / 3' }] },
  { name: 'Anidar / desanidar ítem', combos: [{ label: 'Tab' }, { shift: true, label: 'Tab' }] },
  { name: 'Exportar a .md', combos: [{ ...MOD, shift: true, code: 'KeyM' }], action: 'exportMd' },
  { name: 'Exportar a .html', combos: [{ ...MOD, shift: true, code: 'KeyH' }], action: 'exportHtml' },
  { name: 'Exportar a .pdf', combos: [{ ...MOD, shift: true, code: 'KeyP' }], action: 'exportPdf' },
  { name: 'Deshacer', combos: [{ ...MOD, code: 'KeyZ' }] },
  { name: 'Rehacer', combos: [isMac ? { ...MOD, shift: true, code: 'KeyZ' } : { ...MOD, code: 'KeyY' }] },
  // "/" moves between layouts (Shift+7 on Spanish keyboards), so match the typed character
  { name: 'Ver todos los atajos', combos: [{ ...MOD, key: '/' }], action: 'help' },
];

function matches(e: KeyboardEvent, c: Combo): boolean {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (!!c.mod !== mod || !!c.alt !== e.altKey) return false;
  if (c.key) return e.key === c.key; // Shift is part of the character
  if (!!c.shift !== e.shiftKey) return false;
  // Some synthetic or remote events carry no code; fall back to the character
  return e.code ? e.code === c.code : e.key.toLowerCase() === keyLabel(c).toLowerCase();
}

function keyLabel(c: Combo): string {
  if (c.label) return c.label;
  if (c.key) return c.key;
  if (c.code === 'Period') return '.';
  return c.code!.replace(/^(Key|Digit)/, '');
}

export function formatCombo(c: Combo): string {
  const parts = isMac
    ? [c.alt && '⌥', c.shift && '⇧', c.mod && '⌘', keyLabel(c)]
    : [c.mod && 'Ctrl', c.alt && 'Alt', c.shift && 'Shift', keyLabel(c)];
  return parts.filter(Boolean).join(isMac ? ' ' : ' + ');
}

/** Listens before the editor so app shortcuts work wherever the focus is. */
export function registerShortcuts(run: (action: GlobalAction) => void) {
  document.addEventListener(
    'keydown',
    (e) => {
      const hit = SHORTCUTS.find((s) => s.action && s.combos.some((c) => matches(e, c)));
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      run(hit.action!);
    },
    { capture: true },
  );
}

let dialog: HTMLDialogElement | null = null;

export function toggleHelp() {
  if (dialog?.open) return dialog.close();
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'help';
    dialog.ariaLabel = 'Atajos de teclado';
    const rows = SHORTCUTS.map(
      (s) =>
        `<tr><td>${s.name}</td><td>${s.combos.map((c) => `<kbd>${formatCombo(c)}</kbd>`).join(' / ')}</td></tr>`,
    ).join('');
    const note = isMac ? '<p>En teclado español, <kbd>/</kbd> se escribe con <kbd>⇧ 7</kbd>.</p>' : '';
    dialog.innerHTML = `<h2>Atajos de teclado</h2><table>${rows}</table>${note}`;
    // Click on the backdrop closes it
    dialog.addEventListener('click', (e) => e.target === dialog && dialog?.close());
    document.body.append(dialog);
  }
  dialog.showModal();
}
