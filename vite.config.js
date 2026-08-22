import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate = versioned, self-healing SW. Workbox precaches content-hashed
      // assets; a new build changes the precache manifest, the new SW installs and
      // (with skipWaiting/clientsClaim) takes over on next load — no stale-cache
      // lockout, no manual "new version" prompt for these low-literacy users.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'किसान सहयोग · Kisan Sahyog',
        short_name: 'किसान सहयोग',
        description: 'ज़मीन, मशीन और मज़दूरों की जानकारी अपने आस-पास खोजें।',
        lang: 'hi',
        theme_color: '#15803d',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // SPA: serve the precached app shell for any navigation, incl. offline —
        // shows the app (not a blank white screen) when the network is down.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router')
            )
              return 'react-vendor'
          }
        },
      },
    },
  },
})
