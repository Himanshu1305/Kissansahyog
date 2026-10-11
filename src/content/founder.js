// /founder — founder page content (Batch 6G). Bilingual { hi, en } data in the same
// style as the other files in src/content/. The Hindi text is the owner's approved
// wording and is the source of truth; the English is a plain, faithful version.
//
// Image slots: every `src` / `proof_src` is null until the owner adds the file under
// public/founder/ (see public/founder/README.md). A null slot renders nothing (or the
// initials avatar for the portrait). Never point a slot at a file that does not exist.
//
// Lines tagged `ks-style-ok` keep the owner's exact words (नवाचार, एवं) on purpose.
// Same origin constant as components/layout/Seo.jsx (kept local so this file stays plain data
// that Node scripts can import).
const ORIGIN = 'https://kissansahyog.com'

export const founder = {
  seo: {
    title: {
      hi: 'श्री अभिनन्दन दीक्षित — संस्थापक, किसान सहयोग',
      en: 'Shri Abhinandan Dixit — Founder, Kissan Sahyog',
    },
    description: {
      hi: 'सेवानिवृत्त उप वन संरक्षक श्री अभिनन्दन दीक्षित का परिचय: किसान परिवार से 42 वर्ष की सेवा तक, और किसान की आय बढ़ाने का संकल्प।',
      en: 'About Shri Abhinandan Dixit, retired Deputy Conservator of Forests: from a farming family to 42 years of service, and a resolve to increase farmer income.',
    },
  },

  hero_greeting: { hi: 'ॐ सीताराम', en: 'Om Sitaram' },
  hero_title: {
    hi: '42 वर्ष की सेवा। एक संकल्प: किसान की आय बढ़ाना।',
    en: '42 years of service. One resolve: Increasing Farmer Income.',
  },
  name: { hi: 'श्री अभिनन्दन दीक्षित', en: 'Shri Abhinandan Dixit' },
  role: {
    hi: 'संस्थापक, किसान सहयोग · सेवानिवृत्त उप वन संरक्षक (DCF), मध्य प्रदेश शासन',
    en: 'Founder, Kissan Sahyog · Retired Deputy Conservator of Forests (DCF), Government of Madhya Pradesh',
  },
  motto: { hi: 'WE WILL DO IT', en: 'WE WILL DO IT' },

  // Set src to '/founder/portrait.jpg' once the file exists (1200×1500).
  portrait: {
    src: null,
    width: 1200,
    height: 1500,
    alt: { hi: 'श्री अभिनन्दन दीक्षित का चित्र', en: 'Portrait of Shri Abhinandan Dixit' },
  },

  // Set youtube_id (the 11-character id only) to show the video block.
  video: {
    youtube_id: null,
    title: { hi: 'संस्थापक का संदेश', en: 'A message from the founder' },
  },

  glance: [
    { hi: 'किसान परिवार से; जन्म खुरई, ज़िला सागर में', en: 'From a farming family; born in Khurai, Sagar district' },
    { hi: '42 वर्ष शासकीय सेवा (1981 से 2023)', en: '42 years of government service (1981 to 2023)' },
    { hi: '1981 में म.प्र. लोक सेवा आयोग से चयन', en: 'Selected through the M.P. Public Service Commission in 1981' },
    { hi: 'वनस्पति विज्ञान की पढ़ाई, सागर विश्वविद्यालय', en: 'Studied Botany at Sagar University' },
    { hi: 'फॉरेस्ट्री डिप्लोमा, नॉर्दर्न फॉरेस्ट रेंजर्स कॉलेज, 1982-83', en: 'Forestry diploma, Northern Forest Rangers College, 1982-83' },
    { hi: 'उप वन संरक्षक (DCF) पद से सेवानिवृत्त, 2023', en: 'Retired as Deputy Conservator of Forests (DCF), 2023' },
    { hi: 'स्वर्ण पदक, म.प्र. शासन, 20 अप्रैल 2011', en: 'Gold Medal, Government of M.P., 20 April 2011' },
    { hi: 'गिनीज वर्ल्ड रिकॉर्ड, 2014-15 (कृषि क्षेत्र में सफल रोपण)', en: 'Guinness World Record, 2014-15 (successful plantation in the agriculture sector)' },
    { hi: 'बैहर में सबई घास की रस्सी और बाँस के फर्नीचर के नवाचार, जो उद्योग बने', en: 'Innovations in sabai grass rope and bamboo furniture at Baihar, which became industries' }, // ks-style-ok
    { hi: '"बुंदेली व्यंजन, बिजावर" की शुरुआत; प्रदेश स्तर पर कई पुरस्कार', en: 'Started "Bundeli Vyanjan, Bijawar"; several state-level awards' },
    { hi: '2011 से किसानों को कार्बन क्रेडिट का लाभ दिलाने का प्रयास', en: 'Working since 2011 to bring the benefit of carbon credits to farmers' },
  ],

  roots_heading: { hi: 'मेरी जड़ें किसान परिवार में हैं', en: 'My roots are in a farming family' },
  roots_p1: {
    hi: 'मेरा जन्म सागर ज़िले के खुरई में, एक ब्राह्मण परिवार में हुआ। पाँच भाइयों और चार बहनों के भरे-पूरे परिवार में मैं सबसे छोटा था, इसलिए बड़े भाई-बहनों का स्नेह और संरक्षण मुझे बचपन से मिला।',
    en: 'I was born in Khurai, in Sagar district, into a Brahmin family. In a full household of five brothers and four sisters I was the youngest, so I received the affection and care of my elder brothers and sisters from childhood.',
  },
  roots_p2: {
    hi: 'मेरी माँ, श्रीमती त्रिवेणी बाई दीक्षित, खेती करती थीं। खेत, बीज, बारिश का इंतज़ार और फसल की चिंता मेरे लिए किताबी बातें नहीं, घर की रोज़ की बातें थीं। मेरे पिता, पंडित शालिग राम दीक्षित, प्राचार्य पद से सेवानिवृत्त हुए। शिक्षा और ईमानदारी का महत्व मैंने अपने घर से सीखा।',
    en: 'My mother, Smt. Triveni Bai Dixit, farmed the land. Fields, seed, waiting for the rain and worrying about the crop were not things from books for me; they were everyday talk at home. My father, Pt. Shalig Ram Dixit, retired as a Principal. I learned the value of education and honesty at home.',
  },
  roots_p3: {
    hi: 'मेरी पढ़ाई ग्राम धंगर के स्कूल से शुरू हुई। फिर सागर का लाल स्कूल, शासकीय उच्चतर माध्यमिक विद्यालय से 11वीं बोर्ड, और फिर सागर विश्वविद्यालय में वनस्पति विज्ञान।',
    en: 'My schooling began at the school in village Dhangar. Then came Lal School in Sagar, the Class 11 board examination from the Government Higher Secondary School, and then Botany at Sagar University.',
  },
  roots_p4: {
    hi: 'मैं किसान परिवार से हूँ और अपनी सेवा में गाँवों और किसानों के बीच काम किया है। इसलिए किसान की समस्याएँ और उसके सामने खुले अवसर, दोनों समझता हूँ। अब मैं अपना अनुभव किसान की भलाई में लगाना चाहता हूँ। हमारे दो उद्देश्य हैं:',
    en: 'I come from a farming family, and in my service I have worked among villages and farmers. So I understand both the farmer’s problems and the opportunities open before him. Now I want to put my experience to work for the good of the farmer. We have two aims:',
  },
  // The two mission lines between roots_p4 and roots_p5 are rendered from the site
  // strings hero_h1_l1 / hero_h1_l2 so they stay word-for-word the same as the homepage.
  roots_p5: {
    hi: 'तकनीक की मदद से हम किसान तक सही जानकारी और बेहतर बाज़ार पहुँचाएँगे, ताकि उसकी कमाई बढ़े। इसी रास्ते से गाँव में ही काम के नए अवसर बनेंगे।',
    en: 'With the help of technology we will take the right information and a better market to the farmer, so that his earnings grow. By the same path, new opportunities for work will be created in the village itself.',
  },
  // Optional photo of the parents: set src to '/founder/parents.jpg' (1600 wide).
  parents_image: {
    src: null,
    width: 1600,
    height: 1067,
    alt: { hi: 'श्रीमती त्रिवेणी बाई दीक्षित और पंडित शालिग राम दीक्षित', en: 'Smt. Triveni Bai Dixit and Pt. Shalig Ram Dixit' },
  },

  education_timeline: [
    { hi: 'ग्राम धंगर का स्कूल', en: 'School in village Dhangar' },
    { hi: 'लाल स्कूल, सागर', en: 'Lal School, Sagar' },
    { hi: 'शासकीय उच्चतर माध्यमिक विद्यालय, 11वीं बोर्ड', en: 'Government Higher Secondary School, Class 11 board' },
    { hi: 'सागर विश्वविद्यालय, वनस्पति विज्ञान', en: 'Sagar University, Botany' },
  ],

  service_heading: { hi: 'जब पढ़ाई बीच में छोड़नी पड़ी', en: 'When I had to leave my studies midway' },
  service_p: {
    hi: '1981 में मध्य प्रदेश लोक सेवा आयोग में मेरा चयन हो गया। सागर विश्वविद्यालय में वनस्पति विज्ञान की एम.एससी. (पूर्वार्ध) की पढ़ाई मुझे बीच में छोड़नी पड़ी। 1982-83 में नॉर्दर्न फॉरेस्ट रेंजर्स कॉलेज से फॉरेस्ट्री का डिप्लोमा किया। एक साल के कठिन प्रशिक्षण के बाद प्रदेश के कई ज़िलों में सेवा करने का अवसर मिला। 42 वर्ष की सेवा के बाद 2023 में उप वन संरक्षक (DCF) पद से सेवानिवृत्त हुआ।',
    en: 'In 1981 I was selected through the Madhya Pradesh Public Service Commission. I had to leave my M.Sc. (Previous) in Botany at Sagar University midway. In 1982-83 I completed a diploma in Forestry from the Northern Forest Rangers College. After a year of hard training I had the opportunity to serve in several districts of the state. After 42 years of service I retired in 2023 as Deputy Conservator of Forests (DCF).',
  },
  // `when` is a plain year label (same in both languages); null = no year shown.
  service_timeline: [
    { when: '1981', label: { hi: 'चयन', en: 'Selection' } },
    { when: '1982-83', label: { hi: 'फॉरेस्ट्री डिप्लोमा', en: 'Forestry diploma' } },
    { when: null, label: { hi: 'कई ज़िलों में सेवा', en: 'Service in several districts' } },
    { when: '2023', label: { hi: 'उप वन संरक्षक पद से सेवानिवृत्ति', en: 'Retirement as Deputy Conservator of Forests' } },
  ],

  innovations_heading: { hi: 'जो नवाचार उद्योग बन गए', en: 'Innovations that became industries' }, // ks-style-ok
  innovations: [
    {
      place: { hi: 'बैहर', en: 'Baihar' },
      text: { hi: 'सबई घास की रस्सी और बाँस के फर्नीचर के नवाचार, जो आगे चलकर बड़े उद्योग बने।', en: 'Innovations in sabai grass rope and bamboo furniture, which later grew into large industries.' }, // ks-style-ok
      // '/founder/baihar-1.jpg' (1600 wide)
      src: null,
      width: 1600,
      height: 1067,
      alt: { hi: 'बैहर में सबई घास की रस्सी और बाँस के फर्नीचर का काम', en: 'Sabai grass rope and bamboo furniture work at Baihar' },
    },
    {
      place: { hi: 'बिजावर', en: 'Bijawar' },
      text: { hi: 'सेवा के अंतिम वर्ष में "बुंदेली व्यंजन, बिजावर" की शुरुआत, जिसे प्रदेश स्तर पर कई पुरस्कार मिले।', en: 'In the final year of service, the start of "Bundeli Vyanjan, Bijawar", which received several state-level awards.' },
      // '/founder/bijawar-1.jpg' (1600 wide)
      src: null,
      width: 1600,
      height: 1067,
      alt: { hi: 'बुंदेली व्यंजन, बिजावर', en: 'Bundeli Vyanjan, Bijawar' },
    },
  ],
  awards: [
    {
      title: { hi: 'स्वर्ण पदक', en: 'Gold Medal' },
      year: '2011',
      text: { hi: 'वर्ष 2007-08 के उत्कृष्ट वानिकी कार्यों के लिए 20 अप्रैल 2011 को म.प्र. शासन द्वारा।', en: 'Awarded by the Government of M.P. on 20 April 2011 for outstanding forestry work in the year 2007-08.' },
      // '/founder/medal-certificate.jpg' (1600 wide). Setting this shows the
      // "प्रमाणपत्र देखें" link and adds the award to the structured data.
      proof_src: null,
      proof_alt: { hi: 'स्वर्ण पदक का प्रमाणपत्र', en: 'Gold Medal certificate' },
    },
    {
      title: { hi: 'गिनीज वर्ल्ड रिकॉर्ड', en: 'Guinness World Record' },
      year: '2014-15',
      text: { hi: 'वर्ष 2014-15 में कृषि क्षेत्र में सफल रोपण का गिनीज वर्ल्ड रिकॉर्ड दर्ज हुआ।', en: 'In 2014-15 a Guinness World Record was registered for successful plantation in the agriculture sector.' },
      // '/founder/guinness-certificate.jpg' (1600 wide)
      proof_src: null,
      proof_alt: { hi: 'गिनीज वर्ल्ड रिकॉर्ड का प्रमाणपत्र', en: 'Guinness World Record certificate' },
    },
  ],
  after_service: {
    hi: 'सेवानिवृत्ति के बाद भी भारत विकास परिषद, आदिवासी विकास मंच और साहित्यिक गतिविधियों में सक्रिय हूँ।',
    en: 'Even after retirement I remain active in Bharat Vikas Parishad, Adivasi Vikas Manch and literary activities.',
  },

  resolve_heading: { hi: 'एक संकल्प जो जिद बन गया', en: 'A resolve that became a firm determination' },
  resolve_p: {
    hi: '2011 से मैं चाहता था कि किसान को कार्बन क्रेडिट का सीधा लाभ मिले। शुरुआती कठिनाइयों ने मेरा इरादा कमज़ोर नहीं किया, और पक्का कर दिया। मैंने तय किया कि यह काम अब मैं खुद करूँगा। मेरे दो सिद्धांत हैं:',
    en: 'Since 2011 I had wanted the farmer to receive the direct benefit of carbon credits. The early difficulties did not weaken my intention; they made it firmer. I decided that I would now do this work myself. I hold two principles:',
  },
  principles: [
    { hi: 'अकर्म से कर्म श्रेष्ठ', en: 'Action is better than inaction' },
    { hi: 'परिश्रम के अतिरिक्त कोई रास्ता नहीं', en: 'There is no path other than hard work' },
  ],

  promises_heading: { hi: 'किसान सहयोग: मेरे तीन वादे', en: 'Kissan Sahyog: my three promises' },
  promises: [
    {
      title: { hi: 'सही और भरोसेमंद जानकारी', en: 'Correct and trustworthy information' },
      text: { hi: 'सरकारी और प्रमाणित स्रोतों के आधार पर, सरल हिंदी में और समय पर अपडेट, इसके लिए सच्चे मन से काम करूँगा।', en: 'Based on government and verified sources, in simple Hindi and updated on time; I will work for this with a sincere heart.' },
    },
    {
      title: { hi: 'किसान की आय बढ़ाना', en: 'Increasing Farmer Income' },
      text: { hi: 'हर नई सुविधा इसी कसौटी पर परखूँगा कि उससे किसान को क्या लाभ होता है।', en: 'I will test every new feature against one measure: what benefit it brings to the farmer.' },
    },
    {
      title: { hi: 'रोज़गार के अवसर बनाना', en: 'Creating Employment Opportunities' },
      text: { hi: 'ज़मीन, उपकरण और मज़दूर जैसे बाज़ार के माध्यम से गाँव में काम के अवसर जोड़ने का प्रयास करूँगा।', en: 'Through a marketplace for land, equipment and labour, I will try to connect opportunities for work in the village.' },
    },
  ],

  blessings_heading: { hi: 'आशीर्वाद और स्नेह', en: 'Blessings and affection' },
  family: [
    {
      label: { hi: 'धर्मपत्नी', en: 'Wife' },
      members: [{ hi: 'श्रीमती नीलम दीक्षित', en: 'Smt. Neelam Dixit' }],
    },
    {
      label: { hi: 'पुत्र एवं पुत्रवधुएँ', en: 'Sons and daughters-in-law' }, // ks-style-ok
      members: [
        { hi: 'अनुपम', en: 'Anupam' },
        { hi: 'अमन', en: 'Aman' },
        { hi: 'वेदिका (अनुपम की पत्नी)', en: 'Vedica (wife of Anupam)' },
        { hi: 'अंकिता (अमन की पत्नी)', en: 'Ankita (wife of Aman)' },
      ],
    },
    {
      label: { hi: 'बड़ों का आशीर्वाद और स्मृति', en: 'Blessings and memory of elders' },
      members: [
        { hi: 'स्व. पंडित उमाशंकर दीक्षित एवं भाभी जी डॉ. कमलेश दीक्षित', en: 'Late Pt. Umashankar Dixit and Bhabhi ji Dr. Kamlesh Dixit' }, // ks-style-ok
        { hi: 'रविशंकर दीक्षित एवं स्व. डॉ. छाया दीक्षित (भाभी जी)', en: 'Ravishankar Dixit and late Dr. Chhaya Dixit (Bhabhi ji)' }, // ks-style-ok
        { hi: 'एडवोकेट संतोष दीक्षित', en: 'Advocate Santosh Dixit' },
      ],
    },
    {
      label: { hi: 'भतीजे-भतीजियाँ', en: 'Nephews and nieces' },
      members: [
        { hi: 'राहुल-सुप्रिया', en: 'Rahul–Supriya' },
        { hi: 'हिमाँशु-सुरभि', en: 'Himanshu–Surbhi' },
        { hi: 'रिचा', en: 'Richa' },
        { hi: 'श्रुति दीक्षित', en: 'Shruti Dixit' },
      ],
    },
  ],
  blessings_close: {
    hi: 'इन सभी परिजनों के स्नेह, आशीर्वाद और सहयोग से ही यह नया कदम उठा रहा हूँ।',
    en: 'It is with the affection, blessings and support of all these family members that I am taking this new step.',
  },

  // Visible on the page and marked up as FAQPage JSON-LD. Answers use only the facts above.
  faqs: [
    {
      q: { hi: 'किसान सहयोग किसने शुरू किया?', en: 'Who started Kissan Sahyog?' },
      a: {
        hi: 'किसान सहयोग की शुरुआत श्री अभिनन्दन दीक्षित ने की है। वे मध्य प्रदेश शासन के उप वन संरक्षक (DCF) पद से सेवानिवृत्त हैं और किसान परिवार से हैं।',
        en: 'Kissan Sahyog was started by Shri Abhinandan Dixit. He retired as Deputy Conservator of Forests (DCF) with the Government of Madhya Pradesh and comes from a farming family.',
      },
    },
    {
      q: { hi: 'संस्थापक का अनुभव क्या है?', en: 'What is the founder’s experience?' },
      a: {
        hi: 'उन्होंने 1981 से 2023 तक 42 वर्ष शासकीय सेवा की। इस दौरान प्रदेश के कई ज़िलों में गाँवों और किसानों के बीच काम किया।',
        en: 'He served in government for 42 years, from 1981 to 2023. In that time he worked among villages and farmers in several districts of the state.',
      },
    },
    {
      q: { hi: 'किसान सहयोग का उद्देश्य क्या है?', en: 'What is the aim of Kissan Sahyog?' },
      a: {
        hi: 'दो उद्देश्य हैं: किसान की आय बढ़ाना और रोज़गार के अवसर बनाना। इसके लिए सही जानकारी और बेहतर बाज़ार किसान तक पहुँचाने का काम किया जाता है।',
        en: 'There are two aims: Increasing Farmer Income and Creating Employment Opportunities. For this, the work is to take the right information and a better market to the farmer.',
      },
    },
  ],

  // Same target the homepage uses for the Sawaal ask flow.
  cta_ask: { label: { hi: 'अपना सवाल पूछें', en: 'Ask a farming question' }, to: '/sawaal?ask=1&photo=1' },
  // The existing attributed WhatsApp join path (/join?src=…); shown only when a channel is set.
  cta_join: { label: { hi: 'WhatsApp पर जुड़ें', en: 'Join on WhatsApp' }, to: '/join?src=founder' },

  // Fixed values for structured data (see buildFounderJsonLd).
  jsonld: {
    job_title: { hi: 'सेवानिवृत्त उप वन संरक्षक, मध्य प्रदेश', en: 'Retired Deputy Conservator of Forests, Madhya Pradesh' },
    birth_place: { hi: 'खुरई', en: 'Khurai' },
    org_name: { hi: 'किसान सहयोग', en: 'Kissan Sahyog' },
  },
}

const pick = (v, lang) => v?.[lang] ?? v?.hi ?? ''

// JSON-LD for /founder: Person + Organization (founder relation) + FAQPage.
// Person carries ONLY name, jobTitle, birthPlace and worksFor. An award is added
// only when its certificate (`proof_src`) is set — unproven awards never reach
// structured data.
export function buildFounderJsonLd(data = founder, lang = 'hi') {
  const org = { '@type': 'Organization', name: pick(data.jsonld.org_name, lang), url: ORIGIN }
  const proven = (data.awards || []).filter((a) => a.proof_src)
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: pick(data.name, lang),
    jobTitle: pick(data.jsonld.job_title, lang),
    birthPlace: { '@type': 'Place', name: pick(data.jsonld.birth_place, lang) },
    worksFor: org,
    ...(proven.length ? { award: proven.map((a) => `${pick(a.title, lang)}, ${a.year}`) } : {}),
  }
  const organization = {
    '@context': 'https://schema.org',
    ...org,
    founder: { '@type': 'Person', name: pick(data.name, lang) },
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (data.faqs || []).map((f) => ({
      '@type': 'Question',
      name: pick(f.q, lang),
      acceptedAnswer: { '@type': 'Answer', text: pick(f.a, lang) },
    })),
  }
  return [person, organization, faq]
}
