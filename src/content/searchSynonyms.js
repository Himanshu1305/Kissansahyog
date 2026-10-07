// Phase 10 — search synonym groups (crops + categories) across Hindi, Hinglish and
// English. This is a bilingual DATA file (src/content is the sanctioned data layer),
// so Devanagari here is content, not hardcoded render copy.
//
// Each key is a canonical lowercased term; the array lists alternates. expandQuery()
// uses these groups to widen a user's query so "gehu", "गेहूं" and "wheat" all match
// the same index items.
export const SYNONYMS = {
  wheat: ['गेहूं', 'गेहूँ', 'gehu', 'gehun', 'wheat'],
  soybean: ['सोयाबीन', 'soyabean', 'soybean', 'soya'],
  gram: ['चना', 'chana', 'gram', 'chickpea'],
  lentil: ['मसूर', 'masoor', 'masur', 'lentil'],
  urad: ['उड़द', 'urad', 'black gram'],
  moong: ['मूंग', 'moong', 'mung', 'green gram'],
  maize: ['मक्का', 'makka', 'makki', 'maize', 'corn'],
  tomato: ['टमाटर', 'tamatar', 'tomato'],
  onion: ['प्याज', 'pyaz', 'pyaaz', 'onion'],
  garlic: ['लहसुन', 'lahsun', 'garlic'],
  chilli: ['मिर्च', 'mirch', 'mirchi', 'chilli', 'chili', 'chile'],
  tractor: ['ट्रैक्टर', 'tractor'],
  thresher: ['थ्रेशर', 'thresher'],
  harvester: ['हार्वेस्टर', 'harvester', 'combine'],
  tanker: ['टैंकर', 'tanker', 'water tanker', 'पानी', 'pani', 'water'],
  'cold storage': ['कोल्ड स्टोरेज', 'cold storage', 'coldstorage', 'godown', 'गोदाम', 'godaam'],
  greenhouse: ['ग्रीनहाउस', 'greenhouse', 'polyhouse', 'पॉलीहाउस', 'poly house'],
  carbon: ['कार्बन', 'carbon', 'carbon credit'],
  jugaad: ['जुगाड़', 'jugaad', 'innovation', 'नवाचार', 'आविष्कार'], // ks-style-ok: नवाचार kept as a search keyword so users searching it still find jugaad
  drone: ['ड्रोन', 'drone', 'didi', 'दीदी', 'drone didi'],
  warehouse: ['वेयरहाउस', 'warehouse', 'godown', 'गोदाम', 'store'],
  labor: ['मजदूर', 'mazdoor', 'majdoor', 'labour', 'labor', 'worker'],
  land: ['जमीन', 'ज़मीन', 'zameen', 'jameen', 'land', 'khet', 'खेत'],
}

// Pure helper: given a raw query, return a deduped array of lowercased terms — the
// query itself plus every member of any synonym group that shares a token with it.
// No imports, no side effects.
export function expandQuery(q) {
  const query = String(q || '').toLowerCase().trim()
  if (!query) return []
  const tokens = query.split(/\s+/).filter(Boolean)
  const out = new Set([query, ...tokens])
  for (const [canonical, alts] of Object.entries(SYNONYMS)) {
    const group = [canonical, ...alts].map((s) => s.toLowerCase())
    // The group "matches" the query if any member is a substring of the query,
    // or the query (or one of its tokens) is a substring of a member.
    const hit = group.some((m) => query.includes(m))
      || tokens.some((tok) => group.some((m) => m.includes(tok)))
    if (hit) group.forEach((m) => out.add(m))
  }
  return [...out].filter(Boolean)
}
