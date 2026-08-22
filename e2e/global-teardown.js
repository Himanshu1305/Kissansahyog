import { cleanupTestData } from './support.js'

// Remove all reserved-range test profiles/listings after the E2E run.
export default async function globalTeardown() {
  try {
    await cleanupTestData()
    console.log('[teardown] test data cleaned')
  } catch (err) {
    console.warn('[teardown] cleanup warning:', err.message)
  }
}
