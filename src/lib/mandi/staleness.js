import { dayKind, istToday } from './pickRule.js'
// Pure staleness classification for a mandi price date — extracted from pages/shared.jsx
// so it can be unit-tested in Node without JSX. Phase 4c honest labeling:
//   'today'     → plain price, no tag
//   'yesterday' → "कल का भाव (dd/mm)" (exactly one day old)
//   'older'     → "पिछला भाव (dd/mm)" (more than one day old)
//   null        → no/invalid date
export function priceStaleness(dateStr, now = new Date()) {
  // Batch 23: the calendar day is the day in India (IST), never the device's own time zone.
  const k = dayKind(dateStr, istToday(now))
  return k
}

// The i18n key for a given staleness (null/today → no tag). Used by StaleTag + tests.
export function stalenessLabelKey(kind) {
  if (kind === 'yesterday') return 'mandi_price_yesterday'
  if (kind === 'older') return 'mandi_price_older'
  return null
}

// dd/mm from an ISO date string (always shown next to a non-today price).
export function ddmm(dateStr) {
  const [, m, d] = String(dateStr || '').split('-')
  return d && m ? `${d}/${m}` : ''
}
