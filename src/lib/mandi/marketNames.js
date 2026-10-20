// Batch 12C — one Hindi label for every mandi (market) name. The price rows carry names such as
// "Khurai APMC" or "Sagar(F&V) APMC"; the label is found from the name without spaces, case and the
// trailing "APMC". Strings live in src/lib/i18n/strings.js (mandi_mkt_*, mandi_dist_*).
// Unknown market: the district's Hindi name if known, else the raw name (never a blank).
export const normMarket = (m) => String(m || '').toLowerCase().replace(/\s+/g, '').replace(/apmc$/, '')

// normalised market name → mandi_mkt_<suffix>
export const MARKET_SUFFIX = {
  ajaygarh: 'ajaygarh', alirajpur: 'alirajpur', badamalhera: 'badamalhera', badwaha: 'badwaha',
  bakswaha: 'bakswaha', bamora: 'bamora', banda: 'banda', bhikangaon: 'bhikangaon', bijawar: 'bijawar',
  bina: 'bina', 'chhatarpur(f&v)': 'chhatarpur_fv', chhatarpur: 'chhatarpur', damoh: 'damoh',
  'damoh(f&v)': 'damoh_fv', deori: 'deori', devandranagar: 'devandranagar', gadakota: 'gadakota',
  'gadarwada(f&v)': 'gadarwada_fv', garhakota: 'garhakota', harpalpur: 'harpalpur', hata: 'hata',
  indore: 'indore', jaisinagar: 'jaisinagar', jatara: 'jatara', javera: 'javera', karhi: 'karhi',
  katangi: 'katangi', kesli: 'kesli', khargapur: 'khargapur', khargone: 'khargone', khurai: 'khurai',
  'lavkushnagar(laundi)': 'lavkush_nagar', malthone: 'malthone', mandla: 'mandla',
  narsinghgarh: 'narsinghgarh', narsinghpur: 'narsinghpur', naugaon: 'naugaon', niwadi: 'niwadi',
  palera: 'palera', panna: 'panna', patharia: 'patharia', pawai: 'pawai', prithvipur: 'prithvipur',
  rahatgarh: 'rahatgarh', rajnagar: 'rajnagar', rehli: 'rehli', sagar: 'sagar', 'sagar(f&v)': 'sagar_fv',
  satna: 'satna', sehore: 'sehore', shahagarh: 'shahagarh', shamgarh: 'shamgarh', shivpuri: 'shivpuri',
  simariya: 'simariya', tikamgarh: 'tikamgarh',
}

// normalised district name → mandi_dist_<suffix> (Hindi district name)
export const DISTRICT_SUFFIX = {
  alirajpur: 'alirajpur', balaghat: 'balaghat', chhatarpur: 'chhatarpur', damoh: 'damoh', indore: 'indore',
  khargone: 'khargone', mandla: 'mandla', mandsaur: 'mandsaur', narsinghpur: 'narsinghpur', panna: 'panna',
  rajgarh: 'rajgarh', sagar: 'sagar', satna: 'satna', sehore: 'sehore', shivpuri: 'shivpuri', tikamgarh: 'tikamgarh',
}

// t = the i18n lookup function (key → text).
export function marketLabel(market, district, t) {
  const m = MARKET_SUFFIX[normMarket(market)]
  if (m) return t(`mandi_mkt_${m}`)
  const d = DISTRICT_SUFFIX[String(district || '').toLowerCase().replace(/\s+/g, '')]
  if (d) return t(`mandi_dist_${d}`)
  return market
}
