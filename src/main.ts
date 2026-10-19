import { createEditor } from './editor';
import * as storage from './storage';
import './styles/main.css';

const SAVE_DELAY = 500;
const FRONT_MATTER = /^---\n[\s\S]*?\n---(\n|$)/;
const numberFormat = new Intl.NumberFormat('es');

const status = document.querySelector<HTMLElement>('#status')!;

let currentId: string | null = null;
let pending: string | null = null;
let timer: number | undefined;

function flush() {
  clearTimeout(timer);
  if (currentId && pending !== null) {
    storage.updateDoc(currentId, { content: pending });
    pending = null;
  }
}

function updateCount(content: string) {
  const body = content.replace(FRONT_MATTER, '');
  const words = body.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  status.textContent = `${numberFormat.format(words)} palabras · ${numberFormat.format(body.length)} caracteres`;
}

const editor = createEditor(document.querySelector('#editor')!, (content) => {
  pending = content;
  clearTimeout(timer);
  timer = window.setTimeout(flush, SAVE_DELAY);
  updateCount(content);
});

// Save before the window closes or goes to the background
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.hidden && flush());

async function start() {
  storage.requestPersistence();
  const { lastOpenDocId } = await storage.getSettings();
  // Until the sidebar exists (phase 3): reopen the last doc, else the most recent, else a new one
  const doc =
    (lastOpenDocId && (await storage.getDoc(lastOpenDocId))) ||
    (await storage.listDocs()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ||
    (await storage.createDoc());
  currentId = doc.id;
  await storage.setSetting('lastOpenDocId', doc.id);
  editor.load(doc.content);
  updateCount(doc.content);
  editor.view.focus();
}

start();

if (import.meta.env.DEV) {
  Object.assign(window, { storage, editor });
}
