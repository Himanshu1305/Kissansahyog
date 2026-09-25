// Phase 4 (0028 build) — PERMANENT tests for location naming: reverse geocoding (Phase 1),
// the Cloudflare IP-city Pages Function + fall-through (Phase 2), and the guarantee that raw
// coordinates never appear in a non-debug user-facing view. Run:
//   node --env-file=.env scripts/test/p_0028_location_naming.mjs
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const headers = read('public/_headers')
  const locStore = read('src/lib/location/locationStore.js')
  const shared = read('src/components/pages/shared.jsx')
  const geoFn = read('functions/geo.js')

  // ---------- Phase 1: reverse geocoding ----------
  ok('1a-i: CSP connect-src allows api.bigdatacloud.net', /connect-src[^;]*https:\/\/api\.bigdatacloud\.net/.test(headers))
  ok('1a: reverseGeocode calls BigDataCloud keyless reverse-geocode-client', /bigdatacloud\.net\/data\/reverse-geocode-client/.test(locStore) && /localityLanguage=hi/.test(locStore))
  ok('1b: detect() reverse-geocodes + stores placeName in rawCoords', /reverseGeocode\(latitude, longitude\)/.test(shared) && /placeName: inArea \? null : placeName/.test(shared))
  ok('1a-ii: in-area keeps matchedVillage name (only far coords are geocoded)', /let placeName = inArea \? near\.village_town : null/.test(shared))
  ok('1c: geocode failure falls back to nearest village / generic, never raw coords', /loc_near_approx/.test(shared) && /loc_your_location/.test(shared))
  ok('1d: reverse-geocode result is session-cached', /geocodeCache/.test(locStore))

  // POSITIVE (live contract): BigDataCloud resolves the confirmed Hyderabad coords to a city.
  try {
    const r = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=17.4665837&longitude=78.3116609&localityLanguage=hi', { signal: AbortSignal.timeout(10000) })
    const d = await r.json()
    const name = d.city || d.locality
    ok('1a positive: Hyderabad coords resolve to a city name', !!name && /हैदराबाद|Hyderabad/i.test(`${d.city} ${d.locality} ${d.principalSubdivision}`), `${name}`)
  } catch (e) {
    ok('1a positive: Hyderabad coords resolve to a city name', false, `network: ${e.message}`)
  }

  // ---------- Phase 2: Cloudflare IP city ----------
  ok('2a: functions/geo.js is a Pages Function reading request.cf', /onRequest/.test(geoFn) && /request\.cf/.test(geoFn) && /city/.test(geoFn))
  ok('2a: /geo returns JSON (city/lat/lng)', /application\/json/.test(geoFn) && /latitude/.test(geoFn) && /longitude/.test(geoFn))
  ok('2b: fetchIpCity calls /geo and is session-cached', /fetch\('\/geo'/.test(locStore) && /ipCityCache/.test(locStore))
  ok('2b: LocationControl shows the soft IP suggestion (loc_ip_maybe + ip-suggest)', /loc_ip_maybe/.test(shared) && /ip-suggest/.test(shared))
  ok('2c: GPS detect discards the IP guess (setIpSuggest(null))', /setIpSuggest\(null\)/.test(shared))
  ok('2d: fetchIpCity falls through to null on failure (no error surfaced)', /catch\s*\{\s*ipCityCache = null;?\s*return null/.test(locStore.replace(/\n/g, ' ')))

  // ---------- Phase 3: manual pincode still present ----------
  ok('3a: manual pincode input still present (pincode-input) + apply', /data-testid="pincode-input"/.test(shared) && /applyPincode/.test(shared))
  ok('3a: ordered choice copy (precise GPS / IP / or-pincode)', /loc_precise/.test(shared) && /loc_or_pincode/.test(shared))

  // ---------- Raw coordinates NEVER shown outside ?debug=1 ----------
  // Raw lat/lng may appear only in the geo-debug overlay. Screens must show placeName/label.
  const coordPair = /\$\{[^}]*(latitude|longitude|\.lat|\.lng)[^}]*\},\s*\$\{[^}]*(latitude|longitude|\.lat|\.lng)/
  for (const f of ['src/screens/Mausam.jsx', 'src/screens/Homepage.jsx', 'src/screens/Msp.jsx', 'src/screens/FasalSalah.jsx']) {
    ok(`no raw-coord display in ${f.split('/').pop()}`, !coordPair.test(read(f)))
  }
  // In shared.jsx the ONLY coord-pair template must be inside the geo-debug block.
  const sharedMatches = [...shared.matchAll(new RegExp(coordPair, 'g'))]
  const debugBlock = shared.slice(shared.indexOf('geo-debug'), shared.indexOf('geo-debug') + 300)
  ok('shared.jsx raw-coord template exists only in the geo-debug overlay', /debug\.lat.*debug\.lng/.test(debugBlock) && sharedMatches.length === 1)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
