// Batch 10E Phase 6 — run the 10E (and 10C/10D) specs against STAGING. Teardown cleans KSTEST data on staging.
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '../../../../../e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalTeardown: '../../../../../e2e/global-teardown.js',
  use: { baseURL: 'https://staging.kissansahyog.com', trace: 'off', viewport: { width: 390, height: 780 } },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
})
