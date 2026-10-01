// Pure display / filter / distance helpers for Kisan Mela (unit-testable; no React, no network).
// Month-name label data lives in content/months.js (the audit-sanctioned label file), so this
// module stays free of hardcoded Devanagari.
import { haversineKm } from '../distance.js'
import { MONTHS_FULL_HI, MONTHS_FULL_EN } from '../../content/months.js'
import { normalizeState } from '../../content/states.js'

const MON_LC = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

// The month (1–12) a Mela belongs to for the month filter: confirmed start month, else the
// month parsed from an "अपेक्षित" period like "Feb 2027". null when neither is available.
export function melaMonth(mela) {
  if (mela?.is_date_confirmed && /^\d{4}-\d{2}-\d{2}$/.test(mela.event_date_start || '')) {
    return Number(mela.event_date_start.slice(5, 7))
  }
  const m = String(mela?.expected_period || '').toLowerCase().match(/([a-z]{3})/)
  return m && MON_LC[m[1]] ? MON_LC[m[1]] : null
}

// Distance (km) from a center to a Mela's coordinates, or null when either is missing.
export function melaDistanceKm(center, mela) {
  if (!center || center.latitude == null || mela?.latitude == null || mela?.longitude == null) return null
  return haversineKm(center.latitude, center.longitude, Number(mela.latitude), Number(mela.longitude))
}

// Filter by state and month (1–12). Empty filter value = no constraint. The `state` filter value is
// always a canonical English name (1e); compare against each Mela's canonicalized state so a stray
// raw variant still matches the right bucket.
export function filterMelas(melas, { state = '', month = '' } = {}) {
  const mNum = month ? Number(month) : null
  return (melas || []).filter((m) => {
    if (state && (normalizeState(m.state) || m.state) !== state) return false
    if (mNum) { const mm = melaMonth(m); if (mm !== mNum) return false }
    return true
  })
}

// Stable sort: nearest first when a center is known (coord-less melas go last); otherwise keep
// the incoming order (the API already returns soonest-date-first).
export function sortByDistance(melas, center) {
  if (!center) return [...(melas || [])]
  return [...(melas || [])]
    .map((m) => ({ m, d: melaDistanceKm(center, m) }))
    .sort((a, b) => {
      if (a.d == null && b.d == null) return 0
      if (a.d == null) return 1
      if (b.d == null) return -1
      return a.d - b.d
    })
    .map((x) => x.m)
}

// The honest date line. Confirmed → a real date range (built from the sanctioned month-name
// labels). Unconfirmed → `${expectedLabel}: <period>` (caller passes the localized "अपेक्षित"
// word via i18n, and `tbdLabel` for the no-period case) so this module hardcodes no Devanagari.
export function melaDateLabel(mela, lang, { expectedLabel = 'Expected', tbdLabel = '' } = {}) {
  const names = lang === 'hi' ? MONTHS_FULL_HI : MONTHS_FULL_EN
  if (mela?.is_date_confirmed && /^\d{4}-\d{2}-\d{2}$/.test(mela.event_date_start || '')) {
    const [y, mo, d] = mela.event_date_start.split('-').map(Number)
    if (mela.event_date_end && mela.event_date_end !== mela.event_date_start) {
      const [ey, em, ed] = mela.event_date_end.split('-').map(Number)
      if (ey === y && em === mo) return `${d}–${ed} ${names[mo - 1]} ${y}`
      return `${d} ${names[mo - 1]} – ${ed} ${names[em - 1]} ${ey}`
    }
    return `${d} ${names[mo - 1]} ${y}`
  }
  return mela?.expected_period ? `${expectedLabel}: ${mela.expected_period}` : tbdLabel
}

// True when the date is NOT confirmed — the UI shows these with an "अपेक्षित" visual treatment.
export function isExpectedDate(mela) {
  return !(mela?.is_date_confirmed && /^\d{4}-\d{2}-\d{2}$/.test(mela?.event_date_start || ''))
}

// Distinct CANONICAL states present in a list, sorted — for the state dropdown (1e). Built only from
// canonical names (raw variants folded via normalizeState); an unmappable value falls back to its raw
// text so the Mela is still filterable rather than silently excluded.
export function statesIn(melas) {
  return [...new Set((melas || []).map((m) => normalizeState(m.state) || m.state).filter(Boolean))].sort()
}
