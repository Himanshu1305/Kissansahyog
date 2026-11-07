import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { installMock } from './mockBackend.mjs'

// Batch 20 - browser checks against the BUILT app with a fake backend (no network, no database).
// Functional checks run in the 360 px phone project; screenshots are taken in both projects (360 and 1280).
const OUT = 'docs/review/batch20/evidence'
mkdirSync(OUT, { recursive: true })
const PROOF = `${OUT}/proof.json`
const proof = existsSync(PROOF) ? JSON.parse(readFileSync(PROOF, 'utf8')) : { checks: {}, screenshots: [] }
const save = () => writeFileSync(PROOF, `${JSON.stringify(proof, null, 2)}\n`)
const mark = (k, v) => { proof.checks[k] = v; save() }

const lang = (l) => async (page) => page.addInitScript((x) => { if (!localStorage.getItem('ks_lang_v1')) localStorage.setItem('ks_lang_v1', x) }, l)
async function shot(page, testInfo, name) {
  const file = `${OUT}/${name}-${testInfo.project.name}.png`
  await page.screenshot({ path: file, fullPage: false })
  if (!proof.screenshots.includes(file)) proof.screenshots.push(file)
  save()
}
const phoneOnly = (testInfo) => test.skip(testInfo.project.name !== 'phone360', 'functional check runs once, in the 360 px project')

async function fillSignup(page, { name = 'TEST Farmer One', phone = '9000012345' } = {}) {
  await page.locator('#full_name').fill(name)
  await page.locator('#phone').fill(phone)
  await page.getByTestId('place-input').fill('Khur')
  await page.getByTestId('place-suggestions').getByRole('button').first().click()
  await expect(page.getByTestId('place-chosen')).toBeVisible()
  await page.getByTestId('disclaimer-accept').check()
}
const submit = (page) => page.locator('form[data-testid="signup-form"] button[type="submit"]').click()

test.describe('sign-up field', () => {
  test('shows the dropdown (None first, "name — area"), 48 px, 17 px, no sideways scroll', async ({ page }, testInfo) => {
    const b = await installMock(page)
    await lang('hi')(page)
    await page.goto('/signup')
    const sel = page.getByTestId('mitra-select')
    await expect(sel).toBeVisible()
    await expect(sel).toHaveValue('')
    const options = await sel.locator('option').allTextContents()
    expect(options).toEqual(['कोई नहीं / None', 'Asha Devi — Khurai', 'Bholu Ram — Bina'])
    await expect(page.getByTestId('mitra-field')).toContainText('आपको किसने जोड़ा? (किसान मित्र)')
    const box = await sel.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(48)
    expect(await sel.evaluate((el) => getComputedStyle(el).fontSize)).toBe('17px')
    if (testInfo.project.name === 'phone360') {
      expect(box.x + box.width).toBeLessThanOrEqual(360)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    }
    expect(b.listCalls).toBe(1)
    await sel.scrollIntoViewIfNeeded()
    await shot(page, testInfo, 'signup-hi')
    mark(`signup-field-shown-${testInfo.project.name}`, true)
  })

  test('English labels', async ({ page }, testInfo) => {
    await installMock(page)
    await lang('en')(page)
    await page.goto('/signup')
    await expect(page.getByTestId('mitra-field')).toContainText('Who helped you join? (Kissan Mitra)')
    expect(await page.getByTestId('mitra-select').locator('option').first().textContent()).toBe('None')
    await page.getByTestId('mitra-select').selectOption({ label: 'Asha Devi — Khurai' })
    await page.getByTestId('mitra-select').scrollIntoViewIfNeeded()
    await shot(page, testInfo, 'signup-en')
  })

  test('a chosen Mitra is saved ONCE right after registering (no OTP); the register call carries no Mitra', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page)
    await lang('en')(page)
    await page.goto('/signup')
    await fillSignup(page)
    await page.getByTestId('mitra-select').selectOption({ label: 'Asha Devi — Khurai' })
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    await expect.poll(() => b.calls.filter((c) => c.name === 'set_my_mitra').length).toBe(1)
    const reg = b.calls.find((c) => c.name === 'app_register_phone')
    expect(JSON.stringify(reg.args)).not.toMatch(/mitra/i)
    const set = b.calls.find((c) => c.name === 'set_my_mitra')
    expect(set.args.p_mitra_id).toBe('m-asha')
    expect(set.args.p_actor_id).toMatch(/^p1\d\d$/)
    expect(b.state.profiles.at(-1).mitra_id).toBe('m-asha')
    // nothing about the choice in the address or in storage
    expect(page.url()).not.toMatch(/mitra|m-asha/)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('m-asha')
    mark('chosen-mitra-saved-once-no-otp', true)
  })

  test('"None" (the default) never calls set_my_mitra', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page)
    await page.goto('/signup')
    await fillSignup(page, { phone: '9000012346' })
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    expect(b.calls.some((c) => c.name === 'set_my_mitra')).toBe(false)
    mark('none-never-calls-set_my_mitra', true)
  })

  test('the choice travels through the OTP step (payload) and is saved once after the code is accepted', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { otp: true })
    await lang('en')(page)
    await page.goto('/signup')
    await fillSignup(page, { phone: '9000012347' })
    await page.getByTestId('mitra-select').selectOption({ label: 'Bholu Ram — Bina' })
    await submit(page)
    await expect(page.getByTestId('signup-otp-card')).toBeVisible()
    expect(b.calls.some((c) => c.name === 'set_my_mitra')).toBe(false) // not before the account exists
    await page.getByTestId('signup-otp-code').fill('123456')
    await page.getByTestId('signup-otp-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    await expect.poll(() => b.calls.filter((c) => c.name === 'set_my_mitra').length).toBe(1)
    expect(b.calls.find((c) => c.name === 'set_my_mitra').args.p_mitra_id).toBe('m-bholu')
    expect(JSON.stringify(b.calls.find((c) => c.name === 'app_register_phone_otp').args)).not.toMatch(/mitra/i)
    mark('chosen-mitra-travels-through-otp', true)
  })

  test('an empty list or a failed list hides the field and never blocks registration', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const empty = await installMock(page, { mitras: [] })
    await page.goto('/signup')
    await expect(page.locator('#full_name')).toBeVisible()
    await expect.poll(() => empty.listCalls).toBe(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    await fillSignup(page, { phone: '9000012348' })
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    mark('empty-list-hides-field', true)
  })

  test('a failing list call hides the field; registration still works', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const bad = await installMock(page, { listStatus: 500 })
    await page.goto('/signup')
    await expect.poll(() => bad.listCalls).toBe(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    await fillSignup(page, { phone: '9000012349' })
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    mark('failed-list-hides-field', true)
  })

  test('a failing set_my_mitra never breaks registration, shows no error, and logs a warning without personal data', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { setMitraStatus: 500 })
    const warnings = []
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()) })
    await page.goto('/signup')
    await fillSignup(page, { phone: '9000012350', name: 'TEST Secret Name' })
    await page.getByTestId('mitra-select').selectOption({ index: 1 })
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByTestId('signup-error')).toHaveCount(0)
    await expect.poll(() => b.calls.filter((c) => c.name === 'set_my_mitra').length).toBeGreaterThanOrEqual(1)
    await expect.poll(() => warnings.some((w) => w.includes('[kissan-mitra]'))).toBe(true)
    const mine = warnings.filter((w) => w.includes('[kissan-mitra]')).join(' ')
    expect(mine).not.toMatch(/TEST Secret Name|9000012350|m-asha|p1\d\d/)
    mark('set_my_mitra-failure-does-not-break-registration', true)
  })
})

test.describe('admin panel', () => {
  async function open(page) {
    await page.goto('/admin?tab=people')
    await expect(page.getByTestId('mitra-reminder')).toBeVisible()
    await expect(page.getByTestId('mitra-card').first()).toBeVisible()
  }
  const card = (page, name) => page.getByTestId('mitra-card').filter({ hasText: name })

  test('list: strip, reminder, cards with counts and the amount due (both languages)', async ({ page }, testInfo) => {
    const b = await installMock(page, { admin: true })
    await lang('hi')(page)
    await open(page)
    await expect(page.getByTestId('mitra-reminder')).toHaveText('भुगतान सिर्फ़ साइट के बाहर करें (UPI/नकद); यहाँ सिर्फ़ रिकॉर्ड रखा जाता है।')
    // Asha: 4 counted farmers (one is paid) -> 3 unpaid; rate 1 -> due 3. Bholu: 1 counted (the blocked one is not counted); no rate set.
    const asha = card(page, 'Asha Devi')
    await expect(asha.getByTestId('mitra-farmers')).toHaveText('4')
    await expect(asha.getByTestId('mitra-unpaid-f')).toHaveText('3')
    await expect(asha.getByTestId('mitra-due')).toHaveText('₹3')
    await expect(asha.getByTestId('mitra-today')).toHaveText(/^[01]$/) // 0 only if run in the first hours after midnight India time
    await expect(asha.getByTestId('mitra-last7')).toHaveText('4')
    const bholu = card(page, 'Bholu Ram')
    await expect(bholu.getByTestId('mitra-farmers')).toHaveText('1')
    await expect(bholu.getByTestId('mitra-due')).toContainText('दर तय नहीं')
    await expect(card(page, 'Purana Mitra')).toHaveAttribute('data-active', 'no')
    await expect(page.getByTestId('mitra-sum-mitras')).toHaveText('3')
    await expect(page.getByTestId('mitra-sum-attributed')).toHaveText('5')
    await expect(page.getByTestId('mitra-sum-unpaid')).toHaveText('4')
    await expect(page.getByTestId('mitra-sum-unattributed')).toHaveText('1')
    if (testInfo.project.name === 'phone360') {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
      for (const id of ['mitra-edit', 'mitra-regs', 'mitra-pay', 'mitra-ledger', 'mitra-switch']) {
        const box = await asha.getByTestId(id).boundingBox()
        expect(box.height, id).toBeGreaterThanOrEqual(48)
      }
    }
    await page.getByTestId('mitra-reminder').evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90) })
    await shot(page, testInfo, 'admin-list-hi')
    await page.evaluate(() => localStorage.setItem('ks_lang_v1', 'en'))
    await page.reload()
    await expect(page.getByTestId('mitra-reminder')).toHaveText('Pay outside the site (UPI or cash); this screen only keeps the record.')
    await expect(card(page, 'Bholu Ram').getByTestId('mitra-due')).toContainText('rate not set')
    await page.getByTestId('mitra-reminder').evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90) })
    await shot(page, testInfo, 'admin-list-en')
    expect(b.calls.some((c) => c.name === 'admin_list_mitras')).toBe(true)
    mark('admin-list-renders', true)
  })

  test('add, validation, duplicate refusal, edit, switch off (greyed, history kept)', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page)
    await page.getByTestId('mitra-add').click()
    await page.getByTestId('mitra-save').click()
    await expect(page.getByTestId('mitra-form-error')).toHaveText('Please write a name.')
    await page.getByTestId('mitra-f-name').fill('Kamla Bai')
    await page.getByTestId('mitra-f-rate-farmer').fill('abc')
    await page.getByTestId('mitra-save').click()
    await expect(page.getByTestId('mitra-form-error')).toContainText('rate must be a whole number')
    await page.getByTestId('mitra-f-rate-farmer').fill('1')
    await page.getByTestId('mitra-f-area').fill('Dhana')
    await page.getByTestId('mitra-f-phone').fill('9000099002')
    await shot(page, testInfo, 'admin-form-en')
    await page.getByTestId('mitra-save').click()
    await expect(page.getByTestId('mitra-note')).toHaveText('Saved.')
    await expect(card(page, 'Kamla Bai')).toContainText('Dhana')
    // duplicate: same name, same area
    await page.getByTestId('mitra-add').click()
    await page.getByTestId('mitra-f-name').fill('kamla bai')
    await page.getByTestId('mitra-f-area').fill('DHANA')
    await page.getByTestId('mitra-save').click()
    await expect(page.getByTestId('admin-error')).toContainText('already exists')
    await page.getByRole('button', { name: 'Cancel' }).click()
    // edit
    await card(page, 'Kamla Bai').getByTestId('mitra-edit').click()
    await expect(page.getByTestId('mitra-f-name')).toHaveValue('Kamla Bai')
    await page.getByTestId('mitra-f-area').fill('Dhana Block')
    await page.getByTestId('mitra-save').click()
    await expect(card(page, 'Kamla Bai')).toContainText('Dhana Block')
    // switch off -> greyed, still listed, and gone from the public dropdown list
    await card(page, 'Kamla Bai').getByTestId('mitra-switch').click()
    await expect(card(page, 'Kamla Bai')).toHaveAttribute('data-active', 'no')
    expect(b.state.mitras.find((m) => m.display_name === 'Kamla Bai').is_active).toBe(false)
    mark('admin-add-edit-switch', true)
  })

  test('registrations view: masked phones, same-name note, move to another Mitra / none, paid ones refuse', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page)
    await card(page, 'Asha Devi').getByTestId('mitra-regs').click()
    await expect(page.getByTestId('mitra-regs-view')).toBeVisible()
    const regs = page.getByTestId('mitra-reg')
    await expect(regs).toHaveCount(4)
    const phones = await page.getByTestId('mitra-reg-phone').allTextContents()
    for (const p of phones) expect(p).toMatch(/^\*{6}\d{4}$/)
    await expect(page.getByTestId('mitra-same-note')).toHaveCount(2) // the two "TEST Ram Lal" in Khurai
    await expect(page.getByTestId('mitra-reg-paid').filter({ hasText: /^Paid$/ })).toHaveCount(1)
    await shot(page, testInfo, 'admin-registrations-en')
    // move the unpaid Sita to Bholu
    const sita = regs.filter({ hasText: 'TEST Sita Bai' })
    await sita.getByTestId('mitra-move').click()
    await page.getByTestId('mitra-move-select').selectOption({ label: 'Bholu Ram — Bina' })
    await page.getByTestId('mitra-move-confirm').click()
    await expect(page.getByTestId('mitra-moved')).toBeVisible()
    await expect(regs).toHaveCount(3)
    expect(b.state.profiles.find((p) => p.id === 'p3').mitra_id).toBe('m-bholu')
    // move one to none: it leaves the count
    await regs.filter({ hasText: 'TEST Ram Lal' }).first().getByTestId('mitra-move').click()
    await page.getByTestId('mitra-move-confirm').click()
    await expect(regs).toHaveCount(2)
    expect(b.state.profiles.filter((p) => p.id === 'p1' || p.id === 'p2').some((p) => p.mitra_id === null)).toBe(true)
    // the paid one cannot move
    await regs.filter({ hasText: 'TEST Mohan' }).getByTestId('mitra-move').click()
    await page.getByTestId('mitra-move-confirm').click()
    await expect(page.getByTestId('admin-error')).toContainText('already paid')
    expect(b.state.profiles.find((p) => p.id === 'p4').mitra_id).toBe('m-asha')
    mark('admin-registrations-move', true)
  })

  test('mark paid: the dialog numbers, the confirm button, the card updates, the ledger, the CSV has no phones', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await open(page)
    const asha = card(page, 'Asha Devi')
    await asha.getByTestId('mitra-pay').click()
    await expect(page.getByTestId('mitra-pay-counts')).toHaveText('3 farmers + 0 businesses counted and unpaid')
    await expect(page.getByTestId('mitra-pay-suggest')).toHaveText('Suggested amount: Rs 3')
    await expect(page.getByTestId('mitra-pay-amount')).toHaveValue('3')
    await expect(page.getByTestId('mitra-pay-confirm')).toHaveText('Record Rs 3 paid for 3 registrations')
    await page.getByTestId('mitra-pay-amount').fill('')
    await page.getByTestId('mitra-pay-confirm').click()
    await expect(page.getByText('The amount must be a whole number')).toBeVisible()
    await page.getByTestId('mitra-pay-amount').fill('150')
    await expect(page.getByTestId('mitra-pay-confirm')).toHaveText('Record Rs 150 paid for 3 registrations')
    await shot(page, testInfo, 'admin-markpaid-en')
    await page.getByTestId('mitra-pay-confirm').click()
    await expect(page.getByTestId('mitra-note')).toHaveText('Payment recorded.')
    await expect(asha.getByTestId('mitra-unpaid-f')).toHaveText('0')
    await expect(asha.getByTestId('mitra-due')).toHaveText('₹0')
    await expect(asha.getByTestId('mitra-pay')).toBeDisabled()
    expect(b.state.payments.at(-1)).toMatchObject({ mitra_id: 'm-asha', amount_rupees: 150, farmer_count: 3, business_count: 0 })
    // the ledger
    await asha.getByTestId('mitra-ledger').click()
    await expect(page.getByTestId('mitra-ledger-row')).toHaveCount(2)
    await expect(page.getByTestId('mitra-ledger-dialog')).toContainText('Rs 150 — 3 farmers, 0 businesses')
    await page.getByRole('button', { name: 'Close' }).click()
    // a Mitra with no rate: the suggestion says so and the amount starts empty
    await card(page, 'Bholu Ram').getByTestId('mitra-pay').click()
    await expect(page.getByTestId('mitra-pay-suggest')).toHaveText('Rate not set — type the amount yourself.')
    await expect(page.getByTestId('mitra-pay-amount')).toHaveValue('')
    await page.getByRole('button', { name: 'Cancel' }).click()
    // the CSV
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('mitra-csv').click()])
    const path = await dl.path()
    const csv = readFileSync(path, 'utf8')
    expect(csv).toContain('name,area,active,farmers_total')
    expect(csv).toContain('Asha Devi,Khurai,yes,4,0')
    expect(csv.trim().split('\n')).toHaveLength(4)
    expect(csv).not.toMatch(/9000\d{6}|phone/i)
    mark('admin-mark-paid-ledger-csv', true)
  })

  test('mark-paid dialog and ledger in Hindi on the phone', async ({ page }, testInfo) => {
    await installMock(page, { admin: true })
    await lang('hi')(page)
    await open(page)
    await card(page, 'Asha Devi').getByTestId('mitra-pay').click()
    await expect(page.getByTestId('mitra-pay-counts')).toHaveText('3 किसान + 0 व्यापार गिने गए, भुगतान बाकी')
    await shot(page, testInfo, 'admin-markpaid-hi')
    await page.getByRole('button', { name: 'रद्द करें' }).click()
    await card(page, 'Asha Devi').getByTestId('mitra-regs').click()
    await expect(page.getByTestId('mitra-reg').first()).toBeVisible()
    await shot(page, testInfo, 'admin-registrations-hi')
  })

  test('the panel is found by the admin search words', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    await installMock(page, { admin: true })
    await lang('hi')(page)
    await page.goto('/admin')
    for (const q of ['mitra', 'एजेंट', 'किसान मित्र']) {
      await page.getByTestId('panel-search').fill(q)
      await expect(page.getByTestId('panel-search-hit').filter({ has: page.locator('xpath=.') , hasText: 'किसान मित्र' }).first()).toBeVisible()
    }
    mark('admin-search-finds-panel', true)
  })
})
