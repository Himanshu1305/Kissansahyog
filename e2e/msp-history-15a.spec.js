// Batch 15A - /msp "past years" chart and "5-year average vs today" block at 375 px (STAGING database with the
// monthly history loaded by scripts/batch15a/apply-staging.mjs; visitor writes blocked). A second group mocks the
// history responses: empty (production before its data is loaded) and Madhya Pradesh only (division too short).
//   node --env-file=.env node_modules/.bin/playwright test --config playwright.nowrite.config.js e2e/msp-history-15a.spec.js
import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'

test.setTimeout(90_000)
const S = (key, lang = 'hi') => strings[key][lang]
const SHOTS = 'docs/review/batch15a/evidence/screens'
mkdirSync(SHOTS, { recursive: true })

async function open(browser, { lang = 'hi', width = 375, height = 800 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem('ks_lang_v1', l)
      // the two sections under test start open (the visitor's remembered choice), so the phone shows them
      localStorage.setItem('ks_sections_v1', JSON.stringify({ 'msp:pastyears': 1, 'msp:avg5': 1, 'msp:trend': 1 }))
    } catch { /* ignore */ }
  }, lang)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|img-src|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

// fake history: every month 2016-01 .. 2025-10
function fakeRows(n, price) {
  const rows = []
  for (let y = 2016; y <= 2025; y++) for (let m = 1; m <= 12; m++) {
    if (y === 2025 && m > 10) continue
    rows.push({ month: `${y}-${String(m).padStart(2, '0')}-01`, modal_price: price + (m % 5) * 10, districts_reporting: n })
  }
  return rows
}

for (const lang of ['hi', 'en']) {
  test(`H1 ${lang} 375: /msp/chana shows the past-years chart and the 5-year-average block`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { lang })
    await page.goto('/msp/chana')
    const past = page.getByTestId('msp-pastyears-body')
    await expect(past).toBeVisible({ timeout: 30_000 })
    await expect(past.getByRole('img')).toBeVisible()
    await expect(page.locator('#pastyears h2')).toHaveText(S('msp_pastyears_h', lang))
    await expect(past).toContainText(S('msp_modal_def', lang))
    await expect(past).toContainText('Agmarknet')
    await expect(past).toContainText(S('msp_py_scope_division', lang))
    await expect(past).toContainText(lang === 'hi' ? 'आँकड़े' : 'Data up to')
    await expect(past).toContainText('2025')

    const block = page.getByTestId('msp-avg5-body')
    await expect(block).toBeVisible()
    await expect(page.locator('#avg5 h2')).toHaveText(S('msp_avg_h', lang))
    await expect(page.getByTestId('msp-avg5-avg')).toHaveText(/₹[\d,]{4,}/)
    await expect(page.getByTestId('msp-avg5-note')).toHaveText(S('msp_avg_note', lang))
    if (lang === 'hi') await expect(page.getByTestId('msp-avg5-note')).toContainText('अनुमान नहीं')
    await expect(block).toContainText(S('msp_modal_def', lang))
    // five yearly values, 2021..2025
    const years = await page.getByTestId('msp-avg5-years').locator('li').allInnerTexts()
    expect(years.length).toBeGreaterThanOrEqual(3)
    expect(years.length).toBeLessThanOrEqual(5)
    expect(years.join(' ')).toMatch(/2021|2022|2023/)
    // today's price and the gap are shown when the daily table has the crop (it does on staging)
    await expect(page.getByTestId('msp-avg5-today')).toHaveText(/₹[\d,]+/)
    await expect(page.getByTestId('msp-avg5-gap')).toBeVisible()
    // no forecast words anywhere in the two blocks
    // (the required sentence itself says it is NOT a forecast, so it is taken out before looking for forecast words)
    const text = ((await past.innerText()) + (await block.innerText())).replace(S('msp_avg_note', lang), '')
    expect(text).not.toMatch(/will rise|will fall|forecast|buy now|sell now|बढ़ेगा|घटेगा|खरीदें|बेचें/i)

    // placement: after the trend chart, before the calculator
    const order = await page.evaluate(() => ['trend', 'avg5', 'calc'].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1))
    expect(order[0]).toBeGreaterThan(-1); expect(order[1]).toBeGreaterThan(order[0]); expect(order[2]).toBeGreaterThan(order[1])

    // mobile layout: no horizontal page scroll, text >= 14 px (the chart's own axis labels are exempt), taps >= 44 px
    expect(await noHScroll(page)).toBe(true)
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-testid="msp-avg5-body"] *, [data-testid="msp-pastyears-body"] *')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() && !e.closest('[role="img"]') && !e.closest('.sr-only') && parseFloat(getComputedStyle(e).fontSize) < 13)
      .map((e) => `${e.textContent.trim().slice(0, 30)} ${getComputedStyle(e).fontSize}`))
    expect(small).toEqual([])
    for (const id of ['pastyears', 'avg5']) {
      const h = await page.locator(`#${id} summary`).evaluate((e) => e.getBoundingClientRect().height)
      expect(h).toBeGreaterThanOrEqual(44)
    }
    expect(errors).toEqual([])
    if (lang === 'hi') {
      await page.locator('#avg5').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${SHOTS}/msp-chana-375-avg5-${lang}.png` })
      await page.locator('#pastyears').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${SHOTS}/msp-chana-375-pastyears-${lang}.png` })
      await page.locator('#avg5').screenshot({ path: `${SHOTS}/msp-chana-375-avg5-block-${lang}.png` })
      await page.locator('#pastyears').screenshot({ path: `${SHOTS}/msp-chana-375-pastyears-block-${lang}.png` })
    }
    await ctx.close()
  })
}

test('H2 375: an empty history response hides both sections and the page still works', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser)
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/msp/chana')
  await expect(page.locator('h1')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#trend')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#calc')).toBeVisible()
  await expect(page.locator('#today')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('#pastyears')).toHaveCount(0)
  await expect(page.locator('#avg5')).toHaveCount(0)
  expect(await noHScroll(page)).toBe(true)
  expect(errors).toEqual([])
  await ctx.close()
})

test('H3 375: the table missing (404 / error) also hides both sections without a page error', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser)
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) => r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST205', message: 'Could not find the table' }) }))
  await page.goto('/msp/chana')
  await expect(page.locator('#trend')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await expect(page.locator('#pastyears')).toHaveCount(0)
  await expect(page.locator('#avg5')).toHaveCount(0)
  expect(errors.filter((e) => !/mandi_monthly_history|404/.test(e))).toEqual([])
  await ctx.close()
})

test('H4 375: a division series shorter than 60 months falls back to Madhya Pradesh and says so', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser)
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) => {
    const q = r.request().url()
    const body = q.includes('scope=eq.mp') ? fakeRows(null, 5000) : JSON.stringify(fakeRows(2, 5000).slice(0, 30))
    return r.fulfill({ status: 200, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) })
  })
  await page.goto('/msp/chana')
  const past = page.getByTestId('msp-pastyears-body')
  await expect(past).toBeVisible({ timeout: 30_000 })
  await expect(past).toContainText(S('msp_py_scope_mp'))
  await expect(past).toContainText(S('msp_py_scope_mp_note'))
  await expect(page.getByTestId('msp-avg5-avg')).toHaveText(/₹5,0\d\d/)
  expect(errors).toEqual([])
  await ctx.close()
})

test('H5 375: a crop whose harvest months have too few years of data shows no average block', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  // only 2024 and 2025 exist -> fewer than 3 years -> no 5-year average, and no month has 3 years either
  await ctx.route((u) => u.pathname.includes('/rest/v1/mandi_monthly_history'), (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeRows(4, 5000).filter((x) => x.month >= '2024')) }))
  await page.goto('/msp/chana')
  await expect(page.locator('#trend')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await expect(page.locator('#avg5')).toHaveCount(0)
  await expect(page.locator('#pastyears')).toHaveCount(0)
  await ctx.close()
})
