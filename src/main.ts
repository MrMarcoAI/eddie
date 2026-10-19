import { createEditor } from './editor';
import { createSidebar } from './sidebar';
import * as storage from './storage';
import './styles/main.css';

const SAVE_DELAY = 500;
const FRONT_MATTER = /^---\n[\s\S]*?\n---(\n|$)/;
const numberFormat = new Intl.NumberFormat('es');

const editorPane = document.querySelector<HTMLElement>('#editor')!;
const status = document.querySelector<HTMLElement>('#status')!;

let currentId: string | null = null;
let pending: string | null = null;
let timer: number | undefined;

async function flush() {
  clearTimeout(timer);
  if (currentId && pending !== null) {
    const content = pending;
    pending = null;
    await storage.updateDoc(currentId, { content });
    await sidebar.refresh();
  }
}

function updateCount(content: string) {
  const body = content.replace(FRONT_MATTER, '');
  const words = body.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  status.textContent = `${numberFormat.format(words)} palabras · ${numberFormat.format(body.length)} caracteres`;
}

const editor = createEditor(editorPane, (content) => {
  pending = content;
  clearTimeout(timer);
  timer = window.setTimeout(flush, SAVE_DELAY);
  updateCount(content);
});

function showEditor(show: boolean) {
  editorPane.hidden = !show;
  status.hidden = !show;
}

async function open(id: string | null) {
  await flush();
  const doc = id ? await storage.getDoc(id) : undefined;
  currentId = doc?.id ?? null;
  await storage.setSetting('lastOpenDocId', currentId);
  sidebar.setActive(currentId);
  showEditor(!!doc);
  if (!doc) return;
  editor.load(doc.content);
  updateCount(doc.content);
  editor.view.focus();
}

async function mostRecentDocId(): Promise<string | null> {
  const docs = await storage.listDocs();
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id ?? null;
}

const sidebar = await createSidebar(
  document.querySelector('#sidebar')!,
  {
    open,
    async deleted(ids) {
      if (currentId && ids.includes(currentId)) {
        pending = null;
        currentId = null;
        await open(await mostRecentDocId());
      }
    },
  },
);

// Save before the window closes or goes to the background
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.hidden && flush());

storage.requestPersistence();
const { lastOpenDocId } = await storage.getSettings();
await open((lastOpenDocId && (await storage.getDoc(lastOpenDocId))?.id) || (await mostRecentDocId()));

if (import.meta.env.DEV) {
  Object.assign(window, { storage, editor, sidebar });
}
