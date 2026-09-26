// Phase 8 screenshots — Combined Legal / Agro-Forestry / Availability / Profile.
//   node --env-file=.env scripts/shots_0032.mjs   (preview must be on :4173)
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-0032'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function slice(page, name) {
  const buf = await page.screenshot({ fullPage: true })
  const { width: W, height: H } = await sharp(buf).metadata()
  for (let top = 0, i = 0; top < H; top += 1100, i++) {
    const h = Math.min(1100, H - top)
    await sharp(buf).extract({ left: 0, top, width: W, height: h }).resize({ width: Math.min(W, 1000) }).jpeg({ quality: 72 }).toFile(`${OUT}/${name}__${String(i).padStart(2, '0')}.jpg`)
  }
}

async function setup() {
  // Use the real admin profile as the logged-in session (is_admin=true; owns the demo listing).
  const { data: admin } = await db.from('profiles').select('*').eq('is_admin', true).limit(1).single()
  // Give the admin a किसान profile so the profile fields show populated.
  await db.from('profiles').update({ land_acres: 8, main_crops: 'सोयाबीन, गेहूं', interest_lease: true, interest_equipment: false }).eq('id', admin.id)
  // A demo equipment offer owned by admin with recent interest → toggle + nudge both show.
  await db.from('listings').delete().eq('user_id', admin.id).eq('is_test_data', false).ilike('pincode', '470117')
  const { data: L } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: admin.id, p_listing_type: 'offer', p_category: 'equipment', p_details: { equipment_type_id: '1', rental_basis: 'per_day', rate_amount: '800', available_now: true }, p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer', p_village_name: 'Khurai' })
  if (L?.id) await db.from('listings').update({ contact_click_count: 4, last_contact_at: new Date().toISOString() }).eq('id', L.id)
  return { admin, listingId: L?.id }
}
async function teardown(admin, listingId) {
  if (listingId) await db.from('listings').delete().eq('id', listingId)
  await db.from('profiles').update({ land_acres: null, main_crops: null, interest_lease: false, interest_equipment: false }).eq('id', admin.id)
}

async function run() {
  const { admin, listingId } = await setup()
  const session = { ...admin }
  const browser = await chromium.launch()
  const VPS = [['d', 1280, 800], ['m', 375, 812]]

  for (const [vp, w, h] of VPS) {
    // Public pages (no session)
    const pub = await browser.newContext({ viewport: { width: w, height: h } })
    const pp = await pub.newPage()
    await pp.goto(`${BASE}/agro-forestry`); await pp.waitForTimeout(700); await slice(pp, `agro-forestry-${vp}`)
    await pp.goto(`${BASE}/articles/intercropping-madhya-pradesh`); await pp.waitForTimeout(700); await slice(pp, `article-${vp}`)
    if (vp === 'd') {
      await pp.goto(`${BASE}/yojana/fal-podharopan-yojana`); await pp.waitForTimeout(500); await slice(pp, 'scheme-fal')
      await pp.goto(`${BASE}/yojana/aushadhi-sugandhit-fasal-vistar`); await pp.waitForTimeout(500); await slice(pp, 'scheme-aushadhi')
    }
    await pub.close()

    // Buyer compliance modal (fresh browser, tap a card WhatsApp)
    const buyerCtx = await browser.newContext({ viewport: { width: w, height: h } })
    const bp = await buyerCtx.newPage()
    await bp.goto(`${BASE}/`)
    await bp.getByTestId('card-whatsapp').first().waitFor({ timeout: 15000 }).catch(() => {})
    await bp.getByTestId('card-whatsapp').first().click().catch(() => {})
    await bp.getByTestId('buyer-compliance-modal').waitFor({ timeout: 5000 }).catch(() => {})
    await bp.waitForTimeout(300); await slice(bp, `buyer-modal-${vp}`)
    await buyerCtx.close()

    // PWA install banner — Android (dispatch event) + iOS (UA)
    const andCtx = await browser.newContext({ viewport: { width: w, height: h } })
    const ap = await andCtx.newPage()
    await ap.goto(`${BASE}/`); await ap.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 }).catch(() => {})
    await ap.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt')))
    await ap.waitForTimeout(300); await slice(ap, `pwa-banner-android-${vp}`)
    await andCtx.close()
    const iosCtx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
    const ip = await iosCtx.newPage()
    await ip.goto(`${BASE}/`); await ip.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 }).catch(() => {})
    await ip.getByTestId('pwa-install-cta').click().catch(() => {})
    await ip.waitForTimeout(300); await slice(ip, `pwa-banner-ios-${vp}`)
    await iosCtx.close()

    // Logged-in (admin) pages
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), session)
    const p = await ctx.newPage()
    // rules-compliance checkbox on a listing form
    await p.goto(`${BASE}/post`)
    await p.getByRole('button', { name: /आगे बढ़ें/ }).click()
    await p.getByRole('button', { name: /दे रहे हैं/ }).click()
    await p.getByRole('button', { name: /मशीन/ }).first().click()
    await p.getByTestId('rules-agree-checkbox').waitFor({ timeout: 8000 }).catch(() => {})
    await p.waitForTimeout(300); await slice(p, `rules-checkbox-${vp}`)
    // My Listings: availability toggle + nudge
    await p.goto(`${BASE}/my`); await p.waitForTimeout(900); await slice(p, `my-listings-toggle-nudge-${vp}`)
    // किसान profile fields + disclaimer
    await p.goto(`${BASE}/profile`); await p.waitForTimeout(700); await slice(p, `kisan-profile-${vp}`)
    // Admin dashboard (from /admin) + profile entry visible on the profile shot above
    if (vp === 'd') {
      await p.goto(`${BASE}/admin`); await p.waitForTimeout(1200); await slice(p, 'admin-dashboard')
    }
    await ctx.close()
  }
  await browser.close()
  await teardown(admin, listingId)
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
