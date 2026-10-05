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
        hi: 'मध्य प्रदेश राज्य योजना में संरक्षित खेती (NVPH) पर लागत मानक की 50% सब्सिडी मिलती है — क्षेत्रफल के हिसाब से प्रति वर्ग मीटर ₹530 से ₹422 तक। केंद्रीय MIDH भी अधिकतम 4,000 वर्ग मीटर तक 50% सहायता देता है। आवेदन MPFSTS पोर्टल पर होता है; पैसा देने से पहले विक्रेता की जाँच ज़रूरी है।',
        en: 'Madhya Pradesh state scheme gives 50% subsidy on the cost norm for protected cultivation (NVPH) — from ₹530 down to ₹422 per m² by area slab. Central MIDH also gives 50% assistance up to 4,000 m². Apply on the MPFSTS portal; verify the vendor before paying anything.',
      },
      cites: ['S-GH-14', 'S-GH-38', 'S-GH-01', 'S-GH-27'],
    },

    {
      type: 'paragraph',
      text: {
        hi: 'पॉलीहाउस और ग्रीनहाउस "संरक्षित खेती" (protected cultivation) का हिस्सा हैं। इसमें फसल को एक ढके हुए ढाँचे के भीतर उगाया जाता है, ताकि तापमान, नमी, कीट और मौसम की मार से बचाव हो सके। बुंदेलखंड जैसे इलाक़ों में, जहाँ गर्मी और पानी दोनों की चुनौती रहती है, यह तकनीक छोटे क्षेत्रफल से भी अच्छी कमाई का रास्ता दे सकती है — बशर्ते योजना समझकर, सही लागत पर और भरोसेमंद ढंग से लगाई जाए।',
        en: 'Polyhouses and greenhouses are part of "protected cultivation" — growing crops inside a covered structure to shield temperature, humidity, pests and weather. In regions like Bundelkhand, where both heat and water are constraints, this can turn a small area into good income — if planned well, built at the right cost and done through trusted means.',
      },
    },

    {
      type: 'paragraph',
      text: {
        hi: 'संरक्षित खेती का मूल विचार यह है कि फसल को बाहरी वातावरण की अनिश्चितता से एक हद तक आज़ाद कर दिया जाए। खुले खेत में ओला, लू, बेमौसम बारिश, तेज़ हवा और कीट-रोग फसल को किसी भी समय नुक़सान पहुँचा सकते हैं। ढके हुए ढाँचे में इन जोखिमों को काफ़ी हद तक नियंत्रित किया जा सकता है, जिससे फसल की गुणवत्ता और एकरूपता दोनों बेहतर होती हैं। इसी कारण पॉलीहाउस में उगाई गई सब्ज़ियाँ अक्सर मंडी में बेहतर भाव पाती हैं और लंबे समय तक उत्पादन देती हैं।',
        en: 'The core idea of protected cultivation is to free the crop, to a degree, from the uncertainty of the outside environment. In open fields, hail, heatwaves, unseasonal rain, strong wind and pests can damage a crop at any time. Inside a covered structure these risks are largely controlled, improving both quality and uniformity. This is why polyhouse-grown vegetables often fetch better market prices and produce over a longer period.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'हालाँकि संरक्षित खेती कोई जादुई समाधान नहीं है। इसमें शुरुआती लागत ऊँची होती है, और इसे चलाने के लिए तकनीकी समझ ज़रूरी है — सही सिंचाई, पोषण, तापमान और नमी का प्रबंधन, तथा कीट-रोग की समय पर पहचान। बिना प्रशिक्षण और नियमित देखभाल के महँगा ढाँचा भी घाटे का सौदा बन सकता है। इसलिए निवेश से पहले प्रशिक्षण लेना, किसी अनुभवी किसान के ढाँचे को देखना, और छोटे स्तर से शुरुआत करना समझदारी है।',
        en: 'Protected cultivation is not a magic solution, however. It carries a high upfront cost and needs technical understanding to run — managing irrigation, nutrition, temperature and humidity, and spotting pests and disease in time. Without training and regular care, even a costly structure can turn into a loss. So before investing, it is wise to get trained, visit an experienced farmer’s structure, and start small.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इस पृष्ठ का मक़सद आपको निर्णय लेने लायक़ जानकारी देना है — यह कोई विज्ञापन नहीं है और न ही किसी विक्रेता की सिफ़ारिश करता है। यहाँ दी गई हर आर्थिक जानकारी के साथ उसका स्रोत जोड़ा गया है ताकि आप उसे स्वयं परख सकें। कोई भी अंतिम निर्णय लेने से पहले आधिकारिक पोर्टल और अपने ज़िले के उद्यानिकी विभाग से पुष्टि अवश्य करें, क्योंकि नियम और दरें समय के साथ बदलती रहती हैं।',
        en: 'The aim of this page is to give you enough information to decide — it is not an advertisement, nor does it recommend any vendor. Every financial figure here carries its source so you can verify it yourself. Before any final decision, confirm with the official portal and your district horticulture office, because rules and rates change over time.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'पॉलीहाउस, शेड-नेट, फैन-पैड — ढाँचे के प्रकार', en: 'Polyhouse, shade-net, fan-pad — structure types' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'संरक्षित खेती के कई ढाँचे होते हैं। पॉलीहाउस (naturally ventilated poly house / NVPH) एक पारदर्शी प्लास्टिक शीट से ढका ढाँचा है, जो हवा के प्राकृतिक बहाव से तापमान संभालता है। शेड-नेट हाउस में जाली लगती है जो धूप और गर्मी कम करती है — यह पत्तेदार सब्ज़ियों और नर्सरी के लिए उपयुक्त है। फैन-पैड (fan-and-pad) सिस्टम में पंखे और पानी के पैड से भीतर का तापमान कृत्रिम रूप से ठंडा रखा जाता है — यह सबसे महँगा पर सबसे नियंत्रित ढाँचा है। वॉक-इन टनल और लो-टनल छोटे, सस्ते ढाँचे हैं जो मौसमी फसलों के लिए इस्तेमाल होते हैं।',
        en: 'There are several protected-cultivation structures. A polyhouse (naturally ventilated poly house / NVPH) is covered with a clear plastic sheet and manages temperature through natural airflow. A shade-net house uses mesh to cut sun and heat — suited to leafy greens and nurseries. A fan-and-pad system cools the interior artificially using fans and water pads — the costliest but most controlled. Walk-in tunnels and low tunnels are small, cheap structures for seasonal crops.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सही ढाँचा आपकी फसल, बजट, पानी की उपलब्धता और स्थानीय जलवायु पर निर्भर करता है। महँगा फैन-पैड हर किसान के लिए ज़रूरी नहीं; कई बार साधारण पॉलीहाउस या शेड-नेट ही पर्याप्त और किफ़ायती रहता है। निर्णय लेने से पहले अपने ज़िले के उद्यानिकी विभाग और पास के किसानों से बात करना अच्छा रहता है।',
        en: 'The right structure depends on your crop, budget, water availability and local climate. A costly fan-pad is not necessary for every farmer; often a simple polyhouse or shade-net is enough and cheaper. Before deciding, it helps to talk to your district horticulture office and nearby farmers.',
      },
    },

    {
      type: 'paragraph',
      text: {
        hi: 'ढाँचे के साथ-साथ भीतर की व्यवस्था भी अहम है। अच्छी जल-निकासी, सिंचाई के लिए ड्रिप लाइन, पौधों को सहारा देने के लिए तार या रस्सी, और रोपण के लिए साफ़ व रोग-मुक्त माध्यम — ये सब मिलकर अच्छी उपज सुनिश्चित करते हैं। प्रवेश द्वार पर दोहरी व्यवस्था (डबल डोर) और कीट-रोधी जाली से भीतर कीटों का आना कम होता है। समय-समय पर ढाँचे की प्लास्टिक फ़िल्म, जाली और जोड़ों की जाँच करते रहना चाहिए ताकि छोटी-सी टूट-फूट बड़ी हानि न बने।',
        en: 'Along with the structure, the setup inside matters. Good drainage, a drip line for irrigation, wires or strings to support plants, and a clean, disease-free planting medium together ensure a good crop. A double-door entry and insect-proof netting reduce pest entry. The structure’s plastic film, net and joints should be inspected regularly so a small tear does not become a big loss.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'जलवायु के हिसाब से ढाँचा चुनना भी ज़रूरी है। बुंदेलखंड जैसे गर्म और शुष्क इलाक़े में गर्मियों में भीतर का तापमान बहुत बढ़ सकता है, इसलिए हवा के अच्छे बहाव, छाया और कूलिंग की व्यवस्था पर ध्यान देना पड़ता है। सर्दियों में पाले से बचाव और पर्याप्त रोशनी ज़रूरी होती है। स्थानीय परिस्थितियों को समझे बिना किसी दूसरे राज्य का मॉडल ज्यों-का-त्यों अपनाना जोखिम भरा हो सकता है।',
        en: 'Choosing the structure to suit the climate is also important. In a hot, dry region like Bundelkhand, inside temperatures can rise sharply in summer, so good airflow, shade and cooling need attention. In winter, frost protection and adequate light matter. Adopting another state’s model as-is, without understanding local conditions, can be risky.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'बुंदेलखंड के लिए उपयुक्त फसलें', en: 'Crops suited to Bundelkhand' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'पॉलीहाउस में आमतौर पर रंगीन शिमला मिर्च (capsicum), टमाटर, खीरा और पत्तेदार सब्ज़ियाँ उगाई जाती हैं। ICAR के अनुसार मध्य प्रदेश में 2,000–4,000 वर्ग मीटर के ढाँचों में संरक्षित खेती की जाती है, और आधे से एक एकड़ से एक सीज़न में लगभग ₹2–5 लाख तक शुद्ध आय संभव बताई गई है। यह एक उदाहरण है, कोई गारंटी नहीं — वास्तविक आय फसल, भाव, लागत और प्रबंधन पर निर्भर करती है।',
        en: 'Polyhouses commonly grow coloured capsicum, tomato, cucumber and leafy greens. Per ICAR, protected cultivation in MP is done in 2,000–4,000 m² structures, and about ₹2–5 lakh net income per season is reported from half-to-one acre. This is an example, not a guarantee — actual income depends on crop, prices, cost and management.',
      },
      cites: ['S-GH-21'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'फसल चुनते समय बाज़ार की माँग को ध्यान में रखना सबसे ज़रूरी है। पॉलीहाउस में वही फसल लगाएँ जिसकी आपके क्षेत्र या नज़दीकी बड़ी मंडी में अच्छी और लगातार माँग हो, और जो बेमौसम में ऊँचा भाव पाती हो — क्योंकि संरक्षित खेती की असली ताक़त यही है कि आप उस समय फसल दे सकते हैं जब खुले खेत में वह उपलब्ध नहीं होती। रंगीन शिमला मिर्च, बेल वाला खीरा और उच्च गुणवत्ता वाला टमाटर इसी श्रेणी में आते हैं। पत्तेदार सब्ज़ियाँ कम लागत और तेज़ चक्र के कारण शुरुआती किसानों के लिए अभ्यास का अच्छा ज़रिया होती हैं।',
        en: 'When choosing a crop, keeping market demand in mind is most important. Grow in the polyhouse only what has good, steady demand in your area or a nearby large market, and fetches a high off-season price — because the real strength of protected cultivation is that you can supply when the open field cannot. Coloured capsicum, vine cucumber and high-quality tomato fall in this group. Leafy greens, with low cost and a fast cycle, are good practice for beginner farmers.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'याद रखें कि आय के जो भी आँकड़े यहाँ दिए गए हैं, वे उदाहरण हैं — गारंटी नहीं। असली कमाई आपकी फसल, बीज की गुणवत्ता, रोग प्रबंधन, मंडी के भाव और आपकी अपनी मेहनत पर निर्भर करती है। दो पड़ोसी किसान एक जैसे ढाँचे में भी अलग-अलग नतीजे पा सकते हैं। इसलिए किसी भी विक्रेता या योजना के "इतनी कमाई पक्की" वाले दावे पर आँख मूँदकर भरोसा न करें; अपनी परिस्थिति के हिसाब से ही निर्णय लें।',
        en: 'Remember that any income figures given here are examples — not guarantees. Actual earnings depend on your crop, seed quality, disease management, market prices and your own effort. Two neighbouring farmers can get different results even in identical structures. So do not blindly trust any vendor’s or scheme’s "this much income is certain" claim; decide only according to your own situation.',
      },
    },
    {
      type: 'fact',
      text: {
        hi: 'संरक्षित खेती में पैदावार खुली खेती के मुक़ाबले 3 से 10 गुना तक हो सकती है (फसल पर निर्भर) — यह एक सामान्य अनुमान है, गारंटी नहीं।',
        en: 'In protected cultivation, yields can be 3 to 10 times higher than open cultivation (crop-dependent) — a general estimate, not a guarantee.',
      },
      cites: ['S-GH-24'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ICAR का एक उदाहरण: 3,000 वर्ग मीटर के रंगीन शिमला मिर्च पॉलीहाउस में लगभग ₹35 लाख लागत आई, जिस पर ₹11 लाख सब्सिडी मिली; उस सीज़न में लगभग ₹20 लाख का सकल (gross) और लगभग ₹15 लाख शुद्ध (net) लाभ दर्ज किया गया। यह ICAR का एक उदाहरण है — गारंटी नहीं। अपने क्षेत्र, भाव और लागत के हिसाब से अपनी गणना करें।',
        en: 'An ICAR example: a 3,000 m² coloured-capsicum polyhouse cost about ₹35 lakh, received ₹11 lakh subsidy, and that season recorded roughly ₹20 lakh gross and about ₹15 lakh net. This is an ICAR example — not a guarantee. Do your own maths for your area, prices and costs.',
      },
      cites: ['S-GH-22'],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'मध्य प्रदेश राज्य योजना — लागत मानक और आधी सब्सिडी', en: 'MP state scheme — cost norm and half subsidy' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मध्य प्रदेश राज्य योजना में NVPH (पॉलीहाउस) के लिए सरकार एक "लागत मानक" (cost norm) तय करती है, और उस पर 50% सब्सिडी देती है। लागत मानक क्षेत्रफल बढ़ने के साथ प्रति वर्ग मीटर घटता जाता है (बड़े ढाँचे की प्रति-इकाई लागत कम होती है)। नीचे की तालिका राज्य योजना के मानक और उन पर 50% सब्सिडी दिखाती है।',
        en: 'In the MP state scheme the government fixes a "cost norm" for NVPH (polyhouse) and gives 50% subsidy on it. The norm per m² falls as area grows (larger structures cost less per unit). The table below shows the state-scheme norms and 50% subsidy on them.',
      },
      cites: ['S-GH-14', 'S-GH-38'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नोट: वित्तीय वर्ष 2026-27 · स्रोत: MP राज्य योजना · अंतिम जाँच 6 अक्टूबर 2026। मानक और दरें बदल सकती हैं — आवेदन से पहले MPFSTS पोर्टल पर पुनः जाँच करें।',
        en: 'Note: FY 2026-27 · Source: MP state scheme · last checked 6 October 2026. Norms and rates can change — re-check on the MPFSTS portal before applying.',
      },
      cites: ['S-GH-14', 'S-GH-38', 'S-GH-27'],
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
          { text: { hi: '≤ 500 वर्ग मीटर', en: '≤ 500 m²' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹1,060', en: '₹1,060' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹530', en: '₹530' }, cites: ['S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '500–1,008 वर्ग मीटर', en: '500–1,008 m²' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹935', en: '₹935' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹467.50', en: '₹467.50' }, cites: ['S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '1,008–2,080 वर्ग मीटर', en: '1,008–2,080 m²' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹890', en: '₹890' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹445', en: '₹445' }, cites: ['S-GH-14', 'S-GH-38'] },
        ],
        [
          { text: { hi: '2,080–4,000 वर्ग मीटर', en: '2,080–4,000 m²' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹844', en: '₹844' }, cites: ['S-GH-14', 'S-GH-38'] },
          { text: { hi: '₹422', en: '₹422' }, cites: ['S-GH-14', 'S-GH-38'] },
        ],
      ],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'एक उदाहरण गणना: यदि आप 4,000 वर्ग मीटर का पॉलीहाउस 2,080–4,000 वर्ग मीटर स्लैब के ₹844 प्रति वर्ग मीटर मानक पर लगाते हैं, तो 4,000 × ₹844 × 50% = ₹16,88,000 सब्सिडी बनती है। बाक़ी हिस्सा किसान को वहन करना होता है।',
        en: 'A worked example: at the 2,080–4,000 m² slab norm of ₹844/m², a 4,000 m² polyhouse gives 4,000 × ₹844 × 50% = ₹16,88,000 subsidy. The farmer bears the rest.',
      },
      cites: ['S-GH-14'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'दूसरे ढाँचों के मानक अलग हैं। फैन-पैड (fan-pad) सिस्टम का मानक लगभग ₹1,400–1,650 प्रति वर्ग मीटर के आसपास रहता है (पहाड़ी/दुर्गम क्षेत्रों में अधिक)। शेड-नेट हाउस का मानक लगभग ₹710 प्रति वर्ग मीटर है, जिस पर 50% यानी लगभग ₹355 प्रति वर्ग मीटर सब्सिडी बनती है।',
        en: 'Other structures have different norms. The fan-pad system norm is around ₹1,400–1,650 per m² (higher in hilly/remote areas). The shade-net house norm is about ₹710 per m², giving 50% — about ₹355 per m² — subsidy.',
      },
      cites: ['S-GH-10', 'S-GH-14'],
    },

    {
      type: 'paragraph',
      text: {
        hi: 'यहाँ एक बात साफ़ समझ लेनी चाहिए: सब्सिडी "लागत मानक" पर मिलती है, आपके द्वारा विक्रेता को दी गई असली क़ीमत पर नहीं। यदि कोई विक्रेता मानक से ज़्यादा दाम लेता है, तो वह अतिरिक्त रक़म पूरी तरह किसान की जेब से जाती है — उस पर सब्सिडी नहीं मिलती। इसलिए ढाँचा बनवाने से पहले मानक, स्लैब और अपनी गणना अच्छी तरह समझ लेना बहुत ज़रूरी है, ताकि कोई आपको बढ़ा-चढ़ाकर दाम न बता सके।',
        en: 'One thing must be clear: subsidy is given on the "cost norm", not on the actual price you pay the vendor. If a vendor charges more than the norm, that extra amount comes entirely from the farmer’s pocket — no subsidy applies to it. So before getting a structure built, it is very important to understand the norm, the slab and your own maths, so no one can overstate the price to you.',
      },
      cites: ['S-GH-14'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सब्सिडी की रक़म सीधे हाथ में नहीं आती। आमतौर पर पहले किसान को अपना हिस्सा लगाना होता है और ढाँचा खड़ा करना होता है; फिर विभागीय अधिकारी मौक़े पर आकर सत्यापन करते हैं कि ढाँचा सचमुच बना है और मानकों पर खरा है। सत्यापन के बाद ही स्वीकृत सब्सिडी जारी होती है। इसी प्रक्रिया के बीच ही धोखाधड़ी की गुंजाइश रहती है — इसलिए हर चरण पर सतर्क रहना और दस्तावेज़ संभालकर रखना ज़रूरी है।',
        en: 'Subsidy money does not come directly into your hand. Usually the farmer first puts in their share and builds the structure; then department officials come on site to verify that the structure is actually built and meets the norms. Only after verification is the approved subsidy released. It is within this process that there is scope for fraud — so staying alert at every step and keeping documents safe is essential.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'केंद्रीय योजनाएँ — राज्य योजना से अलग', en: 'Central schemes — separate from the state scheme' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'केंद्रीय योजनाएँ राज्य योजना से अलग चलती हैं और इन्हें मिलाकर नहीं पढ़ना चाहिए। MIDH (Mission for Integrated Development of Horticulture) संरक्षित खेती पर 50% सहायता देता है, जो प्रति लाभार्थी अधिकतम 4,000 वर्ग मीटर तक सीमित है।',
        en: 'Central schemes run separately from the state scheme and should not be read as one. MIDH (Mission for Integrated Development of Horticulture) gives 50% assistance for protected cultivation, up to 4,000 m² per beneficiary.',
      },
      cites: ['S-GH-01'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'राष्ट्रीय बागवानी बोर्ड (NHB) की केंद्रीय योजना में सहायता 50% से घटाकर 35% कर दी गई है (संशोधित दिशानिर्देश दिनांक 21 अगस्त 2026)। यह NHB की अलग योजना है — इसे ऊपर बताई गई मध्य प्रदेश राज्य योजना की 50% सब्सिडी के साथ न जोड़ें।',
        en: 'In the National Horticulture Board (NHB) central scheme, assistance has been cut from 50% to 35% (revised guidelines dated 21 August 2026). This is a separate NHB scheme — do not combine it with the 50% MP state-scheme subsidy described above.',
      },
      cites: ['S-GH-34'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सिंचाई के लिए PMKSY (ड्रिप/माइक्रो-इरीगेशन) में छोटे व सीमांत किसानों को 55% और अन्य किसानों को 45% सहायता मिलती है। बड़े खर्च के लिए कृषि अवसंरचना कोष (AIF) ₹2 करोड़ तक के ऋण पर 3% ब्याज अनुदान (interest subvention) देता है।',
        en: 'For irrigation, PMKSY (drip/micro-irrigation) gives 55% to small/marginal farmers and 45% to others. For larger spends, the Agriculture Infrastructure Fund (AIF) gives 3% interest subvention on loans up to ₹2 crore.',
      },
      cites: ['S-GH-02', 'S-GH-18', 'S-GH-03'],
    },

    {
      type: 'paragraph',
      text: {
        hi: 'सिंचाई के बिना संरक्षित खेती अधूरी है। पॉलीहाउस में पानी की माँग सटीक और नियमित होती है, इसलिए ड्रिप या माइक्रो-सिंचाई लगभग अनिवार्य-सी हो जाती है। इससे पानी की बचत भी होती है और पौधों को ज़रूरत के मुताबिक़ पोषण भी दिया जा सकता है (फर्टिगेशन)। कई किसान पहले यह तय नहीं करते कि पानी का स्रोत पक्का है या नहीं, और बाद में परेशानी होती है — इसलिए निवेश से पहले भरोसेमंद जल-स्रोत सुनिश्चित करें।',
        en: 'Protected cultivation is incomplete without irrigation. Water demand in a polyhouse is precise and regular, so drip or micro-irrigation becomes almost essential. It saves water and lets nutrients be delivered to plants as needed (fertigation). Many farmers do not first confirm whether their water source is assured, and face trouble later — so secure a reliable water source before investing.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'MPFSTS पोर्टल पर आवेदन कैसे करें', en: 'How to apply on the MPFSTS portal' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मध्य प्रदेश में उद्यानिकी सब्सिडी के लिए आधिकारिक पोर्टल MPFSTS है। नीचे आवेदन की सामान्य प्रक्रिया दी गई है; विस्तृत नियमों और प्रपत्रों के लिए पोर्टल के दिशानिर्देश और किसान मैनुअल देखें।',
        en: 'MPFSTS is the official portal for MP horticulture subsidies. The general application steps are below; for detailed rules and forms, see the portal guidelines and the farmer manual.',
      },
      cites: ['S-GH-27', 'S-GH-28', 'S-GH-29'],
    },
    {
      type: 'list',
      ordered: true,
      howto: true,
      howtoName: { hi: 'MPFSTS पोर्टल पर पॉलीहाउस सब्सिडी के लिए आवेदन', en: 'Apply for polyhouse subsidy on the MPFSTS portal' },
      items: [
        { text: { hi: 'MPFSTS पोर्टल (mpfsts.mp.gov.in/mphd) पर जाएँ और किसान के रूप में पंजीकरण/लॉगिन करें।', en: 'Go to the MPFSTS portal (mpfsts.mp.gov.in/mphd) and register/log in as a farmer.' }, cites: ['S-GH-27'] },
        { text: { hi: 'दिशानिर्देश और किसान मैनुअल पढ़कर अपनी पात्रता, घटक (पॉलीहाउस/शेड-नेट/फैन-पैड) और ज़रूरी दस्तावेज़ समझें।', en: 'Read the guidelines and farmer manual to understand eligibility, the component (polyhouse/shade-net/fan-pad) and required documents.' }, cites: ['S-GH-28', 'S-GH-29'] },
        { text: { hi: 'अपने घटक और क्षेत्रफल स्लैब के लिए ऑनलाइन आवेदन भरें; भूमि, बैंक और पहचान के दस्तावेज़ तैयार रखें।', en: 'Fill the online application for your component and area slab; keep land, bank and identity documents ready.' }, cites: ['S-GH-27'] },
        { text: { hi: 'चयन होने पर, निर्धारित समय में पोर्टल पर दस्तावेज़ अपलोड करें (वर्तमान नियम नीचे देखें)।', en: 'If selected, upload documents on the portal within the set time (see current rules below).' }, cites: ['S-GH-27'] },
        { text: { hi: 'विक्रेता की जाँच करने के बाद ही अपना हिस्सा (किसान अंश) जमा करें; ढाँचा बनने पर विभागीय सत्यापन के बाद सब्सिडी प्रक्रिया पूरी होती है।', en: 'Deposit your share (farmer contribution) only after verifying the vendor; subsidy completes after departmental verification once the structure is built.' }, cites: ['S-GH-27'] },
      ],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित कुछ प्रमुख नियम (पुनः जाँचें): (1) चयनित किसानों को 5 दिनों के भीतर दस्तावेज़ अपलोड करने होते हैं; (2) यदि विक्रेता 7 दिनों के भीतर किसान के अंश की पुष्टि नहीं करता, तो वर्क ऑर्डर अपने-आप रद्द हो जाता है; (3) क्लस्टर-आधारित लक्ष्य आवंटन के लिए लॉटरी/आशय-पत्र (letter of intent) की प्रक्रिया फ़िलहाल अस्थायी रूप से रोकी गई है। ये नियम "पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित — पुनः जाँचें"।',
        en: 'Some key rules displayed on the portal on 5 October 2026 (re-check): (1) selected farmers must upload documents within 5 days; (2) the work order auto-cancels if the vendor does not confirm the farmer’s share within 7 days; (3) the lottery/letter-of-intent process is temporarily paused for cluster-based target allocation. These are "displayed on the portal on 5 October 2026 — re-check".',
      },
      cites: ['S-GH-27'],
    },

    {
      type: 'paragraph',
      text: {
        hi: 'आवेदन से पहले अपने दस्तावेज़ दुरुस्त रखना समय की बचत करता है। आमतौर पर भूमि के अभिलेख (खसरा/खतौनी), बैंक खाता विवरण, पहचान पत्र और पासबुक की प्रति की ज़रूरत पड़ती है। यदि भूमि संयुक्त है या किराये पर है, तो उससे जुड़ी शर्तें पहले से समझ लें। दस्तावेज़ों में नाम, क्षेत्रफल और विवरण का आपस में मेल होना चाहिए — छोटी-सी असंगति भी आवेदन में देरी करा सकती है।',
        en: 'Keeping your documents in order before applying saves time. Usually you need land records (khasra/khatauni), bank account details, an identity document and a passbook copy. If the land is jointly held or leased, understand the related conditions in advance. Name, area and details across documents must match — even a small mismatch can delay the application.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'आधिकारिक पोर्टल और लिंक', en: 'Official portal and links' },
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
      type: 'paragraph',
      text: {
        hi: 'आवेदन करते समय धैर्य रखें। सरकारी प्रक्रिया में समय लगता है, और बीच-बीच में दस्तावेज़ों की माँग या जाँच हो सकती है। किसी भी एजेंट या बिचौलिए के इस झाँसे में न आएँ कि "जल्दी पैसा दो तो काम जल्दी हो जाएगा"। आधिकारिक प्रक्रिया पोर्टल पर पारदर्शी होती है — जो जानकारी आपको चाहिए, वह आप स्वयं पोर्टल पर देख सकते हैं। किसी भी संदेह की स्थिति में अपने ज़िले के उद्यानिकी विभाग के कार्यालय में सीधे संपर्क करें।',
        en: 'Be patient while applying. Government processes take time, and documents may be requested or checked along the way. Do not fall for any agent or middleman’s lure that "pay quickly and the work will happen quickly". The official process is transparent on the portal — the information you need, you can see yourself on the portal. In case of any doubt, contact your district horticulture office directly.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'सावधानी — पॉलीहाउस-ऋण धोखाधड़ी', en: 'Caution — polyhouse-loan fraud' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खरगोन (मध्य प्रदेश) में सितंबर 2026 में पॉलीहाउस-ऋण धोखाधड़ी का मामला सामने आया: आर्थिक अपराध शाखा (EOW) ने FIR दर्ज की, जिसमें 33 किसान प्रभावित हुए और लगभग ₹9.7 करोड़ की हेराफेरी बताई गई। इसलिए किसी भी विक्रेता को पैसा देने से पहले नीचे दी गई जाँच-सूची ज़रूर अपनाएँ।',
        en: 'In September 2026 a polyhouse-loan fraud came to light in Khargone (MP): the Economic Offences Wing (EOW) filed an FIR involving 33 affected farmers and about ₹9.7 crore. So before paying any vendor, always follow the checklist below.',
      },
      cites: ['S-GH-35'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'धोखाधड़ी अक्सर एक जैसे तरीक़ों से होती है: बढ़ा-चढ़ाकर दाम बताना, "सब्सिडी पक्की दिलाने" का झूठा वादा, किसान से ख़ाली फ़ॉर्म पर दस्तख़त करवा लेना, या बैंक-ऋण की रक़म को बीच में हड़प लेना। सबसे अच्छा बचाव है — हर चीज़ लिखित में लेना, भुगतान केवल बैंक के ज़रिए करना, और किसी भी दावे को स्वयं पोर्टल पर जाँचना। नीचे दी गई जाँच-सूची इन्हीं जोखिमों से बचने के लिए है।',
        en: 'Fraud often follows the same patterns: overstating the price, a false promise to "guarantee subsidy", getting the farmer to sign blank forms, or diverting the bank-loan money midway. The best defence is to get everything in writing, pay only through the bank, and verify every claim yourself on the portal. The checklist below is meant to guard against exactly these risks.',
      },
    },
    {
      type: 'checklist',
      title: { hi: 'पैसा देने से पहले जाँचें (विक्रेता-सुरक्षा 15 बिंदु)', en: 'Check before you pay (15-point vendor safety)' },
      items: [
        { text: { hi: 'विक्रेता का पूरा नाम, पता और GST/पंजीयन विवरण लिखित में माँगें और उसका मिलान करें।', en: 'Get the vendor’s full name, address and GST/registration in writing and cross-check it.' } },
        { text: { hi: 'वर्तमान स्थिति MPFSTS पोर्टल पर स्वयं जाँचें — किसी की ज़ुबानी बात पर भरोसा न करें।', en: 'Check the current status yourself on the MPFSTS portal — do not rely on anyone’s word of mouth.' } },
        { text: { hi: 'कोई भी राशि केवल आधिकारिक/बैंक चैनल से दें; नकद या निजी खाते में भुगतान से बचें।', en: 'Pay only through official/bank channels; avoid cash or private-account payments.' } },
        { text: { hi: 'हर भुगतान की रसीद और लिखित अनुबंध लें; मौखिक वादों पर काम न करें।', en: 'Take a receipt for every payment and a written contract; do not act on verbal promises.' } },
        { text: { hi: 'सब्सिडी "पक्की/गारंटीड" बताने वाले दावों से सावधान रहें — सब्सिडी विभागीय सत्यापन के बाद ही तय होती है।', en: 'Beware of claims that subsidy is "guaranteed" — subsidy is decided only after departmental verification.' } },
        { text: { hi: 'अपने बैंक ऋण के कागज़ ख़ुद पढ़ें; किसी और को ख़ाली फ़ॉर्म पर दस्तख़त करके न दें।', en: 'Read your own loan papers; never hand over signed blank forms to anyone.' } },
        { text: { hi: 'ढाँचे की सामग्री (फ़िल्म, फ़्रेम, जाली) की गुणवत्ता और वारंटी शर्तें पहले से तय करें।', en: 'Fix the quality and warranty terms of the structure material (film, frame, net) in advance.' } },
        { text: { hi: 'भुगतान का शेड्यूल काम की प्रगति से जोड़ें — पूरा पैसा पहले न दें।', en: 'Tie the payment schedule to work progress — do not pay the full amount upfront.' } },
        { text: { hi: 'उसी विक्रेता के पुराने ग्राहकों से बात करके उनका अनुभव पूछें।', en: 'Talk to the vendor’s past customers and ask about their experience.' } },
        { text: { hi: 'किसी भी "बिचौलिए" या एजेंट को किनारे रखकर सीधे विभाग/पोर्टल से पुष्टि करें।', en: 'Set aside any "middleman" or agent and confirm directly with the department/portal.' } },
        { text: { hi: 'अपने सभी दस्तावेज़ और भुगतान की एक प्रति अपने पास सुरक्षित रखें।', en: 'Keep a safe copy of all your documents and payments with you.' } },
        { text: { hi: 'ज़रूरत से ज़्यादा जल्दबाज़ी वाले "ऑफ़र खत्म हो रहा है" दबाव से बचें।', en: 'Avoid high-pressure "offer is ending" urgency tactics.' } },
        { text: { hi: 'ढाँचा खड़ा होने के बाद उसका मौक़े पर सत्यापन ज़रूर करवाएँ।', en: 'Get the structure physically verified on site after it is built.' } },
        { text: { hi: 'कोई गड़बड़ी लगे तो तुरंत उद्यानिकी विभाग और पुलिस/EOW में शिकायत करें।', en: 'If anything seems wrong, immediately complain to the horticulture department and police/EOW.' } },
        { text: { hi: 'याद रखें: किसी भी विक्रेता को "अनुमोदित/सत्यापित/गारंटीड" न मानें — हर चीज़ स्वयं पोर्टल पर जाँचें।', en: 'Remember: do not treat any vendor as "approved/verified/guaranteed" — check everything yourself on the portal.' } },
      ],
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'MP Agro दर-अनुबंध विक्रेता सूची (वर्ष अनुसार)', en: 'MP Agro rate-contract vendor lists (by year)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'दर-अनुबंध (rate-contract) सूची का मतलब केवल इतना है कि किसी वर्ष सरकार ने कुछ विक्रेताओं से तय दरों पर काम करने का अनुबंध किया था। यह किसी विक्रेता की गुणवत्ता की गारंटी नहीं है, और न ही इसका मतलब है कि वह आज भी उस सूची में है। सूची पुरानी हो सकती है; विक्रेता बदल सकते हैं। इसलिए किसी भी नाम को देखकर यह न मान लें कि वह "अनुमोदित" है — उसकी वर्तमान स्थिति हमेशा आधिकारिक पोर्टल पर स्वयं जाँचें।',
        en: 'A rate-contract list only means that in some year the government contracted certain vendors to work at fixed rates. It is not a guarantee of any vendor’s quality, nor does it mean they are still on that list today. The list can be outdated; vendors can change. So do not assume any name is "approved" just by seeing it — always verify its current status yourself on the official portal.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे MP Agro की दर-अनुबंध (rate-contract) विक्रेता सूचियाँ वर्ष के अनुसार दी गई हैं। हर सूची केवल उस वर्ष की है — वर्तमान स्थिति MPFSTS पोर्टल पर जाँचें। 2025-26 या 2026-27 की कोई सूची अभी प्रकाशित नहीं है।',
        en: 'Below are MP Agro’s rate-contract vendor lists by year. Each list is only for that year — check current status on the MPFSTS portal. No 2025-26 or 2026-27 list is posted.',
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
      type: 'paragraph',
      text: {
        hi: 'कुछ विक्रेता MP Agro की दर-अनुबंध सूची में शामिल होने के वर्षों का दावा कर सकते हैं — ऐसे किसी भी दावे को स्वयं MPFSTS पोर्टल पर सत्यापित करें। किसी भी विक्रेता को "अनुमोदित" मानकर आँख मूँदकर भरोसा न करें।',
        en: 'Some vendors may claim years of being in the MP Agro rate-contract list — verify any such claim yourself on the MPFSTS portal. Do not blindly trust any vendor as "approved".',
      },
    },

    {
      type: 'paragraph',
      text: {
        hi: 'अंत में, एक सरल सलाह: संरक्षित खेती को एक व्यवसाय की तरह लें, शौक़ की तरह नहीं। अपनी लागत, अपेक्षित आय, जोखिम और वापसी के समय का ईमानदारी से हिसाब लगाएँ। परिवार और बैंक से खुलकर बात करें, और उतना ही क़र्ज़ लें जितना आप चुका सकें। अनुभवी किसानों का समूह बनाकर जानकारी और मंडी की जानकारी साझा करने से जोखिम घटता है। सही जानकारी, धैर्य और सतर्कता — यही इस खेती की असली पूँजी है।',
        en: 'Finally, a simple piece of advice: treat protected cultivation as a business, not a hobby. Honestly work out your cost, expected income, risk and payback period. Talk openly with family and the bank, and borrow only what you can repay. Forming a group of experienced farmers to share knowledge and market information reduces risk. Right information, patience and vigilance — that is the real capital of this kind of farming.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
    },
    {
      type: 'faq',
      faqs: [
        { q: { hi: 'पॉलीहाउस क्या होता है?', en: 'What is a polyhouse?' }, a: { hi: 'पॉलीहाउस एक पारदर्शी प्लास्टिक शीट से ढका ढाँचा है जिसमें फसल को मौसम, कीट और तापमान की मार से बचाकर उगाया जाता है। यह संरक्षित खेती का एक सामान्य प्रकार है।', en: 'A polyhouse is a structure covered with clear plastic sheet where crops are grown protected from weather, pests and temperature. It is a common form of protected cultivation.' } },
        { q: { hi: 'मध्य प्रदेश राज्य योजना में पॉलीहाउस पर कितनी सब्सिडी मिलती है?', en: 'How much subsidy does the MP state scheme give on a polyhouse?' }, a: { hi: 'राज्य योजना में NVPH के लागत मानक पर 50% सब्सिडी मिलती है — प्रति वर्ग मीटर ₹530 (≤500 वर्ग मीटर) से घटकर ₹422 (2,080–4,000 वर्ग मीटर) तक।', en: 'The state scheme gives 50% subsidy on the NVPH cost norm — from ₹530/m² (≤500 m²) down to ₹422/m² (2,080–4,000 m²).' }, cites: ['S-GH-14', 'S-GH-38'] },
        { q: { hi: 'लागत मानक क्षेत्रफल के साथ क्यों घटता है?', en: 'Why does the cost norm fall with area?' }, a: { hi: 'बड़े ढाँचे की प्रति वर्ग मीटर लागत कम होती है। इसलिए मानक ≤500 वर्ग मीटर पर ₹1,060, और 2,080–4,000 वर्ग मीटर पर ₹844 है।', en: 'Larger structures cost less per m². So the norm is ₹1,060 at ≤500 m² and ₹844 at 2,080–4,000 m².' }, cites: ['S-GH-14', 'S-GH-38'] },
        { q: { hi: '4,000 वर्ग मीटर पॉलीहाउस पर राज्य योजना में कितनी सब्सिडी बनेगी?', en: 'What subsidy does a 4,000 m² polyhouse get in the state scheme?' }, a: { hi: '₹844 प्रति वर्ग मीटर मानक पर: 4,000 × ₹844 × 50% = ₹16,88,000 सब्सिडी। बाक़ी हिस्सा किसान वहन करता है।', en: 'At the ₹844/m² norm: 4,000 × ₹844 × 50% = ₹16,88,000 subsidy. The farmer bears the rest.' }, cites: ['S-GH-14'] },
        { q: { hi: 'MIDH योजना क्या देती है?', en: 'What does MIDH give?' }, a: { hi: 'MIDH संरक्षित खेती पर 50% सहायता देता है, जो प्रति लाभार्थी अधिकतम 4,000 वर्ग मीटर तक सीमित है। यह केंद्रीय योजना है।', en: 'MIDH gives 50% assistance for protected cultivation, up to 4,000 m² per beneficiary. It is a central scheme.' }, cites: ['S-GH-01'] },
        { q: { hi: 'NHB योजना में क्या बदला है?', en: 'What changed in the NHB scheme?' }, a: { hi: 'NHB की केंद्रीय योजना में सहायता 50% से घटाकर 35% कर दी गई है (संशोधित दिशानिर्देश 21 अगस्त 2026)। यह MP राज्य योजना से अलग है।', en: 'In the NHB central scheme, assistance was cut from 50% to 35% (revised guidelines dated 21 August 2026). It is separate from the MP state scheme.' }, cites: ['S-GH-34'] },
        { q: { hi: 'क्या मैं राज्य और NHB दोनों की सब्सिडी एक साथ जोड़ सकता हूँ?', en: 'Can I combine state and NHB subsidy?' }, a: { hi: 'नहीं — ये अलग-अलग योजनाएँ हैं। इन्हें मिलाकर न पढ़ें; पात्रता और शर्तें पोर्टल/विभाग से जाँचें।', en: 'No — these are separate schemes. Do not read them as one; check eligibility and conditions with the portal/department.' }, cites: ['S-GH-27'] },
        { q: { hi: 'ड्रिप सिंचाई पर कितनी सहायता मिलती है?', en: 'How much assistance for drip irrigation?' }, a: { hi: 'PMKSY में छोटे व सीमांत किसानों को 55% और अन्य किसानों को 45% सहायता मिलती है।', en: 'Under PMKSY, small/marginal farmers get 55% and others get 45%.' }, cites: ['S-GH-02', 'S-GH-18'] },
        { q: { hi: 'बड़े खर्च के लिए ऋण पर कोई राहत है?', en: 'Any relief on loans for big spends?' }, a: { hi: 'हाँ — कृषि अवसंरचना कोष (AIF) ₹2 करोड़ तक के ऋण पर 3% ब्याज अनुदान देता है।', en: 'Yes — the Agriculture Infrastructure Fund (AIF) gives 3% interest subvention on loans up to ₹2 crore.' }, cites: ['S-GH-03'] },
        { q: { hi: 'पॉलीहाउस में कितनी पैदावार बढ़ सकती है?', en: 'How much can yield increase in a polyhouse?' }, a: { hi: 'फसल के हिसाब से पैदावार खुली खेती से 3 से 10 गुना तक हो सकती है — यह सामान्य अनुमान है, गारंटी नहीं।', en: 'Depending on the crop, yields can be 3 to 10 times open cultivation — a general estimate, not a guarantee.' }, cites: ['S-GH-24'] },
        { q: { hi: 'ICAR के अनुसार मध्य प्रदेश में कितनी आय संभव है?', en: 'What income does ICAR report for MP?' }, a: { hi: 'ICAR के अनुसार 2,000–4,000 वर्ग मीटर के ढाँचों में आधे से एक एकड़ से एक सीज़न में लगभग ₹2–5 लाख शुद्ध आय संभव बताई गई है। गारंटी नहीं।', en: 'Per ICAR, structures of 2,000–4,000 m² can give about ₹2–5 lakh net per season from half-to-one acre. Not a guarantee.' }, cites: ['S-GH-21'] },
        { q: { hi: 'रंगीन शिमला मिर्च का ICAR उदाहरण क्या है?', en: 'What is the ICAR capsicum example?' }, a: { hi: 'ICAR के एक उदाहरण में 3,000 वर्ग मीटर पॉलीहाउस की लागत ₹35 लाख, सब्सिडी ₹11 लाख, सकल लगभग ₹20 लाख और शुद्ध लगभग ₹15 लाख रही। यह उदाहरण है, गारंटी नहीं।', en: 'In an ICAR example, a 3,000 m² polyhouse cost ₹35 lakh, got ₹11 lakh subsidy, with about ₹20 lakh gross and ₹15 lakh net. An example, not a guarantee.' }, cites: ['S-GH-22'] },
        { q: { hi: 'बुंदेलखंड में कौन-सी फसलें पॉलीहाउस के लिए अच्छी हैं?', en: 'Which crops suit a polyhouse in Bundelkhand?' }, a: { hi: 'आमतौर पर रंगीन शिमला मिर्च, टमाटर, खीरा और पत्तेदार सब्ज़ियाँ उगाई जाती हैं।', en: 'Commonly coloured capsicum, tomato, cucumber and leafy greens.' } },
        { q: { hi: 'आवेदन कहाँ से करूँ?', en: 'Where do I apply?' }, a: { hi: 'आधिकारिक MPFSTS पोर्टल (mpfsts.mp.gov.in/mphd) से। दिशानिर्देश और किसान मैनुअल भी वहीं उपलब्ध हैं।', en: 'From the official MPFSTS portal (mpfsts.mp.gov.in/mphd). Guidelines and the farmer manual are also there.' }, cites: ['S-GH-27', 'S-GH-28', 'S-GH-29'] },
        { q: { hi: 'चयन होने के बाद दस्तावेज़ कब तक अपलोड करने होते हैं?', en: 'After selection, by when must I upload documents?' }, a: { hi: 'पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित नियम के अनुसार, चयनित किसानों को 5 दिनों के भीतर दस्तावेज़ अपलोड करने होते हैं — पुनः जाँचें।', en: 'Per the rule displayed on the portal on 5 October 2026, selected farmers must upload documents within 5 days — re-check.' }, cites: ['S-GH-27'] },
        { q: { hi: 'वर्क ऑर्डर कब रद्द हो जाता है?', en: 'When does the work order get cancelled?' }, a: { hi: 'पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित नियम के अनुसार, यदि विक्रेता 7 दिनों के भीतर किसान के अंश की पुष्टि नहीं करता तो वर्क ऑर्डर अपने-आप रद्द हो जाता है — पुनः जाँचें।', en: 'Per the rule displayed on the portal on 5 October 2026, the work order auto-cancels if the vendor does not confirm the farmer’s share within 7 days — re-check.' }, cites: ['S-GH-27'] },
        { q: { hi: 'क्या अभी लॉटरी/आशय-पत्र प्रक्रिया चल रही है?', en: 'Is the lottery/letter-of-intent process running now?' }, a: { hi: 'पोर्टल पर 5 अक्टूबर 2026 को प्रदर्शित के अनुसार, क्लस्टर-आधारित लक्ष्य आवंटन के लिए लॉटरी/आशय-पत्र प्रक्रिया फ़िलहाल अस्थायी रूप से रोकी गई है — पुनः जाँचें।', en: 'Per what is displayed on the portal on 5 October 2026, the lottery/letter-of-intent process is temporarily paused for cluster-based target allocation — re-check.' }, cites: ['S-GH-27'] },
        { q: { hi: 'MP Agro विक्रेता सूची कहाँ देखूँ?', en: 'Where do I see the MP Agro vendor list?' }, a: { hi: 'MPFSTS पोर्टल पर MP Agro दर-अनुबंध सूची (mpfsts.mp.gov.in/mphd/#/MPAgroVendorList) में। 2025-26 या 2026-27 की कोई सूची अभी प्रकाशित नहीं है।', en: 'On the MPFSTS portal’s MP Agro vendor list (mpfsts.mp.gov.in/mphd/#/MPAgroVendorList). No 2025-26 or 2026-27 list is posted.' }, cites: ['S-GH-33'] },
        { q: { hi: 'क्या कोई विक्रेता "अनुमोदित/गारंटीड" होता है?', en: 'Is any vendor "approved/guaranteed"?' }, a: { hi: 'नहीं — किसी भी विक्रेता को अनुमोदित, सत्यापित या गारंटीड न मानें। हर दावा स्वयं MPFSTS पोर्टल पर जाँचें।', en: 'No — do not treat any vendor as approved, verified or guaranteed. Verify every claim yourself on the MPFSTS portal.' }, cites: ['S-GH-33'] },
        { q: { hi: 'पॉलीहाउस-ऋण धोखाधड़ी का हाल का मामला क्या है?', en: 'What is the recent polyhouse-loan fraud case?' }, a: { hi: 'सितंबर 2026 में खरगोन (MP) में EOW ने FIR दर्ज की — 33 किसान प्रभावित और लगभग ₹9.7 करोड़ की हेराफेरी। इसलिए भुगतान से पहले विक्रेता की पूरी जाँच करें।', en: 'In September 2026 in Khargone (MP), the EOW filed an FIR — 33 farmers affected and about ₹9.7 crore. So fully verify the vendor before paying.' }, cites: ['S-GH-35'] },
        { q: { hi: 'धोखाधड़ी से बचने का सबसे ज़रूरी कदम क्या है?', en: 'What is the single most important step to avoid fraud?' }, a: { hi: 'पैसा केवल बैंक/आधिकारिक चैनल से दें, हर भुगतान की रसीद लें, और वर्तमान स्थिति स्वयं MPFSTS पोर्टल पर जाँचें — किसी एजेंट की ज़ुबानी बात पर भरोसा न करें।', en: 'Pay only through bank/official channels, take a receipt for every payment, and verify current status yourself on the MPFSTS portal — do not rely on any agent’s word.' }, cites: ['S-GH-27'] },
        { q: { hi: 'कौन-सा ढाँचा मेरे लिए सही है?', en: 'Which structure is right for me?' }, a: { hi: 'यह आपकी फसल, बजट, पानी और जलवायु पर निर्भर करता है। महँगा फैन-पैड हर किसी के लिए ज़रूरी नहीं; साधारण पॉलीहाउस या शेड-नेट अक्सर किफ़ायती रहता है। विभाग और पास के किसानों से सलाह लें।', en: 'It depends on your crop, budget, water and climate. A costly fan-pad is not for everyone; a simple polyhouse or shade-net is often cheaper. Consult the department and nearby farmers.' } },
      ],
    },
  ],
}

export default greenhousePage
