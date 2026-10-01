// Phase 7b — PERMANENT E2E for the Kisan Mela public page, moderation gate, nav + homepage.
// Relies on the seeded sample melas (scripts/seed_melas.mjs): confirmed UAS Bengaluru + three
// "अपेक्षित" university melas. Never calls the live Anthropic API or any aggregator.
import { test, expect } from '@playwright/test'
import { adminClient } from './support.js'

test('public page: confirmed vs अपेक्षित clearly distinguished, filters + empty state work', async ({ page }) => {
  await page.goto('/kisan-mela')
  await expect(page.getByTestId('mela-card').first()).toBeVisible({ timeout: 15000 })
  // Both a confirmed and an "अपेक्षित" entry are present and visually distinct.
  await expect(page.getByTestId('mela-date-confirmed').first()).toBeVisible()
  await expect(page.getByTestId('mela-date-expected').first()).toBeVisible()

  // State filter: Punjab (seeded PAU) → the PAU card remains, others drop.
  const before = await page.getByTestId('mela-card').count()
  await page.getByTestId('mela-state-filter').selectOption('Punjab')
  await expect(page.getByTestId('mela-card')).toHaveCount(1)
  expect(before).toBeGreaterThan(1)

  // Month filter with no matches → graceful empty state (reset state first).
  await page.getByTestId('mela-state-filter').selectOption('')
  await page.getByTestId('mela-month-filter').selectOption('1') // January — no seeded mela
  await expect(page.getByTestId('mela-empty')).toBeVisible()
})

test('"दिलचस्पी है" requires login (anon → redirected to /login)', async ({ page }) => {
  await page.goto('/kisan-mela')
  await page.getByTestId('mela-interest-btn').first().waitFor({ timeout: 15000 })
  await page.getByTestId('mela-interest-btn').first().click()
  await expect(page).toHaveURL(/\/login$/)
})

test('a user submission lands pending and is NOT visible on the public page until approved', async ({ page }) => {
  const venue = 'E2E-PENDING-' + Date.now()
  await page.goto('/kisan-mela/submit')
  await page.locator('#m_name').fill('E2E टेस्ट मेला')
  await page.locator('#m_venue').fill(venue)
  await page.locator('#m_state').fill('Rajasthan')
  await page.getByTestId('m-date-unknown').check()
  await page.locator('#m_exp').fill('Mar 2027')
  await page.getByRole('button', { name: /जानकारी भेजें|Submit/ }).click()
  await expect(page.getByText(/धन्यवाद|Thank you/)).toBeVisible({ timeout: 10000 })

  // Not on the public list (moderation gate).
  await page.goto('/kisan-mela')
  await page.getByTestId('mela-card').first().waitFor({ timeout: 15000 })
  await expect(page.getByText(venue)).toHaveCount(0)

  // Cleanup the pending row.
  await adminClient().from('kisan_mela').delete().eq('venue', venue)
})

test('corroboration badge only on multi-source cards; universal disclaimer on every card; action buttons stay usable at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }) // small phone — the real constraint
  await page.goto('/kisan-mela')
  await expect(page.getByTestId('mela-card').first()).toBeVisible({ timeout: 15000 })

  // Universal verify-yourself disclaimer on EVERY card (one per card).
  const cardCount = await page.getByTestId('mela-card').count()
  expect(cardCount).toBeGreaterThan(1)
  await expect(page.getByTestId('mela-disclaimer')).toHaveCount(cardCount)
  // Present on both a confirmed card (seeded UAS Bengaluru) and an "अपेक्षित" card (seeded PAU etc.).
  const confirmedCard = page.getByTestId('mela-card').filter({ has: page.getByTestId('mela-date-confirmed') }).first()
  const expectedCard = page.getByTestId('mela-card').filter({ has: page.getByTestId('mela-date-expected') }).first()
  await expect(confirmedCard.getByTestId('mela-disclaimer')).toBeVisible()
  await expect(expectedCard.getByTestId('mela-disclaimer')).toBeVisible()

  // Corroboration badge renders only where source_urls >= 2 — at least one card, but not all of them.
  await expect(page.getByTestId('mela-multi-source').first()).toBeVisible()
  const badges = await page.getByTestId('mela-multi-source').count()
  expect(badges).toBeGreaterThanOrEqual(1)
  expect(badges).toBeLessThan(cardCount) // single-source cards exist and show NO badge

  // The disclaimer must NOT have broken the action row: interest + WhatsApp-share both usable at 375px.
  const interest = confirmedCard.getByTestId('mela-interest-btn')
  await expect(interest).toBeVisible()
  const box = await interest.boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(36) // adequate tap target
  await expect(confirmedCard.locator('a[href*="wa.me"]')).toBeVisible()
})

test('admin: rejected candidate appears in the candidates panel with a publish-anyway action', async ({ browser }) => {
  const admin = adminClient()
  const { data: adminProfile } = await admin.from('profiles').select('id,full_name,phone').eq('is_admin', true).limit(1).maybeSingle()
  test.skip(!adminProfile, 'no admin profile seeded in this environment')
  const sourceUrl = `https://e2e-cand.example/${Date.now()}`
  const ins = await admin.from('kisan_mela_candidates').insert({ source_name: 'ai_broad_search', source_url: sourceUrl, raw_name: 'E2E Rejected Candidate', raw_venue: 'Test Ground', raw_state: 'Rajasthan', raw_date_text: 'Mar 2027', verification_status: 'rejected', verification_reason: 'e2e: no primary source' }).select('id').single()
  const ctx = await browser.newContext()
  // Inject a REAL admin session so both the route guard and the require_admin RPC accept it.
  const session = { id: adminProfile.id, full_name: adminProfile.full_name || 'Admin', phone: adminProfile.phone || '9999000000', preferred_language: 'hi', disclaimer_accepted_at: '2026-01-01T00:00:00Z', is_admin: true }
  await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
  const page = await ctx.newPage()
  try {
    await page.goto('/admin')
    const row = page.getByTestId('admin-mela-candidate-row').filter({ hasText: 'E2E Rejected Candidate' })
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(row.getByTestId('admin-mela-candidate-publish')).toBeVisible()
  } finally {
    await admin.from('kisan_mela_candidates').delete().eq('id', ins.data.id)
    await ctx.close()
  }
})

test('Resources nav dropdown contains किसान मेला; homepage teaser renders', async ({ page }) => {
  await page.goto('/')
  // Homepage teaser (seeded melas exist → cards; otherwise the empty state).
  const teaserCards = page.getByTestId('home-mela-card')
  const teaserEmpty = page.getByTestId('home-mela-empty')
  await expect(teaserCards.first().or(teaserEmpty)).toBeVisible({ timeout: 15000 })

  // Desktop Resources dropdown → किसान मेला present.
  await page.setViewportSize({ width: 1280, height: 800 })
  const resBtn = page.getByRole('button', { name: /उपयोगी संपर्क|Resources/ }).first()
  await resBtn.click()
  await expect(page.getByRole('menuitem', { name: /किसान मेला|Kisan Mela/ })).toBeVisible()
})
