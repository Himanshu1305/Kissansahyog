// Phase 4 (0026 build) — PERMANENT backend/logic/static regression suite for: the
// out-of-service-area distance-sanity threshold (Phase 1), the mandi comparison data +
// cap (Phase 2), and the staleness rule (Phase 3). Run:
//   node --env-file=.env scripts/test/p_0026_location_compare.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { haversineKm } from '../../src/lib/distance.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

// Read the two source files whose constants/logic we assert against.
const locStore = readFileSync(new URL('../../src/lib/location/locationStore.js', import.meta.url), 'utf8')
const shared = readFileSync(new URL('../../src/components/pages/shared.jsx', import.meta.url), 'utf8')

function nearest(lat, lng, pins) {
  let best = null, bestD = Infinity
  for (const p of pins) {
    if (p.latitude == null || p.longitude == null) continue
    const d = haversineKm(lat, lng, Number(p.latitude), Number(p.longitude))
    if (d < bestD) { bestD = d; best = { ...p, distanceKm: d } }
  }
  return best
}

async function main() {
  // ---------- Phase 1: distance-sanity threshold ----------
  const m = locStore.match(/SERVICE_AREA_KM\s*=\s*(\d+)/)
  const THRESH = m ? Number(m[1]) : null
  ok('Phase 1: locationStore exports SERVICE_AREA_KM', THRESH != null, 'not found')
  ok('Phase 1: threshold is a sane service radius (50–200 km)', THRESH >= 50 && THRESH <= 200, `=${THRESH}`)
  ok('Phase 1: LocationControl compares nearest distance to SERVICE_AREA_KM', /distanceKm\s*>\s*SERVICE_AREA_KM/.test(shared))
  ok('Phase 1: LocationControl forces a fresh fix (maximumAge: 0, enableHighAccuracy: true)',
    /maximumAge:\s*0/.test(shared) && /enableHighAccuracy:\s*true/.test(shared))
  ok('Phase 1: debug overlay is gated by ?debug=1', /debug=1/.test(shared))
  ok('Phase 1: honest out-of-area message string is wired (loc_out_of_area)', /loc_out_of_area/.test(shared))

  const { data: pins } = await db.from('pincodes').select('pincode,village_town,latitude,longitude')
  // NEGATIVE: a genuinely far user (Hyderabad) — nearest seeded village must be BEYOND
  // the threshold, so the UI shows the honest message instead of substituting silently.
  const hyd = nearest(17.385, 78.487, pins)
  ok('Phase 1 negative: Hyderabad nearest seeded village is beyond the threshold',
    hyd && hyd.distanceKm > THRESH, hyd ? `${hyd.village_town} ${Math.round(hyd.distanceKm)}km` : 'none')
  // POSITIVE: a genuinely local user (near Khurai) — nearest village is WITHIN threshold.
  const local = nearest(24.05, 78.34, pins)
  ok('Phase 1 positive: a Khurai-area location matches a village within the threshold',
    local && local.distanceKm <= THRESH, local ? `${local.village_town} ${Math.round(local.distanceKm)}km` : 'none')

  // ---------- Phase 2: comparison data + cap logic ----------
  // fetchMandiMarketsWithDistrict-equivalent: DISTINCT market non-empty.
  const { data: mkRows } = await db.from('mandi_prices').select('market,district').limit(5000)
  const markets = [...new Set((mkRows || []).map((r) => r.market))]
  ok('Phase 2: DISTINCT market list non-empty', markets.length >= 3, `${markets.length}`)

  // fetchMandiForMarkets-equivalent: latest price per (commodity, market) for up to 3.
  const pick3 = markets.slice(0, 3)
  const { data: cmp } = await db.from('mandi_prices').select('commodity_en,market,modal_price,price_date').in('market', pick3).order('price_date', { ascending: false }).limit(5000)
  const by = {}
  for (const r of cmp || []) { if (r.modal_price == null) continue; const k = `${r.commodity_en}||${r.market}`; if (by[k] === undefined) by[k] = { p: Number(r.modal_price), d: r.price_date } }
  ok('Phase 2: comparison map has ≥1 (commodity,market) cell for 3 mandis', Object.keys(by).length >= 1, `${Object.keys(by).length}`)
  // no duplicate/older overwrite: every stored date is the max for its key
  let latestOk = true
  for (const r of cmp || []) { const k = `${r.commodity_en}||${r.market}`; if (by[k] && r.price_date > by[k].d) latestOk = false }
  ok('Phase 2: each cell holds the LATEST date (no stale overwrite)', latestOk)

  // Cap: the toggle blocks a 4th selection (source-level assertion of the guard).
  const msp = readFileSync(new URL('../../src/screens/Msp.jsx', import.meta.url), 'utf8')
  ok('Phase 2: selection cap present (prev.length >= 3 blocks the 4th)', /prev\.length\s*>=\s*3/.test(msp))
  ok('Phase 2: auto-nearest default when nothing selected (effectiveMandis)', /selectedMandis\.length\s*\?\s*selectedMandis\s*:\s*autoNearest/.test(msp))
  ok('Phase 2: best-price highlight computed across columns (compare-best)', /compare-best/.test(msp))
  ok('Phase 2: commodity column is sticky for mobile scroll', /sticky left-0/.test(msp))

  // ---------- Phase 3: staleness rule ----------
  ok('Phase 3: priceStaleness classifies today/yesterday as fresh, older as stale',
    /days\s*<=\s*1\s*\?\s*'fresh'\s*:\s*'stale'/.test(shared))
  ok('Phase 3: missing price renders "—" with a not-recorded tooltip', /mandi_not_recorded/.test(shared) && /price-missing/.test(shared))
  ok('Phase 3: stale tag component present', /StaleTag/.test(shared) && /mandi_stale/.test(shared))
  // Data sanity: there exist both fresh and stale-eligible dates so the tag is reachable.
  const { data: dates } = await db.from('mandi_prices').select('price_date').order('price_date', { ascending: false }).limit(500)
  const uniqDates = [...new Set((dates || []).map((r) => r.price_date))]
  ok('Phase 3: DB has ≥2 distinct price dates (fresh + older exist for the tag)', uniqDates.length >= 2, `${uniqDates.length}`)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
