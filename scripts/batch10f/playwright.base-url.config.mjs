// Batch 10F — the project Playwright setup pointed at any already-running site, without starting
// or reusing the 4173 preview. Used for the frozen Phase 0 copy and for staging:
//   KS_E2E_BASE=http://localhost:4196 npx playwright test --config scripts/batch10f/playwright.base-url.config.mjs e2e/home-10d.spec.js
// Same tests, same teardown (test data cleaned with the staging service key, as in the base config).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import base from '../../playwright.config.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const baseURL = process.env.KS_E2E_BASE
if (!baseURL) throw new Error('KS_E2E_BASE is required (e.g. http://localhost:4196)')

const { webServer: _ws, ...rest } = base
export default {
  ...rest,
  testDir: process.env.KS_E2E_DIR ? path.resolve(ROOT, process.env.KS_E2E_DIR) : path.join(ROOT, 'e2e'),
  globalTeardown: path.join(ROOT, 'e2e', 'global-teardown.js'),
  use: { ...rest.use, baseURL },
}
