// Loads the lookup rows a category needs for its form/summary (crops for land,
// equipment types for equipment). Single source of truth: the pincodes/crops/
// equipment_types tables — no category keeps its own copy.
import { fetchCrops, fetchEquipmentTypes } from './listingsApi'
import { EXTRAS_NEEDED } from './registry'

export async function loadExtras(category) {
  const need = EXTRAS_NEEDED[category] || []
  const extras = {}
  if (need.includes('crops')) extras.crops = await fetchCrops()
  if (need.includes('equipmentTypes')) extras.equipmentTypes = await fetchEquipmentTypes()
  return extras
}
