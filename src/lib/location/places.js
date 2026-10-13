// Batch 7L-1 — the Sagar Division places list (public.places, migration 0057) and the local
// matching used by the location flow. The whole list (~50 rows) is loaded ONCE and matched
// in the browser: live suggestions while typing, closest spellings for "Did you mean…?",
// and the district → town picker.
import { supabase } from '../supabaseClient'
import { haversineKm } from '../distance'

export const DIVISION_DISTRICTS = [
  { en: 'Sagar', hi: 'सागर' },
  { en: 'Damoh', hi: 'दमोह' },
  { en: 'Panna', hi: 'पन्ना' },
  { en: 'Tikamgarh', hi: 'टीकमगढ़' },
  { en: 'Chhatarpur', hi: 'छतरपुर' },
  { en: 'Niwari', hi: 'निवाड़ी' },
]
export const districtName = (en, lang) => {
  const d = DIVISION_DISTRICTS.find((x) => x.en === en)
  return d ? (lang === 'hi' ? d.hi : d.en) : en
}
export const placeName = (p, lang) => (lang === 'hi' ? (p.name_hi || p.name_en) : (p.name_en || p.name_hi)) || ''

const clean = (rows) => (rows || [])
  .map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }))
  // A row marked verified=false stays in the table for review but is never offered to a visitor.
  .filter((p) => p.name_en && p.verified !== false && Number.isFinite(p.lat) && Number.isFinite(p.lng))

// One fetch per session. If the table is not there yet (migration 0057 not applied) or the
// request fails, the same rows are read from the seed file shipped with the app, so the
// location flow never depends on the network for its place names.
let cache = null
export function fetchPlaces() {
  if (cache) return cache
  cache = (async () => {
    try {
      const { data, error } = await supabase.from('places').select('id,name_en,name_hi,district,kind,lat,lng,verified').limit(500)
      const rows = error ? [] : clean(data)
      if (rows.length) return rows
    } catch { /* fall through to the bundled seed */ }
    try {
      const seed = (await import('../../../supabase/seed/sagar_division_places.json')).default
      return clean(seed.places)
    } catch { return [] }
  })()
  return cache
}

// --- matching -------------------------------------------------------------------------
// Latin: lower-case letters only. Devanagari: drop the nukta, fold anusvara/chandrabindu and
// long/short vowel signs that people mix up when typing.
export function normalizeName(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/़/g, '') // nukta
    .replace(/[ँं]/g, 'ं') // chandrabindu → anusvara
    .replace(/[^a-zऀ-ॿ]/g, '')
}
// A looser key for spelling variants: doubled letters, the aspirate "h", and vowel length.
function looseKey(s) {
  const n = normalizeName(s)
  if (/[ऀ-ॿ]/.test(n)) return n.replace(/[ीू]/g, (c) => (c === 'ी' ? 'ि' : 'ु')).replace(/ं/g, '')
  return n.replace(/([a-z])\1+/g, '$1').replace(/([bcdgjkpst])h/g, '$1').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/aa/g, 'a').replace(/w/g, 'v').replace(/y$/, 'i')
}
const isDeva = (s) => /[ऀ-ॿ]/.test(String(s || ''))
const nameFor = (p, q) => (isDeva(q) ? p.name_hi : p.name_en)

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}

// The place whose name IS what was typed (ignoring case / spacing / small spelling variants).
export function exactPlace(query, places) {
  const q = normalizeName(query)
  if (!q) return null
  const ql = looseKey(query)
  const hits = (places || []).filter((p) => normalizeName(nameFor(p, query)) === q)
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) return null // same name in two districts → let the visitor choose
  const loose = (places || []).filter((p) => looseKey(nameFor(p, query)) === ql)
  return loose.length === 1 ? loose[0] : null
}

// Live suggestions while typing: names that start with the text first, then names containing it.
export function suggestPlaces(query, places, limit = 6) {
  const q = normalizeName(query)
  if (q.length < 2) return []
  const ql = looseKey(query)
  const starts = [], contains = []
  for (const p of places || []) {
    const n = normalizeName(nameFor(p, query)), l = looseKey(nameFor(p, query))
    if (!n) continue
    if (n.startsWith(q) || l.startsWith(ql)) starts.push(p)
    else if (n.includes(q) || l.includes(ql)) contains.push(p)
  }
  return [...starts, ...contains].slice(0, limit)
}

// "Did you mean…?" — the closest spellings in the list. A candidate qualifies only when the
// edit distance is small relative to the length typed, so nonsense input returns nothing.
export function closestPlaces(query, places, limit = 4) {
  const ql = looseKey(query)
  if (ql.length < 3) return []
  const max = Math.max(2, Math.floor(ql.length * 0.4))
  return (places || [])
    .map((p) => ({ p, d: levenshtein(ql, looseKey(nameFor(p, query))) }))
    .filter((x) => x.d <= max)
    .sort((a, b) => a.d - b.d || a.p.name_en.localeCompare(b.p.name_en))
    .slice(0, limit)
    .map((x) => x.p)
}

// Nearest listed place to a point (used only to NAME a device position), with its distance.
export function nearestPlace(lat, lng, places) {
  let best = null, bestD = Infinity
  for (const p of places || []) {
    const d = haversineKm(lat, lng, p.lat, p.lng)
    if (d < bestD) { bestD = d; best = p }
  }
  return best ? { place: best, km: bestD } : null
}

// Towns of one district for the picker: district HQ first, then alphabetical.
export function placesInDistrict(district, places, lang = 'en') {
  return (places || [])
    .filter((p) => p.district === district)
    .sort((a, b) => (a.kind === 'district_hq' ? -1 : b.kind === 'district_hq' ? 1 : placeName(a, lang).localeCompare(placeName(b, lang), lang === 'hi' ? 'hi' : 'en')))
}

// --- geocoder (only for text with no local match, only after the visitor asks) ----------
// Reuses the site's own /geocode Pages Function (Nominatim, already scoped to
// "<text>, Madhya Pradesh, India") — the same one the cold-storage finder uses, so this
// adds no new third-party host. The answer is accepted only if it falls inside Madhya
// Pradesh's bounding box; anything else is treated as "not found".
const MP_BOX = { minLat: 21.0, maxLat: 26.9, minLng: 74.0, maxLng: 82.9 }
export async function geocodeTyped(query) {
  const q = String(query || '').trim()
  if (q.length < 3) return null
  try {
    const res = await fetch(`/geocode?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const d = await res.json()
    const lat = Number(d?.lat), lng = Number(d?.lng)
    if (!d?.found || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < MP_BOX.minLat || lat > MP_BOX.maxLat || lng < MP_BOX.minLng || lng > MP_BOX.maxLng) return null
    const parts = String(d.display_name || '').split(',').map((s) => s.trim()).filter(Boolean)
    return { lat, lng, label: parts[0] || q, detail: parts.slice(1, 4).join(', ') }
  } catch { return null }
}
