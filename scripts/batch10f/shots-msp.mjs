// Batch 10F Phase 3 — /msp evidence screenshots (read-only; visitor writes blocked).
//   node scripts/batch10f/shots-msp.mjs <baseURL> <outDir> <prefix>
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [base, out, prefix = 'phase3'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const WRITE = /\/rest\/v1\/rpc\/(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|app_)/
const browser = await chromium.launch()
async function ctxFor(w, lang, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, serviceWorkers: 'block', reducedMotion: 'reduce' })
  await ctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l); localStorage.setItem('ks_sections_v1', JSON.stringify({ 'msp:trend': 1 })) } catch { /* */ } }, lang)
  return ctx
}
async function trend(page, crop, days) {
  await page.goto(`${base}/msp/${crop}`, { waitUntil: 'load' })
  const sec = page.getByTestId('msp-trend')
  await page.waitForFunction(() => { const e = document.querySelector('[data-trend-tab="90"] [data-trend-range]'); return e && e.textContent.trim().length > 0 }, null, { timeout: 25000 })
  await sec.locator(`[data-trend-tab="${days}"]`).click()
  await page.waitForTimeout(400)
  return sec
}
try {
  for (const [w, lang] of [[360, 'hi'], [412, 'en']]) {
    const ctx = await ctxFor(w, lang, 760)
    const page = await ctx.newPage()
    await page.goto(`${base}/msp/gehun`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-section="snapshot"]').getBoundingClientRect().top + scrollY - 70))
    await page.screenshot({ path: `${out}/${prefix}-badge-snapshot-${lang}-${w}.png` })
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-section="today"]').getBoundingClientRect().top + scrollY - 70))
    await page.screenshot({ path: `${out}/${prefix}-badge-today-${lang}-${w}.png` })
    await ctx.close()
  }
  for (const [w, lang] of [[320, 'hi'], [412, 'hi'], [1280, 'en']]) {
    const ctx = await ctxFor(w, lang)
    const page = await ctx.newPage()
    for (const days of [7, 30, 90]) {
      const sec = await trend(page, 'gehun', days)
      await sec.locator('[data-trend-chart]').screenshot({ path: `${out}/${prefix}-chart-${days}d-${lang}-${w}.png` })
    }
    // tooltip on the lowest point (30 d)
    const sec = await trend(page, 'gehun', 30)
    const low = sec.locator('[data-trend-label][data-roles~="low"]').first()
    const d = await low.getAttribute('data-date')
    const bb = await sec.locator(`[data-trend-dot="${d}"]`).boundingBox()
    if (w >= 768) await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
    else await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2)
    await page.waitForTimeout(300)
    await sec.locator('[data-trend-chart]').screenshot({ path: `${out}/${prefix}-tooltip-30d-${lang}-${w}.png` })
    if (w === 412) {
      await sec.locator('details[data-section="trend-table"] summary').click()
      await page.waitForTimeout(300)
      await sec.screenshot({ path: `${out}/${prefix}-trend-table-${lang}-${w}.png` })
    }
    await ctx.close()
  }
  const ctx = await ctxFor(412, 'hi')
  const page = await ctx.newPage()
  const sec = await trend(page, 'makka', 30)
  await sec.screenshot({ path: `${out}/${prefix}-few-makka-hi-412.png` })
  await ctx.close()
} finally { await browser.close() }
console.log('done')
