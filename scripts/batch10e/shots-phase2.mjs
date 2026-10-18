// Batch 10E Phase 2D — evidence screenshots of the /msp trend tabs with real date ranges
// (read-only; visitor writes blocked).   node scripts/batch10e/shots-phase2.mjs <baseURL> <outDir>
// 90-day tab for wheat at 360 hi, 320 hi, 1280 en; the thin crop (paddy) 90-day at 360 hi.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:4173', out = 'docs/review/batch10e/evidence/screens'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const WRITE = /\/rest\/v1\/rpc\/(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|app_)/
const shots = [
  { crop: 'gehun', w: 360, lang: 'hi', name: 'phase2-msp-gehun-90d-360-hi.png' },
  { crop: 'gehun', w: 320, lang: 'hi', name: 'phase2-msp-gehun-90d-320-hi.png' },
  { crop: 'gehun', w: 1280, lang: 'en', name: 'phase2-msp-gehun-90d-1280-en.png' },
  { crop: 'dhan', w: 360, lang: 'hi', name: 'phase2-msp-dhan-90d-360-hi-thin.png' },
]
const browser = await chromium.launch()
try {
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: 900 }, serviceWorkers: 'block' })
    await ctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ } }, s.lang)
    const page = await ctx.newPage()
    await page.goto(`${base}/msp/${s.crop}`, { waitUntil: 'load' })
    const sec = page.getByTestId('msp-trend')
    await sec.waitFor({ timeout: 20000 })
    await page.waitForFunction(() => { const e = document.querySelector('[data-trend-tab="90"] [data-trend-range]'); return e && e.textContent.trim().length > 0 }, null, { timeout: 20000 })
    await sec.locator('[data-trend-tab="90"]').click()
    await page.waitForTimeout(400)
    await sec.scrollIntoViewIfNeeded()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await sec.screenshot({ path: `${out}/${s.name}` })
    console.log(JSON.stringify({ ...s, overflow, tabs: await sec.locator('[data-trend-tab]').allInnerTexts() }))
    await ctx.close()
  }
} finally { await browser.close() }
