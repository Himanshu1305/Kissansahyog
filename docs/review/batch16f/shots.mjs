// Screenshots of the hero price tile (preview server on :4173). Run: node --env-file=.env docs/review/batch16f/shots.mjs
import { chromium } from '@playwright/test'
const out = new URL('./evidence/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const b = await chromium.launch()
for (const lang of ['hi', 'en']) for (const w of [320, 360, 1366]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } })
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
  const p = await ctx.newPage()
  await p.goto('http://localhost:4173/'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(2000)
  const cards = p.getByTestId('home-hero-cards')
  const clipped = await cards.evaluate((el) => [...el.querySelectorAll('*')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible').length + (el.scrollWidth > el.clientWidth + 1 ? 1 : 0))
  const pageOverflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  console.log(lang, w, 'text:', (await cards.innerText()).replace(/\s+/g, ' ').slice(0, 130), '| clipped:', clipped, 'pageOverflow:', pageOverflow)
  await cards.screenshot({ path: `${out}tile-${lang}-${w}.png` })
  await ctx.close()
}
await b.close()
