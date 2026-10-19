// Batch 10F — screenshots + hero measurements, same script for the Phase 0 baseline and later phases
// (read-only; visitor writes are blocked).
//   node scripts/batch10f/shots.mjs <baseURL> <outDir> <prefix>
// Homepage hi at 320 / 360 / 412 / 1280 (full page), /msp/gehun hi at 412 and en at 1280 (full page).
// Prints one JSON line per shot. Homepage lines carry the hero measurements:
//   heroToSearch  px from the top of the hero to the search heading that follows the hero (+ the old
//                 10D band), i.e. how much the visitor scrolls past before the next section;
//   fold360       at 360x640: bottom of the h1, of both big buttons and of the demo button (px from
//                 the top of the page) — inside 640 = on the first screen.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [base, out, prefix = 'shot'] = process.argv.slice(2)
if (!base || !out) { console.error('usage: shots.mjs <baseURL> <outDir> <prefix>'); process.exit(2) }
mkdirSync(out, { recursive: true })
const WRITE = /\/rest\/v1\/rpc\/(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|app_)/

const shots = [
  { path: '/', w: 320, h: 640, lang: 'hi' },
  { path: '/', w: 360, h: 640, lang: 'hi' },
  { path: '/', w: 412, h: 915, lang: 'hi' },
  { path: '/', w: 1280, h: 800, lang: 'hi' },
  { path: '/msp/gehun', w: 412, h: 915, lang: 'hi' },
  { path: '/msp/gehun', w: 1280, h: 800, lang: 'en' },
]

async function measureHome(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('[data-testid="home-hero"]') || document.querySelector('[data-testid="home-live"]')
    const search = [...document.querySelectorAll('h2')].find((h) => /क्या खोज रहे हैं|What are you looking for/.test(h.textContent))
    const top = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null)
    const bottom = (el) => (el ? Math.round(el.getBoundingClientRect().bottom + window.scrollY) : null)
    const byText = (re) => [...document.querySelectorAll('a,button')].find((b) => re.test(b.textContent) && b.offsetParent)
    return {
      heroTop: top(hero),
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      heroToSearch: hero && search ? top(search) - top(hero) : null,
      h1Bottom: bottom(document.querySelector('h1')),
      needBottom: bottom(byText(/मुझे कुछ चाहिए|I need something/)),
      haveBottom: bottom(byText(/मेरे पास कुछ है|I have something/)),
      demoBottom: bottom(document.querySelector('[data-testid="home-hero-demo"]') || document.querySelector('[data-testid="home-live-demo"]')),
      pageHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
}

const browser = await chromium.launch()
try {
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, serviceWorkers: 'block', reducedMotion: 'reduce' })
    await ctx.route(WRITE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ } }, s.lang)
    const page = await ctx.newPage()
    await page.goto(`${base}${s.path}`, { waitUntil: 'load' })
    await page.waitForTimeout(3500)
    const name = `${prefix}-${s.path === '/' ? 'home' : 'msp-gehun'}-${s.lang}-${s.w}.png`
    const m = s.path === '/' ? await measureHome(page) : { pageHeight: await page.evaluate(() => document.documentElement.scrollHeight), overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) }
    await page.screenshot({ path: `${out}/${name}`, fullPage: true })
    console.log(JSON.stringify({ name, w: s.w, ...m }))
    await ctx.close()
  }
} finally { await browser.close() }
