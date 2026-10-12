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
      hi: 'किसान सहयोग क्या है, क्यों बना, किसान यहाँ क्या कर सकते हैं, सागर (मध्य प्रदेश) का पायलट और हमसे संपर्क कैसे करें।',
      en: 'What Kissan Sahyog is, why it exists, what a farmer can do here, the pilot in Sagar, Madhya Pradesh, and how to contact us.',
    },
  },
  h1: { hi: 'हमारे बारे में', en: 'About Us' },
  lead: {
    hi: 'किसान सहयोग किसानों के लिए बना एक जानकारी मंच है — खेती के काम की बातें, एक जगह, आसान हिंदी में।',
    en: 'Kissan Sahyog is an information platform made for farmers — useful farming information in one place, in simple language.',
  },

  what: {
    id: 'kya-hai',
    title: { hi: 'किसान सहयोग क्या है', en: 'What Kissan Sahyog is' },
    paras: [
      {
        hi: 'यह एक वेबसाइट है जहाँ किसान अपने आस-पास की ज़मीन, मशीन, मज़दूर और खेती की दूसरी सेवाओं की जानकारी देख सकते हैं और अपनी जानकारी डाल सकते हैं।',
        en: 'It is a website where farmers can see information about land, machines, labour and other farm services near them, and post their own.',
      },
      {
        hi: 'हम केवल जानकारी देने वाला मंच हैं। किसी सौदे, भुगतान या समझौते में हम शामिल नहीं होते। बात आगे बढ़ाने से पहले सामने वाले की जानकारी खुद जाँच लें।',
        en: 'We are only an information platform. We are not part of any deal, payment or agreement. Please check the other person’s details yourself before going ahead.',
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

  pilot: {
    id: 'sagar-pilot',
    title: { hi: 'सागर, मध्य प्रदेश में पायलट', en: 'The pilot in Sagar, Madhya Pradesh' },
    paras: [
      {
        hi: 'अभी किसान सहयोग एक पायलट के रूप में सागर ज़िले (मध्य प्रदेश) में चल रहा है। इसलिए यहाँ सबसे ज़्यादा जानकारी सागर और आस-पास के इलाके की मिलेगी।',
        en: 'Right now Kissan Sahyog is running as a pilot in Sagar district, Madhya Pradesh. So most of the information here is for Sagar and the nearby area.',
      },
    ],
  },

  who: {
    id: 'kaun-chalata-hai',
    title: { hi: 'इसे कौन चलाता है', en: 'Who runs it' },
    before: { hi: 'किसान सहयोग को ', en: 'Kissan Sahyog is run by ' },
    company: 'USD Vision AI LLP',
    company_url: 'https://usdvisionai.com',
    after: { hi: ', मध्य प्रदेश, भारत चलाती है। वेबसाइट का डिज़ाइन, विकास और रखरखाव भी यही करती है।', en: ', Madhya Pradesh, India, which also designs, develops and maintains the website.' },
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
    area_served: 'IN-MP',
    parent: { name: 'USD Vision AI LLP', url: 'https://usdvisionai.com' },
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
    parentOrganization: { '@type': 'Organization', name: j.parent.name, url: j.parent.url },
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer support', email: j.email, availableLanguage: ['hi', 'en'] },
      { '@type': 'ContactPoint', contactType: 'feedback and complaints', email: j.grievance_email, url: `${ORIGIN}/grievance`, availableLanguage: ['hi', 'en'] },
    ],
  }]
}

export default about
