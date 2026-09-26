// Phase 2b/2e content seed — two verified MP horticulture schemes + the intercropping
// article. Idempotent (upsert on slug). Run: node --env-file=.env scripts/seed_agroforestry.mjs
// Sources are recorded per-scheme (myScheme.gov.in) and in the article's references section.
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const TODAY = '2026-09-26'

// ---------------------------------------------------------------------------
// 2b — Two real, verified MP horticulture schemes (facts limited to what is
// stated in the prompt + confirmed on myScheme.gov.in — no invented figures).
// ---------------------------------------------------------------------------
const schemes = [
  {
    slug: 'fal-podharopan-yojana',
    scheme_name_hi: 'फल पौधरोपण योजना',
    scheme_name_en: 'Fal Podharopan Yojana (Fruit Plantation Scheme)',
    ministry_hi: 'उद्यानिकी एवं खाद्य प्रसंस्करण विभाग, मध्यप्रदेश शासन',
    ministry_en: 'Horticulture and Food Processing Department, Govt of Madhya Pradesh',
    category: 'horticulture',
    government_level: 'state',
    description_hi:
      'फल पौधरोपण योजना मध्यप्रदेश सरकार की उद्यानिकी योजना है, जिसमें किसानों को फल के पौधे लगाने की लागत पर 40 से 50 प्रतिशत तक अनुदान दिया जाता है। यह अनुदान तीन वर्षों में 60:20:20 के अनुपात में दिया जाता है, और 0.25 से 4 हेक्टेयर तक के क्षेत्र के लिए उपलब्ध है।',
    description_en:
      'Fal Podharopan Yojana is a Madhya Pradesh horticulture scheme that gives farmers a 40–50% subsidy on the cost of planting fruit saplings. The subsidy is disbursed over three years in a 60:20:20 ratio, for land areas of 0.25 to 4 hectares.',
    benefit_hi:
      'फल के पौधे लगाने की इकाई लागत पर 40–50% तक अनुदान। राशि तीन वर्षों में 60:20:20 के अनुपात में दी जाती है (पहले वर्ष 60%, दूसरे व तीसरे वर्ष 20%–20%) ताकि पौधों की देखभाल जारी रहे।',
    benefit_en:
      'A 40–50% subsidy on the unit cost of planting fruit saplings, paid over three years in a 60:20:20 ratio (60% in year one, 20% each in years two and three) so that upkeep continues.',
    eligibility_hi:
      'मध्यप्रदेश का किसान; अपनी निजी कृषि भूमि हो; सिंचाई की व्यवस्था हो; रोपण क्षेत्र 0.25 से 4 हेक्टेयर के बीच हो; फल की खेती में रुचि हो।',
    eligibility_en:
      'A Madhya Pradesh farmer; owns private agricultural land; has irrigation; the plantation area is between 0.25 and 4 hectares; interested in fruit cultivation.',
    how_to_apply_hi:
      '1. मध्यप्रदेश उद्यानिकी विभाग के किसान पोर्टल (mpfsts) पर आधार से पंजीकरण करें।\n2. फल पौधरोपण योजना चुनें और अपनी जानकारी भरें।\n3. भूमि व सिंचाई के दस्तावेज़ अपलोड करें।\n4. आवेदन जमा करें और पंजीयन क्रमांक संभालकर रखें।\n5. चयन/सत्यापन के बाद पौधरोपण करें; अनुदान डीबीटी से खाते में आता है। सटीक प्रक्रिया व तिथियों के लिए विभागीय पोर्टल देखें।',
    how_to_apply_en:
      '1. Register with Aadhaar on the MP Horticulture farmer portal (mpfsts).\n2. Select Fal Podharopan Yojana and fill your details.\n3. Upload land and irrigation documents.\n4. Submit the application and keep the registration number.\n5. After selection/verification, do the plantation; the subsidy comes via DBT. Check the department portal for the exact process and dates.',
    documents_required_hi: 'आधार कार्ड, भूमि के दस्तावेज़ (खसरा/खतौनी/बी-1), सिंचाई का प्रमाण, बैंक पासबुक की प्रति, जाति प्रमाण-पत्र (यदि लागू हो)',
    documents_required_en: 'Aadhaar card, land records (Khasra/Khatauni/B-1), proof of irrigation, copy of bank passbook, caste certificate (if applicable)',
    official_website: 'https://mphorticulture.gov.in/',
    source_url: 'https://www.myscheme.gov.in/schemes/fpy',
    helpline: null,
    is_active: true,
    is_featured: false,
    sort_order: 40,
    last_verified_date: TODAY,
    faqs: [
      { q_hi: 'कितना अनुदान मिलता है?', q_en: 'How much subsidy is given?', a_hi: 'फल के पौधे लगाने की इकाई लागत पर 40 से 50 प्रतिशत तक अनुदान मिलता है, जो तीन वर्षों में 60:20:20 के अनुपात में दिया जाता है।', a_en: 'A 40–50% subsidy on the unit cost of planting fruit saplings, paid over three years in a 60:20:20 ratio.' },
      { q_hi: 'कितने क्षेत्र के लिए लाभ मिलता है?', q_en: 'What land area is covered?', a_hi: 'यह योजना 0.25 हेक्टेयर से 4 हेक्टेयर तक के रोपण क्षेत्र के लिए उपलब्ध है।', a_en: 'The scheme is available for a plantation area of 0.25 to 4 hectares.' },
      { q_hi: 'अनुदान तीन साल में क्यों बंटता है?', q_en: 'Why is the subsidy split over three years?', a_hi: 'राशि 60:20:20 के अनुपात में इसलिए दी जाती है ताकि किसान पौधों को शुरुआती वर्षों में जीवित और स्वस्थ रखें — केवल लगाने पर नहीं, बल्कि उनके पनपने पर ज़ोर रहता है।', a_en: 'The 60:20:20 split ensures farmers keep the saplings alive and healthy in the early years — the emphasis is on survival, not just planting.' },
      { q_hi: 'आवेदन कहां करें?', q_en: 'Where do I apply?', a_hi: 'मध्यप्रदेश उद्यानिकी विभाग के किसान पोर्टल पर ऑनलाइन आवेदन करें। सटीक प्रक्रिया व तिथि के लिए विभागीय पोर्टल और myScheme पर जानकारी देखें।', a_en: 'Apply online on the MP Horticulture farmer portal. Check the department portal and myScheme for the exact process and dates.' },
    ],
  },
  {
    slug: 'aushadhi-sugandhit-fasal-vistar',
    scheme_name_hi: 'औषधि एवं सुगंधित फसल क्षेत्र विस्तार',
    scheme_name_en: 'Aushadhi Avam Sugandhit Fasal Shetra Vistar (Medicinal & Aromatic Crop Area Expansion)',
    ministry_hi: 'उद्यानिकी एवं खाद्य प्रसंस्करण विभाग, मध्यप्रदेश शासन',
    ministry_en: 'Horticulture and Food Processing Department, Govt of Madhya Pradesh',
    category: 'horticulture',
    government_level: 'state',
    description_hi:
      'इस योजना में किसानों को औषधीय एवं सुगंधित फसलों की खेती का क्षेत्र बढ़ाने के लिए 20 से 50 प्रतिशत तक अनुदान दिया जाता है। इसमें आँवला, अश्वगंधा, बेल, कालियास, गुड़मार, कालमेघ, सफेद मूसली, सर्पगंधा, सतावर और तुलसी जैसी फसलें शामिल हैं।',
    description_en:
      'This scheme gives farmers a 20–50% subsidy to expand the cultivation area of medicinal and aromatic crops, including Amla, Ashwagandha, Bel, Kaliyas, Gudmar, Kalmegh, Safed Musli, Sarpagandha, Satavar and Tulsi.',
    benefit_hi: 'औषधीय एवं सुगंधित फसलों की खेती के विस्तार पर 20 से 50 प्रतिशत तक अनुदान।',
    benefit_en: 'A 20–50% subsidy on expanding the cultivation of medicinal and aromatic crops.',
    eligibility_hi: 'मध्यप्रदेश का किसान; अपनी कृषि भूमि हो; औषधीय/सुगंधित फसल उगाने में रुचि हो। पात्रता व शर्तों की पुष्टि विभागीय पोर्टल से करें।',
    eligibility_en: 'A Madhya Pradesh farmer; owns agricultural land; interested in growing medicinal/aromatic crops. Confirm eligibility and conditions on the department portal.',
    how_to_apply_hi:
      '1. मध्यप्रदेश उद्यानिकी विभाग के किसान पोर्टल पर आधार से पंजीकरण करें।\n2. औषधि एवं सुगंधित फसल योजना चुनें और फसल का चयन करें।\n3. भूमि के दस्तावेज़ अपलोड करें और आवेदन जमा करें।\n4. सत्यापन के बाद अनुदान डीबीटी से मिलता है। सटीक प्रक्रिया व तिथियों के लिए विभागीय पोर्टल देखें।',
    how_to_apply_en:
      '1. Register with Aadhaar on the MP Horticulture farmer portal.\n2. Select the medicinal & aromatic crops scheme and choose the crop.\n3. Upload land documents and submit the application.\n4. After verification the subsidy comes via DBT. Check the department portal for the exact process and dates.',
    documents_required_hi: 'आधार कार्ड, भूमि के दस्तावेज़ (खसरा/खतौनी/बी-1), बैंक पासबुक की प्रति, जाति प्रमाण-पत्र (यदि लागू हो)',
    documents_required_en: 'Aadhaar card, land records (Khasra/Khatauni/B-1), copy of bank passbook, caste certificate (if applicable)',
    official_website: 'https://mphorticulture.gov.in/',
    source_url: 'https://www.myscheme.gov.in/',
    helpline: null,
    is_active: true,
    is_featured: false,
    sort_order: 41,
    last_verified_date: TODAY,
    faqs: [
      { q_hi: 'कितना अनुदान मिलता है?', q_en: 'How much subsidy is given?', a_hi: 'औषधीय एवं सुगंधित फसलों की खेती के विस्तार पर 20 से 50 प्रतिशत तक अनुदान मिलता है। सटीक दर फसल पर निर्भर करती है।', a_en: 'A 20–50% subsidy on expanding cultivation of medicinal and aromatic crops. The exact rate depends on the crop.' },
      { q_hi: 'कौन सी फसलें शामिल हैं?', q_en: 'Which crops are covered?', a_hi: 'आँवला, अश्वगंधा, बेल, कालियास, गुड़मार, कालमेघ, सफेद मूसली, सर्पगंधा, सतावर और तुलसी।', a_en: 'Amla, Ashwagandha, Bel, Kaliyas, Gudmar, Kalmegh, Safed Musli, Sarpagandha, Satavar and Tulsi.' },
      { q_hi: 'आवेदन कहां करें?', q_en: 'Where do I apply?', a_hi: 'मध्यप्रदेश उद्यानिकी विभाग के किसान पोर्टल पर ऑनलाइन आवेदन करें; सटीक प्रक्रिया व तिथि के लिए विभागीय पोर्टल देखें।', a_en: 'Apply online on the MP Horticulture farmer portal; check the department portal for the exact process and dates.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// 2e — The intercropping article (Hindi primary + English). Question-shaped H2s
// (## ...?) are rendered as headings AND become FAQPage entries in ArticleDetail.
// ---------------------------------------------------------------------------
const author = 'लेखक: श्री ए.के. दीक्षित, सेवानिवृत्त वन विभाग अधिकारी'

const content_hi = `${author}

इंटरक्रॉपिंग यानी अंतरवर्ती खेती एक पुरानी लेकिन बेहद उपयोगी पद्धति है, जिसमें किसान एक ही खेत में एक ही समय पर एक से अधिक फसलें एक तय कतार-अनुपात में उगाता है। मध्यप्रदेश की वर्षा-आधारित और सीमित सिंचाई वाली परिस्थितियों में यह पद्धति भूमि, पानी और मेहनत का बेहतर उपयोग करने तथा जोखिम घटाने में मदद करती है। यह लेख सरल भाषा में बताता है कि अंतरवर्ती खेती क्या है, कौन-सी फसलें साथ लगाई जा सकती हैं, इसके क्या लाभ हैं, और मध्यप्रदेश के लिए कौन-से संयोजन उपयुक्त माने गए हैं।

## इंटरक्रॉपिंग (अंतरवर्ती खेती) क्या है?

अंतरवर्ती खेती में मुख्य फसल की कतारों के बीच एक दूसरी फसल तय अनुपात में उगाई जाती है — जैसे एक फसल की दो कतारें और दूसरी की चार कतारें (2:4)। दोनों फसलें अलग-अलग गहराई से पानी और पोषक तत्व लेती हैं और अलग-अलग समय पर बढ़ती हैं, इसलिए वे आपस में कम प्रतिस्पर्धा करती हैं। मिश्रित खेती (जहाँ बीज बिना कतार के मिला दिए जाते हैं) से यह अलग है, क्योंकि इसमें कतार और अनुपात तय रहता है, जिससे निराई, छिड़काव और कटाई आसान रहती है।

## कौन सी फसलें साथ में लगाई जा सकती हैं?

आमतौर पर एक लंबी अवधि/धीमी बढ़ने वाली फसल के साथ एक जल्दी पकने वाली फसल लगाई जाती है, ताकि पहली फसल जब तक पूरा खेत घेरे, तब तक दूसरी की उपज मिल चुकी हो। अरहर (तूअर) के साथ जल्दी पकने वाली दलहन जैसे मूँग, उड़द, सोयाबीन, लोबिया और मूँगफली उपयुक्त मानी जाती हैं। दलहन फसलें हवा से नाइट्रोजन लेकर मिट्टी में स्थिर करती हैं, इसलिए इन्हें अनाज या तिलहन के साथ मिलाना विशेष रूप से लाभकारी होता है।

## इसके क्या फायदे हैं?

पहला, भूमि का बेहतर उपयोग — एक ही खेत से दो उपज मिलती हैं, और भूमि-समतुल्य अनुपात (LER) प्रायः एक से अधिक हो जाता है, यानी अलग-अलग बोने की तुलना में कुल उपज बढ़ती है। दूसरा, दलहन के कारण मिट्टी में नाइट्रोजन बढ़ता है और अगली फसल को लाभ मिलता है। तीसरा, आय के एक से अधिक स्रोत बनते हैं। चौथा, जोखिम घटता है — यदि मौसम या बाज़ार के कारण एक फसल कमज़ोर रहे, तो दूसरी सहारा देती है। इसके अलावा ज़मीन ढकी रहने से खरपतवार और मिट्टी का कटाव भी कम होता है।

## मध्यप्रदेश में कौन से संयोजन उपयुक्त हैं?

मध्यप्रदेश सोयाबीन और अरहर का बड़ा क्षेत्र है, इसलिए सोयाबीन + अरहर यहाँ का एक प्रचलित और परखा हुआ संयोजन है; कृषि अनुसंधान संस्थानों की प्रदर्शनियों में इस संयोजन से अकेली फसल की तुलना में अधिक कुल उपज और शुद्ध आय दर्ज की गई है। इसके अलावा अरहर + मूँग (2:2), और अरहर + बाजरा जैसे संयोजन भी अध्ययनों में उपयोगी पाए गए हैं। सही अनुपात, कतार की दूरी और किस्म का चुनाव अपने क्षेत्र के कृषि विज्ञान केंद्र (KVK) या जवाहरलाल नेहरू कृषि विश्वविद्यालय (JNKVV) की सलाह से करें।

## एग्रो फॉरेस्ट्री (कृषि-वानिकी) से इसका क्या संबंध है?

जब फसलों के साथ पेड़ भी शामिल कर लिए जाते हैं, तो इसे कृषि-वानिकी (एग्रो फॉरेस्ट्री) कहते हैं — यह अंतरवर्ती खेती का ही एक विस्तृत रूप है। खेत की मेड़ों या कतारों में लगाए गए पेड़ लकड़ी, चारा, फल और छाया देते हैं, हवा से मिट्टी की रक्षा करते हैं, और लंबे समय में अतिरिक्त आय का स्रोत बनते हैं। शुरुआती वर्षों में जब पेड़ छोटे होते हैं, तब उनके बीच की खाली जगह में हल्दी, अदरक या दलहन जैसी फसलें उगाकर ज़मीन का पूरा उपयोग किया जा सकता है।

## बोआई और देखभाल में क्या ध्यान रखें?

तय कतार-अनुपात का पालन करें और मुख्य फसल की आबादी कम न करें। दोनों फसलों की खाद और पानी की ज़रूरत के अनुसार प्रबंधन करें। कीट व रोग की निगरानी रखें, क्योंकि दो फसलों में समस्याएँ अलग हो सकती हैं। बीज, किस्म और अनुदान की ताज़ा जानकारी के लिए अपने KVK या उद्यानिकी/कृषि विभाग से संपर्क करें।

## स्रोत और संदर्भ

- भारतीय कृषि अनुसंधान परिषद (ICAR) एवं ICAR–भारतीय सोयाबीन अनुसंधान संस्थान, इंदौर — सोयाबीन आधारित अंतरवर्ती खेती।
- जवाहरलाल नेहरू कृषि विश्वविद्यालय (JNKVV), जबलपुर — मध्यप्रदेश हेतु फसल संयोजन एवं सिफ़ारिशें।
- ICAR–केंद्रीय कृषि-वानिकी अनुसंधान संस्थान (CAFRI), झाँसी — कृषि-वानिकी पद्धतियाँ।
- अरहर आधारित अंतरवर्ती प्रणाली पर शोध: researchgate.net (Pigeonpea based intercropping systems)।

नोट: अनुदान की दरें, पात्रता और तिथियाँ समय-समय पर बदलती हैं — आवेदन से पहले सरकारी पोर्टल पर पुष्टि करें।`

const content_en = `${author}

Intercropping is an old but very useful practice in which a farmer grows more than one crop on the same field at the same time, in a fixed row ratio. In Madhya Pradesh's rainfed and limited-irrigation conditions, it helps make better use of land, water and labour, and reduces risk. This article explains, in simple terms, what intercropping is, which crops can be grown together, its benefits, and which combinations are considered suitable for Madhya Pradesh.

## What is intercropping?

In intercropping a second crop is grown between the rows of the main crop in a fixed ratio — for example two rows of one crop and four of another (2:4). The two crops draw water and nutrients from different depths and grow at different times, so they compete less with each other. It differs from mixed cropping (where seeds are simply mixed without rows) because the rows and ratio are fixed, which keeps weeding, spraying and harvesting easier.

## Which crops can be grown together?

Usually a long-duration/slow-growing crop is paired with a quick-maturing one, so the second crop is harvested before the first covers the whole field. Pigeonpea (arhar/tur) pairs well with short-duration pulses such as green gram (moong), black gram (urad), soybean, cowpea and groundnut. Pulses fix nitrogen from the air into the soil, so pairing them with a cereal or oilseed is especially beneficial.

## What are the benefits?

First, better land use — two harvests from one field, and the Land Equivalent Ratio (LER) is often greater than one, meaning higher total yield than growing them separately. Second, pulses raise soil nitrogen, helping the next crop. Third, more than one source of income. Fourth, lower risk — if one crop is weak due to weather or the market, the other cushions it. A covered soil also means fewer weeds and less erosion.

## Which combinations are suitable in Madhya Pradesh?

Madhya Pradesh has a large area under soybean and pigeonpea, so soybean + pigeonpea is a common, well-tested combination here; in demonstrations by agricultural research institutes this combination recorded higher total yield and net income than the sole crop. Combinations such as pigeonpea + green gram (2:2) and pigeonpea + pearl millet have also been found useful in studies. Choose the right ratio, row spacing and variety with advice from your local Krishi Vigyan Kendra (KVK) or Jawaharlal Nehru Krishi Vishwavidyalaya (JNKVV).

## How is it related to agroforestry?

When trees are also included with the crops, it is called agroforestry — a broader form of intercropping. Trees planted on field bunds or in rows give timber, fodder, fruit and shade, protect the soil from wind, and become a source of extra income over time. In the early years when the trees are small, the empty space between them can be used to grow crops like turmeric, ginger or pulses, using the land fully.

## What to keep in mind while sowing and caring?

Follow the fixed row ratio and do not reduce the main crop's population. Manage fertiliser and water according to both crops' needs. Watch for pests and diseases, since two crops can have different problems. For the latest seed, variety and subsidy information, contact your KVK or the Horticulture/Agriculture Department.

## Sources and references

- Indian Council of Agricultural Research (ICAR) and ICAR–Indian Institute of Soybean Research, Indore — soybean-based intercropping.
- Jawaharlal Nehru Krishi Vishwavidyalaya (JNKVV), Jabalpur — crop combinations and recommendations for Madhya Pradesh.
- ICAR–Central Agroforestry Research Institute (CAFRI), Jhansi — agroforestry practices.
- Research on pigeonpea-based intercropping systems: researchgate.net.

Note: subsidy rates, eligibility and dates change from time to time — confirm on the official government portal before applying.`

const article = {
  slug: 'intercropping-madhya-pradesh',
  title_hi: 'इंटरक्रॉपिंग (अंतरवर्ती खेती): मध्यप्रदेश के किसानों के लिए व्यावहारिक मार्गदर्शिका',
  title_en: 'Intercropping: A Practical Guide for Madhya Pradesh Farmers',
  summary_hi:
    'इंटरक्रॉपिंग यानी एक ही खेत में एक ही समय पर दो या अधिक फसलें एक तय कतार-अनुपात में उगाना। मध्यप्रदेश में सोयाबीन के साथ अरहर, और अरहर के साथ मूँग या उड़द जैसे संयोजन परखे गए हैं। इससे भूमि का बेहतर उपयोग होता है, दलहन मिट्टी में नाइट्रोजन बढ़ाती है, आय के एक से अधिक स्रोत बनते हैं, और एक फसल कमज़ोर रहने पर दूसरी सहारा देकर जोखिम घटाती है।',
  summary_en:
    'Intercropping means growing two or more crops on the same field at the same time in a fixed row ratio. In Madhya Pradesh, combinations such as soybean with pigeonpea, and pigeonpea with green gram or black gram, are well tested. It improves land use, pulses raise soil nitrogen, it creates more than one income source, and if one crop is weak the other cushions the risk.',
  content_hi,
  content_en,
  author_name: 'श्री ए.के. दीक्षित',
  cover_image_url: '/images/agroforestry/agroforestry-turmeric.jpg',
  is_published: true,
  published_at: new Date().toISOString(),
}

async function main() {
  for (const s of schemes) {
    const { error } = await db.from('sarkari_yojana').upsert(s, { onConflict: 'slug' })
    console.log(error ? `FAIL scheme ${s.slug}: ${error.message}` : `ok scheme ${s.slug}`)
  }
  const { error: aErr } = await db.from('articles').upsert(article, { onConflict: 'slug' })
  console.log(aErr ? `FAIL article: ${aErr.message}` : `ok article ${article.slug}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
