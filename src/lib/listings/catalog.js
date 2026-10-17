// Central option catalog for listing fields — every enum lives here once, with
// bilingual labels, so forms and detail views render the same labels and the
// JSONB `details` shape can never drift between categories.

// Order matters (nav strip, browse tabs, post selector). Land is intentionally
// LAST; Drone Didi sits after Labor.
export const CATEGORIES = ['equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse', 'jugaad', 'transport', 'land']

// Categories where the poster is a provider (machines, storage, structures, innovations). With a
// vendor source, these are the listings whose number may be shown after the owner agrees (Batch 9B).
export const PROVIDER_CATS = ['equipment', 'warehouse', 'greenhouse', 'jugaad']

// One source of truth for seller-photo limits across listing categories.
export const PHOTO_LIMITS = { default: 3, warehouse: 5, land: 5, greenhouse: 5 }

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
  land: { icon: '🌱', hi: 'भूमि / रकबा', en: 'Land (Bhoomi / Rakba)' },
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

// --- Equipment spec fields (Batch 9C) ---
// ONE table drives the form, the checks, the detail page, the server rule (migration 0063 embeds
// equipmentServerRules()) and the generated tests. Keyed by equipment_types.name_en (ids are never
// hard-coded). A type that is not in EQUIPMENT_SPECS (Trolley, Water tanker, any future type) has no
// spec fields and no server check. Offers: every field below is mandatory except output per hour.
// Requirements: only the optional minimum HP, for types that have an HP field.
export const SPEC_VERSION = 1
export const SPEC_YEAR_MIN = 1990

export const TRACTOR_BRANDS = [
  { value: 'Mahindra', hi: 'महिंद्रा', en: 'Mahindra' },
  { value: 'Swaraj', hi: 'स्वराज', en: 'Swaraj' },
  { value: 'Massey Ferguson', hi: 'मैसी फर्ग्यूसन', en: 'Massey Ferguson' },
  { value: 'John Deere', hi: 'जॉन डियर', en: 'John Deere' },
  { value: 'Sonalika', hi: 'सोनालिका', en: 'Sonalika' },
  { value: 'New Holland', hi: 'न्यू हॉलैंड', en: 'New Holland' },
  { value: 'Eicher', hi: 'आयशर', en: 'Eicher' },
  { value: 'Farmtrac', hi: 'फार्मट्रैक', en: 'Farmtrac' },
  { value: 'Kubota', hi: 'कुबोटा', en: 'Kubota' },
  { value: 'Powertrac', hi: 'पावरट्रैक', en: 'Powertrac' },
  { value: 'Preet', hi: 'प्रीत', en: 'Preet' },
  { value: 'Indo Farm', hi: 'इंडो फार्म', en: 'Indo Farm' },
  { value: 'other', hi: 'अन्य ब्रांड', en: 'Other brand' },
]

export const OUTPUT_UNITS = [
  { value: 'acre_hour', hi: 'एकड़/घंटा', en: 'acre/hour' },
  { value: 'quintal_hour', hi: 'क्विंटल/घंटा', en: 'quintal/hour' },
  { value: 'pits_hour', hi: 'गड्ढे/घंटा', en: 'pits/hour' },
  { value: 'cum_hour', hi: 'घन मीटर/घंटा', en: 'cubic metre/hour' },
  { value: 'other', hi: 'अन्य', en: 'other' },
]

// What the HP number means for a type.
const POWER_LABELS = {
  tractor_hp: { hi: 'ट्रैक्टर की अश्वशक्ति (HP)', en: 'Tractor HP' },
  tractor_hp_needed: { hi: 'ज़रूरी ट्रैक्टर अश्वशक्ति (HP)', en: 'Tractor HP needed' },
  engine_hp: { hi: 'इंजन की अश्वशक्ति (HP)', en: 'Engine HP' },
  power_hp: { hi: 'अश्वशक्ति (HP)', en: 'Power (HP)' },
}

// Field definitions. kind: text | year | int (whole number lo..hi) | gt (number > lo, <= hi) | ge (>= lo, <= hi).
export const SPEC_FIELDS = {
  brand: { kind: 'text', label: { hi: 'ब्रांड / कंपनी', en: 'Brand' } },
  brand_other: { kind: 'text', label: { hi: 'ब्रांड का नाम', en: 'Brand name' } },
  model: { kind: 'text', label: { hi: 'मॉडल', en: 'Model' }, ph: { hi: 'मॉडल का नाम', en: 'Model name' } },
  year: { kind: 'year', label: { hi: 'निर्माण वर्ष', en: 'Year of manufacture' }, ph: { hi: 'जैसे 2023', en: 'e.g. 2023' } },
  power_hp: { kind: 'gt', lo: 0, hi: 500, label: POWER_LABELS.power_hp },
  spec_auger_size: { kind: 'text', label: { hi: 'बरमे (ऑगर) का साइज़', en: 'Auger size' } },
  spec_lifting_capacity: { kind: 'text', label: { hi: 'उठाने की क्षमता', en: 'Lifting capacity' } },
  spec_crop: { kind: 'text', label: { hi: 'फसल', en: 'Crop' } },
  spec_cutting_width: { kind: 'text', label: { hi: 'कटाई की चौड़ाई', en: 'Cutting width' } },
  spec_working_width: { kind: 'text', label: { hi: 'काम की चौड़ाई', en: 'Working width' } },
  spec_rows: { kind: 'int', lo: 1, hi: 100, label: { hi: 'कतारों की संख्या', en: 'Number of rows' } },
  spec_bucket_size: { kind: 'text', label: { hi: 'बकेट (बाल्टी) का साइज़', en: 'Bucket size' } },
  spec_tank_litres: { kind: 'gt', lo: 0, hi: 1000, label: { hi: 'टंकी (लीटर)', en: 'Tank (litres)' } },
  spec_flight_minutes: { kind: 'gt', lo: 0, hi: 600, label: { hi: 'उड़ान समय (मिनट)', en: 'Flight time (minutes)' } },
  spec_machine_name: { kind: 'text', label: { hi: 'मशीन का नाम', en: 'Machine name' } },
  // optional
  output_per_hour: { kind: 'gt', lo: 0, hi: 100000, label: { hi: 'प्रति घंटा कार्य क्षमता', en: 'Output per hour' } },
  output_unit: { kind: 'text', label: { hi: 'इकाई', en: 'Unit' } },
  output_unit_other: { kind: 'text', label: { hi: 'इकाई लिखें', en: 'Write the unit' } },
  min_hp: { kind: 'gt', lo: 0, hi: 500, label: { hi: 'न्यूनतम अश्वशक्ति (HP)', en: 'Minimum HP' }, ph: { hi: 'जैसे 40', en: 'e.g. 40' } },
}
// Optional `ph` above = grey example text (placeholder) only: never saved, never counted as a value.

// Per type: brandDropdown (tractor-based types), power (POWER_LABELS key, or null = no HP field),
// hpZero (0 allowed), extra (type-specific mandatory fields, in form order), unit (default output unit).
export const EQUIPMENT_SPECS = {
  'Tractor': { brandDropdown: true, power: 'tractor_hp', extra: [], unit: 'acre_hour' },
  'Pit Digging Tractor': { brandDropdown: true, power: 'tractor_hp', extra: ['spec_auger_size'], unit: 'pits_hour' },
  'Crane Tractor': { brandDropdown: true, power: 'tractor_hp', extra: ['spec_lifting_capacity'], unit: 'other' },
  'Thresher': { power: 'tractor_hp_needed', extra: ['spec_crop'], unit: 'quintal_hour' },
  'Harvester': { power: 'engine_hp', extra: ['spec_cutting_width', 'spec_crop'], unit: 'acre_hour' },
  'Rotavator': { power: 'tractor_hp_needed', extra: ['spec_working_width'], unit: 'acre_hour' },
  'Seed Drill': { power: 'tractor_hp_needed', extra: ['spec_rows'], unit: 'acre_hour' },
  'Reaper': { power: 'power_hp', extra: ['spec_working_width'], unit: 'acre_hour' },
  'Paddy Planting Machine': { power: 'power_hp', extra: ['spec_rows'], unit: 'acre_hour' },
  'Blower': { power: 'power_hp', extra: [], unit: 'quintal_hour' },
  'LCB (Straw Machine)': { power: 'power_hp', extra: [], unit: 'quintal_hour' },
  'JCB / Excavator': { power: 'engine_hp', extra: ['spec_bucket_size'], unit: 'cum_hour' },
  'Drone': { power: null, extra: ['spec_tank_litres', 'spec_flight_minutes'], unit: 'acre_hour' },
  'Other': { power: 'power_hp', hpZero: true, extra: ['spec_machine_name'], unit: 'other' },
}
// Types that keep today's form unchanged (no spec fields at all).
export const EQUIPMENT_NO_SPEC_TYPES = ['Trolley', 'Water tanker']
// Every key this feature may write into details (used to drop keys of another type before saving).
export const SPEC_KEYS = [...Object.keys(SPEC_FIELDS), 'spec_version']

export const SPEC_HP_ZERO_HINT = { hi: 'इंजन न हो तो 0 लिखें', en: '0 if it has no engine' }
// Batch 10A: per-type example values (placeholders). Grey hint text only — never saved, never a value.
const examplePh = (n) => ({ hi: `जैसे ${n}`, en: `e.g. ${n}` })
const MODEL_PH_TRACTOR = examplePh('575 DI')
const MODEL_PH_TRACTOR_TYPES = ['Tractor', 'Pit Digging Tractor', 'Crane Tractor']
const POWER_PH = { tractor_hp: examplePh(45), tractor_hp_needed: examplePh(35), engine_hp: examplePh(90), power_hp: examplePh(7) }
const OUTPUT_PH = { acre_hour: examplePh('1.5'), quintal_hour: examplePh(20), pits_hour: examplePh(50), cum_hour: examplePh(25) }

// The example text for one spec field of a type: { hi, en } | null. Output per hour follows `unit`
// (the unit shown in the form), which defaults to the type's own default unit; 'other' has none.
export function specPlaceholder(key, typeName, unit) {
  const spec = equipmentSpecFor(typeName)
  if (!spec) return null
  if (key === 'model' && MODEL_PH_TRACTOR_TYPES.includes(typeName)) return MODEL_PH_TRACTOR
  if (key === 'power_hp') return spec.power ? POWER_PH[spec.power] || null : null
  if (key === 'output_per_hour') return OUTPUT_PH[unit || spec.unit] || null
  if (key === 'min_hp' && !spec.power) return null
  return SPEC_FIELDS[key]?.ph || null
}

export const SPEC_SELLER_NOTE = { hi: 'विक्रेता द्वारा दी गई जानकारी', en: 'Details given by the seller' }

export function equipmentSpecFor(typeName) {
  return typeName && Object.prototype.hasOwnProperty.call(EQUIPMENT_SPECS, typeName) ? EQUIPMENT_SPECS[typeName] : null
}

// The mandatory offer fields of a type, in form order: [{ key, kind, lo, hi, label, hint?, dropdown? }].
// brand_other is not listed: it is mandatory only when brand = other on a dropdown type.
export function equipmentSpecFields(typeName) {
  const spec = equipmentSpecFor(typeName)
  if (!spec) return []
  const f = (key, over = {}) => ({ key, ...SPEC_FIELDS[key], ...over })
  const out = [f('brand', spec.brandDropdown ? { dropdown: true } : {}), f('model'), f('year')]
  if (spec.power) out.push(f('power_hp', { label: POWER_LABELS[spec.power], kind: spec.hpZero ? 'ge' : 'gt', ...(spec.hpZero ? { hint: SPEC_HP_ZERO_HINT } : {}) }))
  for (const k of spec.extra) out.push(f(k))
  return out
}

export function specYearMax(now = new Date()) {
  return now.getFullYear() + 1
}

// Devanagari digits typed on some keyboards count as normal digits.
export function asciiDigits(v) {
  return String(v ?? '').replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966)).trim()
}

// Check one value against a field definition: null (ok) | 'required' | 'range'.
function checkValue(def, raw, now) {
  const v = def.kind === 'text' ? String(raw ?? '').trim() : asciiDigits(raw)
  if (v === '') return 'required'
  if (def.kind === 'text') return null
  if (def.kind === 'year') {
    if (!/^[0-9]{4}$/.test(v)) return 'range'
    const n = Number(v)
    return n < SPEC_YEAR_MIN || n > specYearMax(now) ? 'range' : null
  }
  if (def.kind === 'int') {
    if (!/^[0-9]+$/.test(v)) return 'range'
    const n = Number(v)
    return n < def.lo || n > def.hi ? 'range' : null
  }
  if (!/^[0-9]+(\.[0-9]+)?$/.test(v)) return 'range'
  const n = Number(v)
  if (def.kind === 'ge') return n < def.lo || n > def.hi ? 'range' : null
  return n <= def.lo || n > def.hi ? 'range' : null
}

// The same rules as the server (migration 0063) plus the optional output / min HP checks.
// Returns null or { field, reason }. Requirements: only min_hp (optional) is checked.
export function checkEquipmentSpec(details, typeName, listingType, now = new Date()) {
  const spec = equipmentSpecFor(typeName)
  if (!spec) return null
  const d = details || {}
  if (listingType === 'requirement') {
    if (spec.power && asciiDigits(d.min_hp) !== '') {
      const r = checkValue(SPEC_FIELDS.min_hp, d.min_hp, now)
      if (r) return { field: 'min_hp', reason: r }
    }
    return null
  }
  for (const f of equipmentSpecFields(typeName)) {
    const r = checkValue(f, d[f.key], now)
    if (r) return { field: f.key, reason: r }
    if (f.key === 'brand' && f.dropdown && d.brand === 'other') {
      const r2 = checkValue(SPEC_FIELDS.brand_other, d.brand_other, now)
      if (r2) return { field: 'brand_other', reason: r2 }
    }
  }
  if (asciiDigits(d.output_per_hour) !== '') {
    const r = checkValue(SPEC_FIELDS.output_per_hour, d.output_per_hour, now)
    if (r) return { field: 'output_per_hour', reason: r }
    if (d.output_unit === 'other' && !String(d.output_unit_other || '').trim()) return { field: 'output_unit_other', reason: 'required' }
  }
  return null
}

// The definition of a field for a type (the HP field's label and kind depend on the type).
function specFieldDef(typeName, key) {
  return equipmentSpecFields(typeName).find((f) => f.key === key) || SPEC_FIELDS[key] || { kind: 'text', label: { hi: key, en: key } }
}
export function specFieldLabel(typeName, key) {
  return specFieldDef(typeName, key).label
}

// One message builder for the form AND the server's answer, so both say the same (Hindi-first).
export function equipmentSpecMessage({ field, reason }, typeName, lang = 'hi', now = new Date()) {
  const def = specFieldDef(typeName, field)
  const hi = lang !== 'en'
  const label = def.label[hi ? 'hi' : 'en']
  if (reason === 'required') {
    if (def.dropdown) return hi ? `${label} चुनें — यह ज़रूरी है।` : `Choose the ${label.toLowerCase()} — it is required.`
    return hi ? `${label} ज़रूरी है।` : `${label} is required.`
  }
  if (def.kind === 'year') {
    const max = specYearMax(now)
    return hi ? `${label}: ${SPEC_YEAR_MIN} से ${max} के बीच का पूरा साल लिखें (जैसे 2022)।` : `${label}: enter a whole year from ${SPEC_YEAR_MIN} to ${max} (e.g. 2022).`
  }
  if (def.kind === 'int') return hi ? `${label}: ${def.lo} से ${def.hi} तक की पूरी संख्या लिखें।` : `${label}: enter a whole number from ${def.lo} to ${def.hi}.`
  if (def.kind === 'ge') return hi ? `${label}: ${def.lo} से ${def.hi} तक की संख्या लिखें (इंजन न हो तो 0)।` : `${label}: enter a number from ${def.lo} to ${def.hi} (0 if it has no engine).`
  if (field === 'output_per_hour') return hi ? `${label}: सही संख्या लिखें या खाली छोड़ें।` : `${label}: enter a valid number or leave it empty.`
  return hi ? `${label}: ${def.lo} से ज़्यादा और ${def.hi} तक की संख्या लिखें।` : `${label}: enter a number above ${def.lo} and up to ${def.hi}.`
}

// The server rule set embedded in migration 0063 (scripts/check-equipment-specs.mjs checks that the
// migration carries exactly this). Per type: { field: kind } where kind is
// text | brand (text; 'other' needs brand_other) | year | int:LO:HI | gt:LO:HI | ge:LO:HI.
export function equipmentServerRules() {
  const out = {}
  for (const name of Object.keys(EQUIPMENT_SPECS)) {
    const r = {}
    for (const f of equipmentSpecFields(name)) {
      r[f.key] = f.dropdown ? 'brand' : ['int', 'gt', 'ge'].includes(f.kind) ? `${f.kind}:${f.lo}:${f.hi}` : f.kind
    }
    out[name] = r
  }
  return out
}
