import { test, expect } from '@playwright/test'

// These run against the production preview build, where the service worker is active.
//
// NOTE (legacy-cleanup): the third legacy test here — "offline reload shows the app
// shell" — was REMOVED (merged), not rewritten. It is fully covered by the newer,
// passing e2e/phase10_location_pwa.spec.js "offline: banner shows and the shell stays
// (no blank screen)", which uses current selectors. Keeping a second offline test with
// stale Welcome-screen assertions would be redundant. The two tests below still pass
// as-is (manifest + SW registration).

test('manifest is served and installable', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const mf = await res.json()
  expect(mf.display).toBe('standalone')
  expect(mf.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
})

test('service worker registers and controls the page', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker?.ready.then(() => true))
  await page.reload() // second load is controlled by the active SW
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
  expect(controlled).toBeTruthy()
})
