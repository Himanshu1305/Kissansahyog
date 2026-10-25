// Batch 10D F — run e2e/home-10d.spec.js against STAGING (no web server, no teardown).
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '../../../../../e2e',
  testMatch: /home-10d\.spec\.js$/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'https://staging.kissansahyog.com', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
})
