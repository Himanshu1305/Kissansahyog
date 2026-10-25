// Batch 10E — /msp trend tabs built from the REAL data window (item 6) on STAGING data
// (backfill 2026-06-20 → 2026-10-17). Run alone: npx playwright test e2e/msp-trend-10e.spec.js --workers=1
import { test, expect } from '@playwright/test'

test.setTimeout(60_000)
const textIf = async (loc) => ((await loc.count()) ? (await loc.first().innerText()).replace(/\s+/g, ' ').trim() : '')

async function openTrend(page, crop) {
  // Batch 10F: on phone-sized viewports the trend section starts collapsed; open it as a visitor who
  // opened it before would see it (remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('ks_sections_v1', JSON.stringify({ 'msp:trend': 1 })) } catch { /* ignore */ } })
  await page.goto(`/msp/${crop}`)
  const sec = page.locator('[data-testid="msp-trend"]')
  await expect(sec).toBeVisible({ timeout: 20_000 })
  // wait until the 90-day read has arrived (every tab gets its second line)
  await expect(sec.locator('[data-trend-tab="90"] [data-trend-range]')).not.toHaveText(/^\s*$/, { timeout: 20_000 })
  return sec
}

async function readTab(sec, d) {
  await sec.locator(`[data-trend-tab="${d}"]`).click()
  await expect(sec.locator(`[data-trend-tab="${d}"]`)).toHaveAttribute('aria-pressed', 'true')
  const range = (await sec.locator(`[data-trend-tab="${d}"] [data-trend-range]`).innerText()).trim()
  const points = await sec.locator('[data-trend-dot]').count() // Batch 10F chart
  const axis = (await sec.locator('[data-trend-tick]').evaluateAll((es) => es.map((e) => e.textContent).join(' '))).trim() // Batch 10F: SVG date ticks
  const note = await textIf(sec.locator('[data-trend-note]'))
  return { range, points, axis, note }
}

test('wheat: 7 / 30 / 90 show different real ranges and more points as the window grows', async ({ page }) => {
  const sec = await openTrend(page, 'gehun')
  const r = {}
  for (const d of [7, 30, 90]) r[d] = await readTab(sec, d)
  console.log('gehun', JSON.stringify(r))
  expect(new Set([r[7].range, r[30].range, r[90].range]).size).toBe(3)
  expect(r[7].points).toBeGreaterThan(0)
  expect(r[30].points).toBeGreaterThanOrEqual(r[7].points)
  expect(r[90].points).toBeGreaterThan(r[30].points)
  // x-axis ends show the window's first and last date; the trend sentence carries the range
  for (const d of [7, 30, 90]) expect(r[d].axis.length).toBeGreaterThan(0)
  await sec.locator('[data-trend-tab="90"]').click()
  await expect(sec.getByText(`(${r[90].range})`).first()).toBeVisible()
})

test('paddy (thin crop): honest "N दिन का भाव" note, never the full period', async ({ page }) => {
  const sec = await openTrend(page, 'dhan')
  const r90 = await readTab(sec, 90)
  console.log('dhan 90', JSON.stringify(r90))
  expect(r90.points).toBeGreaterThan(0)
  expect(r90.points).toBeLessThan(90)
  expect(r90.note).toContain(`${r90.points} दिन का भाव उपलब्ध`)
  const r30 = await readTab(sec, 30)
  const r7 = await readTab(sec, 7)
  console.log('dhan 30/7', JSON.stringify({ r30, r7 }))
  expect(r30.points).toBeLessThanOrEqual(r90.points)
  expect(r7.points).toBeLessThanOrEqual(r30.points)
})

test('320 px: tabs fit, no horizontal overflow, tap targets ≥ 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  const sec = await openTrend(page, 'gehun')
  await sec.locator('[data-trend-tab="90"]').click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  for (const d of [7, 30, 90]) {
    const b = await sec.locator(`[data-trend-tab="${d}"]`).boundingBox()
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(320)
  }
})

test('mandi search lists markets late in the alphabet (list is no longer cut at 1,000 rows)', async ({ page }) => {
  await page.goto('/msp/gehun')
  const box = page.getByTestId('mandi-search')
  await expect(box).toBeVisible({ timeout: 20_000 })
  for (const q of ['Tikamgarh', 'Sagar']) {
    await box.fill(q)
    await expect(page.getByRole('button', { name: new RegExp(q) }).first()).toBeVisible({ timeout: 15_000 })
  }
})
