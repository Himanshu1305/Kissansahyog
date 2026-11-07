// Batch 20 - a small pure-JavaScript REFERENCE MODEL of the rules in supabase/migrations/0075_kissan_mitra.sql.
// Keep it beside the SQL: a reviewer can compare the two line by line. The SQL was NOT run against a real database in
// this batch; this model (and its tests, tests/unit/mitra-20-model.test.mjs) is the proof of the counting rules.
//
// State: { mitras: [{id, ...}], profiles: [{id, full_name, village_town, phone, created_at, is_blocked, mitra_id, mitra_paid_id, kind}], payments: [] }
// Every function returns a NEW state (or throws an Error whose message is the SQL error code).

export const FIFTEEN_MIN_MS = 15 * 60 * 1000

// ks_mitra_kind(): the one place that decides farmer or business. Today every profile is a farmer.
export const kindOf = (p) => p.kind === 'business' ? 'business' : 'farmer'

// "Counted" = attributed to the Mitra and not blocked. "Unpaid" = no payment stamped. No status, no waiting period.
export const isCounted = (p, mitraId) => p.mitra_id === mitraId && !p.is_blocked
export const isCountedUnpaid = (p, mitraId) => isCounted(p, mitraId) && p.mitra_paid_id == null

export function countsFor(state, mitraId, now = Date.now()) {
  const rows = state.profiles.filter((p) => isCounted(p, mitraId))
  const istDay = (ms) => new Date(ms + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
  const out = { farmers_total: 0, businesses_total: 0, today: 0, last7: 0, counted_unpaid_farmers: 0, counted_unpaid_businesses: 0, paid_total_registrations: 0 }
  for (const p of rows) {
    const k = kindOf(p)
    const at = Date.parse(p.created_at)
    if (k === 'farmer') out.farmers_total++; else out.businesses_total++
    if (istDay(at) === istDay(now)) out.today++
    if (at >= now - 7 * 24 * 3600 * 1000) out.last7++
    if (p.mitra_paid_id == null) { if (k === 'farmer') out.counted_unpaid_farmers++; else out.counted_unpaid_businesses++ } else out.paid_total_registrations++
  }
  return out
}

// set_my_mitra: once, within 15 minutes of the account being created, only for an active Mitra. Never throws.
export function setMyMitra(state, profileId, mitraId, now = Date.now()) {
  if (mitraId == null) return { state, status: 'none' }
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p) return { state, status: 'no_profile' }
  if (p.mitra_id != null) return { state, status: 'already_set' }
  if (now - Date.parse(p.created_at) > FIFTEEN_MIN_MS) return { state, status: 'too_late' }
  if (!state.mitras.some((m) => m.id === mitraId && m.is_active)) return { state, status: 'no_such_mitra' }
  return { state: { ...state, profiles: state.profiles.map((x) => (x.id === profileId ? { ...x, mitra_id: mitraId, mitra_set_at: new Date(now).toISOString() } : x)) }, status: 'set' }
}

// admin_reassign_registration: a paid registration cannot be moved; null removes it from every count.
export function reassign(state, profileId, newMitraId) {
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p) throw new Error('not_found')
  if (p.mitra_paid_id != null) throw new Error('already_paid')
  if (newMitraId != null && !state.mitras.some((m) => m.id === newMitraId)) throw new Error('not_found')
  return { ...state, profiles: state.profiles.map((x) => (x.id === profileId ? { ...x, mitra_id: newMitraId } : x)) }
}

// admin_mark_mitra_paid: ONE step. Stamps only the counted-and-unpaid rows of THAT Mitra.
export function markPaid(state, mitraId, amountRupees, paidOn, note = null) {
  if (!state.mitras.some((m) => m.id === mitraId)) throw new Error('not_found')
  if (!Number.isInteger(amountRupees) || amountRupees < 0) throw new Error('invalid_input')
  const rows = state.profiles.filter((p) => isCountedUnpaid(p, mitraId))
  if (rows.length === 0) throw new Error('nothing_unpaid')
  const id = `pay-${state.payments.length + 1}`
  const payment = {
    id, mitra_id: mitraId, amount_rupees: amountRupees, paid_on: paidOn, note,
    farmer_count: rows.filter((p) => kindOf(p) === 'farmer').length,
    business_count: rows.filter((p) => kindOf(p) === 'business').length,
  }
  const stamped = new Set(rows.map((p) => p.id))
  return { ...state, payments: [...state.payments, payment], profiles: state.profiles.map((p) => (stamped.has(p.id) ? { ...p, mitra_paid_id: id } : p)) }
}

// The "same name and village as another farmer" note: lower-cased trimmed full_name and village_town, both non-empty.
export function sameNameVillage(state, profile) {
  const n = String(profile.full_name || '').trim().toLowerCase()
  const v = String(profile.village_town || '').trim().toLowerCase()
  if (!n || !v) return false
  return state.profiles.some((o) => o.id !== profile.id && String(o.full_name || '').trim().toLowerCase() === n && String(o.village_town || '').trim().toLowerCase() === v)
}

// Amount suggestion: farmers x farmer rate + businesses x business rate. A blank rate for a kind that has people = "rate not set".
export function suggestAmount({ farmers, businesses }, { rate_farmer_rupees, rate_business_rupees }) {
  const needF = farmers > 0 && rate_farmer_rupees == null
  const needB = businesses > 0 && rate_business_rupees == null
  const amount = farmers * (rate_farmer_rupees ?? 0) + businesses * (rate_business_rupees ?? 0)
  return { amount, rateNotSet: needF || needB }
}

export const maskPhone = (phone) => (phone == null ? null : `******${String(phone).slice(-4)}`)

// The same-name-and-area refusal of admin_upsert_mitra.
export const isDuplicateMitra = (state, name, area, exceptId = null) =>
  state.mitras.some((m) => m.id !== exceptId && m.display_name.trim().toLowerCase() === String(name).trim().toLowerCase() && String(m.area || '').trim().toLowerCase() === String(area || '').trim().toLowerCase())
