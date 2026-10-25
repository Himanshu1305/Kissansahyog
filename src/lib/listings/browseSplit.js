// Batch 13A — Browse splits one nearby fetch into Offering / Looking for in the browser, so switching the
// choice needs no new request. Same radius policy as before: each type keeps its own 30 km list and its own
// 30-50 km fallback (only when that type has none within 30 km). Pure functions — unit-tested.
import { partitionByRadius } from '../distance.js'

export const BROWSE_TYPES = ['offer', 'requirement']

/** ?type= value → 'offer' | 'requirement' | null (anything else is ignored). */
export function parseTypeParam(value) {
  return BROWSE_TYPES.includes(value) ? value : null
}

/** rows (each with distanceKm) → { offer: {primary, fallback}, requirement: {primary, fallback} }. */
export function splitByType(rows, sort = 'nearest') {
  const order = (a, b) => (sort === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : a.distanceKm - b.distanceKm)
  const out = {}
  for (const type of BROWSE_TYPES) {
    const { primary, fallback } = partitionByRadius((rows || []).filter((r) => r.listing_type === type), {
      getDistance: (r) => r.distanceKm,
      getCategory: (r) => r.category,
      getWide: (r) => r.wide_visibility,
    })
    out[type] = { primary: [...primary].sort(order), fallback: [...fallback].sort(order) }
  }
  return out
}

/** How many listings a type shows (near + fallback), after the page's own filters. */
export function typeCount(section, keep = () => true) {
  return section.primary.filter(keep).length + section.fallback.filter(keep).length
}

/** Popular listings respect the chosen type (null = all). */
export function filterPopular(list, type) {
  return type ? (list || []).filter((l) => l.listing_type === type) : (list || [])
}
