// Phase 11 — one central registry of interlinking boxes. Each box:
//   { id, title:{hi,en}, icon, link, pages:[pageKeys], months:[1-12], priority }
// A box shows on a page if pages[] includes the page key AND (months empty OR the
// current month is in months). <RelatedBoxes page=.../> renders 3–6 by priority.
// This file lives under src/content/ (bilingual data layer), so Hindi is allowed.
export const BOXES = [
  { id: 'tanker', icon: '🚰', title: { hi: 'पानी का टैंकर', en: 'Water tanker' }, link: '/browse?cat=equipment&etype=water_tanker', pages: ['mausam', 'msp'], months: [3, 4, 5, 6], priority: 10 },
  { id: 'cold_storage', icon: '❄️', title: { hi: 'कोल्ड स्टोरेज', en: 'Cold storage' }, link: '/cold-storage', pages: ['mausam', 'msp', 'greenhouse'], months: [], priority: 8 },
  { id: 'transport', icon: '🚚', title: { hi: 'ट्रांसपोर्ट', en: 'Transport' }, link: '/browse?cat=transport', pages: ['mausam', 'msp', 'listing'], months: [], priority: 6 },
  { id: 'harvester', icon: '🌾', title: { hi: 'हार्वेस्टर / थ्रेशर', en: 'Harvester / thresher' }, link: '/browse?cat=equipment', pages: ['msp', 'mausam'], months: [3, 4, 10, 11], priority: 7 },
  { id: 'seed_drill', icon: '🌱', title: { hi: 'सीड ड्रिल व बीज-खाद', en: 'Seed drill & inputs' }, link: '/browse?cat=agri_inputs', pages: ['msp', 'mausam'], months: [6, 7, 10, 11], priority: 7 },
  { id: 'drip', icon: '💧', title: { hi: 'ड्रिप व सामग्री', en: 'Drip & inputs' }, link: '/browse?cat=agri_inputs', pages: ['greenhouse'], months: [], priority: 6 },
  { id: 'gh_vendors', icon: '🏡', title: { hi: 'ग्रीनहाउस वेंडर', en: 'Greenhouse vendors' }, link: '/browse?cat=greenhouse', pages: ['greenhouse'], months: [], priority: 9 },
  { id: 'nursery', icon: '🪴', title: { hi: 'पौध / नर्सरी', en: 'Seedlings / nursery' }, link: '/browse?cat=greenhouse', pages: ['greenhouse'], months: [], priority: 5 },
  { id: 'agro_forestry', icon: '🌳', title: { hi: 'एग्रो फ़ॉरेस्ट्री', en: 'Agro forestry' }, link: '/agro-forestry', pages: ['carbon'], months: [], priority: 8 },
  { id: 'jugaad', icon: '🛠️', title: { hi: 'जुगाड़ / नवाचार', en: 'Jugaad / innovations' }, link: '/jugaad', pages: ['carbon'], months: [], priority: 7 },
  { id: 'greenhouse', icon: '🏡', title: { hi: 'ग्रीनहाउस / पॉलीहाउस', en: 'Greenhouse / polyhouse' }, link: '/greenhouse', pages: ['carbon'], months: [], priority: 6 },
  { id: 'experts', icon: '👨‍🌾', title: { hi: 'विशेषज्ञ', en: 'Experts' }, link: '/experts', pages: ['sawaal', 'crop'], months: [], priority: 9 },
  { id: 'inputs_qa', icon: '🧪', title: { hi: 'बीज, खाद व दवा', en: 'Seeds, fertiliser & medicine' }, link: '/browse?cat=agri_inputs', pages: ['sawaal', 'crop'], months: [], priority: 8 },
  { id: 'drone_qa', icon: '🚁', title: { hi: 'ड्रोन दीदी छिड़काव', en: 'Drone Didi spraying' }, link: '/drone-didi', pages: ['sawaal', 'crop'], months: [], priority: 7 },
  { id: 'kvk', icon: '📞', title: { hi: 'KVK व कृषि संपर्क', en: 'KVK & agri contacts' }, link: '/resources', pages: ['sawaal', 'crop'], months: [], priority: 6 },
]

// Pick 3–6 boxes for a page, honouring seasonal months, sorted by priority.
export function pickBoxes(page, month, max = 6) {
  const m = month || (new Date().getMonth() + 1)
  return BOXES
    .filter((b) => b.pages.includes(page) && (b.months.length === 0 || b.months.includes(m)))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, max)
}
