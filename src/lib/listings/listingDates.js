// Batch 10E (3C) — mandatory dates for time-sensitive listings: Equipment (water tanker included),
// Land and Labor (Drone Didi included), both "मेरे पास है" (offer) and "मुझे चाहिए" (requirement).
// Keys: details.available_from (required on new posts) and details.available_to (optional; empty =
// open-ended, "जब तक चाहें"). Enforcement is client-side only in this batch (server side is BACKLOG).
// Pure: no React, no network (tests/unit/post-10e.test.mjs). Day words reuse the /msp short-month
// helper (formatDay, src/lib/mandi/mspWindow.js); wording comes from strings.js.
import { formatDay } from '../mandi/mspWindow.js'
import { strings } from '../i18n/strings.js'

export const DATE_CATEGORIES = ['equipment', 'land', 'labor', 'drone_didi']
export const needsDates = (category) => DATE_CATEGORIES.includes(category)

// "Today" is the farmer's calendar day in India (IST, UTC+5:30, no daylight saving), whatever
// the device's time zone: at 01:00 IST on 19 Oct the UTC date is still 18 Oct.
const IST_OFFSET_MS = 330 * 60000
export function todayIst(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

const isIsoDay = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// The form check. Returns { field, key } (key = strings.js message) or null.
//   start missing / not a date      → err_date_required          (कृपया तारीख़ चुनें)
//   start before today (IST)        → err_date_past              (तारीख़ आज से पहले की नहीं हो सकती)
//   end not a date                  → err_date_required on the end field
//   end before start                → err_date_end_before_start  (अंतिम तारीख़ शुरू की तारीख़ से पहले नहीं हो सकती)
export function checkListingDates(from, to, today = todayIst()) {
  if (!from || !isIsoDay(from)) return { field: 'available_from', key: 'err_date_required' }
  if (from < today) return { field: 'available_from', key: 'err_date_past' }
  if (to) {
    if (!isIsoDay(to)) return { field: 'available_to', key: 'err_date_required' }
    if (to < from) return { field: 'available_to', key: 'err_date_end_before_start' }
  }
  return null
}

// The details to save for an in-scope category (others are returned unchanged). `form` is the
// form state that holds the two dates (Post.jsx keeps them in `details`).
//   equipment:  available_now is always false on new posts — "available now" is now the start date
//               "आज" (today), stored as a real date; old rows that say available_now = true keep
//               showing "अभी उपलब्ध", and their left-over from/to dates stay ignored, as before.
//   drone_didi: the requirement's old `preferred_date` is replaced by available_from (old rows keep
//               it and are still shown).
export function withListingDates(details, category, form) {
  if (!needsDates(category)) return details
  const out = { ...details, available_from: form?.available_from || null, available_to: form?.available_to || null }
  if (category === 'equipment') out.available_now = false
  if (category === 'drone_didi') delete out.preferred_date
  return out
}

const s = (key, lang) => strings[key]?.[lang] ?? strings[key]?.hi ?? key
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

// What a listing says about its dates, or null (nothing to show; old listings without dates).
//   { kind: 'offer' | 'requirement', now: true }          — old equipment "available now"
//   { kind, from, to }                                     — from and/or to (ISO days)
export function listingDateParts(listing) {
  if (!listing || !needsDates(listing.category)) return null
  const d = listing.details || {}
  const kind = listing.listing_type === 'requirement' ? 'requirement' : 'offer'
  if (listing.category === 'equipment' && d.available_now === true) return { kind, now: true }
  const from = isIsoDay(d.available_from) ? d.available_from : isIsoDay(d.preferred_date) ? d.preferred_date : null
  const to = isIsoDay(d.available_to) ? d.available_to : null
  if (!from && !to) return null
  return { kind, from, to }
}

// "20 अक्टू से" · "22 अक्टू तक" · "20 अक्टू से 25 अक्टू तक" · "20 अक्टू" (same day) · "अभी उपलब्ध".
export function formatDatesValue(parts, lang = 'hi', now = new Date()) {
  if (!parts) return ''
  if (parts.now) return s('avail_now', lang)
  const day = (iso) => formatDay(iso, lang, now)
  if (parts.from && parts.to) {
    if (parts.from === parts.to) return day(parts.from)
    return fill(s('dates_range', lang), { a: day(parts.from), b: day(parts.to) })
  }
  if (parts.from) return fill(s('dates_from_only', lang), { d: day(parts.from) })
  return fill(s('dates_to_only', lang), { d: day(parts.to) })
}

// One row for the detail page / summaries: { label: 'उपलब्ध' | 'चाहिए' | 'उपलब्धता', value, dates: true }.
export function datesRow(listing, lang = 'hi', now = new Date()) {
  const parts = listingDateParts(listing)
  if (!parts) return null
  const label = parts.now ? s('field_availability', lang) : s(parts.kind === 'requirement' ? 'dates_label_req' : 'dates_label_offer', lang)
  return { label, value: formatDatesValue(parts, lang, now), dates: true }
}

// The card line: "उपलब्ध: 20 अक्टू से", "चाहिए: 22 अक्टू तक", "अभी उपलब्ध".
export function datesLine(listing, lang = 'hi', now = new Date()) {
  const row = datesRow(listing, lang, now)
  if (!row) return null
  return listingDateParts(listing).now ? row.value : `${row.label}: ${row.value}`
}
