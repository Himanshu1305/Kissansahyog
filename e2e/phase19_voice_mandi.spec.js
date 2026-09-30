// Phase 7b — PERMANENT E2E for voice search (Web Speech primary + Gemini fallback gating)
// and the honest mandi "कल का भाव (dd/mm)" labeling. NO test hits a real Gemini API — the
// fallback probe/response is always mocked via page.route.
import { test, expect } from '@playwright/test'

// ---- Voice search ----

test('voice: Web Speech API populates the /sawaal search field (mocked recognition)', async ({ browser }) => {
  const ctx = await browser.newContext()
  // Deterministic fake SpeechRecognition — fires one result then ends.
  await ctx.addInitScript(() => {
    class FakeSR {
      start() { setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: 'गेहूं का भाव' }]] }); this.onend && this.onend() }, 30) }
      stop() { this.onend && this.onend() }
      abort() {}
    }
    window.SpeechRecognition = FakeSR
    window.webkitSpeechRecognition = FakeSR
  })
  const page = await ctx.newPage()
  await page.goto('/sawaal')
  const mic = page.getByTestId('voice-search-btn')
  await expect(mic).toBeVisible()
  await expect(mic).toHaveAttribute('data-voice-mode', 'webspeech')
  await mic.click()
  // The transcript populates the search box live.
  await expect(page.locator('input[type="search"]')).toHaveValue('गेहूं का भाव', { timeout: 5000 })
  await ctx.close()
})

test('voice: unsupported browser WITH a key shows the Gemini-fallback mic', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true })
  })
  const page = await ctx.newPage()
  // Simulate the server having a key configured.
  await page.route('**/transcribe', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true }) })
      : r.continue())
  await page.goto('/sawaal')
  const mic = page.getByTestId('voice-search-btn')
  await expect(mic).toBeVisible({ timeout: 5000 })
  await expect(mic).toHaveAttribute('data-voice-mode', 'gemini')
  await ctx.close()
})

test('voice: unsupported browser with NO key hides the mic — text search still works', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // No key configured → the fallback must degrade gracefully (mic hidden), not crash.
  await page.route('**/transcribe', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false }) })
      : r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'not_configured' }) }))
  await page.goto('/sawaal')
  await page.waitForTimeout(800) // let resolveVoiceMode() settle
  await expect(page.getByTestId('voice-search-btn')).toHaveCount(0)
  // Normal text search still functions.
  const box = page.locator('input[type="search"]')
  await box.fill('ड्रोन')
  await expect(box).toHaveValue('ड्रोन')
  expect(errors, errors.join(' | ')).toHaveLength(0)
  await ctx.close()
})

// ---- Mandi honest labeling ----

test('mandi: /msp shows dated "कल का भाव / पिछला भाव (dd/mm)" tags and "—" for never-recorded', async ({ page }) => {
  await page.goto('/msp/masoor')
  // At least one dated staleness tag (sparse commodities are days old) with a visible date.
  const tag = page.getByTestId('stale-tag').first()
  await expect(tag).toBeVisible({ timeout: 10000 })
  await expect(tag).toContainText(/\(\d{2}\/\d{2}\)/) // the exact date is always visible, not a tooltip
  await expect(tag).toContainText(/कल का भाव|पिछला भाव/)
  // A genuinely never-reported commodity renders the honest "—".
  await expect(page.getByTestId('price-missing').first()).toBeVisible()
})

test('mandi: the homepage ticker still shows LIVE prices (regression guard)', async ({ page }) => {
  await page.goto('/')
  const ticker = page.locator('[role="marquee"]')
  await expect(ticker).toBeVisible()
  // Prices are present (₹) — the ticker has NOT silently regressed to "coming soon".
  await expect(ticker).toContainText('₹', { timeout: 10000 })
})
