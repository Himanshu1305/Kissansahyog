#!/usr/bin/env node
// Batch 7L-1 browser check — the location flow, in Hindi and English, at 390 and 1440 wide.
//   npm run build && node scripts/shots-batch7l1.mjs
// Serves dist/ itself. EVERY Supabase request is answered by a mock here (no database is
// read or written, so this runs before migrations 0057/0058 are applied), the device
// position is simulated, and the /geocode function is stubbed.
//
// The five steps:
//   1 granted            card → "Share my location" → device position → banner
//   2 refused + saved    saved place on this device → refused → still the saved place
//   3 refused + typed    refused → type a village that matches → banner
//   4 typed, no match    "Did you mean…?" with the closest spellings
//   5 picker             district (6 choices) → town
// plus: no pincode box on home / weather / browse, nothing location-based before a location
// is set, and the nearest mandi follows the location.
// Screenshots + browser-check.json go to docs/review/batch7l1/.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7l1')
const PORT = 4186
const BASE = `http://localhost:${PORT}`
mkdirSync(OUT, { recursive: true })
if (!existsSync(join(DIST, 'index.html'))) { console.error('dist/ not found — run `npm run build` first'); process.exit(1) }

const SEED = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/sagar_division_places.json'), 'utf8')).places
const place = (name) => SEED.find((p) => p.name_en === name)
const today = new Date().toISOString().slice(0, 10)

// ---- static server (+ a stub of the /geocode Pages Function) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const geocodeCalls = []
const server = createServer(async (req, res) => {
  const u = new URL(req.url, BASE)
  if (u.pathname === '/geocode') {
    geocodeCalls.push(u.searchParams.get('q'))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ found: false }))
    return
  }
  const url = decodeURIComponent(u.pathname)
  const direct = join(DIST, url)
  const page = join(DIST, url, 'index.html')
  const hit = extname(direct) && existsSync(direct) ? direct : existsSync(page) ? page : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))

// ---- mocks ----
const weatherRow = (key) => {
  const [la, lo] = String(key || '24.0_78.3').split('_').map(Number)
  const day = (i) => new Date(Date.now() + i * 86400000).toISOString().slice(0, 10)
  return {
    grid_key: key, latitude: la, longitude: lo, fetched_at: new Date().toISOString(),
    current: { temp: 29, humidity: 48, wind_kmh: 9, weathercode: 1, precipitation: 0 },
    hourly: Array.from({ length: 48 }, (_, i) => ({ time: new Date(Date.now() + i * 3600000).toISOString().slice(0, 13) + ':00', temp: 26 + (i % 6), precip_mm: 0, precip_prob: 5, wind_kmh: 8, humidity: 50, soil_moisture: 0.21 })),
    daily: Array.from({ length: 10 }, (_, i) => ({ date: day(i), tmax: 32, tmin: 19, precip_mm: 0, precip_prob: 5, wind_max: 14, weathercode: 1, et0: 4.1, soil_moisture: 0.2 })),
    season_rain: null,
  }
}
const mandi = (market, district, price) => ({ commodity_en: 'Wheat', commodity_hi: 'गेहूं', market, district, modal_price: price, min_price: price - 80, max_price: price + 90, arrivals_tonnes: 12, price_date: today, is_local: true })
const MANDI = [mandi('Sagar APMC', 'Sagar', 2540), mandi('Khurai APMC', 'Sagar', 2575), mandi('Damoh APMC', 'Damoh', 2510), mandi('Panna APMC', 'Panna', 2490), mandi('Chhatarpur APMC', 'Chhatarpur', 2525)]
const khurai = place('Khurai')
const LISTINGS = ['equipment', 'labor', 'bhusa'].map((category, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`, listing_type: 'offer', category, pincode: null, village_town: 'Khurai', village_name: 'Khurai',
  latitude: khurai.lat + 0.01 * i, longitude: khurai.lng, geocoding_status: 'resolved', details: {}, created_at: new Date().toISOString(),
  listing_source: 'user', is_test_data: false, wide_visibility: false, is_sponsored: false, status: 'active', is_available: true, expires_at: new Date(Date.now() + 9e8).toISOString(),
}))
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' }

async function mockNetwork(page, log) {
  await page.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const u = new URL(req.url())
    const table = u.pathname.split('/').pop()
    log.push(`${req.method()} ${table}${u.pathname.includes('/rpc/') ? ' (rpc)' : ''}`)
    const one = (req.headers().accept || '').includes('vnd.pgrst.object')
    const send = (rows) => {
      if (one && !rows.length) return route.fulfill({ status: 406, headers: CORS, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' }) })
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` }, contentType: 'application/json', body: JSON.stringify(one ? rows[0] : rows) })
    }
    if (u.pathname.includes('/rpc/')) return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '[]' })
    if (req.method() !== 'GET') return route.fulfill({ status: 201, headers: CORS, contentType: 'application/json', body: '[]' })
    if (table === 'places') return send(SEED.map(({ name_en, name_hi, district, kind, lat, lng, verified }, id) => ({ id, name_en, name_hi, district, kind, lat, lng, verified })))
    if (table === 'weather_cache_v2') return send([weatherRow((u.searchParams.get('grid_key') || '').replace(/^eq\./, ''))])
    if (table === 'mandi_prices') return send(MANDI)
    if (table === 'listings') return send(LISTINGS)
    return send([])
  })
  // Device-fix naming service: not needed (Khurai is in the places list) — answer empty if asked.
  await page.route(/api\.bigdatacloud\.net|api\.open-meteo\.com/, (route) => route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '{}' }))
}

const results = []
let failures = 0
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
}

const T = {
  en: {
    card: 'Share your location to see offers, mandi prices and weather near you, and how far melas, cold storages and search results are. We use your location only for this.',
    share: 'Share my location', notNow: 'Not now', showing: (p) => `Showing results for ${p}.`, change: 'Change',
    type: 'Type your village or town', mean: 'Did you mean…?', district: 'Choose your district',
    khurai: 'Khurai', damoh: 'Damoh', rehli: 'Rehli', pawai: 'Pawai', panna: 'Panna',
    typed: 'Rehl', misspelt: 'Khurei', nonsense: 'zzqqxx',
  },
  hi: {
    card: 'अपने पास के ऑफ़र, मंडी भाव और मौसम देखने के लिए, और मेला, कोल्ड स्टोरेज व खोज के नतीजे कितनी दूर हैं यह जानने के लिए अपनी लोकेशन साझा करें। हम आपकी लोकेशन सिर्फ़ इसी काम के लिए इस्तेमाल करते हैं।',
    share: 'मेरी लोकेशन साझा करें', notNow: 'अभी नहीं', showing: (p) => `${p} के नतीजे दिख रहे हैं।`, change: 'बदलें',
    type: 'अपना गाँव या कस्बा लिखें', mean: 'क्या आपका मतलब यह था…?', district: 'अपना ज़िला चुनें',
    khurai: 'खुरई', damoh: 'दमोह', rehli: 'रहली', pawai: 'पवई', panna: 'पन्ना',
    typed: 'रह', misspelt: 'खुरइ', nonsense: 'कखगघङच',
  },
}

const browser = await chromium.launch()

// One fresh browser profile per scenario. `geo` = what the simulated device does when asked.
async function open({ width, lang, geo, saved = null, path = '/' }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 900 }, hasTouch: width < 800, deviceScaleFactor: width < 800 ? 2 : 1, serviceWorkers: 'block' })
  await ctx.addInitScript(({ lang, geo, saved }) => {
    if (!localStorage.getItem('__ks_test_seeded')) {
      localStorage.setItem('__ks_test_seeded', '1')
      localStorage.setItem('ks_lang_v1', lang)
      if (saved) localStorage.setItem('ks_location_v1', JSON.stringify(saved))
    }
    window.__geoCalls = 0
    const fake = {
      getCurrentPosition(ok, err) {
        window.__geoCalls += 1
        setTimeout(() => (geo === 'grant' ? ok({ coords: { latitude: 24.0422, longitude: 78.3296, accuracy: 25 }, timestamp: Date.now() }) : err({ code: 1, message: 'User denied Geolocation' })), 60)
      },
      watchPosition() { return 0 }, clearWatch() {},
    }
    Object.defineProperty(Navigator.prototype, 'geolocation', { get: () => fake, configurable: true })
    if (navigator.permissions) {
      const orig = navigator.permissions.query.bind(navigator.permissions)
      navigator.permissions.query = (d) => (d && d.name === 'geolocation' ? Promise.resolve({ state: 'prompt', onchange: null }) : orig(d))
    }
  }, { lang, geo, saved })
  const page = await ctx.newPage()
  const log = []
  await mockNetwork(page, log)
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-testid="location-control"]').first().waitFor({ timeout: 15000 })
  return { ctx, page, log }
}
const ctl = (page) => page.locator('[data-testid="location-control"]').first()
const shot = async (page, name) => {
  await ctl(page).scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -90))
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(OUT, `${name}.png`) })
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
const fits = (page) => ctl(page).evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && [...el.querySelectorAll('button, input')].every((b) => { const x = b.getBoundingClientRect(); return x.width === 0 || (x.left >= -0.5 && x.right <= window.innerWidth + 0.5) }) })
const pincodeInputs = (page) => page.evaluate(() => [...document.querySelectorAll('input')].filter((i) => /pincode|पिनकोड|पिन कोड/i.test(`${i.placeholder} ${i.name} ${i.id} ${i.getAttribute('data-testid') || ''} ${i.closest('label')?.innerText || ''}`)).length
  + (/(?:or enter a pincode|Pincode:|पिनकोड डालें|पिनकोड:)/i.test(document.querySelector('main, #root').innerText) ? 1 : 0))
const banner = (page) => page.locator('[data-testid="location-banner"]').first()

for (const width of [390, 1440]) {
  for (const lang of ['hi', 'en']) {
    const L = T[lang]
    const tag = `${lang}-${width}`

    // ---------- 1. granted ----------
    {
      const { ctx, page } = await open({ width, lang, geo: 'grant' })
      const cardText = (await page.locator('[data-testid="location-prompt"] p').first().innerText()).replace(/^📍\s*/, '').trim()
      check(`${tag} 1 granted: the pre-permission card shows the briefed text`, cardText === L.card, cardText)
      const buttons = await page.locator('[data-testid="location-prompt"] button').allInnerTexts()
      check(`${tag} 1 granted: buttons are "${L.share}" / "${L.notNow}"`, buttons.join('|') === `${L.share}|${L.notNow}`, buttons.join('|'))
      check(`${tag} 1 granted: the device is NOT asked before the button is pressed`, (await page.evaluate(() => window.__geoCalls)) === 0)
      check(`${tag} 1 granted: no nearby counts and no banner before a location is set`, (await page.locator('[data-testid="home-nearby-counts"]').count()) === 0 && (await banner(page).count()) === 0)
      check(`${tag} 1 granted: no pincode box on the home page`, (await pincodeInputs(page)) === 0)
      check(`${tag} 1 granted: card fits the screen, no sideways scroll`, (await fits(page)) && (await noHScroll(page)))
      await shot(page, `1-granted-card-${tag}`)
      await page.locator('[data-testid="location-share"]').click()
      await banner(page).waitFor()
      const b = (await banner(page).innerText()).replace(/\s+/g, ' ')
      check(`${tag} 1 granted: banner reads "${L.showing(L.khurai)} ${L.change}"`, b.includes(L.showing(L.khurai)) && b.includes(L.change), b)
      check(`${tag} 1 granted: source is device, asked exactly once`, (await banner(page).getAttribute('data-source')) === 'device' && (await page.evaluate(() => window.__geoCalls)) === 1)
      await page.locator('[data-testid="home-nearby-counts"]').waitFor()
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ks_location_v1')))
      check(`${tag} 1 granted: one location object saved on this device {lat,lng,label,from}`, stored && Math.abs(stored.lat - 24.0422) < 1e-6 && Math.abs(stored.lng - 78.3296) < 1e-6 && stored.label === L.khurai && stored.from === 'device', JSON.stringify(stored))
      check(`${tag} 1 granted: nothing pincode-shaped is stored`, await page.evaluate(() => localStorage.getItem('ks_pincode') === null))
      await shot(page, `1-granted-result-${tag}`)
      await ctx.close()
    }

    // ---------- 2. refused, with a saved location ----------
    {
      const d = place('Damoh')
      const { ctx, page } = await open({ width, lang, geo: 'deny', saved: { lat: d.lat, lng: d.lng, label: L.damoh, from: 'device' } })
      await banner(page).waitFor()
      check(`${tag} 2 saved: no card — the saved place is used, with the banner`, (await page.locator('[data-testid="location-prompt"]').count()) === 0 && (await banner(page).innerText()).includes(L.showing(L.damoh)))
      check(`${tag} 2 saved: source is saved`, (await banner(page).getAttribute('data-source')) === 'saved')
      await page.locator('[data-testid="location-change"]').click()
      await page.locator('[data-testid="location-share-again"]').click()
      await page.locator('[data-testid="location-notice"]').waitFor()
      const after = (await banner(page).innerText()).replace(/\s+/g, ' ')
      check(`${tag} 2 saved: after the device refuses, results stay on the saved place`, after.includes(L.showing(L.damoh)) && (await banner(page).getAttribute('data-source')) === 'saved', after)
      check(`${tag} 2 saved: counts still shown for the saved place`, (await page.locator('[data-testid="home-nearby-counts"]').count()) === 1)
      check(`${tag} 2 saved: fits the screen, no sideways scroll`, (await fits(page)) && (await noHScroll(page)))
      await shot(page, `2-refused-saved-${tag}`)
      await ctx.close()
    }

    // ---------- 3. refused, typed village matches (weather page) ----------
    {
      const { ctx, page } = await open({ width, lang, geo: 'deny', path: '/mausam' })
      check(`${tag} 3 typed: weather page shows the card, not a default place's weather`, (await page.locator('[data-testid="location-prompt"]').count()) === 1 && !/29°/.test(await page.locator('#root').innerText()))
      check(`${tag} 3 typed: no pincode box on the weather page`, (await pincodeInputs(page)) === 0)
      await page.locator('[data-testid="location-share"]').click()
      await page.locator('[data-testid="location-type"]').waitFor()
      const label = (await page.locator('[data-testid="location-type"] label').innerText()).trim()
      check(`${tag} 3 typed: after refusal an open box asks "${L.type}"`, label === L.type, label)
      await page.locator('[data-testid="location-input"]').fill(L.typed)
      await page.locator('[data-testid="location-suggestions"]').waitFor()
      const sugg = await page.locator('[data-testid="location-suggestions"] button').allInnerTexts()
      check(`${tag} 3 typed: live suggestions include ${L.rehli}`, sugg.some((s) => s.includes(L.rehli)), sugg.join(' | '))
      check(`${tag} 3 typed: fits the screen, no sideways scroll`, (await fits(page)) && (await noHScroll(page)))
      await shot(page, `3-typed-suggestions-${tag}`)
      await page.locator('[data-testid="location-suggestions"] button', { hasText: L.rehli }).first().click()
      await banner(page).waitFor()
      check(`${tag} 3 typed: banner shows ${L.rehli}, source typed`, (await banner(page).innerText()).includes(L.showing(L.rehli)) && (await banner(page).getAttribute('data-source')) === 'typed')
      await page.getByText('29°').first().waitFor({ timeout: 10000 })
      check(`${tag} 3 typed: weather now loads for the typed place`, (await page.locator('h1').first().innerText()).includes(L.rehli))
      await shot(page, `3-typed-result-${tag}`)
      await ctx.close()
    }

    // ---------- 4. typed, no match → "Did you mean…?" (browse page) ----------
    {
      const { ctx, page } = await open({ width, lang, geo: 'deny', path: '/browse' })
      check(`${tag} 4 did-you-mean: browse shows the card instead of results`, (await page.locator('[data-testid="location-prompt"]').count()) === 1)
      check(`${tag} 4 did-you-mean: no pincode box on browse`, (await pincodeInputs(page)) === 0)
      await page.locator('[data-testid="location-not-now"]').click()
      await page.locator('[data-testid="location-input"]').fill(L.misspelt)
      await page.locator('[data-testid="location-find"]').click()
      await page.locator('[data-testid="location-did-you-mean"]').waitFor()
      const head = (await page.locator('[data-testid="location-did-you-mean"] p').first().innerText()).trim()
      const opts = await page.locator('[data-testid="location-did-you-mean"] ul button').allInnerTexts()
      check(`${tag} 4 did-you-mean: heading "${L.mean}" with ${L.khurai} among the closest spellings`, head === L.mean && opts.some((o) => o.includes(L.khurai)), `${head} :: ${opts.join(' | ')}`)
      check(`${tag} 4 did-you-mean: the device was never asked ("Not now")`, (await page.evaluate(() => window.__geoCalls)) === 0)
      check(`${tag} 4 did-you-mean: fits the screen, no sideways scroll`, (await fits(page)) && (await noHScroll(page)))
      await shot(page, `4-did-you-mean-${tag}`)
      const before = geocodeCalls.length
      await page.locator('[data-testid="location-did-you-mean"] ul button', { hasText: L.khurai }).first().click()
      await banner(page).waitFor()
      check(`${tag} 4 did-you-mean: choosing a spelling sets ${L.khurai} (typed) without calling the geocoder`, (await banner(page).innerText()).includes(L.showing(L.khurai)) && (await banner(page).getAttribute('data-source')) === 'typed' && geocodeCalls.length === before)
      await ctx.close()
    }

    // ---------- 5. picker: district → town (home) ----------
    {
      const { ctx, page } = await open({ width, lang, geo: 'deny' })
      await page.locator('[data-testid="location-not-now"]').click()
      await page.locator('[data-testid="location-input"]').fill(L.nonsense)
      await page.locator('[data-testid="location-find"]').click()
      await page.locator('[data-testid="location-picker"]').waitFor()
      const districts = await page.locator('[data-testid^="location-district-"]').allInnerTexts()
      check(`${tag} 5 picker: nothing close → picker with the six districts`, districts.length === 6 && (await page.locator('[data-testid="location-picker"] p').first().innerText()).trim() === L.district, districts.join(' | '))
      check(`${tag} 5 picker: still no banner / no default place`, (await banner(page).count()) === 0 && (await page.locator('[data-testid="home-nearby-counts"]').count()) === 0)
      check(`${tag} 5 picker: fits the screen, no sideways scroll`, (await fits(page)) && (await noHScroll(page)))
      await shot(page, `5-picker-districts-${tag}`)
      await page.locator('[data-testid="location-district-Panna"]').click()
      await page.locator('[data-testid="location-towns"]').waitFor()
      const towns = await page.locator('[data-testid="location-towns"] button').allInnerTexts()
      check(`${tag} 5 picker: Panna lists its towns, district HQ first`, towns[0] === L.panna && towns.includes(L.pawai), towns.join(' | '))
      await shot(page, `5-picker-towns-${tag}`)
      await page.locator('[data-testid="location-towns"] button', { hasText: L.pawai }).click()
      await banner(page).waitFor()
      check(`${tag} 5 picker: banner shows ${L.pawai}, source picked`, (await banner(page).innerText()).includes(L.showing(L.pawai)) && (await banner(page).getAttribute('data-source')) === 'picked')

      // Nearest mandi follows the location object (mock prices at five division mandis).
      await page.goto(BASE + '/msp/gehun', { waitUntil: 'networkidle' })
      const firstRow = async () => (await page.locator('table tbody tr td:first-child').allInnerTexts()).map((s) => s.split('·')[0].trim()).filter((s) => /APMC/.test(s))
      const near1 = await firstRow()
      check(`${tag} mandi: with ${L.pawai} (Panna) set, the nearest mandi listed first is Panna APMC`, near1[0] === 'Panna APMC', near1.slice(0, 5).join(' > '))
      await page.locator('[data-testid="location-change"]').first().click()
      await page.locator('[data-testid="location-input"]').first().fill(lang === 'hi' ? 'दमोह' : 'Damoh')
      await page.locator('[data-testid="location-find"]').first().click()
      await page.waitForFunction(() => /Damoh APMC/.test(document.querySelector('table tbody tr td:first-child')?.innerText || '') || [...document.querySelectorAll('table tbody tr td:first-child')].some((td, i) => i === 0 && /Damoh/.test(td.innerText)), null, { timeout: 8000 }).catch(() => {})
      const near2 = await firstRow()
      check(`${tag} mandi: after changing to ${L.damoh}, Damoh APMC is first`, near2[0] === 'Damoh APMC', near2.slice(0, 5).join(' > '))
      await shot(page, `mandi-nearest-${tag}`)
      await ctx.close()
    }
  }
}

await browser.close()
server.close()
writeFileSync(join(OUT, 'browser-check.json'), JSON.stringify({ ran: new Date().toISOString(), failures, results }, null, 2) + '\n')
console.log(`\n${results.length - failures}/${results.length} checks passed → ${OUT}`)
process.exit(failures ? 1 : 0)
