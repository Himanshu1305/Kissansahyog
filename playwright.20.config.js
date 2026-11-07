import { defineConfig, devices } from '@playwright/test'

// Batch 20 browser checks: the built app with a FAKE backend (tests/e2e20/mockBackend.mjs). No network, no database.
// Build once with the dummy settings, then run:
//   VITE_SUPABASE_URL=https://mock.supabase.test VITE_SUPABASE_ANON_KEY=mock npm run build
//   npx playwright test -c playwright.20.config.js
const PORT = 4180
export default defineConfig({
  testDir: './tests/e2e20',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  projects: [
    { name: 'phone360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop1280', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: { command: `npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 60_000 },
})
