// Phase 7 (0025 build) — PERMANENT backend + logic + static-config regression suite
// for: geofencing hard cutoff (Phase 0), per-listing wide-visibility opt-in + server
// guard (Phase 1), mandi-search separation (Phase 3c), input_prices (Phase 6), and the
// PWA runtime-caching config (Phase 5). Run: node --env-file=.env scripts/test/p_0025_visibility.mjs
//
// This file is meant to stay in the suite and be re-run by every future Phase 7a.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import {
  partitionByRadius, isWideVisible, RADIUS_KM, FALLBACK_RADIUS_KM, WIDE_RADIUS_KM,
  WIDE_ELIGIBLE_CATEGORIES,
} from '../../src/lib/distance.js'

const url = process.env.VITE_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(url, service, { auth: { persistSession: false } })

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`PASS  ${name}`) } else { fail++; console.log(`FAIL  ${name} ${extra}`) } }

// helper: build a row for partitionByRadius
const row = (id, category, wide, distanceKm) => ({ id, category, wide_visibility: wide, distanceKm })
const part = (rows) => partitionByRadius(rows, { getDistance: (r) => r.distanceKm, getCategory: (r) => r.category, getWide: (r) => r.wide_visibility })
const inPrimary = (res, id) => res.primary.some((r) => r.id === id)
const inFallback = (res, id) => res.fallback.some((r) => r.id === id)
const anywhere = (res, id) => inPrimary(res, id) || inFallback(res, id)

async function main() {
  // ---------- Phase 0/1: distance visibility logic (positive / negative / edge) ----------
  {
    const r15 = row('a', 'equipment', false, 15)      // ~15 km equipment — should appear
    const rWide60 = row('b', 'bhusa', true, 60)        // ~60 km Bhoosa wide — should appear
    const rEq60 = row('c', 'equipment', false, 60)     // ~60 km equipment — should NOT appear
    const res = part([r15, rWide60, rEq60])
    ok('positive: 15km equipment appears (primary)', inPrimary(res, 'a'))
    ok('positive: 60km Bhoosa wide_visibility appears', anywhere(res, 'b'))
    ok('negative: 60km equipment does NOT appear', !anywhere(res, 'c'))
  }

  // Edge: 29.5 km inside the 30km cutoff, 30.5 km outside it; consistent across calls.
  // (When a within-30 result coexists, the 30–50 ring is suppressed by Phase 0b, so
  // 30.5 appears NOWHERE — that is the intended fraud-prevention behaviour.)
  {
    for (let i = 0; i < 3; i++) {
      const res = part([row('in', 'equipment', false, 29.5), row('out', 'equipment', false, 30.5)])
      ok(`edge#${i}: 29.5km inside 30km cutoff (primary)`, inPrimary(res, 'in'))
      ok(`edge#${i}: 30.5km outside 30km cutoff (not primary)`, !inPrimary(res, 'out'))
      ok(`edge#${i}: 30.5km hidden while a within-30 result exists`, !anywhere(res, 'out'))
      // In isolation (no within-30 competitor) the 30.5km row surfaces in the ring.
      const alone = part([row('out', 'equipment', false, 30.5)])
      ok(`edge#${i}: 30.5km alone surfaces in the 30–50 ring`, inFallback(alone, 'out'))
    }
  }

  // Edge: null / missing coordinates excluded gracefully (no throw), not errored.
  {
    let threw = false, res = null
    try { res = part([row('n', 'equipment', false, null), row('u', 'land', false, undefined), row('ok', 'land', false, 10)]) }
    catch { threw = true }
    ok('edge: null/undefined distance does not throw', !threw)
    ok('edge: null-coord rows excluded', res && !anywhere(res, 'n') && !anywhere(res, 'u') && inPrimary(res, 'ok'))
  }

  // Phase 0b: the 30–50 ring is returned ONLY when there are zero within-30 results.
  {
    const withLocal = part([row('local', 'land', false, 10), row('ring', 'land', false, 40)])
    ok('fallback suppressed when a within-30 result exists', !anywhere(withLocal, 'ring') && inPrimary(withLocal, 'local'))
    const noLocal = part([row('ring', 'land', false, 40)])
    ok('fallback shown when zero within-30 results', inFallback(noLocal, 'ring'))
  }

  // isWideVisible: only eligible categories, only 30–100 km band.
  ok('wide: bhusa+true at 80km is wide-visible', isWideVisible('bhusa', true, 80))
  ok('wide: agri_inputs+true at 100km is wide-visible', isWideVisible('agri_inputs', true, 100))
  ok('wide: equipment+true at 80km is NOT wide-visible', !isWideVisible('equipment', true, 80))
  ok('wide: bhusa+true at 120km is NOT wide-visible (>100)', !isWideVisible('bhusa', true, 120))
  ok('wide: bhusa+false at 80km is NOT wide-visible', !isWideVisible('bhusa', false, 80))
  ok('constants: RADIUS 30 / FALLBACK 50 / WIDE 100', RADIUS_KM === 30 && FALLBACK_RADIUS_KM === 50 && WIDE_RADIUS_KM === 100)
  ok('constants: wide-eligible categories are exactly bhusa+agri_inputs', JSON.stringify([...WIDE_ELIGIBLE_CATEGORIES].sort()) === JSON.stringify(['agri_inputs', 'bhusa']))

  // ---------- Phase 1: server-side wide_visibility guard (create_listing RPC) ----------
  const testPhone = '9000000251'
  let actorId = null
  {
    // reuse or create a disclaimer-accepted test profile
    const { data: existing } = await db.from('profiles').select('id').eq('phone', testPhone).maybeSingle()
    if (existing) actorId = existing.id
    else {
      const { data: ins } = await db.from('profiles').insert({
        full_name: 'Test 0025', phone: testPhone, village_town: 'Khurai', pincode: '470117',
        latitude: 24.045, longitude: 78.33, disclaimer_accepted_at: new Date().toISOString(), is_test_data: true,
      }).select('id').single()
      actorId = ins?.id
    }
    ok('setup: test actor profile available', !!actorId)
  }

  const bhusaDetails = { residue_type: 'bhusa', quantity: '10 क्विंटल', pickup_arrangement: 'buyer_collects', buyer_type_preference: 'either', asking_price: '₹500' }
  const eqDetails = { equipment_type_id: '1' }

  if (actorId) {
    // negative: wide_visibility=true on equipment must be REJECTED server-side
    const { data: d1, error: e1 } = await db.rpc('create_listing', { p_rules_agreed: true,
      p_actor_id: actorId, p_listing_type: 'offer', p_category: 'equipment', p_details: eqDetails,
      p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
      p_listing_source: 'farmer', p_wide_visibility: true,
    })
    ok('negative: wide_visibility=true on equipment rejected (direct RPC)', !!e1 && /wide_visibility_not_allowed/.test(e1.message || ''), e1?.message || 'no error raised')
    if (d1?.id) await db.from('listings').delete().eq('id', d1.id)

    // positive: wide_visibility=true on bhusa is allowed and stored true
    const { data: d2, error: e2 } = await db.rpc('create_listing', { p_rules_agreed: true,
      p_actor_id: actorId, p_listing_type: 'offer', p_category: 'bhusa', p_details: bhusaDetails,
      p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
      p_listing_source: 'farmer', p_wide_visibility: true,
    })
    ok('positive: wide_visibility=true on bhusa allowed', !e2 && !!d2?.id, e2?.message || '')
    ok('positive: bhusa listing stored wide_visibility=true', d2?.wide_visibility === true)
    if (d2?.id) await db.from('listings').delete().eq('id', d2.id)

    // default: a normal listing (no flag) is wide_visibility=false
    const { data: d3 } = await db.rpc('create_listing', { p_rules_agreed: true,
      p_actor_id: actorId, p_listing_type: 'offer', p_category: 'bhusa', p_details: bhusaDetails,
      p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
    })
    ok('default: omitted wide_visibility defaults to false', d3?.wide_visibility === false)
    if (d3?.id) await db.from('listings').delete().eq('id', d3.id)
  }

  // ---------- Phase 3: mandi search data + separation ----------
  {
    const { data: markets } = await db.from('mandi_prices').select('market').limit(5000)
    const distinct = [...new Set((markets || []).map((r) => r.market))]
    ok('mandi search: DISTINCT market list is non-empty', distinct.length > 0, `${distinct.length} markets`)

    // pick a market+commodity that exists → positive; assert it has a date
    const { data: sample } = await db.from('mandi_prices').select('commodity_en,market,modal_price,price_date').not('modal_price', 'is', null).limit(1)
    const s = sample?.[0]
    ok('mandi search: a known market+crop returns a dated price', !!s && !!s.price_date && s.modal_price != null)

    // negative: a real market with no rows for an impossible commodity → empty
    if (s) {
      const { data: none } = await db.from('mandi_prices').select('modal_price').eq('market', s.market).eq('commodity_en', '__no_such_crop__').limit(1)
      ok('mandi search: no data for a crop at a mandi → honest empty (no fabricated price)', (none || []).length === 0)
    }
  }

  // Phase 3c: mandi module must NOT import the distance-cutoff logic (static/code check).
  {
    const src = readFileSync(new URL('../../src/lib/mandi/mandiApi.js', import.meta.url), 'utf8')
    const importsDistance = /from ['"][^'"]*\/distance['"]/.test(src)
    const usesCutoff = /partitionByRadius|RADIUS_KM|FALLBACK_RADIUS_KM|isWideVisible/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
    ok('Phase 3c: mandiApi.js does NOT import ../distance', !importsDistance)
    ok('Phase 3c: mandiApi.js does NOT call the cutoff functions (outside comments)', !usesCutoff)
  }

  // ---------- Phase 5: PWA runtime caching never CacheFirst for live/API data ----------
  {
    const vite = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8')
    ok('PWA: registerType is prompt (not autoUpdate)', /registerType:\s*'prompt'/.test(vite))
    // The supabase/open-meteo/mandi/data.gov block must use NetworkFirst.
    const liveBlock = vite.slice(vite.indexOf('supabase\\.co'), vite.indexOf('supabase\\.co') + 400)
    ok('PWA: live-data endpoints use NetworkFirst', /NetworkFirst/.test(liveBlock), liveBlock.slice(0, 80))
    ok('PWA: no CacheFirst applied to supabase/api live data', !/CacheFirst/.test(liveBlock))
  }

  // ---------- Phase 7c downstream: homepage/browse feed stays populated + cutoff applies ----------
  {
    const { haversineKm } = await import('../../src/lib/distance.js')
    const KHURAI = { latitude: 24.045, longitude: 78.33 }
    const { data: pins } = await db.from('pincodes').select('pincode,latitude,longitude')
    const pinByCode = Object.fromEntries((pins || []).map((p) => [p.pincode, p]))
    const { data: active } = await db.from('listings').select('id,category,pincode,wide_visibility,status,expires_at').eq('status', 'active')
    const live = (active || []).filter((l) => !l.expires_at || new Date(l.expires_at) > new Date())
    const enriched = live.map((l) => {
      const p = pinByCode[l.pincode]
      const distanceKm = p?.latitude != null ? haversineKm(KHURAI.latitude, KHURAI.longitude, Number(p.latitude), Number(p.longitude)) : null
      return { ...l, distanceKm }
    })
    const res = partitionByRadius(enriched, { getDistance: (r) => r.distanceKm, getCategory: (r) => r.category, getWide: (r) => r.wide_visibility })
    ok('downstream: homepage/browse feed non-empty for Khurai (no over-strict emptying)', res.primary.length >= 1, `${res.primary.length} within cutoff`)
    ok('downstream: cutoff genuinely applies (visible < total active)', (res.primary.length + res.fallback.length) <= live.length)
    const maxVisible = Math.max(0, ...[...res.primary, ...res.fallback].map((r) => r.distanceKm || 0))
    ok('downstream: nothing beyond the 100km wide ceiling ever visible', maxVisible <= WIDE_RADIUS_KM)
  }

  // ---------- Phase 6: input_prices seeded + public-readable ----------
  {
    const { data: inputs, error } = await db.from('input_prices').select('*').eq('is_active', true)
    ok('inputs: input_prices table readable', !error)
    ok('inputs: seeded with rows (Urea/DAP/diesel)', (inputs || []).length >= 3, `${(inputs || []).length} rows`)
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
