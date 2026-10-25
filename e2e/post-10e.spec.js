import { test, expect } from '@playwright/test'
import { adminClient, anonClient, testPhone, postStep1 } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { todayIst, addDays, datesRow } from '../src/lib/listings/listingDates.js'

// Batch 10E 3B/3C — optional "अतिरिक्त जानकारी" box (all categories) and mandatory dates for
// equipment / labor / land / drone didi (offer + requirement). Runs against a STAGING build.
// Test users: name "KSTEST …", phone in the reserved 90000xxxxx range (global teardown removes the
// profiles; listings cascade). Screenshots go to docs/review/batch10e/evidence/screens/phase3bc-*.png.

const SHOTS = 'docs/review/batch10e/evidence/screens'
const S = (key, lang = 'hi') => strings[key][lang]

// A phone-only user made through the new sign-up path (app_register_phone, migration 0064), then
// the same local session the sign-up stores (the profile row).
async function makeUser(lang = 'hi') {
  const { data, error } = await anonClient().rpc('app_register_phone', {
    p_full_name: 'KSTEST Post 10E', p_phone: testPhone(), p_village_town: 'Sagar',
    p_latitude: 23.8388, p_longitude: 78.7378, p_language: lang, p_disclaimer_accepted: true, p_show_details: true,
  })
  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data[0] : data
}
async function loginAs(page, profile, lang = 'hi') {
  await page.addInitScript(([p, l]) => {
    localStorage.setItem('ks_session_v1', JSON.stringify(p))
    localStorage.setItem('ks_lang_v1', l)
  }, [profile, lang])
}
async function noHorizontalScroll(page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  expect(sw, 'no horizontal scroll').toBeLessThanOrEqual(cw)
}
// Step 3: village + every consent / declaration box (not the optional wide-visibility box), then Post.
async function confirmAndSubmit(page, lang = 'hi') {
  await page.locator('#f_asset_village').fill('Khurai')
  for (const cb of await page.locator('input[type="checkbox"]:not([data-testid="wide-visibility-checkbox"])').all()) {
    if (!(await cb.isChecked())) await cb.check()
  }
  await page.getByTestId('post-submit').click()
  await page.getByRole('button', { name: S('view_listing', lang) }).click()
  await expect(page).toHaveURL(/\/listing\/[0-9a-f-]+$/)
  return page.url().split('/listing/')[1]
}
const detailsOf = async (id) => (await adminClient().from('listings').select('details').eq('id', id).single()).data.details

test('equipment OFFER (hi, 360): date is mandatory, आज fills it; phone number in extra info blocked; text saved and shown with its line breaks; card shows the date line', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  const user = await makeUser('hi')
  await loginAs(page, user, 'hi')
  const { data: types } = await adminClient().from('equipment_types').select('id').eq('name_en', 'Trolley')
  const today = todayIst()

  await postStep1(page, 'offer', 'equipment')
  await page.locator('#f_equipment_type_id').selectOption(String(types[0].id))
  await page.locator('#f_rate_amount').fill('800')

  const block = page.getByTestId('post-dates')
  await expect(block).toContainText(S('field_available_from'))
  await expect(block).toContainText(S('date_to_optional'))
  await expect(page.getByTestId('date-open-ended')).toHaveAttribute('aria-pressed', 'true') // जब तक चाहें by default
  // the old now / dates toggle is gone (its "available now" is the आज button now)
  await expect(page.getByRole('button', { name: S('avail_dates') })).toHaveCount(0)

  // no date → blocked with the Hindi message, still on step 2
  await page.getByTestId('post-next').click()
  await expect(block.getByText(S('err_date_required'))).toBeVisible()
  await expect(page.locator('#f_available_from')).toBeVisible()

  // quick buttons are real touch targets; आज fills today's (IST) date
  for (const id of ['date-quick-0', 'date-quick-1', 'date-quick-2', 'date-quick-pick', 'date-open-ended']) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box.height, `${id} height`).toBeGreaterThanOrEqual(44)
  }
  await page.getByTestId('date-quick-0').click()
  await expect(page.locator('#f_available_from')).toHaveValue(today)
  await expect(page.getByTestId('date-quick-0')).toHaveAttribute('aria-pressed', 'true')

  // extra info: a phone number is refused
  const extra = page.getByTestId('extra-info')
  await expect(page.getByText(S('extra_info_label'))).toBeVisible()
  await expect(extra).toHaveAttribute('placeholder', S('extra_info_ph'))
  await expect(page.getByText(S('extra_info_help'))).toBeVisible()
  await extra.fill('मेरा नंबर +91-98765-43210 है')
  await page.getByTestId('post-next').click()
  await expect(page.getByText(S('err_extra_info_phone')).last()).toBeVisible()
  await expect(page.getByTestId('extra-info-count')).toHaveText('28/300')
  await noHorizontalScroll(page)
  await page.getByTestId('post-dates').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${SHOTS}/phase3bc-post-equipment-phone-error-hi-360.png`, fullPage: true })

  const text = 'ट्रॉली नई है।\nड्राइवर साथ आएगा, डीज़ल आपका।'
  await extra.fill(text)
  await expect(page.getByTestId('extra-info-count')).toHaveText(`${text.length}/300`)
  await page.getByTestId('post-next').click()
  const id = await confirmAndSubmit(page, 'hi')

  // saved: the text, the start date, no end, available_now off
  const d = await detailsOf(id)
  expect(d.extra_info).toBe(text)
  expect(d.available_from).toBe(today)
  expect(d.available_to).toBeNull()
  expect(d.available_now).toBe(false)

  // detail: extra info as plain text with the line break kept; the date in words
  const box = page.getByTestId('listing-extra-info')
  await expect(box).toBeVisible()
  expect(await box.locator('p').innerText()).toBe(text)
  expect(await box.locator('p').evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre-line')
  const row = datesRow({ category: 'equipment', listing_type: 'offer', details: d }, 'hi')
  await expect(page.locator('dl')).toContainText(row.label)
  await expect(page.locator('dl')).toContainText(row.value)
  await noHorizontalScroll(page)
  await page.screenshot({ path: `${SHOTS}/phase3bc-detail-equipment-hi-360.png`, fullPage: true })

  // card (My Listings): one date line "उपलब्ध: … से"
  await page.goto('/my')
  const line = page.getByTestId('listing-dates-line').first()
  await expect(line).toHaveText(`📅 ${row.label}: ${row.value}`)
  await page.getByTestId('listing-card').first().screenshot({ path: `${SHOTS}/phase3bc-card-equipment-hi-360.png` })
})

test('labor REQUIREMENT (hi, 320): कब चाहिए is mandatory; past start and end-before-start refused; कल works; dates shown', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  const user = await makeUser('hi')
  await loginAs(page, user, 'hi')
  const today = todayIst()

  await postStep1(page, 'requirement', 'labor')
  await page.locator('#f_worker_count').fill('3')
  const block = page.getByTestId('post-dates')
  await expect(block).toContainText(S('date_from_req'))
  await expect(page.getByTestId('date-open-ended')).toHaveCount(0) // offers only

  await page.getByTestId('post-next').click()
  await expect(block.getByText(S('err_date_required'))).toBeVisible()

  await page.locator('#f_available_from').fill(addDays(today, -1))
  await page.getByTestId('post-next').click()
  await expect(block.getByText(S('err_date_past'))).toBeVisible()

  await page.getByTestId('date-quick-1').click()
  await expect(page.locator('#f_available_from')).toHaveValue(addDays(today, 1))
  await page.locator('#f_available_to').fill(today)
  await page.getByTestId('post-next').click()
  await expect(block.getByText(S('err_date_end_before_start'))).toBeVisible()
  await noHorizontalScroll(page)
  await block.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${SHOTS}/phase3bc-post-labor-dates-error-hi-320.png`, fullPage: true })

  await page.locator('#f_available_to').fill(addDays(today, 4))
  await page.getByTestId('extra-info').fill('धान कटाई के लिए, सुबह 7 बजे से')
  await page.getByTestId('post-next').click()
  const id = await confirmAndSubmit(page, 'hi')

  const d = await detailsOf(id)
  expect(d.available_from).toBe(addDays(today, 1))
  expect(d.available_to).toBe(addDays(today, 4))
  expect(d.extra_info).toBe('धान कटाई के लिए, सुबह 7 बजे से')
  const row = datesRow({ category: 'labor', listing_type: 'requirement', details: d }, 'hi')
  expect(row.label).toBe('चाहिए')
  await expect(page.locator('dl')).toContainText(row.value)
  await noHorizontalScroll(page)
})

test('land OFFER (en, 412): English labels, Day-after + Pick-a-date + No-end-date; saved without an end date; empty extra info not stored', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 })
  const user = await makeUser('en')
  await loginAs(page, user, 'en')
  const today = todayIst()

  await postStep1(page, 'offer', 'land')
  await page.locator('#f_size_acres').fill('2')
  await page.locator('#f_price_type').selectOption('negotiable')
  const block = page.getByTestId('post-dates')
  await expect(block).toContainText('Available from')
  await expect(block).toContainText('Until when (optional)')
  await expect(page.getByText('Additional information (optional)')).toBeVisible()

  await page.getByTestId('date-quick-pick').click()
  await expect(page.locator('#f_available_from')).toBeFocused()
  await page.getByTestId('date-quick-2').click()
  await expect(page.locator('#f_available_from')).toHaveValue(addDays(today, 2))
  await page.locator('#f_available_to').fill(addDays(today, 40))
  await expect(page.getByTestId('date-open-ended')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('date-open-ended').click()
  await expect(page.locator('#f_available_to')).toHaveValue('')
  await page.getByTestId('extra-info').fill('   ')
  await noHorizontalScroll(page)
  await page.getByTestId('post-next').click()
  const id = await confirmAndSubmit(page, 'en')

  const d = await detailsOf(id)
  expect(d.available_from).toBe(addDays(today, 2))
  expect(d.available_to).toBeNull()
  expect('extra_info' in d).toBe(false)
  await expect(page.getByTestId('listing-extra-info')).toHaveCount(0)
  const row = datesRow({ category: 'land', listing_type: 'offer', details: d }, 'en')
  expect(row.value).toMatch(/^from \d+ [A-Z][a-z]{2}/)
  await expect(page.locator('dl')).toContainText(row.value)
})

test('bhusa OFFER is out of scope: no date block, no mandatory date; the extra-info box is there', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  const user = await makeUser('hi')
  await loginAs(page, user, 'hi')
  await postStep1(page, 'offer', 'bhusa')
  await expect(page.getByTestId('extra-info')).toBeVisible()
  await expect(page.getByTestId('post-dates')).toHaveCount(0)
  await expect(page.getByTestId('date-quick-0')).toHaveCount(0)
  // fill bhusa's own required fields (first real option of each dropdown), leave its optional date empty
  for (const sel of await page.locator('select').all()) {
    if (!(await sel.inputValue())) await sel.selectOption({ index: 1 })
  }
  await page.locator('#f_quantity').fill('20')
  await page.locator('#f_asking_price').fill('300')
  await expect(page.locator('#f_available_from')).toHaveValue('')
  await page.getByTestId('post-next').click()
  await expect(page.getByText(S('err_date_required'))).toHaveCount(0)
  await expect(page.locator('#f_asset_village')).toBeVisible() // reached step 3
})

test('drone didi REQUIREMENT (hi, 360): कब चाहिए replaces the old optional preferred date; saved as available_from', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  const user = await makeUser('hi')
  await loginAs(page, user, 'hi')
  const today = todayIst()
  await postStep1(page, 'requirement', 'drone_didi')
  await page.locator('#f_crop_type').fill('KSTEST गेहूं')
  await page.locator('#f_acreage').fill('2')
  await page.locator('#f_service_needed').selectOption({ index: 1 })
  await page.locator('#f_asset_village').fill('Khurai')
  await expect(page.locator('#f_preferred_date')).toHaveCount(0)
  await expect(page.getByTestId('post-dates')).toContainText(S('date_from_req'))
  await page.getByTestId('post-next').click()
  await expect(page.getByTestId('post-dates').getByText(S('err_date_required'))).toBeVisible()
  await page.getByTestId('date-quick-2').click()
  await page.getByTestId('post-next').click()
  const id = await confirmAndSubmit(page, 'hi')
  const d = await detailsOf(id)
  expect(d.available_from).toBe(addDays(today, 2))
  expect(d.available_to).toBeNull()
  expect('preferred_date' in d).toBe(false)
  const row = datesRow({ category: 'drone_didi', listing_type: 'requirement', details: d }, 'hi')
  await expect(page.locator('dl')).toContainText(`${row.value}`)
})
