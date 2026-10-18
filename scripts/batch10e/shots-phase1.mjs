// Batch 10E Phase 1 — evidence screenshots + computed-style checks (read-only; visitor writes blocked).
//   node scripts/batch10e/shots-phase1.mjs <baseURL> <outDir>
// Home category tiles at 1280 (normal / hover / keyboard focus), and the guide demo finish card
// (hi + en) with the सीताराम 🙏 line. Prints a JSON summary of the checks.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:4173', out = 'docs/review/batch10e/evidence/screens'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const WRITE = /\/rest\/v1\/rpc\/(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|app_)/
const summary = {}
const browser = await chromium.launch()
try {
  // ---- home tiles, desktop (fine pointer → hover exists) ----
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })
  await ctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  await ctx.addInitScript(() => { try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* */ } })
  const page = await ctx.newPage()
  await page.goto(base + '/', { waitUntil: 'load' })
  const grid = page.getByTestId('home-cat-grid')
  await grid.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  const tiles = grid.locator(':scope > *')
  summary.tiles = await tiles.evaluateAll((els) => els.map((e) => ({ tag: e.tagName, href: e.getAttribute('href'), cursor: getComputedStyle(e).cursor, h: Math.round(e.getBoundingClientRect().height) })))
  summary.hoverMedia = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)
  const box = await grid.boundingBox()
  const clip = { x: 0, y: Math.max(0, box.y - 60), width: 1280, height: Math.min(900, box.height + 90) }
  await page.screenshot({ path: `${out}/phase1-home-tiles-normal-1280.png`, clip })
  const first = tiles.nth(1)
  await first.hover()
  await page.waitForTimeout(400)
  summary.hover = await first.evaluate((e) => ({ transform: getComputedStyle(e).transform, boxShadow: getComputedStyle(e).boxShadow, cursor: getComputedStyle(e).cursor }))
  await page.screenshot({ path: `${out}/phase1-home-tiles-hover-1280.png`, clip })
  await page.mouse.move(5, 5)
  await tiles.nth(2).focus()
  await page.keyboard.press('Tab') // move focus by keyboard → :focus-visible
  await page.waitForTimeout(400)
  summary.focus = await page.evaluate(() => { const e = document.activeElement; return { href: e.getAttribute('href'), focusVisible: e.matches(':focus-visible'), outline: getComputedStyle(e).outlineStyle, boxShadow: getComputedStyle(e).boxShadow } })
  await page.screenshot({ path: `${out}/phase1-home-tiles-focus-1280.png`, clip })
  await ctx.close()

  // ---- reduced motion: glow kept, no lift ----
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await rctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  const rp = await rctx.newPage()
  await rp.goto(base + '/', { waitUntil: 'load' })
  const rt = rp.getByTestId('home-cat-grid').locator(':scope > *').nth(1)
  await rt.scrollIntoViewIfNeeded(); await rt.hover(); await rp.waitForTimeout(300)
  summary.reducedMotionHover = await rt.evaluate((e) => ({ transform: getComputedStyle(e).transform, transition: getComputedStyle(e).transitionDuration, glow: getComputedStyle(e).boxShadow !== 'none' }))
  await rctx.close()

  // ---- touch phone: no hover rule; tiles are still links ----
  const mctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await mctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  const mp = await mctx.newPage()
  await mp.goto(base + '/', { waitUntil: 'load' })
  summary.mobile = await mp.evaluate(() => ({ hoverMedia: matchMedia('(hover: hover) and (pointer: fine)').matches, hScroll: document.documentElement.scrollWidth > innerWidth, links: document.querySelectorAll('[data-testid="home-cat-grid"] > a[href]').length }))
  await mctx.close()

  // ---- demo finish card hi + en ----
  for (const lang of ['hi', 'en']) {
    const c = await browser.newContext({ viewport: { width: 412, height: 860 }, serviceWorkers: 'block' })
    await c.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    await c.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ } window.__KS_GUIDE_SPEED = 40 }, lang)
    const p = await c.newPage()
    await p.goto(base + '/guide/post')
    await p.getByTestId('demo-player').waitFor()
    await p.waitForSelector('[data-testid="demo-player"][data-state="finished"]', { timeout: 60_000 })
    const fin = p.getByTestId('demo-finish')
    await fin.scrollIntoViewIfNeeded()
    await p.waitForTimeout(800)
    summary[`finish_${lang}`] = await fin.innerText()
    await p.screenshot({ path: `${out}/phase1-demo-finish-${lang}.png` })
    await c.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(summary, null, 1))
