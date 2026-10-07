// /greenhouse hub intro — authored as structured content so every subsidy
// figure, cost norm and ICAR income example carries a citation (§0.2
// zero-hallucination). The interactive cost/subsidy calculators and the
// marketplace teaser are rendered by the screen (src/screens/Greenhouse.jsx).
// This file lives under src/content/, so Hindi literals are allowed here.
export const greenhousePage = {
  slug: 'greenhouse',
  title: {
    hi: 'ग्रीनहाउस / पॉलीहाउस सब्सिडी गाइड — मध्य प्रदेश',
    en: 'Greenhouse / Polyhouse Subsidy Guide — Madhya Pradesh',
  },
  h1: {
    hi: 'ग्रीनहाउस / पॉलीहाउस सब्सिडी और खेती गाइड (मध्य प्रदेश)',
    en: 'Greenhouse / Polyhouse Subsidy & Farming Guide (Madhya Pradesh)',
  },
  updated: '2026-10-06',
  checked: '2026-10-06',
  blocks: [
    {
      type: 'summary',
      text: {
        hi: 'MP राज्य योजना में पॉलीहाउस (NVPH) पर लागत मानक की 50% सब्सिडी मिलती है — क्षेत्रफल के हिसाब से प्रति वर्ग मीटर ₹530 से ₹422 तक। आवेदन MPFSTS पोर्टल पर होता है। किसी भी विक्रेता को पैसा देने से पहले उसकी जाँच ज़रूर करें।',
        en: 'The MP state scheme gives 50% subsidy on the cost norm for a polyhouse (NVPH) — ₹530 down to ₹422 per m² by area. Apply on the MPFSTS portal. Always verify a vendor before paying anything.',
      },
      cites: ['S-GH-14', 'S-GH-38', 'S-GH-27'],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'क्या पॉलीहाउस आपके लिए सही है?', en: 'Is a polyhouse right for you?' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'पॉलीहाउस में फसल एक ढके ढाँचे के अंदर उगती है, जिससे गर्मी, ओला, लू और कीट से बचाव होता है। पर यह महँगा है और इसे चलाने के लिए मेहनत और समझ चाहिए। बनवाने से पहले इन छह बातों पर सोचें।',
        en: 'A polyhouse grows crops inside a covered structure, shielding them from heat, hail and pests. But it costs a lot and needs skill and daily care to run. Think through these six points before you build.',
      },
    },
    {
      type: 'checklist',
      title: { hi: 'बनवाने से पहले क्या सोचें', en: 'What to weigh before building' },
      items: [
        { text: { hi: 'आपके पास पक्का पानी का स्रोत है? पॉलीहाउस को रोज़ और सटीक सिंचाई चाहिए।', en: 'Do you have an assured water source? A polyhouse needs daily, precise irrigation.' } },
        { text: { hi: 'पास की मंडी में कौन-सी फसल अच्छे भाव बिकती है? वही फसल लगाएँ जिसकी माँग हो।', en: 'Which crop sells well in your nearby market? Grow only what is in demand.' } },
        { text: { hi: 'आप अपना हिस्सा लगा पाएँगे? सब्सिडी मिलने से पहले किसान को अपना पैसा लगाना होता है।', en: 'Can you put in your own share? The farmer pays first, before any subsidy comes.' } },
        { text: { hi: 'आपने कोई चल रहा पॉलीहाउस देखा है या प्रशिक्षण लिया है? पहले सीखें, फिर लगाएँ।', en: 'Have you seen a running polyhouse or taken training? Learn first, then build.' } },
        { text: { hi: 'रोज़ देखभाल के लिए समय और मज़दूर हैं? बिना देखभाल महँगा ढाँचा भी घाटे में जाता है।', en: 'Do you have time and labour for daily care? Without it, even a costly structure loses money.' } },
        { text: { hi: 'छोटे से शुरू करें। पहले कम क्षेत्रफल में सीखें, फिर बड़ा करें।', en: 'Start small. Learn on a small area first, then scale up.' } },
      ],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'लागत और सब्सिडी', en: 'Cost and subsidy' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'MP राज्य योजना में सरकार पॉलीहाउस (NVPH) का एक "लागत मानक" तय करती है और उस पर 50% सब्सिडी देती है। ढाँचा जितना बड़ा, प्रति वर्ग मीटर मानक उतना कम। नीचे की तालिका में मानक और उन पर 50% सब्सिडी दी है।',
        en: 'In the MP state scheme the government fixes a "cost norm" for a polyhouse (NVPH) and gives 50% subsidy on it. The bigger the structure, the lower the norm per m². The table below shows the norms and 50% subsidy on them.',
      },
      cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'],
    },
    {
      type: 'table',
      caption: { hi: 'MP राज्य योजना: NVPH लागत मानक → 50% सब्सिडी (प्रति वर्ग मीटर)', en: 'MP state scheme: NVPH cost norm → 50% subsidy (per m²)' },
      head: [
        { hi: 'क्षेत्रफल स्लैब', en: 'Area slab' },
        { hi: 'लागत मानक (₹/वर्ग मीटर)', en: 'Cost norm (₹/m²)' },
        { hi: '50% सब्सिडी (₹/वर्ग मीटर)', en: '50% subsidy (₹/m²)' },
      ],
      rows: [
        [
          { text: { hi: '≤ 500 वर्ग मीटर', en: '≤ 500 m²' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹1,060', en: '₹1,060' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹530', en: '₹530' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '500–1,008 वर्ग मीटर', en: '500–1,008 m²' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹935', en: '₹935' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹467.50', en: '₹467.50' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '1,008–2,080 वर्ग मीटर', en: '1,008–2,080 m²' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹890', en: '₹890' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹445', en: '₹445' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '2,080–4,000 वर्ग मीटर', en: '2,080–4,000 m²' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹844', en: '₹844' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹422', en: '₹422' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        ],
      ],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'दूसरे ढाँचों के मानक अलग हैं। फैन-पैड पर 50% सब्सिडी ₹825, ₹732.50, ₹710 और ₹700 प्रति वर्ग मीटर (स्लैब के हिसाब से)। शेड-नेट हाउस पर 50% यानी लगभग ₹355 प्रति वर्ग मीटर। केंद्रीय MIDH योजना भी संरक्षित खेती पर 50% सहायता देती है, प्रति लाभार्थी अधिकतम 4,000 वर्ग मीटर तक।',
        en: 'Other structures have different norms. Fan-pad 50% subsidy is ₹825, ₹732.50, ₹710 and ₹700 per m² by slab. Shade-net house 50% is about ₹355 per m². The central MIDH scheme also gives 50% assistance for protected cultivation, up to 4,000 m² per beneficiary.',
      },
      cites: ['S-GH-56', 'S-GH-10', 'S-GH-14', 'S-GH-01'],
    },
    {
      type: 'fact',
      text: {
        hi: 'सब्सिडी "लागत मानक" पर मिलती है, आपके असली भुगतान पर नहीं। अगर विक्रेता मानक से ज़्यादा दाम ले, तो वह अतिरिक्त रक़म पूरी आपकी जेब से जाती है।',
        en: 'Subsidy is on the "cost norm", not on what you actually pay. If a vendor charges more than the norm, that extra comes fully from your pocket.',
      },
      cites: ['S-GH-56', 'S-GH-14'],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'MPFSTS पोर्टल पर आवेदन कैसे करें', en: 'How to apply on the MPFSTS portal' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'MP में उद्यानिकी सब्सिडी के लिए आधिकारिक पोर्टल MPFSTS है। नीचे आवेदन के चरण दिए हैं; पूरे नियम और फ़ॉर्म के लिए पोर्टल के दिशानिर्देश और किसान मैनुअल देखें।',
        en: 'MPFSTS is the official portal for MP horticulture subsidies. The steps are below; for full rules and forms, see the portal guidelines and the farmer manual.',
      },
      cites: ['S-GH-27', 'S-GH-28', 'S-GH-29'],
    },
    {
      type: 'list',
      ordered: true,
      howto: true,
      howtoName: { hi: 'MPFSTS पोर्टल पर पॉलीहाउस सब्सिडी के लिए आवेदन', en: 'Apply for polyhouse subsidy on the MPFSTS portal' },
      items: [
        { text: { hi: 'MPFSTS पोर्टल (mpfsts.mp.gov.in/mphd) पर किसान के रूप में पंजीकरण या लॉगिन करें।', en: 'Register or log in as a farmer on the MPFSTS portal (mpfsts.mp.gov.in/mphd).' }, cites: ['S-GH-27'] },
        { text: { hi: 'दिशानिर्देश और किसान मैनुअल पढ़कर अपनी पात्रता, घटक (पॉलीहाउस/शेड-नेट/फैन-पैड) और ज़रूरी कागज़ समझें।', en: 'Read the guidelines and farmer manual to understand eligibility, the component (polyhouse/shade-net/fan-pad) and required documents.' }, cites: ['S-GH-28', 'S-GH-29'] },
        { text: { hi: 'अपने घटक और क्षेत्रफल स्लैब के लिए ऑनलाइन आवेदन भरें; भूमि, बैंक और पहचान के कागज़ तैयार रखें।', en: 'Fill the online application for your component and area slab; keep land, bank and identity documents ready.' }, cites: ['S-GH-27'] },
        { text: { hi: 'चयन होने पर, चयनित किसानों को 5 दिनों के भीतर पोर्टल पर कागज़ अपलोड करने होते हैं (पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित — पुनः जाँचें)।', en: 'If selected, upload documents on the portal within 5 days (displayed on the portal on 5 October 2026 — re-check).' }, cites: ['S-GH-27'] },
        { text: { hi: 'विक्रेता की जाँच के बाद ही अपना हिस्सा जमा करें। अगर विक्रेता 7 दिनों में किसान के अंश की पुष्टि न करे, तो वर्क ऑर्डर अपने-आप रद्द हो जाता है (पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित — पुनः जाँचें)।', en: 'Deposit your share only after verifying the vendor. If the vendor does not confirm the farmer’s share within 7 days, the work order auto-cancels (displayed on the portal on 5 October 2026 — re-check).' }, cites: ['S-GH-27'] },
        { text: { hi: 'ढाँचा बनने पर विभागीय अधिकारी मौक़े पर सत्यापन करते हैं; उसके बाद ही सब्सिडी जारी होती है।', en: 'Once built, department officials verify the structure on site; only then is the subsidy released.' }, cites: ['S-GH-27'] },
      ],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'आमतौर पर भूमि के कागज़ (खसरा/खतौनी), बैंक पासबुक, पहचान पत्र की ज़रूरत होती है। नाम, क्षेत्रफल और विवरण का कागज़ों में आपस में मेल होना ज़रूरी है — छोटी गड़बड़ी भी देरी करा देती है। क्लस्टर-आधारित लक्ष्य के लिए लॉटरी/आशय-पत्र प्रक्रिया फ़िलहाल अस्थायी रूप से रुकी है (पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित — पुनः जाँचें)।',
        en: 'You usually need land records (khasra/khatauni), a bank passbook and an identity document. Name, area and details must match across papers — a small mismatch delays the application. The lottery/letter-of-intent process is temporarily paused for cluster-based targets (displayed on the portal on 5 October 2026 — re-check).',
      },
      cites: ['S-GH-27'],
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'MPFSTS पोर्टल: https://mpfsts.mp.gov.in/mphd/', en: 'MPFSTS portal: https://mpfsts.mp.gov.in/mphd/' }, cites: ['S-GH-27'] },
        { text: { hi: 'योजना दिशानिर्देश: https://mpfsts.mp.gov.in/mphd/#/SchemeGuidLine', en: 'Scheme guidelines: https://mpfsts.mp.gov.in/mphd/#/SchemeGuidLine' }, cites: ['S-GH-28'] },
        { text: { hi: 'किसान यूज़र मैनुअल: https://mpfsts.mp.gov.in/mphd/document/Farmer_UserManual.pdf', en: 'Farmer user manual: https://mpfsts.mp.gov.in/mphd/document/Farmer_UserManual.pdf' }, cites: ['S-GH-29'] },
        { text: { hi: 'MP Agro दर-अनुबंध विक्रेता सूची: https://mpfsts.mp.gov.in/mphd/#/MPAgroVendorList', en: 'MP Agro vendor list: https://mpfsts.mp.gov.in/mphd/#/MPAgroVendorList' }, cites: ['S-GH-33'] },
      ],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'NHB की केंद्रीय सब्सिडी में बदलाव', en: 'NHB central subsidy change' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'राष्ट्रीय बागवानी बोर्ड (NHB) की केंद्रीय योजना में सहायता 50% से घटाकर 35% कर दी गई है (संशोधित दिशानिर्देश 21 अगस्त 2026)। यह NHB की अलग योजना है। इसे ऊपर बताई गई MP राज्य योजना की 50% सब्सिडी के साथ न जोड़ें — दोनों अलग-अलग हैं।',
        en: 'In the National Horticulture Board (NHB) central scheme, assistance was cut from 50% to 35% (revised guidelines dated 21 August 2026). This is a separate NHB scheme. Do not combine it with the MP state scheme’s 50% subsidy above — the two are separate.',
      },
      cites: ['S-GH-34'],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'किसी भी विक्रेता को पैसा देने से पहले', en: 'Before you pay any vendor' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खरगोन (MP) में सितंबर 2026 में पॉलीहाउस-ऋण धोखाधड़ी सामने आई: EOW ने FIR दर्ज की, जिसमें 33 किसान प्रभावित और लगभग ₹9.7 करोड़ की हेराफेरी बताई गई। इसलिए पैसा देने से पहले नीचे की जाँच-सूची ज़रूर अपनाएँ।',
        en: 'In September 2026 a polyhouse-loan fraud surfaced in Khargone (MP): the EOW filed an FIR with 33 affected farmers and about ₹9.7 crore. So always follow the checklist below before paying.',
      },
      cites: ['S-GH-35'],
    },
    {
      type: 'checklist',
      title: { hi: 'पैसा देने से पहले जाँचें', en: 'Check before you pay' },
      items: [
        { text: { hi: 'पैसा केवल बैंक/आधिकारिक चैनल से दें; नकद या निजी खाते में न दें।', en: 'Pay only through bank/official channels; never cash or a private account.' } },
        { text: { hi: 'हर भुगतान की रसीद और लिखित अनुबंध लें; मौखिक वादों पर काम न करें।', en: 'Take a receipt for every payment and a written contract; do not act on verbal promises.' } },
        { text: { hi: 'भुगतान काम की प्रगति से जोड़ें — पूरा पैसा पहले न दें।', en: 'Tie payment to work progress — do not pay the full amount upfront.' } },
        { text: { hi: 'किसी को ख़ाली फ़ॉर्म या ऋण-कागज़ पर दस्तख़त करके न दें; अपने बैंक कागज़ ख़ुद पढ़ें।', en: 'Never hand over signed blank forms or loan papers; read your own bank documents.' } },
        { text: { hi: '"सब्सिडी पक्की/गारंटीड" के दावों से सावधान रहें — सब्सिडी सत्यापन के बाद ही तय होती है।', en: 'Beware "subsidy guaranteed" claims — subsidy is decided only after verification.' } },
        { text: { hi: 'विक्रेता की वर्तमान स्थिति स्वयं MPFSTS पोर्टल पर जाँचें; किसी बिचौलिए की ज़ुबानी बात पर भरोसा न करें।', en: 'Check the vendor’s current status yourself on the MPFSTS portal; do not trust any middleman’s word.' } },
        { text: { hi: 'गड़बड़ी लगे तो तुरंत उद्यानिकी विभाग और पुलिस/EOW में शिकायत करें।', en: 'If something seems wrong, complain at once to the horticulture department and police/EOW.' } },
      ],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'वेंडर सूची (साल के हिसाब से)', en: 'Vendor lists (by year)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'दर-अनुबंध (rate-contract) सूची का मतलब सिर्फ़ इतना है कि किसी साल सरकार ने कुछ विक्रेताओं से तय दरों पर काम का अनुबंध किया था। यह गुणवत्ता की गारंटी नहीं, और न यह कि वह आज भी सूची में है। हर नाम की वर्तमान स्थिति MPFSTS पोर्टल पर स्वयं जाँचें। 2025-26 या 2026-27 की कोई सूची अभी प्रकाशित नहीं है।',
        en: 'A rate-contract list only means that in some year the government contracted certain vendors at fixed rates. It is not a quality guarantee, nor proof they are still on the list today. Check each name’s current status yourself on the MPFSTS portal. No 2025-26 or 2026-27 list is posted.',
      },
      cites: ['S-GH-33'],
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'वर्ष 2022-23 की MP Agro दर-अनुबंध सूची — वर्तमान स्थिति MPFSTS पर जाँचें: Chaoudhary Traders; Diksha Green House Construction Company, Guna; Greentech Services।', en: 'MP Agro rate-contract list for year 2022-23 — check current status on MPFSTS: Chaoudhary Traders; Diksha Green House Construction Company, Guna; Greentech Services.' }, cites: ['S-GH-33'] },
        { text: { hi: 'वर्ष 2021-22 की MP Agro दर-अनुबंध सूची — वर्तमान स्थिति MPFSTS पर जाँचें: Chuadhary Traders; Deeksha Green House; Maa Narmada Trading Company।', en: 'MP Agro rate-contract list for year 2021-22 — check current status on MPFSTS: Chuadhary Traders; Deeksha Green House; Maa Narmada Trading Company.' }, cites: ['S-GH-33'] },
        { text: { hi: 'वर्ष 2019–21 की MP Agro दर-अनुबंध सूची — वर्तमान स्थिति MPFSTS पर जाँचें: Aero Green House Pvt Ltd; AM BI Interprises; Bhavya Agritech; Earth Agro Structures Pvt Ltd; Flora Rose Services; Hindustan Agrotech; Kisan Agrotech; Madhyapradesh Poly House; Oswal Hortitech Pvt Ltd; Rajsthan Agro Products; Ratanpuri Green House Pvt Ltd; Shri Narayan Green House Infra Pvt Ltd।', en: 'MP Agro rate-contract list for years 2019–21 — check current status on MPFSTS: Aero Green House Pvt Ltd; AM BI Interprises; Bhavya Agritech; Earth Agro Structures Pvt Ltd; Flora Rose Services; Hindustan Agrotech; Kisan Agrotech; Madhyapradesh Poly House; Oswal Hortitech Pvt Ltd; Rajsthan Agro Products; Ratanpuri Green House Pvt Ltd; Shri Narayan Green House Infra Pvt Ltd.' }, cites: ['S-GH-33'] },
      ],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
    },
    {
      type: 'faq',
      faqs: [
        { q: { hi: 'MP राज्य योजना में पॉलीहाउस पर कितनी सब्सिडी मिलती है?', en: 'How much subsidy does the MP state scheme give on a polyhouse?' }, a: { hi: 'राज्य योजना में NVPH के लागत मानक पर 50% सब्सिडी मिलती है — प्रति वर्ग मीटर ₹530 (≤500 वर्ग मीटर) से घटकर ₹422 (2,080–4,000 वर्ग मीटर) तक।', en: 'The state scheme gives 50% on the NVPH cost norm — ₹530/m² (≤500 m²) down to ₹422/m² (2,080–4,000 m²).' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        { q: { hi: 'लागत मानक क्षेत्रफल के साथ क्यों घटता है?', en: 'Why does the cost norm fall with area?' }, a: { hi: 'बड़े ढाँचे की प्रति वर्ग मीटर लागत कम होती है। इसलिए मानक ≤500 वर्ग मीटर पर ₹1,060 और 2,080–4,000 वर्ग मीटर पर ₹844 है।', en: 'Larger structures cost less per m². So the norm is ₹1,060 at ≤500 m² and ₹844 at 2,080–4,000 m².' }, cites: ['S-GH-56', 'S-GH-14', 'S-GH-38'] },
        { q: { hi: 'फैन-पैड और शेड-नेट पर कितनी सब्सिडी है?', en: 'What subsidy applies to fan-pad and shade-net?' }, a: { hi: 'फैन-पैड पर 50% सब्सिडी ₹825, ₹732.50, ₹710 और ₹700 प्रति वर्ग मीटर (स्लैब के हिसाब से)। शेड-नेट हाउस पर 50% यानी लगभग ₹355 प्रति वर्ग मीटर।', en: 'Fan-pad 50% subsidy is ₹825, ₹732.50, ₹710 and ₹700 per m² by slab. Shade-net house 50% is about ₹355 per m².' }, cites: ['S-GH-56', 'S-GH-10', 'S-GH-14'] },
        { q: { hi: 'MIDH योजना क्या देती है?', en: 'What does MIDH give?' }, a: { hi: 'MIDH संरक्षित खेती पर 50% सहायता देता है, प्रति लाभार्थी अधिकतम 4,000 वर्ग मीटर तक। यह केंद्रीय योजना है।', en: 'MIDH gives 50% assistance for protected cultivation, up to 4,000 m² per beneficiary. It is a central scheme.' }, cites: ['S-GH-01'] },
        { q: { hi: 'NHB योजना में क्या बदला है?', en: 'What changed in the NHB scheme?' }, a: { hi: 'NHB की केंद्रीय योजना में सहायता 50% से घटाकर 35% कर दी गई है (संशोधित दिशानिर्देश 21 अगस्त 2026)। यह MP राज्य योजना से अलग है।', en: 'In the NHB central scheme, assistance was cut from 50% to 35% (revised guidelines dated 21 August 2026). It is separate from the MP state scheme.' }, cites: ['S-GH-34'] },
        { q: { hi: 'क्या मैं राज्य और NHB दोनों की सब्सिडी एक साथ जोड़ सकता हूँ?', en: 'Can I combine state and NHB subsidy?' }, a: { hi: 'नहीं — ये अलग-अलग योजनाएँ हैं। इन्हें मिलाकर न पढ़ें; पात्रता और शर्तें पोर्टल/विभाग से जाँचें।', en: 'No — these are separate schemes. Do not read them as one; check eligibility and conditions with the portal/department.' }, cites: ['S-GH-27'] },
        { q: { hi: 'ड्रिप सिंचाई पर कितनी सहायता मिलती है?', en: 'How much assistance for drip irrigation?' }, a: { hi: 'PMKSY में छोटे व सीमांत किसानों को 55% और अन्य किसानों को 45% सहायता मिलती है।', en: 'Under PMKSY, small/marginal farmers get 55% and others get 45%.' }, cites: ['S-GH-02', 'S-GH-18'] },
        { q: { hi: 'बड़े खर्च के लिए ऋण पर कोई राहत है?', en: 'Any relief on loans for big spends?' }, a: { hi: 'हाँ — कृषि अवसंरचना कोष (AIF) ₹2 करोड़ तक के ऋण पर 3% ब्याज अनुदान देता है।', en: 'Yes — the Agriculture Infrastructure Fund (AIF) gives 3% interest subvention on loans up to ₹2 crore.' }, cites: ['S-GH-03'] },
        { q: { hi: 'पॉलीहाउस में कितनी पैदावार बढ़ सकती है?', en: 'How much can yield increase in a polyhouse?' }, a: { hi: 'फसल के हिसाब से पैदावार खुली खेती से 3 से 10 गुना तक हो सकती है — यह सामान्य अनुमान है, गारंटी नहीं।', en: 'Depending on the crop, yields can be 3 to 10 times open cultivation — a general estimate, not a guarantee.' }, cites: ['S-GH-24'] },
        { q: { hi: 'आवेदन कहाँ से करूँ?', en: 'Where do I apply?' }, a: { hi: 'आधिकारिक MPFSTS पोर्टल (mpfsts.mp.gov.in/mphd) से। दिशानिर्देश और किसान मैनुअल भी वहीं हैं।', en: 'From the official MPFSTS portal (mpfsts.mp.gov.in/mphd). Guidelines and the farmer manual are there too.' }, cites: ['S-GH-27', 'S-GH-28', 'S-GH-29'] },
      ],
    },
  ],
}

export default greenhousePage
