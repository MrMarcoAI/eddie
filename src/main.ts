import * as storage from './storage';

// Phase 1 placeholder: the editor and sidebar arrive in later phases.
storage.requestPersistence();

if (import.meta.env.DEV) {
  (window as unknown as { storage: typeof storage }).storage = storage;
}

document.querySelector('#app')!.textContent = 'eddie';
