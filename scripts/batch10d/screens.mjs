// Batch 10D Task E — screenshots of the homepage hero (each persona) and the field band.
// Usage: node scripts/batch10d/screens.mjs <baseURL> <outDir>
// Per width (360, 412, 768, 1024, 1440) and language (hi, en):
//   home-<w>-<lang>-first.png        the first screen as a visitor sees it (live hero, persona 1 playing)
//   home-<w>-<lang>-<persona>.png    hero + band, after tapping that persona's tab and letting it finish
//                                    (data-motion="ended": every element of the example drawn)
// Logged out, DPR 1, service workers blocked; the tab tap stops auto-rotation (as for a visitor).
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const [BASE = 'http://localhost:4173', OUT = 'screens'] = process.argv.slice(2)
const SIZES = [[360, 740], [412, 915], [768, 1024], [1024, 768], [1440, 900]]
const PERSONAS = ['rent', 'sell', 'mandi', 'weather', 'schemes']
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
try {
  for (const lang of ['hi', 'en']) {
    for (const [w, h] of SIZES) {
      const mobile = w < 768
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' })
      await ctx.addInitScript((l) => {
        try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ }
        window.__KS_GUIDE_SPEED = 8 // each persona finishes in about 1.4 s
      }, lang)
      const page = await ctx.newPage()
      await page.goto(BASE + '/', { waitUntil: 'load' })
      await page.waitForFunction(() => document.querySelector('[data-testid="home-live"]')?.dataset.live === '1', null, { timeout: 30_000 })
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(OUT, `home-${w}-${lang}-first.png`) })
      for (const id of PERSONAS) {
        await page.getByTestId(`home-live-tab-${id}`).click()
        await page.evaluate(() => document.querySelector('[data-testid="home-live-stage"]').scrollIntoView({ block: 'center' }))
        await page.waitForFunction((p) => { const d = document.querySelector('[data-testid="home-live"]').dataset; return d.persona === p && d.motion === 'ended' }, id, { timeout: 30_000 })
        await page.waitForTimeout(500) // last transitions
        await page.getByTestId('home-facts').scrollIntoViewIfNeeded()
        await page.waitForTimeout(1200) // count-up done
        const clip = await page.evaluate(() => {
          const a = document.querySelector('[data-testid="home-live"]').getBoundingClientRect()
          const b = document.querySelector('[data-testid="home-band"]').getBoundingClientRect()
          return { x: 0, y: a.top + scrollY, width: document.documentElement.clientWidth, height: b.bottom - a.top }
        })
        await page.screenshot({ path: path.join(OUT, `home-${w}-${lang}-${id}.png`), fullPage: true, clip })
      }
      await ctx.close()
      console.log('shot', lang, w)
    }
  }
} finally {
  await browser.close()
}
console.log('wrote', OUT)
