// Central option catalog for listing fields — every enum lives here once, with
// bilingual labels, so forms and detail views render the same labels and the
// JSONB `details` shape can never drift between categories.

export const CATEGORIES = ['land', 'equipment', 'labor']
export const LISTING_TYPES = ['offer', 'requirement']

// Category display metadata (icon + bilingual name).
export const CATEGORY_META = {
  land: { icon: '🌱', hi: 'ज़मीन', en: 'Land' },
  equipment: { icon: '🚜', hi: 'मशीन', en: 'Equipment' },
  labor: { icon: '👷', hi: 'कृषि सहयोगी', en: 'Labor' },
}

export const LISTING_TYPE_META = {
  offer: { hi: 'दे रहे हैं (Offer)', en: 'Offering' },
  requirement: { hi: 'चाहिए (Requirement)', en: 'Looking for' },
}

// --- Land ---
// Rate/price arrangement for a land listing (required at creation).
// "fixed" reveals an amount field; the other two are self-describing.
export const PRICE_TYPE = [
  { value: 'fixed', hi: 'तय ठेका दर', en: 'Fixed rent amount' },
  { value: 'sharecropping', hi: 'बटाई (% में)', en: 'Sharecropping (% split)' },
  { value: 'negotiable', hi: 'बातचीत से', en: 'Open to negotiation' },
]
export const SIZE_RANGE = [
  { value: '<1', hi: '1 एकड़ से कम', en: 'Less than 1 acre' },
  { value: '1-2', hi: '1–2 एकड़', en: '1–2 acres' },
  { value: '2-5', hi: '2–5 एकड़', en: '2–5 acres' },
  { value: '5-10', hi: '5–10 एकड़', en: '5–10 acres' },
  { value: '10+', hi: '10+ एकड़', en: '10+ acres' },
]
export const ARRANGEMENT = [
  { value: 'lease', hi: 'पट्टा / किराया (Lease)', en: 'Lease' },
  { value: 'sharecropping', hi: 'बटाई (Sharecropping)', en: 'Sharecropping' },
  { value: 'contract_farming', hi: 'ठेका खेती (Contract)', en: 'Contract farming' },
]
export const WATER_SOURCE = [
  { value: 'borewell', hi: 'बोरवेल', en: 'Borewell' },
  { value: 'canal', hi: 'नहर', en: 'Canal' },
  { value: 'rainfed', hi: 'वर्षा आधारित', en: 'Rainfed' },
  { value: 'none', hi: 'कोई नहीं', en: 'None' },
]
export const SEASON = [
  { value: 'kharif', hi: 'खरीफ', en: 'Kharif' },
  { value: 'rabi', hi: 'रबी', en: 'Rabi' },
  { value: 'zaid', hi: 'ज़ायद', en: 'Zaid' },
  { value: 'year_round', hi: 'पूरे साल', en: 'Year-round' },
]

// --- Equipment ---
export const RENTAL_BASIS = [
  { value: 'per_hour', hi: 'प्रति घंटा', en: 'Per hour' },
  { value: 'per_acre', hi: 'प्रति एकड़', en: 'Per acre' },
  { value: 'per_day', hi: 'प्रति दिन', en: 'Per day' },
]

// --- Labor ---
export const WORK_TYPE = [
  { value: 'sowing', hi: 'बुवाई', en: 'Sowing' },
  { value: 'harvesting', hi: 'कटाई', en: 'Harvesting' },
  { value: 'weeding', hi: 'निराई', en: 'Weeding' },
  // Women drone operators for spraying under the govt "Drone Didi" scheme.
  { value: 'drone_operator', hi: 'ड्रोन ऑपरेटर (ड्रोन दीदी)', en: 'Drone Operator (Drone Didi)' },
  { value: 'general', hi: 'सामान्य काम', en: 'General' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const RATE_BASIS = [
  { value: 'per_day', hi: 'प्रति दिन', en: 'Per day' },
  { value: 'per_task', hi: 'प्रति काम', en: 'Per task' },
]

// Look up a bilingual label for an option value; falls back to the raw value.
export function optionLabel(list, value, lang) {
  const found = list.find((o) => o.value === value)
  return found ? found[lang] : value ?? ''
}

// Multi-select join (for `arrangement` array).
export function optionLabels(list, values, lang) {
  if (!Array.isArray(values)) return ''
  return values.map((v) => optionLabel(list, v, lang)).join(', ')
}
