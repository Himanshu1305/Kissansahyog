// Batch 10E 5.3 — element screenshots of the hero's info tiles (.khl-more) at desktop widths.
// Usage: node scripts/batch10e/shots-5-3-tiles.mjs <tag> [baseURL]
import { chromium } from '@playwright/test'
const tag = process.argv[2] || 'shot'
const base = process.argv[3] || 'http://localhost:4173'
const browser = await chromium.launch()
for (const lang of ['hi', 'en']) for (const w of [1024, 1152, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' })
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
  const page = await ctx.newPage()
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const el = page.locator('.khl-more').first()
  const box = await el.boundingBox()
  const tiles = await el.locator(':scope > div > div:first-child > *').evaluateAll((ts) => ts.map((t) => `${Math.round(t.getBoundingClientRect().width)}x${Math.round(t.getBoundingClientRect().height)}`))
  console.log(lang, w, 'more', Math.round(box.width), 'x', Math.round(box.height), 'tiles', tiles.join(' '), 'hscroll', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
  await el.screenshot({ path: `docs/review/batch10e/evidence/screens/phase5-${tag}-tiles-${lang}-${w}.png` })
  await ctx.close()
}
await browser.close()
