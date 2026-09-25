// Phase 4 (0027 build) — PERMANENT backend/logic/static regression suite for the
// weather-vs-village split (Phase 1), the cache-miss live-fetch write-back (1b-i), the
// missing-mandi-rate handling (Phase 2), and the comparison cap 3→5 (Phase 3). Run:
//   node --env-file=.env scripts/test/p_0027_weather_split.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const weatherApi = read('src/lib/weather/weatherApiV2.js')
  const locStore = read('src/lib/location/locationStore.js')
  const shared = read('src/components/pages/shared.jsx')
  const mausam = read('src/screens/Mausam.jsx')
  const msp = read('src/screens/Msp.jsx')
  const home = read('src/screens/Homepage.jsx')
  const fasal = read('src/screens/FasalSalah.jsx')
  const nearby = read('src/lib/listings/nearbyCounts.js')

  // ---------- Phase 1: weather is global; village features gate on matchedVillage ----------
  ok('weather path has a live global Open-Meteo fetch (fetchLiveWeatherCell)', /fetchLiveWeatherCell/.test(weatherApi) && /api\.open-meteo\.com\/v1\/forecast/.test(weatherApi))
  ok('weather does NOT serve a far cached cell (nearby last-resort guarded by distance)', /bestD\s*>\s*30/.test(weatherApi))
  ok('locationStore.initialLocation returns the split shape (rawCoords + matchedVillage)', /rawCoords:\s*null/.test(locStore) && /matchedVillage:\s*\{/.test(locStore))
  ok('LocationControl ALWAYS commits rawCoords on GPS + gates matchedVillage', /rawCoords:\s*\{\s*latitude,\s*longitude\s*\}/.test(shared) && /matchedVillage:\s*inArea\s*\?/.test(shared))
  ok('LocationControl debug surfaces raw lat/lng + accuracy + timestamp (1e)', /accuracy/.test(shared) && /timestamp/.test(shared) && /geo-debug/.test(shared))
  ok('Mausam weather consumes rawCoords (not the village match)', /loc\.rawCoords\?\.latitude/.test(mausam))
  ok('FasalSalah weather consumes rawCoords', /loc\.rawCoords\?\.latitude/.test(fasal))
  ok('Homepage weather uses rawCoords; counts/feed use matchedVillage', /const weatherCoords = loc\.rawCoords/.test(home) && /fetchNearbyCounts\(vpin/.test(home))
  ok('Msp mandi-ranking center is village-anchored (matchedVillage)', /loc\.matchedVillage\?\.pincode/.test(msp) && /setCenter\(null\)/.test(msp))
  ok('nearbyCounts returns zeros for a missing pincode (no silent Khurai fallback)', /!\/\^\\d\{6\}\$\/\.test\(pin\)/.test(nearby) && /return zero/.test(nearby))

  // 1b-i — the anon write-back RPC works for a genuinely NEW cell (not one the cron seeded).
  const testKey = '9.9_9.9'
  await db.from('weather_cache_v2').delete().eq('grid_key', testKey) // ensure absent
  const { error: rpcErr } = await anon.rpc('cache_weather_cell', {
    p_grid_key: testKey, p_lat: 9.9, p_lon: 9.9,
    p_current: { temp: 30, weathercode: 1 }, p_hourly: [], p_daily: [{ date: '2026-09-25', tmax: 31 }],
  })
  ok('1b-i: anon cache_weather_cell RPC writes a new cell', !rpcErr, rpcErr?.message || '')
  const { data: back } = await anon.from('weather_cache_v2').select('grid_key,current').eq('grid_key', testKey).maybeSingle()
  ok('1b-i: written cell is read-back-able (subsequent visits benefit)', back?.grid_key === testKey && back?.current?.temp === 30)
  await db.from('weather_cache_v2').delete().eq('grid_key', testKey) // cleanup

  // 1b-i regression guard: the RPC rejects a malformed grid key.
  const { error: badErr } = await anon.rpc('cache_weather_cell', { p_grid_key: 'not-a-grid', p_lat: 9.9, p_lon: 9.9, p_current: {}, p_hourly: [], p_daily: [] })
  ok('1b-i: RPC rejects a malformed grid key', !!badErr)

  // 1g — recent chips carry BOTH values (store + repopulate).
  ok('recent locations carry rawCoords + matchedVillage (1g)', /rawCoords:\s*loc\.rawCoords/.test(locStore) && /matchedVillage:\s*loc\.matchedVillage/.test(locStore))

  // ---------- Phase 1 regression: village-anchored 100km gate intact ----------
  const distance = read('src/lib/distance.js')
  ok('SERVICE_AREA_KM threshold still exists', /SERVICE_AREA_KM\s*=\s*100/.test(locStore))
  ok('geofencing partitionByRadius / RADIUS_KM unchanged (mega-prompt build)', /RADIUS_KM\s*=\s*30/.test(distance) && /partitionByRadius/.test(distance))

  // ---------- Phase 2: missing mandi rates ----------
  const { data: rows } = await db.from('mandi_prices').select('commodity_hi,commodity_en,market,price_date')
  const byCommodity = {}
  for (const r of rows || []) { (byCommodity[r.commodity_en] ||= new Set()).add(r.market) }
  ok('2a: wheat has price data in ≥1 mandi', (byCommodity.Wheat?.size || 0) >= 1, `${byCommodity.Wheat?.size || 0} mandis`)
  // A commodity present in the CROPS list but with ZERO rows anywhere → the 2c honest-note case.
  const tracked = ['Wheat', 'Soyabean', 'Gram', 'Masur (Lentil)', 'Lentil', 'Moong', 'Urad', 'Paddy(Dhan)(Common)', 'Maize', 'Mustard', 'Garlic']
  const absentEver = tracked.filter((c) => !byCommodity[c] && c === 'Urad')
  ok('2c: at least one tracked commodity is genuinely absent (drives the honest note)', !byCommodity.Urad, `Urad mandis=${byCommodity.Urad?.size || 0}`)
  ok('2b: cross-mandi hint wired (uses snapshot + mandi_hint_elsewhere)', /cross-mandi-hint/.test(msp) && /mandi_hint_elsewhere/.test(msp))
  ok('2c: honest absent note wired (absent-note + mandi_absent_note)', /absent-note/.test(msp) && /mandi_absent_note/.test(msp))

  // ---------- Phase 3: comparison cap 3→5 ----------
  ok('3a: selection cap is 5 (blocks the 6th)', /prev\.length\s*>=\s*5/.test(msp))
  ok('3c: auto-nearest default picks up to 5', /\.slice\(0,\s*5\)/.test(msp))
  const strings = read('src/lib/i18n/strings.js')
  ok('3a: copy updated to "अधिकतम 5 मंडी"', /अधिकतम 5 मंडी/.test(strings))
  ok('3b: comparison keeps the sticky commodity column', /sticky left-0/.test(msp))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
