#!/usr/bin/env node
// Batch 7L-1 Stage B — the location flow on the deployed PREVIEW (which reads the REAL
// production database), in Hindi and English at 390 and 1440 wide, with "before" pictures of
// the current live site for comparison.
//   node scripts/shots-batch7l1-preview.mjs
//   PREVIEW_BASE=https://preview.kissansahyog-prod.pages.dev LIVE_BASE=https://kissansahyog.com
// Nothing is mocked: places and mandi prices come from the live tables. The visit itself
// writes nothing — the few best-effort visitor writes (weather cell request/cache, counters)
// are answered locally by blockVisitorWrites and listed in the JSON.
// Screenshots + preview-check.json go to docs/review/batch7l1/stageB/.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { blockVisitorWrites } from '../e2e/support.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs/review/batch7l1/stageB')
const PREVIEW = (process.env.PREVIEW_BASE || 'https://preview.kissansahyog-prod.pages.dev').replace(/\/$/, '')
const LIVE = (process.env.LIVE_BASE || 'https://kissansahyog.com').replace(/\/$/, '')
const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const KHURAI = { latitude: 24.05, longitude: 78.34 }
mkdirSync(OUT, { recursive: true })

const results = [], blockedAll = new Set(), dbCalls = []
let site = 'live' // which site the current pages belong to; only preview requests are judged
let pass = 0, fail = 0
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`) }
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) })

async function open(browser, { width, lang, geo }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(geo ? { permissions: ['geolocation'], geolocation: geo } : {}) })
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  const blocked = await blockVisitorWrites(ctx)
  const page = await ctx.newPage()
  page.on('response', (r) => {
    const u = r.url()
    if (!/supabase\.co\/rest\/v1\//.test(u)) return
    dbCalls.push({ site, ref: u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1], path: u.split('/rest/v1/')[1].slice(0, 400), status: r.status(), fromSw: r.fromServiceWorker() })
  })
  page.on('request', (r) => { if (/sagar_division_places/.test(r.url())) dbCalls.push({ site, seedChunk: r.url() }) })
  return { ctx, page, done: async () => { blocked.forEach((b) => blockedAll.add(b)); await ctx.close() } }
}
const control = (page) => page.getByTestId('location-control').first()

const browser = await chromium.launch()

// ---------- BEFORE: the current live site (old flow), fresh visit ----------
for (const lang of ['hi', 'en']) for (const width of [390, 1440]) {
  const tag = `${lang}-${width}`
  const { page, done } = await open(browser, { width, lang })
  for (const [path, name] of [['/', 'home'], ['/mausam', 'mausam']]) {
    try {
      await page.goto(`${LIVE}${path}`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(1200)
      await shot(page, `before-live-${name}-${tag}`)
    } catch (e) { console.log(`INFO  live ${path} ${tag}: ${String(e.message).split('\n')[0]}`) }
  }
  await done()
}

// ---------- AFTER: the preview ----------
site = 'preview'
for (const lang of ['hi', 'en']) for (const width of [390, 1440]) {
  const tag = `${lang}-${width}`
  const T = (hi, en) => (lang === 'hi' ? hi : en)

  // --- a fresh visit: card → refused → type → "Did you mean…?" → picker → place set ---
  {
    const { page, done } = await open(browser, { width, lang })
    const placesResp = page.waitForResponse((r) => /\/rest\/v1\/places\?/.test(r.url()), { timeout: 30000 }).catch(() => null)
    await page.goto(`${PREVIEW}/`, { waitUntil: 'networkidle', timeout: 60000 })
    const pr = await placesResp
    const rows = pr ? await pr.json().catch(() => []) : []
    check(`${tag}: places come from the live production table (54 rows, 200)`, !!pr && pr.status() === 200 && pr.url().includes(PROD_REF) && rows.length === 54, pr ? `${pr.status()} ${rows.length} rows` : 'no places request')

    await control(page).getByTestId('location-prompt').waitFor({ timeout: 15000 })
    const cardText = await control(page).getByTestId('location-prompt').innerText()
    check(`${tag}: card shows the new wording, not "three things"`, T(/कोल्ड स्टोरेज/.test(cardText) && !/तीन कामों/.test(cardText), /cold storages/.test(cardText) && !/three things/.test(cardText)), cardText.replace(/\s+/g, ' ').slice(0, 90))
    check(`${tag}: no place is assumed before the visitor answers (no banner)`, (await page.getByTestId('location-banner').count()) === 0)
    await control(page).scrollIntoViewIfNeeded(); await shot(page, `after-1-card-${tag}`)

    await control(page).getByTestId('location-share').click() // the browser refuses (no permission granted)
    await control(page).getByTestId('location-input').waitFor({ timeout: 25000 })
    check(`${tag}: refused → text box, and no pincode box`, (await page.getByTestId('pincode-input').count()) === 0)
    await shot(page, `after-2-refused-textbox-${tag}`)

    await control(page).getByTestId('location-input').fill('Chatarpu')
    await control(page).getByTestId('location-find').click()
    await control(page).getByTestId('location-did-you-mean').waitFor({ timeout: 8000 })
    const meanText = await control(page).getByTestId('location-did-you-mean').innerText()
    check(`${tag}: misspelt "Chatarpu" → "Did you mean…?" offers Chhatarpur`, /Chhatarpur|छतरपुर/.test(meanText))
    await shot(page, `after-3-did-you-mean-${tag}`)

    await control(page).getByTestId('location-none').click()
    await control(page).getByTestId('location-picker').waitFor({ timeout: 8000 })
    await shot(page, `after-4-picker-districts-${tag}`)
    await control(page).getByTestId('location-district-Chhatarpur').click()
    const towns = control(page).getByTestId('location-towns')
    await towns.waitFor({ timeout: 8000 })
    const townText = await towns.innerText(), townCount = await towns.getByRole('button').count()
    check(`${tag}: Chhatarpur lists 12 towns and never the unverified Lavkush Nagar`, townCount === 12 && !/Lavkush|लवकुश/i.test(townText), `${townCount} towns`)
    await shot(page, `after-5-picker-towns-${tag}`)
    await towns.getByRole('button').first().click()
    const banner = page.getByTestId('location-banner').first()
    await banner.waitFor({ timeout: 8000 })
    check(`${tag}: picked town becomes the location (banner, source "picked")`, (await banner.getAttribute('data-source')) === 'picked' && /Chhatarpur|छतरपुर/.test(await banner.innerText()))
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800)
    await control(page).scrollIntoViewIfNeeded(); await shot(page, `after-6-home-place-set-${tag}`)

    // the same saved place on the weather and mandi pages
    await page.goto(`${PREVIEW}/mausam`, { waitUntil: 'networkidle', timeout: 60000 })
    const temp = page.getByText(/\d+°/).first()
    await temp.waitFor({ timeout: 20000 }).catch(() => {})
    check(`${tag}: /mausam shows weather for the saved place`, (await temp.count()) > 0 && (await page.getByTestId('location-banner').first().getAttribute('data-source')) === 'saved')
    await shot(page, `after-7-mausam-${tag}`)
    await page.goto(`${PREVIEW}/msp`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(800)
    check(`${tag}: /msp renders with the saved place`, (await page.getByTestId('location-banner').count()) > 0 && (await page.locator('h1').count()) > 0)
    await shot(page, `after-8-msp-${tag}`)
    await done()
  }

  // --- device permission already granted (Khurai): named from the live places list ---
  {
    const { page, done } = await open(browser, { width, lang, geo: KHURAI })
    const outside = []
    page.on('request', (r) => { if (/api\.bigdatacloud\.net/.test(r.url())) outside.push(r.url()) })
    await page.goto(`${PREVIEW}/`, { waitUntil: 'networkidle', timeout: 60000 })
    const banner = page.locator('[data-testid=location-banner][data-source=device]').first()
    await banner.waitFor({ timeout: 25000 })
    check(`${tag}: device position near Khurai is named "${T('खुरई', 'Khurai')}" from the places list, no outside naming call`, new RegExp(T('खुरई', 'Khurai')).test(await banner.innerText()) && outside.length === 0, `${outside.length} BigDataCloud calls`)
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800)
    await control(page).scrollIntoViewIfNeeded(); await shot(page, `after-9-home-device-${tag}`)
    await done()
  }
}
await browser.close()

// ---------- what the pages asked the database ----------
const liveOld = dbCalls.filter((c) => c.site === 'live' && c.path && /is_sagar_district/.test(c.path)).length
console.log(`INFO  for comparison, the current LIVE site (old code) made ${liveOld} requests with is_sagar_district`)
const db = dbCalls.filter((c) => c.path && c.site === 'preview')
const refs = [...new Set(db.map((c) => c.ref))]
check('every database request went to the production project', refs.length === 1 && refs[0] === PROD_REF, refs.join(', '))
const mandi = db.filter((c) => c.path.startsWith('mandi_prices'))
const viaNew = mandi.filter((c) => /in_sagar_division/.test(c.path)), viaOld = mandi.filter((c) => /is_sagar_district/.test(c.path))
check('"local mandi" queries used in_sagar_division and succeeded', viaNew.length > 0 && viaNew.every((c) => c.status < 300), `${viaNew.length} requests`)
check('the is_sagar_district fallback path was NOT used', viaOld.length === 0, `${viaOld.length} requests`)
const seedChunk = dbCalls.filter((c) => c.seedChunk && c.site === 'preview')
check('the bundled places fallback file was never loaded', seedChunk.length === 0, `${seedChunk.length} loads`)
const failed = db.filter((c) => c.status >= 400)
console.log(`INFO  database requests: ${db.length}, failed: ${failed.length}${failed.length ? ' → ' + [...new Set(failed.map((c) => `${c.status} ${c.path.split('?')[0]}`))].join('; ') : ''}`)
console.log(`INFO  visitor writes answered locally (not sent): ${[...blockedAll].join(', ') || 'none'}`)

writeFileSync(join(OUT, 'preview-check.json'), JSON.stringify({ preview: PREVIEW, live: LIVE, at: new Date().toISOString(), pass, fail, results, mandiRequests: { viaNew: viaNew.length, viaOld: viaOld.length }, failedDbRequests: failed, writesNotSent: [...blockedAll] }, null, 2))
console.log(`\n${pass} passed, ${fail} failed → ${OUT}`)
process.exit(fail ? 1 : 0)
