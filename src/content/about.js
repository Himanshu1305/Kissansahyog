// /about — "हमारे बारे में / About Us" (Batch 7A). Bilingual page copy as data, so no
// Devanagari literal lives in the screen. Plain, farmer-friendly language; every
// statement here is a fact already published elsewhere on the site (footer, terms,
// grievance page, founder page). No statistics, no promises about the future.
// Same origin constant as components/layout/Seo.jsx (kept local so this file stays plain
// data that Node scripts can import).
const ORIGIN = 'https://kissansahyog.com'

export const about = {
  seo: {
    title: { hi: 'हमारे बारे में — किसान सहयोग', en: 'About Us — Kissan Sahyog' },
    description: {
      hi: 'किसान सहयोग क्या है, क्यों बना, किसान यहाँ क्या कर सकते हैं, सागर संभाग से शुरुआत और हमसे संपर्क कैसे करें।',
      en: 'What Kissan Sahyog is, why it exists, what a farmer can do here, our start in Sagar Division (Sagar Sambhag), and how to contact us.',
    },
  },
  h1: { hi: 'हमारे बारे में', en: 'About Us' },
  // The definitional sentence: the first sentence of Terms clause 1 (Batch 7J). Also used
  // by the sitewide JSON-LD and public/llms.txt.
  lead: {
    hi: 'किसान सहयोग (kissansahyog.com) सागर संभाग, मध्य प्रदेश के लिए खेती का बाज़ार और सूचना वेबसाइट है, जहाँ किसान, मज़दूर, मशीन मालिक और स्थानीय आपूर्तिकर्ता एक ही जगह मिलते हैं।',
    en: 'Kissan Sahyog (kissansahyog.com) is a farm marketplace and information website for Sagar Division (Sagar Sambhag), Madhya Pradesh, where farmers, labourers, machine owners and local suppliers meet in one place.',
  },

  what: {
    id: 'kya-hai',
    title: { hi: 'आपके गाँव का खेती-बाज़ार, अब ऑनलाइन', en: 'Your village’s farm bazaar, now online' },
    paras: [
      {
        hi: 'बुवाई के लिए ट्रैक्टर चाहिए? कटाई के लिए मज़दूर? किराये पर ज़मीन, या अपनी उपज के लिए खरीदार? किसान सहयोग सागर संभाग के लिए खेती का बाज़ार है: अपना सामान डालें, और अपने पास के किसानों और सप्लायर्स से ज़रूरत की चीज़ें खोजें। साथ में मंडी भाव, मौसम, सरकारी योजनाएँ और खेती के सवालों के जवाब, सरल हिंदी और अंग्रेज़ी में। हमारी शुरुआत सागर संभाग से हो रही है, और हम यहीं से आगे बढ़ रहे हैं। हम सिर्फ़ लोगों को जोड़ते हैं। सौदा, दाम और भुगतान आपके और दूसरे व्यक्ति के बीच रहते हैं, इसलिए आगे बढ़ने से पहले उनकी जानकारी खुद जाँच लें।',
        en: 'Need a tractor for sowing? Labour for harvest? Land on rent, or a buyer for your produce? Kissan Sahyog is a farm marketplace for Sagar Division: post what you have, and find what you need from farmers and suppliers near you. You also get mandi bhav, weather, government schemes and answers to farming questions, in simple Hindi and English. We are starting in Sagar Division and growing from here. We only bring people together. The deal, price and payment stay between you and the other person, so check their details before you go ahead.',
      },
    ],
  },

  why: {
    id: 'kyon',
    title: { hi: 'हम क्यों बने', en: 'Why we exist' },
    paras: [
      {
        hi: 'किसान को सही जानकारी अक्सर अलग-अलग जगह खोजनी पड़ती है। हमारी कोशिश है कि काम की जानकारी एक जगह और समझने लायक भाषा में मिले।',
        en: 'A farmer often has to look for the right information in many different places. We try to bring useful information to one place, in language that is easy to follow.',
      },
    ],
    // Rendered with the site's two mission strings (mission_income / mission_rojgar).
    goals_label: { hi: 'हमारे दो उद्देश्य', en: 'Our two aims' },
  },

  can_do: {
    id: 'kya-kar-sakte-hain',
    title: { hi: 'आप यहाँ क्या कर सकते हैं', en: 'What you can do here' },
    items: [
      {
        to: '/bazaar',
        title: { hi: 'बाज़ार की लिस्टिंग', en: 'Marketplace listings' },
        text: { hi: 'ज़मीन, मशीन, मज़दूर, भूसा, खाद-बीज जैसी लिस्टिंग देखें या अपनी लिस्टिंग डालें।', en: 'Browse listings for land, machines, labour, fodder, seed and fertiliser, or post your own.' },
      },
      {
        to: '/sawaal',
        title: { hi: 'किसान सवाल', en: 'Kisan Sawaal (Q&A)' },
        text: { hi: 'फसल, रोग-कीट, खाद और योजनाओं पर पूछे गए सवालों के जवाब पढ़ें।', en: 'Read answers to questions on crops, pests and diseases, fertiliser and schemes.' },
      },
      {
        to: '/msp',
        title: { hi: 'मंडी भाव', en: 'Mandi prices' },
        text: { hi: 'मंडी के भाव और न्यूनतम समर्थन मूल्य (MSP) देखें।', en: 'See mandi prices and the Minimum Support Price (MSP).' },
      },
      {
        to: '/cold-storage',
        title: { hi: 'कोल्ड स्टोरेज', en: 'Cold storage' },
        text: { hi: 'ज़िले के हिसाब से कोल्ड स्टोरेज की सूची देखें।', en: 'See the cold-storage directory, district by district.' },
      },
      {
        to: '/kisan-mela',
        title: { hi: 'किसान मेला', en: 'Kisan Mela' },
        text: { hi: 'आने वाले किसान मेलों की तारीख़ और जगह देखें।', en: 'See dates and venues of upcoming Kisan Melas.' },
      },
      {
        to: '/yojana',
        title: { hi: 'सरकारी योजनाएँ', en: 'Government schemes' },
        text: { hi: 'केंद्र और मध्य प्रदेश की योजनाओं की पात्रता और आवेदन की जानकारी पढ़ें।', en: 'Read eligibility and how to apply for Central and Madhya Pradesh schemes.' },
      },
    ],
    how_to_use: { hi: 'वेबसाइट कैसे इस्तेमाल करें', en: 'How to use the website' },
  },

  sagar: {
    id: 'sagar-se-shuruaat',
    title: { hi: 'हमारा क्षेत्र: सागर संभाग', en: 'Our area: Sagar Division' },
    paras: [
      {
        hi: 'किसान सहयोग की शुरुआत सागर संभाग (मध्य प्रदेश) से हो रही है, और समय के साथ इसे दूसरे स्थानों तक बढ़ाया जा सकता है। सागर संभाग में छह ज़िले आते हैं: सागर, दमोह, पन्ना, टीकमगढ़, छतरपुर और निवाड़ी। इसलिए अभी यहाँ सबसे ज़्यादा जानकारी सागर संभाग की मिलेगी।',
        en: 'Kissan Sahyog is starting in Sagar Division, Madhya Pradesh, and may expand to other places over time. Sagar Division covers six districts: Sagar, Damoh, Panna, Tikamgarh, Chhatarpur and Niwari. So for now most of the information here is for Sagar Division.',
      },
    ],
  },

  // Ownership (Batch 7I). The anchor id is unchanged so existing links keep working.
  // The website's designer/maintainer credit lives only in the footer, not here.
  who: {
    id: 'kaun-chalata-hai',
    title: { hi: 'स्वामित्व और संचालन', en: 'Ownership and operation' },
    text: {
      hi: 'किसान सहयोग के स्वामी और संचालक श्री अभिनन्दन दीक्षित हैं, मध्य प्रदेश, भारत।',
      en: 'Kissan Sahyog is owned and run by Shri Abhinandan Dixit, Madhya Pradesh, India.',
    },
  },

  contact: {
    id: 'sampark',
    title: { hi: 'हमसे संपर्क करें', en: 'How to contact us' },
    email_lead: { hi: 'सामान्य सवाल के लिए ईमेल करें: ', en: 'For general questions, email ' },
    email: 'hello@kissansahyog.com',
    feedback_lead: { hi: 'सुझाव देना हो या कोई समस्या बतानी हो तो यह पेज देखें: ', en: 'To share a suggestion or report a problem, use this page: ' },
  },

  founder_card: {
    id: 'sansthapak',
    title: { hi: 'संस्थापक', en: 'Founder' },
  },

  // Structured-data facts — the same ones SiteJsonLd, the footer and /founder use.
  jsonld: {
    name: 'Kissan Sahyog',
    alternate_name: 'किसान सहयोग',
    email: 'hello@kissansahyog.com',
    grievance_email: 'grievance@kissansahyog.com',
    // Batch 7L-1 — the service area is Sagar Division (Sagar Sambhag) and its six districts.
    area_served: {
      '@type': 'AdministrativeArea',
      name: 'Sagar Division',
      alternateName: ['Sagar Sambhag', 'सागर संभाग'],
      containedInPlace: { '@type': 'State', name: 'Madhya Pradesh', identifier: 'IN-MP' },
      containsPlace: ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari'].map((d) => ({ '@type': 'AdministrativeArea', name: `${d} district` })),
    },
    founder: { hi: 'श्री अभिनन्दन दीक्षित', en: 'Shri Abhinandan Dixit' },
  },
}

const pick = (v, lang) => v?.[lang] ?? v?.hi ?? ''

// Organization JSON-LD for /about.
export function buildAboutJsonLd(data = about, lang = 'hi') {
  const j = data.jsonld
  return [{
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: j.name,
    alternateName: j.alternate_name,
    url: ORIGIN,
    logo: `${ORIGIN}/icons/icon-512.png`,
    description: pick(data.lead, lang),
    email: j.email,
    areaServed: j.area_served,
    founder: { '@type': 'Person', name: pick(j.founder, lang), url: `${ORIGIN}/founder` },
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer support', email: j.email, availableLanguage: ['hi', 'en'] },
      { '@type': 'ContactPoint', contactType: 'feedback and complaints', email: j.grievance_email, url: `${ORIGIN}/grievance`, availableLanguage: ['hi', 'en'] },
    ],
  }]
}

export default about
