import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const BG = '#151515';

// Served from GitHub Pages at /eddie/
export default defineConfig({
  base: '/eddie/',
  plugins: [
    VitePWA({
      // No skipWaiting: a new version waits and takes over the next time eddie opens,
      // never while a document is being written.
      registerType: 'prompt',
      injectRegister: 'script-defer',
      manifest: {
        name: 'eddie',
        short_name: 'eddie',
        description: 'Editor de Markdown personal, minimalista y oscuro.',
        lang: 'es',
        start_url: '/eddie/',
        scope: '/eddie/',
        display: 'standalone',
        background_color: BG,
        theme_color: BG,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything, including Mermaid and code languages, so export works offline
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    // Mermaid's lazily loaded chunks are large by nature
    chunkSizeWarningLimit: 1600,
  },
});
