// Batch 2 item B — one-time geocoder for cold_storage_directory.
// Fills latitude/longitude/geo_precision so the finder can sort by distance.
// Uses the SAME Nominatim forward-geocoding approach + descriptive User-Agent as
// functions/geocode.js and scripts/mela/geocode.mjs (Nominatim usage policy).
//
//   Query 1 (precision='address'): <address>, <city>, <district>, Madhya Pradesh, India
//   Query 2 (precision='city', fallback):       <city>, <district>, Madhya Pradesh, India
//
// Rate: at most 1 request/second (serialized with a >=1100ms gap). Idempotent —
// re-running only geocodes rows that still have NULL latitude (pass --all to redo).
// Run: node --env-file=.env scripts/geocode-cold-storage.mjs [--all]
import { createClient } from '@supabase/supabase-js'

const UA = 'Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)'
const GAP_MS = 1100
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=in`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'hi,en' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { error: `http_${res.status}` }
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return { empty: true }
    const h = arr[0]
    const lat = Number(h.lat), lng = Number(h.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { empty: true }
    return { lat, lng }
  } catch (e) {
    return { error: String(e?.message || e).slice(0, 80) }
  }
}

// A cold storage is in MP; reject wild hits far outside the state box (lat 21–27, lng 74–83)
// so a bad area match doesn't poison distance sort.
const inMp = (lat, lng) => lat >= 20.5 && lat <= 27.5 && lng >= 73.5 && lng <= 83.5

async function main() {
  const all = process.argv.includes('--all')
  let q = db.from('cold_storage_directory').select('id,name,address,city,district,latitude').eq('status', 'active').order('id')
  if (!all) q = q.is('latitude', null)
  const { data: rows, error } = await q
  if (error) { console.error('load error', error.message); process.exit(1) }
  console.log(`${rows.length} row(s) to geocode${all ? ' (--all, re-doing)' : ''}`)

  const failures = []
  let addr = 0, city = 0, fail = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const district = (r.district || '').trim()
    const cityName = (r.city || '').trim()
    const address = (r.address || '').trim()
    let hit = null, precision = null

    if (address && (cityName || district)) {
      const res = await nominatim([address, cityName, district, 'Madhya Pradesh', 'India'].filter(Boolean).join(', '))
      await sleep(GAP_MS)
      if (res.lat != null && inMp(res.lat, res.lng)) { hit = res; precision = 'address' }
    }
    if (!hit && (cityName || district)) {
      const res = await nominatim([cityName, district, 'Madhya Pradesh', 'India'].filter(Boolean).join(', '))
      await sleep(GAP_MS)
      if (res.lat != null && inMp(res.lat, res.lng)) { hit = res; precision = 'city' }
    }
    // Third tier: a district centroid, so a row with an unmatchable city still gets a
    // coarse coordinate (good enough for "nearest 10 anyway"). Recorded as 'district'.
    if (!hit && district) {
      const res = await nominatim([district, 'Madhya Pradesh', 'India'].join(', '))
      await sleep(GAP_MS)
      if (res.lat != null && inMp(res.lat, res.lng)) { hit = res; precision = 'district' }
    }

    if (hit) {
      const { error: upErr } = await db.from('cold_storage_directory')
        .update({ latitude: hit.lat, longitude: hit.lng, geo_precision: precision, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (upErr) { fail++; failures.push({ id: r.id, name: r.name, reason: 'update_failed: ' + upErr.message }) }
      else { if (precision === 'address') addr++; else city++ }
    } else {
      fail++
      failures.push({ id: r.id, name: r.name, city: cityName, district, reason: 'no_match' })
    }
    if ((i + 1) % 20 === 0) console.log(`  …${i + 1}/${rows.length} (address ${addr}, city ${city}, fail ${fail})`)
  }

  // Coverage over the FULL active set (not just this run's batch).
  const { count: total } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: haveGeo } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true }).eq('status', 'active').not('latitude', 'is', null)
  const pct = total ? Math.round((haveGeo / total) * 1000) / 10 : 0
  console.log(`\nThis run: ${addr} address-precise, ${city} city-precise, ${fail} failed.`)
  console.log(`Coverage: ${haveGeo}/${total} active rows have coordinates = ${pct}%`)
  if (failures.length) {
    console.log(`\nFailures (${failures.length}):`)
    for (const f of failures) console.log(`  #${f.id} ${f.name} [${f.city || ''}/${f.district || ''}] — ${f.reason}`)
  }
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
