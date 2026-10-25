// Single source of truth mapping crop slugs → mandi data name, MSP crop_en, and
// bilingual display names. Used by /msp, /msp/:crop and the refresh script.
// mandi_en = mandi_prices.commodity_en; msp_en = msp_prices.crop_en (null = no MSP).
// harvest_months (1-12) = plain assumption for the 15A "5-year average vs today" block; owner / A.K. Dixit to confirm
// (docs/review/batch15a/BACKLOG.md).
export const CROPS = [
  { slug: 'gehun', mandi_en: 'Wheat', msp_en: 'Wheat', hi: 'गेहूं', en: 'Wheat', season: 'rabi', harvest_months: [3, 4, 5] },
  { slug: 'soyabean', mandi_en: 'Soyabean', msp_en: 'Soyabean', hi: 'सोयाबीन', en: 'Soybean', season: 'kharif', harvest_months: [10, 11] },
  { slug: 'chana', mandi_en: 'Gram', msp_en: 'Gram', hi: 'चना', en: 'Gram', season: 'rabi', harvest_months: [3, 4, 5] },
  { slug: 'masoor', mandi_en: 'Lentil', msp_en: 'Masur (Lentil)', hi: 'मसूर', en: 'Lentil', season: 'rabi', harvest_months: [3, 4, 5] },
  { slug: 'moong', mandi_en: 'Moong', msp_en: 'Moong', hi: 'मूंग', en: 'Moong', season: 'kharif', harvest_months: [9, 10] },
  { slug: 'urad', mandi_en: 'Urad', msp_en: 'Urad', hi: 'उड़द', en: 'Urad', season: 'kharif', harvest_months: [9, 10] },
  { slug: 'dhan', mandi_en: 'Paddy(Dhan)(Common)', msp_en: 'Paddy', hi: 'धान', en: 'Paddy', season: 'kharif', harvest_months: [10, 11] },
  { slug: 'makka', mandi_en: 'Maize', msp_en: 'Maize', hi: 'मक्का', en: 'Maize', season: 'kharif', harvest_months: [10, 11] },
  { slug: 'sarson', mandi_en: 'Mustard', msp_en: 'Rapeseed & Mustard', hi: 'सरसों', en: 'Mustard', season: 'rabi', harvest_months: [3, 4, 5] },
  { slug: 'lahsun', mandi_en: 'Garlic', msp_en: null, hi: 'लहसुन', en: 'Garlic', season: 'rabi', harvest_months: [3, 4, 5] },
]

export const cropBySlug = (slug) => CROPS.find((c) => c.slug === slug) || null
export const cropByMandi = (name) => CROPS.find((c) => c.mandi_en === name) || null
export const cropName = (c, lang) => (lang === 'hi' ? c.hi : c.en)

// Default crop: गेहूं in Oct–Mar (rabi), सोयाबीन in Apr–Sep (kharif). Pass a month
// (0-11) for testability; defaults to the current month.
export function defaultCropSlug(month = new Date().getMonth()) {
  return (month >= 3 && month <= 8) ? 'soyabean' : 'gehun'
}

// Season by month: kharif Jun–Nov, rabi Dec–May (crop advice / season rainfall).
export function currentSeason(month = new Date().getMonth()) {
  return (month >= 5 && month <= 10) ? 'kharif' : 'rabi'
}
