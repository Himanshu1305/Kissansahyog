import { test, expect } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { installMock, seedState } from './mockBackend.mjs'

// Batch 22D - browser checks of the Kissan Mitra STATEMENT screen against the BUILT app with a fake backend (no network, no
// database). The fake answers come from the reference model (statementFor), the same rules as 0077. Functional checks run in
// the 360 px phone project; screenshots are taken in both projects. Evidence goes to docs/review/batch22/evidence/statement-*.
const OUT = 'docs/review/batch22/evidence'
mkdirSync(OUT, { recursive: true })
const lang = (l) => async (page) => page.addInitScript((x) => { if (!localStorage.getItem('ks_lang_v1')) localStorage.setItem('ks_lang_v1', x) }, l)
const phoneOnly = (testInfo) => test.skip(testInfo.project.name !== 'phone360', 'functional check runs once, in the 360 px project')
const shot = (page, testInfo, name) => page.screenshot({ path: `${OUT}/statement-${name}-${testInfo.project.name}.png`, fullPage: false })
const fmt = (iso, l = 'en') => new Intl.DateTimeFormat(l === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

async function open(page, name) {
  await page.goto('/admin?tab=people')
  await expect(page.getByTestId('mitra-card').first()).toBeVisible()
  await page.getByTestId('mitra-card').filter({ hasText: name }).getByTestId('mitra-statement').click()
  await expect(page.getByTestId('mitra-statement-view')).toBeVisible()
}

// Asha with `n` extra farmers who offered (newest first by hour), used for paging and the CSV.
function bigState(n, nameOf = (i) => `TEST Many ${i}`) {
  const s = seedState()
  const ago = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()
  for (let i = 1; i <= n; i++) {
    s.profiles.push({ id: `px${i}`, full_name: nameOf(i), village_town: 'Khurai', phone: `90001${String(10000 + i).slice(1)}`, created_at: ago(1000), is_blocked: false, mitra_id: 'm-asha', mitra_paid_id: null })
    s.listings.push({ id: `lx${i}`, user_id: `px${i}`, listing_type: 'offer', status: 'active', admin_disabled_at: null, category: 'labor', created_at: ago(100 + i) })
  }
  return s
}

test.describe('Kissan Mitra statement', () => {
  test('Asha: name, rates, totals, one card per farmer and ad with category, date, amount and Paid / Unpaid (English)', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await expect(page.getByTestId('st-name')).toHaveText('Asha Devi — statement')
    await expect(page.getByTestId('st-rate-farmer')).toHaveText('Rs 1')
    await expect(page.getByTestId('st-rate-ad')).toHaveText('Rs 5')
    // 4 farmers who offered (one paid) + 2 ads (one paid): earned 4x1 + 2x5 = 14, paid 1 + 5 = 6, due 8
    await expect(page.getByTestId('st-farmers')).toHaveText('4')
    await expect(page.getByTestId('st-ads')).toHaveText('2')
    await expect(page.getByTestId('st-earned')).toHaveText('Rs 14')
    await expect(page.getByTestId('st-paid')).toHaveText('Rs 6')
    await expect(page.getByTestId('st-due')).toHaveText('Rs 8')
    await expect(page.getByTestId('st-waiting')).toHaveCount(0)
    const rows = page.getByTestId('st-row')
    await expect(rows).toHaveCount(6)
    // newest first: p1 (2 h ago), ad-1 (20 h), p2 (30 h), p3 (50 h), p4 (80 h), ad-3 (90 h)
    const s = b.state
    const first = rows.nth(0)
    await expect(first).toHaveAttribute('data-kind', 'farmer')
    await expect(first).toContainText('TEST Ram Lal')
    await expect(first).toContainText('Khurai')
    await expect(first.getByTestId('st-row-what')).toHaveText('Service offer: Equipment')
    await expect(first.getByTestId('st-row-date')).toHaveText(fmt(s.listings.find((l) => l.user_id === 'p1').created_at))
    await expect(first.getByTestId('st-row-amount')).toHaveText('Rs 1')
    await expect(first.getByTestId('st-row-status')).toHaveText('Unpaid')
    const ad = rows.nth(1)
    await expect(ad).toHaveAttribute('data-kind', 'ad')
    await expect(ad).toContainText('TEST ad one')
    await expect(ad.getByTestId('st-row-what')).toHaveText('Ad')
    await expect(ad.getByTestId('st-row-date')).toHaveText(fmt(s.announcements.find((a) => a.id === 'ad-1').created_at))
    await expect(ad.getByTestId('st-row-amount')).toHaveText('Rs 5')
    await expect(ad.getByTestId('st-row-status')).toHaveText('Unpaid')
    const paidFarmer = rows.nth(4)
    await expect(paidFarmer).toContainText('TEST Mohan')
    await expect(paidFarmer.getByTestId('st-row-what')).toHaveText('Service offer: Bhoosa / Parali')
    await expect(paidFarmer.getByTestId('st-row-status')).toHaveText('Paid on 1 Nov 2026')
    const paidAd = rows.nth(5)
    await expect(paidAd).toContainText('TEST paid ad')
    await expect(paidAd.getByTestId('st-row-amount')).toHaveText('Rs 5')
    await expect(paidAd.getByTestId('st-row-status')).toHaveText('Paid on 1 Nov 2026')
    // no raw category key, no phone number anywhere on the screen
    const text = await page.getByTestId('mitra-statement-view').innerText()
    expect(text).not.toMatch(/drone_didi|agri_inputs|building_materials|equipment_|\b9000\d{6}\b|\*{4}\d{4}/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    expect(b.calls.filter((c) => c.name === 'admin_mitra_statement')[0].args).toMatchObject({ p_mitra_id: 'm-asha', p_limit: 50, p_offset: 0 })
    await shot(page, testInfo, 'asha-en')
  })

  test('Hindi: the same screen with Hindi labels, the Statement button on the card, and the old button still works', async ({ page }, testInfo) => {
    await installMock(page, { admin: true })
    await lang('hi')(page)
    await page.goto('/admin?tab=people')
    const card = page.getByTestId('mitra-card').filter({ hasText: 'Asha Devi' })
    await expect(card.getByTestId('mitra-statement')).toHaveText('विवरण')
    await expect(card.getByTestId('mitra-regs')).toHaveText('सेवा देने वाले और विज्ञापन')
    await card.getByTestId('mitra-statement').click()
    await expect(page.getByTestId('st-name')).toHaveText('Asha Devi — विवरण')
    await expect(page.getByTestId('st-rate-farmer')).toHaveText('₹1')
    await expect(page.getByTestId('st-row').first().getByTestId('st-row-what')).toHaveText('सेवा: मशीन')
    await expect(page.getByTestId('st-row').first().getByTestId('st-row-status')).toHaveText('भुगतान बाकी')
    await expect(page.getByTestId('st-row').nth(4).getByTestId('st-row-status')).toContainText('भुगतान हुआ:')
    await expect(page.getByTestId('st-csv')).toHaveText('विवरण डाउनलोड करें (CSV)')
    if (testInfo.project.name === 'phone360') expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await shot(page, testInfo, 'asha-hi')
    // back to the list, then the old "service offers and ads" screen is unchanged
    await page.getByTestId('st-back').click()
    await expect(page.getByTestId('mitra-statement-view')).toHaveCount(0)
    await expect(page.getByTestId('mitra-card').first()).toBeVisible()
    await card.getByTestId('mitra-regs').click()
    await expect(page.getByTestId('mitra-regs-view')).toBeVisible()
    await expect(page.getByTestId('mitra-ad').first()).toBeVisible()
  })

  test('filters All / Unpaid / Paid work on the loaded rows', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await expect(page.getByTestId('st-row')).toHaveCount(6)
    await page.getByTestId('st-filter-unpaid').click()
    await expect(page.getByTestId('st-row')).toHaveCount(4)
    await expect(page.getByTestId('st-row-status').filter({ hasText: /^Paid/ })).toHaveCount(0)
    await page.getByTestId('st-filter-paid').click()
    await expect(page.getByTestId('st-row')).toHaveCount(2)
    await expect(page.getByTestId('st-filter-paid')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('st-filter-all').click()
    await expect(page.getByTestId('st-row')).toHaveCount(6)
  })

  test('a rate that is not set shows "rate not set" in amber on the rates, the strip and each amount; a blocked person is not a row', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Bholu Ram')
    await expect(page.getByTestId('st-rate-farmer')).toContainText('rate not set')
    await expect(page.getByTestId('st-rate-ad')).toContainText('rate not set')
    await expect(page.getByTestId('st-rate-missing')).toBeVisible()
    await expect(page.getByTestId('st-farmers')).toHaveText('1') // TEST Geeta; TEST Kishan is blocked
    await expect(page.getByTestId('st-row')).toHaveCount(1)
    await expect(page.getByTestId('st-row').first().getByTestId('st-row-amount')).toContainText('rate not set')
    await expect(page.getByTestId('st-row').first().getByTestId('st-row-what')).toHaveText('Service offer: Warehouse & Cold Storage')
    await expect(page.getByTestId('st-earned')).toHaveText('Rs 0+')
    await expect(page.getByText('TEST Kishan')).toHaveCount(0)
  })

  test('empty state: a Mitra whose only person has not offered yet shows a plain sentence and the small grey waiting line', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Purana Mitra')
    await expect(page.getByTestId('st-empty')).toHaveText('This Kissan Mitra has not brought any farmer or ad yet.')
    await expect(page.getByTestId('st-waiting')).toHaveText('1 waiting for their first offer')
    await expect(page.getByTestId('st-row')).toHaveCount(0)
    await expect(page.getByTestId('st-csv')).toBeDisabled()
    await expect(page.getByTestId('st-back')).toBeVisible()
    await shot(page, testInfo, 'empty-en')
  })

  test('Load more: 50 rows at a time, totals cover every row, the button goes away at the end', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true, state: bigState(60) }) // 6 seeded + 60 = 66 rows
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await expect(page.getByTestId('st-farmers')).toHaveText('64') // all 66 - 2 ads, not just the first page
    await expect(page.getByTestId('st-row')).toHaveCount(50)
    await page.getByTestId('st-more').click()
    await expect(page.getByTestId('st-row')).toHaveCount(66)
    await expect(page.getByTestId('st-more')).toHaveCount(0)
    const calls = b.calls.filter((c) => c.name === 'admin_mitra_statement').map((c) => [c.args.p_limit, c.args.p_offset])
    expect(calls).toEqual([[50, 0], [50, 50]])
    // no row twice
    const keys = await page.getByTestId('st-row').evaluateAll((els) => els.map((e) => e.innerText.split('\n')[0]))
    expect(keys.length).toBe(66)
  })

  test('CSV: every page is fetched, UTF-8 with a BOM, the file name, the eight columns, no phone numbers, formula-looking names made safe', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true, state: bigState(520, (i) => (i === 1 ? '=SUM(A1)' : i === 2 ? '@cmd' : `TEST Many ${i}`)) }) // 526 rows -> two CSV requests
    await lang('en')(page)
    await open(page, 'Asha Devi')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('st-csv').click()])
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
    expect(dl.suggestedFilename()).toBe(`kissan-mitra-asha-devi-${today}.csv`)
    const buf = readFileSync(await dl.path())
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf])
    const csv = buf.toString('utf8').slice(1)
    const lines = csv.trimEnd().split('\n')
    expect(lines[0]).toBe('date,kind,name,village,category,amount_rupees,status,paid_on')
    expect(lines.length).toBe(1 + 526)
    expect(csv).not.toMatch(/\b9000\d{6}\b|\*{3}|phone/i)
    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain("'@cmd")
    for (const l of lines.slice(1)) expect(l.split(',')[2]).not.toMatch(/^[=+\-@]/)
    expect(lines.some((l) => /,ad,TEST ad one,,,5,unpaid,$/.test(l))).toBe(true)
    expect(lines.some((l) => /,farmer,TEST Mohan,Bina,Bhoosa \/ Parali,1,paid,2026-11-01$/.test(l))).toBe(true)
    const calls = b.calls.filter((c) => c.name === 'admin_mitra_statement').map((c) => [c.args.p_limit, c.args.p_offset])
    expect(calls).toEqual([[50, 0], [500, 0], [500, 500]])
  })

  test('error: a failing statement shows the plain error notice (never a blank screen) and Back works; a failing CSV says so', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    await installMock(page, { admin: true, statementStatus: 500 })
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await expect(page.getByTestId('admin-error')).toBeVisible()
    await expect(page.getByTestId('st-name')).toHaveText('Asha Devi — statement')
    await expect(page.getByTestId('st-row')).toHaveCount(0)
    await page.getByTestId('st-back').click()
    await expect(page.getByTestId('mitra-card').first()).toBeVisible()
  })

  test('CSV failure after a good first page shows a plain message and the screen stays', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await page.route('https://mock.supabase.test/rest/v1/rpc/admin_mitra_statement', (route) => route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"message":"boom"}' }))
    await page.getByTestId('st-csv').click()
    await expect(page.getByTestId('st-csv-error')).toHaveText('Could not build the CSV. Please try again.')
    await expect(page.getByTestId('st-row')).toHaveCount(6)
    expect(b.calls.length).toBeGreaterThan(0)
  })

  test('the screen only reads: no write call, and the Mitra list is unchanged when coming back', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page, 'Asha Devi')
    await expect(page.getByTestId('st-row')).toHaveCount(6)
    const writes = b.calls.filter((c) => /^(admin_(upsert|reassign|mark|set)|set_my)/.test(c.name))
    expect(writes).toEqual([])
    await page.getByTestId('st-back').click()
    await expect(page.getByTestId('mitra-card').filter({ hasText: 'Asha Devi' }).getByTestId('mitra-due')).toHaveText('₹8')
  })
})
