// Batch 10E 5.3 — homepage hero screenshots + layout measurements (before/after the CSS change).
// Usage: node scripts/batch10e/shots-5-3.mjs <tag> [baseURL]   (reads only; writes PNG + JSON)
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
const tag = process.argv[2] || 'shot'
const base = process.argv[3] || 'http://localhost:4173'
const out = 'docs/review/batch10e/evidence/screens'
mkdirSync(out, { recursive: true })
const widths = (process.env.WIDTHS || '320,360,412,768,1024,1280,1440').split(',').map(Number)
const shoot = new Set((process.env.SHOOT || '1024,1440').split(',').map(Number))
const browser = await chromium.launch()
const rows = []
for (const lang of ['hi', 'en']) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w >= 1024 ? 900 : 800 }, reducedMotion: 'reduce' })
    await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
    const page = await ctx.newPage()
    await page.goto(base + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const m = await page.evaluate(() => {
      const r = (el) => el ? el.getBoundingClientRect() : null
      const inner = document.querySelector('.khl-in')
      const more = document.querySelector('.khl-more')
      const tiles = [...document.querySelectorAll('.khl-more button, .khl-more a')].slice(0, 4).map((b) => ({ w: Math.round(r(b).width), h: Math.round(r(b).height) }))
      const nav = document.querySelector('header, nav')
      const navInner = nav ? [...nav.querySelectorAll('*')].find((e) => getComputedStyle(e).maxWidth !== 'none') : null
      return {
        docW: document.documentElement.scrollWidth, vw: innerWidth,
        heroInner: inner && Math.round(r(inner).width), more: more && Math.round(r(more).width),
        navInnerW: navInner && Math.round(r(navInner).width), navInnerMax: navInner && getComputedStyle(navInner).maxWidth,
        tiles,
      }
    })
    rows.push({ lang, w, ...m, hscroll: m.docW > m.vw })
    if (shoot.has(w)) await page.screenshot({ path: `${out}/phase5-${tag}-home-${lang}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 900 } })
    await ctx.close()
  }
}
await browser.close()
writeFileSync(`docs/review/batch10e/evidence/phase5/hero-measure-${tag}.json`, JSON.stringify(rows, null, 1))
for (const r of rows) console.log(r.lang, r.w, 'hscroll', r.hscroll, 'heroInner', r.heroInner, 'more', r.more, 'nav', r.navInnerW, r.navInnerMax, 'tiles', JSON.stringify(r.tiles))
