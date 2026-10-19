import * as storage from '../storage';
import type { Doc, Folder, SortOrder } from '../storage';

export interface SidebarHandlers {
  open(id: string): void;
  /** Docs that were just deleted, so the app can close the current one. */
  deleted(ids: string[]): void;
}

export interface Sidebar {
  refresh(): Promise<void>;
  setActive(id: string | null): void;
  newDoc(folderId?: string | null): Promise<void>;
  newFolder(parentId?: string | null): Promise<void>;
  toggle(): void;
}

const ICONS = {
  doc: '<path d="M7 3h7l5 5v13H7z M14 3v5h5"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  hide: '<path d="M4 4h16v16H4z M10 4v16"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
};

const icon = (name: keyof typeof ICONS) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon icon-${name}">${ICONS[name]}</svg>`;

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const SORT_LABELS: Record<SortOrder, string> = {
  updatedAt: 'Última modificación',
  createdAt: 'Fecha de creación',
  name: 'Nombre',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: object = {}, html = ''): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  if (html) node.innerHTML = html;
  return node;
}

export async function createSidebar(root: HTMLElement, showButton: HTMLElement, handlers: SidebarHandlers): Promise<Sidebar> {
  const settings = await storage.getSettings();
  let docs: Doc[] = [];
  let folders: Folder[] = [];
  let sortOrder = settings.sortOrder;
  let collapsed = new Set(settings.collapsedFolderIds);
  let visible = settings.sidebarVisible;
  let query = '';
  let activeId: string | null = null;
  let editing = false;

  // Static structure

  const logo = el('img', { src: `${import.meta.env.BASE_URL}eddie-logo.png`, alt: 'eddie', className: 'sidebar-logo' });
  const hideButton = el('button', { className: 'icon-button', title: 'Esconder panel', ariaLabel: 'Esconder panel' }, icon('hide'));
  const search = el('input', { type: 'search', placeholder: 'Buscar', className: 'sidebar-search', ariaLabel: 'Buscar documentos' });
  const sort = el('select', { className: 'sidebar-sort', ariaLabel: 'Ordenar por' });
  for (const [value, label] of Object.entries(SORT_LABELS)) sort.append(el('option', { value, textContent: label }));
  sort.value = sortOrder;
  const newDocButton = el('button', { className: 'text-button' }, `${icon('doc')}<span>Documento</span>`);
  const newFolderButton = el('button', { className: 'text-button' }, `${icon('folder')}<span>Carpeta</span>`);
  const tree = el('nav', { className: 'tree', ariaLabel: 'Documentos' });

  root.append(
    el('header', { className: 'sidebar-header' }),
    el('div', { className: 'sidebar-tools' }),
    el('div', { className: 'sidebar-actions' }),
    tree,
  );
  root.children[0].append(logo, hideButton);
  root.children[1].append(search, sort);
  root.children[2].append(newDocButton, newFolderButton);

  // Data

  async function load() {
    [docs, folders] = await Promise.all([storage.listDocs(), storage.listFolders()]);
  }

  function sorted<T extends Doc | Folder>(items: T[]): T[] {
    const name = (i: T) => ('name' in i ? i.name : storage.deriveTitle(i));
    return [...items].sort((a, b) =>
      sortOrder === 'name' ? collator.compare(name(a), name(b)) : b[sortOrder].localeCompare(a[sortOrder]),
    );
  }

  /** Ids of a folder and every folder nested in it. */
  function subtree(id: string): Set<string> {
    const ids = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const f of folders) if (f.folderId && ids.has(f.folderId) && !ids.has(f.id)) ids.add(f.id), (grew = true);
    }
    return ids;
  }

  // Rendering

  function row(kind: 'doc' | 'folder', id: string, label: string, depth: number) {
    const item = el('div', { className: `row row-${kind}`, draggable: true });
    item.dataset.id = id;
    item.dataset.kind = kind;
    item.style.setProperty('--depth', String(depth));
    const main = el('button', { className: 'row-main' });
    if (kind === 'folder') {
      main.innerHTML = icon('chevron');
      main.ariaExpanded = String(!collapsed.has(id));
    }
    main.append(el('span', { className: 'row-label', textContent: label }));
    const more = el('button', { className: 'icon-button row-more', title: 'Opciones', ariaLabel: `Opciones de ${label}` }, icon('more'));
    item.append(main, more);
    if (kind === 'doc' && id === activeId) item.classList.add('active');
    return item;
  }

  function renderLevel(parentId: string | null, depth: number, out: HTMLElement) {
    for (const f of sorted(folders.filter((f) => f.folderId === parentId))) {
      out.append(row('folder', f.id, f.name, depth));
      if (!collapsed.has(f.id)) renderLevel(f.id, depth + 1, out);
    }
    for (const d of sorted(docs.filter((d) => d.folderId === parentId))) {
      out.append(row('doc', d.id, storage.deriveTitle(d), depth));
    }
  }

  function render() {
    if (editing) return;
    tree.replaceChildren();
    if (!docs.length && !folders.length) {
      const start = el('button', { className: 'empty-action', textContent: 'Crear el primer documento' });
      start.onclick = () => api.newDoc();
      tree.append(el('p', { className: 'empty', textContent: 'Todavía no hay documentos.' }), start);
      return;
    }
    if (query) {
      const q = normalize(query);
      const hits = sorted(docs.filter((d) => normalize(storage.deriveTitle(d) + '\n' + d.content).includes(q)));
      for (const d of hits) tree.append(row('doc', d.id, storage.deriveTitle(d), 0));
      if (!hits.length) tree.append(el('p', { className: 'empty', textContent: `Sin resultados para “${query}”.` }));
      return;
    }
    renderLevel(null, 0, tree);
  }

  async function refresh() {
    await load();
    render();
  }

  // Inline rename

  function rename(id: string, kind: 'doc' | 'folder') {
    const label = tree.querySelector<HTMLElement>(`.row[data-id="${id}"] .row-label`);
    if (!label) return;
    editing = true;
    const input = el('input', { className: 'row-input', value: label.textContent ?? '' });
    label.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = async (save: boolean) => {
      if (done) return;
      done = true;
      editing = false;
      const value = input.value.trim();
      if (save && kind === 'doc') await storage.updateDoc(id, { customTitle: value || null });
      if (save && kind === 'folder' && value) await storage.updateFolder(id, { name: value });
      await refresh();
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
      e.stopPropagation();
    };
    input.onblur = () => finish(true);
    input.onclick = (e) => e.stopPropagation();
  }

  // Delete

  async function remove(id: string, kind: 'doc' | 'folder') {
    if (kind === 'doc') {
      const doc = docs.find((d) => d.id === id)!;
      if (!confirm(`¿Eliminar “${storage.deriveTitle(doc)}”?`)) return;
      await storage.deleteDoc(id);
      handlers.deleted([id]);
    } else {
      const folder = folders.find((f) => f.id === id)!;
      const ids = subtree(id);
      const inside = docs.filter((d) => d.folderId && ids.has(d.folderId)).map((d) => d.id);
      const extra = inside.length ? ` y ${inside.length === 1 ? 'su documento' : `sus ${inside.length} documentos`}` : '';
      if (!confirm(`¿Eliminar la carpeta “${folder.name}”${extra}?`)) return;
      await storage.deleteFolder(id);
      handlers.deleted(inside);
    }
    await refresh();
  }

  // Options menu

  let menu: HTMLElement | null = null;

  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function openMenu(anchor: HTMLElement, id: string, kind: 'doc' | 'folder') {
    closeMenu();
    const items: [string, () => void][] = [
      ...(kind === 'folder'
        ? ([
            ['Nuevo documento aquí', () => api.newDoc(id)],
            ['Nueva carpeta aquí', () => api.newFolder(id)],
          ] as [string, () => void][])
        : []),
      ['Renombrar', () => rename(id, kind)],
      ['Eliminar', () => remove(id, kind)],
    ];
    menu = el('div', { className: 'menu', role: 'menu' });
    for (const [label, action] of items) {
      const b = el('button', { textContent: label, role: 'menuitem' });
      b.onclick = (e) => {
        e.stopPropagation();
        closeMenu();
        action();
      };
      menu.append(b);
    }
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.left = `${Math.min(r.left, innerWidth - 200)}px`;
    document.body.append(menu);
    (menu.firstElementChild as HTMLElement).focus();
  }

  document.addEventListener('click', (e) => menu && !menu.contains(e.target as Node) && closeMenu());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  // Tree interactions

  tree.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('.row');
    if (!item || editing) return;
    const { id, kind } = item.dataset as { id: string; kind: 'doc' | 'folder' };
    if (target.closest('.row-more')) {
      e.stopPropagation();
      openMenu(target.closest('.row-more')!, id, kind);
    } else if (kind === 'doc') {
      handlers.open(id);
    } else {
      collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      await storage.setSetting('collapsedFolderIds', [...collapsed]);
      render();
    }
  });

  tree.addEventListener('contextmenu', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (!item) return;
    e.preventDefault();
    openMenu(item, item.dataset.id!, item.dataset.kind as 'doc' | 'folder');
  });

  tree.addEventListener('dblclick', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (item) rename(item.dataset.id!, item.dataset.kind as 'doc' | 'folder');
  });

  // Drag and drop: onto a folder moves inside it, onto a doc moves next to it, onto empty space moves to the root

  tree.addEventListener('dragstart', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (!item || editing) return e.preventDefault();
    e.dataTransfer!.setData('text/plain', `${item.dataset.kind}:${item.dataset.id}`);
    e.dataTransfer!.effectAllowed = 'move';
  });

  function dropTarget(e: DragEvent): { folderId: string | null; node: HTMLElement } {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (!item) return { folderId: null, node: tree };
    if (item.dataset.kind === 'folder') return { folderId: item.dataset.id!, node: item };
    return { folderId: docs.find((d) => d.id === item.dataset.id)?.folderId ?? null, node: item };
  }

  const clearDrop = () => root.querySelectorAll('.drop').forEach((n) => n.classList.remove('drop'));

  tree.addEventListener('dragover', (e) => {
    e.preventDefault();
    clearDrop();
    const { folderId, node } = dropTarget(e);
    (folderId ? tree.querySelector(`.row[data-id="${folderId}"]`) ?? node : tree).classList.add('drop');
  });
  tree.addEventListener('dragleave', (e) => !tree.contains(e.relatedTarget as Node) && clearDrop());
  tree.addEventListener('drop', async (e) => {
    e.preventDefault();
    clearDrop();
    const [kind, id] = (e.dataTransfer?.getData('text/plain') ?? '').split(':');
    const { folderId } = dropTarget(e);
    if (kind === 'doc') await storage.updateDoc(id, { folderId });
    if (kind === 'folder' && id !== folderId) {
      try {
        await storage.updateFolder(id, { folderId });
      } catch {
        return; // can't move a folder into itself
      }
    }
    if (folderId && collapsed.delete(folderId)) await storage.setSetting('collapsedFolderIds', [...collapsed]);
    await refresh();
  });

  // Header controls

  search.addEventListener('input', () => {
    query = search.value.trim();
    render();
  });
  sort.addEventListener('change', async () => {
    sortOrder = sort.value as SortOrder;
    await storage.setSetting('sortOrder', sortOrder);
    render();
  });
  newDocButton.onclick = () => api.newDoc();
  newFolderButton.onclick = () => api.newFolder();
  hideButton.onclick = () => api.toggle();
  showButton.onclick = () => api.toggle();

  function applyVisibility() {
    document.body.classList.toggle('sidebar-hidden', !visible);
    root.inert = !visible;
    showButton.hidden = visible;
  }

  const api: Sidebar = {
    refresh,
    setActive(id) {
      activeId = id;
      tree.querySelectorAll('.row-doc').forEach((r) => r.classList.toggle('active', (r as HTMLElement).dataset.id === id));
    },
    async newDoc(folderId = null) {
      const doc = await storage.createDoc({ folderId });
      if (folderId) collapsed.delete(folderId);
      query = search.value = '';
      await refresh();
      handlers.open(doc.id);
    },
    async newFolder(parentId = null) {
      const folder = await storage.createFolder('Nueva carpeta', parentId);
      if (parentId) collapsed.delete(parentId);
      query = search.value = '';
      await refresh();
      rename(folder.id, 'folder');
    },
    toggle() {
      visible = !visible;
      storage.setSetting('sidebarVisible', visible);
      applyVisibility();
    },
  };

  applyVisibility();
  await refresh();
  return api;
}
