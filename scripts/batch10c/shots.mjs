// Batch 10C Task F — screenshots of every guide page and every entry point, 360 + 412 px, Hindi + English.
// Needs `npx vite preview --port 4173` on a fresh build. Nothing is written to staging: visitor
// writes are blocked; /post uses a FAKE local session and never leaves step 1.
// Usage: node scripts/batch10c/shots.mjs [baseURL]
// Output: docs/review/batch10c/evidence/screens/<name>-<width>-<lang>.png
import { chromium } from '@playwright/test'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = 'docs/review/batch10c/evidence/screens'
fs.mkdirSync(OUT, { recursive: true })
const FAKE_SESSION = { id: '00000000-0000-4000-8000-0000000000aa', full_name: 'डेमो जाँच', phone: '9000000000', village_town: 'नमूना' }
const SAVED_LOC = { lat: 24.045, lng: 78.33, label: 'Sagar', from: 'picked' }
const STEPS_MID = { register: 4, post: 7, find: 4 }

const browser = await chromium.launch()
const made = []
const errors = []

for (const lang of ['hi', 'en']) {
  for (const width of [360, 412]) {
    const ctx = await browser.newContext({ viewport: { width, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    // block writes to the backend (reads are fine)
    await ctx.route((u) => u.pathname.includes('/rest/v1/') || u.pathname.includes('/functions/v1/'), (route) => {
      const r = route.request()
      if (['GET', 'HEAD', 'OPTIONS'].includes(r.method()) || /\/rpc\/(get_|search_|list_|nearby|browse)/.test(r.url())) return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    })
    await ctx.addInitScript(([l, loc]) => {
      try {
        localStorage.setItem('ks_lang_v1', l)
        if (!localStorage.getItem('ks_location_v1')) localStorage.setItem('ks_location_v1', JSON.stringify(loc))
      } catch { /* ignore */ }
      window.__KS_GUIDE_SPEED = window.__KS_GUIDE_SPEED || 3
    }, [lang, SAVED_LOC])
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(`${lang} ${width} ${page.url()} ${e.message}`))
    const shot = async (name, opts = {}) => {
      const file = `${OUT}/${name}-${width}-${lang}.png`
      await page.screenshot({ path: file, ...opts })
      made.push(file)
    }
    const settle = (ms = 700) => page.waitForTimeout(ms)

    // ---- guide pages ----
    await page.goto(`${BASE}/guide`)
    await page.getByTestId('guide-hub').waitFor()
    await settle()
    await shot('guide-hub', { fullPage: true })
    await shot('guide-hub-top')

    for (const id of ['register', 'post', 'find']) {
      await page.goto(`${BASE}/guide/${id}`)
      const player = page.getByTestId('demo-player')
      await player.waitFor()
      await page.waitForFunction((n) => Number(document.querySelector('[data-testid="demo-player"]')?.getAttribute('data-step')) >= n, STEPS_MID[id], { timeout: 60_000 })
      await page.getByTestId('demo-screen').evaluate((el) => el.closest('.ksg-pcol').scrollIntoView({ block: 'start' }))
      await page.evaluate(() => window.scrollBy(0, -70)) // keep the caption below the sticky top bar
      await settle(400)
      await shot(`guide-${id}-midplay`)
      await page.evaluate(() => { window.__KS_GUIDE_SPEED = 40 })
      await page.getByTestId('demo-finish').waitFor({ timeout: 60_000 })
      await settle(500)
      await page.getByTestId('demo-finish').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await settle(300)
      await shot(`guide-${id}-finished`)
      await page.evaluate(() => window.scrollTo(0, 0))
      await settle(200)
      await shot(`guide-${id}-top`)
    }
    // tour: mid-play (weather tab, a day tapped), then all tabs → finished
    await page.evaluate(() => { window.__KS_GUIDE_SPEED = 3 })
    await page.goto(`${BASE}/guide/tour`)
    await page.getByTestId('tour-explorer').waitFor()
    await page.getByTestId('tour-tab-weather').click()
    await page.getByTestId('tour-day-3').click()
    await page.getByTestId('demo-screen').evaluate((el) => el.closest('.ksg-pcol').scrollIntoView({ block: 'start' }))
    await page.evaluate(() => window.scrollBy(0, -70))
    await settle(400)
    await shot('guide-tour-midplay')
    for (const k of ['schemes', 'questions', 'market', 'mandi']) await page.getByTestId(`tour-tab-${k}`).click()
    await page.getByTestId('demo-finish').waitFor()
    await page.getByTestId('demo-finish').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await settle(500)
    await shot('guide-tour-finished')
    await page.goto(`${BASE}/guide`)
    await page.getByTestId('guide-hub').waitFor()
    await settle()
    await shot('guide-hub-4of4', { fullPage: true })

    // ---- entry points (viewport-sized) ----
    await page.goto(`${BASE}/welcome`)
    await page.getByTestId('entry-welcome-guide').waitFor()
    await settle()
    await shot('entry-welcome')

    await page.goto(`${BASE}/`)
    await page.getByTestId('entry-home-guide').waitFor()
    await settle(1200)
    await shot('entry-home')
    await shot('entry-nav-home', { clip: { x: 0, y: 0, width, height: 140 } })

    await page.goto(`${BASE}/browse`)
    await page.getByTestId('help-browse').waitFor()
    await settle(1500)
    await shot('entry-browse')
    await shot('entry-nav-browse', { clip: { x: 0, y: 0, width, height: 140 } })

    await page.goto(`${BASE}/about`)
    await page.getByTestId('footer-guide').scrollIntoViewIfNeeded()
    await page.getByTestId('footer-guide').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await settle()
    await shot('entry-footer')

    await page.goto(`${BASE}/how-to-use`)
    await page.getByTestId('entry-howto-guide').waitFor()
    await settle()
    await shot('entry-howto')

    await page.goto(`${BASE}/signup`)
    await page.getByTestId('help-signup').waitFor()
    await page.locator('#full_name').fill(lang === 'hi' ? 'रामू परीक्षण' : 'Ramu Test')
    await page.locator('#phone').fill('9000012345')
    await settle()
    await shot('entry-signup')
    await page.getByTestId('help-signup').click()
    await page.getByTestId('guide-sheet').waitFor()
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="guide-sheet"] [data-testid="demo-player"]')?.getAttribute('data-step')) >= 2, null, { timeout: 60_000 })
    await settle(300)
    await shot('entry-signup-sheet')
    await page.getByTestId('guide-sheet-close').click()
    // closing pops the sheet's own history entry asynchronously; let it land before navigating
    await page.waitForFunction(() => !history.state?.ksGuideSheet)
    await settle(300)

    await page.goto(`${BASE}/login`)
    await page.getByTestId('help-login').waitFor()
    await settle()
    await shot('entry-login')

    await page.evaluate((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), FAKE_SESSION)
    await page.goto(`${BASE}/post`)
    await page.getByTestId('help-post').waitFor({ timeout: 20_000 })
    await page.getByTestId('help-post').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await settle()
    await shot('entry-post-step1')
    await page.evaluate(() => localStorage.removeItem('ks_session_v1'))

    await ctx.close()
    console.log(`done ${lang} ${width}`)
  }
}
await browser.close()
fs.writeFileSync(`${OUT}/_list.txt`, made.map((f) => f.split('/').pop()).join('\n') + '\n')
console.log(`${made.length} screenshots; page errors: ${errors.length}`)
for (const e of errors) console.log('  ' + e)
