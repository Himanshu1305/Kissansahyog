// Kisan Mela deduplication — ONE shared, PURE matching + merge implementation used at every entry
// point (candidate stage uses the text+date fallback; promotion/cleanup uses the full location-based
// check). No network, no DB — fully unit-testable with mocked rows (Phase 5).
//
// Match rule (Phase 2): two entries are the same event when canonical STATE matches AND dates
// overlap/are near AND (precise-coordinate location match OR normalized organizer/venue/name text
// match). Coordinates alone merge ONLY when BOTH entries geocoded to venue-level precision (2a-i);
// at city/district-level precision, text corroboration is also required. "When in doubt, do not merge."
import { haversineKm } from '../../src/lib/distance.js'
import { normalizeState } from '../../src/content/states.js'

// Final, tuned thresholds (documented in the review): 5 km for a venue-level coordinate match, and a
// 7-day date window so a confirmed date and an adjacent "expected" month of the SAME event merge,
// while distinct editions at one venue (e.g. PAU's March vs September melas) stay months apart.
export const MERGE_MAX_KM = 5
export const DATE_WINDOW_DAYS = 7

const lc = (v) => String(v == null ? '' : v).toLowerCase().trim()
const ISO = /^\d{4}-\d{2}-\d{2}$/
const dayNum = (d) => (ISO.test(String(d || '')) ? Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000) : null)

// --- field accessors: work on both candidate rows (raw_*) and kisan_mela rows ------------------
const fName = (r) => r.name_en || r.name_hi || r.raw_name || r.name || ''
const fOrg = (r) => r.organizer_name || r.organizer || ''
const fVenue = (r) => r.venue || r.raw_venue || ''
const fState = (r) => normalizeState(r.state || r.raw_state) || r.state || r.raw_state || ''
const fLat = (r) => (r.latitude != null ? Number(r.latitude) : null)
const fLng = (r) => (r.longitude != null ? Number(r.longitude) : null)
const fPrecision = (r) => r.geocode_precision || null
const fConfirmed = (r) => r.is_date_confirmed === true
const fStart = (r) => r.event_date_start || null
const fEnd = (r) => r.event_date_end || null
const fExpected = (r) => r.expected_period || r.raw_date_text || ''

// --- date windows -----------------------------------------------------------------------------
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
// Parse an "अपेक्षित"/expected period ("Oct 2026", "February–March 2027", "late Dec 2026") to a
// [startDay, endDay] window, or null if no year is present (can't place it on the calendar).
export function periodWindow(expected) {
  const t = lc(expected)
  const ym = t.match(/\b(20\d{2})\b/)
  if (!ym) return null
  const y = +ym[1]
  const months = [...t.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/g)].map((m) => MONTHS[m[1]]).filter((x) => x != null)
  if (!months.length) return [dayNum(`${y}-01-01`), dayNum(`${y}-12-31`)]
  const a = Math.min(...months); const b = Math.max(...months)
  const start = Math.floor(Date.UTC(y, a, 1) / 86400000)
  const end = Math.floor(Date.UTC(y, b + 1, 0) / 86400000) // last day of the last month
  return [start, end]
}
// A row's date window: confirmed [start,end], else the expected-period window, else null (unknown).
export function dateWindow(row) {
  if (fConfirmed(row) && dayNum(fStart(row)) != null) {
    const s = dayNum(fStart(row)); const e = dayNum(fEnd(row))
    return [s, e != null ? e : s]
  }
  return periodWindow(fExpected(row))
}
// Two rows' dates overlap or sit within `windowDays` of each other. Expected-month windows count as
// overlapping any confirmed date inside them (they're real day-ranges here). Both-unknown → compatible
// (two undated entries for the same venue are treated as the same pending event); one-known-one-unknown
// → NOT compatible (don't merge a dated event with an undated one).
export function datesCompatible(a, b, { windowDays = DATE_WINDOW_DAYS } = {}) {
  const wa = dateWindow(a); const wb = dateWindow(b)
  if (wa == null && wb == null) return true
  if (wa == null || wb == null) return false
  return wa[0] <= wb[1] + windowDays && wb[0] <= wa[1] + windowDays
}

// --- institution identity (collapses SAU/ICAR name variants the spec calls out) ----------------
const INSTITUTION_PATTERNS = [
  [/gbpua&?t|g\.?\s?b\.?\s?pant university of agriculture|govind ballabh pant university|pant university of agriculture/, 'gbpuat'],
  [/university of agricultural sciences[^.]*?(bengaluru|bangalore)|uas[, ]*(bengaluru|bangalore)|gandhi krishi vignana kendra|gkvk/, 'uas-bengaluru'],
  [/indian agricultural research institute|\biari\b/, 'iari'],
  [/punjab agricultural university|\bpau\b/, 'pau'],
]
// The institution a row belongs to, inferred from organizer + venue, or null. Same non-null key on
// both rows is a strong text signal (robust to how the event name is worded).
export function instKey(row) {
  const blob = `${lc(fOrg(row))} ${lc(fVenue(row))}`
  for (const [re, key] of INSTITUTION_PATTERNS) if (re.test(blob)) return key
  return null
}

// --- normalized text + token helpers ----------------------------------------------------------
const norm = (s) => lc(s).replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 3))
function jaccard(a, b) { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i += 1; return i / (a.size + b.size - i) }
function containment(a, b) { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i += 1; return i / Math.min(a.size, b.size) }
// Name signature tokens — drop the ubiquitous Mela/Agri words so only distinctive words remain.
const NAME_STOP = new Set(['kisan', 'krishi', 'mela', 'agri', 'agro', 'agricultural', 'agriculture', 'expo', 'show', 'india', 'indian', 'fair', 'exhibition', 'national', 'international', 'the', 'and', 'all', 'edition', 'cum'])
export function sigTokens(name) {
  return new Set(norm(name).replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\b\d+(st|nd|rd|th)\b/g, ' ').split(' ').filter((w) => w.length >= 3 && !NAME_STOP.has(w)))
}

// Normalized-text match (2b): same institution, OR identical/one-contains-other venue, OR identical
// organizer, OR a strong distinctive-name overlap. Never a single shared city token alone.
export function textMatch(a, b) {
  const ia = instKey(a); const ib = instKey(b)
  if (ia && ia === ib) return { ok: true, signal: `institution:${ia}` }
  const va = tokens(fVenue(a)); const vb = tokens(fVenue(b))
  if (norm(fVenue(a)) && norm(fVenue(a)) === norm(fVenue(b))) return { ok: true, signal: 'venue:exact' }
  if (va.size >= 2 && vb.size >= 2 && containment(va, vb) >= 0.8) return { ok: true, signal: 'venue:contained' }
  if (norm(fOrg(a)) && norm(fOrg(a)) === norm(fOrg(b))) return { ok: true, signal: 'organizer:exact' }
  const na = sigTokens(fName(a)); const nb = sigTokens(fName(b))
  if (na.size >= 1 && nb.size >= 1 && jaccard(na, nb) >= 0.6) return { ok: true, signal: 'name:similar' }
  return { ok: false, signal: null }
}

// Precise-coordinate match (2a): only when BOTH entries are venue-level precision and within maxKm.
export function locationMatch(a, b, { maxKm = MERGE_MAX_KM } = {}) {
  if (fLat(a) == null || fLng(a) == null || fLat(b) == null || fLng(b) == null) return { ok: false, km: null }
  if (fPrecision(a) !== 'venue' || fPrecision(b) !== 'venue') return { ok: false, km: null } // 2a-i: centroids never merge on coords alone
  const km = haversineKm(fLat(a), fLng(a), fLat(b), fLng(b))
  return { ok: km <= maxKm, km }
}

// THE match decision. Same event ⇔ same canonical state AND dates compatible AND (precise location
// OR text). Returns { match, reason, signals } for the audit trail.
export function matchEvents(a, b, opts = {}) {
  const sa = fState(a); const sb = fState(b)
  if (!sa || !sb || sa.toLowerCase() !== sb.toLowerCase()) return { match: false, reason: 'state_mismatch', signals: {} }
  if (!datesCompatible(a, b, opts)) return { match: false, reason: 'dates_apart', signals: {} }
  const loc = locationMatch(a, b, opts)
  const txt = textMatch(a, b)
  if (!loc.ok && !txt.ok) return { match: false, reason: 'no_location_or_text_signal', signals: { km: loc.km } }
  const signals = { state: sa, km: loc.ok ? Number(loc.km?.toFixed?.(2)) : loc.km, location: loc.ok, text: txt.ok ? txt.signal : null }
  const reason = loc.ok && txt.ok ? `location(${signals.km}km)+${txt.signal}` : loc.ok ? `location(${signals.km}km venue-precision)` : txt.signal
  return { match: true, reason, signals }
}

// A pair key for the "do not merge" exclusion set (order-independent).
export function pairKey(idA, idB) { return [idA, idB].sort().join('::') }

// Find the first already-present row that is the same event as `row` (or null). `exclusions` is a Set
// of pairKey() strings an admin split apart — those pairs must never re-merge (3f).
export function findDuplicate(row, others, { exclusions, ...opts } = {}) {
  for (const other of others || []) {
    if (!other || other.id === row.id) continue
    if (exclusions && row.id && other.id && exclusions.has(pairKey(row.id, other.id))) continue
    if (matchEvents(row, other, opts).match) return other
  }
  return null
}
