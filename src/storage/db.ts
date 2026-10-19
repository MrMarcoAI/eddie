import Dexie, { type EntityTable } from 'dexie';
import type { Doc, Folder } from './types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export const SCHEMA_VERSION = 1;

// Add new versions with .version(n).stores(...).upgrade(...); never edit old ones.
export const db = new Dexie('eddie') as Dexie & {
  docs: EntityTable<Doc, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

db.version(SCHEMA_VERSION).stores({
  docs: 'id, folderId, updatedAt',
  folders: 'id, folderId',
  settings: 'key',
});
