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
const fDistrict = (r) => r.district || r.raw_district || ''
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

// Districts are compatible unless both are present and share no token. Guards against merging an
// institution's DIFFERENT regional editions — e.g. PAU runs separate Kisan Melas at Ludhiana,
// Faridkot and Patiala in the same month; same org + same state + same dates but different districts
// are different events.
export function districtCompatible(a, b) {
  const da = tokens(fDistrict(a)); const db = tokens(fDistrict(b))
  if (!da.size || !db.size) return true
  for (const x of da) if (db.has(x)) return true
  return false
}

// Normalized-text match (2b): same institution, OR identical/one-contains-other venue, OR identical
// organizer, OR a strong distinctive-name overlap — AND the districts must be compatible (so an org's
// different regional melas don't merge). Never a single shared city token alone.
export function textMatch(a, b) {
  if (!districtCompatible(a, b)) return { ok: false, signal: null }
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
  // State COMPATIBILITY: reject only when both rows carry a state and they differ. Candidate-stage
  // rows (scraper) have no state yet (it's set at promotion), so an empty state must not block the
  // text/date match; once both rows are promoted they both carry a canonical state → strict equality.
  const sa = fState(a); const sb = fState(b)
  if (sa && sb && sa.toLowerCase() !== sb.toLowerCase()) return { match: false, reason: 'state_mismatch', signals: {} }
  if (!datesCompatible(a, b, opts)) return { match: false, reason: 'dates_apart', signals: {} }
  const loc = locationMatch(a, b, opts)
  const txt = textMatch(a, b)
  if (!loc.ok && !txt.ok) return { match: false, reason: 'no_location_or_text_signal', signals: { km: loc.km } }
  const signals = { state: sa, km: loc.ok ? Number(loc.km?.toFixed?.(2)) : loc.km, location: loc.ok, text: txt.ok ? txt.signal : null }
  const reason = loc.ok && txt.ok ? `location(${signals.km}km)+${txt.signal}` : loc.ok ? `location(${signals.km}km venue-precision)` : txt.signal
  return { match: true, reason, signals }
}

// =============================================================================================
// Phase 3 — merge rules (pure planning; the DB-applying mergeIntoSurvivor lives below)
// =============================================================================================

const AGGREGATOR_HOSTS = /taazabhav\.com|kisaanhelpline\.com/i
const hasPrimarySource = (r) => (r.source_urls || []).some((u) => /^https?:\/\//i.test(u) && !AGGREGATOR_HOSTS.test(u))
const completeness = (r) => ['address', 'highlights_hi', 'highlights_en', 'contact_name', 'contact_number', 'latitude', 'longitude', 'district'].filter((k) => r[k] != null && r[k] !== '').length

// 3a — choose the survivor from a group of same-event rows: confirmed date > expected; then verified
// against an official (non-aggregator) primary source; then more complete; then most recently checked;
// then stable by id so the choice is deterministic.
export function pickSurvivor(rows) {
  return [...rows].sort((a, b) => {
    if (fConfirmed(a) !== fConfirmed(b)) return fConfirmed(a) ? -1 : 1
    if (hasPrimarySource(a) !== hasPrimarySource(b)) return hasPrimarySource(a) ? -1 : 1
    const c = completeness(b) - completeness(a); if (c) return c
    const la = String(a.last_checked_date || ''); const lb = String(b.last_checked_date || '')
    if (la !== lb) return la < lb ? 1 : -1
    return String(a.id) < String(b.id) ? -1 : 1
  })[0]
}

// 3b — plan the survivor's field updates: union every source_urls (earns the multi-source badge),
// fill any field blank on the survivor from a duplicate, and adopt a confirmed date if the survivor
// only had an expected one. Pure — returns just the update object.
export function planMerge(survivor, dups) {
  const u = {}
  const all = [survivor, ...dups]
  const urls = [...new Set(all.flatMap((r) => r.source_urls || []).filter((x) => x && /^https?:\/\//i.test(x)))]
  u.source_urls = urls
  // Adopt a confirmed date if the survivor lacks one but a duplicate has it.
  if (!fConfirmed(survivor)) {
    const conf = dups.find((d) => fConfirmed(d) && d.event_date_start)
    if (conf) { u.event_date_start = conf.event_date_start; u.event_date_end = conf.event_date_end || null; u.is_date_confirmed = true; u.expected_period = null }
  }
  const FILL = ['name_en', 'organizer_name', 'address', 'district', 'highlights_hi', 'highlights_en', 'contact_name', 'contact_number', 'latitude', 'longitude', 'geocode_precision', 'expected_period']
  for (const k of FILL) {
    if (k in u) continue
    if (survivor[k] == null || survivor[k] === '') {
      const d = all.find((r) => r[k] != null && r[k] !== '')
      if (d) u[k] = d[k]
    }
  }
  const tags = new Set(all.flatMap((r) => r.category_tags || []))
  if (tags.size) u.category_tags = [...tags]
  return u
}

// A pair key for the "do not merge" exclusion set (order-independent).
export function pairKey(idA, idB) { return [idA, idB].sort().join('::') }

// =============================================================================================
// DB-applying merge (used by the one-time cleanup AND ongoing promotion). `db` is a service-role
// Supabase client; still testable with an in-memory mock. Preserves farmers' interest marks (3c) and
// deactivates — never deletes — merged-away rows with a merged_into reference (3d).
// =============================================================================================
export async function mergeIntoSurvivor({ db, survivor, dups, reason, asOf, log = () => {} }) {
  const stamp = asOf || new Date().toISOString().slice(0, 10)
  const updates = planMerge(survivor, dups)
  await db.from('kisan_mela').update(updates).eq('id', survivor.id)

  for (const dup of dups) {
    // 3c — re-point interest marks to the survivor; skip a user who already marked the survivor
    // (leave theirs on the now-inactive dup so a later split can restore it). Track original ownership.
    const { data: survInt } = await db.from('kisan_mela_interest').select('user_id').eq('mela_id', survivor.id)
    const survUsers = new Set((survInt || []).map((r) => r.user_id))
    const { data: dupInt } = await db.from('kisan_mela_interest').select('user_id, original_mela_id').eq('mela_id', dup.id)
    for (const r of dupInt || []) {
      if (survUsers.has(r.user_id)) continue // conflict → preserve on the dup
      await db.from('kisan_mela_interest').update({ mela_id: survivor.id, original_mela_id: r.original_mela_id || dup.id }).eq('mela_id', dup.id).eq('user_id', r.user_id)
      survUsers.add(r.user_id)
    }
    // Re-point candidate back-references, then deactivate the dup with an auditable merged_into link (3d).
    await db.from('kisan_mela_candidates').update({ kisan_mela_id: survivor.id }).eq('kisan_mela_id', dup.id)
    await db.from('kisan_mela').update({ is_active: false, merged_into: survivor.id, merge_reason: reason, merged_at: new Date().toISOString() }).eq('id', dup.id)
    log(`[merge] '${dup.name_en || dup.name_hi}' (${String(dup.id).slice(0, 8)}) → '${survivor.name_en || survivor.name_hi}' (${String(survivor.id).slice(0, 8)}) — ${reason}`)
  }
  return { survivor_id: survivor.id, survivor_name: survivor.name_en || survivor.name_hi, merged: dups.map((d) => ({ id: d.id, name: d.name_en || d.name_hi, reason })) }
}

// Cluster rows into same-event groups (connected by matchEvents). Returns ALL clusters, including
// singletons. Pure — the single clustering used for candidate grouping AND the cleanup/dedup pass.
// An admin-split pair in `exclusions` is never placed in the same cluster (3f).
export function clusterByEvent(rows, { exclusions, ...opts } = {}) {
  const remaining = [...(rows || [])]
  const clusters = []
  while (remaining.length) {
    const seed = remaining.shift()
    const cluster = [seed]
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const other = remaining[i]
      if (exclusions && seed.id && other.id && exclusions.has(pairKey(seed.id, other.id))) continue
      if (cluster.some((m) => matchEvents(m, other, opts).match)) { cluster.push(other); remaining.splice(i, 1) }
    }
    clusters.push(cluster)
  }
  return clusters
}

// Merge each same-event cluster into its survivor (one-time cleanup 4a + ongoing dedup 4b). Returns
// the merge records. Honors the do-not-merge exclusions set.
export async function dedupActiveMelas({ db, rows, exclusions, asOf, log = () => {}, opts = {} }) {
  const clusters = clusterByEvent(rows, { exclusions, ...opts }).filter((c) => c.length > 1)
  const records = []
  for (const cluster of clusters) {
    const survivor = pickSurvivor(cluster)
    const dups = cluster.filter((r) => r.id !== survivor.id)
    const reason = (matchEvents(survivor, dups[0], opts).reason) || 'duplicate'
    records.push(await mergeIntoSurvivor({ db, survivor, dups, reason, asOf, log }))
  }
  return records
}

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
