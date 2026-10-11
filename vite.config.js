import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Phase 5 — registerType 'autoUpdate': a new service worker activates as soon
      // as it is available, so farmers receive the current app without a manual
      // update prompt.
      registerType: 'autoUpdate',
      // We register the SW ourselves through virtual:pwa-register/react (in
      // PwaPrompts), so disable the auto-injected registration to avoid double-reg.
      injectRegister: null,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'किसान सहयोग',
        short_name: 'Kissan Sahyog',
        description: 'ज़मीन, मशीन और मज़दूरों की जानकारी अपने आस-पास खोजें।',
        lang: 'hi',
        theme_color: '#24733F', // --ks-green
        background_color: '#FBFAF5', // --ks-bg
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
        // clientsClaim lets the first-installed SW control the already-open page, and
        // skipWaiting activates each update immediately for the auto-update flow.
        skipWaiting: true,
        clientsClaim: true,
        // SPA: serve the precached app shell for any navigation, incl. offline —
        // shows the app (not a blank white screen) when the network is down.
        navigateFallback: '/index.html',
        // CacheFirst (precache) for the static app shell ONLY.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Live data endpoints are NEVER treated as fresh cache: NetworkFirst so an
        // online farmer always gets live prices/weather/listings, and an offline one
        // gets the last-known values — always accompanied by the offline banner
        // (PwaPrompts) so stale data is never shown silently as current. Supabase
        // writes (RPC POSTs) are non-GET → Workbox never caches them (NetworkOnly).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /(^https:\/\/[^/]+\.supabase\.co)|(^https:\/\/api\.open-meteo\.com)|(^https:\/\/mandi-api\.onrender\.com)|(^https:\/\/api\.data\.gov\.in)/.test(url.href),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ks-live-data',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
