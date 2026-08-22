import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PWA plugin is added in Phase 8. Keeping the base config lean until then.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Route-level code splitting is driven by React.lazy in the app;
    // keep the manual chunks minimal so the vendor split stays cache-friendly.
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
