import { test, expect } from '@playwright/test'

// These run against the production preview build, where the service worker is
// active (devOptions.enabled=false). Fresh context => no session => Welcome.

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

test('offline reload shows the app shell, not a blank screen', async ({ page, context }) => {
  await page.goto('/')
  // Wait for the SW to be active + precache populated, then take control.
  await page.waitForFunction(() => navigator.serviceWorker?.ready.then(() => true))
  await page.reload()
  await expect(page.getByText('किसान सहयोग')).toBeVisible()

  // Go fully offline and reload — cached shell must still render.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('किसान सहयोग')).toBeVisible()
  await expect(page.getByRole('button', { name: /नया खाता बनाएं|Create new account/ })).toBeVisible()
  await context.setOffline(false)
})
