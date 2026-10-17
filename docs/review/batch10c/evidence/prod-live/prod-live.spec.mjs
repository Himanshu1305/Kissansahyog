// Batch 10C close — READ-ONLY live verification of https://kissansahyog.com (Part 1 of the close prompt).
// Nothing is submitted: every non-GET request to the backend, /api/ or /auth is answered locally
// (never reaches production); reads (GET, read RPCs) pass. No logins, no sessions, no sign-ups.
// Run: npx playwright test -c docs/review/batch10c/evidence/prod-live/playwright.prod.config.mjs
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { DEMOS } from '../../../../../src/features/guide/demos/index.js'
import { strings } from '../../../../../src/lib/i18n/strings.js'
import { EQUIPMENT_TAGS } from '../../../../../src/lib/listings/catalog.js'

const OUT = 'docs/review/batch10c/evidence/prod-live'
const SHOTS = `${OUT}/screens`
fs.mkdirSync(SHOTS, { recursive: true })
const SPEED = 20
const ERR = [strings.error_page_title.hi, strings.error_page_title.en]
const WRITE_RPC = /^(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|close_|accept_|app_|claim_|resolve_|fail_|next_pending)/
const isOwn = (u) => { try { const x = new URL(u); return x.host.endsWith('kissansahyog.com') || x.host.endsWith('.supabase.co') } catch { return false } }
const note = (what, data) => console.log(`NOTE ${what}: ${JSON.stringify(data)}`)

async function open(browser, { lang = 'hi', width = 360, height = 740, speed = SPEED, loc = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', isMobile: true, hasTouch: true })
  const blocked = []
  await ctx.route(() => true, (route) => {
    const req = route.request()
    const u = new URL(req.url())
    const m = req.method()
    if (['GET', 'HEAD', 'OPTIONS'].includes(m)) return route.continue()
    if (u.pathname.includes('/rest/v1/rpc/')) {
      const name = u.pathname.split('/rest/v1/rpc/')[1]
      if (!WRITE_RPC.test(name)) return route.continue() // read-only RPC (search)
    }
    blocked.push(`${m} ${u.host}${u.pathname}`)
    return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })
  await ctx.addInitScript(([l, s, lc]) => {
    try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ }
    if (lc) try { localStorage.setItem('ks_location_v1', JSON.stringify({ lat: 24.045, lng: 78.33, label: 'Sagar', from: 'picked' })) } catch { /* */ }
    if (s) window.__KS_GUIDE_SPEED = s
  }, [lang, speed, loc])
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  const cspNoise = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    // Pre-existing on the previous production too (0845c733): prerender leaves modulepreload links to
    // http://localhost:4178 and the CF Insights beacon; the CSP blocks both. Counted separately.
    if (/violates the following Content Security Policy/.test(t) && /(localhost:4178|cloudflareinsights)/.test(t)) { cspNoise.push(t.match(/'(\S+)'/)?.[1]); return }
    errors.push(`console: ${t}`)
  })
  page.on('requestfailed', (r) => { if (isOwn(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`) })
  page.on('response', (r) => { if (isOwn(r.url()) && r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`) })
  return { ctx, page, errors, failed, blocked, cspNoise }
}
const noEB = async (page) => { for (const e of ERR) await expect(page.getByText(e, { exact: false })).toHaveCount(0) }

const PAGES = ['/', '/browse', '/signup', '/login', '/how-to-use', '/guide', '/guide/register', '/guide/post', '/guide/find', '/guide/tour', '/mausam', '/sawaal', '/yojana']

// 1.1 + 1.2 (screens) — each language × width
for (const lang of ['hi', 'en']) {
  for (const width of [360, 412]) {
    test(`1.1 pages ${lang} ${width}`, async ({ browser }) => {
      test.setTimeout(240_000)
      const { ctx, page, errors, failed, blocked, cspNoise } = await open(browser, { lang, width })
      const rows = []
      for (const p of PAGES) {
        const res = await page.goto(p, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
        if (p === '/guide') await expect(page.getByTestId('guide-hub')).toBeVisible()
        else if (p.startsWith('/guide/') && p !== '/guide/tour') await expect(page.getByTestId('demo-finish')).toBeVisible({ timeout: 30_000 })
        else if (p === '/guide/tour') await expect(page.getByTestId('tour-explorer')).toBeVisible()
        const h1 = await page.locator('h1').first().textContent({ timeout: 10_000 }).catch(() => null)
        const bodyLen = (await page.locator('body').innerText()).length
        await noEB(page)
        rows.push({ p, status: res.status(), h1: h1?.trim().slice(0, 40), bodyLen })
        expect(res.status(), p).toBe(200)
        expect(bodyLen, `${p} renders`).toBeGreaterThan(200)
        const safe = p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '-')
        await page.screenshot({ path: `${SHOTS}/${lang}-${width}-${safe}.png`, fullPage: false })
      }
      // NotFound
      await page.goto('/guide/unknown-id')
      await expect(page.getByRole('heading', { name: strings.nf_h1[lang] })).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/${lang}-${width}-guide-unknown.png` })
      note(`1.1 ${lang} ${width} pages`, rows)
      note(`1.1 ${lang} ${width} blocked writes (never sent)`, [...new Set(blocked)])
      note(`1.1 ${lang} ${width} failed own requests`, failed)
      note(`1.1 ${lang} ${width} console errors`, errors)
      note(`1.1 ${lang} ${width} pre-existing CSP-blocked localhost/beacon preloads (count)`, cspNoise.length)
      expect(failed).toEqual([])
      expect(errors).toEqual([])
      await ctx.close()
    })
  }
}

// 1.2 hub + every demo plays to the end (watch); try-it two steps
for (const lang of ['hi', 'en']) {
  test(`1.2 hub + demos ${lang}`, async ({ browser }) => {
    test.setTimeout(180_000)
    const { ctx, page, errors, failed } = await open(browser, { lang, width: 360 })
    await page.goto('/guide')
    await expect(page.locator('[data-testid^="guide-card-"]')).toHaveCount(4)
    await expect(page.getByTestId('guide-progress')).toBeVisible()
    await expect(page.getByTestId('guide-badge')).toBeVisible()
    const tip = await page.locator('[data-testid*="tip"]').count()
    note(`1.2 ${lang} hub`, { cards: 4, tipElems: tip })
    await page.screenshot({ path: `${SHOTS}/${lang}-hub-full.png`, fullPage: true })
    for (const id of ['register', 'post', 'find']) {
      await page.goto(`/guide/${id}`)
      const player = page.getByTestId('demo-player')
      await expect(player).toHaveAttribute('data-state', 'finished', { timeout: 60_000 })
      await expect(page.getByTestId('demo-finish')).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/${lang}-${id}-finished.png`, fullPage: true })
      if (id === 'register') {
        // 1.3 no OTP on production
        await expect(page.locator('[data-otp="1"]')).toHaveCount(0)
        note(`1.3 ${lang} register steps`, DEMOS.register.steps.map((s) => s.target || s.items?.map((i) => i.target).join('+') || s.do))
      }
      // try-it: two steps
      await page.reload()
      await page.getByTestId('demo-mode-try').click()
      await expect(player).toHaveAttribute('data-step', '0')
      await page.getByTestId('demo-target').click()
      await expect(player).toHaveAttribute('data-step', '1')
      await page.getByTestId('demo-target').click()
      await expect(player).not.toHaveAttribute('data-step', '1')
      await page.screenshot({ path: `${SHOTS}/${lang}-${id}-try.png` })
    }
    await page.goto('/guide/tour')
    await expect(page.getByTestId('demo-finish')).toBeVisible({ timeout: 30_000 })
    await page.screenshot({ path: `${SHOTS}/${lang}-tour-finished.png`, fullPage: true })
    await page.goto('/guide')
    await expect(page.getByTestId('guide-progress')).toHaveAttribute('data-done', '4')
    await expect(page.getByTestId('guide-badge')).toHaveAttribute('data-unlocked', '1')
    await page.screenshot({ path: `${SHOTS}/${lang}-hub-done.png`, fullPage: true })
    expect(failed).toEqual([])
    expect(errors).toEqual([])
    await ctx.close()
  })
}

// 1.4 entry points + signup typed-data check
for (const lang of ['hi', 'en']) {
  test(`1.4 entry points ${lang}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const { ctx, page, errors } = await open(browser, { lang, width: 360, height: 640 })
    // Welcome: register-demo card without scrolling at 360x640
    await page.goto('/welcome')
    const wc = page.getByTestId('entry-welcome-guide')
    await expect(wc).toBeVisible()
    const box = await wc.boundingBox()
    note(`1.4 ${lang} welcome card box`, box)
    expect(box.y + box.height, 'welcome card fully above the fold').toBeLessThanOrEqual(640)
    await page.screenshot({ path: `${SHOTS}/${lang}-welcome-360x640.png` })
    await page.goto('/')
    await expect(page.getByTestId('entry-home-guide')).toBeVisible()
    note(`1.4 ${lang} home card text`, (await page.getByTestId('entry-home-guide').innerText()).slice(0, 80))
    await expect(page.getByTestId('nav-guide')).toBeVisible()
    await page.goto('/how-to-use')
    await expect(page.getByTestId('entry-howto-guide')).toHaveAttribute('href', '/guide')
    await page.goto('/about')
    await expect(page.getByTestId('footer-guide')).toHaveAttribute('href', '/guide')
    for (const [p, tid] of [['/login', 'help-login'], ['/browse', 'help-browse']]) {
      await page.goto(p)
      await page.getByTestId(tid).click()
      await expect(page.getByTestId('guide-sheet').getByTestId('demo-player')).toBeVisible()
      await page.getByTestId('guide-sheet-close').click()
      await expect(page.getByTestId('guide-sheet')).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => !history.state?.ksGuideSheet)).toBe(true)
      expect(new URL(page.url()).pathname).toBe(p)
    }
    // Signup: typed values survive the sheet; Back closes the sheet and stays on /signup. NOTHING submitted.
    await page.goto('/about')
    await page.goto('/signup')
    await page.locator('#full_name').fill('रामू परीक्षण')
    await page.locator('#phone').fill('9000012345')
    const vals = async () => [await page.locator('#full_name').inputValue(), await page.locator('#phone').inputValue()]
    await page.getByTestId('help-signup').click()
    const sheet = page.getByTestId('guide-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('[data-otp="1"]')).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/${lang}-signup-sheet.png` })
    await page.getByTestId('guide-sheet-close').click()
    await expect(sheet).toHaveCount(0)
    expect(await vals()).toEqual(['रामू परीक्षण', '9000012345'])
    await page.getByTestId('help-signup').click()
    await expect(sheet).toBeVisible()
    await page.goBack()
    await expect(sheet).toHaveCount(0)
    await page.waitForTimeout(400)
    expect(new URL(page.url()).pathname).toBe('/signup')
    expect(await vals()).toEqual(['रामू परीक्षण', '9000012345'])
    note(`1.4 ${lang} signup typed-data`, 'kept after close and after Back; stayed on /signup')
    // /post is login-only: logged-out visit goes to login; the Post help button is checked in the live chunk (1.6)
    await page.goto('/post')
    note(`1.4 ${lang} /post logged out lands on`, new URL(page.url()).pathname)
    expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
    await ctx.close()
  })
}

// 1.5 etag chips
test('1.5 browse etag chips', async ({ browser }) => {
  const [A] = EQUIPMENT_TAGS.map((t) => t.value)
  const { ctx, page, errors } = await open(browser, { lang: 'en', width: 360, loc: true })
  const etag = () => new URL(page.url()).searchParams.get('etag')
  const chip = (v) => page.getByTestId(`etag-chip-${v}`)
  await page.goto('/browse?cat=equipment')
  await expect(page.getByTestId('equipment-tag-filters')).toBeVisible()
  await chip(A).click(); await expect.poll(etag).toBe(A)
  await chip(A).click(); await expect.poll(etag).toBe(null)
  await page.goto(`/browse?cat=equipment&etag=${A}`)
  await expect(chip(A)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(chip(A)).toHaveAttribute('aria-pressed', 'true')
  expect(etag()).toBe(A)
  await page.screenshot({ path: `${SHOTS}/en-browse-etag.png` })
  // 1.7: one existing public listing loads with details
  await page.goto('/browse?cat=equipment')
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  await page.getByTestId('listing-card').first().click()
  await page.waitForURL(/\/listing\//)
  const href = new URL(page.url()).pathname
  note('1.7 listing picked', href)
  await page.goto(href)
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  await noEB(page)
  const h1 = await page.locator('h1').first().textContent()
  note('1.7 listing h1', h1)
  expect(h1?.trim().length).toBeGreaterThan(0)
  await page.screenshot({ path: `${SHOTS}/en-listing.png` })
  expect(errors).toEqual([])
  await ctx.close()
})
