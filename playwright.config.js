import { defineConfig, devices } from '@playwright/test'

// E2E runs against a production build served by `vite preview`, so the tests
// exercise the same bundle users get. Test data uses the reserved phone prefix
// 9000000000–9000099999 and is cleaned up in e2e/global-teardown.js.
const PORT = 4173
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared remote DB; keep signup/login flows serial
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalTeardown: './e2e/global-teardown.js',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Emulate a modest mobile viewport (the real audience).
    viewport: { width: 390, height: 780 },
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
