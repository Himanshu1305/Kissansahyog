// Batch 7L-1 Stage B — the same Playwright setup WITHOUT the global teardown (which deletes
// test profiles with the service-role key). For specs that only look at public pages and must
// not write to the shared database:
//   npx playwright test --config playwright.nowrite.config.js e2e/phase10_location_pwa.spec.js
import base from './playwright.config.js'

const { globalTeardown: _teardown, ...rest } = base
export default rest
