// Category registry — maps a category to its UI + logic module. Adding a new
// category (Equipment in Phase 4, Labor in Phase 5) means adding its module,
// importing it here, and listing it in ENABLED_CATEGORIES; the browse / post /
// detail screens stay category-agnostic.
import * as land from '../../components/categories/land.jsx'
import * as equipment from '../../components/categories/equipment.jsx'
import * as labor from '../../components/categories/labor.jsx'
import * as bhusa from '../../components/categories/bhusa.jsx'
import * as agri_inputs from '../../components/categories/agri_inputs.jsx'
import * as drone_didi from '../../components/categories/drone_didi.jsx'

const REGISTRY = { land, equipment, labor, drone_didi, bhusa, agri_inputs }

// Categories wired end-to-end and shown in the UI. Order matters (nav/tabs) —
// Land is LAST.
export const ENABLED_CATEGORIES = ['equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'land']

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
  drone_didi: [],
  bhusa: [],
  agri_inputs: [],
}
