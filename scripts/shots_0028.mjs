// Phase 4 (0028) screenshots. Preview must be on :4173.  node scripts/shots_0028.mjs
// Batch 7L-1: rewritten for the shared location flow (no pincode, no out-of-area gate, no IP
// guess, no ?debug=1 overlay). SHOTS_BASE / SHOTS_OUT override the server and the output folder.
// Page visits here do not write visitor rows to the database (blockVisitorWrites).
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { blockVisitorWrites } from '../e2e/support.js'

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173'
const OUT = process.env.SHOTS_OUT || 'docs/review/shots-0028'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)
const HYD = { latitude: 17.4665837, longitude: 78.3116609 }

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
    // 1) GPS granted → real place name (Hyderabad), not coordinates
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ['geolocation'], geolocation: HYD })
      await blockVisitorWrites(ctx)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam`)
      await p.getByTestId('location-banner').filter({ hasText: /हैदराबाद|Hyderabad/ }).waitFor({ timeout: 20000 })
      await p.waitForTimeout(600); await slice(p, `mausam-gps-name-${vp}`); await p.close(); await ctx.close()
    }
    // 2) Pre-permission card (shown before any browser prompt): Share my location / Not now
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await blockVisitorWrites(ctx)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam`)
      await p.getByTestId('location-prompt').waitFor({ timeout: 8000 })
      await p.waitForTimeout(400); await slice(p, `prompt-ordered-${vp}`); await p.close(); await ctx.close()
    }
    // 3) "Not now" → text box → district → town picker (replaces the removed ?debug=1 overlay shot)
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await blockVisitorWrites(ctx)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam`)
      await p.getByTestId('location-not-now').click()
      await p.getByTestId('location-open-picker').click()
      await p.getByTestId('location-district-Sagar').click()
      await p.getByTestId('location-towns').waitFor({ timeout: 8000 })
      await p.waitForTimeout(400); await slice(p, `picker-${vp}`); await p.close(); await ctx.close()
    }
  }
  await browser.close()
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
