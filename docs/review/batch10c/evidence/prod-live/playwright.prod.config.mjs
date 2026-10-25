// Read-only run against production. No webServer, no globalTeardown (never touches the database).
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: /prod-live\.spec\.mjs$/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'https://kissansahyog.com', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
})
