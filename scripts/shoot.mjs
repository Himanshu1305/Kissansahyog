// Phase 7 screenshot self-review: full-page shots at desktop + mobile.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOOT_URL || 'http://localhost:4173'
mkdirSync('docs/review', { recursive: true })

const browser = await chromium.launch()
try {
  for (const [name, vp] of [
    ['home-desktop', { width: 1280, height: 800 }],
    ['home-mobile', { width: 375, height: 812 }],
  ]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2500) // let images + fonts settle
    // Report horizontal-scroll + a few computed sizes for the checklist.
    const metrics = await page.evaluate(() => {
      const gcs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null }
      return {
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        h1: gcs('h1', 'fontSize'),
        h2: gcs('h2', 'fontSize'),
      }
    })
    console.log(name, JSON.stringify(metrics))
    await page.screenshot({ path: `docs/review/${name}.png`, fullPage: true })
    await ctx.close()
  }
} finally {
  await browser.close()
}
console.log('done')
