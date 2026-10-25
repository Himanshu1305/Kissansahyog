// Batch 13A — runs specs against a FROZEN copy of dist (dist-13a-frozen) on port 4180, with no build step
// and no global teardown (public pages only, mocked listings).
//   cp -r dist dist-13a-frozen && npx playwright test --config playwright.13a.config.js e2e/browse-13a.spec.js
import base from './playwright.config.js'

const PORT = 4180
const { globalTeardown: _teardown, ...rest } = base
export default {
  ...rest,
  use: { ...rest.use, baseURL: `http://localhost:${PORT}` },
  webServer: { command: `npx vite preview --outDir dist-13a-frozen --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 60_000 },
}
