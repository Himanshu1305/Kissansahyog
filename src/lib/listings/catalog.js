// Central option catalog for listing fields — every enum lives here once, with
// bilingual labels, so forms and detail views render the same labels and the
// JSONB `details` shape can never drift between categories.

// Order matters (nav strip, browse tabs, post selector). Land is intentionally
// LAST; Drone Didi sits after Labor.
export const CATEGORIES = ['equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse', 'jugaad', 'transport', 'land']

// --- Jugaad / Rural Innovations (Phase 9) ---
export const JUGAAD_OFFER_TYPE = [
  { value: 'sell', hi: 'बेचना', en: 'Sell' },
  { value: 'rent', hi: 'किराये पर', en: 'Rent' },
  { value: 'service', hi: 'सेवा', en: 'Service' },
  { value: 'make_to_order', hi: 'ऑर्डर पर बनाना', en: 'Make to order' },
  { value: 'wip_help', hi: 'विकास में — मदद/साझेदारी चाहिए', en: 'Work in progress — need help/partnership' },
]
export const JUGAAD_TESTED = [
  { value: 'tested', hi: 'परीक्षित', en: 'Tested' },
  { value: 'untested', hi: 'अपरीक्षित', en: 'Untested' },
]

// --- Greenhouse / polyhouse (Phase 7) ---
export const GH_VENDOR_SUBTYPE = [
  { value: 'construction', hi: 'निर्माण / टर्नकी', en: 'Construction / turnkey' },
  { value: 'repair_film', hi: 'मरम्मत व फ़िल्म बदलना', en: 'Repair & film replacement' },
  { value: 'drip_fogger', hi: 'ड्रिप / फॉगर / फर्टिगेशन', en: 'Drip / fogger / fertigation' },
  { value: 'nursery', hi: 'पौध / नर्सरी', en: 'Seedlings / nursery' },
  { value: 'advice_docs', hi: 'सलाह व सब्सिडी कागज़ात', en: 'Advice & subsidy paperwork' },
  { value: 'used_material', hi: 'पुराना ढांचा / सामग्री', en: 'Used structure / material' },
]
export const GH_STRUCTURE = [
  { value: 'polyhouse', hi: 'पॉलीहाउस', en: 'Polyhouse' },
  { value: 'shadenet', hi: 'शेड-नेट', en: 'Shade-net' },
  { value: 'fanpad', hi: 'फैन-पैड', en: 'Fan-pad' },
  { value: 'lowtunnel', hi: 'वॉक-इन / लो-टनल', en: 'Walk-in / low tunnel' },
]
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
  building_materials: { icon: '🧱', hi: 'निर्माण सामग्री', en: 'Building materials' },
  warehouse: { icon: '🏬', hi: 'गोदाम और कोल्ड स्टोरेज', en: 'Warehouse & Cold Storage' },
  greenhouse: { icon: '🏡', hi: 'ग्रीनहाउस / पॉलीहाउस', en: 'Greenhouse / Polyhouse' },
  jugaad: { icon: '🛠️', hi: 'जुगाड़ / ग्रामीण नवाचार', en: 'Jugaad / Rural Innovations' },
  transport: { icon: '🚚', hi: 'परिवहन / ढुलाई', en: 'Transport' },
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
// Land size is now a plain numeric acreage (details.size_acres); the old SIZE_RANGE
// buckets were removed in migration 0028 (Part B).
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

// Equipment tags are optional and filterable. Existing equipment rows have no
// `equipment_tags` key and continue to render normally.
export const EQUIPMENT_TAGS = [
  { value: 'vegetable_farming', hi: 'सब्ज़ी खेती के यंत्र', en: 'Vegetable farming equipment' },
  { value: 'rare_emergency', hi: 'दुर्लभ या ज़रूरत पर मिलने वाले यंत्र', en: 'Rare or emergency equipment' },
]

// --- Water tanker (equipment sub-type, Phase 5) ---
export const TANKER_VEHICLE = [
  { value: 'tractor_trolley', hi: 'ट्रैक्टर-ट्रॉली', en: 'Tractor-trolley' },
  { value: 'truck', hi: 'ट्रक', en: 'Truck' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const TANKER_WATER_USE = [
  { value: 'potable', hi: 'पीने योग्य', en: 'Potable' },
  { value: 'non_potable', hi: 'गैर-पीने योग्य', en: 'Non-potable' },
  { value: 'both', hi: 'दोनों', en: 'Both' },
]
export const TANKER_WATER_SOURCE = [
  { value: 'own_borewell', hi: 'अपना बोरवेल', en: 'Own borewell' },
  { value: 'panchayat_municipal', hi: 'पंचायत/नगर पालिका', en: 'Panchayat/Municipal' },
  { value: 'river_pond', hi: 'नदी/तालाब', en: 'River/Pond' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const MONTH_OPTIONS = [
  { value: 'jan', hi: 'जन', en: 'Jan' }, { value: 'feb', hi: 'फ़र', en: 'Feb' },
  { value: 'mar', hi: 'मार्च', en: 'Mar' }, { value: 'apr', hi: 'अप्रैल', en: 'Apr' },
  { value: 'may', hi: 'मई', en: 'May' }, { value: 'jun', hi: 'जून', en: 'Jun' },
  { value: 'jul', hi: 'जुल', en: 'Jul' }, { value: 'aug', hi: 'अग', en: 'Aug' },
  { value: 'sep', hi: 'सित', en: 'Sep' }, { value: 'oct', hi: 'अक्टू', en: 'Oct' },
  { value: 'nov', hi: 'नव', en: 'Nov' }, { value: 'dec', hi: 'दिस', en: 'Dec' },
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
// Cold-storage specific (Phase 6) — shown when warehouse_type = 'cold'.
export const CS_FACILITY_TYPE = [
  { value: 'bulk', hi: 'बल्क (एक फसल)', en: 'Bulk (single commodity)' },
  { value: 'multi', hi: 'मल्टी-कमोडिटी', en: 'Multi-commodity' },
  { value: 'solar', hi: 'सोलर कोल्ड रूम', en: 'Solar cold room' },
  { value: 'ripening', hi: 'राइपनिंग चैंबर', en: 'Ripening chamber' },
  { value: 'ca', hi: 'CA (नियंत्रित वातावरण)', en: 'CA (controlled atmosphere)' },
]
export const CS_RATE_UNIT = [
  { value: 'per_qtl_month', hi: 'प्रति क्विंटल/माह', en: 'Per quintal/month' },
  { value: 'per_bag_season', hi: 'प्रति बोरी/सीज़न', en: 'Per bag/season' },
  { value: 'per_crate_day', hi: 'प्रति क्रेट/दिन', en: 'Per crate/day' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const YES_NO = [
  { value: 'yes', hi: 'हाँ', en: 'Yes' },
  { value: 'no', hi: 'नहीं', en: 'No' },
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

// --- Building materials ---
export const BUILDING_MATERIAL_TYPE = [
  { value: 'cement', hi: 'सीमेंट', en: 'Cement' },
  { value: 'sand', hi: 'रेत', en: 'Sand' },
  { value: 'iron_rod', hi: 'सरिया', en: 'Iron rod' },
  { value: 'bricks', hi: 'ईंट', en: 'Bricks' },
  { value: 'gravel', hi: 'गिट्टी', en: 'Gravel' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const BUILDING_MATERIAL_UNIT = [
  { value: 'bag', hi: 'बैग', en: 'Bag' },
  { value: 'ton', hi: 'टन', en: 'Ton' },
  { value: 'trolley', hi: 'ट्रॉली', en: 'Trolley' },
  { value: 'piece', hi: 'नग', en: 'Piece' },
  { value: 'kg', hi: 'किलो', en: 'kg' },
]

// --- Transport / logistics (a transporter listing themselves; no route model) ---
// vehicle_type + rate_basis are required (dropdowns); capacity + rate_amount are optional.
export const VEHICLE_TYPE = [
  { value: 'tractor_trolley', hi: 'ट्रैक्टर-ट्रॉली', en: 'Tractor-trolley' },
  { value: 'pickup', hi: 'पिकअप', en: 'Pickup' },
  { value: 'truck', hi: 'ट्रक', en: 'Truck' },
  { value: 'tempo', hi: 'टेम्पो', en: 'Tempo' },
  { value: 'other', hi: 'अन्य', en: 'Other' },
]
export const TRANSPORT_RATE_BASIS = [
  { value: 'per_km', hi: 'प्रति किमी', en: 'Per km' },
  { value: 'per_trip', hi: 'प्रति ट्रिप', en: 'Per trip' },
  { value: 'negotiable', hi: 'बातचीत से', en: 'Negotiable' },
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
