import { db, SCHEMA_VERSION } from './db';
import type { Backup, Doc, Folder, Settings } from './types';

export type { Backup, Doc, Folder, Settings, SortOrder } from './types';

const now = () => new Date().toISOString();
const alive = <T extends { deletedAt: string | null }>(item: T | undefined) =>
  item && !item.deletedAt ? item : undefined;

const DEFAULT_SETTINGS: Settings = {
  sidebarVisible: true,
  sortOrder: 'updatedAt',
  lastOpenDocId: null,
};

/** Asks Chrome not to evict IndexedDB under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false;
}

// Docs

export async function listDocs(): Promise<Doc[]> {
  return db.docs.filter((d) => !d.deletedAt).toArray();
}

export async function getDoc(id: string): Promise<Doc | undefined> {
  return alive(await db.docs.get(id));
}

export async function createDoc(
  init: { folderId?: string | null; content?: string } = {},
): Promise<Doc> {
  const t = now();
  const doc: Doc = {
    id: crypto.randomUUID(),
    folderId: init.folderId ?? null,
    content: init.content ?? '',
    customTitle: null,
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
  };
  await db.docs.add(doc);
  return doc;
}

export async function updateDoc(
  id: string,
  patch: Partial<Pick<Doc, 'content' | 'customTitle' | 'folderId'>>,
): Promise<void> {
  await db.docs.update(id, { ...patch, updatedAt: now() });
}

export async function deleteDoc(id: string): Promise<void> {
  const t = now();
  await db.docs.update(id, { deletedAt: t, updatedAt: t });
}

// Folders

export async function listFolders(): Promise<Folder[]> {
  return db.folders.filter((f) => !f.deletedAt).toArray();
}

export async function createFolder(name: string, folderId: string | null = null): Promise<Folder> {
  const t = now();
  const folder: Folder = {
    id: crypto.randomUUID(),
    folderId,
    name,
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
  };
  await db.folders.add(folder);
  return folder;
}

export async function updateFolder(
  id: string,
  patch: Partial<Pick<Folder, 'name' | 'folderId'>>,
): Promise<void> {
  if (patch.folderId !== undefined && (await descendantFolderIds(id)).has(patch.folderId ?? '')) {
    throw new Error('A folder cannot be moved into itself or its subfolders');
  }
  await db.folders.update(id, { ...patch, updatedAt: now() });
}

/** Soft-deletes the folder, its subfolders and every doc inside them. */
export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.docs, async () => {
    const ids = [...(await descendantFolderIds(id))];
    const t = now();
    const gone = { deletedAt: t, updatedAt: t };
    await db.folders.where('id').anyOf(ids).filter((f) => !f.deletedAt).modify(gone);
    await db.docs.where('folderId').anyOf(ids).filter((d) => !d.deletedAt).modify(gone);
  });
}

/** The folder itself plus all live folders nested under it. */
async function descendantFolderIds(id: string): Promise<Set<string>> {
  const folders = await listFolders();
  const ids = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of folders) {
      if (f.folderId && ids.has(f.folderId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

// Settings

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

// Titles

const FRONT_MATTER = /^---\n[\s\S]*?\n---(\n|$)/;

export function deriveTitle(doc: Pick<Doc, 'content' | 'customTitle'>): string {
  if (doc.customTitle?.trim()) return doc.customTitle.trim();
  const body = doc.content.replace(FRONT_MATTER, '');
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const firstLine = body.split('\n').find((l) => l.trim());
  return firstLine ? firstLine.replace(/^#{1,6}\s+/, '').trim() : 'Sin título';
}

// Backup (includes soft-deleted items so deletions survive a future sync)

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'eddie',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now(),
    docs: await db.docs.toArray(),
    folders: await db.folders.toArray(),
    settings: await getSettings(),
  };
}

/** Merges a backup into the database; on conflict the most recently updated item wins. */
export async function importBackup(data: unknown): Promise<void> {
  const backup = data as Backup;
  if (backup?.app !== 'eddie' || !Array.isArray(backup.docs) || !Array.isArray(backup.folders)) {
    throw new Error('Invalid eddie backup');
  }
  if (backup.schemaVersion > SCHEMA_VERSION) {
    throw new Error('Backup comes from a newer version of eddie');
  }
  await db.transaction('rw', db.docs, db.folders, db.settings, async () => {
    for (const [table, items] of [
      [db.docs, backup.docs],
      [db.folders, backup.folders],
    ] as const) {
      const current = await table.bulkGet(items.map((i) => i.id));
      const newer = items.filter((item, i) => !current[i] || current[i]!.updatedAt < item.updatedAt);
      await (table as typeof db.docs).bulkPut(newer as Doc[]);
    }
    if (backup.settings) {
      await db.settings.bulkPut(Object.entries(backup.settings).map(([key, value]) => ({ key, value })));
    }
  });
}
