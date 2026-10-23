// Batch 15B - /fasal-salah/kam-pani ("कम पानी में कौन-सी फसल"): every statement on the page, with its source.
// Carried over from the approved mockup (docs/review/batch15b/mockup-v4.html). Nothing here predicts a price or
// gives a yield promise, a dose or a seed rate (hard rule 4). To refresh the dated claims see PROJECT_CONTEXT.md.
//
// Every block has: id, reviewed (boolean) and sources (ids of SOURCES). The page shows no "under review" tag (removed in the
// 15B follow-up); the flag is kept for future use. Set it to true once KVK Sagar or Shri A.K. Dixit has confirmed a block.
// Text is { hi, en }: Devanagari here is page content, not hardcoded render copy.

export const LAST_CHECKED = '2026-10-23' // "आख़िरी जाँच": bump when the dated claims below are re-checked

const MONTHS = {
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
// LAST_CHECKED ('YYYY-MM-DD') as "23 अक्तूबर 2026" / "23 October 2026": the one source of truth for the footer date.
export const lastCheckedText = (lang) => { const [y, m, d] = LAST_CHECKED.split('-').map(Number); return `${d} ${MONTHS[lang][m - 1]} ${y}` }

// ---- sources (urls are the publisher's site; the exact article address is a BACKLOG item) ----------------------
export const SOURCES = {
  crida: { hi: 'ICAR-CRIDA, सागर ज़िला आकस्मिक फसल योजना (2013)', en: 'ICAR-CRIDA, Sagar district contingency crop plan (2013)', url: 'https://crida.icar.gov.in' },
  nraa: { hi: 'NRAA, बुंदेलखंड रणनीति', en: 'NRAA, Bundelkhand strategy', url: 'https://nraa.gov.in' },
  msp: { hi: 'केंद्रीय मंत्रिमंडल (CCEA) का MSP फैसला, 1 अक्तूबर 2026 (global-agriculture.com की रिपोर्ट)', en: 'Cabinet Committee on Economic Affairs MSP decision, 1 October 2026 (reported by global-agriculture.com)', url: 'https://global-agriculture.com' },
  ownmandi: { hi: 'हमारा मंडी डेटा (Agmarknet से), सागर मंडी, पिछले 14 दिन', en: 'Our mandi data (from Agmarknet), Sagar mandi, last 14 days', url: 'https://agmarknet.gov.in' },
  ceda: { hi: 'Agmarknet (कृषि मंत्रालय, DMI), CEDA अशोका विश्वविद्यालय के माध्यम से, सागर संभाग', en: 'Agmarknet (Ministry of Agriculture, DMI) via CEDA, Ashoka University, Sagar division', url: 'https://ceda.ashoka.edu.in' },
  dte: { hi: 'IMD आँकड़े, Down To Earth, 15 अक्तूबर 2026', en: 'IMD data, Down To Earth, 15 October 2026', url: 'https://www.downtoearth.org.in' },
  navbharat: { hi: 'नवभारत लाइव, 3 अक्तूबर 2026', en: 'Navbharat Live, 3 October 2026', url: 'https://navbharatlive.com' },
  iari: { hi: 'ICAR-IARI (चना किस्म पूसा JG 16)', en: 'ICAR-IARI (gram variety Pusa JG 16)', url: 'https://www.iari.res.in' },
  pmfby: { hi: 'दृष्टि IAS (PMFBY)', en: 'Drishti IAS (PMFBY)', url: 'https://www.drishtiias.com' },
  bs: { hi: 'बिज़नेस स्टैंडर्ड, 27 मार्च 2025 (केंद्र सरकार की खरीद मंज़ूरी)', en: 'Business Standard, 27 March 2025 (central purchase approval)', url: 'https://www.business-standard.com' },
  tj: { hi: 'ट्रैक्टर जंक्शन, दिसंबर 2025 (खबर)', en: 'Tractor Junction, December 2025 (news)', url: 'https://www.tractorjunction.com' },
  gasoy: { hi: 'ग्लोबल एग्रीकल्चर, 2025 (खबर)', en: 'Global Agriculture, 2025 (news)', url: 'https://global-agriculture.com' },
  radio: { hi: 'रेडियो बुंदेलखंड (किसान-अनुभव)', en: 'Radio Bundelkhand (farmer experience)', url: 'https://radiobundelkhand.com' },
  company: { hi: 'कंपनी की सलाह (नाम उपलब्ध नहीं)', en: 'Company advice (name not available)', url: null },
  general: { hi: 'सामान्य जानकारी (पक्का करने के लिए KVK सागर)', en: 'General knowledge (confirm with KVK Sagar)', url: null },
}

// ---- constants (carried exactly) ------------------------------------------------------------------------------------
// MSP of marketing season 2027-28, Rs per quintal. Announced 1 October 2026 (source msp). Not read from msp_prices.
export const MSP_2027_28 = { wheat: 2610, barley: 2286, gram: 5958, lentil: 7390, mustard: 6613 }
// Sagar normal yield, quintal per hectare (CRIDA 2013). None exists for mustard or barley: none is shown.
export const SAGAR_YIELD_Q = { gram: 7.65, wheat: 11.23, lentil: 4.32 }
// Good-management upside for gram only, shown only as an upside at the 5-year average price (ICAR research varieties).
export const GRAM_UPSIDE_Q = { min: 13, max: 20 }

// The rabi crops, in page order. mandi = mandi_prices.commodity_en and mandi_monthly_history.commodity_en.
// slug = the /msp/<slug> page (null = none). months = harvest months March to May.
export const KP_CROPS = [
  {
    id: 'gram', mandi: 'Gram', slug: 'chana', months: [3, 4, 5], tone: 'g', reviewed: true, sources: ['crida', 'iari', 'msp', 'ownmandi', 'ceda'],
    name: { hi: 'चना', en: 'Gram' },
    verdict: { hi: 'कम पानी', en: 'Low water' },
    water: { hi: 'कम पानी (बारानी या 1 सिंचाई)', en: 'Low water (rain-fed or 1 irrigation)' },
    days: { hi: '110 दिन', en: '110 days', star: false, reviewed: true, sources: ['iari'] },
    sowing: { hi: 'बारानी: अक्तूबर का तीसरा हफ़्ता से नवंबर का पहला हफ़्ता', en: 'Rain-fed: third week of October to first week of November', sources: ['crida'] },
    vars: { hi: 'JG-11, JG-12, JG-14 (CRIDA सागर योजना 2013); पूसा JG 16 (ICAR-IARI)', en: 'JG-11, JG-12, JG-14 (CRIDA Sagar plan 2013); Pusa JG 16 (ICAR-IARI)', reviewed: false, sources: ['crida', 'iari'] },
    why: { hi: 'कम पानी की सरकारी सूची में है, और सागर में सबसे ज़्यादा बोई जाती है (1.97 लाख हेक्टेयर, CRIDA 2013)। भाव और MSP की तुलना ऊपर के आँकड़ों में देखें।', en: 'It is on the official low-water list and is the most widely sown crop in Sagar (1.97 lakh hectare, CRIDA 2013). See the price and MSP comparison in the numbers above.' },
    note: { hi: 'किस्म: पूसा JG 16 (ICAR-IARI) को सूखा सहने वाली और 110 दिन की बताया गया है, और मध्य प्रदेश व बुंदेलखंड के लिए सुझाया गया है। बीज कहाँ मिलेगा, KVK से पूछें।', en: 'Variety: Pusa JG 16 (ICAR-IARI) is described as drought tolerant and 110 days, and is suggested for Madhya Pradesh and Bundelkhand. Ask KVK where to get the seed.' },
  },
  {
    id: 'lentil', mandi: 'Lentil', slug: 'masoor', months: [3, 4, 5], tone: 'a', reviewed: true, sources: ['crida', 'bs', 'msp', 'ownmandi', 'ceda'],
    name: { hi: 'मसूर', en: 'Lentil' },
    verdict: { hi: 'कम पानी', en: 'Low water' },
    water: { hi: 'कम पानी', en: 'Low water' },
    days: { hi: 'लगभग 110 से 125 दिन', en: 'about 110 to 125 days', star: true, reviewed: false, sources: ['general'] },
    sowing: { hi: 'बारानी: अक्तूबर का तीसरा से चौथा हफ़्ता (यानी अब जल्दी)', en: 'Rain-fed: third to fourth week of October (so early now)', sources: ['crida'] },
    vars: { hi: 'JL-3, नूरी / Noorie (CRIDA सागर योजना 2013)', en: 'JL-3, Noorie (CRIDA Sagar plan 2013)', reviewed: false, sources: ['crida'] },
    why: { hi: 'कम पानी की सूची में है और MSP सबसे ऊँचा है। केंद्र ने मसूर की 2028-29 तक 100% खरीद की बात कही है, पर राज्य में यह कैसे लागू होगा, पक्का करें।', en: 'It is on the low-water list and has the highest MSP. The Centre has said it will buy all lentil up to 2028-29, but check how this will work in the state.' },
    note: { hi: 'सागर में मसूर की औसत उपज बहुत कम (लगभग 4 क्विंटल/हेक्टेयर) रही है, इसलिए अच्छे बीज और समय पर बुवाई पर ध्यान दें।', en: 'Average lentil yield in Sagar has been very low (about 4 quintal per hectare), so pay attention to good seed and timely sowing.' },
  },
  {
    id: 'mustard', mandi: 'Mustard', slug: 'sarson', months: [3, 4, 5], tone: 'a', reviewed: true, sources: ['company', 'msp', 'ownmandi', 'ceda'],
    name: { hi: 'सरसों', en: 'Mustard' },
    verdict: { hi: 'पानी मध्यम', en: 'Medium water' },
    water: { hi: 'मध्यम (कुछ सिंचाई)', en: 'Medium (some irrigation)', reviewed: false, sources: ['company'] },
    days: { hi: 'लगभग 110 से 140 दिन', en: 'about 110 to 140 days', star: true, reviewed: false, sources: ['general'] },
    sowing: { hi: 'सागर योजना में समय नहीं दिया, KVK से पूछें', en: 'The Sagar plan gives no sowing time, ask KVK', sources: ['crida'] },
    vars: { hi: 'पूसा जयकिसान, पूसा बोल्ड, वरुणा (CRIDA सागर योजना 2013)', en: 'Pusa Jaikisan, Pusa Bold, Varuna (CRIDA Sagar plan 2013)', reviewed: false, sources: ['crida'] },
    why: { hi: 'बारानी में उपज कम रह सकती है और आम तौर पर 3 से 4 सिंचाई बताई जाती है (कंपनी की सलाह)। सागर में सरसों बड़े पैमाने पर नहीं बोई जाती, इसलिए सागर की औसत उपज का आँकड़ा उपलब्ध नहीं।', en: 'Rain-fed yield can be low and usually 3 to 4 irrigations are mentioned (company advice). Mustard is not grown on a large scale in Sagar, so no Sagar average yield is available.' },
    note: { hi: 'कम से कम 1 से 2 सिंचाई का पानी पक्का हो तभी सोचें, और बेचने की मंडी पहले तय करें।', en: 'Think of it only if water for at least 1 to 2 irrigations is certain, and decide the selling mandi first.' },
  },
  {
    id: 'wheat', mandi: 'Wheat', slug: 'gehun', months: [3, 4, 5], tone: 'r', reviewed: true, sources: ['crida', 'radio', 'msp', 'ownmandi', 'ceda'],
    name: { hi: 'गेहूं', en: 'Wheat' },
    verdict: { hi: 'पानी ज़्यादा', en: 'Needs more water' },
    water: { hi: 'ज़्यादा (5 से 6 सिंचाई)', en: 'High (5 to 6 irrigations)', reviewed: false, sources: ['radio'] },
    days: { hi: 'लगभग 120 से 135 दिन', en: 'about 120 to 135 days', star: true, reviewed: false, sources: ['general'] },
    sowing: { hi: 'बारानी: तीसरा हफ़्ता अक्तूबर से पहला हफ़्ता नवंबर; सिंचित: अक्तूबर का दूसरा हफ़्ता से नवंबर का तीसरा हफ़्ता', en: 'Rain-fed: third week of October to first week of November; irrigated: second week of October to third week of November', sources: ['crida'] },
    vars: null,
    why: { hi: 'प्रति क्विंटल कमाई सबसे कम है। पानी कम हो तो जोखिम सबसे ज़्यादा, इसलिए उतना ही बोएँ जितनी सिंचाई पक्की हो।', en: 'Earning per quintal is the lowest. With little water the risk is highest, so sow only as much as you can irrigate for sure.' },
    note: { hi: 'सिंचाई की गिनती किसान-अनुभव (जौ से तुलना) से ली गई है। कम पानी में गेहूं की जगह जौ या चना पर विचार करें।', en: 'The irrigation count comes from farmer experience (compared with barley). With little water consider barley or gram instead of wheat.' },
  },
  {
    id: 'barley', mandi: 'Barley', slug: null, months: [3, 4, 5], tone: 'g', reviewed: false, sources: ['radio', 'msp', 'ceda'],
    name: { hi: 'जौ', en: 'Barley' },
    verdict: { hi: 'बहुत कम पानी', en: 'Very low water' },
    water: { hi: 'बहुत कम (लगभग 2 सिंचाई)', en: 'Very low (about 2 irrigations)', reviewed: false, sources: ['radio'] },
    days: { hi: 'लगभग 110 से 125 दिन', en: 'about 110 to 125 days', star: true, reviewed: false, sources: ['general'] },
    sowing: { hi: 'सागर योजना में समय नहीं दिया, KVK से पूछें', en: 'The Sagar plan gives no sowing time, ask KVK', sources: ['crida'] },
    vars: { hi: 'नरेंद्र जौ-7 / Narendra 7 (रेडियो बुंदेलखंड, किसान-अनुभव)', en: 'Narendra Jau-7 / Narendra 7 (Radio Bundelkhand, farmer experience)', reviewed: false, sources: ['radio'] },
    why: { hi: 'बुंदेलखंड के एक विशेषज्ञ और किसानों के अनुसार गेहूं की 5 से 6 सिंचाई के मुकाबले लगभग 2 सिंचाई, और कम खाद। पर कमाई प्रति क्विंटल कम है, और हमारे डेटा में सागर के जौ का भाव नहीं है।', en: 'According to a Bundelkhand expert and farmers, about 2 irrigations against 5 to 6 for wheat, and less manure. But earning per quintal is low, and our data has no Sagar barley price.' },
    note: { hi: 'बिक्री का ठिकाना पहले तय करें। यह दावा किसान-अनुभव पर आधारित है, KVK से पक्का करें।', en: 'Decide where you will sell first. This claim rests on farmer experience, confirm with KVK.' },
  },
]

// ---- banners: they expire by date, so a stale claim can never show --------------------------------------------------
export const BANNERS = {
  sowing: {
    id: 'banner_sowing', reviewed: true, sources: ['crida'], validUntil: '2026-11-15',
    title: { hi: 'अभी बुवाई का समय है।', en: 'It is sowing time now.' },
    text: { hi: 'बारानी मसूर की बुवाई अक्तूबर के चौथे हफ़्ते तक, और चना, गेहूं व अलसी की नवंबर के पहले हफ़्ते तक (सागर योजना के अनुसार)।', en: 'Sow rain-fed lentil by the fourth week of October, and gram, wheat and linseed by the first week of November (as per the Sagar plan).' },
  },
  rain: {
    id: 'banner_rain', reviewed: true, sources: ['dte', 'navbharat'], validUntil: '2026-12-31',
    title: { hi: 'इस साल की बारिश:', en: 'This year\'s rain:' },
    text: { hi: 'देश में मानसून सामान्य से 12.6% कम रहा (2015 के बाद सबसे कमज़ोर)। मध्य प्रदेश में कुल बारिश सामान्य का 95.4% (लगभग 4.6% कम)। पर सागर संभाग सहित पूर्वी मध्य प्रदेश में सामान्य से लगभग 4% ज़्यादा बारिश हुई (3 अक्तूबर 2026 की खबर)। सागर ज़िले का अलग आँकड़ा हमारे पास नहीं है।', en: 'The monsoon in India was 12.6% below normal (weakest since 2015). Madhya Pradesh got 95.4% of normal (about 4.6% less). But eastern Madhya Pradesh, including Sagar division, got about 4% more than normal (news of 3 October 2026). We do not have a separate figure for Sagar district.' },
    more: { hi: 'इसलिए बात सिर्फ़ बारिश की नहीं है: देश के बड़े जलाशय कम भरे हैं। कुओं का पानी कितना टिकेगा, यह अपने कुएँ से देखें।', en: 'So it is not only about rain: the country\'s big reservoirs are less full. Check how long your own well will last.' },
    stats: [
      { v: '−12.6%', tone: 'r', label: { hi: 'पूरे भारत की बारिश', en: 'Rain, all India' } },
      { v: '+4%', tone: 'g', label: { hi: 'सागर संभाग / पूर्वी म.प्र. की बारिश', en: 'Rain, Sagar division / east MP' } },
      { v: '70%', tone: 'r', label: { hi: 'देश के बड़े जलाशय भरे (10 साल में सबसे कम)', en: 'Big reservoirs full (lowest in 10 years)' } },
    ],
  },
}

export const IRRIGATION = {
  id: 'irrigation_facts', reviewed: true, sources: ['crida'],
  title: { hi: 'सागर में सिंचाई का हाल', en: 'Irrigation in Sagar' },
  stats: [
    { v: '45%', tone: 'g', label: { hi: 'खेती की ज़मीन में सिंचाई है (2.41 लाख / 5.37 लाख हेक्टेयर)', en: 'of farm land is irrigated (2.41 lakh of 5.37 lakh hectare)' } },
    { v: '63%', tone: 'r', label: { hi: 'सिंचाई कुओं और ट्यूबवेल से', en: 'of irrigation is from wells and tube wells' } },
    { v: '3%', tone: 'r', label: { hi: 'सिंचाई नहर से', en: 'of irrigation is from canals' } },
  ],
  text: { hi: 'मतलब: आधी से ज़्यादा ज़मीन बारानी है, और सिंचाई ज़्यादातर कुओं पर टिकी है। कम बारिश में कुओं का पानी जल्दी घटता है। (CRIDA 2013 के आँकड़े)', en: 'This means more than half the land is rain-fed, and irrigation mostly depends on wells. In low rain, well water falls quickly. (CRIDA 2013 figures)' },
}

// ---- the water selector: levels 0, 1, 2, 3 (3 = three or more). [crop, text, keep(1)/avoid(0), reviewed] ----------
export const WATER = {
  0: {
    title: { hi: 'बिल्कुल सिंचाई नहीं (बारानी)', en: 'No irrigation (rain-fed)' },
    recs: [
      { crop: { hi: 'चना', en: 'Gram' }, keep: 1, reviewed: true, text: { hi: 'सबसे सही। नमी में बोएँ, मेड़-नाली पर बुवाई करें।', en: 'Best choice. Sow in moisture, sow on ridge and furrow.' } },
      { crop: { hi: 'मसूर', en: 'Lentil' }, keep: 1, reviewed: true, text: { hi: 'बारानी में अक्तूबर के चौथे हफ़्ते तक बो दें।', en: 'Rain-fed: sow by the fourth week of October.' } },
      { crop: { hi: 'अलसी', en: 'Linseed' }, keep: 1, reviewed: true, text: { hi: 'बहुत कम पानी की फसल (NRAA की सूची); पर हमारे पास इसका भाव और MSP नहीं है।', en: 'A very low-water crop (NRAA list); but we have no price or MSP for it.' } },
      { crop: { hi: 'गेहूं और सरसों', en: 'Wheat and mustard' }, keep: 0, reviewed: false, text: { hi: 'इस हालत में जोखिम ज़्यादा। न बोएँ, या बहुत थोड़ी ज़मीन में।', en: 'High risk in this case. Do not sow, or sow very little land.' } },
    ],
  },
  1: {
    title: { hi: '1 सिंचाई का पानी', en: 'Water for 1 irrigation' },
    recs: [
      { crop: { hi: 'चना', en: 'Gram' }, keep: 1, reviewed: true, text: { hi: 'सबसे सही। एक सिंचाई फूल आने से पहले या बुवाई से पहले।', en: 'Best choice. Give one irrigation before flowering or before sowing.' } },
      { crop: { hi: 'मसूर', en: 'Lentil' }, keep: 1, reviewed: true, text: { hi: 'ठीक। समय पर बुवाई ज़रूरी।', en: 'Fine. Timely sowing is a must.' } },
      { crop: { hi: 'जौ', en: 'Barley' }, keep: 1, reviewed: false, text: { hi: 'कम पानी वाली फसल, पर कमाई कम और बिक्री का ठिकाना पहले तय करें।', en: 'A low-water crop, but earning is low, and decide where to sell first.' } },
      { crop: { hi: 'गेहूं', en: 'Wheat' }, keep: 0, reviewed: false, text: { hi: 'बहुत जोखिम। 5 से 6 सिंचाई चाहिए।', en: 'Very risky. It needs 5 to 6 irrigations.' } },
    ],
  },
  2: {
    title: { hi: '2 सिंचाई का पानी', en: 'Water for 2 irrigations' },
    recs: [
      { crop: { hi: 'चना', en: 'Gram' }, keep: 1, reviewed: true, text: { hi: 'अच्छी उपज के लिए सबसे सही।', en: 'Best choice for a good yield.' } },
      { crop: { hi: 'जौ', en: 'Barley' }, keep: 1, reviewed: false, text: { hi: 'लगभग 2 सिंचाई में हो जाता है (किसान-अनुभव)।', en: 'Manages with about 2 irrigations (farmer experience).' } },
      { crop: { hi: 'सरसों', en: 'Mustard' }, keep: 1, reviewed: false, text: { hi: 'सोच सकते हैं। ऊपर कार्ड में मंडी भाव और 5 साल का औसत देखें, उपज का जोखिम है; बेचने की मंडी पहले तय करें।', en: 'You can think of it. See the mandi price and 5-year average in the card above; yield is a risk. Decide the selling mandi first.' } },
      { crop: { hi: 'गेहूं', en: 'Wheat' }, keep: 0, reviewed: false, text: { hi: 'अभी भी जोखिम। 5 से 6 सिंचाई की ज़रूरत।', en: 'Still risky. It needs 5 to 6 irrigations.' } },
    ],
  },
  3: {
    title: { hi: '3 या ज़्यादा सिंचाई', en: '3 or more irrigations' },
    recs: [
      { crop: { hi: 'सरसों', en: 'Mustard' }, keep: 1, reviewed: false, text: { hi: 'सोच सकते हैं। मंडी भाव और 5 साल का औसत ऊपर कार्ड में देखें; सबसे ज़्यादा भाव वाली मंडियाँ भी वहीं हैं।', en: 'You can think of it. See the mandi price and 5-year average in the card above; the mandis with the highest prices are there too.' } },
      { crop: { hi: 'चना', en: 'Gram' }, keep: 1, reviewed: true, text: { hi: 'ज़्यादा पानी हो तब भी चना बोया जा सकता है', en: 'Gram can also be sown when water is plentiful' } },
      { crop: { hi: 'गेहूं', en: 'Wheat' }, keep: 1, reviewed: false, text: { hi: 'सिर्फ़ उतनी ज़मीन में जितनी में 5 से 6 सिंचाई पक्की है।', en: 'Only on as much land as has 5 to 6 irrigations for sure.' } },
      { crop: { hi: 'मसूर', en: 'Lentil' }, keep: 0, reviewed: true, text: { hi: 'सोच-समझकर। ऊपर कार्ड में मंडी भाव और MSP का फ़र्क देखें।', en: 'Think carefully. See the mandi price against MSP in the card above.' } },
    ],
  },
}
export const WATER_NOTE = { hi: 'यह सुझाव सागर की कम-पानी सूची (CRIDA), सिंचाई की गिनती और ऊपर के भाव पर आधारित है। अपने खेत के हिसाब से KVK से पूछें।', en: 'This suggestion rests on the Sagar low-water list (CRIDA), the irrigation counts and the prices above. Ask KVK for your own field.' }

// ---- cards (government support, late monsoon, heavy rain, saving water) -------------------------------------------
// card: { id, reviewed, sources, title, open (starts open), lines: [{hi,en}], pending: {hi,en}|null, anchor? }
export const GOV_CARDS = [
  {
    id: 'gov_msp', reviewed: false, sources: ['bs'], open: true,
    title: { hi: 'MSP पर खरीद', en: 'Purchase at MSP' },
    lines: [
      { hi: 'MSP तभी मिलता है जब सरकारी खरीद केंद्र पर बेचें, और पहले पंजीकरण कराना होता है।', en: 'MSP is paid only when you sell at a government purchase centre, and you must register first.' },
      { hi: 'मार्च 2025 में केंद्र ने राजस्थान, मध्य प्रदेश और गुजरात में चना, सरसों और मसूर की MSP पर सीधी खरीद की मंज़ूरी दी थी (उस रबी सीज़न के लिए)।', en: 'In March 2025 the Centre approved direct purchase of gram, mustard and lentil at MSP in Rajasthan, Madhya Pradesh and Gujarat (for that rabi season).' },
      { hi: 'केंद्र ने कहा है कि तुअर, उड़द और मसूर की 100% खरीद 2028-29 तक की जाएगी, जब भाव MSP से नीचे जाएँ।', en: 'The Centre has said that tur, urad and lentil will be bought in full up to 2028-29, when prices fall below MSP.' },
    ],
    pending: { hi: 'इस साल (2026-27 रबी) की खरीद और पंजीकरण की तारीख़ें कृषि विभाग या KVK सागर से पूछें।', en: 'Ask the agriculture department or KVK Sagar for this year\'s (2026-27 rabi) purchase and registration dates.' },
  },
  {
    id: 'gov_pmfby', reviewed: false, sources: ['pmfby'], open: false,
    title: { hi: 'फसल बीमा (PMFBY)', en: 'Crop insurance (PMFBY)' },
    lines: [
      { hi: 'रबी की अनाज और तिलहन फसलों के लिए किसान का हिस्सा 1.5% है, बाकी सरकार देती है।', en: 'For rabi cereal and oilseed crops the farmer pays 1.5%, the government pays the rest.' },
      { hi: 'सूखा बीमा में आता है।', en: 'Drought is covered.' },
      { hi: 'अगर खराब मौसम की वजह से बुवाई ही न हो पाए, तो बीमित राशि का 25% तक दावा मिल सकता है।', en: 'If sowing itself fails because of bad weather, a claim of up to 25% of the sum insured may be paid.' },
    ],
    pending: { hi: 'रबी 2026-27 में नाम लिखवाने की आख़िरी तारीख़ कृषि विभाग या KVK सागर से पूछें (पिछले सालों में यह दिसंबर के आख़िर में थी)।', en: 'Ask the agriculture department or KVK Sagar for the last date to enrol for rabi 2026-27 (in past years it was the end of December).' },
  },
  {
    id: 'gov_khet_talab', reviewed: false, sources: ['tj'], open: false, anchor: 'sarkari-sahara-khet-talab',
    title: { hi: 'खेत तालाब पर सब्सिडी', en: 'Farm pond subsidy' },
    lines: [
      { hi: 'मध्य प्रदेश में खेत तालाब बनाने पर 90% तक सब्सिडी बताई गई है।', en: 'A subsidy of up to 90% is reported for building a farm pond in Madhya Pradesh.' },
      { hi: 'आवेदन ज़िला मत्स्य विभाग के कार्यालय में, ऑफ़लाइन।', en: 'Apply offline at the district fisheries department office.' },
      { hi: 'काग़ज़ात: आधार, पैन, बैंक पासबुक, समग्र आईडी, ज़मीन के काग़ज़।', en: 'Papers: Aadhaar, PAN, bank passbook, Samagra ID, land papers.' },
    ],
    pending: { hi: 'रकम, आख़िरी तारीख़ और शर्तें ज़िला मत्स्य विभाग या KVK सागर से पूछें।', en: 'Ask the district fisheries department or KVK Sagar for the amount, last date and conditions.' },
  },
]
export const GOV_NOTE = { hi: 'ये जानकारी खबरों और सरकारी बयानों से ली गई है। योजना की शर्तें और तारीख़ें कृषि विभाग से पक्की करें।', en: 'This information is taken from news and government statements. Confirm scheme conditions and dates with the agriculture department.' }

export const LATE_CARDS = [
  {
    id: 'late_delay', reviewed: false, sources: ['crida'], open: true,
    title: { hi: 'बारिश कितनी देर से आई?', en: 'How late did the rain come?' },
    lines: [
      { hi: '2 हफ़्ते देर: गहरी काली मिट्टी में फसल न बदलें। बखर चलाएँ, बीज उपचार करें, मेड़ पर बुवाई करें।', en: '2 weeks late: do not change the crop in deep black soil. Plough the field (bakhar), treat the seed, sow on ridges.' },
      { hi: '4 हफ़्ते देर (जुलाई का दूसरा हफ़्ता): कम दिन वाली अरहर, मूंग, उड़द, तिल। मेड़-नाली पर बोएँ। बीज की मात्रा KVK से पूछें।', en: '4 weeks late (second week of July): short-duration tur, moong, urad, sesame. Sow on ridge and furrow. Ask KVK for the seed amount.' },
      { hi: '6 से 8 हफ़्ते देर: तिल, रामतिल, कोदो-कुटकी।', en: '6 to 8 weeks late: sesame, ramtil, kodo-kutki.' },
    ],
    pending: null,
  },
  {
    id: 'late_varieties', reviewed: false, sources: ['crida'], open: true,
    title: { hi: 'कौन-सी किस्में (नाम)', en: 'Which varieties (names)' },
    lines: [
      { hi: '4 हफ़्ते देर: अरहर (तुअर): प्रगति, जागृति, आशा, JKM-7, JA-4, ICPL-85063 (लक्ष्मी), JKM-189। उड़द: JU-2, JU-3, JU-86, T-9, JBG-623, LBG-684, TAU-1, बरखा (Berkha)। तिल: TKG-306, TKG-35, JGS-8, JT-21, JT-22, JT-55, PKTS-11, PKTS-12।', en: '4 weeks late: tur (arhar): Pragati, Jagriti, Asha, JKM-7, JA-4, ICPL-85063 (Laxmi), JKM-189. Urad: JU-2, JU-3, JU-86, T-9, JBG-623, LBG-684, TAU-1, Berkha. Sesame: TKG-306, TKG-35, JGS-8, JT-21, JT-22, JT-55, PKTS-11, PKTS-12.' },
      { hi: '6 से 8 हफ़्ते देर: तिल: ऊपर की सूची के नाम (जैसे TKG-306, JT-21, JT-22, JT-55)। रामतिल: JNC-6, JNC-1, JNC-9, JVN-1।', en: '6 to 8 weeks late: sesame: names from the list above (such as TKG-306, JT-21, JT-22, JT-55). Ramtil: JNC-6, JNC-1, JNC-9, JVN-1.' },
      { hi: 'सिंचाई का पानी देर से मिले: सोयाबीन की कम अवधि वाली किस्म JS 95-60।', en: 'If irrigation water comes late: the short-duration soybean variety JS 95-60.' },
    ],
    pending: { hi: 'ये नाम 2013 की सरकारी योजना में लिखे हैं और कुछ बदल चुके होंगे। KVK सागर से पूछें कि इस साल कौन-सा बीज मिलेगा।', en: 'These names are from the 2013 government plan and some will have been replaced. Ask KVK Sagar which seed is available this year.' },
  },
  {
    id: 'late_dry_after_sowing', reviewed: false, sources: ['crida'], open: false,
    title: { hi: 'बुवाई के बाद 15 से 20 दिन सूखा पड़े', en: 'Dry spell of 15 to 20 days after sowing' },
    lines: [
      { hi: 'जहाँ पौधे कम उगे हों वहाँ खाली जगह भरें, ज़रूरत हो तो दोबारा बोएँ।', en: 'Fill the gaps where few plants came up, re-sow if needed.' },
      { hi: 'मल्च (घास-फूस की परत) बिछाएँ, गुड़ाई करें।', en: 'Spread mulch (a layer of straw), hoe the field.' },
      { hi: 'हर 15 से 20 कतार पर नाली बनाएँ, ताकि पानी रुके।', en: 'Make a channel after every 15 to 20 rows so that water stays.' },
    ],
    pending: null,
  },
  {
    id: 'late_dry_at_flowering', reviewed: false, sources: ['crida'], open: false,
    title: { hi: 'फूल या फली के समय सूखा पड़े', en: 'Dry spell at flowering or pod time' },
    lines: [
      { hi: 'इसी समय पानी सबसे ज़रूरी है: जितना हो सके एक हल्की सिंचाई दें।', en: 'Water matters most at this time: give one light irrigation if you can.' },
      { hi: 'बारिश जल्दी लौट जाए तो फसल पकते ही काट लें।', en: 'If the rain leaves early, harvest as soon as the crop ripens.' },
      { hi: 'रबी के लिए खेत जल्दी तैयार करें।', en: 'Prepare the field early for rabi.' },
    ],
    pending: null,
  },
]

export const WET_NOTE = { hi: 'ज़्यादा बारिश में सबसे पहला काम: खेत से पानी निकालना। खड़ा पानी जड़ सड़ा देता है।', en: 'The first job in heavy rain: drain water out of the field. Standing water rots the roots.' }
export const WET_CARDS = [
  {
    id: 'wet_main', reviewed: false, sources: ['crida', 'nraa'], open: true,
    title: { hi: 'सोयाबीन, उड़द, मूंग, मक्का', en: 'Soybean, urad, moong, maize' },
    lines: [
      { hi: 'खेत में नालियाँ काटकर पानी तुरंत निकालें।', en: 'Cut drains in the field and let the water out at once.' },
      { hi: 'आगे से मेड़-नाली पर बुवाई करें (काली मिट्टी में ख़ासकर)।', en: 'From next time sow on ridge and furrow (especially in black soil).' },
      { hi: 'गुड़ाई करें।', en: 'Hoe the field.' },
      { hi: 'कटाई साफ़ मौसम में करें।', en: 'Harvest in clear weather.' },
    ],
    pending: { hi: 'खाद और बीमारी की दवा और उनकी मात्रा यहाँ नहीं दी जा रही। KVK सागर से पूछें।', en: 'Manure, disease medicine and their amounts are not given here. Ask KVK Sagar.' },
  },
  {
    id: 'wet_soy_varieties', reviewed: false, sources: ['gasoy', 'crida'], open: false,
    title: { hi: 'सोयाबीन की किस्में (नाम)', en: 'Soybean varieties (names)' },
    lines: [
      { hi: 'मध्य प्रदेश सरकार की सुझाई: NRC 157, NRC 131, NRC 136।', en: 'Suggested by the Madhya Pradesh government: NRC 157, NRC 131, NRC 136.' },
      { hi: 'केंद्र से स्वीकृत (खरीफ 2025 सूची): JS 22-12, JS 22-16, JS 21-72, NRC 165, NRC 150, NRC 152।', en: 'Approved by the Centre (kharif 2025 list): JS 22-12, JS 22-16, JS 21-72, NRC 165, NRC 150, NRC 152.' },
      { hi: 'पुरानी योजना में कम अवधि के लिए: JS 95-60।', en: 'In the old plan for short duration: JS 95-60.' },
    ],
    pending: { hi: 'किस्म की अवधि और जलभराव सहने की क्षमता स्रोत में नहीं मिली। KVK सागर से पूछें।', en: 'The duration of the variety and its tolerance to waterlogging were not found in the source. Ask KVK Sagar.' },
  },
  {
    id: 'wet_paddy_veg', reviewed: false, sources: ['crida'], open: false,
    title: { hi: 'धान और सब्ज़ी', en: 'Paddy and vegetables' },
    lines: [
      { hi: 'धान: पानी जल्दी निकालें, खाली जगह भरें।', en: 'Paddy: drain water quickly, fill the gaps.' },
      { hi: 'टमाटर, मिर्च, बैंगन: ऊँची क्यारी बनाएँ, पानी निकासी रखें।', en: 'Tomato, chilli, brinjal: make raised beds, keep drainage.' },
    ],
    pending: null,
  },
]

export const SAVE_CARDS = [
  {
    id: 'save_pond', reviewed: false, sources: ['nraa'], open: true,
    title: { hi: 'खेत तालाब और मेड़बंदी', en: 'Farm pond and field bunds' },
    lines: [
      { hi: 'खेत के ढलान वाले हिस्से में खेत तालाब और मेड़ बनाने से बारिश का पानी रुकता है।', en: 'A farm pond and bunds on the sloping part of the field hold the rain water.' },
      { hi: 'पुराने तालाब और छोटे बाँध की गाद निकालना, कुओं में पानी भरना (रिचार्ज) भी सुझाया गया है।', en: 'Removing silt from old ponds and small dams, and recharging wells, are also suggested.' },
    ],
    pending: null,
    link: { to: '/fasal-salah/kam-pani#sarkari-sahara-khet-talab', text: { hi: 'खेत तालाब पर सब्सिडी और आवेदन की जानकारी देखें →', en: 'See the farm pond subsidy and how to apply →' } },
  },
  {
    id: 'save_moisture', reviewed: false, sources: ['nraa'], open: false,
    title: { hi: 'खेत में नमी रोकना', en: 'Holding moisture in the field' },
    lines: [
      { hi: 'ढलान के आर-पार बुवाई (कंटूर) और घास-फूस की परत से नमी बचती है।', en: 'Sowing across the slope (contour) and a layer of straw keep the moisture.' },
      { hi: 'NRAA के अनुसार इससे पैदावार 15 से 20 प्रतिशत तक बढ़ सकती है।', en: 'According to NRAA this can raise the yield by 15 to 20 percent.' },
    ],
    pending: null,
  },
]

// ---- page text -------------------------------------------------------------------------------------------------------
export const PAGE = {
  h1: { hi: 'कम पानी में कौन-सी फसल बोएँ, और कितना मिलेगा', en: 'Which crop to sow with little water, and what it earns' },
  intro: { hi: 'सागर के लिए: सरकारी योजना, MSP और सागर संभाग की मंडियों के भाव एक जगह।', en: 'For Sagar: the government plan, MSP and Sagar division mandi prices in one place.' },
  seoTitle: { hi: 'कम पानी में कौन-सी फसल — सागर के किसान के लिए', en: 'Which crop with little water — for Sagar farmers' },
  seoDesc: { hi: 'सागर में कम सिंचाई हो तो कौन-सी रबी फसल बोएँ: MSP, मंडी भाव, 5 साल का औसत, फसल बीमा और खेत तालाब की जानकारी।', en: 'Which rabi crop to sow in Sagar with little irrigation: MSP, mandi price, 5-year average, crop insurance and farm pond information.' },
  chips: [
    { id: 'surakshit-fasal', hi: 'सुरक्षित फसलें', en: 'Safe crops' },
    { id: 'sarkari-sahara', hi: 'सरकारी सहारा', en: 'Government support' },
    { id: 'barish-der-se', hi: 'बारिश देर से / सूखा', en: 'Late rain / drought' },
    { id: 'barish-zyada', hi: 'बारिश ज़्यादा', en: 'Heavy rain' },
    { id: 'pani-bachana', hi: 'पानी बचाने के तरीके', en: 'Saving water' },
  ],
  sections: {
    safe: { hi: 'सुरक्षित फसलें और कमाई की तुलना', en: 'Safe crops and earning compared' },
    gov: { hi: 'सरकारी सहारा', en: 'Government support' },
    late: { hi: 'बारिश देर से / सूखा', en: 'Late rain / drought' },
    wet: { hi: 'बारिश ज़्यादा, पानी भरा', en: 'Heavy rain, waterlogging' },
    save: { hi: 'पानी बचाने के तरीके', en: 'Ways to save water' },
  },
  waterAsk: { hi: 'आपके पास कितना पानी है?', en: 'How much water do you have?' },
  waterBtn: [
    { w: 0, hi: 'सिंचाई नहीं', en: 'No irrigation', subHi: 'बारानी', subEn: 'rain-fed' },
    { w: 1, hi: '1 सिंचाई', en: '1 irrigation' },
    { w: 2, hi: '2 सिंचाई', en: '2 irrigations' },
    { w: 3, hi: '3 या ज़्यादा', en: '3 or more' },
  ],
  cropsH: { hi: 'हर फसल का हाल', en: 'Each crop' },
  cropsSub: { hi: 'अभी बोई गई रबी फसल मार्च-अप्रैल 2027 में कटेगी, इसलिए 2027-28 का MSP दिया है। भाव सागर मंडी के पिछले 14 दिन के हैं।', en: 'The rabi crop sown now will be harvested in March-April 2027, so the MSP of 2027-28 is given. Prices are from the Sagar mandi, last 14 days.' },
  tableH: { hi: 'आज का भाव बनाम 5 साल का औसत', en: 'Today\'s price against the 5-year average' },
  tableSub: { hi: 'Modal भाव = जिस भाव पर मंडी में सबसे ज़्यादा माल बिका। नीचे 5 साल (2021 से 2025) में कटाई के समय, मार्च से मई, का औसत Modal भाव है। सागर संभाग की मंडियाँ।', en: 'Modal rate = the rate at which most of the produce sold in the mandi. Below is the average Modal rate at harvest time, March to May, over 5 years (2021 to 2025). Sagar division mandis.' },
  howRead: { hi: 'कैसे पढ़ें: आज का भाव 5 साल के कटाई-समय औसत से ऊपर या नीचे हो सकता है। पर कटाई (मार्च-अप्रैल) पर भाव आज जितने ही रहेंगे, यह मानकर न चलें। 5 साल का औसत कई सालों के भाव दिखाता है; आज का भाव सिर्फ़ एक दिन का है। कोई अनुमान नहीं दिया जा रहा।', en: 'How to read: today\'s price can be above or below the 5-year harvest-time average. Do not assume prices at harvest (March-April) will be the same as today. The 5-year average covers many years of prices; today\'s price is just one day. No forecast is given.' },
  yearH: { hi: 'साल-दर-साल कटाई के समय का भाव (मार्च-मई)', en: 'Harvest-time price year by year (March-May)' },
  yearNote: { hi: 'जौ के आँकड़े कम मंडियों से हैं।', en: 'Barley figures come from fewer mandis.' },
  attribution: { hi: 'स्रोत: Agmarknet (कृषि मंत्रालय, DMI), CEDA अशोका विश्वविद्यालय के माध्यम से; आँकड़े अक्तूबर 2025 तक', en: 'Source: Agmarknet (Ministry of Agriculture, DMI), via CEDA, Ashoka University; data up to October 2025' },
  ask: { hi: 'बीज की किस्म, दवा की मात्रा और योजना की शर्तें कृषि विज्ञान केंद्र (KVK) सागर से पूछें', en: 'Ask Krishi Vigyan Kendra (KVK) Sagar for the seed variety, the amount of medicine and the scheme conditions' },
  starNote: { hi: '* फसल के दिन सामान्य जानकारी से हैं, सागर की किस्म के हिसाब से KVK से पक्का करें।', en: '* Crop days are general knowledge, confirm with KVK for the Sagar variety.' },
  estimate: { hi: 'यह अंदाज़ा लागत से पहले की बिक्री का है। कटाई के समय भाव अलग हो सकते हैं। कमाई की गारंटी नहीं है।', en: 'This is an estimate of sales before costs. Prices at harvest may differ. It is not a guarantee of earning.' },
}

// ---- small labels used on the cards and tables -----------------------------------------------------------------------
export const LABELS = {
  loading: { hi: 'भाव लोड हो रहे हैं…', en: 'Loading prices…' },
  noToday: { hi: 'आज का भाव उपलब्ध नहीं', en: 'Today\'s price not available' },
  noData: { hi: 'डेटा नहीं', en: 'No data' },
  mspRow: { hi: 'MSP 2027-28', en: 'MSP 2027-28' },
  todayRow: { hi: 'सागर मंडी आज', en: 'Sagar mandi today' },
  avgRow: { hi: '5 साल औसत', en: '5-year average' },
  avgNote: { hi: '5 साल औसत = 2021 से 2025 में मार्च-मई (कटाई के समय) का Modal भाव, सागर संभाग की मंडियाँ।', en: '5-year average = Modal rate of March-May (harvest time) in 2021 to 2025, Sagar division mandis.' },
  gap: { hi: 'भाव और MSP का फ़र्क', en: 'Price against MSP' },
  perQ: { hi: 'प्रति क्विंटल', en: 'per quintal' },
  topMandis: { hi: 'सागर संभाग में सबसे ज़्यादा भाव वाली मंडियाँ', en: 'Mandis with the highest prices in Sagar division' },
  water: { hi: 'पानी', en: 'Water' },
  days: { hi: 'समय', en: 'Time' },
  sowing: { hi: 'बुवाई', en: 'Sowing' },
  vars: { hi: 'किस्मों के नाम (KVK से पुष्टि करें)', en: 'Variety names (confirm with KVK)' },
  money: { hi: 'एक हेक्टेयर से बिक्री (लागत से पहले)', en: 'Sale from one hectare (before costs)' },
  yieldIs: { hi: 'सागर की औसत उपज', en: 'Average yield in Sagar' },
  quintal: { hi: 'क्विंटल', en: 'quintal' },
  atAvg: { hi: '5 साल के औसत भाव पर', en: 'At the 5-year average price' },
  atToday: { hi: 'आज के भाव पर', en: 'At today\'s price' },
  upside: { hi: 'अच्छे बीज और नमी के साथ', en: 'With good seed and moisture' },
  upsideNote: { hi: 'ICAR किस्म, 5 साल के औसत भाव पर', en: 'ICAR variety, at the 5-year average price' },
  noYield: { hi: 'सागर के लिए उपज का आँकड़ा हमारे पास नहीं है, इसलिए कमाई का अंदाज़ा नहीं दिया।', en: 'We have no yield figure for Sagar, so no earning estimate is given.' },
  colCrop: { hi: 'फसल', en: 'Crop' },
  colAvg: { hi: '5 साल औसत', en: '5-year avg' },
  colToday: { hi: 'आज (सागर)', en: 'Today (Sagar)' },
  colGap: { hi: 'फ़र्क', en: 'Gap' },
  sourcesH: { hi: 'स्रोत', en: 'Sources' },
  lastChecked: { hi: `आख़िरी जाँच: ${lastCheckedText('hi')}`, en: `Last checked: ${lastCheckedText('en')}` },
  mspNote: { hi: 'MSP: केंद्रीय मंत्रिमंडल का फैसला, 1 अक्तूबर 2026 (2027-28 के लिए)।', en: 'MSP: Cabinet decision of 1 October 2026 (for 2027-28).' },
  seeToday: { hi: 'आज का मंडी भाव देखें', en: 'See today\'s mandi price' },
  seeBazaar: { hi: 'बीज / पंप / ट्रैक्टर ढूँढें', en: 'Find seed / pump / tractor' },
  perHa: { hi: 'हेक्टेयर', en: 'hectare' },
  to: { hi: 'से', en: 'to' },
  starred: { hi: '*', en: '*' },
}
