// Batch 20 - a small pure-JavaScript REFERENCE MODEL of the rules in supabase/migrations/0075_kissan_mitra.sql.
// Batch 22: updated to the rules of supabase/migrations/0076_mitra_at_offer.sql - a farmer counts for a Mitra only AFTER
// offering a service, and each ad that has a Mitra counts as one ad (one "business" in the columns).
// Keep it beside the SQL: a reviewer can compare the two line by line. The SQL was NOT run against a real database in
// these batches; this model (and its tests, tests/unit/mitra-20-model.test.mjs and mitra-22-*.test.mjs) is the proof of the rules.
//
// State: { mitras: [{id, ...}], profiles: [{id, full_name, village_town, phone, created_at, is_blocked, mitra_id, mitra_paid_id, kind}],
//          payments: [], listings: [{id, user_id, listing_type, status, admin_disabled_at, created_at}],
//          announcements: [{id, mitra_id, mitra_paid_id, created_at}] }   (listings and announcements may be left out = none)
// Every function returns a NEW state (or throws an Error whose message is the SQL error code).

export const FIFTEEN_MIN_MS = 15 * 60 * 1000
export const THIRTY_MIN_MS = 30 * 60 * 1000

// ks_mitra_kind(): the one place that decides farmer or business. Today every profile is a farmer.
export const kindOf = (p) => p.kind === 'business' ? 'business' : 'farmer'

// ks_mitra_first_offer_at / ks_mitra_offered: the ONE definition of "offered a service" - at least one listing with
// listing_type 'offer', status not 'removed' and not disabled by an admin. A person counts once, however many offers.
const liveOffers = (state, p) => (state.listings || []).filter((l) => l.user_id === p.id && l.listing_type === 'offer' && l.status !== 'removed' && l.admin_disabled_at == null)
export const firstOfferAt = (state, p) => {
  const ts = liveOffers(state, p).map((l) => Date.parse(l.created_at))
  return ts.length ? Math.min(...ts) : null
}
export const offered = (state, p) => firstOfferAt(state, p) != null
export const offersCount = (state, p) => liveOffers(state, p).length // offers_count in the people list

// "Counted" farmer = attributed to the Mitra, not blocked, and has offered a service. "Unpaid" = no payment stamped.
// An ad counts when its mitra_id is the Mitra (one business per ad). No status, no waiting period.
export const isCounted = (state, p, mitraId) => p.mitra_id === mitraId && !p.is_blocked && offered(state, p)
export const isCountedUnpaid = (state, p, mitraId) => isCounted(state, p, mitraId) && p.mitra_paid_id == null
export const unpaidAds = (state, mitraId) => (state.announcements || []).filter((a) => a.mitra_id === mitraId && a.mitra_paid_id == null)

export function countsFor(state, mitraId, now = Date.now()) {
  const istDay = (ms) => new Date(ms + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
  const events = [
    ...state.profiles.filter((p) => isCounted(state, p, mitraId)).map((p) => ({ k: kindOf(p), at: firstOfferAt(state, p), paid: p.mitra_paid_id != null })),
    ...(state.announcements || []).filter((a) => a.mitra_id === mitraId).map((a) => ({ k: 'business', at: Date.parse(a.created_at), paid: a.mitra_paid_id != null })),
  ]
  const out = { farmers_total: 0, businesses_total: 0, today: 0, last7: 0, counted_unpaid_farmers: 0, counted_unpaid_businesses: 0, paid_total_registrations: 0 }
  for (const e of events) {
    if (e.k === 'farmer') out.farmers_total++; else out.businesses_total++
    if (istDay(e.at) === istDay(now)) out.today++
    if (e.at >= now - 7 * 24 * 3600 * 1000) out.last7++
    if (!e.paid) { if (e.k === 'farmer') out.counted_unpaid_farmers++; else out.counted_unpaid_businesses++ } else out.paid_total_registrations++
  }
  return out
}

// unattributed_total: people who offered a service and have no Mitra.
export const unattributedTotal = (state) => state.profiles.filter((p) => p.mitra_id == null && offered(state, p)).length

// admin_list_mitra_registrations extra: not_counted_yet = attributed but no (live) offer yet.
export const notCountedYet = (state, p) => !offered(state, p)

// my_mitra_choice_open: no Mitra AND no offer listing ever (ANY status).
export function choiceOpen(state, profileId) {
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p || p.mitra_id != null) return false
  return !(state.listings || []).some((l) => l.user_id === profileId && l.listing_type === 'offer')
}

// set_my_mitra (Batch 20, still in the database; the app no longer calls it): once, within 15 minutes of the account
// being created, only for an active Mitra. Never throws.
export function setMyMitra(state, profileId, mitraId, now = Date.now()) {
  if (mitraId == null) return { state, status: 'none' }
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p) return { state, status: 'no_profile' }
  if (p.mitra_id != null) return { state, status: 'already_set' }
  if (now - Date.parse(p.created_at) > FIFTEEN_MIN_MS) return { state, status: 'too_late' }
  if (!state.mitras.some((m) => m.id === mitraId && m.is_active)) return { state, status: 'no_such_mitra' }
  return { state: { ...state, profiles: state.profiles.map((x) => (x.id === profileId ? { ...x, mitra_id: mitraId, mitra_set_at: new Date(now).toISOString() } : x)) }, status: 'set' }
}

// set_my_mitra_on_offer: once, for the FIRST offer (offers of every status count for "first"), created in the last 30 minutes,
// active Mitra only. Never throws. The order of the answers is the order of the checks in the SQL.
export function setMyMitraOnOffer(state, profileId, mitraId, listingId, now = Date.now()) {
  if (mitraId == null) return { state, status: 'none' }
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p) return { state, status: 'no_profile' }
  if (p.mitra_id != null) return { state, status: 'already_set' }
  const l = (state.listings || []).find((x) => x.id === listingId)
  if (!l || l.user_id !== profileId || l.listing_type !== 'offer') return { state, status: 'not_your_offer' }
  const created = Date.parse(l.created_at)
  if (created < now - THIRTY_MIN_MS) return { state, status: 'too_late' }
  const earlier = (state.listings || []).some((o) => o.user_id === profileId && o.listing_type === 'offer' && o.id !== listingId
    && (Date.parse(o.created_at) < created || (Date.parse(o.created_at) === created && String(o.id) < String(listingId))))
  if (earlier) return { state, status: 'not_first_offer' }
  if (!state.mitras.some((m) => m.id === mitraId && m.is_active)) return { state, status: 'no_such_mitra' }
  return { state: { ...state, profiles: state.profiles.map((x) => (x.id === profileId ? { ...x, mitra_id: mitraId, mitra_set_at: new Date(now).toISOString() } : x)) }, status: 'set' }
}

// admin_set_announcement_mitra: null = none; a paid ad cannot be changed; an unknown ad or Mitra is not_found.
export function setAnnouncementMitra(state, announcementId, mitraId) {
  const a = (state.announcements || []).find((x) => x.id === announcementId)
  if (!a) throw new Error('not_found')
  if (a.mitra_paid_id != null) throw new Error('already_paid')
  if (mitraId != null && !state.mitras.some((m) => m.id === mitraId)) throw new Error('not_found')
  return { ...state, announcements: state.announcements.map((x) => (x.id === announcementId ? { ...x, mitra_id: mitraId } : x)) }
}

// admin_reassign_registration: a paid registration cannot be moved; null removes it from every count.
export function reassign(state, profileId, newMitraId) {
  const p = state.profiles.find((x) => x.id === profileId)
  if (!p) throw new Error('not_found')
  if (p.mitra_paid_id != null) throw new Error('already_paid')
  if (newMitraId != null && !state.mitras.some((m) => m.id === newMitraId)) throw new Error('not_found')
  return { ...state, profiles: state.profiles.map((x) => (x.id === profileId ? { ...x, mitra_id: newMitraId } : x)) }
}

// admin_mark_mitra_paid: ONE step. Stamps the counted-and-unpaid farmers AND the unpaid ads of THAT Mitra; refuses with nothing_unpaid.
export function markPaid(state, mitraId, amountRupees, paidOn, note = null) {
  if (!state.mitras.some((m) => m.id === mitraId)) throw new Error('not_found')
  if (!Number.isInteger(amountRupees) || amountRupees < 0) throw new Error('invalid_input')
  const rows = state.profiles.filter((p) => isCountedUnpaid(state, p, mitraId))
  const ads = unpaidAds(state, mitraId)
  if (rows.length + ads.length === 0) throw new Error('nothing_unpaid')
  const id = `pay-${state.payments.length + 1}`
  const payment = {
    id, mitra_id: mitraId, amount_rupees: amountRupees, paid_on: paidOn, note,
    farmer_count: rows.filter((p) => kindOf(p) === 'farmer').length,
    business_count: rows.filter((p) => kindOf(p) === 'business').length + ads.length,
  }
  const stamped = new Set(rows.map((p) => p.id))
  const stampedAds = new Set(ads.map((a) => a.id))
  return {
    ...state,
    payments: [...state.payments, payment],
    profiles: state.profiles.map((p) => (stamped.has(p.id) ? { ...p, mitra_paid_id: id } : p)),
    announcements: (state.announcements || []).map((a) => (stampedAds.has(a.id) ? { ...a, mitra_paid_id: id } : a)),
  }
}

// The "same name and village as another farmer" note: lower-cased trimmed full_name and village_town, both non-empty.
export function sameNameVillage(state, profile) {
  const n = String(profile.full_name || '').trim().toLowerCase()
  const v = String(profile.village_town || '').trim().toLowerCase()
  if (!n || !v) return false
  return state.profiles.some((o) => o.id !== profile.id && String(o.full_name || '').trim().toLowerCase() === n && String(o.village_town || '').trim().toLowerCase() === v)
}

// Amount suggestion: farmers x farmer rate + businesses (ads) x business rate. A blank rate for a kind that has people = "rate not set".
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

// ---------- Batch 22D: admin_mitra_statement (supabase/migrations/0077_mitra_statement.sql) ----------
// One Mitra's statement: every counted farmer (date = first offer) and every ad (date = created), the amount against each at the
// Mitra's CURRENT rate, paid or not, and totals over ALL rows. Listings may carry a `category`; payments carry `paid_on`.
export const STATEMENT_MAX = 500
export function statementFor(state, mitraId, { limit = 200, offset = 0 } = {}) {
  const m = state.mitras.find((x) => x.id === mitraId)
  if (!m) throw new Error('not_found')
  const lim = Math.min(Math.max(limit == null ? 200 : limit, 1), STATEMENT_MAX)
  const off = Math.max(offset == null ? 0 : offset, 0)
  const payOf = (id) => (id == null ? null : (state.payments || []).find((p) => p.id === id) || null)
  const rateOrNull = (v) => (v == null ? null : v)
  const farmers = state.profiles.filter((p) => isCounted(state, p, mitraId)).map((p) => {
    const at = firstOfferAt(state, p)
    const first = liveOffers(state, p).filter((l) => Date.parse(l.created_at) === at).sort((a, b) => String(a.id).localeCompare(String(b.id)))[0]
    const pay = payOf(p.mitra_paid_id)
    return {
      kind: 'farmer', ref_id: p.id, name: p.full_name, village: p.village_town ?? null, masked_phone: maskPhone(p.phone), category: first?.category ?? null,
      on_date: new Date(at).toISOString(), amount_rupees: rateOrNull(kindOf(p) === 'business' ? m.rate_business_rupees : m.rate_farmer_rupees),
      paid: p.mitra_paid_id != null, paid_on: pay ? pay.paid_on : null, payment_id: p.mitra_paid_id ?? null, blocked: false,
    }
  })
  const ads = (state.announcements || []).filter((a) => a.mitra_id === mitraId).map((a) => {
    const pay = payOf(a.mitra_paid_id)
    return {
      kind: 'ad', ref_id: a.id, name: a.title_hi, village: null, masked_phone: null, category: null, on_date: new Date(a.created_at).toISOString(),
      amount_rupees: rateOrNull(m.rate_business_rupees), paid: a.mitra_paid_id != null, paid_on: pay ? pay.paid_on : null, payment_id: a.mitra_paid_id ?? null, blocked: false,
    }
  })
  const all = [...farmers, ...ads].sort((a, b) => Date.parse(b.on_date) - Date.parse(a.on_date) || String(a.ref_id).localeCompare(String(b.ref_id)))
  const sum = (rows) => rows.reduce((t, r) => t + (r.amount_rupees ?? 0), 0)
  return {
    mitra: { id: m.id, display_name: m.display_name, area: m.area ?? null, is_active: m.is_active, rate_farmer_rupees: rateOrNull(m.rate_farmer_rupees), rate_business_rupees: rateOrNull(m.rate_business_rupees) },
    totals: {
      farmers: farmers.length, ads: ads.length,
      waiting_first_offer: state.profiles.filter((p) => p.mitra_id === mitraId && !p.is_blocked && !offered(state, p)).length,
      earned_rupees: sum(all), paid_rupees: sum(all.filter((r) => r.paid)), due_rupees: sum(all.filter((r) => !r.paid)),
      rate_missing: all.some((r) => r.amount_rupees == null),
    },
    rows: all.slice(off, off + lim),
  }
}
