export type ISODate = string;

export interface Doc {
  id: string;
  folderId: string | null;
  content: string;
  /** Manual title; when null the title is derived from the content. */
  customTitle: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: ISODate | null;
}

export interface Folder {
  id: string;
  /** Parent folder, or null at the root. */
  folderId: string | null;
  name: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: ISODate | null;
}

export type SortOrder = 'createdAt' | 'name' | 'updatedAt';

export interface Settings {
  sidebarVisible: boolean;
  sortOrder: SortOrder;
  lastOpenDocId: string | null;
  collapsedFolderIds: string[];
}

export interface Backup {
  app: 'eddie';
  schemaVersion: number;
  exportedAt: ISODate;
  docs: Doc[];
  folders: Folder[];
  settings: Settings;
}
