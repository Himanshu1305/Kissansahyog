// Central option catalog for listing fields — every enum lives here once, with
// bilingual labels, so forms and detail views render the same labels and the
// JSONB `details` shape can never drift between categories.

// Order matters (nav strip, browse tabs, post selector). Land is intentionally
// LAST; Drone Didi sits after Labor.
export const CATEGORIES = ['equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'land']
export const LISTING_TYPES = ['offer', 'requirement']

// Category display metadata (icon + bilingual name).
export const CATEGORY_META = {
  land: { icon: '🌱', hi: 'ज़मीन', en: 'Land' },
  equipment: { icon: '🚜', hi: 'मशीन', en: 'Equipment' },
  labor: { icon: '👷', hi: 'कृषि सहयोगी (Labor)', en: 'Labor' },
  // icon is a fallback only — Drone Didi renders a quadcopter SVG via <CatIcon>
  // (never a helicopter). Kept non-helicopter here for safety.
  drone_didi: { icon: '🛰️', hi: 'ड्रोन दीदी', en: 'Drone Didi' },
  bhusa: { icon: '🌾', hi: 'भूसा / पराली', en: 'Bhoosa / Parali' },
  agri_inputs: { icon: '🧪', hi: 'कृषि सामग्री', en: 'Seeds, Fertilizers & More' },
  warehouse: { icon: '🏬', hi: 'गोदाम / भंडारण', en: 'Warehouse & Storage' },
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

// --- Drone Didi (women-operated drone spraying service) ---
export const DRONE_TYPE = [
  { value: 'multi_rotor', hi: 'मल्टी-रोटर', en: 'Multi-rotor' },
  { value: 'fixed_wing', hi: 'फिक्स्ड विंग', en: 'Fixed-wing' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const DRONE_SERVICE = [
  { value: 'pesticide', hi: 'कीटनाशक छिड़काव', en: 'Pesticide spraying' },
  { value: 'fertilizer', hi: 'खाद छिड़काव', en: 'Fertilizer spraying' },
  { value: 'water', hi: 'पानी छिड़काव', en: 'Water spraying' },
  { value: 'seed_sowing', hi: 'बीज बुआई', en: 'Seed sowing' },
]

// --- Warehouse & Storage ---
export const WAREHOUSE_TYPE = [
  { value: 'general', hi: 'सामान्य गोदाम', en: 'General Storage' },
  { value: 'cold', hi: 'शीत भंडार', en: 'Cold Storage' },
  { value: 'silo', hi: 'अनाज भंडार', en: 'Grain Silo' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const WAREHOUSE_FACILITY = [
  { value: 'electricity', hi: 'बिजली', en: 'Electricity' },
  { value: 'water', hi: 'पानी', en: 'Water' },
  { value: 'security', hi: 'सुरक्षा', en: 'Security Guard' },
  { value: 'loading', hi: 'लोडिंग-अनलोडिंग', en: 'Loading-Unloading' },
  { value: 'weighing', hi: 'वजन काँटा', en: 'Weighing Scale' },
]

// --- Bhusa / Parali (agricultural residue) ---
export const RESIDUE_TYPE = [
  { value: 'bhusa', hi: 'भूसा (गेहूं)', en: 'Bhusa (Wheat Straw)' },
  { value: 'parali', hi: 'पराली (धान)', en: 'Parali (Paddy Straw)' },
  { value: 'sugarcane', hi: 'गन्ना वेस्ट', en: 'Sugarcane Waste' },
  { value: 'cotton', hi: 'कपास वेस्ट', en: 'Cotton Waste' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const PICKUP_ARRANGEMENT = [
  { value: 'buyer_collects', hi: 'खरीदार खेत से उठाएगा', en: 'Buyer collects from farm' },
  { value: 'farmer_delivers', hi: 'किसान डिलीवर करेगा', en: 'Farmer will deliver' },
  { value: 'either', hi: 'दोनों चलेगा', en: 'Either works' },
]
export const BUYER_TYPE_PREFERENCE = [
  { value: 'individual', hi: 'व्यक्तिगत किसान / छोटा खरीदार', en: 'Individual farmer or small buyer' },
  { value: 'commercial', hi: 'व्यावसायिक / उद्योग', en: 'Commercial or industrial buyer' },
  { value: 'either', hi: 'दोनों', en: 'Either' },
]

// --- Agri-Inputs (seeds / fertilizer / pesticide) ---
export const AGRI_SUBTYPE = [
  { value: 'farmer_surplus', hi: 'किसान — अतिरिक्त सामग्री बेचना', en: 'Farmer selling surplus' },
  { value: 'vendor', hi: 'दुकान / विक्रेता', en: 'Shop / Vendor' },
]
export const INPUT_TYPE = [
  { value: 'seeds', hi: 'बीज', en: 'Seeds' },
  { value: 'fertilizer', hi: 'खाद (यूरिया/DAP/अन्य)', en: 'Fertilizer' },
  { value: 'pesticide', hi: 'कीटनाशक', en: 'Pesticide' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const INPUT_CONDITION = [
  { value: 'good', hi: 'अच्छी स्थिति में', en: 'Good condition' },
  { value: 'original_packaging', hi: 'मूल पैकेजिंग में', en: 'Original packaging' },
  { value: 'opened', hi: 'खुली', en: 'Opened' },
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
