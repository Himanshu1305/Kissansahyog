// Category registry — maps a category to its UI + logic module. Adding a new
// category (Equipment in Phase 4, Labor in Phase 5) means adding its module,
// importing it here, and listing it in ENABLED_CATEGORIES; the browse / post /
// detail screens stay category-agnostic.
import * as land from '../../components/categories/land.jsx'

const REGISTRY = { land }

// Categories wired end-to-end and shown in the UI. Grows per phase.
export const ENABLED_CATEGORIES = ['land']

export function getCategory(category) {
  const mod = REGISTRY[category]
  if (!mod) throw new Error(`Unknown or not-yet-enabled category: ${category}`)
  return mod
}

export function isEnabled(category) {
  return ENABLED_CATEGORIES.includes(category)
}

// Which lookup rows a category's Fields/summary need (fetched once by screens).
export const EXTRAS_NEEDED = {
  land: ['crops'],
  equipment: ['equipmentTypes'],
  labor: [],
}
