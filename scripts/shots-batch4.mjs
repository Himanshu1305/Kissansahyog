#!/usr/bin/env node
// Batch 4 screenshot review — 375×812 + 1280×800 into docs/review/shots-batch4/.
// Captures: homepage, Fasal Salah wheat + soybean bullet panels, /bazaar + 2 landings,
// three new Q&As, the search mic button + listening state (fake SpeechRecognition), and
// the agri_inputs posting step-3 wide toggle (off + on, via an injected test session).
//   node --env-file=.env scripts/shots-batch4.mjs [baseUrl]
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs/review/shots-batch4')
mkdirSync(OUT, { recursive: true })
const SIZES = [['m', 375, 812], ['d', 1280, 800]]
const warnings = []

const FAKE_SR = () => {
  class FakeSR { start() { setTimeout(() => { this.onstart && this.onstart() }, 10) } stop() { this.onend && this.onend() } abort() {} }
  window.SpeechRecognition = FakeSR
  window.webkitSpeechRecognition = FakeSR
}

async function snap(browser, name, path, { lang, click, init } = {}) {
  for (const [tag, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    if (lang) await ctx.addInitScript((l) => localStorage.setItem('ks_lang_v1', l), lang)
    if (init) await ctx.addInitScript(init)
    const page = await ctx.newPage()
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(900)
      if (click) { try { await page.locator(click).first().click({ timeout: 5000 }); await page.waitForTimeout(700) } catch { warnings.push(`${name}-${tag}: click ${click} failed`) } }
      const diag = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, nav: !!document.querySelector('nav, header') }))
      if (diag.sw > diag.iw + 1) warnings.push(`${name}-${tag}: horizontal scroll (${diag.sw}>${diag.iw})`)
      if (!diag.nav) warnings.push(`${name}-${tag}: no nav/header`)
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), fullPage: tag === 'd' })
    } catch (e) { warnings.push(`${name}-${tag}: ${e.message.split('\n')[0]}`) }
    await ctx.close()
  }
  console.log(`shot ${name}`)
}

const browser = await chromium.launch()

// Non-auth routes
await snap(browser, 'home', '/')
await snap(browser, 'fasal-wheat', '/fasal-salah', { click: '[data-testid="fasal-crop-gehun"]' })
await snap(browser, 'fasal-soybean', '/fasal-salah', { click: '[data-testid="fasal-crop-soyabean"]' })
await snap(browser, 'bazaar-hub', '/bazaar')
await snap(browser, 'bazaar-equipment', '/bazaar/equipment')
await snap(browser, 'bazaar-land', '/bazaar/land')
await snap(browser, 'qa-gehun-buwai', '/sawaal/gehun-buwai-ka-sahi-samay-sagar')
await snap(browser, 'qa-sarson-khaad', '/sawaal/sarson-khaad-urvarak-matra-mp')
await snap(browser, 'qa-moong-ymv-en', '/sawaal/moong-pila-mosaic-ymv-control', { lang: 'en' })

// Search: mic visible (fake SR), then listening state after clicking the mic.
await snap(browser, 'search-mic', '/search', { init: FAKE_SR })
await snap(browser, 'search-listening', '/search', { init: FAKE_SR, click: '[data-testid="voice-search-btn"]' })

// Posting step 3 (agri_inputs) wide toggle — needs a logged-in session. Create a temp
// profile, inject the session, deep-link, fill step 2, advance to step 3, shoot off + on.
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let tempProfileId = null
try {
  const phone = '90000' + String((Date.now() % 100000)).padStart(5, '0')
  const { data: prof, error } = await admin.from('profiles').insert({
    full_name: 'B4 Shots', phone, village_town: 'Makronia', pincode: '470001',
    latitude: 23.84, longitude: 78.74, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), is_test_data: true,
  }).select().single()
  if (error) throw new Error(error.message)
  tempProfileId = prof.id
  for (const [tag, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    await ctx.addInitScript((p) => { localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', 'hi') }, prof)
    const page = await ctx.newPage()
    try {
      await page.goto(`${BASE}/post?cat=agri_inputs&type=offer`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(800)
      // Step 1 → details
      await page.getByTestId('post-next').click().catch(() => {})
      await page.waitForTimeout(500)
      // Step 2: farmer_surplus agri_inputs required fields, targeted by their labels.
      await page.getByLabel(/सामग्री का प्रकार/).selectOption({ index: 1 }).catch(() => {})
      await page.getByLabel(/सामग्री का नाम/).fill('गेहूं बीज').catch(() => {})
      await page.getByLabel(/^मात्रा/).fill('2 क्विंटल').catch(() => {})
      await page.getByLabel(/माँगा गया दाम/).fill('₹100').catch(() => {})
      await page.getByLabel(/सामग्री कहाँ/).fill('मकरोनिया').catch(() => {})
      await page.waitForTimeout(300)
      // Advance to step 3 (location + confirm, where the wide toggle lives).
      const next = page.getByTestId('post-next')
      if (await next.count()) { await next.click().catch(() => {}); await page.waitForTimeout(600) }
      // Fill the village field on step 3 if present so the page is realistic.
      const vil = page.locator('#village, [name="village"], input[placeholder*="गाँव"], input[placeholder*="Village"]').first()
      if (await vil.count()) { await vil.fill('मकरोनिया').catch(() => {}); await page.waitForTimeout(300) }
      // Screenshot whatever step is reached (ideally step 3 with the wide toggle).
      await page.screenshot({ path: join(OUT, `post-agri-step-${tag}.png`), fullPage: tag === 'd' })
      // Toggle wide ON if the checkbox is present.
      const cb = page.getByTestId('wide-visibility-checkbox')
      if (await cb.count()) { await cb.check().catch(() => {}); await page.waitForTimeout(300); await page.screenshot({ path: join(OUT, `post-agri-wide-on-${tag}.png`), fullPage: tag === 'd' }) }
      else warnings.push(`post-agri-${tag}: wide toggle not reached (step-2 form not auto-filled)`)
    } catch (e) { warnings.push(`post-agri-${tag}: ${e.message.split('\n')[0]}`) }
    await ctx.close()
  }
  console.log('shot post-agri')
} catch (e) { warnings.push(`post-agri: setup failed ${e.message.split('\n')[0]}`) }
finally { if (tempProfileId) await admin.from('profiles').delete().eq('id', tempProfileId) }

await browser.close()
console.log(`\nWarnings (${warnings.length}):`)
for (const w of warnings) console.log('  ⚠ ' + w)
