import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { installMock, seedState } from './mockBackend.mjs'

// Batch 20 (updated in Batch 22) - browser checks against the BUILT app with a fake backend (no network, no database).
// Functional checks run in the 360 px phone project; screenshots are taken in both projects (360 and 1280).
const OUT = 'docs/review/batch22/evidence'
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

test.describe('sign-up (Batch 22: the Mitra choice moved to the offer form)', () => {
  test('sign-up has no Kissan Mitra field, asks for no list, and sends no mitra_id', async ({ page }, testInfo) => {
    const b = await installMock(page)
    await lang('hi')(page)
    await page.goto('/signup')
    await expect(page.locator('#full_name')).toBeVisible()
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    await expect(page.getByTestId('mitra-select')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('किसान मित्र')
    expect(b.listCalls, 'the sign-up form does not load the Mitra list').toBe(0)
    await shot(page, testInfo, 'signup-hi')
    mark(`signup-has-no-mitra-field-${testInfo.project.name}`, true)
  })

  test('registering (no OTP) never calls set_my_mitra and the register call carries no Mitra; English too', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page)
    await lang('en')(page)
    await page.goto('/signup')
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    await fillSignup(page)
    await submit(page)
    await expect(page).toHaveURL(/\/home$/)
    expect(b.calls.some((c) => c.name === 'set_my_mitra' || c.name === 'list_active_mitras')).toBe(false)
    expect(JSON.stringify(b.calls.find((c) => c.name === 'app_register_phone').args)).not.toMatch(/mitra/i)
    mark('signup-sends-no-mitra', true)
  })

  test('with the SMS code step: still no Mitra anywhere', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { otp: true })
    await lang('en')(page)
    await page.goto('/signup')
    await fillSignup(page, { phone: '9000012347' })
    await submit(page)
    await expect(page.getByTestId('signup-otp-card')).toBeVisible()
    await page.getByTestId('signup-otp-code').fill('123456')
    await page.getByTestId('signup-otp-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    expect(b.calls.some((c) => c.name === 'set_my_mitra')).toBe(false)
    expect(JSON.stringify(b.calls.find((c) => c.name === 'app_register_phone_otp').args)).not.toMatch(/mitra/i)
    mark('signup-otp-no-mitra', true)
  })
})

// ---------- the offer-a-service form: the Mitra choice, first offer only ----------
const tomorrow = () => new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10)
async function toStep3(page, type = 'offer') {
  await page.goto('/post')
  await page.getByTestId('post-cat-labor').click()
  await page.getByTestId(`post-type-${type}`).click()
  await page.getByTestId('post-next').click()
  await page.locator('#f_worker_count').fill('4')
  await page.locator('#f_available_from').fill(tomorrow())
  await page.getByTestId('post-next').click()
  await expect(page.getByTestId('post-submit')).toBeVisible()
}
const acceptAll = async (page) => {
  const boxes = page.locator('fieldset input[type="checkbox"]')
  const n = await boxes.count()
  for (let i = 0; i < n; i++) await boxes.nth(i).check()
}

test.describe('offer form', () => {
  const farmer = (id) => ({ id, phone: '9000000099' })

  test('a first offer by a farmer with no Mitra: the dropdown is on the last step (None first, 48 px, 17 px) and the choice is saved once', async ({ page }, testInfo) => {
    const b = await installMock(page, { user: farmer('p9') }) // p9 = registered farmer, no Mitra, never offered
    await lang('hi')(page)
    await toStep3(page)
    const sel = page.getByTestId('mitra-select')
    await expect(sel).toBeVisible()
    await expect(sel).toHaveValue('')
    expect(await sel.locator('option').allTextContents()).toEqual(['कोई नहीं / None', 'Asha Devi — Khurai', 'Bholu Ram — Bina'])
    await expect(page.getByTestId('mitra-field')).toContainText('इस सेवा के लिए किसी किसान मित्र ने आपकी मदद की? (वैकल्पिक)')
    const box = await sel.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(48)
    expect(await sel.evaluate((el) => getComputedStyle(el).fontSize)).toBe('17px')
    if (testInfo.project.name === 'phone360') expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await sel.scrollIntoViewIfNeeded()
    await shot(page, testInfo, 'offer-hi')
    if (testInfo.project.name !== 'phone360') return
    await sel.selectOption({ label: 'Asha Devi — Khurai' })
    await acceptAll(page)
    await page.getByTestId('post-submit').click()
    await expect.poll(() => b.calls.filter((c) => c.name === 'set_my_mitra_on_offer').length).toBe(1)
    const set = b.calls.find((c) => c.name === 'set_my_mitra_on_offer')
    expect(set.args).toMatchObject({ p_actor_id: 'p9', p_mitra_id: 'm-asha' })
    expect(set.args.p_listing_id).toMatch(/^l-new-/)
    expect(JSON.stringify(b.calls.find((c) => c.name === 'create_listing_with_location').args)).not.toMatch(/mitra/i)
    expect(b.state.profiles.find((p) => p.id === 'p9').mitra_id).toBe('m-asha')
    expect(page.url()).not.toMatch(/mitra|m-asha/)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('m-asha')
    mark('first-offer-saves-mitra-once', true)
  })

  test('English label; "None" (the default) saves nothing', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { user: farmer('p9') })
    await lang('en')(page)
    await toStep3(page)
    await expect(page.getByTestId('mitra-field')).toContainText('Did a Kissan Mitra help you offer this? (optional)')
    expect(await page.getByTestId('mitra-select').locator('option').first().textContent()).toBe('None')
    await shot(page, testInfo, 'offer-en')
    await acceptAll(page)
    await page.getByTestId('post-submit').click()
    await expect.poll(() => b.calls.some((c) => c.name === 'create_listing_with_location')).toBe(true)
    expect(b.calls.some((c) => c.name === 'set_my_mitra_on_offer')).toBe(false)
    mark('none-saves-nothing', true)
  })

  test('hidden for a requirement (and the database is not even asked)', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { user: farmer('p9') })
    await toStep3(page, 'requirement')
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    expect(b.choiceCalls).toBe(0)
    mark('requirement-hides-field', true)
  })

  test('hidden for a farmer who already has a Mitra', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { user: farmer('p5') }) // p5 has Bholu
    await toStep3(page)
    await expect.poll(() => b.choiceCalls).toBeGreaterThanOrEqual(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    mark('has-mitra-hides-field', true)
  })

  test('hidden for a farmer who already made an offer - even a removed one - and has no Mitra', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const state = seedState()
    state.listings.push({ id: 'l-removed', user_id: 'p9', listing_type: 'offer', status: 'removed', admin_disabled_at: null, created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString() })
    const b = await installMock(page, { user: farmer('p9'), state })
    await toStep3(page)
    await expect.poll(() => b.choiceCalls).toBeGreaterThanOrEqual(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    mark('earlier-removed-offer-hides-field', true)
  })

  test('an older registered farmer who has never offered DOES see it', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const state = seedState()
    state.profiles = state.profiles.map((p) => (p.id === 'p9' ? { ...p, created_at: new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString() } : p))
    await installMock(page, { user: farmer('p9'), state })
    await toStep3(page)
    await expect(page.getByTestId('mitra-select')).toBeVisible()
    mark('old-farmer-without-offer-sees-field', true)
  })

  test('if the "may I show it" check fails the field is hidden and posting still works', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const bad = await installMock(page, { user: farmer('p9'), choiceStatus: 500 })
    await toStep3(page)
    await expect.poll(() => bad.choiceCalls).toBe(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    await acceptAll(page)
    await page.getByTestId('post-submit').click()
    await expect.poll(() => bad.calls.some((c) => c.name === 'create_listing_with_location')).toBe(true)
    mark('failed-check-hides-field', true)
  })

  test('an empty Mitra list hides the field', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { user: farmer('p9'), mitras: [] })
    await toStep3(page)
    await expect.poll(() => b.listCalls).toBe(1)
    await expect(page.getByTestId('mitra-field')).toHaveCount(0)
    mark('empty-list-hides-field', true)
  })

  test('a failing save never breaks posting, shows no error, and logs a warning without personal data', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { user: farmer('p9'), setMitraStatus: 500 })
    const warnings = []
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()) })
    await toStep3(page)
    await page.getByTestId('mitra-select').selectOption({ index: 1 })
    await acceptAll(page)
    await page.getByTestId('post-submit').click()
    await expect.poll(() => b.calls.some((c) => c.name === 'create_listing_with_location')).toBe(true)
    await expect.poll(() => warnings.some((w) => w.includes('[kissan-mitra]'))).toBe(true)
    expect(warnings.filter((w) => w.includes('[kissan-mitra]')).join(' ')).not.toMatch(/p9|m-asha|l-new/)
    mark('failed-save-does-not-break-posting', true)
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
    // Asha: 4 farmers who offered (one paid) -> 3 unpaid, plus 2 ads (one paid) -> 1 unpaid; rates 1 and 5 -> due 8.
    // Bholu: 1 counted (the blocked one is not counted); no rate set. Purana: its one person has not offered yet -> not counted.
    const asha = card(page, 'Asha Devi')
    await expect(asha.getByTestId('mitra-farmers')).toHaveText('4')
    await expect(asha.getByTestId('mitra-unpaid-f')).toHaveText('3')
    await expect(asha.getByTestId('mitra-businesses')).toHaveText('2')
    await expect(asha.getByTestId('mitra-unpaid-b')).toHaveText('1')
    await expect(asha.getByTestId('mitra-due')).toHaveText('₹8')
    await expect(asha.getByTestId('mitra-today')).toHaveText(/^[0-2]$/) // 0 only if run in the first hours after midnight India time
    await expect(asha.getByTestId('mitra-last7')).toHaveText('6')
    const bholu = card(page, 'Bholu Ram')
    await expect(bholu.getByTestId('mitra-farmers')).toHaveText('1')
    await expect(bholu.getByTestId('mitra-due')).toContainText('दर तय नहीं')
    await expect(card(page, 'Purana Mitra')).toHaveAttribute('data-active', 'no')
    await expect(card(page, 'Purana Mitra').getByTestId('mitra-farmers')).toHaveText('0')
    await expect(page.getByTestId('mitra-sum-mitras')).toHaveText('3')
    await expect(page.getByTestId('mitra-sum-attributed')).toHaveText('7')
    await expect(page.getByTestId('mitra-sum-unpaid')).toHaveText('5')
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
    // Batch 22: offers, and the ads list
    await expect(page.getByTestId('mitra-reg-offers').first()).toContainText('Offers: 1')
    await expect(page.getByTestId('mitra-ad')).toHaveCount(2)
    await expect(page.getByTestId('mitra-once-note')).toContainText('Paid once per farmer')
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
    await expect(page.getByTestId('mitra-pay-counts')).toHaveText('3 farmers + 1 ads counted and unpaid')
    await expect(page.getByTestId('mitra-pay-suggest')).toHaveText('Suggested amount: Rs 8')
    await expect(page.getByTestId('mitra-pay-amount')).toHaveValue('8')
    await expect(page.getByTestId('mitra-pay-confirm')).toHaveText('Record Rs 8 paid for 4 counted items')
    await page.getByTestId('mitra-pay-amount').fill('')
    await page.getByTestId('mitra-pay-confirm').click()
    await expect(page.getByText('The amount must be a whole number')).toBeVisible()
    await page.getByTestId('mitra-pay-amount').fill('150')
    await expect(page.getByTestId('mitra-pay-confirm')).toHaveText('Record Rs 150 paid for 4 counted items')
    await shot(page, testInfo, 'admin-markpaid-en')
    await page.getByTestId('mitra-pay-confirm').click()
    await expect(page.getByTestId('mitra-note')).toHaveText('Payment recorded.')
    await expect(asha.getByTestId('mitra-unpaid-f')).toHaveText('0')
    await expect(asha.getByTestId('mitra-unpaid-b')).toHaveText('0')
    await expect(asha.getByTestId('mitra-due')).toHaveText('₹0')
    await expect(asha.getByTestId('mitra-pay')).toBeDisabled()
    expect(b.state.payments.at(-1)).toMatchObject({ mitra_id: 'm-asha', amount_rupees: 150, farmer_count: 3, business_count: 1 })
    // the ledger
    await asha.getByTestId('mitra-ledger').click()
    await expect(page.getByTestId('mitra-ledger-row')).toHaveCount(2)
    await expect(page.getByTestId('mitra-ledger-dialog')).toContainText('Rs 150 — 3 farmers, 1 ads')
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
    expect(csv).toContain('Asha Devi,Khurai,yes,4,2')
    expect(csv.trim().split('\n')).toHaveLength(4)
    expect(csv).not.toMatch(/9000\d{6}|phone/i)
    mark('admin-mark-paid-ledger-csv', true)
  })

  test('mark-paid dialog and ledger in Hindi on the phone', async ({ page }, testInfo) => {
    await installMock(page, { admin: true })
    await lang('hi')(page)
    await open(page)
    await card(page, 'Asha Devi').getByTestId('mitra-pay').click()
    await expect(page.getByTestId('mitra-pay-counts')).toHaveText('3 किसान + 1 विज्ञापन गिने गए, भुगतान बाकी')
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

// ---------- ads: the Kissan Mitra who brought the ad (announcement form) ----------
test.describe('announcement form', () => {
  async function openAnn(page) {
    await page.goto('/admin?tab=content')
    await expect(page.getByTestId('ann-row').first()).toBeVisible()
  }
  const rowOf = (page, text) => page.getByTestId('ann-row').filter({ hasText: text })

  test('choose a Mitra on an ad (all Mitras listed, None first, hint shown); the list shows a chip; it counts as one ad', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await openAnn(page)
    await expect(rowOf(page, 'TEST ad one').getByTestId('ann-mitra-chip')).toContainText('Kissan Mitra: Asha Devi')
    await expect(rowOf(page, 'TEST festival card').getByTestId('ann-mitra-chip')).toHaveCount(0)
    await rowOf(page, 'TEST festival card').getByTestId('ann-edit').click()
    const sel = page.getByTestId('ann-mitra')
    expect(await sel.locator('option').allTextContents()).toEqual(['None', 'Asha Devi — Khurai', 'Bholu Ram — Bina', 'Purana Mitra'])
    await expect(page.getByTestId('ann-mitra-field')).toContainText('Choose only on a real paid ad, not on festival or info cards')
    await sel.selectOption({ label: 'Bholu Ram — Bina' })
    await page.getByTestId('ann-save').click()
    await expect(rowOf(page, 'TEST festival card').getByTestId('ann-mitra-chip')).toContainText('Bholu Ram')
    expect(b.state.announcements.find((a) => a.id === 'ad-2').mitra_id).toBe('m-bholu')
    mark('announcement-mitra-chosen', true)
  })

  test('a paid ad shows its Mitra read-only with a note', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true })
    await lang('en')(page)
    await openAnn(page)
    await rowOf(page, 'TEST paid ad').getByTestId('ann-edit').click()
    await expect(page.getByTestId('ann-mitra')).toHaveCount(0)
    await expect(page.getByTestId('ann-mitra-readonly')).toContainText('Asha Devi')
    await expect(page.getByTestId('ann-mitra-paid-note')).toBeVisible()
    await page.getByTestId('ann-save').click() // saving the card must not touch the paid ad's Mitra
    await expect(page.getByTestId('ann-form')).toHaveCount(0)
    expect(b.calls.some((c) => c.name === 'admin_set_announcement_mitra')).toBe(false)
    mark('announcement-paid-readonly', true)
  })

  test('if the second call fails, a plain error shows and the form stays open (the card itself is saved)', async ({ page }, testInfo) => {
    phoneOnly(testInfo)
    const b = await installMock(page, { admin: true, annMitraStatus: 500 })
    await lang('en')(page)
    await openAnn(page)
    await rowOf(page, 'TEST festival card').getByTestId('ann-edit').click()
    await page.getByTestId('ann-mitra').selectOption({ label: 'Asha Devi — Khurai' })
    await page.getByTestId('ann-save').click()
    await expect(page.getByTestId('ann-form')).toBeVisible()
    await expect(page.getByTestId('admin-error')).toContainText('could not be linked')
    expect(b.calls.some((c) => c.name === 'admin_upsert_announcement')).toBe(true)
    expect(b.state.announcements.find((a) => a.id === 'ad-2').mitra_id).toBe(null)
    mark('announcement-mitra-failure-keeps-form', true)
  })
})
