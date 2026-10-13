// Phase 4 (0026) screenshot capture. Run from project dir (playwright + sharp resolve):
//   node scripts/shots_0026.mjs   (preview must be running on :4173)
// Batch 7L-1: rewritten for the shared location flow (no pincode, no out-of-area gate, no IP
// guess, no ?debug=1 overlay). SHOTS_BASE / SHOTS_OUT override the server and the output folder.
// Page visits here do not write visitor rows to the database (blockVisitorWrites).
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { blockVisitorWrites } from '../e2e/support.js'

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173'
const OUT = process.env.SHOTS_OUT || 'docs/review/shots-0026'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)
const HYD = { latitude: 17.385, longitude: 78.487 }

async function slice(page, name) {
  const buf = await page.screenshot({ fullPage: true })
  const { width: W, height: H } = await sharp(buf).metadata()
  const TILE = 1100
  for (let top = 0, i = 0; top < H; top += TILE, i++) {
    const h = Math.min(TILE, H - top)
    await sharp(buf).extract({ left: 0, top, width: W, height: h }).resize({ width: Math.min(W, 1000) }).jpeg({ quality: 72 }).toFile(`${OUT}/${name}__${String(i).padStart(2, '0')}.jpg`)
  }
}

async function run() {
  const browser = await chromium.launch()
  for (const [vp, w, h] of [['d', 1280, 800], ['m', 375, 812]]) {
    // A far location (Hyderabad) — /mausam + /msp. There is no out-of-area message any more;
    // the page simply uses the device position. A FRESH context per page.
    for (const [path, name] of [['/mausam', `oob-mausam-${vp}`], ['/msp', `oob-msp-${vp}`]]) {
      const geo = await browser.newContext({ viewport: { width: w, height: h }, permissions: ['geolocation'], geolocation: HYD })
      await blockVisitorWrites(geo)
      const p = await geo.newPage()
      await p.goto(`${BASE}${path}`)
      // Permission is already granted, so the device position is read on load: wait for the banner.
      await p.locator('[data-testid=location-banner][data-source=device]').waitFor({ timeout: 20000 })
      await p.waitForTimeout(400); await slice(p, name); await p.close(); await geo.close()
    }

    // Comparison view states — /msp/gehun
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    await blockVisitorWrites(ctx)
    await ctx.addInitScript(() => localStorage.setItem('ks_location_v1', JSON.stringify({ lat: 24.0436, lng: 78.3314, label: 'खुरई', from: 'picked' })))
    const page = await ctx.newPage()
    await page.goto(`${BASE}/msp/gehun`); await page.waitForTimeout(1500)
    await page.getByTestId('view-compare').click()
    await page.getByTestId('mandi-compare').locator('table').waitFor({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(600); await slice(page, `compare-default-${vp}`)   // 0 selected → auto-nearest

    const chips = page.getByTestId('compare-chip')
    await chips.nth(0).click(); await page.waitForTimeout(500); await slice(page, `compare-1sel-${vp}`)
    await chips.nth(1).click(); await chips.nth(2).click()
    await page.getByTestId('compare-best').first().waitFor({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(500); await slice(page, `compare-3sel-${vp}`)      // 3 selected + best highlight
    await chips.nth(3).click(); await page.waitForTimeout(400); await slice(page, `compare-4th-${vp}`) // 4th blocked (warn)
    await page.close(); await ctx.close()
  }
  await browser.close()
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
