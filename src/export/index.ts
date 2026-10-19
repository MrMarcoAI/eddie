import * as storage from '../storage';
import type { Doc } from '../storage';
import { renderHtml } from './html';

export type ExportFormat = 'md' | 'html' | 'pdf';

// File System Access API (Chrome); not yet in TypeScript's DOM types
declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  }
}

export function kebabCase(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sin-titulo'
  );
}

/** Asks where to save (Chrome) or falls back to a regular download. */
async function saveFile(name: string, description: string, mime: string, content: string): Promise<void> {
  if (window.showSaveFilePicker) {
    let handle: FileSystemFileHandle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description, accept: { [mime]: [name.slice(name.lastIndexOf('.'))] } }],
      });
    } catch {
      return; // cancelled
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Prints a light version of the document through Chrome's dialog ("Save as PDF"). */
async function printPdf(content: string, title: string): Promise<void> {
  const frame = Object.assign(document.createElement('iframe'), {
    srcdoc: await renderHtml(content, title, 'light'),
    ariaHidden: 'true',
  });
  // Off-screen but full size: Chrome won't print a zero-size or hidden frame
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0';
  await new Promise((resolve) => {
    frame.onload = resolve;
    document.body.append(frame);
  });
  const win = frame.contentWindow!;
  // Chrome names the PDF after the page title
  const previous = document.title;
  document.title = kebabCase(title);
  // print() doesn't block for frames, so clean up only once the dialog closes
  win.addEventListener(
    'afterprint',
    () => {
      document.title = previous;
      frame.remove();
    },
    { once: true },
  );
  win.focus();
  win.print();
}

export async function exportDoc(doc: Doc, format: ExportFormat): Promise<void> {
  const title = storage.deriveTitle(doc);
  const name = kebabCase(title);
  if (format === 'md') return saveFile(`${name}.md`, 'Markdown', 'text/markdown', doc.content);
  if (format === 'html') {
    return saveFile(`${name}.html`, 'HTML', 'text/html', await renderHtml(doc.content, title, 'dark'));
  }
  return printPdf(doc.content, title);
}

export async function exportBackupFile(): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const data = JSON.stringify(await storage.exportBackup(), null, 2);
  return saveFile(`eddie-respaldo-${date}.json`, 'Respaldo de eddie', 'application/json', data);
}

/** Lets the user pick a backup file and merges it. Resolves true if something was imported. */
export function importBackupFile(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.oncancel = () => resolve(false);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(false);
      try {
        await storage.importBackup(JSON.parse(await file.text()));
        resolve(true);
      } catch {
        alert('El archivo no es un respaldo válido de eddie.');
        resolve(false);
      }
    };
    input.click();
  });
}
