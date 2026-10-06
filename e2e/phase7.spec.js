import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// phase7:28 (language toggle chrome) still passes as-is. The other two are REWRITTEN
// to add the source step before Offering/Looking-for and the numeric land form; the
// DB-driven crop labels and the "functions in Hindi" intent are unchanged.

async function loginAs(page, profile, lang = 'en') {
  await page.addInitScript(
    ([p, l]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', l)
    },
    [profile, lang],
  )
}
async function makeUser() {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      full_name: 'Bilingual Tester', phone: testPhone(), village_town: 'Sagar',
      pincode: '470001', latitude: 23.8388, longitude: 78.7378,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

// Every screen has a हिं/EN toggle and switches chrome copy.
test('language toggle switches UI chrome on core screens', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user, 'en')

  // Home
  await page.goto('/home')
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
  await page.getByRole('button', { name: 'हिं' }).click()
  await expect(page.getByRole('button', { name: 'लॉग आउट' })).toBeVisible()
  await page.getByRole('button', { name: 'EN' }).click()

  // Browse
  await page.goto('/browse')
  await expect(page.getByRole('button', { name: 'Nearest first' })).toBeVisible()
  await page.getByRole('button', { name: 'हिं' }).click()
  await expect(page.getByRole('button', { name: 'नज़दीकी पहले' })).toBeVisible()
})

// DB-driven dropdown labels (crops) switch with language, not just static chrome.
test('crop dropdown labels come from the DB and switch language', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user, 'en')
  await page.goto('/post')
  await page.getByTestId('post-type-offer').click()
  await page.getByTestId('post-cat-land').click()
  await page.getByTestId('post-next').click() // → Details (crop dropdown lives here)
  await page.locator('#f_crop_id').waitFor({ timeout: 8000 })

  // English: "Wheat" option present.
  await expect(page.locator('#f_crop_id option', { hasText: 'Wheat' })).toHaveCount(1)
  // Switch to Hindi via the header toggle — same option now shows "गेहूं".
  await page.getByRole('button', { name: 'हिं' }).click()
  await expect(page.locator('#f_crop_id option', { hasText: 'गेहूं' })).toHaveCount(1)
  await expect(page.locator('#f_crop_id option', { hasText: 'Wheat' })).toHaveCount(0)
})

// Forms still FUNCTION (not just switch) in Hindi mode.
test('posting works in Hindi UI (functional, not just visual)', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user, 'hi')
  await page.goto('/post')
  await page.getByTestId('post-type-offer').click()
  await page.getByTestId('post-cat-land').click()
  await page.getByTestId('post-next').click() // → Details
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('2')
  await page.locator('#f_price_type').selectOption('negotiable')
  await page.getByTestId('post-next').click() // → Location + confirm
  await page.locator('#f_asset_village').fill('खुरई')
  await page.getByTestId('rules-agree-checkbox').check() // single confirm (rules + ownership)
  await page.getByTestId('post-submit').click() // Submit
  await expect(page.getByRole('button', { name: 'लिस्टिंग देखें' })).toBeVisible() // View listing
})
