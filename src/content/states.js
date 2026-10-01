// Canonical Indian states + union territories — the single source of truth for state names.
// Kept in content/ so the "no hardcoded Devanagari in render code" audit treats the Hindi names as
// sanctioned label data (like months.js / crops.js), not stray UI strings.
//
// Every Mela enters the system from many sources that spell the state differently (MP, M.P., Madhya
// Pradesh, मध्य प्रदेश, म.प्र.). normalizeState() folds any such variant to the ONE canonical English
// name so the state filter and the location-based dedup both see clean, comparable values.
//
// Matching is punctuation/space/case-insensitive via stateKey(): it strips everything except latin
// alphanumerics and Devanagari, so "M.P." / "M P" / "MP" all collapse to "mp", and "मध्य प्रदेश" /
// "मध्यप्रदेश" both collapse to "मध्यप्रदेश". Aliases below are written readably; the key is derived.

// Collapse a raw state string to a comparison key (latin alnum + Devanagari only, lowercased).
export function stateKey(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, '')
}

// { en, hi, aliases } — aliases include abbreviations, spelling variants, Hindi, and legacy names.
// Legacy/former names are aliases (Orissa→Odisha, Uttaranchal→Uttarakhand, Pondicherry→Puducherry,
// pre-2020 "Dadra and Nagar Haveli" / "Daman and Diu" → the merged UT).
export const CANONICAL_STATES = [
  // --- 28 states ---
  { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', aliases: ['AP', 'A.P.', 'आंध्रप्रदेश', 'आन्ध्र प्रदेश'] },
  { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश', aliases: ['AR', 'Arunachal', 'अरुणाचलप्रदेश'] },
  { en: 'Assam', hi: 'असम', aliases: ['AS', 'असम'] },
  { en: 'Bihar', hi: 'बिहार', aliases: ['BR'] },
  { en: 'Chhattisgarh', hi: 'छत्तीसगढ़', aliases: ['CG', 'C.G.', 'Chattisgarh', 'छत्तीसगढ', 'छ.ग.'] },
  { en: 'Goa', hi: 'गोवा', aliases: ['GA'] },
  { en: 'Gujarat', hi: 'गुजरात', aliases: ['GJ'] },
  { en: 'Haryana', hi: 'हरियाणा', aliases: ['HR'] },
  { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश', aliases: ['HP', 'H.P.', 'हिमाचलप्रदेश', 'हि.प्र.'] },
  { en: 'Jharkhand', hi: 'झारखंड', aliases: ['JH', 'झारखण्ड'] },
  { en: 'Karnataka', hi: 'कर्नाटक', aliases: ['KA', 'कर्णाटक'] },
  { en: 'Kerala', hi: 'केरल', aliases: ['KL', 'केरला'] },
  { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश', aliases: ['MP', 'M.P.', 'M P', 'Madhyapradesh', 'मध्यप्रदेश', 'म.प्र.', 'म प्र'] },
  { en: 'Maharashtra', hi: 'महाराष्ट्र', aliases: ['MH', 'Maharastra', 'महाराष्ट्र'] },
  { en: 'Manipur', hi: 'मणिपुर', aliases: ['MN'] },
  { en: 'Meghalaya', hi: 'मेघालय', aliases: ['ML'] },
  { en: 'Mizoram', hi: 'मिज़ोरम', aliases: ['MZ', 'मिजोरम'] },
  { en: 'Nagaland', hi: 'नागालैंड', aliases: ['NL', 'नागालैण्ड'] },
  { en: 'Odisha', hi: 'ओडिशा', aliases: ['OR', 'OD', 'Orissa', 'ओड़िशा', 'उड़ीसा'] },
  { en: 'Punjab', hi: 'पंजाब', aliases: ['PB', 'पंजाब', 'पंजाब'] },
  { en: 'Rajasthan', hi: 'राजस्थान', aliases: ['RJ'] },
  { en: 'Sikkim', hi: 'सिक्किम', aliases: ['SK'] },
  { en: 'Tamil Nadu', hi: 'तमिलनाडु', aliases: ['TN', 'Tamilnadu', 'तमिल नाडु', 'तमिलनाडू'] },
  { en: 'Telangana', hi: 'तेलंगाना', aliases: ['TS', 'TG', 'तेलंगाणा', 'तेलुगु'] },
  { en: 'Tripura', hi: 'त्रिपुरा', aliases: ['TR'] },
  { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', aliases: ['UP', 'U.P.', 'U P', 'उत्तरप्रदेश', 'उ.प्र.', 'उ प्र'] },
  { en: 'Uttarakhand', hi: 'उत्तराखंड', aliases: ['UK', 'UA', 'Uttaranchal', 'उत्तराखण्ड', 'उत्तरांचल'] },
  { en: 'West Bengal', hi: 'पश्चिम बंगाल', aliases: ['WB', 'Bengal', 'पश्चिमबंगाल', 'प. बंगाल', 'प.बंगाल'] },
  // --- 8 union territories ---
  { en: 'Andaman and Nicobar Islands', hi: 'अंडमान और निकोबार द्वीप समूह', aliases: ['AN', 'A&N', 'Andaman & Nicobar', 'Andaman and Nicobar', 'Andaman Nicobar', 'अंडमान निकोबार', 'अंडमान और निकोबार'] },
  { en: 'Chandigarh', hi: 'चंडीगढ़', aliases: ['CH', 'Chandigarh (UT)', 'चंडीगढ', 'चण्डीगढ़'] },
  { en: 'Dadra and Nagar Haveli and Daman and Diu', hi: 'दादरा और नगर हवेली और दमन और दीव', aliases: ['DN', 'DD', 'DNH', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Dadra & Nagar Haveli', 'Daman & Diu', 'दादरा और नगर हवेली', 'दमन और दीव'] },
  { en: 'Delhi', hi: 'दिल्ली', aliases: ['DL', 'NCT of Delhi', 'NCT', 'New Delhi', 'National Capital Territory of Delhi', 'नई दिल्ली', 'दिल्ली एनसीटी'] },
  { en: 'Jammu and Kashmir', hi: 'जम्मू और कश्मीर', aliases: ['JK', 'J&K', 'Jammu & Kashmir', 'Jammu and Kashmir', 'जम्मू कश्मीर', 'जम्मू व कश्मीर'] },
  { en: 'Ladakh', hi: 'लद्दाख', aliases: ['LA', 'लदाख'] },
  { en: 'Lakshadweep', hi: 'लक्षद्वीप', aliases: ['LD'] },
  { en: 'Puducherry', hi: 'पुडुचेरी', aliases: ['PY', 'Pondicherry', 'Pondy', 'पांडिचेरी', 'पॉन्डिचेरी'] },
]

// key → { en, hi }. Built from en, hi, and every alias of each canonical state.
const LOOKUP = (() => {
  const m = new Map()
  for (const st of CANONICAL_STATES) {
    const entry = { en: st.en, hi: st.hi }
    for (const variant of [st.en, st.hi, ...st.aliases]) {
      const k = stateKey(variant)
      if (k) m.set(k, entry)
    }
  }
  return m
})()

// en name → hi name (for i18n display of the filter dropdown). Falls back to the input if unknown.
const EN_TO_HI = new Map(CANONICAL_STATES.map((s) => [s.en, s.hi]))
export function stateHindi(en) { return EN_TO_HI.get(en) || en }
export function stateLabel(en, lang) { return lang === 'hi' ? stateHindi(en) : en }

// Fold any raw state string to its canonical ENGLISH name, or null if it maps to no known state/UT.
// Null = "unknown" — callers must log it and leave it for admin review, NEVER guess or silently drop.
export function normalizeState(raw) {
  const k = stateKey(raw)
  if (!k) return null
  return LOOKUP.get(k)?.en || null
}

// Canonical English names, alphabetical — for building the submission-form dropdown.
export const CANONICAL_STATE_NAMES = CANONICAL_STATES.map((s) => s.en).sort()
