// Batch 10F Phase 3 — /msp last-price badge, readable dates, chart dates (tooltip, labels, keyboard,
// touch drag, table) and the corrected trend series. Real STAGING data; visitor writes are blocked.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { MONTHS_HI, MONTHS_SHORT_EN } from '../src/content/months.js'

test.setTimeout(90_000)
const ISO = /\b20\d\d-\d\d-\d\d\b/
const MONTH = { hi: `(${MONTHS_HI.join('|')})`, en: `(${MONTHS_SHORT_EN.join('|')})` }
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)

async function open(browser, { lang = 'hi', width = 412, height = 900, touch } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: touch ?? isMobile, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  // Sections this spec looks at start open (the visitor's remembered choice), so phones show them too.
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem('ks_lang_v1', l)
      localStorage.setItem('ks_sections_v1', JSON.stringify({ 'msp:trend': 1, 'msp:calc': 1, 'msp:trend-table': 1 }))
    } catch { /* ignore */ }
  }, lang)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|img-src/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
async function gotoTrend(page, crop = 'gehun', days = 30) {
  await page.goto(`/msp/${crop}`)
  const sec = page.getByTestId('msp-trend')
  await expect(sec.locator('[data-trend-tab="90"] [data-trend-range]')).not.toHaveText(/^\s*$/, { timeout: 25_000 })
  await sec.locator(`[data-trend-tab="${days}"]`).click()
  await expect(sec.locator(`[data-trend-chart][data-days="${days}"]`)).toBeVisible()
  await expect(sec.locator('[data-trend-dot]').first()).toBeVisible()
  return sec
}
const dots = (sec) => sec.locator('[data-trend-dot]').evaluateAll((els) => els.map((e) => ({ date: e.dataset.trendDot, price: Number(e.dataset.price) })))

for (const lang of ['hi', 'en']) {
  test(`M1 ${lang} 360: last-price badge next to the headings, readable date, colour from the real date, one line`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { lang, width: 360, height: 740 })
    await page.goto('/msp/gehun')
    for (const id of ['last-price-badge', 'snapshot-price-badge']) {
      const b = page.getByTestId(id)
      await expect(b).toBeVisible({ timeout: 25_000 })
      const date = await b.getAttribute('data-date')
      const kind = await b.getAttribute('data-kind')
      expect(kind).toBe(date === todayIst() ? 'today' : 'old')
      const txt = (await b.innerText()).trim()
      if (kind === 'old') expect(txt).toMatch(new RegExp(`^${lang === 'hi' ? 'अंतिम भाव' : 'Last price'}: \\d{1,2} ${MONTH[lang]} 20\\d\\d$`))
      else expect(txt).toMatch(new RegExp(`^${lang === 'hi' ? 'आज का भाव' : "Today[’']s price"} · \\d{1,2} ${MONTH[lang]}$`))
      // inside the heading row (the summary), on screen horizontally, not wrapped
      expect(await b.evaluate((el) => !!el.closest('summary'))).toBe(true)
      const box = await b.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(360)
      expect(box.height).toBeLessThanOrEqual(40)
      const st = await b.evaluate((el) => { const cs = getComputedStyle(el); return { weight: Number(cs.fontWeight), border: cs.borderTopStyle } })
      expect(st.weight).toBeGreaterThanOrEqual(700)
      expect(st.border).not.toBe('none')
    }
    expect(errors).toEqual([])
    await ctx.close()
  })

  test(`M2 ${lang}: no ISO date ("2026-10-17") anywhere on /msp, every section open`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { lang, width: 1280, height: 900 })
    await gotoTrend(page, 'gehun', 30)
    // open everything (table too) and pick a mandi so its date line shows
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
    await page.getByTestId('mandi-search').fill('Sagar')
    await page.getByRole('button', { name: /^Sagar APMC$/ }).first().click()
    await expect(page.getByTestId('mandi-search-result')).toBeVisible()
    const body = await page.locator('main, #root').first().innerText()
    expect(body.match(ISO)).toBeNull()
    // the WhatsApp text too
    const share = await page.locator('[data-share-text]').getAttribute('data-share-text')
    expect(share.match(ISO)).toBeNull()
    await ctx.close()
  })
}

for (const width of [412, 1280]) {
  for (const days of [7, 30, 90]) {
    test(`M3 ${width}px ${days}d: tooltip on the first / last / highest / lowest point shows its date, price and mandis`, async ({ browser }) => {
      const { ctx, page, errors } = await open(browser, { width, height: 900, touch: false })
      const sec = await gotoTrend(page, 'gehun', days)
      const pts = await dots(sec)
      const prices = pts.map((p) => p.price)
      const want = {
        first: pts[0], last: pts[pts.length - 1],
        high: pts[prices.indexOf(Math.max(...prices))], low: pts[prices.indexOf(Math.min(...prices))],
      }
      for (const [role, p] of Object.entries(want)) {
        // the always-visible label carries that point
        const lab = sec.locator(`[data-trend-label][data-date="${p.date}"]`)
        await expect(lab, `${role} label`).toHaveCount(1)
        expect(await lab.getAttribute('data-roles')).toContain(role)
        // hover the dot → tooltip
        const dot = sec.locator(`[data-trend-dot="${p.date}"]`)
        const bb = await dot.boundingBox()
        await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
        const tip = sec.locator('[data-trend-tooltip]')
        await expect(tip).toHaveAttribute('data-date', p.date)
        await expect(tip).toHaveAttribute('data-price', String(p.price))
        await expect(tip).toContainText(`₹${p.price.toLocaleString('en-IN')}`)
        await expect(tip).toContainText(/मंडी/)
        // the table has the same date and price
        await expect(sec.locator(`[data-trend-row="${p.date}"]`)).toContainText(`₹${p.price.toLocaleString('en-IN')}`)
      }
      // one table row per plotted point
      expect(await sec.locator('[data-trend-row]').count()).toBe(pts.length)
      expect(errors).toEqual([])
      await ctx.close()
    })
  }
}

for (const width of [320, 412, 1280]) {
  test(`M4 ${width}px: labels never overlap and stay inside the chart (7 / 30 / 90, wheat and a thin crop)`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height: 900, touch: false })
    for (const crop of ['gehun', 'dhan']) {
      for (const days of [7, 30, 90]) {
        const sec = await gotoTrend(page, crop, days)
        const r = await sec.evaluate((s) => {
          const box = s.querySelector('[data-trend-box]').getBoundingClientRect()
          const rects = [...s.querySelectorAll('[data-trend-label] rect')].map((e) => e.getBoundingClientRect())
          const ticks = [...s.querySelectorAll('[data-trend-tick] text')].map((e) => e.getBoundingClientRect())
          const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
          const bad = []
          rects.forEach((a, i) => {
            if (a.left < box.left - 1 || a.right > box.right + 1 || a.top < box.top - 1 || a.bottom > box.bottom + 1) bad.push(`label ${i} outside`)
            rects.forEach((b, j) => { if (j > i && ov(a, b)) bad.push(`labels ${i}/${j} overlap`) })
            ticks.forEach((b, j) => { if (ov(a, b)) bad.push(`label ${i} on tick ${j}`) })
          })
          ticks.forEach((a, i) => ticks.forEach((b, j) => { if (j > i && ov(a, b)) bad.push(`ticks ${i}/${j} overlap`) }))
          return { n: rects.length, bad, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
        })
        expect(r.bad, `${crop} ${days}d`).toEqual([])
        expect(r.n, `${crop} ${days}d labels`).toBeGreaterThan(0)
        expect(r.overflow).toBeLessThanOrEqual(0)
      }
    }
    await ctx.close()
  })
}

test('M5 keyboard: focus the chart (ring), End / ← / Home move the tooltip between dots', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1280, height: 900, touch: false })
  const sec = await gotoTrend(page, 'gehun', 30)
  const pts = await dots(sec)
  const box = sec.locator('[data-trend-box]')
  await box.focus()
  await page.keyboard.press('End')
  const tip = sec.locator('[data-trend-tooltip]')
  await expect(tip).toHaveAttribute('data-date', pts[pts.length - 1].date)
  const ring = await box.evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(ring).not.toBe('none')
  await page.keyboard.press('ArrowLeft')
  await expect(tip).toHaveAttribute('data-date', pts[pts.length - 2].date)
  await page.keyboard.press('Home')
  await expect(tip).toHaveAttribute('data-date', pts[0].date)
  await page.keyboard.press('ArrowRight')
  await expect(tip).toHaveAttribute('data-date', pts[1].date)
  await ctx.close()
})

test('M6 touch (360 px): a tap shows the nearest dot; dragging along the chart moves the guide and tooltip', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 800, touch: true })
  const sec = await gotoTrend(page, 'gehun', 90)
  const pts = await dots(sec)
  const box = await sec.locator('[data-trend-box]').boundingBox()
  const firstDot = await sec.locator(`[data-trend-dot="${pts[0].date}"]`).boundingBox()
  const lastDot = await sec.locator(`[data-trend-dot="${pts[pts.length - 1].date}"]`).boundingBox()
  const y = box.y + box.height / 2
  const cdp = await ctx.newCDPSession(page)
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  await touch('touchStart', firstDot.x + firstDot.width / 2)
  const tip = sec.locator('[data-trend-tooltip]')
  await expect(tip).toHaveAttribute('data-date', pts[0].date)
  await expect(sec.locator('[data-trend-guide]')).toHaveCount(1)
  for (let k = 1; k <= 8; k++) await touch('touchMove', firstDot.x + ((lastDot.x - firstDot.x) * k) / 8 + firstDot.width / 2)
  await expect(tip).toHaveAttribute('data-date', pts[pts.length - 1].date)
  await touch('touchEnd')
  await ctx.close()
})

test('M7 trend uses the corrected series: calculator and share text use the chart\'s latest point; few-mandi crops are labelled', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1280, height: 900, touch: false })
  const sec = await gotoTrend(page, 'gehun', 30)
  const pts = await dots(sec)
  const last = pts[pts.length - 1]
  const calc = page.locator('[data-calc-price-from]')
  await expect(calc).toContainText(`₹${last.price.toLocaleString('en-IN')}`)
  // trend sentence = last − first of the plotted series
  const diff = last.price - pts[0].price
  const amount = new RegExp(`₹${Math.abs(diff).toLocaleString('en-IN')}(?![\\d,])`)
  await expect(sec.getByText(amount).first()).toBeVisible()
  const share = await page.locator('[data-share-text]').getAttribute('data-share-text')
  expect(share).toMatch(amount)
  // a crop with fewer than 3 stable mandis says so on the chart
  const msec = await gotoTrend(page, 'makka', 30)
  await expect(msec.locator('[data-trend-few]')).toHaveText(strings.msp_chart_few.hi)
  await ctx.close()
})
