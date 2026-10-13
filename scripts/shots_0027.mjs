// Phase 4 (0027) screenshots. Preview must be on :4173.  node scripts/shots_0027.mjs
// Batch 7L-1: rewritten for the shared location flow (no pincode, no out-of-area gate, no IP
// guess, no ?debug=1 overlay). SHOTS_BASE / SHOTS_OUT override the server and the output folder.
// Page visits here do not write visitor rows to the database (blockVisitorWrites).
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { blockVisitorWrites } from '../e2e/support.js'

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173'
const OUT = process.env.SHOTS_OUT || 'docs/review/shots-0027'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)
const HYD = { latitude: 17.385, longitude: 78.487 }
const LONDON = { latitude: 51.5074, longitude: -0.1278 }

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
    // --- Weather works globally (fresh geo context per page) ---
    for (const [geo, path, name, waitSel] of [
      [HYD, '/mausam', `mausam-hyd-${vp}`, 'text=/\\d+°/'],
      [LONDON, '/mausam', `mausam-london-${vp}`, 'text=/\\d+°/'],
      [HYD, '/msp', `msp-hyd-oos-${vp}`, '[data-testid=location-banner][data-source=device]'],
    ]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ['geolocation'], geolocation: geo })
      await blockVisitorWrites(ctx)
      const p = await ctx.newPage()
      await p.goto(`${BASE}${path}`)
      await p.locator('[data-testid=location-banner][data-source=device]').waitFor({ timeout: 20000 })
      await p.locator(waitSel).first().waitFor({ timeout: 15000 })
      await p.waitForTimeout(700); await slice(p, name); await p.close(); await ctx.close()
    }

    // --- Homepage आपके आसपास for a far location (Hyderabad): no out-of-service message now ---
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ['geolocation'], geolocation: HYD })
      await blockVisitorWrites(ctx)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/`)
      await p.locator('[data-testid=location-banner][data-source=device]').first().waitFor({ timeout: 20000 })
      await p.waitForTimeout(600); await slice(p, `home-hyd-oos-${vp}`); await p.close(); await ctx.close()
    }

    // --- मंडी तुलना: 5 mandis (none with wheat) → 6th blocked + wheat-row cross-mandi hint ---
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await blockVisitorWrites(ctx)
      await ctx.addInitScript(() => localStorage.setItem('ks_location_v1', JSON.stringify({ lat: 24.0436, lng: 78.3314, label: 'खुरई', from: 'picked' })))
      const p = await ctx.newPage()
      await p.goto(`${BASE}/msp/gehun`); await p.waitForTimeout(1200)
      await p.getByTestId('view-compare').click()
      await p.getByTestId('mandi-compare').locator('table').waitFor({ timeout: 8000 }).catch(() => {})
      for (const m of ['Alirajpur APMC', 'Badwaha APMC', 'Bhikangaon APMC', 'Bina APMC', 'Gadakota APMC']) {
        await p.getByTestId('compare-chip').filter({ hasText: m }).first().click().catch(() => {})
      }
      await p.getByTestId('compare-chip').filter({ hasText: 'Gadarwada' }).first().click().catch(() => {}) // 6th → blocked
      await p.getByTestId('compare-max-warn').waitFor({ timeout: 5000 }).catch(() => {})
      await p.waitForTimeout(500); await slice(p, `compare5-${vp}`)
      // open a wheat-row cross-mandi hint popover for the "निकटतम भाव" shot
      await p.getByTestId('cross-mandi-hint').first().locator('button').click({ timeout: 4000 }).catch(() => {})
      await p.waitForTimeout(400); await slice(p, `cross-hint-${vp}`)
      await p.close(); await ctx.close()
    }
  }
  await browser.close()
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
