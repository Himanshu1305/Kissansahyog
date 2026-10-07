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
        hi: 'कार्बन क्रेडिट क्या है, किसान इससे कैसे जुड़ते हैं, भारत में अब तक असल में क्या हुआ, जोखिम क्या हैं, और सागर व बुंदेलखंड के लिए इसमें क्या काम कर सकता है — यह पेज सरल भाषा में बताता है। हर आँकड़े के साथ उसका स्रोत जुड़ा है, ताकि आप खुद परख सकें। आय की कोई गारंटी यहाँ नहीं दी गई है।',
        en: 'This page explains, in plain language, what a carbon credit is, how farmers connect to it, what has actually happened in India so far, the risks, and what could work for Sagar and Bundelkhand. Every figure carries its source so you can check it yourself. No income guarantee is made here.',
      },
      cites: ['S-CARB-01', 'S-CARB-11'],
    },

    // ---------------------------------------------------------------- 1
    {
      type: 'heading', level: 2,
      text: { hi: 'कार्बन क्रेडिट क्या है?', en: 'What is a carbon credit?' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कार्बन क्रेडिट एक प्रमाणपत्र है। यह दिखाता है कि हवा में जाने वाली एक तय मात्रा की गैस रोकी गई, या वह कार्बन मिट्टी और पेड़ों में जमा हुआ। जब खेती का कोई तरीक़ा कम गैस छोड़े या ज़्यादा कार्बन जमा करे, तो उस बचत को नापकर क्रेडिट बनता है। इस क्रेडिट को कंपनियाँ अपने उत्सर्जन की भरपाई के लिए ख़रीदती हैं। मान लीजिए सागर का कोई किसान अपनी खेत की मेड़ पर पेड़ लगाता है — वे पेड़ कार्बन सोखते हैं, और वही बचत आगे चलकर क्रेडिट बन सकती है। पर यह सब्सिडी नहीं है; पैसा तभी मिलता है जब क्रेडिट प्रमाणित हो और कोई ख़रीदार मिले।',
        en: 'A carbon credit is a certificate. It shows that a set amount of gas was kept out of the air, or that carbon was stored in soil and trees. When a farming practice releases less gas or stores more carbon, that saving is measured and turned into a credit. Companies buy these credits to offset their own emissions. Say a Sagar farmer plants trees on the field bund — those trees absorb carbon, and that saving can later become a credit. But this is not a subsidy; money comes only when the credit is certified and a buyer is found.',
      },
    },

    // ---------------------------------------------------------------- 2
    {
      type: 'heading', level: 2,
      text: { hi: 'भारत में अब तक क्या हुआ है', en: 'What has happened in India so far' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे दिए उदाहरण बीते समय की असल घटनाएँ हैं, जो सरकारी और समाचार स्रोतों से ली गई हैं। ये यह नहीं बताते कि आपको भी उतना ही मिलेगा — हर परियोजना, इलाक़ा, फ़सल और अनुबंध अलग होता है।',
        en: 'The examples below are real past events, drawn from official and news sources. They do not mean you will get the same amount — every project, area, crop and contract is different.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'ग्रो इंडिगो का "आदि" प्रोजेक्ट — पंजाब और हरियाणा', en: 'Grow Indigo\'s "Aadi" project — Punjab and Haryana' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'भारत के पहले मृदा-कार्बन भुगतान में ग्रो इंडिगो के "आदि" प्रोजेक्ट ने पंजाब और हरियाणा के 2,550 किसानों को कुल ₹2.9 करोड़ दिए — यानी किसी को ₹3,000 तो किसी को ₹15,000 तक। यह 2019 से 2022 के बीच सीधी धान बुवाई, कम जुताई और फ़सल अवशेष प्रबंधन अपनाने पर मिला। किसान दो में से एक विकल्प चुन सकते थे — एक तय अग्रिम रक़म, या शुद्ध कार्बन आय का 75% हिस्सा।',
        en: 'In India\'s first soil-carbon payments, Grow Indigo\'s "Aadi" project paid a total of ₹2.9 crore to 2,550 farmers in Punjab and Haryana — roughly ₹3,000 for some, up to ₹15,000 for others. It was paid between 2019 and 2022 for adopting direct-seeded rice, reduced tillage and crop-residue management. Farmers could pick one of two options — a fixed upfront amount, or a 75% share of net carbon revenue.',
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
        hi: 'यह सिर्फ़ औसत गणित है — असल में हर किसान को अलग रक़म मिली। इससे यह तय नहीं होता कि आपको कितना मिलेगा।',
        en: 'This is just average arithmetic — actual payments differed farmer to farmer. It does not decide what you would get.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ग्रो इंडिगो ने खुद बताया कि औसत भुगतान लगभग ₹11,478 रहा, सबसे कम ₹3,000 और सबसे ज़्यादा ₹1,17,985 तक। यानी किसी एक किसान को बड़ी रक़म भी मिली, पर ज़्यादातर को छोटी रक़म ही मिली। यही बात अहम है — औसत आँकड़ा पूरी कहानी नहीं बताता।',
        en: 'Grow Indigo itself said the average payment was about ₹11,478, with a minimum of ₹3,000 and a maximum reaching ₹1,17,985. So one farmer got a large sum, but most got small amounts. That is the point — the average figure does not tell the whole story.',
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
        hi: 'अगस्त 2024 में पंजाब वन विभाग की कृषि-वानिकी कार्बन-क्रेडिट योजना शुरू हुई। इसके तहत राज्य के 3,686 किसानों को चार क़िस्तों में कुल ₹45 करोड़ देने की घोषणा हुई। यह किसानों के खेतों पर लगे पेड़ों से बने कार्बन क्रेडिट पर आधारित थी।',
        en: 'In August 2024 the Punjab Forest Department\'s agroforestry carbon-credit scheme began. It announced a total of ₹45 crore for 3,686 farmers across the state, in four instalments. It was based on carbon credits from trees planted on farmers\' fields.',
      },
      cites: ['S-CARB-03'],
      pastExample: true,
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'ग्रो इंडिगो का "रागिनी" प्रोजेक्ट — कंपनी का दावा', en: 'Grow Indigo\'s "Ragini" project — company claim' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कंपनी का दावा: ग्रो इंडिगो की "रागिनी" परियोजना Verra के साथ पंजीकृत है और बिहार, मध्य प्रदेश, राजस्थान व उत्तर प्रदेश में फैली है। कंपनी के अनुसार वह शुद्ध कार्बन आय का 60% तक हिस्सा किसानों को देती है। यह कंपनी का अपना कथन है, इसकी अलग से पुष्टि कर लें; यह किसी तय आय की गारंटी नहीं है।',
        en: 'Company claim: Grow Indigo\'s "Ragini" project is registered with Verra and spans Bihar, Madhya Pradesh, Rajasthan and Uttar Pradesh. The company says it shares up to 60% of net carbon proceeds with farmers. This is the company\'s own statement; verify it separately. It is not a guarantee of any fixed income.',
      },
      cites: ['S-CARB-13'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'सरकार और भारत का ढाँचा', en: 'The government and India\'s framework' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खेती को भारत की कार्बन क्रेडिट ट्रेडिंग योजना (CCTS) के ऑफ़सेट तंत्र में जोड़ा गया है, जिसमें 8 पद्धतियाँ मंज़ूर हुई हैं। एक अहम बात — इन ऑफ़सेट क्रेडिट का उपयोग अनिवार्य अनुपालन दायित्व पूरा करने में नहीं हो सकता। दोनों बाज़ार अलग रखे गए हैं। यह ढाँचा एक लोकसभा उत्तर में भी समझाया गया है।',
        en: 'Agriculture has been added to the offset mechanism of India\'s Carbon Credit Trading Scheme (CCTS), under which 8 methodologies are approved. One key point — these offset credits cannot be used to meet mandatory compliance obligations. The two markets are kept separate. This framework has also been explained in a Lok Sabha reply.',
      },
      cites: ['S-CARB-05', 'S-CARB-14', 'S-CARB-07', 'S-CARB-15'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'जुलाई 2026 के एक लोकसभा उत्तर में बताया गया कि सरकार किसानों को कार्बन बाज़ार से जोड़ने के लिए 11 पायलट परियोजनाओं का समर्थन कर रही है। उसी उत्तर में यह भी कहा गया कि किसानों की आय की संभावना पर "अब तक कोई आकलन नहीं किया गया"। इसका सीधा मतलब — किसी भी बड़े आय-दावे को सावधानी से देखें।',
        en: 'A July 2026 Lok Sabha reply said the government is supporting 11 pilot projects to connect farmers to the carbon market. The same reply also said that "no assessment has been carried out so far" on farmers\' income potential. The plain meaning — treat any big income claim with caution.',
      },
      cites: ['S-CARB-09'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ग्रीन क्रेडिट और कार्बन क्रेडिट एक जैसे नहीं हैं। ग्रीन क्रेडिट मुख्यतः पौधारोपण से जुड़ा है। नियम बदलने के बाद पौधारोपण से बने ग्रीन क्रेडिट को "ग़ैर-व्यापारिक और ग़ैर-हस्तांतरणीय" बना दिया गया, और 5 साल बाद 40% कैनोपी घनत्व की शर्त जुड़ी। यानी इसे बाज़ार में बेचकर नक़द कमाई का साधन न समझें।',
        en: 'Green Credit and carbon credit are not the same. Green Credit is mainly about plantation. After a rule change, plantation-based green credits were made "non-tradable and non-transferable", and a condition of 40% canopy density after 5 years was added. So do not treat it as a way to earn cash by selling in a market.',
      },
      cites: ['S-CARB-33'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मध्य प्रदेश ग्रीन क्रेडिट प्रोग्राम के तहत पौधारोपण में अग्रणी रहा है। आँकड़ों के अनुसार राज्य ने 15,200+ हेक्टेयर ज़मीन पंजीकृत की है — किसी भी राज्य से ज़्यादा; 17 राज्यों में मिलाकर कुल 57,700+ हेक्टेयर पंजीकृत हुई है।',
        en: 'Madhya Pradesh has led plantations under the Green Credit Programme. According to the figures, the state has registered 15,200+ ha of land — more than any other state; across 17 states a total of 57,700+ ha has been registered.',
      },
      cites: ['S-CARB-34', 'S-CARB-32'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खेत के पेड़ काटकर ले जाने में पारगमन अनुमति एक असली अड़चन रही है। मध्य प्रदेश उच्च न्यायालय ने विवेक कुमार शर्मा बनाम म.प्र. राज्य (1 मार्च 2025) में खेत में उगाई प्रजातियों के लिए पारगमन-अनुमति छूट की अधिसूचना रद्द कर दी थी। बाद में जनवरी 2026 में राज्य ने निजी भूमि की 5 प्रजातियों को इस अनुमति से छूट दी। इससे खेत के पेड़ों से आय लेना थोड़ा आसान हो सकता है, पर ज़िले स्तर की बारीकियाँ पहले समझें।',
        en: 'For farm trees, the transit permit to fell and move them has been a real hurdle. In Vivek Kumar Sharma v. State of MP (1 March 2025), the Madhya Pradesh High Court struck down the transit-permit exemption notification for farm-grown species. Later, in January 2026, the state exempted 5 species on private land from this permit. This may make earning from farm trees a little easier, but understand the district-level details first.',
      },
      cites: ['S-CARB-12', 'S-CARB-37'],
    },

    // ---------------------------------------------------------------- 3
    {
      type: 'heading', level: 2,
      text: { hi: 'सागर / बुंदेलखंड में क्या काम कर सकता है', en: 'What could work in Sagar / Bundelkhand' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सागर और बुंदेलखंड सूखे इलाक़े हैं, जहाँ पानी सीमित है। यहाँ मेड़ पर पेड़ लगाना और मिट्टी बचाने वाले तरीक़े अक्सर सबसे व्यावहारिक पहला क़दम हैं। मेड़ के पेड़ कार्बन तो जमा करते ही हैं, साथ में छाया, चारा, लकड़ी और मिट्टी-कटाव से बचाव भी देते हैं। किसान तीन तरह से कार्बन परियोजनाओं से जुड़ सकते हैं — मिट्टी बचाने वाले तरीक़े, पेड़ लगाना, और पशुधन व गोबर से मीथेन घटाना।',
        en: 'Sagar and Bundelkhand are dry regions with limited water. Here, planting bund trees and using soil-saving practices are often the most practical first step. Bund trees store carbon and also give shade, fodder, timber and protection from soil erosion. Farmers can join carbon projects in three ways — soil-saving practices, planting trees, and cutting methane from livestock and manure.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मिट्टी वाले तरीक़े — फ़सल अवशेष न जलाना, कम जुताई, जैविक खाद — यहाँ के किसानों के लिए कम लागत और जाने-पहचाने क़दम हैं। इनका सीधा फ़ायदा मिट्टी की सेहत और उपज में दिखता है। कार्बन क्रेडिट उसके ऊपर एक संभावित अतिरिक्त अवसर भर है, मुख्य वजह नहीं। पशुपालक किसानों के लिए भी रास्ता है — BEE ने घरों और छोटे खेतों पर गोबर से मीथेन रिकवरी के लिए BM AG04.001 पद्धति मंज़ूर की है।',
        en: 'Soil practices — not burning crop residue, reduced tillage, organic manure — are low-cost and familiar steps here. Their direct benefit shows in soil health and yield. A carbon credit is only a possible extra opportunity on top of that, not the main reason. There is a path for livestock farmers too — BEE has approved the BM AG04.001 methodology for methane recovery from dung at homes and small farms.',
      },
      cites: ['S-CARB-06'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसी भी निजी परियोजना से जुड़ने से पहले स्थानीय अनुभव देखें, अनुबंध की शर्तें समझें और छोटे पैमाने से शुरू करें। इस पेज पर कोई इलाक़ा-विशेष आय का आँकड़ा नहीं है, क्योंकि ऐसा कोई सत्यापित आँकड़ा मौजूद नहीं है। किसी भी बड़े आय-वादे से सावधान रहें।',
        en: 'Before joining any private project, look at local experience, understand the contract terms and start small. There is no area-specific income figure on this page, because no such verified figure exists. Be wary of any big income promise.',
      },
    },

    // ---------------------------------------------------------------- 4
    {
      type: 'heading', level: 2,
      text: { hi: 'पक्ष और विपक्ष', en: 'For and against' },
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
          { hi: 'मिट्टी की सेहत, पेड़ और मेड़ से लंबे समय का फ़ायदा।' },
          { hi: 'भुगतान में कई साल लग सकते हैं; बीच में छोड़ना महँगा पड़ सकता है।' },
        ],
        [
          { hi: 'फ़सल अवशेष न जलाने से प्रदूषण और नुक़सान घटता है।' },
          { hi: 'अनुबंध लंबे और उलझे हो सकते हैं; शर्तें समझना कठिन।' },
        ],
        [
          { hi: 'पशुधन और गोबर से मीथेन घटाने के तरीक़े मौजूद हैं।' },
          { hi: 'बिचौलियों और भरोसे की कमी का जोखिम।' },
        ],
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      type: 'heading', level: 2,
      text: { hi: 'हस्ताक्षर से पहले जोखिम और चेतावनी', en: 'Risks and red flags before you sign' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सबसे बड़ा जोखिम यही है कि वादे के मुताबिक़ पैसा न मिले। हरियाणा और मध्य प्रदेश के 800 से ज़्यादा किसानों पर हुए एक अध्ययन में पाया गया कि 99% से ज़्यादा किसानों को कोई भुगतान नहीं मिला, और 28% किसानों ने दूसरे साल तक वे तरीक़े छोड़ दिए। यानी स्वैच्छिक बाज़ार में जुड़ने के बाद भी लाभ पहुँचना अनिश्चित रहा है।',
        en: 'The biggest risk is simply not getting the promised money. A study of over 800 farmers in Haryana and Madhya Pradesh found that over 99% of farmers got no payment, and 28% dropped the practices by year 2. So even after joining the voluntary market, benefits reaching farmers has been uncertain.',
      },
      cites: ['S-CARB-11'],
    },
    {
      type: 'checklist',
      title: { hi: 'हस्ताक्षर से पहले — किसान चेतावनी सूची', en: 'Before you sign — farmer warning checklist' },
      items: [
        { text: { hi: 'कोई अग्रिम "फ़ीस", "पंजीकरण शुल्क" या नक़द माँगे तो मना करें — भरोसेमंद परियोजना किसान से पैसे नहीं माँगती।' } },
        { text: { hi: 'अनुबंध की पूरी कॉपी अपनी भाषा में माँगें और किसी भरोसेमंद व्यक्ति से पढ़वाएँ।' } },
        { text: { hi: 'भुगतान कब, कैसे और किसके खाते में आएगा — यह लिखित में साफ़ करें।' } },
        { text: { hi: 'अपने हिस्से की दर और "शुद्ध" का मतलब साफ़-साफ़ समझें।' } },
        { text: { hi: 'अनुबंध कितने साल का है और बीच में छोड़ने पर क्या होगा — ज़रूर पूछें।' } },
        { text: { hi: 'किसी भी बड़े या "गारंटीड" आय-वादे पर शक करें।' } },
        { text: { hi: 'किराए या बटाई की ज़मीन पर मालिक की सहमति और हक़ पहले पक्का करें।' } },
        { text: { hi: 'बिचौलिए या बिना जाँचे एजेंट बीच में आकर आपका हिस्सा घटा सकते हैं — सावधान रहें।' } },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      type: 'heading', level: 2,
      text: { hi: 'मध्य प्रदेश क्या कर सकता है', en: 'What Madhya Pradesh could do' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मध्य प्रदेश में किसानों के लिए कोई राज्य-स्तरीय कार्बन योजना अब तक सामने नहीं आई। निजी परियोजनाएँ ज़रूर सक्रिय हैं, जैसे रागिनी (कंपनी के दावे अनुसार)। इस हालात में राज्य कुछ सधे क़दम उठा सकता है।',
        en: 'No state-level carbon scheme for farmers has emerged in Madhya Pradesh yet. Private projects are active, such as Ragini (per the company\'s claim). In this situation, the state could take a few careful steps.',
      },
      cites: ['S-CARB-13'],
    },
    {
      type: 'list',
      ordered: true,
      items: [
        { text: { hi: 'चुनिंदा ज़िलों में छोटे, मापे-जा-सकने वाले पायलट चलाना, ताकि असल लाभ और जोखिम पहले समझ आ जाएँ।' } },
        { text: { hi: 'किसान उत्पादक संगठनों (FPO) के ज़रिए किसानों को जोड़ना, ताकि छोटे किसानों को भी मोलभाव की ताक़त मिले।' } },
        { text: { hi: 'एक मानक किसान अनुबंध बनाना, जिसमें भुगतान, हिस्सेदारी और अवधि सरल भाषा में साफ़ हों।' } },
        { text: { hi: 'एक सार्वजनिक रजिस्ट्री बनाना, जिसमें परियोजनाएँ, कंपनियाँ और भुगतान खुले तौर पर दर्ज हों।' } },
        { text: { hi: 'पारगमन-अनुमति की व्यवस्था साफ़ और सरल करना, ताकि खेत के पेड़ों से किसान सचमुच लाभ ले सके।' } },
      ],
    },

    // ---------------------------------------------------------------- 8 FAQ
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'कार्बन क्रेडिट क्या है?', en: 'What is a carbon credit?' },
          a: { hi: 'यह एक प्रमाणपत्र है जो दिखाता है कि ग्रीनहाउस गैस की एक मापी हुई मात्रा रोकी गई या मिट्टी/पेड़ों में जमा हुई। इसे बाज़ार में बेचा जा सकता है।', en: 'It is a certificate showing a measured amount of greenhouse gas was avoided or stored in soil/trees. It can be sold in a market.' },
        },
        {
          q: { hi: 'क्या यह सरकारी सब्सिडी है?', en: 'Is it a government subsidy?' },
          a: { hi: 'नहीं। यह सब्सिडी नहीं है। क़ीमत बाज़ार पर निर्भर है और पैसा तभी मिलता है जब क्रेडिट प्रमाणित हो और ख़रीदार मिले।', en: 'No. It is not a subsidy. The price depends on the market and money comes only when credits are certified and a buyer is found.' },
        },
        {
          q: { hi: 'किसान कैसे कमा सकते हैं?', en: 'How can farmers earn?' },
          a: { hi: 'मुख्यतः तीन तरह से — मिट्टी बचाने वाले तरीक़े, मेड़ या खेत पर पेड़ लगाना, और पशुधन व गोबर से मीथेन घटाना।', en: 'Mainly in three ways — soil-saving practices, planting trees on bunds or farms, and cutting methane from livestock and manure.' },
        },
        {
          q: { hi: 'भारत में अब तक सबसे बड़ा उदाहरण क्या है?', en: 'What is the biggest example in India so far?' },
          a: { hi: 'भारत के पहले मृदा-कार्बन भुगतान में पंजाब और हरियाणा के 2,550 किसानों को ₹2.9 करोड़ दिए गए।', en: 'In India\'s first soil-carbon payments, 2,550 farmers in Punjab and Haryana were paid ₹2.9 crore.' },
          cites: ['S-CARB-01'],
        },
        {
          q: { hi: 'एक किसान को औसतन कितना मिला?', en: 'How much did a farmer get on average?' },
          a: { hi: 'उस उदाहरण में औसत लगभग ₹11,478 रहा, सबसे कम ₹3,000 और सबसे ज़्यादा ₹1,17,985 तक। औसत पूरी कहानी नहीं बताता — ज़्यादातर को छोटी रक़म मिली।', en: 'In that example the average was about ₹11,478, with a minimum of ₹3,000 and a maximum of ₹1,17,985. The average does not tell the whole story — most got small amounts.' },
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
          a: { hi: '"आदि" उदाहरण में शुद्ध आय का 75% विकल्प था; "रागिनी" में कंपनी का दावा है कि वह 60% तक देती है। कोई एक "तय दर" नहीं है — अनुबंध पढ़ें।', en: 'In the "Aadi" example there was a 75% of net revenue option; in "Ragini" the company claims up to 60%. There is no single "fixed rate" — read the contract.' },
          cites: ['S-CARB-01', 'S-CARB-13'],
        },
        {
          q: { hi: 'सबसे बड़ा जोखिम क्या है?', en: 'What is the biggest risk?' },
          a: { hi: 'वादे के मुताबिक़ पैसा न मिलना। एक अध्ययन में हरियाणा और म.प्र. के 99% से ज़्यादा किसानों को कोई भुगतान नहीं मिला, और 28% ने दूसरे साल तरीक़े छोड़ दिए।', en: 'Not getting the promised money. In one study, over 99% of farmers in Haryana and MP got no payment, and 28% dropped the practices by year 2.' },
          cites: ['S-CARB-11'],
        },
        {
          q: { hi: 'क्या सरकार ने किसानों की आय का आकलन किया है?', en: 'Has the government assessed farmers\' income?' },
          a: { hi: 'जुलाई 2026 के लोकसभा उत्तर के अनुसार किसानों की आय-संभावना पर "अब तक कोई आकलन नहीं किया गया"; 11 पायलट चल रहे हैं।', en: 'Per a July 2026 Lok Sabha reply, "no assessment has been carried out so far" on farmers\' income potential; 11 pilots are running.' },
          cites: ['S-CARB-09'],
        },
      ],
    },
  ],
}

export default carbonCreditPage
