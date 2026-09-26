// Phase 6 — permanent tests for the Sawaal grid, PWA banner (fresh-vs-standalone),
// the shared BackButton (real history vs direct-link fallback), and ticker centering.
import { test, expect } from '@playwright/test'

// Count how many cards sit in the first visual row (share the smallest top).
async function firstRowCount(page, testid) {
  return page.evaluate((tid) => {
    const els = [...document.querySelectorAll(`[data-testid="${tid}"]`)]
    if (!els.length) return 0
    const tops = els.map((e) => Math.round(e.getBoundingClientRect().top))
    const minTop = Math.min(...tops)
    return tops.filter((t) => Math.abs(t - minTop) <= 4).length
  }, testid)
}

test('/sawaal cards render as a grid: 3 columns at desktop, 1 at mobile', async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const dp = await desktop.newPage()
  await dp.goto('/sawaal')
  await dp.getByTestId('sawaal-card').first().waitFor({ timeout: 15000 })
  expect(await firstRowCount(dp, 'sawaal-card')).toBe(3)
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const mp = await mobile.newPage()
  await mp.goto('/sawaal')
  await mp.getByTestId('sawaal-card').first().waitFor({ timeout: 15000 })
  expect(await firstRowCount(mp, 'sawaal-card')).toBe(1)
  await mobile.close()
})

test('PWA banner shows for a fresh visitor (no synthetic event) and hides in standalone', async ({ browser }) => {
  // Fresh visitor — the banner must be visible WITHOUT dispatching beforeinstallprompt.
  const fresh = await browser.newContext()
  const fp = await fresh.newPage()
  await fp.goto('/')
  await expect(fp.getByTestId('pwa-install-strip')).toBeVisible({ timeout: 15000 })
  await fresh.close()

  // Standalone (installed) — never shown.
  const standalone = await browser.newContext()
  await standalone.addInitScript(() => {
    const orig = window.matchMedia.bind(window)
    window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false } } : orig(q))
  })
  const sp = await standalone.newPage()
  await sp.goto('/')
  await sp.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 })
  await expect(sp.getByTestId('pwa-install-strip')).toHaveCount(0)
  await standalone.close()
})

test('BackButton: direct-link opens fallback route; in-app history uses real history.back', async ({ browser }) => {
  // Direct link (fresh tab, no in-app history) → fallback to /yojana, not a dead no-op.
  const direct = await browser.newContext()
  const p1 = await direct.newPage()
  await p1.goto('/yojana/fal-podharopan-yojana')
  await p1.getByTestId('back-button').click()
  await expect(p1).toHaveURL(/\/yojana$/)
  await direct.close()

  // In-app navigation → BackButton calls real history.back (a subsequent forward returns to
  // the detail page, proving it was history.back, not a route push/replace).
  const nav = await browser.newContext()
  const p2 = await nav.newPage()
  await p2.goto('/yojana')
  await p2.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 })
  // Navigate into a scheme from within the app.
  await p2.getByRole('button', { name: /फल पौधरोपण|Fal Podharopan/ }).first().click()
  await expect(p2).toHaveURL(/\/yojana\/fal-podharopan-yojana$/)
  await p2.getByTestId('back-button').click()
  await expect(p2).toHaveURL(/\/yojana$/)
  await p2.goForward()
  await expect(p2).toHaveURL(/\/yojana\/fal-podharopan-yojana$/) // proves real history.back()
  await nav.close()
})

test('mandi ticker text is vertically centered in the strip (no top/bottom clip)', async ({ page }) => {
  await page.goto('/')
  await page.locator('[role=marquee] .ticker-content a, [role=marquee] .ticker-content span').first().waitFor({ timeout: 15000 })
  const geom = await page.evaluate(() => {
    const bar = document.querySelector('[role=marquee]')
    const item = document.querySelector('.ticker-content')?.firstElementChild
    if (!bar || !item) return null
    const br = bar.getBoundingClientRect(), ir = item.getBoundingClientRect()
    return { topGap: ir.top - br.top, botGap: (br.top + br.height) - (ir.top + ir.height) }
  })
  expect(geom).not.toBeNull()
  expect(geom.topGap).toBeGreaterThanOrEqual(0) // not clipped at top
  expect(geom.botGap).toBeGreaterThanOrEqual(0) // not clipped at bottom
  expect(Math.abs(geom.topGap - geom.botGap)).toBeLessThanOrEqual(2) // centered
})
