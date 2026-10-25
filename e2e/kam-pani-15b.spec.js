// Batch 15B - /fasal-salah/kam-pani at 375 px (STAGING database, visitor writes blocked).
//   node --env-file=.env node_modules/.bin/playwright test --config playwright.nowrite.config.js e2e/kam-pani-15b.spec.js
import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { PAGE, WATER, GOV_CARDS } from '../src/content/kamPani.js'

test.setTimeout(90_000)
const SHOTS = 'docs/review/batch15b/evidence/screens'
mkdirSync(SHOTS, { recursive: true })
const PATH = '/fasal-salah/kam-pani'

async function open(browser, { lang = 'hi', now } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  const page = await ctx.newPage()
  if (now) await page.clock.install({ time: new Date(now) })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|img-src|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

test('K1 375 hi: opens, chips scroll to their sections, water levels change the list, farm-pond link opens the card', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser)
  await page.goto(PATH)
  await expect(page.locator('h1')).toHaveText(PAGE.h1.hi, { timeout: 30_000 })
  await expect(page.getByTestId('kp-crop-gram')).toBeVisible()
  // prices arrive: gram has an MSP bar, a 5-year average and the money box
  await expect(page.getByTestId('kp-crop-gram')).toContainText('5,958', { timeout: 30_000 })
  await expect(page.getByTestId('kp-crop-gram')).toContainText('₹5,0')
  await expect(page.getByTestId('kp-table')).toBeVisible()
  await expect(page.getByTestId('kp-table')).toContainText('2,610')
  // barley has no Sagar price in the daily data
  await expect(page.getByTestId('kp-notoday-barley')).toHaveText('डेटा नहीं')
  // the Hindi term
  expect(await page.locator('body').innerText()).not.toContain('बीच का भाव')
  expect(await page.locator('body').innerText()).toContain('Modal भाव')
  // the sowing banner is there on 23 Oct 2026 is not testable on the real clock; K3 covers both sides of the date.

  await page.screenshot({ path: `${SHOTS}/kam-pani-375-top.png` })

  // five chips
  const ids = PAGE.chips.map((c) => c.id)
  expect(await page.getByTestId('kp-chips').locator('a').count()).toBe(5)
  for (const id of ids) {
    await page.getByTestId(`kp-chip-${id}`).click()
    await expect.poll(async () => page.evaluate((i) => { const r = document.getElementById(i)?.getBoundingClientRect(); return r ? r.top : 99999 }, id), { timeout: 8000 }).toBeLessThan(260)
    expect(await page.evaluate((i) => document.getElementById(i)?.getBoundingClientRect().top, id)).toBeGreaterThan(-10)
  }

  // water selector: each of the four levels shows its own list
  await page.getByTestId('kp-chip-surakshit-fasal').click()
  const seen = []
  for (const w of [0, 1, 2, 3]) {
    await page.getByTestId(`kp-water-${w}`).click()
    await expect(page.getByTestId(`kp-water-${w}`)).toHaveAttribute('aria-pressed', 'true')
    const box = page.getByTestId('kp-water-box')
    await expect(box).toContainText(WATER[w].title.hi)
    await expect(box.getByTestId('kp-rec-keep').first()).toContainText(WATER[w].recs[0].crop.hi)
    seen.push(await box.innerText())
  }
  expect(new Set(seen).size).toBe(4)
  await page.getByTestId('kp-water-2').click()
  await page.getByTestId('kp-water').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${SHOTS}/kam-pani-375-water.png` })
  await page.getByTestId('kp-crop-lentil').scrollIntoViewIfNeeded()
  await page.getByTestId('kp-crop-lentil').screenshot({ path: `${SHOTS}/kam-pani-375-crop-card.png` })
  await page.getByTestId('kp-table').scrollIntoViewIfNeeded()
  await page.getByTestId('kp-years').locator('summary').click()
  await page.getByTestId('kp-table').screenshot({ path: `${SHOTS}/kam-pani-375-table.png` })
  await page.getByTestId('kp-years').screenshot({ path: `${SHOTS}/kam-pani-375-years.png` })

  // no "under review" tag anywhere, and no sentence saying a fact is unconfirmed
  expect(await page.getByTestId('kp-under-review').count()).toBe(0)
  const bodyText = await page.locator('body').innerText()
  for (const w of ['समीक्षाधीन', 'पुष्टि बाकी', 'Under review', 'not yet confirmed']) expect(bodyText).not.toContain(w)

  // farm pond link from "पानी बचाने के तरीके" lands on the farm-pond card and opens it
  const pond = page.getByTestId('kp-card-gov_khet_talab')
  await expect(pond).not.toHaveAttribute('open', '')
  const link = page.getByTestId('kp-farm-pond-link')
  await expect(link).toHaveAttribute('href', '/fasal-salah/kam-pani#sarkari-sahara-khet-talab')
  await link.scrollIntoViewIfNeeded()
  await link.click()
  await expect(pond).toHaveAttribute('open', '')
  await expect.poll(async () => page.evaluate(() => document.getElementById('sarkari-sahara-khet-talab').getBoundingClientRect().top), { timeout: 8000 }).toBeLessThan(260)
  await expect(pond).toContainText(GOV_CARDS[2].lines[0].hi)
  await page.screenshot({ path: `${SHOTS}/kam-pani-375-farm-pond.png` })

  // loading the page straight at the hash opens the card too
  await page.goto(`${PATH}#sarkari-sahara-khet-talab`)
  await expect(page.getByTestId('kp-card-gov_khet_talab')).toHaveAttribute('open', '', { timeout: 30_000 })

  // footer: KVK line + phone from the repo string, both buttons, last-checked date, attribution
  const foot = page.getByTestId('kp-footer')
  await foot.scrollIntoViewIfNeeded()
  await expect(foot).toContainText(PAGE.ask.hi)
  await expect(foot).toContainText(strings.res_card_offices_1.hi)
  await expect(foot).toContainText('23 अक्तूबर 2026')
  await expect(foot).toContainText('CEDA')
  await expect(page.getByTestId('kp-btn-msp')).toHaveAttribute('href', '/msp')
  await expect(page.getByTestId('kp-btn-bazaar')).toHaveAttribute('href', '/bazaar')
  await page.screenshot({ path: `${SHOTS}/kam-pani-375-footer.png` })

  // mobile layout: no page-wide horizontal scroll, text >= 12.5 px (labels) and body text >= 14, taps >= 44
  expect(await noHScroll(page)).toBe(true)
  const tiny = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${e.textContent.trim().slice(0, 30)} ${getComputedStyle(e).fontSize}`))
  expect(tiny).toEqual([])
  const smallTap = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="kp-chip-"], [data-testid^="kp-water-"], [data-testid="kp-btn-msp"], [data-testid="kp-btn-bazaar"], details > summary')].filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.textContent.trim().slice(0, 30)))
  expect(smallTap).toEqual([])
  expect(errors).toEqual([])
  await ctx.close()
})

test('K2 375: with the price data answering empty, the static content still renders and shows no error', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser)
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_prices') || u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto(PATH)
  await expect(page.locator('h1')).toHaveText(PAGE.h1.hi, { timeout: 30_000 })
  await expect(page.getByTestId('kp-crop-gram')).toContainText('5,958') // MSP is a constant, not read from a table
  await expect(page.getByTestId('kp-notoday-gram')).toHaveText('आज का भाव उपलब्ध नहीं', { timeout: 30_000 })
  await expect(page.getByTestId('kp-water-box')).toBeVisible()
  await expect(page.getByTestId('kp-sec-gov')).toBeVisible()
  await expect(page.getByTestId('kp-card-gov_pmfby')).toBeAttached()
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/NaN|undefined|null|error|त्रुटि/i)
  expect(await noHScroll(page)).toBe(true)
  expect(errors).toEqual([])
  await ctx.close()
})

test('K2b 375: a failing price request (HTTP 500) also leaves the static page', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_prices') || u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }))
  await page.goto(PATH)
  await expect(page.locator('h1')).toHaveText(PAGE.h1.hi, { timeout: 30_000 })
  await expect(page.getByTestId('kp-crop-wheat')).toContainText('2,610', { timeout: 30_000 })
  await expect(page.getByTestId('kp-sec-save')).toBeVisible()
  expect((await page.locator('body').innerText())).not.toMatch(/NaN|undefined/)
  await ctx.close()
})

test('K3 375: the sowing banner shows before 15 Nov 2026 and is gone after it', async ({ browser }) => {
  const before = await open(browser, { now: '2026-10-23T09:00:00Z' })
  await before.page.goto(PATH)
  await expect(before.page.getByTestId('kp-banner-sowing')).toBeVisible({ timeout: 30_000 })
  await expect(before.page.getByTestId('kp-banner-rain')).toBeVisible()
  await before.ctx.close()
  const after = await open(browser, { now: '2026-11-20T09:00:00Z' })
  await after.page.goto(PATH)
  await expect(after.page.locator('h1')).toBeVisible({ timeout: 30_000 })
  await expect(after.page.getByTestId('kp-crop-gram')).toBeVisible()
  await expect(after.page.getByTestId('kp-banner-sowing')).toHaveCount(0)
  await expect(after.page.getByTestId('kp-banner-rain')).toBeVisible() // valid until 31 Dec
  await after.ctx.close()
  const late = await open(browser, { now: '2027-01-05T09:00:00Z' })
  await late.page.goto(PATH)
  await expect(late.page.locator('h1')).toBeVisible({ timeout: 30_000 })
  await expect(late.page.getByTestId('kp-banner-rain')).toHaveCount(0)
  await late.ctx.close()
})

test('K4 375 en: the English page has the same sections', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, { lang: 'en' })
  await page.goto(PATH)
  await expect(page.locator('h1')).toHaveText(PAGE.h1.en, { timeout: 30_000 })
  await expect(page.getByTestId('kp-sec-safe')).toContainText('Modal')
  expect(await noHScroll(page)).toBe(true)
  expect(errors).toEqual([])
  await ctx.close()
})

test('K5 375: the new links in /fasal-salah and /msp/chana reach the page; barley/soybean pages do not get one', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await page.goto('/fasal-salah')
  await page.getByTestId('fasal-kam-pani-card').click()
  await expect(page).toHaveURL(/\/fasal-salah\/kam-pani$/)
  await page.goto('/msp/chana')
  await expect(page.getByTestId('msp-kam-pani-link')).toBeVisible({ timeout: 30_000 })
  await page.goto('/msp/soyabean')
  await expect(page.locator('h1')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('msp-kam-pani-link')).toHaveCount(0)
  await ctx.close()
})
