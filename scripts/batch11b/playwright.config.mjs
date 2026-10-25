// The OTP spec owns and cleans up only data created by this run. Never invoke the shared global sweep.
import base from '../batch10f/playwright.base-url.config.mjs'
import { fileURLToPath } from 'node:url'
export default {
  ...base,
  globalTeardown: undefined,
  outputDir: fileURLToPath(new URL('../../test-results/batch11b', import.meta.url)),
}
