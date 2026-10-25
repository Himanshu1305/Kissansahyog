// Commodity-name matching for scripts/refresh-data.mjs (moved here in Batch 10E so it can be
// unit-tested without running the refresh; tests/unit/mandi-commodity.test.mjs).
//
// The official data.gov.in Agmarknet commodity names differ from our short api names (e.g.
// "Bengal Gram(Gram)(Whole)", "Green Gram (Moong)(Whole)"), and a filters[Commodity]=Gram query
// returns nothing, so the refresh matches by token.
export const OFFICIAL_TOKENS = {
  Wheat: ['wheat'], Soyabean: ['soyabean', 'soybean', 'soya bean'], Gram: ['gram'],
  Lentil: ['lentil', 'masur'], Moong: ['moong', 'green gram'], Urad: ['urad', 'black gram'],
  'Paddy(Dhan)(Common)': ['paddy', 'dhan'], Maize: ['maize'], Mustard: ['mustard', 'sarson'],
  Garlic: ['garlic'],
}
// Gram (चना) = Bengal gram / chana only. Batch 10E fix: "Red gram/Arhar/Tur(whole)" (pigeon pea,
// अरहर) also contains "gram" and used to be stored as चना; red gram, arhar and tur are now
// excluded explicitly, as green gram (moong) and black gram (urad) already were.
const NOT_CHANA = /\b(green|black|red)\b|arhar|\btur\b|\btoor\b/
export function matchCommodity(name, api) {
  const n = String(name || '').toLowerCase()
  if (api === 'Gram') return n.includes('gram') && !NOT_CHANA.test(n) // Bengal/Chana only
  return (OFFICIAL_TOKENS[api] || [api.toLowerCase()]).some((tok) => n.includes(tok))
}
