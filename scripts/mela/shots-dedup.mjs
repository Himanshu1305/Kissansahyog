// One-off screenshots for the dedup/state review (Phase 6). Not a permanent test.
// Needs vite preview on :4173. Run: node scripts/mela/shots-dedup.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-dedup'
mkdirSync(OUT, { recursive: true })
const sizes = { desktop: { width: 1280, height: 800 }, mobile: { width: 375, height: 812 } }
const browser = await chromium.launch()

for (const [name, vp] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/kisan-mela`, { waitUntil: 'networkidle' })
  await page.getByTestId('mela-card').first().waitFor({ timeout: 15000 })

  // 1) Filters/header — the state dropdown control (canonical names; no "MP").
  await page.screenshot({ path: `${OUT}/filters-${name}.png` })

  // 2) Filtered to Madhya Pradesh — all former-"MP" + "Madhya Pradesh" events together under one name.
  await page.getByTestId('mela-state-filter').selectOption('Madhya Pradesh')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/mp-filtered-${name}.png`, fullPage: true })
  await page.getByTestId('mela-state-filter').selectOption('')
  await page.waitForTimeout(200)

  // 3) The Pantnagar survivor — appears once, with the multi-source badge + combined sources.
  const pant = page.getByTestId('mela-card').filter({ hasText: '120' }).first() // survivor: "120वां अखिल भारतीय किसान मेला…"
  await pant.waitFor({ state: 'visible', timeout: 10000 })
  await pant.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const box = await pant.boundingBox()
  if (box) await page.screenshot({ path: `${OUT}/pantnagar-${name}.png`, clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.min(vp.width, box.width + 16), height: Math.min(vp.height, box.height + 16) } })
  else await pant.screenshot({ path: `${OUT}/pantnagar-${name}.png` })

  // 4) Full list — no visible duplicates.
  await page.screenshot({ path: `${OUT}/list-${name}.png`, fullPage: true })
  await ctx.close()
  console.log(`captured ${name}`)
}
await browser.close()
console.log('done')
