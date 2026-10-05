// Per-route SEO metadata (title ≤60 chars, description ≤155) for the public
// pages that do NOT render their own <Seo/>. Mounted once via <RouteSeo/> in
// App. Bilingual; <RouteSeo/> picks the active language. New V2 content screens
// (greenhouse, carbon-credit, jugaad, cold-storage) and dynamic detail screens
// (articles/:slug, yojana/:slug, msp/:crop, sawaal/:slug) render their OWN
// <Seo/> and are intentionally absent here (so titles never duplicate).
//
// This file lives under src/content/ (the bilingual data layer) so its Hindi
// strings are data, not hardcoded render copy.
export const ROUTE_SEO = {
  '/': {
    title: { hi: 'किसान सहयोग — मंडी भाव, मौसम, योजनाएं व बाज़ार', en: 'Kissan Sahyog — Mandi prices, weather, schemes & marketplace' },
    description: { hi: 'सागर व मध्य प्रदेश के किसानों के लिए मुफ़्त मंच: मंडी भाव, MSP, मौसम, सरकारी योजनाएं, किसान सवाल और एक मुफ़्त लिस्टिंग बाज़ार।', en: 'A free platform for Sagar & MP farmers: mandi prices, MSP, weather, government schemes, Kisan Sawaal, and a free listings marketplace.' },
  },
  '/privacy': {
    title: { hi: 'गोपनीयता नीति — किसान सहयोग', en: 'Privacy Policy — Kissan Sahyog' },
    description: { hi: 'हम कौन-सी जानकारी लेते हैं, क्यों लेते हैं, और आप सहमति कैसे वापस ले सकते हैं या खाता हटा सकते हैं।', en: 'What information we collect, why, and how you can withdraw consent or delete your account.' },
  },
  '/terms': {
    title: { hi: 'उपयोग की शर्तें — किसान सहयोग', en: 'Terms of Use — Kissan Sahyog' },
    description: { hi: 'मंच की भूमिका (मध्यस्थ), कोई लेन-देन नहीं, विक्रेता घोषणाएं, शिकायत व हटाने की प्रक्रिया।', en: 'Our intermediary role, no on-platform transactions, provider declarations, and the report/takedown process.' },
  },
  '/articles': {
    title: { hi: 'खेती के लेख व सुझाव — किसान सहयोग', en: 'Farming articles & guides — Kissan Sahyog' },
    description: { hi: 'मध्य प्रदेश की खेती पर आसान हिंदी लेख: तकनीक, फसल सलाह और सरकारी जानकारी।', en: 'Easy Hindi articles on MP farming: techniques, crop advice and government information.' },
  },
  '/resources': {
    title: { hi: 'उपयोगी संपर्क — कृषि विभाग, KVK, हेल्पलाइन', en: 'Useful contacts — Agri dept, KVK, helplines' },
    description: { hi: 'कृषि विभाग, कृषि विज्ञान केंद्र (KVK) सागर और किसान हेल्पलाइन के ज़रूरी संपर्क।', en: 'Key contacts for the agriculture department, KVK Sagar and farmer helplines.' },
  },
  '/info': {
    title: { hi: 'जानकारी — मंडी, MSP, मौसम व योजनाएं', en: 'Info — mandi, MSP, weather & schemes' },
    description: { hi: 'मंडी भाव, न्यूनतम समर्थन मूल्य (MSP), मौसम और प्रमुख सरकारी योजनाओं की एक जगह जानकारी।', en: 'Mandi prices, Minimum Support Price (MSP), weather and key government schemes in one place.' },
  },
  '/sawaal': {
    title: { hi: 'किसान सवाल — खेती के सवालों के जवाब', en: 'Kisan Sawaal — answers to farming questions' },
    description: { hi: 'फसल रोग, कीट, खाद, बीज और योजनाओं पर किसानों के सबसे ज़्यादा पूछे सवालों के भरोसेमंद जवाब।', en: "Trusted answers to farmers' most-asked questions on crop disease, pests, fertiliser, seeds and schemes." },
  },
  '/safalta': {
    title: { hi: 'किसान सफलता की कहानियां — किसान सहयोग', en: 'Kisan success stories — Kissan Sahyog' },
    description: { hi: 'मध्य प्रदेश के किसानों की असली सफलता की कहानियां और उनसे सीखने लायक बातें।', en: 'Real success stories from MP farmers and what we can learn from them.' },
  },
  '/yojana': {
    title: { hi: 'सरकारी योजनाएं — केंद्र व मध्य प्रदेश', en: 'Government schemes — Central & MP' },
    description: { hi: 'किसानों के लिए केंद्र और मध्य प्रदेश सरकार की प्रमुख योजनाएं — पात्रता, लाभ और आवेदन।', en: 'Key Central and MP government schemes for farmers — eligibility, benefits and how to apply.' },
  },
  '/yojana/central': {
    title: { hi: 'केंद्र सरकार की योजनाएं — किसान सहयोग', en: 'Central government schemes — Kissan Sahyog' },
    description: { hi: 'PM-KISAN, PMFBY, KCC जैसी केंद्र सरकार की किसान योजनाएं — पात्रता और आवेदन की जानकारी।', en: 'Central schemes like PM-KISAN, PMFBY and KCC — eligibility and how to apply.' },
  },
  '/yojana/mp': {
    title: { hi: 'मध्य प्रदेश सरकार की योजनाएं — किसान सहयोग', en: 'MP government schemes — Kissan Sahyog' },
    description: { hi: 'मध्य प्रदेश सरकार की उद्यानिकी व कृषि योजनाएं — पात्रता, लाभ और आवेदन की जानकारी।', en: 'MP horticulture & agriculture schemes — eligibility, benefits and how to apply.' },
  },
  '/videos': {
    title: { hi: 'खेती के वीडियो — किसान सहयोग', en: 'Farming videos — Kissan Sahyog' },
    description: { hi: 'खेती की तकनीक, मशीनों और योजनाओं पर आसान हिंदी वीडियो किसानों के लिए।', en: 'Easy Hindi videos on farming techniques, machinery and schemes for farmers.' },
  },
  '/drone-didi': {
    title: { hi: 'ड्रोन दीदी — छिड़काव सेवा व जानकारी', en: 'Drone Didi — spraying service & info' },
    description: { hi: 'नमो ड्रोन दीदी योजना और खेत में दवा/खाद के ड्रोन छिड़काव की सेवा व जानकारी।', en: 'The Namo Drone Didi scheme and drone spraying service for pesticide/fertiliser in fields.' },
  },
  '/mausam': {
    title: { hi: 'मौसम — सागर व मध्य प्रदेश का पूर्वानुमान', en: 'Weather — Sagar & MP forecast' },
    description: { hi: 'सागर और आस-पास का मौसम पूर्वानुमान, बारिश की चेतावनी और खेती के लिए सलाह।', en: 'Weather forecast for Sagar and nearby, rain alerts and farming advice.' },
  },
  '/fasal-salah': {
    title: { hi: 'फसल सलाह — बुवाई से कटाई तक', en: 'Crop advice — sowing to harvest' },
    description: { hi: 'सागर व मध्य प्रदेश की मुख्य फसलों के लिए बुवाई, सिंचाई, रोग-कीट और कटाई की सलाह।', en: 'Sowing, irrigation, pest-disease and harvest advice for Sagar & MP major crops.' },
  },
  '/agro-forestry': {
    title: { hi: 'कृषि वानिकी व बागवानी — किसान सहयोग', en: 'Agro-forestry & horticulture — Kissan Sahyog' },
    description: { hi: 'खेत में पेड़, बागवानी और संरक्षित खेती से किसानों की आय बढ़ाने की जानकारी और योजनाएं।', en: 'Growing trees, horticulture and protected cultivation to raise farmer income — info and schemes.' },
  },
  // /msp and /msp/:crop render their own (crop-specific) <Seo/> — see Msp.jsx.
  '/credits': {
    title: { hi: 'फोटो श्रेय — किसान सहयोग', en: 'Photo credits — Kissan Sahyog' },
    description: { hi: 'वेबसाइट पर उपयोग की गई तस्वीरों के स्रोत और श्रेय।', en: 'Sources and credits for the photographs used on the website.' },
  },
  '/kisan-mela': {
    title: { hi: 'किसान मेला कैलेंडर — मध्य प्रदेश', en: 'Kisan Mela calendar — Madhya Pradesh' },
    description: { hi: 'मध्य प्रदेश के आगामी किसान मेलों की सूची — तारीख़, जगह और जानकारी।', en: 'Upcoming Kisan Melas in Madhya Pradesh — dates, venues and details.' },
  },
  '/kisan-mela/submit': {
    title: { hi: 'किसान मेला की जानकारी दें — किसान सहयोग', en: 'Submit a Kisan Mela — Kissan Sahyog' },
    description: { hi: 'किसी किसान मेले की जानकारी हमें भेजें; समीक्षा के बाद कैलेंडर में जोड़ी जाएगी।', en: 'Tell us about a Kisan Mela; after review it is added to the calendar.' },
  },
}
