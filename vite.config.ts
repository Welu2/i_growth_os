import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [tailwindcss(), react(), VitePWA({
    registerType: 'prompt', includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
    manifest: { id: '/', name: 'Growth OS', short_name: 'Growth', description: 'A little progress, together.', theme_color: '#191813', background_color: '#191813', display: 'standalone', start_url: '/', scope: '/', icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ] },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//], cleanupOutdatedCaches: true, maximumFileSizeToCacheInBytes: 3_000_000 }
  })]
});
