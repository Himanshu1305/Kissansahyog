// Phase 8 — PERMANENT E2E for the Combined Legal / Agro-Forestry / Availability / Profile
// build: buyer compliance modal (once per browser), scheme/article/agro pages render, the
// seller rules checkbox gates submission, and the PWA install banner's standalone/iOS logic.
import { test, expect } from '@playwright/test'

const FAKE_SESSION = {
  id: '00000000-0000-0000-0000-0000000000ac', full_name: 'E2E Legal', phone: '9000012347',
  village_town: 'Khurai', pincode: '470117', preferred_language: 'hi',
  disclaimer_accepted_at: '2026-01-01T00:00:00Z', is_admin: false,
}

test('buyer compliance modal shows once per browser, not again after acceptance', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/')
  const waBtn = page.getByTestId('card-whatsapp').first()
  await waBtn.waitFor({ timeout: 15000 })
  await waBtn.click()
  const modal = page.getByTestId('buyer-compliance-modal')
  await expect(modal).toBeVisible()
  await page.getByTestId('buyer-compliance-accept').click()
  await expect(modal).toHaveCount(0)
  // localStorage flag set → a second tap does NOT show the modal again.
  expect(await page.evaluate(() => localStorage.getItem('ks_buyer_agreed_v1'))).toBe('1')
  await page.getByTestId('card-whatsapp').first().click()
  await expect(page.getByTestId('buyer-compliance-modal')).toHaveCount(0)
  await ctx.close()
})

test('both new scheme pages, the agro-forestry hub, and the article render', async ({ page }) => {
  await page.goto('/yojana/fal-podharopan-yojana')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/फल पौधरोपण|Fal Podharopan/)
  await page.goto('/yojana/aushadhi-sugandhit-fasal-vistar')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/औषधि|Aushadhi/)
  await page.goto('/agro-forestry')
  await expect(page.getByTestId('agro-article-link')).toBeVisible()
  await page.goto('/articles/intercropping-madhya-pradesh')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/इंटरक्रॉपिंग|Intercropping/)
  await expect(page.getByText(/ए\.के\. दीक्षित/).first()).toBeVisible()
  // question-shaped H2 rendered
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
})

test('seller rules-compliance checkbox is present and gates the submit button', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), FAKE_SESSION)
  const page = await ctx.newPage()
  await page.goto('/post')
  await page.getByRole('button', { name: /आगे बढ़ें/ }).click()
  await page.getByRole('button', { name: /दे रहे हैं/ }).click()
  await page.getByRole('button', { name: /मशीन/ }).first().click()
  const cb = page.getByTestId('rules-agree-checkbox')
  await cb.waitFor({ timeout: 8000 })
  await expect(cb).not.toBeChecked()
  const submit = page.getByRole('button', { name: /जमा करें/ })
  await expect(submit).toBeDisabled()
  await cb.check()
  await expect(submit).toBeEnabled()
  await ctx.close()
})

test('PWA install banner: hidden in standalone, shown otherwise (Android event)', async ({ browser }) => {
  // Standalone → banner must NOT render even if installable.
  const standalone = await browser.newContext()
  await standalone.addInitScript(() => {
    const orig = window.matchMedia.bind(window)
    window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false } } : orig(q))
  })
  const p1 = await standalone.newPage()
  await p1.goto('/')
  await p1.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 })
  await p1.waitForTimeout(300)
  await expect(p1.getByTestId('pwa-install-strip')).toHaveCount(0)
  await standalone.close()

  // BLIND-SPOT FIX (Phase 2): a fresh visitor must see the banner WITHOUT any synthetic
  // beforeinstallprompt. The earlier test dispatched that event before asserting, which is
  // exactly why it passed while the banner was invisible to real users (whose browsers
  // never fired the event). No dispatch here — this is the real-visitor path.
  const normal = await browser.newContext()
  const p2 = await normal.newPage()
  await p2.goto('/')
  await p2.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 })
  await expect(p2.getByTestId('pwa-install-strip')).toBeVisible()
  await expect(p2.getByTestId('pwa-install-cta')).toBeVisible()
  await normal.close()
})
