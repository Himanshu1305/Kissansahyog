// Batch 4 item D — public category landing pages (/bazaar and /bazaar/<slug>).
// SEO/discovery pages that send people into Browse and Post. Marketplace-usage text
// only — NO agronomic or legal facts (so no cites needed). Hindi written first, English
// written separately from the same points. This file is under src/content/ (bilingual
// data layer), so Devanagari is allowed. Each category page has ≥250 words of
// category-specific Hindi and a separate English version (not a template with the name
// swapped). `cat` is the listings category used in /browse?cat= and /post?cat=.

// Categories that already have a dedicated marketplace page — the hub links to those,
// it does NOT duplicate them.
export const BAZAAR_DEDICATED = [
  { to: '/cold-storage', icon: '❄️', hi: { name: 'गोदाम और कोल्ड स्टोरेज', line: 'फसल सुरक्षित रखने की जगह खोजें या दें।' }, en: { name: 'Warehouse & cold storage', line: 'Find or offer a safe place to store the harvest.' } },
  { to: '/greenhouse', icon: '🏡', hi: { name: 'ग्रीनहाउस / पॉलीहाउस', line: 'पॉलीहाउस वेंडर और किसानों की ज़रूरतें — एक जगह।' }, en: { name: 'Greenhouse / polyhouse', line: 'Polyhouse vendors and farmer needs — in one place.' } },
  { to: '/jugaad', icon: '🛠️', hi: { name: 'जुगाड़ और देसी यंत्र', line: 'गाँव के जुगाड़ और नए यंत्र — बेचें, किराये पर दें या बनवाएँ।' }, en: { name: 'Jugaad & local machines', line: 'Village jugaad and new tools — sell, rent out or get one built.' } },
  { to: '/drone-didi', icon: '🚁', hi: { name: 'ड्रोन दीदी छिड़काव', line: 'ड्रोन से दवा-खाद का छिड़काव — पास की ड्रोन दीदी खोजें।' }, en: { name: 'Drone Didi spraying', line: 'Spray by drone — find a Drone Didi near you.' } },
]

export const BAZAAR_CATS = [
  {
    slug: 'equipment', cat: 'equipment', icon: '🚜', type: 'offer',
    hi: {
      name: 'कृषि मशीनें और उपकरण',
      title: 'कृषि मशीनें किराये पर — ट्रैक्टर, हार्वेस्टर, थ्रेशर | किसान सहयोग बाज़ार',
      intro: 'यहाँ आप खेती की महँगी मशीनें किराये पर दे सकते हैं या ले सकते हैं। ट्रैक्टर, हार्वेस्टर, थ्रेशर, रोटावेटर, सीड ड्रिल और ड्रोन — सब एक जगह। सीधे मालिक से बात करें, कोई बिचौलिया नहीं।',
      find: ['ट्रैक्टर और रोटावेटर', 'हार्वेस्टर और थ्रेशर', 'सीड ड्रिल और प्लांटर', 'रीपर, कल्टीवेटर और प्लाऊ', 'स्प्रेयर और ड्रोन', 'पानी का पंप और टैंकर'],
      body: 'हर किसान के पास हर मशीन नहीं होती, और नई मशीन खरीदना महँगा पड़ता है। किराये पर लेने से काम भी होता है और पैसा भी बचता है। जिसके पास मशीन खाली है, वह किराये पर देकर कमाई कर सकता है। यहाँ मशीन मालिक अपनी मशीन, दर (प्रति घंटा, प्रति एकड़ या प्रति दिन) और कब खाली है — यह डालते हैं। किसान अपने पास की मशीन खोजते हैं और फ़ोन पर बात करके बुकिंग तय करते हैं। लिस्टिंग डालते समय यह ज़रूर लिखें — मशीन कौन-सी है, कितने साल पुरानी है, किस गाँव में है, और दर क्या है। साफ़ फ़ोटो लगाएँ ताकि खरीदार भरोसा करे। बुवाई और कटाई के समय मशीन की माँग सबसे ज़्यादा रहती है, इसलिए पहले से लिस्ट करें। किसान सहयोग सिर्फ़ दोनों को जोड़ता है; दर और शर्तें मालिक खुद तय करता है। दाम, समय और हालत खुद देख-परख कर ही बुकिंग करें।',
      faqs: [
        { q: 'मशीन किराये पर कैसे दूँ?', a: '"अपना सामान डालें" पर जाएँ, मशीन और दर भरें, और फ़ोटो लगाएँ। पास के किसान सीधे फ़ोन करेंगे।' },
        { q: 'किराया कौन तय करता है?', a: 'दर मशीन मालिक तय करता है। किसान सहयोग दाम तय नहीं करता, सिर्फ़ आपको जोड़ता है।' },
        { q: 'मशीन कितनी दूर तक दिखती है?', a: 'आम तौर पर 30 किमी के दायरे में। चाहें तो डालते समय इसे 100 किमी तक बढ़ा सकते हैं।' },
        { q: 'क्या किराया यहीं देना होता है?', a: 'नहीं। किसान सहयोग पैसे का लेन-देन नहीं करता। किराया आप सीधे मालिक को देते हैं।' },
      ],
    },
    en: {
      name: 'Farm machines & equipment',
      title: 'Rent farm machines — tractor, harvester, thresher | Kissan Sahyog Bazaar',
      intro: 'Rent out or hire costly farm machines here. Tractor, harvester, thresher, rotavator, seed drill and drone — all in one place. Talk to the owner directly, with no middleman.',
      find: ['Tractors and rotavators', 'Harvesters and threshers', 'Seed drills and planters', 'Reapers, cultivators and ploughs', 'Sprayers and drones', 'Water pumps and tankers'],
      body: 'Not every farmer owns every machine, and buying a new one is expensive. Hiring gets the work done and saves money. A farmer whose machine is idle can earn by renting it out. Here an owner lists the machine, the rate (per hour, per acre or per day) and when it is free. Farmers find a machine nearby and fix the booking by phone. When you post, be sure to write what the machine is, how old it is, which village it is in, and the rate. Add clear photos so the hirer trusts the listing. Demand peaks at sowing and harvest, so list early. Kissan Sahyog only connects the two of you; the owner sets the rate and terms. Check the price, timing and condition yourself before you book.',
      faqs: [
        { q: 'How do I rent out my machine?', a: 'Open "Post a listing", fill in the machine and rate, and add photos. Nearby farmers will call you directly.' },
        { q: 'Who sets the rent?', a: 'The owner sets the rate. Kissan Sahyog does not set prices; it only connects you.' },
        { q: 'How far away is my machine shown?', a: 'Usually within 30 km. You can raise this to 100 km while posting if you wish.' },
        { q: 'Is the rent paid here?', a: 'No. Kissan Sahyog handles no money. You pay the owner directly.' },
      ],
    },
  },
  {
    slug: 'labor', cat: 'labor', icon: '👷', type: 'offer',
    hi: {
      name: 'कृषि सहयोगी और मज़दूर',
      title: 'खेत मज़दूर और टीम खोजें या दें | किसान सहयोग बाज़ार',
      intro: 'खेत के कामों के लिए मज़दूर या टीम यहाँ खोजें या दें। बुवाई, निराई, कटाई, तुड़ाई और ढुलाई — हर काम के लिए लोग। मज़दूर और किसान सीधे फ़ोन पर बात करें।',
      find: ['बुवाई और रोपाई की टीम', 'निराई-गुड़ाई के मज़दूर', 'कटाई और तुड़ाई की टीम', 'भार ढोने वाले मज़दूर', 'ड्रोन दीदी ऑपरेटर', 'ठेके पर काम करने वाली टीम'],
      body: 'सही समय पर मज़दूर न मिलना किसान की सबसे बड़ी परेशानी है। कटाई-बुवाई के दिनों में तो और भी। यहाँ काम करने वाले और काम देने वाले दोनों आसानी से जुड़ते हैं। जिस टीम के पास काम नहीं है, वह अपनी जानकारी डालकर पास का काम पा सकती है। किसान अपने गाँव के पास की टीम खोज सकते हैं। लिस्टिंग डालते समय यह लिखें — कौन-सा काम आता है, कितने लोग हैं, दिहाड़ी कितनी है, और किस गाँव से हैं। काम का समय और दिन भी बताएँ ताकि बात जल्दी बने। महिला और पुरुष दोनों टीम डाल सकते हैं। ड्रोन से छिड़काव करने वाली ड्रोन दीदी भी यहाँ अपनी सेवा डाल सकती हैं। दिहाड़ी और शर्तें दोनों पक्ष आपस में तय करें। किसान सहयोग सिर्फ़ जोड़ता है, मज़दूरी तय नहीं करता। काम पर रखने से पहले आपस में साफ़ बात कर लें।',
      faqs: [
        { q: 'मज़दूर की ज़रूरत है, कैसे खोजूँ?', a: '"इस श्रेणी में खोजें" दबाएँ और पास की टीम देखें, फिर सीधे फ़ोन करें।' },
        { q: 'अपनी टीम का काम कैसे लिखूँ?', a: '"अपना सामान/सेवा डालें" पर जाएँ, काम, लोगों की गिनती और दिहाड़ी भरें।' },
        { q: 'दिहाड़ी कौन तय करता है?', a: 'दिहाड़ी दोनों पक्ष आपस में तय करते हैं। किसान सहयोग दाम तय नहीं करता।' },
        { q: 'क्या पक्का काम मिल जाएगा?', a: 'यह आपस की बात पर निर्भर है। किसान सहयोग सिर्फ़ संपर्क कराता है।' },
      ],
    },
    en: {
      name: 'Farm helpers & workers',
      title: 'Find or offer farm workers and teams | Kissan Sahyog Bazaar',
      intro: 'Find or offer workers and teams for farm work here. Sowing, weeding, harvesting, picking and loading — people for every job. Workers and farmers talk directly by phone.',
      find: ['Sowing and transplanting teams', 'Weeding and hoeing workers', 'Harvesting and picking teams', 'Loading and carrying workers', 'Drone Didi operators', 'Teams that work on contract'],
      body: 'Not finding workers on time is a farmer’s biggest worry, and worse during sowing and harvest. Here both the people who do the work and the people who offer it connect easily. A team with no work can list its details and find a job nearby. A farmer can find a team close to the village. When you post, write what work the team does, how many people there are, the daily wage, and which village they are from. Give the days and timing too, so the deal comes together fast. Both men’s and women’s teams can list. Drone Didi operators who spray by drone can list their service here as well. The wage and terms are agreed between the two sides. Kissan Sahyog only connects; it does not set wages. Talk clearly with each other before hiring.',
      faqs: [
        { q: 'I need workers — how do I find them?', a: 'Tap "Search this category" to see teams nearby, then call them directly.' },
        { q: 'How do I list my team’s work?', a: 'Open "Post a listing", fill in the work, the number of people and the daily wage.' },
        { q: 'Who sets the wage?', a: 'Both sides agree the wage. Kissan Sahyog does not set any price.' },
        { q: 'Will I definitely get work?', a: 'That depends on your talks. Kissan Sahyog only puts you in touch.' },
      ],
    },
  },
  {
    slug: 'bhusa', cat: 'bhusa', icon: '🌾', type: 'offer',
    hi: {
      name: 'भूसा, पराली और चारा',
      title: 'भूसा, पराली और चारा बेचें या खरीदें | किसान सहयोग बाज़ार',
      intro: 'गेहूं का भूसा, धान की पराली और गन्ना वेस्ट यहाँ बेचें या खरीदें। जलाने की बजाय बेचें — आय भी बढ़े और प्रदूषण भी घटे। पशुपालक और किसान सीधे जुड़ें।',
      find: ['गेहूं का भूसा', 'धान की पराली', 'गन्ना वेस्ट और पत्ती', 'सूखा चारा और कड़बी', 'हरा चारा', 'कपास और दलहन के डंठल'],
      body: 'फसल कटने के बाद बचा भूसा और पराली अक्सर खेत में पड़े रहते हैं या जला दिए जाते हैं। इससे मिट्टी और हवा दोनों को नुकसान होता है। पशुपालकों को यही भूसा और चारा खरीदना पड़ता है। यहाँ दोनों की ज़रूरत पूरी होती है — किसान बेचकर कमाते हैं, पशुपालक पास से सस्ता चारा पाते हैं। लिस्टिंग डालते समय यह लिखें — सामग्री कौन-सी है, कितनी मात्रा (क्विंटल या ट्रॉली) है, किस गाँव में है, और दाम क्या है। यह भी बताएँ कि उठाव खरीदार करेगा या आप पहुँचाएँगे। भूसा और चारा 100 किमी तक दिखाया जा सकता है, क्योंकि लोग दूर से भी खरीदते हैं। ताज़ा और सूखा माल जल्दी बिकता है, इसलिए कटाई के तुरंत बाद लिस्ट करें। दाम और उठाव की शर्तें दोनों पक्ष आपस में तय करें। किसान सहयोग सिर्फ़ जोड़ता है, लेन-देन नहीं करता।',
      faqs: [
        { q: 'पराली जलाने से कैसे बचूँ?', a: 'जलाने की बजाय यहाँ बेच दें। पास के पशुपालक या गोशाला अक्सर खरीद लेते हैं।' },
        { q: 'भूसा कितनी दूर तक दिखेगा?', a: 'भूसा और चारा 100 किमी तक दिख सकते हैं, क्योंकि लोग दूर से भी खरीदते हैं।' },
        { q: 'मात्रा कैसे बताऊँ?', a: 'क्विंटल या ट्रॉली में लिखें, और उठाव की व्यवस्था भी साफ़ बताएँ।' },
        { q: 'दाम कौन तय करता है?', a: 'दाम बेचने वाला तय करता है। किसान सहयोग दाम तय नहीं करता।' },
      ],
    },
    en: {
      name: 'Straw, stubble & fodder',
      title: 'Sell or buy straw, stubble and fodder | Kissan Sahyog Bazaar',
      intro: 'Sell or buy wheat straw, paddy stubble and sugarcane waste here. Sell instead of burning — earn more and pollute less. Livestock keepers and farmers connect directly.',
      find: ['Wheat straw (bhusa)', 'Paddy stubble (parali)', 'Sugarcane waste and leaves', 'Dry fodder and stalks', 'Green fodder', 'Cotton and pulse stalks'],
      body: 'After harvest, leftover straw and stubble often lie in the field or get burned. That harms both the soil and the air. Livestock keepers, meanwhile, have to buy this very straw and fodder. Here both needs are met — farmers earn by selling, and livestock keepers get cheap fodder nearby. When you post, write what the material is, how much there is (quintals or trolleys), which village it is in, and the price. Say whether the buyer collects it or you will deliver. Straw and fodder can be shown up to 100 km, because people buy from far. Fresh, dry material sells fast, so list right after harvest. Both sides agree the price and pickup terms. Kissan Sahyog only connects; it does no transaction. A clear listing with the quantity and your village brings the right buyers faster.',
      faqs: [
        { q: 'How do I avoid burning stubble?', a: 'Sell it here instead of burning. Nearby livestock keepers or gaushalas often buy it.' },
        { q: 'How far is straw shown?', a: 'Straw and fodder can show up to 100 km, because people buy from far away.' },
        { q: 'How do I state the quantity?', a: 'Write it in quintals or trolleys, and state the pickup arrangement clearly too.' },
        { q: 'Who sets the price?', a: 'The seller sets the price. Kissan Sahyog does not set prices.' },
      ],
    },
  },
  {
    slug: 'agri-inputs', cat: 'agri_inputs', icon: '🧪', type: 'offer',
    hi: {
      name: 'बीज, खाद और दवा',
      title: 'बीज, खाद और दवा — किसान और दुकानें | किसान सहयोग बाज़ार',
      intro: 'बचे हुए बीज, खाद और कीटनाशक यहाँ बेचें, या दुकान की जानकारी डालें। किसान और दुकानदार दोनों लिस्ट कर सकते हैं। पास की सामग्री आसानी से मिल जाती है।',
      find: ['बीज (गेहूं, चना, सब्ज़ी)', 'यूरिया, DAP और दूसरी खाद', 'जैविक खाद और वर्मी कम्पोस्ट', 'कीटनाशक और फफूंदनाशक', 'ड्रिप और स्प्रे की सामग्री', 'बीज-खाद की दुकानें'],
      body: 'कई बार किसान के पास सीज़न के बाद बीज या खाद बच जाती है। उसे फेंकने की बजाय पास के किसान को बेचना बेहतर है। दुकानदार भी अपनी दुकान और सामान यहाँ डालकर पास के किसानों तक पहुँच सकते हैं। इससे किसान को सामग्री पास में ही मिल जाती है और समय बचता है। लिस्टिंग डालते समय यह लिखें — सामग्री कौन-सी है, कितनी है, पैकिंग बंद है या खुली, और दाम क्या है। दुकानदार अपनी दुकान का नाम, पता और क्या-क्या मिलता है — यह बताएँ। दवा और खाद खरीदते समय हमेशा पैकिंग, तारीख़ और लेबल देखें। कीटनाशक लेबल पर लिखी मात्रा ही उपयोग करें। किसान सहयोग सामान नहीं बेचता और न दाम तय करता है — यह सिर्फ़ आपको पास की दुकान या किसान से जोड़ता है। खरीदने से पहले गुणवत्ता खुद परख लें।',
      faqs: [
        { q: 'बचा हुआ बीज कैसे बेचूँ?', a: '"अपना सामान डालें" पर जाएँ, बीज की मात्रा और दाम भरें। पास के किसान संपर्क करेंगे।' },
        { q: 'क्या दुकानदार भी डाल सकते हैं?', a: 'हाँ। दुकानदार अपनी दुकान, पता और सामान यहाँ लिस्ट कर सकते हैं।' },
        { q: 'दवा खरीदते समय क्या देखूँ?', a: 'पैकिंग, तारीख़ और लेबल ज़रूर देखें। लेबल पर लिखी मात्रा ही उपयोग करें।' },
        { q: 'क्या किसान सहयोग सामान बेचता है?', a: 'नहीं। यह सिर्फ़ किसान और दुकान को जोड़ता है; खरीद-बिक्री आप खुद करते हैं।' },
      ],
    },
    en: {
      name: 'Seeds, fertiliser & medicine',
      title: 'Seeds, fertiliser and pesticide — farmers & shops | Kissan Sahyog Bazaar',
      intro: 'Sell surplus seeds, fertiliser and pesticide here, or list your shop. Both farmers and dealers can list. Inputs nearby become easy to find.',
      find: ['Seed (wheat, gram, vegetable)', 'Urea, DAP and other fertiliser', 'Organic manure and vermicompost', 'Pesticide and fungicide', 'Drip and spray supplies', 'Seed-and-fertiliser shops'],
      body: 'Farmers are often left with spare seed or fertiliser after a season. Rather than waste it, selling to a nearby farmer is better. Dealers, too, can list their shop and stock here to reach farmers close by. This way a farmer finds inputs nearby and saves time. When you post, write what the item is, how much there is, whether the packing is sealed or open, and the price. A dealer should give the shop name, address and what is stocked. When buying medicine or fertiliser, always check the packing, date and label. Use only the dose written on the pesticide label. Kissan Sahyog does not sell goods or set prices — it only connects you to a nearby shop or farmer. Check the quality yourself before buying. A clear listing with the quantity and your village helps the right buyer find you.',
      faqs: [
        { q: 'How do I sell leftover seed?', a: 'Open "Post a listing", fill in the quantity and price. Nearby farmers will contact you.' },
        { q: 'Can dealers list too?', a: 'Yes. A dealer can list the shop, address and stock here.' },
        { q: 'What should I check when buying medicine?', a: 'Always check the packing, date and label. Use only the dose written on the label.' },
        { q: 'Does Kissan Sahyog sell the goods?', a: 'No. It only connects farmers and shops; you buy and sell yourself.' },
      ],
    },
  },
  {
    slug: 'transport', cat: 'transport', icon: '🚚', type: 'offer',
    hi: {
      name: 'परिवहन और ढुलाई',
      title: 'खेत से मंडी तक ढुलाई — ट्रैक्टर-ट्रॉली, ट्रक | किसान सहयोग बाज़ार',
      intro: 'खेत से मंडी या गोदाम तक फसल पहुँचाने के लिए वाहन यहाँ खोजें या दें। ट्रैक्टर-ट्रॉली, पिकअप, ट्रक और टेम्पो — सब एक जगह। रास्ता और किराया फ़ोन पर तय करें।',
      find: ['ट्रैक्टर-ट्रॉली', 'पिकअप और छोटा हाथी', 'ट्रक और डाला', 'टेम्पो और लोडिंग वाहन', 'पानी का टैंकर', 'मंडी तक ढुलाई सेवा'],
      body: 'फसल तैयार होने के बाद उसे मंडी या गोदाम तक पहुँचाना ज़रूरी होता है। हर किसान के पास अपना वाहन नहीं होता। जिनके पास वाहन है, वे किराये पर देकर कमाई कर सकते हैं। यहाँ वाहन मालिक और किसान सीधे जुड़ते हैं। लिस्टिंग डालते समय यह लिखें — वाहन कौन-सा है, कितना वज़न ढो सकता है, किस गाँव से है, और किराया कैसे लेते हैं (प्रति ट्रिप या प्रति किलोमीटर)। खाली समय भी बताएँ ताकि किसान सही दिन बुकिंग कर सके। किसान पास का वाहन खोजकर फ़ोन या WhatsApp पर रास्ता और किराया तय कर सकते हैं। कटाई के दिनों में वाहन की माँग ज़्यादा रहती है, इसलिए पहले से बात कर लें। किराया और शर्तें दोनों पक्ष आपस में तय करें। किसान सहयोग सिर्फ़ जोड़ता है, किराया तय नहीं करता। सही दाम और समय पर पहले बात कर लेने से बाद में कोई झंझट नहीं रहती। साफ़ लिस्टिंग में वाहन का आकार और अपना गाँव ज़रूर लिखें, ताकि सही किसान फ़ोन करें।',
      faqs: [
        { q: 'मंडी तक वाहन कैसे खोजूँ?', a: '"इस श्रेणी में खोजें" दबाएँ, पास का वाहन देखें और सीधे फ़ोन करें।' },
        { q: 'अपना वाहन कैसे लिस्ट करूँ?', a: '"अपना सामान/सेवा डालें" पर जाएँ, वाहन, वज़न और किराया भरें।' },
        { q: 'किराया कौन तय करता है?', a: 'किराया वाहन मालिक और किसान आपस में तय करते हैं।' },
        { q: 'क्या लंबी दूरी की ढुलाई मिलेगी?', a: 'यह वाहन मालिक पर निर्भर है। लिस्टिंग में दूरी और किराया साफ़ बता दें।' },
      ],
    },
    en: {
      name: 'Transport & haulage',
      title: 'Farm-to-mandi haulage — tractor-trolley, truck | Kissan Sahyog Bazaar',
      intro: 'Find or offer a vehicle to move produce from farm to mandi or warehouse. Tractor-trolley, pickup, truck and tempo — all in one place. Fix the route and fare by phone.',
      find: ['Tractor-trolley', 'Pickup and small carrier', 'Truck and open-body', 'Tempo and loading vehicles', 'Water tanker', 'Haulage to the mandi'],
      body: 'Once a crop is ready, it must reach the mandi or warehouse. Not every farmer owns a vehicle. Those who do can earn by renting it out. Here vehicle owners and farmers connect directly. When you post, write what the vehicle is, how much weight it carries, which village it is from, and how the fare is charged (per trip or per kilometre). Give the free times too, so a farmer can book the right day. A farmer can find a nearby vehicle and fix the route and fare by phone or WhatsApp. Demand is high at harvest, so talk early. Both sides agree the fare and terms. Kissan Sahyog only connects; it does not set the fare. Agreeing the price and timing up front avoids any dispute later. A clear listing with the vehicle’s size and your village brings the right calls.',
      faqs: [
        { q: 'How do I find a vehicle to the mandi?', a: 'Tap "Search this category", see a nearby vehicle and call directly.' },
        { q: 'How do I list my vehicle?', a: 'Open "Post a listing", fill in the vehicle, weight and fare.' },
        { q: 'Who sets the fare?', a: 'The owner and farmer agree the fare between themselves.' },
        { q: 'Will I get long-distance haulage?', a: 'That depends on the owner. State the distance and fare clearly in the listing.' },
      ],
    },
  },
  {
    slug: 'building-materials', cat: 'building_materials', icon: '🧱', type: 'offer',
    hi: {
      name: 'निर्माण सामग्री',
      title: 'निर्माण सामग्री खरीदें या बेचें | किसान सहयोग बाज़ार',
      intro: 'सीमेंट, रेत, सरिया, ईंट और गिट्टी की जानकारी यहाँ डालें या पास की लिस्टिंग देखें।',
      find: ['सीमेंट और ब्रांड', 'रेत और गिट्टी', 'सरिया और ईंट', 'मात्रा और इकाई', 'डिलीवरी या लेने की जगह', 'विक्रेता की अपनी दर'],
      body: 'खेत, घर, दुकान या किसी छोटे काम के लिए सामग्री चाहिए तो पास की लिस्टिंग देखें। सामग्री का नाम, मात्रा और लेने की जगह पढ़ें। जरूरत हो तो सीधे बेचने वाले को फोन करें। बात करने से पहले यह पूछ लें कि सामान कब मिलेगा और कहाँ से लेना है।\n\nबेचने वाले अपनी सामग्री की लिस्टिंग डाल सकते हैं। सीमेंट, रेत, सरिया, ईंट, गिट्टी या दूसरी सामग्री चुनें। ब्रांड या ग्रेड लिखना चाहें तो लिखें। सही मात्रा और इकाई भरें। अपनी दर खुद लिखें। किसान सहयोग कोई दर नहीं बताता और कोई सौदा नहीं करता।\n\nडिलीवरी दे सकते हैं तो यह भी बताएं। नहीं दे सकते तो लेने की साफ़ जगह लिखें। खरीदार और विक्रेता फोन पर समय, सामान और बाकी शर्तें आपस में तय करें। लिस्टिंग में वही लिखें जो आप सच में दे सकते हैं। इससे गलत फोन कम होंगे और सही व्यक्ति तक बात पहुँचेगी।\n\nरेत या गिट्टी बेचने वाले की ज़िम्मेदारी है कि वह ज़रूरी अनुमति के साथ बेचे। खरीदार भी सामान लेने से पहले जानकारी खुद देखे। किसान सहयोग केवल लोगों को जोड़ता है। भुगतान, ढुलाई और सौदा आप दोनों की बात से तय होगा।\n\nअगर सामग्री नहीं मिल रही है तो अपनी जरूरत की लिस्टिंग डालें। सामग्री का नाम, कितनी चाहिए और किस जगह चाहिए, यह साफ़ लिखें। पास का विक्रेता आपसे सीधे बात कर सकता है। फोन या WhatsApp पर बात करते समय अपना पता और शर्तें सोच-समझकर साझा करें।',
      faqs: [
        { q: 'निर्माण सामग्री कैसे खोजें?', a: 'इस श्रेणी में पास की लिस्टिंग देखें और बेचने वाले से सीधे बात करें।' },
        { q: 'अपनी दर कौन लिखता है?', a: 'विक्रेता अपनी दर खुद लिखता है। किसान सहयोग कोई दर तय नहीं करता।' },
        { q: 'क्या डिलीवरी की जानकारी मिलेगी?', a: 'हर लिस्टिंग में विक्रेता बता सकता है कि डिलीवरी मिलेगी या सामान कहाँ से लेना है।' },
        { q: 'रेत या गिट्टी बेचते समय क्या ध्यान रखें?', a: 'ज़रूरी अनुमति के साथ ही बेचें।' },
      ],
    },
    en: {
      name: 'Building materials',
      title: 'Buy or sell building materials | Kissan Sahyog Bazaar',
      intro: 'Post or find cement, sand, iron rod, bricks, and gravel near you.',
      find: ['Cement and brand', 'Sand and gravel', 'Iron rod and bricks', 'Quantity and unit', 'Delivery or pickup location', 'Seller’s own rate'],
      body: 'Need materials for a farm, home, shop, or a small project? Check nearby listings. Read the material name, quantity, and pickup location. Call the seller when you need more detail. Before you agree, ask when the goods can be collected and where they will be available.\n\nSellers can post their materials here. Choose cement, sand, iron rod, bricks, gravel, or another material. Add a brand or grade if it helps. Enter an accurate quantity and unit. Set your own rate. Kissan Sahyog does not suggest prices or make a deal for either side.\n\nSay whether delivery is available. If it is not, write a clear pickup location. Buyer and seller should agree the timing, material, and other terms by phone. Put only what you can actually provide in the listing. A clear listing helps the right person call you.\n\nA seller of sand or gravel is responsible for selling with the required permissions. Buyers should also check the details before collecting material. Kissan Sahyog only connects people. Payment, transport, and the final deal are settled directly by the two people involved.\n\nIf you cannot find the material, post what you need. State the material, quantity, and location clearly. A nearby seller can contact you directly. Share your address and terms carefully when you speak by phone or WhatsApp.',
      faqs: [
        { q: 'How do I find building materials?', a: 'Open this category, view nearby listings, and speak to the seller directly.' },
        { q: 'Who sets the rate?', a: 'The seller sets their own rate. Kissan Sahyog does not set prices.' },
        { q: 'Will delivery be shown?', a: 'A seller can say whether delivery is available or where material can be collected.' },
        { q: 'What should a sand or gravel seller do?', a: 'Sell only with the required permissions.' },
      ],
    },
  },
  {
    slug: 'vegetable-equipment', cat: 'equipment', equipmentTag: 'vegetable_farming', icon: '🥬', type: 'offer',
    hi: {
      name: 'सब्ज़ी खेती के यंत्र',
      title: 'सब्ज़ी खेती के यंत्र खोजें या किराये पर दें | किसान सहयोग बाज़ार',
      intro: 'सब्ज़ी की खेती के काम आने वाले यंत्रों की लिस्टिंग यहाँ देखें या अपना यंत्र डालें।',
      find: ['सब्ज़ी खेत के यंत्र', 'किराये की दर', 'उपलब्ध रहने का समय', 'पास का यंत्र मालिक', 'एक से अधिक टैग वाले यंत्र', 'सीधा फोन या WhatsApp संपर्क'],
      body: 'सब्ज़ी की खेती के लिए यंत्र चाहिए तो इस पेज से खोज शुरू करें। यहाँ वही मशीनें दिखती हैं जिन पर सब्ज़ी खेती का टैग लगा है। लिस्टिंग खोलकर मशीन का प्रकार, किराये की दर और उपलब्धता देखें। जरूरत हो तो मालिक को सीधे फोन करें।\n\nयंत्र मालिक अपना उपकरण डालते समय सब्ज़ी खेती का टैग चुन सकते हैं। अगर यंत्र किसी कम मिलने वाले या तुरंत काम आने वाले काम में भी उपयोगी है, तो दूसरा टैग भी चुनें। दोनों टैग लगाने से खोजने वाले को सही यंत्र तक पहुँचना आसान होता है।\n\nलिस्टिंग में मशीन का प्रकार, अपनी दर और कब उपलब्ध है, यह साफ़ रखें। काम की जगह और समय फोन पर तय करें। किसान सहयोग किराया तय नहीं करता। यंत्र मालिक और किसान आपस में बात करके दर, समय और बाकी शर्तें तय करते हैं।\n\nखोजते समय मशीन की हालत, पहुँचने का समय और काम का तरीका सीधे मालिक से पूछें। अपनी जरूरत साफ़ बताएं। अगर कोई यंत्र आपके काम का नहीं है तो दूसरी लिस्टिंग देखें या अपनी जरूरत की लिस्टिंग डालें।\n\nपुरानी मशीनों पर यह टैग न होने पर भी वे पहले की तरह दिखती रहेंगी। टैग सिर्फ़ खोज को आसान बनाने के लिए हैं। फोन या WhatsApp पर बात करते समय कोई भुगतान या पक्का वादा करने से पहले जानकारी खुद जाँचें। किसान सहयोग केवल संपर्क कराता है।',
      faqs: [
        { q: 'सब्ज़ी खेती वाले यंत्र कैसे खोजें?', a: 'इस पेज के खोज बटन से टैग लगी मशीनों की लिस्टिंग देखें।' },
        { q: 'क्या एक यंत्र पर दो टैग लग सकते हैं?', a: 'हाँ, मालिक दोनों टैग चुन सकता है।' },
        { q: 'किराया कौन तय करता है?', a: 'मालिक और किसान आपस में तय करते हैं।' },
        { q: 'बिना टैग वाली पुरानी लिस्टिंग का क्या होगा?', a: 'वह पहले की तरह काम करती रहेगी।' },
      ],
    },
    en: {
      name: 'Vegetable farming equipment',
      title: 'Find or rent out vegetable farming equipment | Kissan Sahyog Bazaar',
      intro: 'Find equipment tagged for vegetable farming, or post your own machine for nearby farmers.',
      find: ['Vegetable-farming equipment', 'Rental rate', 'Availability', 'Nearby owners', 'Equipment with more than one tag', 'Direct phone or WhatsApp contact'],
      body: 'Use this page to begin a search for equipment used in vegetable farming. It shows machines carrying the vegetable-farming tag. Open a listing to see the equipment type, rental rate, and availability. Call the owner directly when you need more detail.\n\nEquipment owners can select the vegetable-farming tag when posting a machine. If the machine is also hard to find or useful for an urgent job, they can select the second tag too. Using both tags helps a person searching for the right machine find it more easily.\n\nKeep the machine type, your own rate, and availability clear in the listing. Agree the work location and timing by phone. Kissan Sahyog does not set rent. The owner and farmer decide the rate, timing, and other terms directly with each other.\n\nWhen searching, ask the owner about the machine condition, arrival time, and how the work will be done. Explain your need clearly. If a machine does not suit the job, view another listing or post what you need.\n\nOlder equipment listings without a tag continue to work as before. Tags only make search easier. Check details yourself before paying or making a firm commitment over phone or WhatsApp. Kissan Sahyog only helps people connect.',
      faqs: [
        { q: 'How do I find vegetable farming equipment?', a: 'Use the search button on this page to see equipment with the vegetable-farming tag.' },
        { q: 'Can one machine have two tags?', a: 'Yes. An owner can select both tags.' },
        { q: 'Who sets the rent?', a: 'The owner and farmer agree it directly.' },
        { q: 'What happens to older untagged listings?', a: 'They continue to work as before.' },
      ],
    },
  },
  {
    slug: 'land', cat: 'land', icon: '🌍', type: 'offer',
    hi: {
      name: 'भूमि / रकबा — पट्टा और बटाई',
      title: 'खेती की ज़मीन पट्टे या बटाई पर — खोजें या दें | किसान सहयोग बाज़ार',
      intro: 'खाली खेती की ज़मीन यहाँ पट्टे या बटाई पर दें, या किसी की ज़मीन खेती के लिए लें। ठेका, बटाई या कॉन्ट्रैक्ट फार्मिंग — जो भी सही लगे। दोनों पक्ष सीधे बात करें।',
      find: ['पट्टे (किराये) पर ज़मीन', 'बटाई पर ज़मीन', 'कॉन्ट्रैक्ट फार्मिंग की ज़मीन', 'सिंचित और असिंचित खेत', 'बाग़ और बग़ीचे की ज़मीन', 'खाली पड़ी खेती की ज़मीन'],
      body: 'कई लोगों की ज़मीन खाली पड़ी रहती है, क्योंकि वे खुद खेती नहीं कर पाते। वहीं कुछ किसान ज़्यादा खेती करना चाहते हैं पर उनके पास ज़मीन कम है। यहाँ दोनों की ज़रूरत पूरी होती है — ज़मीन मालिक को आमदनी मिलती है और किसान को खेती के लिए ज़मीन। लिस्टिंग डालते समय यह लिखें — ज़मीन कितने एकड़ है, किस गाँव में है, पानी का साधन क्या है (कुआँ, बोरवेल, नहर), और आप पट्टा चाहते हैं या बटाई। शर्तें जितनी साफ़ होंगी, बात उतनी जल्दी बनेगी। लिस्टिंग डालते समय आपको यह पुष्टि करनी होती है कि ज़मीन आपकी है या आपको उसे देने का हक़ है। कोई भी समझौता लिखित में और गवाह के सामने करना अच्छा रहता है। किराया, हिस्सा और अवधि दोनों पक्ष आपस में तय करें। किसान सहयोग सिर्फ़ जोड़ता है; यह कोई सौदा या कागज़ी काम नहीं करता।',
      faqs: [
        { q: 'ज़मीन बटाई पर कैसे दूँ?', a: '"अपना सामान डालें" पर जाएँ, एकड़, गाँव और पानी का साधन भरें, और पट्टा या बटाई चुनें।' },
        { q: 'क्या मुझे ज़मीन का मालिक होना ज़रूरी है?', a: 'ज़मीन आपकी हो या आपको उसे देने का हक़ हो — डालते समय यह पुष्टि करनी होती है।' },
        { q: 'किराया या हिस्सा कौन तय करता है?', a: 'यह दोनों पक्ष आपस में तय करते हैं। किसान सहयोग दाम तय नहीं करता।' },
        { q: 'क्या समझौता लिखित होना चाहिए?', a: 'हाँ, लिखित और गवाह के सामने समझौता करना दोनों के लिए सुरक्षित रहता है।' },
      ],
    },
    en: {
      name: 'Land (Bhoomi / Rakba) — lease & sharecrop',
      title: 'Farm land on lease or sharecrop — find or offer | Kissan Sahyog Bazaar',
      intro: 'Offer idle farm land on lease or sharecrop here, or take someone’s land to farm. Lease, sharecrop (batai) or contract farming — whatever suits. Both sides talk directly.',
      find: ['Land on lease (rent)', 'Land on sharecropping', 'Contract-farming land', 'Irrigated and rainfed fields', 'Orchard and garden land', 'Idle farm land'],
      body: 'Many people’s land lies idle because they cannot farm it themselves. Other farmers want to farm more but have little land. Here both needs are met — the owner earns an income and the farmer gets land to farm. When you post, write how many acres the land is, which village it is in, the water source (well, borewell, canal), and whether you want lease or sharecrop. The clearer the terms, the faster the deal. When posting you must confirm the land is yours or that you have the right to offer it. Any agreement is best made in writing and before a witness. Both sides agree the rent, share and duration. Kissan Sahyog only connects; it does no deal and no paperwork.',
      faqs: [
        { q: 'How do I offer land on sharecrop?', a: 'Open "Post a listing", fill in acres, village and water source, and choose lease or sharecrop.' },
        { q: 'Must I own the land?', a: 'The land must be yours or you must have the right to offer it — you confirm this when posting.' },
        { q: 'Who sets the rent or share?', a: 'Both sides agree it. Kissan Sahyog does not set prices.' },
        { q: 'Should the agreement be written?', a: 'Yes, a written agreement before a witness is safer for both sides.' },
      ],
    },
  },
]

export const bazaarCat = (slug) => BAZAAR_CATS.find((c) => c.slug === slug) || null
