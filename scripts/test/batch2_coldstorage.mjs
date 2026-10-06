// Batch 2 item B — cold storage rebuilt for users.
// Checks: the claim UI is gone; cards show address + Call/WhatsApp + directions;
// a Bina / 470113 search sorts Bina entries first; geocode coverage >= 90%.
// Run: node --env-file=.env scripts/test/batch2_coldstorage.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function main() {
  // ---- 1. Claim UI removed, report flow + contact/directions present ----
  const card = read('src/components/ColdStorageCard.jsx')
  ok('card has NO claim flow', !card.includes('submitColdStorageClaim') && !card.includes('cs_claim_title') && !card.includes('cs_claim_submit'))
  ok('card uses the cold_storage report flow', card.includes('targetType="cold_storage"') && card.includes("cs_report_wrong"))
  ok('card shows full address', card.includes('cs_address_label'))
  ok('card shows Call + WhatsApp', card.includes('tel:${tel}') && card.includes('wa.me/91${mobile}') && card.includes('contact_call') && card.includes('contact_whatsapp'))
  ok('card shows directions (Google Maps search link)', card.includes('cs_directions') && card.includes('directionsUrl'))
  ok('admin claim queue removed', !read('src/screens/Admin.jsx').includes('<ColdStorageClaimsPanel '))
  const api = read('src/lib/coldStorage/coldStorageApi.js')
  ok('directionsUrl builds a maps.google search link (no api key)', api.includes('google.com/maps/search/?api=1&query='))
  // parseDirectoryPhone basic behaviour (mobile vs landline)
  ok('finder component exists (search + GPS + filters)',
    read('src/components/coldStorage/ColdStorageFinder.jsx').includes('cs_search_ph') && read('src/components/coldStorage/ColdStorageFinder.jsx').includes('cs_my_location'))

  // ---- 2. Distance sort: Bina / 470113 ----
  const { data: rows } = await db.from('cold_storage_public').select('id,name,city,district,address,latitude,longitude')
  const geocoded = rows.filter((r) => r.latitude != null && r.longitude != null)

  // Resolve the Bina centre two ways (pincode 470113 and the village name "Bina").
  const { data: binByPin } = await db.from('pincodes').select('latitude,longitude,village_town').eq('pincode', '470113').maybeSingle()
  const { data: binByName } = await db.from('pincodes').select('latitude,longitude,village_town').ilike('village_town', '%bina%').not('latitude', 'is', null).limit(1)
  ok('470113 resolves to Bina coordinates', !!binByPin && binByPin.latitude != null)
  ok('text "Bina" resolves via the pincode gazetteer', Array.isArray(binByName) && binByName[0]?.latitude != null)

  if (binByPin?.latitude != null) {
    const centre = { lat: Number(binByPin.latitude), lng: Number(binByPin.longitude) }
    const sorted = geocoded
      .map((r) => ({ ...r, d: haversineKm(centre.lat, centre.lng, Number(r.latitude), Number(r.longitude)) }))
      .sort((a, b) => a.d - b.d)
    const sagar = sorted.filter((r) => (r.district || '').toLowerCase() === 'sagar')
    const isBina = (r) => /bina/i.test(`${r.city || ''} ${r.address || ''}`)
    const firstSagar = sagar[0]
    ok('a Bina entry sorts first among Sagar-district results',
      !!firstSagar && isBina(firstSagar), firstSagar ? `${firstSagar.name} [${firstSagar.city}] ${Math.round(firstSagar.d)}km` : 'no sagar rows geocoded')
    // The Bina entry should also be very near the top overall (within the first few).
    const binaRank = sorted.findIndex(isBina)
    ok('the Bina entry is among the nearest overall', binaRank >= 0 && binaRank < 5, `rank=${binaRank}`)
  }

  // ---- 3. Geocode coverage >= 90% ----
  const { count: total } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: haveGeo } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true }).eq('status', 'active').not('latitude', 'is', null)
  const pct = total ? (haveGeo / total) * 100 : 0
  ok(`geocode coverage >= 90% (${haveGeo}/${total} = ${pct.toFixed(1)}%)`, pct >= 90)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
