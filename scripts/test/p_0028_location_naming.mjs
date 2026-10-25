// Phase 4 (0028 build) — PERMANENT tests for location naming, rewritten for the Batch 7L-1
// location flow: a device position near a listed place is named from the places list, a far
// one by BigDataCloud reverse geocoding (Phase 1); the Cloudflare IP-city guess is no longer
// used (Phase 2); there is no pincode box (Phase 3); and raw coordinates never appear in a
// user-facing view. Static checks plus one live BigDataCloud call; no database. Run:
//   node scripts/test/p_0028_location_naming.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((n) => (statSync(join(ROOT, dir, n)).isDirectory() ? walk(`${dir}/${n}`) : [`${dir}/${n}`]))
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '')

async function main() {
  const headers = read('public/_headers')
  const locStore = read('src/lib/location/locationStore.js')
  const provider = read('src/lib/location/LocationProvider.jsx')
  const control = read('src/components/location/LocationControl.jsx')
  const shared = read('src/components/pages/shared.jsx')
  const srcAll = walk('src').filter((f) => /\.(js|jsx)$/.test(f)).map((f) => noComments(read(f))).join('\n')

  // ---------- Phase 1: naming a device position ----------
  ok('1a-i: CSP connect-src allows api.bigdatacloud.net', /connect-src[^;]*https:\/\/api\.bigdatacloud\.net/.test(headers))
  ok('1a: reverseGeocode calls BigDataCloud keyless reverse-geocode-client', /bigdatacloud\.net\/data\/reverse-geocode-client/.test(locStore) && /localityLanguage=hi/.test(locStore))
  ok('1b: a device fix near a listed place is named from the places list', /nearestPlace\(pos\.lat, pos\.lng, list\)/.test(provider) && /near\.km <= NAME_WITHIN_KM \? placeName\(near\.place, lang\) : null/.test(provider))
  ok('1a-ii: only a fix with no nearby listed place is reverse-geocoded', /if \(!label\) label = await reverseGeocode\(pos\.lat, pos\.lng\)/.test(provider))
  ok('1a-iii: the places list is awaited before naming (no needless outside call on load)', /await fetchPlaces\(\)/.test(provider))
  ok('1c: naming failure falls back to a generic label, never raw coords', /label: label \|\| ''/.test(provider) && /location\.label \|\| t\('loc_your_location'\)/.test(control))
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

  // ---------- Phase 2: the Cloudflare IP-city guess is no longer used ----------
  ok('2a: no client code calls the /geo IP-city function', !/fetch\(\s*['"`]\/geo['"`?]/.test(srcAll) && !/fetchIpCity|ipCityCache/.test(srcAll))
  ok('2b: no IP-city suggestion in the UI (loc_ip_maybe / ip-suggest)', !/loc_ip_maybe|ip-suggest/.test(srcAll))
  ok('2c: the pre-permission card is shown before any device call (Share / Not now)', /data-testid="location-prompt"/.test(control) && /data-testid="location-share"/.test(control) && /data-testid="location-not-now"/.test(control))
  ok('2d: the card is offered only when asking could still work', /canAskDevice: geolocationSupported\(\) && permission !== 'denied'/.test(provider))

  // ---------- Phase 3: no pincode; typed place, "Did you mean…?", picker ----------
  ok('3a: no pincode input in the location control or the shared page parts', !/pincode-input|applyPincode|loc_or_pincode/.test(control + shared))
  ok('3a: typed village/town box, "Did you mean…?" and the district → town picker are present',
    /data-testid="location-input"/.test(control) && /data-testid="location-did-you-mean"/.test(control) && /data-testid="location-picker"/.test(control))

  // ---------- Raw coordinates are NEVER shown ----------
  const coordPair = /\$\{[^}]*(latitude|longitude|\.lat|\.lng)[^}]*\},\s*\$\{[^}]*(latitude|longitude|\.lat|\.lng)/
  for (const f of ['src/screens/Mausam.jsx', 'src/screens/Homepage.jsx', 'src/screens/Msp.jsx', 'src/screens/FasalSalah.jsx', 'src/components/pages/shared.jsx', 'src/components/location/LocationControl.jsx']) {
    ok(`no raw-coord display in ${f.split('/').pop()}`, !coordPair.test(read(f)))
  }
  ok('the ?debug=1 raw-coordinate overlay is gone', !/geo-debug/.test(srcAll))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
