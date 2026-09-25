// Phase 4 (0028) screenshots. Preview must be on :4173.  node scripts/shots_0028.mjs
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-0028'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)
const HYD = { latitude: 17.4665837, longitude: 78.3116609 }
const IP_INDORE = { city: 'Indore', region: 'MP', country: 'IN', latitude: 22.72, longitude: 75.86 }
const waitPins = (p) => p.waitForResponse((r) => r.url().includes('/rest/v1/pincodes'), { timeout: 10000 }).catch(() => {})

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
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam`); await waitPins(p)
      await p.getByTestId('gps-detect').click().catch(() => {})
      await p.getByTestId('location-label').filter({ hasText: /हैदराबाद|Hyderabad/ }).waitFor({ timeout: 15000 }).catch(() => {})
      await p.waitForTimeout(600); await slice(p, `mausam-gps-name-${vp}`); await p.close(); await ctx.close()
    }
    // 2) Pre-permission ordered prompt: GPS (precise) + IP city suggestion + manual pincode
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.route('**/geo', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(IP_INDORE) }))
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam`); await waitPins(p)
      await p.getByTestId('ip-suggest').waitFor({ timeout: 8000 }).catch(() => {})
      await p.waitForTimeout(400); await slice(p, `prompt-ordered-${vp}`); await p.close(); await ctx.close()
    }
    // 3) ?debug=1 overlay showing raw coords AND the resolved place name
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ['geolocation'], geolocation: HYD })
      const p = await ctx.newPage()
      await p.goto(`${BASE}/mausam?debug=1`); await waitPins(p)
      await p.getByTestId('gps-detect').click().catch(() => {})
      await p.getByTestId('geo-debug').waitFor({ timeout: 15000 }).catch(() => {})
      await p.waitForTimeout(500); await slice(p, `debug-${vp}`); await p.close(); await ctx.close()
    }
  }
  await browser.close()
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
