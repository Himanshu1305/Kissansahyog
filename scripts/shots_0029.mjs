// Part A Phase 5 (0029) screenshots — village geocoding UX. Preview on :4173.
//   node --env-file=.env scripts/shots_0029.mjs
// Captures: (A) listing form village-name input + autocomplete, (B) post-success
// "आपकी जगह की पुष्टि हो रही है" pending note for a brand-new village, (C) a Browse
// card showing an ACCURATE distance for a freshly-geocoded non-pilot village.
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-0029'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const KHURAI = { latitude: 24.045, longitude: 78.33 }
const DEMO = { latitude: 24.16, longitude: 78.28 } // ~14 km NW of Khurai — a fresh non-pilot demo village

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
  // A logged-in test farmer located at Khurai.
  const phone = '9000000292'
  let { data: prof } = await db.from('profiles').select('*').eq('phone', phone).maybeSingle()
  if (!prof) {
    const { data } = await db.from('profiles').insert({ full_name: 'शॉट किसान', phone, village_town: 'Khurai', pincode: '470117', latitude: KHURAI.latitude, longitude: KHURAI.longitude, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), is_test_data: true }).select('*').single()
    prof = data
  }
  // A freshly-geocoded non-pilot village + an equipment listing anchored to it (cache hit → accurate coords).
  await db.from('village_coordinates').delete().eq('village_name', 'Demopur')
  await db.from('village_coordinates').insert({ village_name: 'Demopur', district: 'Sagar', latitude: DEMO.latitude, longitude: DEMO.longitude, status: 'resolved', source: 'shot-seed', resolved_at: new Date().toISOString() })
  const { data: listing } = await db.rpc('create_listing', { p_actor_id: prof.id, p_listing_type: 'offer', p_category: 'equipment', p_details: { equipment_type_id: 1, rental_basis: 'per_hour', rate_amount: '600', available_now: true }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Demopur' })
  return { prof, listingId: listing?.id }
}

async function teardown(prof, listingId) {
  if (listingId) await db.from('listings').delete().eq('id', listingId)
  await db.from('listings').delete().eq('user_id', prof.id)
  await db.from('village_coordinates').delete().eq('source', 'shot-seed')
  await db.from('village_coordinates').delete().eq('village_name', 'Demopur')
  await db.from('village_coordinates').delete().like('village_name', 'Testpur %')
}

async function run() {
  const { prof, listingId } = await setup()
  const session = { ...prof }
  const browser = await chromium.launch()
  for (const [vp, w, h] of [['d', 1280, 800], ['m', 375, 812]]) {
    // A) Listing form — village-name input with autocomplete (no pincode).
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/post`)
      await p.getByRole('button', { name: /आगे बढ़ें/ }).click()
      await p.getByRole('button', { name: /दे रहे हैं/ }).click()
      await p.getByRole('button', { name: /मशीन/ }).first().click()
      await p.locator('#f_asset_village').waitFor({ timeout: 8000 })
      await p.locator('#f_asset_village').fill('Kh')
      await p.waitForTimeout(400)
      await slice(p, `post-village-form-${vp}`)
      await p.close(); await ctx.close()
    }
    // B) Post a brand-new village → success screen pending note (desktop enough).
    if (vp === 'd') {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
      // /geocode is a Pages Function absent under vite preview — stub it so the drain worker no-ops cleanly.
      await ctx.route('**/geocode**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ found: false }) }))
      const p = await ctx.newPage()
      await p.goto(`${BASE}/post`)
      await p.getByRole('button', { name: /आगे बढ़ें/ }).click()
      await p.getByRole('button', { name: /दे रहे हैं/ }).click()
      await p.getByRole('button', { name: /मशीन/ }).first().click()
      await p.locator('#f_equipment_type_id').waitFor({ timeout: 8000 })
      await p.locator('#f_equipment_type_id').selectOption({ index: 1 })
      await p.locator('#f_rental_basis').selectOption({ index: 1 })
      await p.locator('#f_rate_amount').fill('500')
      await p.locator('#f_asset_village').fill(`Testpur ${Date.now() % 100000}`)
      await p.getByRole('button', { name: /जमा करें/ }).click()
      await p.getByTestId('pending-geocode-note').waitFor({ timeout: 12000 })
      await p.waitForTimeout(400)
      await slice(p, `post-pending-note-${vp}`)
      await p.close(); await ctx.close()
    }
    // C) Browse — a card for the non-pilot village Bandri showing an accurate ~14 km distance.
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/browse?cat=equipment`)
      await p.getByTestId('listing-card').first().waitFor({ timeout: 10000 }).catch(() => {})
      await p.waitForTimeout(600)
      await slice(p, `browse-distance-${vp}`)
      await p.close(); await ctx.close()
    }
  }
  await browser.close()
  await teardown(prof, listingId)
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
