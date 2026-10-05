// /carbon-credit — authored carbon-credit explainer + MP policy analysis.
// Every block carrying a number / ₹ / % / date / करोड़ / लाख / प्रतिशत MUST
// carry `cites` from src/content/sources.js (§0.2 zero-hallucination). Past, real
// examples are marked pastExample:true (renders <PastExampleNote/>), company
// claims are labelled "कंपनी का दावा". This file lives under src/content/, so
// Hindi literals are allowed here (it is data, not a screen).
export const carbonCreditPage = {
  slug: 'carbon-credit',
  title: {
    hi: 'कार्बन क्रेडिट: क्या यह किसानों की आय का नया ज़रिया बन सकता है — और क्या मध्य प्रदेश को इसे अपनाना चाहिए?',
    en: 'Carbon credit: can it become a new income source for farmers — and should Madhya Pradesh adopt it?',
  },
  h1: {
    hi: 'कार्बन क्रेडिट: क्या यह किसानों की आय का नया ज़रिया बन सकता है — और क्या मध्य प्रदेश को इसे अपनाना चाहिए?',
    en: 'Carbon credit: can it become a new income source for farmers — and should Madhya Pradesh adopt it?',
  },
  updated: '2026-10-06',
  checked: '2026-10-06',
  blocks: [
    {
      type: 'summary',
      text: {
        hi: 'यह पृष्ठ सरल भाषा में बताता है कि कार्बन क्रेडिट क्या है, किसान इससे कैसे कमा सकते हैं, भारत में अब तक के असली उदाहरण क्या रहे हैं, इसमें जोखिम क्या हैं, और मध्य प्रदेश — ख़ासकर सागर व बुंदेलखंड — के लिए इसमें क्या उपयुक्त हो सकता है। हर आर्थिक आँकड़े के साथ उसका स्रोत जोड़ा गया है ताकि आप स्वयं परख सकें।',
        en: 'This page explains, in plain language, what a carbon credit is, how farmers can earn from it, the real examples seen in India so far, the risks involved, and what might suit Madhya Pradesh — especially Sagar and Bundelkhand. Every financial figure carries its source so you can verify it yourself.',
      },
      cites: ['S-CARB-01', 'S-CARB-11'],
    },

    // ---------------------------------------------------------------- 2
    {
      type: 'heading', level: 2,
      text: { hi: 'कार्बन क्रेडिट क्या है', en: 'What is a carbon credit' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कार्बन क्रेडिट एक तरह का प्रमाणपत्र है जो यह दर्शाता है कि वातावरण में जाने वाली ग्रीनहाउस गैस (जैसे कार्बन डाइऑक्साइड या मीथेन) की एक निश्चित मात्रा को या तो रोका गया है या फिर मिट्टी व पेड़ों में संचित (sequester) किया गया है। आसान शब्दों में — जब कोई खेती या वानिकी का तरीका हवा में कम गैस छोड़ता है या ज़मीन/पेड़ों में अधिक कार्बन जमा करता है, तो उस "बचत" को नापकर एक क्रेडिट बनाया जा सकता है।',
        en: 'A carbon credit is a certificate showing that a measured amount of greenhouse gas (such as carbon dioxide or methane) has either been avoided or stored (sequestered) in soil and trees. In simple terms — when a farming or forestry practice releases less gas into the air, or locks more carbon into the land or trees, that "saving" can be measured and turned into a credit.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'यह क्रेडिट एक बाज़ार में बेचा जा सकता है, जहाँ कंपनियाँ या संस्थाएँ अपने उत्सर्जन की भरपाई के लिए इसे ख़रीदती हैं। बाज़ार दो तरह के होते हैं — "स्वैच्छिक" (voluntary), जहाँ कंपनियाँ अपनी मर्ज़ी से ख़रीदती हैं, और "अनुपालन" (compliance), जहाँ क़ानून के तहत कुछ उद्योगों को अपना उत्सर्जन घटाना या क्रेडिट लेना पड़ता है। किसान आमतौर पर स्वैच्छिक बाज़ार और खेती से जुड़ी परियोजनाओं के ज़रिए इससे जुड़ते हैं।',
        en: 'Such a credit can be sold in a market where companies or institutions buy it to offset their own emissions. There are two kinds of market — "voluntary", where companies buy by choice, and "compliance", where law requires certain industries to cut emissions or buy credits. Farmers usually connect to this through the voluntary market and agriculture-linked projects.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'यह ध्यान रखना ज़रूरी है कि कार्बन क्रेडिट कोई सरकारी सब्सिडी या तय आमदनी नहीं है। इसकी क़ीमत बाज़ार पर निर्भर करती है, और किसान को पैसा तभी मिलता है जब परियोजना क्रेडिट प्रमाणित करा ले और कोई ख़रीदार मिल जाए। इसलिए इसे "अतिरिक्त आय का एक संभावित अवसर" समझना सही है, न कि पक्की कमाई की गारंटी।',
        en: 'It is important to understand that a carbon credit is not a government subsidy or a fixed income. Its price depends on the market, and the farmer is paid only once the project gets credits certified and finds a buyer. So it is best seen as "a possible opportunity for extra income", not a guarantee of assured earnings.',
      },
    },

    // ---------------------------------------------------------------- 3
    {
      type: 'heading', level: 2,
      text: { hi: 'किसान कैसे कमा सकते हैं', en: 'How farmers can earn' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसान मुख्य रूप से तीन तरह के तरीक़ों से कार्बन क्रेडिट परियोजनाओं से जुड़ सकते हैं। पहला है मिट्टी से जुड़े तरीक़े — जैसे कम जुताई (reduced tillage), फ़सल अवशेष को न जलाकर खेत में मिलाना (residue management), कवर क्रॉप और संतुलित सिंचाई। इनसे मिट्टी में कार्बन जमा होता है और उत्सर्जन घटता है।',
        en: 'Farmers can connect to carbon-credit projects mainly in three ways. The first is soil-based practices — such as reduced tillage, managing crop residue by mixing it into the field instead of burning it, cover crops and balanced irrigation. These store carbon in the soil and cut emissions.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'दूसरा तरीक़ा है पेड़ लगाना — खेत की मेड़ पर, खेत के किनारे या कृषि-वानिकी (agroforestry) के रूप में। बढ़ते पेड़ हवा से कार्बन सोखकर अपने तने और ज़मीन में जमा करते हैं। तीसरा तरीक़ा है पशुधन और गोबर के प्रबंधन से मीथेन घटाना — जैसे बायोगैस संयंत्र लगाना या गोबर का बेहतर प्रबंधन करना।',
        en: 'The second way is planting trees — on field bunds, at field edges, or as agroforestry. Growing trees absorb carbon from the air and store it in their trunks and the soil. The third way is reducing methane through livestock and manure management — such as setting up a biogas plant or managing dung better.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'भारत के ऊर्जा दक्षता ब्यूरो (BEE) ने पशुधन/गोबर से मीथेन रिकवरी के लिए एक पद्धति BM AG04.001 मंज़ूर की है, जो घरों और छोटे खेतों पर मीथेन रिकवरी से जुड़ी है। इसका मतलब है कि पशुपालन से जुड़े छोटे किसान भी इस तरह की परियोजनाओं में शामिल हो सकते हैं।',
        en: 'India\'s Bureau of Energy Efficiency (BEE) has approved a methodology, BM AG04.001, for methane recovery from livestock/manure at households and small farms. This means even small livestock-keeping farmers can be part of such projects.',
      },
      cites: ['S-CARB-06'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'भारत में खेती को कार्बन क्रेडिट ट्रेडिंग योजना (CCTS) के ऑफ़सेट तंत्र में शामिल किया गया है। यानी खेती-आधारित परियोजनाएँ भी इस राष्ट्रीय ढाँचे का हिस्सा बन सकती हैं। लेकिन व्यवहार में अधिकांश किसान फ़िलहाल निजी कंपनियों की परियोजनाओं और स्वैच्छिक बाज़ार के ज़रिए ही जुड़े हैं।',
        en: 'In India, agriculture has been included in the offset mechanism of the Carbon Credit Trading Scheme (CCTS). That means agriculture-based projects can also be part of this national framework. In practice, however, most farmers are currently connected through private companies\' projects and the voluntary market.',
      },
      cites: ['S-CARB-05'],
    },

    // ---------------------------------------------------------------- 4
    {
      type: 'heading', level: 2,
      text: { hi: 'भारत के असली उदाहरण', en: 'Real examples from India' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे दिए उदाहरण अतीत की असली घटनाएँ हैं, जिन्हें आधिकारिक और समाचार स्रोतों से लिया गया है। ये यह नहीं बताते कि आपको भी उतना ही मिलेगा — हर परियोजना, इलाक़ा, फ़सल और अनुबंध अलग होता है।',
        en: 'The examples below are real past events, drawn from official and news sources. They do not indicate that you will receive the same — every project, area, crop and contract differs.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'ग्रो इंडिगो का "आदि" (Aadi) प्रोजेक्ट — पंजाब व हरियाणा', en: 'Grow Indigo\'s "Aadi" project — Punjab & Haryana' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'भारत के पहले मृदा-कार्बन (soil-carbon) भुगतान के रूप में ग्रो इंडिगो की "आदि" परियोजना के तहत पंजाब और हरियाणा के 2,550 किसानों को कुल ₹2.9 करोड़ दिए गए — यानी लगभग ₹3,000 से ₹15,000 प्रति किसान। यह भुगतान 2019 से 2022 के बीच सीधी धान बुवाई (DSR), कम जुताई और फ़सल अवशेष प्रबंधन जैसे तरीक़े अपनाने पर आधारित था। किसानों के पास दो विकल्प थे — एक तय अग्रिम (assured upfront) भुगतान, या शुद्ध कार्बन राजस्व का 75% हिस्सा।',
        en: 'As India\'s first soil-carbon payments, Grow Indigo\'s "Aadi" project paid a total of ₹2.9 crore to 2,550 farmers in Punjab and Haryana — roughly ₹3,000 to ₹15,000 per farmer. These payments, between 2019 and 2022, were based on practices such as direct-seeded rice (DSR), reduced tillage and crop-residue management. Farmers could choose between two options — an assured upfront payment, or a 75% share of net carbon revenue.',
      },
      cites: ['S-CARB-01'],
      pastExample: true,
    },
    {
      type: 'calc',
      formula: { hi: '₹2,90,00,000 ÷ 2,550 किसान', en: '₹2,90,00,000 ÷ 2,550 farmers' },
      inputs: [
        { label: { hi: 'कुल भुगतान', en: 'Total paid' }, value: { hi: '₹2.9 करोड़ (₹2,90,00,000)', en: '₹2.9 crore (₹2,90,00,000)' }, cites: ['S-CARB-01'] },
        { label: { hi: 'किसानों की संख्या', en: 'Number of farmers' }, value: { hi: '2,550', en: '2,550' }, cites: ['S-CARB-01'] },
      ],
      result: { hi: '≈ ₹11,373 प्रति किसान (औसत)', en: '≈ ₹11,373 per farmer (average)' },
      cites: ['S-CARB-01'],
      disclaimer: {
        hi: 'यह केवल औसत गणित है — असल भुगतान किसान-दर-किसान बहुत अलग रहा। इससे यह तय नहीं होता कि आपको कितना मिलेगा।',
        en: 'This is only average arithmetic — actual payments varied widely farmer to farmer. It does not determine what you would receive.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ग्रो इंडिगो ने स्वयं बताया कि इस भुगतान में औसत राशि लगभग ₹11,478 रही, न्यूनतम ₹3,000 और अधिकतम ₹1,17,985 तक पहुँची। यानी किसी एक किसान को बहुत बड़ी राशि भी मिली, पर अधिकांश को छोटी रक़म ही मिली — यह अंतर इसलिए अहम है क्योंकि औसत आँकड़ा पूरी कहानी नहीं बताता।',
        en: 'Grow Indigo itself stated that the average payment was about ₹11,478, with a minimum of ₹3,000 and a maximum reaching ₹1,17,985. So while one farmer received a large sum, most received small amounts — this spread matters, because the average figure does not tell the whole story.',
      },
      cites: ['S-CARB-46'],
      pastExample: true,
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'पंजाब वन विभाग की कृषि-वानिकी कार्बन-क्रेडिट योजना', en: 'Punjab Forest Department agroforestry carbon-credit scheme' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'अगस्त 2024 में पंजाब वन विभाग की कृषि-वानिकी कार्बन-क्रेडिट मुआवज़ा योजना शुरू हुई, जिसके तहत राज्य के 3,686 किसानों को चार क़िस्तों में कुल ₹45 करोड़ दिए जाने की घोषणा की गई। यह योजना किसानों द्वारा खेतों पर लगाए गए पेड़ों से बने कार्बन क्रेडिट पर आधारित थी।',
        en: 'In August 2024, the Punjab Forest Department\'s agroforestry carbon-credit compensation scheme was launched, under which a total of ₹45 crore was announced for 3,686 farmers across the state, in four instalments. The scheme was based on carbon credits generated from trees planted on farmers\' fields.',
      },
      cites: ['S-CARB-03'],
      pastExample: true,
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'ग्रो इंडिगो का "रागिनी" (Ragini) प्रोजेक्ट', en: 'Grow Indigo\'s "Ragini" project' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कंपनी का दावा: ग्रो इंडिगो की "रागिनी" परियोजना को Verra के साथ पंजीकृत किया गया है, जो बिहार, मध्य प्रदेश, राजस्थान और उत्तर प्रदेश में फैली है। कंपनी के अनुसार ग्रो इंडिगो शुद्ध कार्बन-क्रेडिट आय का 60% तक हिस्सा किसानों के साथ साझा करती है। यह कंपनी का अपना कथन है और इसकी स्वतंत्र पुष्टि अलग से करनी चाहिए; यह किसी निश्चित आय की गारंटी नहीं है।',
        en: 'Company claim: Grow Indigo\'s "Ragini" project is registered with Verra and spans Bihar, Madhya Pradesh, Rajasthan and Uttar Pradesh. According to the company, Grow Indigo shares up to 60% of net carbon-credit proceeds with farmers. This is the company\'s own statement and should be verified independently; it is not a guarantee of any fixed income.',
      },
      cites: ['S-CARB-13'],
    },

    // ---------------------------------------------------------------- 5
    {
      type: 'heading', level: 2,
      text: { hi: 'भुगतान में कितना समय, अनुबंध व हिस्सेदारी', en: 'Payment timing, contracts and revenue share' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कार्बन क्रेडिट में भुगतान तुरंत नहीं होता। पहले किसान को तरीक़े अपनाने होते हैं, फिर मापन और सत्यापन होता है, क्रेडिट जारी होते हैं और अंत में बिक्री पर पैसा मिलता है — इस पूरी प्रक्रिया में अक्सर कई साल लग सकते हैं। इसी वजह से कंपनियाँ दो तरह के विकल्प देती रही हैं।',
        en: 'Payment in carbon credits is not immediate. First the farmer adopts the practices, then measurement and verification happen, credits are issued, and finally money comes on sale — this whole process can often take several years. For this reason, companies have offered two kinds of options.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सत्यापित उदाहरणों में ग्रो इंडिगो की "आदि" परियोजना में किसानों को या तो एक तय अग्रिम राशि, या शुद्ध कार्बन राजस्व का 75% हिस्सा चुनने का विकल्प दिया गया था। "रागिनी" परियोजना में कंपनी का दावा है कि वह शुद्ध कार्बन-क्रेडिट आय का 60% तक किसानों को देती है। ये दोनों आँकड़े ही क्रमशः स्रोतों में दर्ज हैं; इनसे अलग किसी "तय दर" का भरोसा न करें।',
        en: 'In verified examples, Grow Indigo\'s "Aadi" project let farmers choose either a fixed upfront amount or a 75% share of net carbon revenue. In the "Ragini" project, the company claims it gives farmers up to 60% of net carbon-credit proceeds. Both figures are recorded in the sources respectively; do not rely on any other "fixed rate".',
      },
      cites: ['S-CARB-01', 'S-CARB-13'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'अनुबंध पर हस्ताक्षर करने से पहले यह ज़रूर समझें कि भुगतान किस आधार पर, कब और कितनी बार होगा; किसका कितना हिस्सा होगा; किन तरीक़ों को कितने साल तक निभाना होगा; और बीच में छोड़ने पर क्या परिणाम होंगे। यदि कोई शर्त स्पष्ट न हो तो किसी भरोसेमंद व्यक्ति या कृषि विभाग से सलाह लें।',
        en: 'Before signing a contract, be sure to understand on what basis, when and how often payment will be made; who gets what share; which practices must be maintained for how many years; and what happens if you drop out midway. If any term is unclear, consult a trusted person or the agriculture department.',
      },
    },

    // ---------------------------------------------------------------- 6
    {
      type: 'heading', level: 2,
      text: { hi: 'भारत का ढाँचा (CCTS)', en: 'India\'s framework (CCTS)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'भारत की कार्बन क्रेडिट ट्रेडिंग योजना (CCTS) में एक ऑफ़सेट तंत्र है, जिसके तहत 8 पद्धतियाँ (methodologies) मंज़ूर की गई हैं। इन्हीं पद्धतियों के आधार पर परियोजनाएँ क्रेडिट बना सकती हैं।',
        en: 'India\'s Carbon Credit Trading Scheme (CCTS) has an offset mechanism under which 8 methodologies have been approved. Projects can generate credits based on these methodologies.',
      },
      cites: ['S-CARB-14'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'एक अहम बात यह है कि इस तंत्र के ऑफ़सेट क्रेडिट का उपयोग अनुपालन (compliance) दायित्वों को पूरा करने के लिए नहीं किया जा सकता। यानी ऑफ़सेट बाज़ार और अनिवार्य अनुपालन बाज़ार को अलग रखा गया है। CCTS ढाँचे को एक लोकसभा उत्तर में भी समझाया गया है।',
        en: 'An important point is that offset credits from this mechanism cannot be used to meet compliance obligations. That is, the offset market and the mandatory compliance market are kept separate. The CCTS framework has also been explained in a Lok Sabha reply.',
      },
      cites: ['S-CARB-07', 'S-CARB-15'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'जुलाई 2026 के एक लोकसभा उत्तर में बताया गया कि सरकार किसानों को कार्बन-क्रेडिट बाज़ार से जोड़ने के लिए 11 पायलट परियोजनाओं का समर्थन कर रही है। उसी उत्तर में यह भी कहा गया कि किसानों के लिए आय की संभावना पर "अब तक कोई आकलन नहीं किया गया है"। इसका सीधा मतलब है कि किसी भी बड़े आय-दावे को सावधानी से देखना चाहिए।',
        en: 'A Lok Sabha reply in July 2026 stated that the government is supporting 11 pilot projects to connect farmers to the carbon-credit market. The same reply also said that "no assessment has been carried out so far" on the income potential for farmers. This directly means any large income claim should be viewed cautiously.',
      },
      cites: ['S-CARB-09'],
    },

    // ---------------------------------------------------------------- 7
    {
      type: 'heading', level: 2,
      text: { hi: 'ग्रीन क्रेडिट बनाम कार्बन क्रेडिट', en: 'Green Credit vs carbon credit' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ग्रीन क्रेडिट और कार्बन क्रेडिट एक जैसे नहीं हैं। ग्रीन क्रेडिट प्रोग्राम मुख्यतः पौधारोपण (plantation) से जुड़ा है। नियमों में बदलाव के बाद पौधारोपण से बने ग्रीन क्रेडिट को "ग़ैर-व्यापारिक (non-tradable) और ग़ैर-हस्तांतरणीय (non-transferable)" बना दिया गया, और 5 साल बाद 40% कैनोपी घनत्व (canopy density) की शर्त जोड़ी गई।',
        en: 'Green Credit and carbon credit are not the same. The Green Credit Programme is mainly linked to plantation. After a rule change, plantation-based green credits were made "non-tradable and non-transferable", and a condition of 40% canopy density after 5 years was added.',
      },
      cites: ['S-CARB-33'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इसका अर्थ है कि ग्रीन क्रेडिट को कार्बन क्रेडिट की तरह बाज़ार में बेचकर नक़द कमाई का साधन नहीं समझना चाहिए। मध्य प्रदेश ग्रीन क्रेडिट प्रोग्राम के तहत पौधारोपण में अग्रणी राज्य रहा है।',
        en: 'This means Green Credit should not be seen as a way to earn cash by selling in a market like a carbon credit. Madhya Pradesh has led tree plantations under the Green Credit Programme.',
      },
      cites: ['S-CARB-34'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'आँकड़ों के अनुसार मध्य प्रदेश ने इस योजना के तहत 15,200+ हेक्टेयर भूमि पंजीकृत की है, जो किसी भी राज्य में सर्वाधिक है; 17 राज्यों में मिलाकर कुल 57,700+ हेक्टेयर पंजीकृत हुई है।',
        en: 'According to the figures, Madhya Pradesh has registered 15,200+ ha of land under this scheme — the highest of any state; across 17 states a total of 57,700+ ha has been registered.',
      },
      cites: ['S-CARB-32'],
    },

    // ---------------------------------------------------------------- 8
    {
      type: 'heading', level: 2,
      text: { hi: 'मध्य प्रदेश में आज', en: 'Madhya Pradesh today' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मध्य प्रदेश में किसानों के लिए कोई राज्य-स्तरीय कार्बन-क्रेडिट योजना अब तक सामने नहीं आई है। हालाँकि निजी परियोजनाएँ राज्य में सक्रिय हैं — जैसे ग्रो इंडिगो की "रागिनी" परियोजना, जो (कंपनी के दावे अनुसार) मध्य प्रदेश सहित चार राज्यों में फैली है।',
        en: 'No state-level carbon-credit scheme for farmers has yet emerged in Madhya Pradesh. However, private projects are active in the state — such as Grow Indigo\'s "Ragini" project, which (per the company\'s claim) spans four states including Madhya Pradesh.',
      },
      cites: ['S-CARB-13'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खेती पर लगाए गए पेड़ों को काटने और ले जाने में पारगमन अनुमति (transit permit) एक व्यावहारिक अड़चन रही है। मध्य प्रदेश उच्च न्यायालय ने विवेक कुमार शर्मा बनाम म.प्र. राज्य (1 मार्च 2025) मामले में खेत में उगाए गए वृक्ष प्रजातियों के लिए पारगमन-अनुमति छूट की अधिसूचना को रद्द कर दिया था।',
        en: 'For trees planted on farms, the transit permit has been a practical hurdle in felling and transporting them. In Vivek Kumar Sharma v. State of MP (1 March 2025), the Madhya Pradesh High Court struck down the transit-permit exemption notification for farm-grown tree species.',
      },
      cites: ['S-CARB-12'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इसके बाद जनवरी 2026 में मध्य प्रदेश ने निजी भूमि पर उगाई गई 5 प्रजातियों को पारगमन अनुमति से छूट दे दी। यह बदलाव किसानों के लिए खेत पर पेड़ लगाने और उनसे आय लेने को थोड़ा आसान बना सकता है, पर क्रियान्वयन की बारीकियाँ ज़िले स्तर पर समझना ज़रूरी है।',
        en: 'Later, in January 2026, Madhya Pradesh exempted 5 species grown on private land from transit permits. This change may make it a little easier for farmers to plant trees on their farms and earn from them, but the implementation details need to be understood at district level.',
      },
      cites: ['S-CARB-37'],
    },

    // ---------------------------------------------------------------- 9
    {
      type: 'heading', level: 2,
      text: { hi: 'सागर / बुंदेलखंड के लिए क्या उपयुक्त है', en: 'What may suit Sagar / Bundelkhand' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सागर और बुंदेलखंड जैसे अपेक्षाकृत शुष्क इलाक़ों में, जहाँ पानी की उपलब्धता सीमित रहती है, मेड़ पर पेड़ लगाना (bund trees) और मिट्टी बचाने वाले तरीक़े अक्सर सबसे व्यावहारिक पहला क़दम होते हैं। मेड़ के पेड़ न सिर्फ़ कार्बन जमा करते हैं, बल्कि छाया, चारा, लकड़ी और मिट्टी-कटाव से बचाव भी देते हैं।',
        en: 'In relatively dry regions like Sagar and Bundelkhand, where water availability is limited, planting bund trees and using soil-conserving practices are often the most practical first step. Bund trees not only store carbon but also provide shade, fodder, timber and protection from soil erosion.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मिट्टी से जुड़े तरीक़े — जैसे फ़सल अवशेष को न जलाना, कम जुताई और जैविक खाद का उपयोग — इस इलाक़े के किसानों के लिए कम लागत वाले और परिचित क़दम हैं। इन्हें अपनाने का सीधा लाभ मिट्टी की सेहत और उपज में दिखता है; कार्बन क्रेडिट उसके ऊपर एक संभावित अतिरिक्त अवसर मात्र है, मुख्य कारण नहीं।',
        en: 'Soil-based practices — such as not burning crop residue, reduced tillage and using organic manure — are low-cost and familiar steps for farmers in this region. Their direct benefit shows in soil health and yield; a carbon credit is only a possible extra opportunity on top of that, not the main reason.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसी भी निजी परियोजना में जुड़ने से पहले स्थानीय अनुभव देखें, अनुबंध की शर्तें समझें और छोटे पैमाने से शुरुआत करें। इस पृष्ठ में कोई इलाक़ा-विशेष आय का आँकड़ा नहीं दिया गया है, क्योंकि ऐसा कोई सत्यापित आँकड़ा उपलब्ध नहीं है — किसी भी बड़े आय-वादे से सावधान रहें।',
        en: 'Before joining any private project, look at local experience, understand the contract terms and start small. No area-specific income figure is given on this page, because no such verified figure is available — be wary of any large income promise.',
      },
    },

    // ---------------------------------------------------------------- 10
    {
      type: 'heading', level: 2,
      text: { hi: 'पक्ष में तर्क बनाम विपक्ष में तर्क', en: 'Arguments for vs arguments against' },
    },
    {
      type: 'table',
      caption: { hi: 'कार्बन क्रेडिट — पक्ष और विपक्ष', en: 'Carbon credit — for and against' },
      head: [
        { hi: 'पक्ष में (संभावित लाभ)', en: 'In favour (possible benefits)' },
        { hi: 'विपक्ष में (चिंताएँ)', en: 'Against (concerns)' },
      ],
      rows: [
        [
          { hi: 'मौजूदा खेती के ऊपर अतिरिक्त आय का संभावित अवसर।' },
          { hi: 'आय तय नहीं — बाज़ार भाव और ख़रीदार मिलने पर निर्भर।' },
        ],
        [
          { hi: 'मिट्टी की सेहत, पेड़ और मेड़ से दीर्घकालिक लाभ।' },
          { hi: 'भुगतान में कई साल लग सकते हैं; बीच में छोड़ना महँगा पड़ सकता है।' },
        ],
        [
          { hi: 'फ़सल अवशेष न जलाने से प्रदूषण और नुक़सान घटता है।' },
          { hi: 'अनुबंध लंबे और जटिल हो सकते हैं; शर्तें समझना कठिन।' },
        ],
        [
          { hi: 'पशुधन/गोबर से मीथेन घटाने के तरीक़े मौजूद हैं।' },
          { hi: 'बिचौलियों और भरोसे की कमी का जोखिम।' },
        ],
      ],
    },

    // ---------------------------------------------------------------- 11
    {
      type: 'heading', level: 2,
      text: { hi: 'जोखिम', en: 'Risks' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सबसे बड़ा जोखिम यह है कि वादे के अनुसार पैसा न मिले। हरियाणा और मध्य प्रदेश के 800 से अधिक किसानों पर हुए एक अध्ययन में पाया गया कि 99% से अधिक किसानों को कोई भुगतान नहीं मिला, और 28% किसानों ने दूसरे साल तक वे तरीक़े छोड़ दिए। यह आँकड़ा दिखाता है कि स्वैच्छिक कार्बन बाज़ार में भागीदारी के बावजूद लाभ पहुँचना अनिश्चित रहा है।',
        en: 'The biggest risk is not getting the promised money. A study of over 800 farmers in Haryana and Madhya Pradesh found that over 99% of farmers received no payment, and 28% stopped the practices by year 2. This figure shows that despite participating in the voluntary carbon market, benefits reaching farmers has been uncertain.',
      },
      cites: ['S-CARB-11'],
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'बिचौलिए और बिना जाँचे एजेंट बीच में आकर किसान का हिस्सा घटा सकते हैं।' } },
        { text: { hi: 'अनुबंध अक्सर लंबे और कठिन भाषा में होते हैं; शर्तें पूरी तरह समझे बिना हस्ताक्षर न करें।' } },
        { text: { hi: 'किराए/बटाई पर खेती करने वाले किसानों के लिए ज़मीन और पेड़ों के अधिकार का सवाल उलझा हो सकता है।' } },
        { text: { hi: 'परियोजना के बीच में तरीक़े छोड़ने पर जुर्माना या वापसी की शर्त हो सकती है।' } },
      ],
    },

    // ---------------------------------------------------------------- 12
    {
      type: 'heading', level: 2,
      text: { hi: 'मध्य प्रदेश किन नीतियों पर विचार कर सकता है', en: 'Policy options Madhya Pradesh could consider' },
    },
    {
      type: 'list',
      ordered: true,
      items: [
        { text: { hi: 'चुनिंदा ज़िलों में छोटे, मापे-जा-सकने वाले पायलट चलाना, ताकि असल लाभ और जोखिम पहले समझे जा सकें।' } },
        { text: { hi: 'किसान उत्पादक संगठनों (FPO) के ज़रिए किसानों को एकत्र करना, ताकि छोटे किसानों को भी सौदेबाज़ी की ताक़त मिले।' } },
        { text: { hi: 'एक मानक किसान अनुबंध तैयार करना, जिसमें भुगतान, हिस्सेदारी और अवधि सरल भाषा में स्पष्ट हों।' } },
        { text: { hi: 'एक सार्वजनिक रजिस्ट्री बनाना, जिसमें परियोजनाएँ, कंपनियाँ और भुगतान पारदर्शी रूप से दर्ज हों।' } },
        { text: { hi: 'पारगमन-अनुमति की व्यवस्था को स्पष्ट और सरल करना, ताकि खेत के पेड़ों से किसान वास्तव में लाभ ले सके।' } },
      ],
    },

    // ---------------------------------------------------------------- 13
    {
      type: 'checklist',
      title: { hi: 'हस्ताक्षर से पहले — किसान चेतावनी सूची', en: 'Before you sign — farmer warning checklist' },
      items: [
        { text: { hi: 'किसी भी अग्रिम "फ़ीस", "पंजीकरण शुल्क" या नक़द देने से मना करें — भरोसेमंद परियोजना किसान से पैसे नहीं माँगती।' } },
        { text: { hi: 'अनुबंध की पूरी प्रति अपनी भाषा में माँगें और किसी भरोसेमंद व्यक्ति से पढ़वाएँ।' } },
        { text: { hi: 'भुगतान कब, कैसे और किसके खाते में आएगा — यह लिखित रूप में स्पष्ट करें।' } },
        { text: { hi: 'अपने हिस्से की दर और "शुद्ध" का मतलब स्पष्ट रूप से समझें।' } },
        { text: { hi: 'अनुबंध की अवधि और बीच में छोड़ने के परिणाम ज़रूर पूछें।' } },
        { text: { hi: 'किसी भी बड़े या "गारंटीड" आय-वादे पर शक करें।' } },
        { text: { hi: 'किराए/बटाई की ज़मीन पर मालिक की सहमति और अधिकार पहले सुनिश्चित करें।' } },
      ],
    },

    // ---------------------------------------------------------------- 14
    {
      type: 'heading', level: 2,
      text: { hi: 'शब्दावली', en: 'Glossary' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'कार्बन क्रेडिट: रोकी या संचित की गई ग्रीनहाउस गैस की एक मापी हुई इकाई का प्रमाणपत्र।' } },
        { text: { hi: 'सीक्वेस्ट्रेशन (sequestration): हवा से कार्बन को मिट्टी या पेड़ों में जमा करना।' } },
        { text: { hi: 'स्वैच्छिक बाज़ार: जहाँ कंपनियाँ अपनी मर्ज़ी से क्रेडिट ख़रीदती हैं।' } },
        { text: { hi: 'अनुपालन बाज़ार: जहाँ क़ानून के तहत उद्योगों को उत्सर्जन घटाना या क्रेडिट लेना पड़ता है।' } },
        { text: { hi: 'ऑफ़सेट: अपने उत्सर्जन की भरपाई के लिए कहीं और हुई कटौती को गिनना।' } },
        { text: { hi: 'कृषि-वानिकी (agroforestry): खेती के साथ-साथ पेड़ उगाने की पद्धति।' } },
        { text: { hi: 'पारगमन अनुमति (transit permit): पेड़/लकड़ी को काटकर ले जाने की सरकारी इजाज़त।' } },
      ],
    },

    // ---------------------------------------------------------------- 15 (quotable stats)
    {
      type: 'heading', level: 2,
      text: { hi: 'याद रखने लायक़ पाँच आँकड़े', en: 'Five figures worth remembering' },
    },
    {
      type: 'fact',
      text: {
        hi: 'भारत के पहले मृदा-कार्बन भुगतान में पंजाब व हरियाणा के 2,550 किसानों को कुल ₹2.9 करोड़ दिए गए।',
        en: 'In India\'s first soil-carbon payments, 2,550 farmers in Punjab and Haryana were paid a total of ₹2.9 crore.',
      },
      cites: ['S-CARB-01'],
      pastExample: true,
    },
    {
      type: 'fact',
      text: {
        hi: 'पंजाब की कृषि-वानिकी कार्बन-क्रेडिट योजना में 3,686 किसानों को चार क़िस्तों में ₹45 करोड़ देने की घोषणा हुई।',
        en: 'Punjab\'s agroforestry carbon-credit scheme announced ₹45 crore for 3,686 farmers in four instalments.',
      },
      cites: ['S-CARB-03'],
      pastExample: true,
    },
    {
      type: 'fact',
      text: {
        hi: 'हरियाणा व मध्य प्रदेश के 800+ किसानों के अध्ययन में 99% से अधिक को कोई भुगतान नहीं मिला।',
        en: 'In a study of 800+ farmers in Haryana and Madhya Pradesh, over 99% received no payment.',
      },
      cites: ['S-CARB-11'],
      pastExample: true,
    },
    {
      type: 'fact',
      text: {
        hi: 'जुलाई 2026 के लोकसभा उत्तर में कहा गया कि किसानों की आय-संभावना पर "अब तक कोई आकलन नहीं किया गया"।',
        en: 'A July 2026 Lok Sabha reply said that "no assessment has been carried out so far" on farmers\' income potential.',
      },
      cites: ['S-CARB-09'],
    },
    {
      type: 'fact',
      text: {
        hi: 'पौधारोपण से बने ग्रीन क्रेडिट को "ग़ैर-व्यापारिक और ग़ैर-हस्तांतरणीय" बनाया गया, 5 साल बाद 40% कैनोपी घनत्व की शर्त के साथ।',
        en: 'Plantation-based green credits were made "non-tradable and non-transferable", with a 40% canopy-density condition after 5 years.',
      },
      cites: ['S-CARB-33'],
    },

    // ---------------------------------------------------------------- 16 FAQ
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'कार्बन क्रेडिट क्या है?', en: 'What is a carbon credit?' },
          a: { hi: 'यह एक प्रमाणपत्र है जो दर्शाता है कि ग्रीनहाउस गैस की एक मापी हुई मात्रा रोकी गई या मिट्टी/पेड़ों में जमा की गई। इसे बाज़ार में बेचा जा सकता है।', en: 'It is a certificate showing a measured amount of greenhouse gas was avoided or stored in soil/trees. It can be sold in a market.' },
        },
        {
          q: { hi: 'क्या यह सरकारी सब्सिडी है?', en: 'Is it a government subsidy?' },
          a: { hi: 'नहीं। यह सब्सिडी नहीं है। इसकी क़ीमत बाज़ार पर निर्भर करती है और पैसा तभी मिलता है जब क्रेडिट प्रमाणित हो और ख़रीदार मिले।', en: 'No. It is not a subsidy. Its price depends on the market and money comes only when credits are certified and a buyer is found.' },
        },
        {
          q: { hi: 'किसान कैसे कमा सकते हैं?', en: 'How can farmers earn?' },
          a: { hi: 'मुख्यतः तीन तरह से — मिट्टी बचाने वाले तरीक़े, मेड़/खेत पर पेड़ लगाना, और पशुधन/गोबर से मीथेन घटाना।', en: 'Mainly in three ways — soil-conserving practices, planting trees on bunds/farms, and reducing methane from livestock/manure.' },
        },
        {
          q: { hi: 'भारत में अब तक सबसे बड़ा उदाहरण क्या है?', en: 'What is the biggest example in India so far?' },
          a: { hi: 'भारत के पहले मृदा-कार्बन भुगतान में पंजाब व हरियाणा के 2,550 किसानों को ₹2.9 करोड़ दिए गए।', en: 'In India\'s first soil-carbon payments, 2,550 farmers in Punjab and Haryana were paid ₹2.9 crore.' },
          cites: ['S-CARB-01'],
        },
        {
          q: { hi: 'एक किसान को औसतन कितना मिला?', en: 'How much did a farmer get on average?' },
          a: { hi: 'उस उदाहरण में औसत लगभग ₹11,478 रहा, न्यूनतम ₹3,000 और अधिकतम ₹1,17,985 तक। औसत पूरी कहानी नहीं बताता — अधिकांश को छोटी रक़म मिली।', en: 'In that example the average was about ₹11,478, with a minimum of ₹3,000 and a maximum of ₹1,17,985. The average does not tell the whole story — most got small amounts.' },
          cites: ['S-CARB-46'],
        },
        {
          q: { hi: 'पंजाब वन विभाग की योजना में कितना दिया गया?', en: 'How much did the Punjab Forest Department scheme give?' },
          a: { hi: 'अगस्त 2024 में 3,686 किसानों को चार क़िस्तों में ₹45 करोड़ देने की घोषणा हुई।', en: 'In August 2024, ₹45 crore was announced for 3,686 farmers in four instalments.' },
          cites: ['S-CARB-03'],
        },
        {
          q: { hi: 'भुगतान मिलने में कितना समय लगता है?', en: 'How long does payment take?' },
          a: { hi: 'तरीक़े अपनाने, मापन, सत्यापन, क्रेडिट जारी होने और बिक्री तक — इसमें अक्सर कई साल लग सकते हैं। भुगतान तुरंत नहीं होता।', en: 'From adopting practices to measurement, verification, issuance and sale — it can often take several years. Payment is not immediate.' },
        },
        {
          q: { hi: 'मेरा हिस्सा कितना होगा?', en: 'What will my share be?' },
          a: { hi: '"आदि" उदाहरण में शुद्ध राजस्व का 75% विकल्प था; "रागिनी" में कंपनी का दावा है कि वह 60% तक देती है। कोई एक "तय दर" नहीं है — अनुबंध पढ़ें।', en: 'In the "Aadi" example there was a 75% of net revenue option; in "Ragini" the company claims it gives up to 60%. There is no single "fixed rate" — read the contract.' },
          cites: ['S-CARB-01', 'S-CARB-13'],
        },
        {
          q: { hi: 'सबसे बड़ा जोखिम क्या है?', en: 'What is the biggest risk?' },
          a: { hi: 'वादे के अनुसार पैसा न मिलना। एक अध्ययन में हरियाणा व म.प्र. के 99% से अधिक किसानों को कोई भुगतान नहीं मिला, और 28% ने दूसरे साल तरीक़े छोड़ दिए।', en: 'Not getting the promised money. In one study, over 99% of farmers in Haryana and MP received no payment, and 28% stopped the practices by year 2.' },
          cites: ['S-CARB-11'],
        },
        {
          q: { hi: 'क्या सरकार ने किसानों की आय का आकलन किया है?', en: 'Has the government assessed farmers\' income?' },
          a: { hi: 'जुलाई 2026 के लोकसभा उत्तर के अनुसार किसानों की आय-संभावना पर "अब तक कोई आकलन नहीं किया गया" है; 11 पायलट चल रहे हैं।', en: 'Per a July 2026 Lok Sabha reply, "no assessment has been carried out so far" on farmers\' income potential; 11 pilots are running.' },
          cites: ['S-CARB-09'],
        },
        {
          q: { hi: 'CCTS क्या है?', en: 'What is CCTS?' },
          a: { hi: 'यह भारत की कार्बन क्रेडिट ट्रेडिंग योजना है, जिसके ऑफ़सेट तंत्र में 8 पद्धतियाँ मंज़ूर हैं।', en: 'It is India\'s Carbon Credit Trading Scheme, with 8 methodologies approved under its offset mechanism.' },
          cites: ['S-CARB-14'],
        },
        {
          q: { hi: 'क्या ऑफ़सेट क्रेडिट अनुपालन में काम आते हैं?', en: 'Can offset credits be used for compliance?' },
          a: { hi: 'नहीं। CCTS के ऑफ़सेट क्रेडिट का उपयोग अनुपालन दायित्वों को पूरा करने के लिए नहीं किया जा सकता।', en: 'No. CCTS offset credits cannot be used to meet compliance obligations.' },
          cites: ['S-CARB-07'],
        },
        {
          q: { hi: 'ग्रीन क्रेडिट और कार्बन क्रेडिट में क्या फ़र्क़ है?', en: 'What is the difference between Green Credit and carbon credit?' },
          a: { hi: 'ग्रीन क्रेडिट पौधारोपण से जुड़ा है और अब "ग़ैर-व्यापारिक व ग़ैर-हस्तांतरणीय" है, 5 साल बाद 40% कैनोपी घनत्व की शर्त के साथ। इसे बेचकर नक़द कमाई का साधन न समझें।', en: 'Green Credit is linked to plantation and is now "non-tradable and non-transferable", with a 40% canopy-density condition after 5 years. Do not treat it as a way to earn cash by selling.' },
          cites: ['S-CARB-33'],
        },
        {
          q: { hi: 'क्या मध्य प्रदेश में किसानों के लिए कोई राज्य योजना है?', en: 'Is there a state scheme for farmers in MP?' },
          a: { hi: 'अब तक कोई राज्य-स्तरीय किसान कार्बन-क्रेडिट योजना सामने नहीं आई। निजी परियोजनाएँ (जैसे रागिनी) सक्रिय हैं।', en: 'No state-level farmer carbon-credit scheme has emerged yet. Private projects (such as Ragini) are active.' },
          cites: ['S-CARB-13'],
        },
        {
          q: { hi: 'पारगमन अनुमति का मामला क्या है?', en: 'What is the transit permit issue?' },
          a: { hi: 'म.प्र. उच्च न्यायालय ने 1 मार्च 2025 को छूट अधिसूचना रद्द की थी; बाद में जनवरी 2026 में राज्य ने निजी भूमि की 5 प्रजातियों को छूट दी।', en: 'The MP High Court struck down the exemption notification on 1 March 2025; later, in January 2026, the state exempted 5 species on private land.' },
          cites: ['S-CARB-12', 'S-CARB-37'],
        },
        {
          q: { hi: 'मध्य प्रदेश ग्रीन क्रेडिट में कहाँ खड़ा है?', en: 'Where does MP stand in Green Credit?' },
          a: { hi: 'मध्य प्रदेश ने 15,200+ हेक्टेयर पंजीकृत की है — किसी भी राज्य में सर्वाधिक; 17 राज्यों में कुल 57,700+ हेक्टेयर।', en: 'Madhya Pradesh has registered 15,200+ ha — the highest of any state; across 17 states a total of 57,700+ ha.' },
          cites: ['S-CARB-32'],
        },
        {
          q: { hi: 'बुंदेलखंड में क्या करना सबसे व्यावहारिक है?', en: 'What is most practical in Bundelkhand?' },
          a: { hi: 'मेड़ पर पेड़ और मिट्टी बचाने वाले तरीक़े अक्सर सबसे व्यावहारिक पहला क़दम हैं — इनका सीधा लाभ मिट्टी व उपज में दिखता है।', en: 'Bund trees and soil-conserving practices are often the most practical first step — their direct benefit shows in soil and yield.' },
        },
        {
          q: { hi: 'अनुबंध पर हस्ताक्षर से पहले क्या देखूँ?', en: 'What to check before signing a contract?' },
          a: { hi: 'भुगतान का आधार व समय, अपना हिस्सा, अवधि, और बीच में छोड़ने के परिणाम। किसी भी अग्रिम फ़ीस या गारंटीड आय-वादे से सावधान रहें।', en: 'The basis and timing of payment, your share, the duration, and the consequences of dropping out. Be wary of any upfront fee or guaranteed-income promise.' },
        },
        {
          q: { hi: 'पशुधन/गोबर से भी कार्बन क्रेडिट बन सकता है?', en: 'Can carbon credits come from livestock/manure too?' },
          a: { hi: 'हाँ। BEE की पद्धति BM AG04.001 घरों और छोटे खेतों पर पशुधन/गोबर से मीथेन रिकवरी से जुड़ी है।', en: 'Yes. BEE\'s methodology BM AG04.001 relates to methane recovery from livestock/manure at households and small farms.' },
          cites: ['S-CARB-06'],
        },
        {
          q: { hi: 'क्या कार्बन क्रेडिट से तय आमदनी की गारंटी है?', en: 'Does a carbon credit guarantee fixed income?' },
          a: { hi: 'नहीं, गारंटी नहीं। आय बाज़ार, ख़रीदार और अनुबंध पर निर्भर है। एक अध्ययन में 99% से अधिक किसानों को कोई भुगतान नहीं मिला था।', en: 'No, no guarantee. Income depends on the market, buyers and the contract. In one study, over 99% of farmers received no payment.' },
          cites: ['S-CARB-11'],
        },
        {
          q: { hi: 'किराए/बटाई पर खेती करने वालों के लिए क्या सावधानी है?', en: 'What caution for tenant/batai farmers?' },
          a: { hi: 'ज़मीन और पेड़ों के अधिकार का सवाल उलझा हो सकता है। अनुबंध से पहले ज़मीन मालिक की लिखित सहमति और अधिकार स्पष्ट कर लें।', en: 'The question of rights over land and trees can be tangled. Before any contract, settle the landowner\'s written consent and the rights clearly.' },
        },
      ],
    },
  ],
}

export default carbonCreditPage
