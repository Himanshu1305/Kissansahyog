#!/usr/bin/env node
// Batch 7L-1 — builds supabase/seed/sagar_division_places.json from OpenStreetMap (Nominatim).
//   node scripts/build-places-seed.mjs
// No secrets, no database. One Nominatim request per second (their usage policy).
//
// For every place in PLACES it asks Nominatim for "<name>, <district>, Madhya Pradesh, India",
// keeps the best settlement-type hit, then checks the point lies INSIDE the district's own
// OSM boundary polygon. A row is verified=true only when both steps succeed. A row whose
// point could be fetched but not confirmed is written with verified=false. A place that
// cannot be found at all is NOT written (no guessed coordinates) and is listed at the end.
// The Hindi names are the editor's (below); where OSM carries name:hi it is recorded in
// osm_name_hi so a reviewer can compare.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'supabase', 'seed', 'sagar_division_places.json')
const UA = 'Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const DISTRICTS = [
  { en: 'Sagar', hi: 'सागर' }, { en: 'Damoh', hi: 'दमोह' }, { en: 'Panna', hi: 'पन्ना' },
  { en: 'Tikamgarh', hi: 'टीकमगढ़' }, { en: 'Chhatarpur', hi: 'छतरपुर' }, { en: 'Niwari', hi: 'निवाड़ी' },
]

// kind: district_hq | tehsil | town. `q` = alternative spellings to try on OSM, in order.
// A string in `q` starting with "=" replaces the default query (the plain name finds a different,
// smaller place). `wikidata` = take the coordinate (P625) of that Wikidata item instead, for
// towns OpenStreetMap has no settlement point for.
const P = (name_en, name_hi, district, kind, q = [], wikidata = null) => ({
  name_en, name_hi, district, kind, wikidata,
  q: q.some((x) => x.startsWith('=')) ? q.map((x) => x.replace(/^=/, '')) : [name_en, ...q],
})
const PLACES = [
  // Sagar
  P('Sagar', 'सागर', 'Sagar', 'district_hq'),
  P('Khurai', 'खुरई', 'Sagar', 'tehsil'),
  P('Bina', 'बीना', 'Sagar', 'tehsil', ['=Bina Etawa']), // plain "Bina" finds a village near Deori
  P('Rehli', 'रहली', 'Sagar', 'tehsil'),
  P('Garhakota', 'गढ़ाकोटा', 'Sagar', 'tehsil'),
  P('Deori', 'देवरी', 'Sagar', 'tehsil'),
  P('Banda', 'बंडा', 'Sagar', 'tehsil'),
  P('Rahatgarh', 'राहतगढ़', 'Sagar', 'tehsil'),
  P('Malthone', 'मालथौन', 'Sagar', 'tehsil', ['Malthon']),
  P('Shahgarh', 'शाहगढ़', 'Sagar', 'tehsil'),
  P('Kesli', 'केसली', 'Sagar', 'tehsil'),
  P('Jaisinagar', 'जैसीनगर', 'Sagar', 'tehsil', ['Jaisinghnagar']),
  P('Makronia', 'मकरोनिया', 'Sagar', 'town', ['Makroniya']),
  // Damoh
  P('Damoh', 'दमोह', 'Damoh', 'district_hq'),
  P('Hatta', 'हटा', 'Damoh', 'tehsil'),
  P('Patharia', 'पथरिया', 'Damoh', 'tehsil', ['Pathariya']),
  P('Tendukheda', 'तेंदूखेड़ा', 'Damoh', 'tehsil'),
  P('Jabera', 'जबेरा', 'Damoh', 'tehsil'),
  P('Batiyagarh', 'बटियागढ़', 'Damoh', 'tehsil', ['Batiagarh']),
  P('Patera', 'पटेरा', 'Damoh', 'tehsil'),
  P('Hindoria', 'हिंडोरिया', 'Damoh', 'town'),
  // Panna
  P('Panna', 'पन्ना', 'Panna', 'district_hq'),
  P('Ajaigarh', 'अजयगढ़', 'Panna', 'tehsil'),
  P('Amanganj', 'अमानगंज', 'Panna', 'tehsil'),
  P('Devendranagar', 'देवेन्द्रनगर', 'Panna', 'tehsil', ['Devendra Nagar']),
  P('Gunnor', 'गुनौर', 'Panna', 'tehsil', ['Gunnaur']),
  P('Pawai', 'पवई', 'Panna', 'tehsil'),
  P('Raipura', 'रैपुरा', 'Panna', 'tehsil'),
  P('Shahnagar', 'शाहनगर', 'Panna', 'tehsil'),
  P('Simariya', 'सिमरिया', 'Panna', 'tehsil', ['Simaria']),
  // Tikamgarh
  P('Tikamgarh', 'टीकमगढ़', 'Tikamgarh', 'district_hq'),
  P('Baldeogarh', 'बल्देवगढ़', 'Tikamgarh', 'tehsil', ['Baldevgarh']),
  P('Jatara', 'जतारा', 'Tikamgarh', 'tehsil'),
  P('Palera', 'पलेरा', 'Tikamgarh', 'tehsil'),
  P('Khargapur', 'खरगापुर', 'Tikamgarh', 'tehsil'),
  P('Lidhora', 'लिधौरा', 'Tikamgarh', 'tehsil', ['Lidhaura', 'Lidhora Khas']),
  P('Mohangarh', 'मोहनगढ़', 'Tikamgarh', 'tehsil'),
  P('Badagaon', 'बड़ागाँव', 'Tikamgarh', 'tehsil', ['Badagaon Dhasan', 'Baragaon']),
  // Chhatarpur
  P('Chhatarpur', 'छतरपुर', 'Chhatarpur', 'district_hq'),
  P('Nowgong', 'नौगाँव', 'Chhatarpur', 'tehsil', ['Naugaon']),
  P('Rajnagar', 'राजनगर', 'Chhatarpur', 'tehsil'),
  P('Bijawar', 'बिजावर', 'Chhatarpur', 'tehsil'),
  P('Bada Malhera', 'बड़ा मलहरा', 'Chhatarpur', 'tehsil', ['Bada Malehra', 'Badamalhera', 'Malhera']),
  P('Lavkush Nagar', 'लवकुशनगर', 'Chhatarpur', 'tehsil', [], 'Q2241583'), // also called Laundi
  P('Gaurihar', 'गौरिहार', 'Chhatarpur', 'tehsil'),
  P('Maharajpur', 'महाराजपुर', 'Chhatarpur', 'tehsil'),
  P('Buxwaha', 'बकस्वाहा', 'Chhatarpur', 'tehsil', ['Bakswaha', 'Baxwaha']),
  P('Ghuwara', 'घुवारा', 'Chhatarpur', 'tehsil', ['Ghuvara']),
  P('Chandla', 'चंदला', 'Chhatarpur', 'tehsil'),
  P('Khajuraho', 'खजुराहो', 'Chhatarpur', 'town'),
  P('Harpalpur', 'हरपालपुर', 'Chhatarpur', 'town'),
  // Niwari
  P('Niwari', 'निवाड़ी', 'Niwari', 'district_hq'),
  P('Prithvipur', 'पृथ्वीपुर', 'Niwari', 'tehsil', [], 'Q2548354'), // OSM only has a hamlet of this name
  P('Orchha', 'ओरछा', 'Niwari', 'tehsil'),
]

async function nominatim(params) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ format: 'jsonv2', countrycodes: 'in', ...params })
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(1100)
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(25000) })
      if (res.ok) return await res.json()
    } catch { /* retry */ }
    await sleep(2500)
  }
  return null
}

// --- point in (multi)polygon, GeoJSON lon/lat order ---
const inRing = (lng, lat, ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPoly = (lng, lat, poly) => inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole))
export function pointInGeoJson(lng, lat, g) {
  if (!g) return null
  if (g.type === 'Polygon') return inPoly(lng, lat, g.coordinates)
  if (g.type === 'MultiPolygon') return g.coordinates.some((p) => inPoly(lng, lat, p))
  return null
}

async function districtBoundary(name) {
  const arr = await nominatim({ q: `${name} district, Madhya Pradesh, India`, polygon_geojson: '1', limit: '5', addressdetails: '1' })
  const hit = (arr || []).find((r) => r.category === 'boundary' && r.type === 'administrative' && /Polygon/.test(r.geojson?.type || '') && r.addresstype === 'state_district')
    || (arr || []).find((r) => r.category === 'boundary' && r.type === 'administrative' && /Polygon/.test(r.geojson?.type || '') && r.place_rank <= 12)
  return hit ? { geojson: hit.geojson, osm: `${hit.osm_type}/${hit.osm_id}` } : null
}

const SETTLEMENT = new Set(['city', 'town', 'village', 'suburb', 'municipality'])

async function wikidataPoint(qid) {
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) })
    if (!res.ok) return null
    const e = (await res.json()).entities?.[qid]
    const v = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value
    if (!v) return null
    return { lat: v.latitude, lon: v.longitude, name: e.labels?.en?.value || null, name_hi: e.labels?.hi?.value || null }
  } catch { return null }
}
// Best OSM hit for a place: a settlement node/area first, then the town's own admin boundary.
function pick(arr, district) {
  const ok = (arr || []).filter((r) => (r.address?.state || '') === 'Madhya Pradesh')
  const score = (r) => {
    let s = 0
    if (r.category === 'place' && SETTLEMENT.has(r.type)) s += 100
    else if (r.category === 'boundary' && r.type === 'administrative' && r.place_rank >= 14) s += 60
    else return -1
    if ((r.address?.state_district || '') === district) s += 20
    return s + (r.importance || 0)
  }
  return ok.map((r) => ({ r, s: score(r) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)[0]?.r || null
}

const bounds = {}
for (const d of DISTRICTS) {
  bounds[d.en] = await districtBoundary(d.en)
  console.log(`boundary ${d.en}: ${bounds[d.en] ? bounds[d.en].osm : 'NOT FOUND'}`)
}

const rows = [], missing = []
for (const p of PLACES) {
  let hit = null, usedQ = null
  if (p.wikidata) {
    const w = await wikidataPoint(p.wikidata)
    if (w) { hit = { lat: w.lat, lon: w.lon, name: w.name, namedetails: { 'name:hi': w.name_hi }, category: 'wikidata', type: 'P625', wd: p.wikidata }; usedQ = p.wikidata }
  }
  for (const q of hit ? [] : p.q) {
    const arr = await nominatim({ q: `${q}, ${p.district}, Madhya Pradesh, India`, limit: '8', addressdetails: '1', namedetails: '1' })
    hit = pick(arr, p.district)
    if (hit) { usedQ = q; break }
  }
  if (!hit) { missing.push(p); console.log(`MISSING  ${p.name_en} (${p.district})`); continue }
  const lat = Number(Number(hit.lat).toFixed(5)), lng = Number(Number(hit.lon).toFixed(5))
  const b = bounds[p.district]
  const inside = b ? pointInGeoJson(lng, lat, b.geojson) : null
  const verified = inside === true
  const note = inside === true ? null : inside === false ? `point falls outside the OSM boundary of ${p.district} district` : `no OSM boundary polygon for ${p.district} district — containment not checked`
  rows.push({
    name_en: p.name_en, name_hi: p.name_hi, district: p.district, kind: p.kind, lat, lng,
    source: hit.wd ? `Wikidata ${hit.wd} (P625 coordinate)` : `OpenStreetMap (Nominatim) ${hit.osm_type}/${hit.osm_id}`,
    verified, ...(note ? { note } : {}),
    osm_name: hit.name || null, osm_name_hi: hit.namedetails?.['name:hi'] || null, osm_query: usedQ,
    osm_class: `${hit.category}/${hit.type}`, osm_district: hit.address?.state_district || null,
  })
  console.log(`${verified ? 'ok      ' : 'UNVERIFIED'} ${p.name_en} (${p.district}) ${lat},${lng} ${hit.category}/${hit.type} "${hit.name}"`)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({
  generated_by: 'scripts/build-places-seed.mjs',
  generated_on: new Date().toISOString().slice(0, 10),
  licence: 'Coordinates © OpenStreetMap contributors (ODbL 1.0), except rows whose source says Wikidata (CC0)',
  district_boundaries: Object.fromEntries(DISTRICTS.map((d) => [d.en, bounds[d.en]?.osm || null])),
  not_found: missing.map((m) => ({ name_en: m.name_en, name_hi: m.name_hi, district: m.district, kind: m.kind })),
  places: rows,
}, null, 2) + '\n')
console.log(`\nwrote ${rows.length} places (${rows.filter((r) => r.verified).length} verified, ${rows.filter((r) => !r.verified).length} unverified), ${missing.length} not found → ${OUT}`)
