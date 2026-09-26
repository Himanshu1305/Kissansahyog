// Part B Phase 4a (0031) screenshots — Land numeric acreage. Preview on :4173.
//   node --env-file=.env scripts/shots_0031.mjs
// Captures: (A) Land creation form — numeric acreage (no buckets), all three arrangements
// (ठेका/बटाई/पट्टा), per-acre rate + optional contact; (B) the detail view of a 50-acre
// listing showing "50 एकड़" with village-only location (no exact plot address).
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-0031'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const KHURAI = { latitude: 24.045, longitude: 78.33 }

async function slice(page, name) {
  const buf = await page.screenshot({ fullPage: true })
  const { width: W, height: H } = await sharp(buf).metadata()
  const TILE = 1100
  for (let top = 0, i = 0; top < H; top += TILE, i++) {
    const h = Math.min(TILE, H - top)
    await sharp(buf).extract({ left: 0, top, width: W, height: h }).resize({ width: Math.min(W, 1000) }).jpeg({ quality: 72 }).toFile(`${OUT}/${name}__${String(i).padStart(2, '0')}.jpg`)
  }
}

async function setup() {
  const phone = '9000000292'
  let { data: prof } = await db.from('profiles').select('*').eq('phone', phone).maybeSingle()
  if (!prof) {
    const { data } = await db.from('profiles').insert({ full_name: 'शॉट किसान', phone, village_town: 'Khurai', pincode: '470117', latitude: KHURAI.latitude, longitude: KHURAI.longitude, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), is_test_data: true }).select('*').single()
    prof = data
  }
  // A 50-acre ठेका (contract) listing anchored to Khurai for the detail screenshot.
  const { data: listing } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_acres: 50, arrangement: ['contract_farming'], water_source: 'borewell', crop_id: 1, season: 'rabi', price_type: 'fixed', price_amount: '6000' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai' })
  return { prof, listingId: listing?.id }
}

async function teardown(prof, listingId) {
  if (listingId) await db.from('listings').delete().eq('id', listingId)
  await db.from('listings').delete().eq('user_id', prof.id)
}

async function run() {
  const { prof, listingId } = await setup()
  const session = { ...prof }
  const browser = await chromium.launch()
  for (const [vp, w, h] of [['d', 1280, 800], ['m', 375, 812]]) {
    // A) Land creation form — numeric acreage, all three arrangement chips, per-acre rate + contact.
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/post`)
      await p.getByRole('button', { name: /आगे बढ़ें/ }).click()
      await p.getByRole('button', { name: /दे रहे हैं/ }).click()
      await p.getByRole('button', { name: /ज़मीन/ }).first().click()
      await p.locator('#f_size_acres').waitFor({ timeout: 8000 })
      await p.locator('#f_size_acres').fill('50')
      // Tick all three arrangements (पट्टा/बटाई/ठेका) to show one numeric input serves all.
      for (const label of [/पट्टा/, /बटाई/, /ठेका/]) await p.getByRole('button', { name: label }).first().click().catch(() => {})
      await p.locator('#f_price_type').selectOption('fixed')
      await p.locator('#f_price_amount').fill('6000')
      await p.locator('#f_contact_phone').fill('9876543210')
      await p.waitForTimeout(400)
      await slice(p, `land-form-${vp}`)
      await p.close(); await ctx.close()
    }
    // B) Detail view of the 50-acre listing — "50 एकड़", village-only location.
    if (listingId) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/listing/${listingId}`)
      await p.getByText(/50 एकड़/).waitFor({ timeout: 10000 }).catch(() => {})
      await p.waitForTimeout(500)
      await slice(p, `land-detail-50acre-${vp}`)
      await p.close(); await ctx.close()
    }
  }
  await browser.close()
  await teardown(prof, listingId)
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
