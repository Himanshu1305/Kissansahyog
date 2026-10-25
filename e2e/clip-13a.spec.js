// Batch 13A — desktop home: left edge of the greeting line and the green strip (screenshots + edge check).
import { test } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
const DIR = process.env.CLIP_DIR || 'docs/review/batch13a/evidence/screens'
for (const w of [1366, 1536, 1725, 1920]) {
  test(`home ${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' })
    await blockVisitorWrites(ctx)
    await ctx.addInitScript(() => { try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* */ } })
    const page = await ctx.newPage()
    await page.goto('/')
    await page.waitForTimeout(1500)
    const info = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="home-open-strip"]')
      const h = s && s.querySelector('h2')
      const r = (e) => e && (({ left, right, width }) => ({ left: Math.round(left), right: Math.round(right), width: Math.round(width) }))(e.getBoundingClientRect())
      return { strip: r(s), heading: r(h), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    })
    console.log(w, JSON.stringify(info))
    await page.screenshot({ path: `${DIR}/home-${w}.png` })
    await ctx.close()
  })
}
