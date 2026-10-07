// /jugaad — Kissan Sahyog Jugaad / grassroots-innovation information page
// (Phase 9). Bilingual, authored as structured content so every number/date
// carries a citation (§0.2). This is an information page only: it offers NO
// help with patents or awards (§9.3) and makes no commitments. Hindi literals
// are allowed here because this is a data/content file.
export const jugaadPage = {
  slug: 'jugaad',
  title: {
    hi: 'जुगाड़ और देसी आविष्कार — जानकारी गाइड | किसान सहयोग',
    en: 'Jugaad & Rural Innovation — Information Guide | Kissan Sahyog',
  },
  h1: {
    hi: 'जुगाड़ और देसी आविष्कार: पूरी जानकारी गाइड',
    en: 'Jugaad and rural innovation: a complete information guide',
  },
  updated: '2026-10-06',
  blocks: [
    // Summary (first block) ---------------------------------------------------
    {
      type: 'summary',
      text: {
        hi: 'जुगाड़ यानी कम खर्च में बनी देसी मशीन या नई तरकीब। यह पेज बताता है कि आप यहाँ क्या डाल सकते हैं, मदद कहाँ से मिलेगी, और कौन-से कानून व सुरक्षा की बातें ध्यान में रखें। यह सिर्फ़ जानकारी है, कोई वादा नहीं।',
        en: 'Jugaad means a low-cost local machine or a new trick. This page tells you what you can list here, where to get help, and which laws and safety points to keep in mind. It is information only, not a promise.',
      },
    },

    // 1. What you can list here ----------------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'यहाँ आप क्या डाल सकते हैं', en: 'What you can list here' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'आप अपनी बनाई देसी मशीन या जुगाड़ यहाँ डाल सकते हैं। जो चीज़ आपने खुद बनाई है, या जिस पर आपका हक़ है, उसी को लिस्ट करें। सच्चा नाम, काम और फ़ोटो दें।',
        en: 'You can list a local machine or jugaad you have made. List only something you built yourself, or have rights to. Give a true name, its use and photos.',
      },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'खेत के छोटे औज़ार और मशीनें — जैसे छिड़काव यंत्र, थ्रेशर में सुधार, या बीज बोने का जुगाड़।', en: 'Small farm tools and machines — like a sprayer, a thresher improvement, or a seed-sowing jugaad.' } },
        { text: { hi: 'पानी और सिंचाई के सस्ते इंतज़ाम — जैसे पंप का जुगाड़ या ड्रिप का देसी तरीका।', en: 'Cheap water and irrigation set-ups — like a pump jugaad or a local drip method.' } },
        { text: { hi: 'डेयरी, घर और वर्कशॉप के काम आने वाली छोटी मशीनें।', en: 'Small machines useful for dairy, home and workshop work.' } },
        { text: { hi: 'ध्यान दें: सड़क पर चलने वाले जुगाड़ वाहन यहाँ स्वीकार नहीं होते (नीचे कानून देखें)।', en: 'Note: road-going jugaad vehicles are not accepted here (see the law below).' } },
      ],
    },

    // 2. Where to get help ----------------------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'मदद कहाँ से मिलेगी', en: 'Where you can get help' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे कुछ सरकारी संस्थाएँ और योजनाएँ हैं। किसान सहयोग इनमें से किसी का हिस्सा नहीं है और आवेदन या मंज़ूरी का कोई वादा नहीं करता। नियम बदल सकते हैं — उनकी वेबसाइट पर खुद जाँच लें।',
        en: 'Below are some government bodies and schemes. Kissan Sahyog is not part of any of them and promises no application or approval. Rules can change — check on their website yourself.',
      },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'NIF (राष्ट्रीय नवप्रवर्तन प्रतिष्ठान) — DST का स्वायत्त संस्थान, मार्च 2000 में बना। यह ज़मीनी आविष्कारकों के लिए है। इसकी 15वीं राष्ट्रीय द्विवार्षिक प्रतियोगिता 31 मार्च 2027 तक खुली है; "submit idea" फ़ॉर्म से भेजें। nif.org.in', en: 'NIF (National Innovation Foundation) — an autonomous institute of DST, set up in March 2000, for grassroots innovators. Its 15th National Biennial Competition is open till 31 March 2027; submit via the "submit idea" form. nif.org.in' }, cites: ['S-JUG-01', 'S-JUG-03', 'S-JUG-06'] },
        { text: { hi: 'MVIF (सूक्ष्म उद्यम नवाचार कोष) — बिना ज़मानत या गारंटर के सहायता देता है। यह उन आविष्कारकों के लिए है जिन्हें छोटी पूँजी चाहिए। nif.org.in', en: 'MVIF (Micro Venture Innovation Fund) — gives support without collateral or a guarantor. It is for innovators who need small capital. nif.org.in' }, cites: ['S-JUG-14'] }, // ks-style-ok: नवाचार — official fund name (सूक्ष्म उद्यम नवाचार कोष)
        { text: { hi: 'NIDHI-PRAYAS (DST) — नमूना (प्रोटोटाइप) बनाने के लिए ₹10 लाख तक की सहायता। यह उन लोगों के लिए है जो अपने जुगाड़ का नमूना बनाना चाहते हैं। nidhi-prayas.org', en: 'NIDHI-PRAYAS (DST) — support of up to ₹10 lakh to build a prototype. It is for people who want to build a working sample of their jugaad. nidhi-prayas.org' }, cites: ['S-JUG-13'] },
        { text: { hi: 'स्टार्टअप इंडिया सीड फंड — PoC/प्रोटोटाइप के लिए ₹20 लाख तक अनुदान और ₹50 लाख तक निवेश। यह उन स्टार्टअप के लिए है जो 2 साल या कम पुराने और DPIIT-मान्यता प्राप्त हों। startupindia.gov.in', en: 'Startup India Seed Fund — a grant of up to ₹20 lakh for PoC/prototype and investment of up to ₹50 lakh. It is for start-ups that are 2 years old or less and DPIIT-recognised. startupindia.gov.in' }, cites: ['S-JUG-16', 'S-JUG-17'] },
        { text: { hi: 'MP स्टार्टअप नीति 2025 — राज्य के स्टार्टअप के लिए एकल-खिड़की सहायता, जिसमें ₹5 लाख तक की पेटेंट सहायता शामिल है। startup.mp.gov.in', en: 'MP Startup Policy 2025 — single-window support for state start-ups, including patent support of up to ₹5 lakh. startup.mp.gov.in' }, cites: ['S-JUG-19', 'S-JUG-20'] },
        { text: { hi: 'CFMTTI, बुदनी (सीहोर, MP) — एक सरकारी संस्थान, जहाँ कृषि मशीनों की जाँच (testing) होती है। यह उन लोगों के लिए है जो अपनी मशीन जँचवाना चाहते हैं। fmttibudni.gov.in', en: 'CFMTTI, Budni (Sehore, MP) — a government institute that tests farm machinery. It is for people who want their machine checked. fmttibudni.gov.in' }, cites: ['S-JUG-21', 'S-JUG-22'] },
      ],
    },

    // 3. Safety and law — in plain words -------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'सुरक्षा और कानून — आसान भाषा में', en: 'Safety and law — in plain words' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'यह कानूनी सलाह नहीं है, सिर्फ़ सामान्य जानकारी है। अपने मामले के लिए किसी जानकार या वकील से सलाह ज़रूर लें।',
        en: 'This is not legal advice, only general information. For your own case, do consult a knowledgeable person or a lawyer.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'सड़क पर चलने वाले जुगाड़ वाहन', en: 'Road-going jugaad vehicles' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मोटर वाहन अधिनियम के तहत सुप्रीम कोर्ट ने RSRTC बनाम संतोष (2013) में माना कि एक "जुगाड़" वाहन, धारा 2(28) के अनुसार एक मोटर वाहन है।',
        en: 'Under the Motor Vehicles Act, the Supreme Court in RSRTC v. Santosh (2013) held that a "jugaad" vehicle is a motor vehicle under section 2(28).',
      },
      cites: ['S-JUG-23'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'RTO बनाम के. जयचंद्र (9 जनवरी 2019) में सुप्रीम कोर्ट ने माना कि किसी वाहन को उसके निर्माता की तय बनावट से बदला नहीं जा सकता (धारा 52)। इसी वजह से सड़क पर चलने वाले जुगाड़ वाहन यहाँ स्वीकार नहीं होते।',
        en: 'In RTO v. K. Jayachandra (9 January 2019) the Supreme Court held that a vehicle cannot be altered from the manufacturer\'s specification (section 52). For this reason, road-going jugaad vehicles are not accepted here.',
      },
      cites: ['S-JUG-24'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'मशीन की सुरक्षा', en: 'Machine safety' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खतरनाक मशीन (विनियमन) अधिनियम, 1983 कुछ खतरनाक मशीनों के बनाने और बेचने पर नियम लगाता है। ऐसी मशीन बनाते या बेचते समय इनका ध्यान रखें।',
        en: 'The Dangerous Machines (Regulation) Act, 1983 places rules on making and selling certain dangerous machines. Keep these in mind when you make or sell such a machine.',
      },
      cites: ['S-JUG-51'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'बिजली वाले जुगाड़ में सही तार, अर्थिंग और फ्यूज़/MCB लगाएँ। गीले हाथों या जगह पर बिजली के उपकरण न छुएँ। घूमने वाले पुर्ज़ों पर गार्ड लगाएँ। जानकारी: मशीनरी एवं विद्युत उपकरण सुरक्षा आदेश (OTR 2024) टाल दिया गया था (S.O. 2579(E), 12 जून 2025)।', // ks-style-ok: एवं — official order name
        en: 'In an electric jugaad, use correct wiring, earthing and a fuse/MCB. Do not touch electrical equipment with wet hands or in wet places. Fit guards on rotating parts. For information: the Machinery & Electrical Equipment Safety order (OTR 2024) was deferred (S.O. 2579(E), 12 June 2025).',
      },
      cites: ['S-JUG-41'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'बेचने वाले की ज़िम्मेदारी', en: 'The seller\'s responsibility' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'उपभोक्ता संरक्षण अधिनियम, 2019 के अनुसार "इलेक्ट्रॉनिक सेवा प्रदाता" में कोई भी ऑनलाइन बाज़ार शामिल है, और उत्पाद-दायित्व खराब/दोषपूर्ण उत्पादों पर लागू होता है। यानी आप कुछ बनाकर बेचें, तो उसकी गुणवत्ता और सुरक्षा की ज़िम्मेदारी भी आपकी है।',
        en: 'Under the Consumer Protection Act, 2019, an "electronic service provider" includes any online marketplace, and product liability applies to defective products. So if you make and sell something, responsibility for its quality and safety is yours too.',
      },
      cites: ['S-JUG-52'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'पेटेंट', en: 'Patents' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'पेटेंट कानून में "आविष्कार" का मतलब है एक नया उत्पाद या प्रक्रिया, जिसमें नवीनता हो और जो उद्योग में इस्तेमाल लायक हो।',
        en: 'Under the Patents Act, an "invention" means a new product or process that involves an inventive step and is capable of industrial use.',
      },
      cites: ['S-JUG-44'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसी आविष्कार को पेटेंट मिलने से पहले सार्वजनिक रूप से दिखा देना उसकी पेटेंट-योग्यता पर असर डाल सकता है। धारा 31 एक अधिसूचित प्रदर्शनी में प्रदर्शन को सुरक्षा देती है, अगर बारह महीने के भीतर पेटेंट आवेदन कर दिया जाए।',
        en: 'Showing an innovation publicly before it is patented can affect its patentability; section 31 protects display at a notified exhibition if a patent application follows within twelve months.',
      },
      cites: ['S-JUG-45'],
    },

    // 4. How Kissan Sahyog may try to help (EXACT agreed soft text) -----------
    {
      type: 'heading', level: 2,
      text: { hi: 'किसान सहयोग कैसे मदद करेगा', en: 'How Kissan Sahyog may help' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'हम कोशिश करेंगे कि अच्छे जुगाड़ और आविष्कारों को इंजीनियरिंग कॉलेजों, पॉलिटेक्निक, ITI, मेडिकल व फार्मा क्षेत्र और कंपनियों तक पहुँचाएँ। रुचि हो तो हमसे hello@kissansahyog.com पर संपर्क करें।',
        en: 'We will try to present/propose good innovations to engineering colleges, polytechnics, ITIs, the medical and pharma sector, and companies; if interested, contact us at hello@kissansahyog.com.',
      },
    },

    // 5. FAQ (up to 8) -------------------------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
    },
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'जुगाड़ का मतलब क्या है?', en: 'What does jugaad mean?' },
          a: { hi: 'जुगाड़ गाँव की वह तरकीब है जिसमें कम खर्च में, आसपास की चीज़ों से किसी मुश्किल का हल निकाला जाता है। यह "कम में ज़्यादा" की सोच है।', en: 'Jugaad is the rural knack of solving a problem at low cost using whatever is at hand — a "more from less" mindset.' },
        },
        {
          q: { hi: 'क्या यह पेज मुझे पेटेंट या पुरस्कार दिला सकता है?', en: 'Can this page get me a patent or an award?' },
          a: { hi: 'नहीं। यह सिर्फ़ जानकारी का पेज है। पेटेंट के लिए किसी जानकार या वकील से सलाह लें।', en: 'No. This is only an information page. For a patent, consult a knowledgeable person or a lawyer.' },
        },
        {
          q: { hi: 'NIF क्या है और वह कब बनी?', en: 'What is NIF and when was it set up?' },
          a: { hi: 'राष्ट्रीय नवप्रवर्तन प्रतिष्ठान (NIF) DST का एक स्वायत्त संस्थान है, जो मार्च 2000 में बना।', en: 'The National Innovation Foundation (NIF) is an autonomous institute of DST, set up in March 2000.' }, cites: ['S-JUG-01'],
        },
        {
          q: { hi: 'NIDHI-PRAYAS में कितनी सहायता मिलती है?', en: 'How much support does NIDHI-PRAYAS give?' },
          a: { hi: 'DST की NIDHI-PRAYAS योजना में प्रोटोटाइप बनाने के लिए ₹10 लाख तक की सहायता मिलती है।', en: 'DST\'s NIDHI-PRAYAS scheme gives support of up to ₹10 lakh to build a prototype.' }, cites: ['S-JUG-13'],
        },
        {
          q: { hi: 'स्टार्टअप इंडिया सीड फंड के लिए पात्रता क्या है?', en: 'What is the eligibility for the Startup India Seed Fund?' },
          a: { hi: 'स्टार्टअप 2 साल या उससे कम पुराना और DPIIT-मान्यता प्राप्त होना चाहिए। इसमें ₹20 लाख तक अनुदान और ₹50 लाख तक निवेश मिल सकता है।', en: 'The start-up must be 2 years old or less and DPIIT-recognised. It can give a grant of up to ₹20 lakh and investment of up to ₹50 lakh.' }, cites: ['S-JUG-16', 'S-JUG-17'],
        },
        {
          q: { hi: 'अपनी कृषि मशीन की जाँच कहाँ करा सकता हूँ?', en: 'Where can I get my farm machine tested?' },
          a: { hi: 'CFMTTI, बुदनी (सीहोर, MP) में कृषि मशीनों की जाँच की सेवाएँ मिलती हैं।', en: 'CFMTTI, Budni (Sehore, MP) offers farm-machinery testing services.' }, cites: ['S-JUG-21', 'S-JUG-22'],
        },
        {
          q: { hi: 'क्या मैं सड़क पर चलने वाला जुगाड़ वाहन यहाँ बेच सकता हूँ?', en: 'Can I sell a road-going jugaad vehicle here?' },
          a: { hi: 'नहीं। सुप्रीम कोर्ट ने माना है कि जुगाड़ एक मोटर वाहन है (RSRTC बनाम संतोष, 2013) और वाहन को निर्माता की बनावट से बदला नहीं जा सकता (RTO बनाम के. जयचंद्र, 9 जनवरी 2019)। इसलिए ऐसे वाहन यहाँ स्वीकार नहीं होते।', en: 'No. The Supreme Court held that a jugaad is a motor vehicle (RSRTC v. Santosh, 2013) and a vehicle cannot be altered from the manufacturer\'s specification (RTO v. K. Jayachandra, 9 January 2019). Such vehicles are not accepted here.' }, cites: ['S-JUG-23', 'S-JUG-24'],
        },
        {
          q: { hi: 'अगर मैं कुछ बनाकर बेचूँ तो ज़िम्मेदारी किसकी?', en: 'If I make and sell something, whose responsibility is it?' },
          a: { hi: 'उपभोक्ता संरक्षण अधिनियम, 2019 के अनुसार उत्पाद-दायित्व खराब/दोषपूर्ण उत्पादों पर लागू होता है। यानी गुणवत्ता और सुरक्षा की ज़िम्मेदारी आपकी है।', en: 'Under the Consumer Protection Act, 2019, product liability applies to defective products. So responsibility for quality and safety is yours.' }, cites: ['S-JUG-52'],
        },
      ],
    },
  ],
}

export default jugaadPage
