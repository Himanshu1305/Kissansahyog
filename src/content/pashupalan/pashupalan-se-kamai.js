// Batch 19-B - /pashupalan/pashupalan-se-kamai : how animal husbandry can raise a farmer's income (FACTS I + A8, H1).
// Numbers come only from OFFICIAL sources read on 5 Nov 2026 (F-I1..F-I4, F-I7, F-I8) or one NEWS item (F-I6, attributed).
// Statements marked GEN are general knowledge with no number. Text may use {{link:id}} and {{page:route}} tokens.
export default {
  slug: 'pashupalan-se-kamai',
  path: '/pashupalan/pashupalan-se-kamai',
  art: 'rupee',
  status: 'info',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'पशुपालन से कमाई कैसे बढ़ाएँ — सरकारी आँकड़े और दूध की कमाई का हिसाब', en: 'How animal husbandry can raise your income — official figures and a milk income calculator' },
    description: { hi: 'पशुपालन से किसान की आमदनी कितनी जुड़ती है: सरकारी सर्वे के आँकड़े, मध्य प्रदेश की स्थिति, शुरू करने से पहले की जाँच, जोखिम और दूध की कमाई का हिसाब लगाने वाला कैलकुलेटर।', en: 'How much animals add to a farmer’s income: government survey figures, the Madhya Pradesh position, a checklist before you start, the risks, and a milk income calculator.' },
  },
  h1: { hi: 'पशुपालन से कमाई कैसे बढ़ाएँ', en: 'How animal husbandry can raise your income' },
  hook: { hi: 'फ़सल बारिश के भरोसे है। गाय-भैंस रोज़ दूध देती हैं। देखिए, सरकारी आँकड़े क्या कहते हैं।', en: 'Crops depend on the rain. A cow or buffalo gives milk every day. See what the government figures say.', f: ['GEN'] },
  answer: {
    hi: 'सरकारी सर्वे के अनुसार देश के खेतिहर परिवार की कमाई का लगभग 15.5 प्रतिशत हिस्सा पशुपालन से आता है। बहुत कम ज़मीन वाले परिवारों में पशुओं से होने वाली कमाई फ़सल से ज़्यादा पाई गई। पर लाभ तभी है जब चारे, पानी, इलाज और दूध के ख़रीदार का इंतज़ाम पहले हो।',
    en: 'According to the government survey, about 15.5 percent of an agricultural household’s income across the country comes from animals. For families with very little land, income from animals was found to be higher than from crops. But the gain comes only if fodder, water, treatment and a buyer for the milk are arranged first.',
    f: ['F-I1', 'F-I3'],
  },
  sar: [
    { hi: 'पशुपालन से दूध, गोबर, चारे और बछड़ों की बिक्री से कमाई हो सकती है। यह खेती के साथ दूसरी आमदनी है।', en: 'Animals can earn from milk, dung, fodder and the sale of calves. It is a second income beside farming.', f: ['GEN'] },
    { hi: 'हर किसान के लिए, ख़ासकर कम ज़मीन वाले और बुंदेलखंड जैसे कम बारिश या अनिश्चित बारिश वाले इलाके के परिवार।', en: 'Every farmer, especially families with little land and in areas like Bundelkhand where rain is uncertain.', f: ['F-I3'] },
    { hi: 'यह जानकारी का पेज है, कोई योजना नहीं। नीचे दूध की कमाई का हिसाब लगाने वाला औज़ार है।', en: 'This is an information page, not a scheme. Below is a tool to work out your milk income.', f: ['GEN'] },
  ],
  tiles: [
    { v: { hi: '15.5%', en: '15.5%' }, l: { hi: 'देश के खेतिहर परिवार की कमाई में पशुपालन का हिस्सा', en: 'share of animals in an agricultural household’s income, India' }, src: { hi: 'सरकारी सर्वे (NSS 77वाँ दौर) · जुलाई 2018–जून 2019', en: 'Government survey (NSS 77th round) · Jul 2018–Jun 2019' }, f: ['F-I1'] },
    { v: { hi: '₹1,295 हर महीने', en: 'Rs 1,295 a month' }, l: { hi: 'मध्य प्रदेश के खेतिहर परिवार की पशुओं से औसत कमाई', en: 'average income from animals of an MP agricultural household' }, src: { hi: 'सरकारी सर्वे · जुलाई 2018–जून 2019', en: 'Government survey · Jul 2018–Jun 2019' }, f: ['F-I2'] },
    { v: { hi: 'पशु ₹2,084 · फ़सल ₹1,660', en: 'Animals Rs 2,084 · crops Rs 1,660' }, l: { hi: 'बहुत कम ज़मीन वाले परिवार की महीने की कमाई, देश में', en: 'monthly income of a family with very little land, India' }, src: { hi: 'सरकारी सर्वे · 0.01 हेक्टेयर से कम ज़मीन', en: 'Government survey · under 0.01 hectare of land' }, f: ['F-I3'] },
    { v: { hi: '9.12% · तीसरा स्थान', en: '9.12% · third place' }, l: { hi: 'देश के दूध उत्पादन में मध्य प्रदेश का हिस्सा', en: 'Madhya Pradesh’s share of the country’s milk' }, src: { hi: 'पशुपालन आँकड़े 2025 (PIB) · 2024-25', en: 'Animal husbandry statistics 2025 (PIB) · 2024-25' }, f: ['F-I4'] },
  ],
  links: [
    { id: 'nddb', btn: { hi: 'डेयरी बोर्ड की वेबसाइट खोलें', en: 'Open the dairy board website' } },
    { id: 'dahd', btn: { hi: 'केंद्र के पशुपालन विभाग की वेबसाइट', en: 'Central animal husbandry department website' } },
    { id: 'myscheme', btn: { hi: 'सरकारी योजनाएँ खोजें', en: 'Search government schemes' } },
  ],
  know: {
    yes: {
      h: { hi: 'सरकारी आँकड़े साफ़ बताते हैं', en: 'What the official figures clearly show' },
      items: [
        { hi: 'देश के खेतिहर परिवार की औसत मासिक कमाई ₹10,218 थी। इसमें मज़दूरी 39.8 प्रतिशत, फ़सल 37.2 प्रतिशत, पशुपालन 15.5 प्रतिशत और गैर-खेती कारोबार 6.3 प्रतिशत थी।', en: 'The average monthly income of an agricultural household in India was Rs 10,218. Wages were 39.8 percent, crops 37.2 percent, animals 15.5 percent and non-farm business 6.3 percent.', f: ['F-I1'] },
        { hi: 'मध्य प्रदेश में कुल औसत मासिक कमाई ₹8,339 थी। इसमें फ़सल से ₹4,309, मज़दूरी से ₹2,488 और पशुओं से ₹1,295 आए।', en: 'In Madhya Pradesh the average monthly income was Rs 8,339 in all: Rs 4,309 from crops, Rs 2,488 from wages and Rs 1,295 from animals.', f: ['F-I2'] },
        { hi: 'पशुपालन का हिस्सा मध्य प्रदेश में भी लगभग 15.5 प्रतिशत बैठता है (1,295 को 8,339 से भाग देने पर, हमारा हिसाब)।', en: 'The share of animals in Madhya Pradesh also works out to about 15.5 percent (1,295 divided by 8,339, our arithmetic).', f: ['F-I2'] },
        { hi: 'मध्य प्रदेश 2024-25 में देश के दूध उत्पादन में तीसरे नंबर पर रहा, 9.12 प्रतिशत हिस्से के साथ। देश में कुल दूध 247.87 मिलियन टन हुआ।', en: 'Madhya Pradesh was third in the country’s milk production in 2024-25, with a 9.12 percent share. India’s total milk was 247.87 million tonnes.', f: ['F-I4'] },
      ],
    },
    no: {
      h: { hi: 'जो हम नहीं बता सकते', en: 'What we cannot tell you' },
      items: [
        { hi: 'हमें कोई सरकारी बयान नहीं मिला जिसमें लिखा हो कि पशुओं की कमाई फ़सल से ज़्यादा स्थिर रहती है। यह बात आम समझ की है, आँकड़े से सिद्ध नहीं।', en: 'We found no government statement saying income from animals is steadier than from crops. This is common understanding, not proven by a figure.', f: ['GEN'] },
        { hi: 'आपके गाँव या ज़िले का अलग आँकड़ा हमारे पास नहीं है। ऊपर के आँकड़े राज्य और देश के औसत हैं।', en: 'We do not have a separate figure for your village or district. The figures above are state and national averages.', f: ['F-I2'] },
        { hi: 'मध्य प्रदेश के पशुओं की गिनती की सरकारी तालिका हम खोल नहीं सके, इसलिए गिनती का कोई आँकड़ा नहीं लिखा।', en: 'We could not open the official table of Madhya Pradesh livestock counts, so no count is given.', f: ['F-I2'] },
      ],
    },
  },
  steps: {
    h: { hi: 'शुरू करने से पहले जाँचें: छह सवाल', en: 'Check before you start: six questions' },
    items: [
      { hi: 'चारा: क्या सालभर के लिए हरा चारा और भूसा मिलेगा या उगा सकेंगे? चारा सबसे बड़ा ख़र्च है।', en: 'Fodder: will you get or grow green fodder and straw for the whole year? Fodder is the biggest cost.', f: ['GEN'] },
      { hi: 'पानी: क्या गर्मी में भी पशु के लिए रोज़ साफ़ पानी रहेगा?', en: 'Water: will clean water be there for the animal every day, even in summer?', f: ['GEN'] },
      { hi: 'इलाज: पास का पशु चिकित्सालय कितनी दूर है और डॉक्टर कितनी जल्दी आते हैं?', en: 'Treatment: how far is the nearest veterinary hospital and how quickly can a doctor come?', f: ['GEN'] },
      { hi: 'ख़रीदार: दूध कौन लेगा, किस भाव और कितने दिन में पैसा देगा? पहले पूछ लें, फिर पशु लें।', en: 'Buyer: who will take the milk, at what price, and how soon will they pay? Ask first, then buy the animal.', f: ['GEN'] },
      { hi: 'टीके: मुँहपका-खुरपका जैसी बीमारियों के टीके समय पर लगवाने का इंतज़ाम है?', en: 'Vaccines: are you ready to get vaccines against diseases like foot-and-mouth on time?', f: ['GEN'] },
      { hi: 'हिसाब: चारे और दवा का रोज़ का ख़र्च निकालकर देखें कि दूध की बिक्री से कितना बचेगा। नीचे का हिसाब यही करता है।', en: 'Sums: work out the daily cost of fodder and medicine and see what is left from milk sales. The calculator below does this.', f: ['GEN'] },
    ],
  },
  sections: [
    {
      id: 'survey', kind: 'p',
      h: { hi: 'सरकारी सर्वे हमें क्या बताता है?', en: 'What does the government survey tell us?' },
      items: [
        { hi: 'राष्ट्रीय सांख्यिकी कार्यालय (NSO) ने 2019 में खेतिहर परिवारों का सर्वे किया। रिपोर्ट सितंबर 2021 में आई। यह देश का सबसे ठोस आधिकारिक आँकड़ा है कि किसान परिवार कहाँ से कमाते हैं।', en: 'The National Statistical Office (NSO) surveyed agricultural households in 2019. The report came out in September 2021. It is the most solid official figure on where farm families earn from.', f: ['F-I1'] },
        { hi: 'ध्यान दें: इसमें "शुद्ध कमाई" सिर्फ़ जेब से दिए गए ख़र्च घटाकर निकाली गई है। अपने घर के लोगों की मेहनत की क़ीमत इसमें नहीं गिनी गई। इसलिए असली मेहनत का मोल इन आँकड़ों से ज़्यादा है।', en: 'Note: “net income” here subtracts only the costs actually paid out of pocket. The value of your own family’s labour is not counted. So the true worth of the effort is more than these figures show.', f: ['F-I1'] },
        { hi: 'ज़मीन के आकार के हिसाब से तस्वीर बदलती है। 0.01 से 0.40 हेक्टेयर वाले परिवारों में पशुओं से ₹1,162 और फ़सल से ₹977 महीना आए। पर 0.40 से 1.00 हेक्टेयर में फ़सल आगे निकल गई: ₹2,683 बनाम ₹1,335।', en: 'The picture changes with the size of land. Families with 0.01 to 0.40 hectare earned Rs 1,162 a month from animals and Rs 977 from crops. But with 0.40 to 1.00 hectare crops moved ahead: Rs 2,683 against Rs 1,335.', f: ['F-I3'] },
        { hi: 'यानी जिनके पास ज़मीन कम है, उनके लिए पशु ख़ास तौर पर काम के हैं। जिनके पास ज़्यादा ज़मीन है, उनके लिए भी पशु अतिरिक्त कमाई हैं, पर फ़सल का हिस्सा बड़ा रहता है।', en: 'So animals matter most to those with little land. For those with more land, animals are an extra income, but the share of crops stays bigger.', f: ['F-I3'] },
      ],
    },
    {
      id: 'bundelkhand', kind: 'p',
      h: { hi: 'बुंदेलखंड में पशु क्यों काम आते हैं?', en: 'Why do animals help in Bundelkhand?' },
      items: [
        { hi: 'बारिश कम हुई तो फ़सल सूख जाती है। बहुत ज़्यादा हुई तो भी फ़सल बैठ जाती है। ऐसे साल में खेत से कुछ नहीं आता, पर घर की ज़रूरतें वही रहती हैं।', en: 'If rain is short, the crop dries up. If it is too much, the crop is flattened. In such a year the field gives nothing, but the household needs stay the same.', f: ['GEN'] },
        { hi: 'दुधारू पशु हर दिन दूध देता है। इसलिए हाथ में थोड़ा-थोड़ा पैसा रोज़ या हफ़्ते में आता रहता है। यह बात सरकार के किसी आँकड़े से सिद्ध नहीं है, पर पशुपालक किसान इसे रोज़ देखते हैं।', en: 'A milking animal gives milk every day. So a little money keeps coming in every day or every week. No government figure proves this, but farmers who keep animals see it every day.', f: ['GEN'] },
        { hi: 'पशु खेती के साथ चलते हैं: भूसा और फ़सल के अवशेष चारा बनते हैं, और गोबर खेत की खाद बनता है। एक का बचा हुआ दूसरे के काम आता है।', en: 'Animals go along with farming: straw and crop residue become fodder, and dung becomes manure for the field. What one leaves over, the other uses.', f: ['GEN'] },
      ],
    },
    {
      id: 'streams', kind: 'ul',
      h: { hi: 'पशु से कमाई के कौन-कौन से रास्ते हैं?', en: 'What are the ways animals can earn?' },
      items: [
        { hi: 'दूध: सबसे सीधा रास्ता। रोज़ का दूध बेचने से नकद पैसा आता है। भाव और ख़रीदार पहले तय करें।', en: 'Milk: the most direct way. Selling the daily milk brings cash. Settle the price and the buyer first.', f: ['GEN'] },
        { hi: 'गोबर: खेत में खाद के रूप में डालें तो रासायनिक खाद का ख़र्च घटता है। इससे गोबर-गैस भी बन सकती है, जिससे रसोई का ईंधन मिलता है।', en: 'Dung: put it on the field as manure and you spend less on chemical fertiliser. It can also make gobar-gas, which gives cooking fuel.', f: ['GEN'] },
        { hi: 'चारा: जिनके पास थोड़ी ज़मीन है, वे चारे की फ़सल उगाकर अपना ख़र्च घटा सकते हैं। फ़ाज़िल चारा गाँव में बिक भी सकता है।', en: 'Fodder: those with a little land can grow fodder crops and cut their cost. Extra fodder can also be sold in the village.', f: ['GEN'] },
        { hi: 'बछड़े, बैल और प्रजनन: अच्छी नस्ल के बछड़े की माँग रहती है। कुछ पशुपालक अपने सांड से दूसरों की गायों का प्रजनन भी कराते हैं। इसमें सही नस्ल और टीकाकरण ज़रूरी है।', en: 'Calves, bulls and breeding: good-breed calves are in demand. Some keepers also offer their bull for others’ cows. Right breed and vaccination are essential.', f: ['GEN'] },
        { hi: 'देसी नस्ल के उत्पाद: देसी गाय के घी जैसे उत्पादों की माँग कुछ ख़रीदारों में रहती है। पर भाव और ख़रीदार तय करके ही इस पर दाँव लगाएँ। हम कोई भाव नहीं बता सकते।', en: 'Desi breed products: some buyers want products such as desi cow ghee. But bet on it only after settling price and buyer. We cannot quote a price.', f: ['GEN'] },
      ],
    },
    {
      id: 'dairy-coop', kind: 'p',
      h: { hi: 'डेयरी सहकारी संस्थाओं के बारे में सरकार क्या कहती है?', en: 'What does the government say about dairy cooperatives?' },
      items: [
        { hi: 'पीआईबी की एक जानकारी-पुस्तिका के अनुसार डेयरी क्षेत्र से देश के 8 करोड़ से ज़्यादा ग्रामीण परिवार जुड़े हैं, जिनमें बहुत से छोटे और सीमांत किसान हैं। उसी में लिखा है कि छोटे किसानों का सहकारी मॉडल घरों की आमदनी को "स्थिर" रखता है। यह डेयरी के बारे में सामान्य कथन है, फ़सल से तुलना नहीं।', en: 'A PIB backgrounder says over 8 crore rural households are linked to dairy, many of them small and marginal farmers. It also says the smallholder cooperative model has ensured “steady incomes”. This is a general statement about dairy, not a comparison with crops.', f: ['F-I7'] },
        { hi: 'उसी पुस्तिका में 2025 के आँकड़े हैं: 22 दूध महासंघ, 241 ज़िला संघ, लगभग 2.35 लाख गाँव और 1.72 करोड़ किसान सदस्य।', en: 'The same document gives 2025 figures: 22 milk federations, 241 district unions, about 2.35 lakh villages and 1.72 crore farmer members.', f: ['F-I8'] },
        { hi: 'पूरे पशुपालन-क्षेत्र का हाल भी देखिए: एक समाचार रिपोर्ट (IANS, 8 जनवरी 2026) के अनुसार 2023-24 में कृषि और संबद्ध क्षेत्रों की कुल कमाई में पशुपालन का हिस्सा 30.87 प्रतिशत रहा, जो 2014-15 में 24.38 प्रतिशत था।', en: 'See the whole animal sector too: one news report (IANS, 8 January 2026) says livestock was 30.87 percent of the output of agriculture and allied sectors in 2023-24, up from 24.38 percent in 2014-15.', f: ['F-I6'] },
      ],
    },
    {
      id: 'risks', kind: 'ul',
      h: { hi: 'जोखिम भी जानिए', en: 'Know the risks too' },
      items: [
        { hi: 'बीमारी: पशु बीमार पड़ा तो दूध घटता है और इलाज का ख़र्च बढ़ता है। समय पर टीके और साफ़-सफ़ाई सबसे सस्ता बचाव है।', en: 'Disease: if an animal falls ill, milk drops and treatment costs rise. Timely vaccines and cleanliness are the cheapest protection.', f: ['GEN'] },
        { hi: 'चारा महँगा होना: सूखे साल में भूसा और चारा महँगा हो जाता है। तब दूध की कमाई से ज़्यादा ख़र्च निकल सकता है।', en: 'Costly fodder: in a dry year straw and fodder get costly. Then the cost can exceed the milk income.', f: ['GEN'] },
        { hi: 'दूध का भाव: भाव ऊपर-नीचे होता है और ख़रीदार देर से भुगतान कर सकता है। एक ही ख़रीदार पर निर्भर न रहें।', en: 'Milk price: the price moves up and down and a buyer may pay late. Do not depend on a single buyer.', f: ['GEN'] },
        { hi: 'कर्ज़ का बोझ: उधार लेकर पशु ख़रीदें तो पहले हिसाब लगाएँ कि किस्त चुकाने के बाद भी कुछ बचेगा या नहीं।', en: 'Debt: if you borrow to buy animals, first work out whether anything is left after paying the instalment.', f: ['GEN'] },
        { hi: 'गर्मी और ठंड: बहुत गर्मी या ठंड में दूध घट सकता है। छाया, पानी और ढके बाड़े का इंतज़ाम पहले करें।', en: 'Heat and cold: milk can drop in extreme heat or cold. Arrange shade, water and a covered shed first.', f: ['GEN'] },
      ],
    },
    {
      id: 'schemes', kind: 'ul',
      h: { hi: 'सरकारी योजनाएँ इसमें कहाँ जुड़ती हैं?', en: 'Where do the government schemes fit in?' },
      items: [
        { hi: 'देसी गाय पर महीने की मदद की योजना अभी बन रही है: {{page:pashupalan/desi-gay-anudan}}। यह दूध की कमाई की जगह नहीं लेती।', en: 'A monthly assistance for desi cows is being prepared: {{page:pashupalan/desi-gay-anudan}}. It does not replace milk income.', f: ['F-A1'] },
        { hi: 'बड़ी डेयरी के लिए लोन और सब्सिडी का रास्ता: {{page:pashupalan/kamdhenu-yojana}}।', en: 'The loan and subsidy route for a larger dairy: {{page:pashupalan/kamdhenu-yojana}}.', f: ['F-B1'] },
        { hi: 'चारे और दवा के लिए बैंक से कर्ज़: {{page:pashupalan/pashu-kisan-credit-card}}।', en: 'Bank credit for fodder and medicines: {{page:pashupalan/pashu-kisan-credit-card}}.', f: ['F-D1'] },
        { hi: 'गौशाला चलाने वालों के लिए अनुदान: {{page:pashupalan/gaushala-anudan}}। यह अनुदान गौशाला संस्थाओं के लिए है।', en: 'The grant for those who run gaushalas: {{page:pashupalan/gaushala-anudan}}. This grant is for gaushala bodies.', f: ['F-C1'] },
        { hi: 'केंद्र की योजनाएँ: {{page:pashupalan/kendriya-yojanayen}}। नस्ल की जानकारी: {{page:pashupalan/desi-nasle}}।', en: 'Central schemes: {{page:pashupalan/kendriya-yojanayen}}. Breed information: {{page:pashupalan/desi-nasle}}.', f: ['F-F1'] },
      ],
    },
    {
      id: 'sagar', kind: 'ul',
      h: { hi: 'सागर संभाग में मदद कहाँ मिलेगी?', en: 'Where to get help in Sagar division' },
      items: [
        { hi: 'चारा, भूसा और उपकरण ख़रीदने-बेचने के लिए हमारा बाज़ार पेज: {{page:bazaar}}।', en: 'To buy or sell fodder, straw and equipment, use our bazaar page: {{page:bazaar}}.', f: ['GEN'] },
        { hi: 'पशु चिकित्सालय और कृषि विभाग के फ़ोन नंबर और हेल्पलाइन: {{page:resources}}।', en: 'Phone numbers and helplines of veterinary and agriculture offices: {{page:resources}}.', f: ['GEN'] },
        { hi: 'अपना सवाल पूछें: {{page:sawaal}}। बारिश और मौसम देखकर चारे की योजना बनाएँ: {{page:mausam}}।', en: 'Ask your question: {{page:sawaal}}. Plan fodder by checking rain and weather: {{page:mausam}}.', f: ['GEN'] },
      ],
    },
  ],
  income: {
    h: { hi: 'आपकी कमाई पर असर', en: 'What it means for your income' },
    items: [
      { hi: 'आँकड़े कहते हैं कि देश में पशुपालन खेतिहर परिवार की कमाई का करीब सातवाँ हिस्सा देता है। यह औसत है। आपका हिस्सा पशुओं की संख्या, चारे के ख़र्च और दूध के भाव पर निर्भर करेगा।', en: 'The figures say animals give roughly one-seventh of a farm family’s income in India. That is an average. Your share will depend on the number of animals, the fodder cost and the milk price.', f: ['F-I1'] },
      { hi: 'कम ज़मीन वाले परिवार के लिए पशु फ़सल से बड़ी कमाई दे सकते हैं, यह सर्वे में दिखा। पर इसका मतलब यह नहीं कि हर किसान को कर्ज़ लेकर पशु ख़रीद लेना चाहिए। पहले हिसाब लगाएँ।', en: 'For a family with little land, animals can earn more than crops, as the survey showed. But that does not mean every farmer should borrow to buy animals. Do the sums first.', f: ['F-I3'] },
    ],
  },
  caution: {
    h: { hi: 'हिसाब लगाए बिना कर्ज़ न लें', en: 'Do not borrow without doing the sums' },
    items: [
      { hi: 'कोई एजेंट "पक्की कमाई" का वादा करे तो भरोसा न करें। किसी को पंजीकरण के पैसे न दें और ओटीपी या आधार किसी को न दें। बैंक या विभाग से सीधे पूछें।', en: 'Do not trust an agent who promises “guaranteed income”. Do not pay anyone for registration and do not give an OTP or Aadhaar to anyone. Ask the bank or department directly.', f: ['GEN'] },
    ],
  },
  tip: {
    h: { hi: 'छोटी शुरुआत करें', en: 'Start small' },
    items: [
      { hi: 'पहले साल एक-दो पशुओं से शुरू करें, चारे और दूध का असली हिसाब देखें, तब बढ़ाएँ। इससे ग़लती महँगी नहीं पड़ती।', en: 'Start with one or two animals in the first year, see the real fodder and milk sums, then grow. That way a mistake is not costly.', f: ['GEN'] },
    ],
  },
  // Calculator labels. Pure arithmetic in src/lib/pashupalan/milk-calc.js; nothing is stored or sent. Placeholders are examples only.
  calc: {
    h: { hi: 'दूध की कमाई का हिसाब', en: 'Milk income calculator' },
    intro: { hi: 'अपने आँकड़े डालिए। यह सिर्फ़ फ़ोन पर हिसाब करता है। कुछ भी सेव या भेजा नहीं जाता।', en: 'Enter your own figures. It only calculates on your phone. Nothing is saved or sent.' },
    fields: {
      animals: { l: { hi: 'दूध देने वाले पशु कितने हैं?', en: 'How many milking animals?' }, ph: { hi: 'उदाहरण', en: 'Example' } },
      litres: { l: { hi: 'हर पशु रोज़ कितने लीटर दूध देता है?', en: 'Litres per animal per day?' }, ph: { hi: 'उदाहरण', en: 'Example' } },
      price: { l: { hi: 'दूध का भाव, ₹ प्रति लीटर', en: 'Milk price, Rs per litre' }, ph: { hi: 'उदाहरण', en: 'Example' } },
      cost: { l: { hi: 'चारा और दूसरा ख़र्च, ₹ प्रति पशु प्रति दिन', en: 'Fodder and other cost, Rs per animal per day' }, ph: { hi: 'उदाहरण', en: 'Example' } },
    },
    aidSwitch: { hi: 'अगर ₹900/माह की मदद मिले (अभी तय नहीं)', en: 'If Rs 900/month help is given (not decided yet)' },
    income: { hi: 'महीने की दूध से कमाई', en: 'Milk income for the month' },
    spend: { hi: 'महीने का ख़र्च', en: 'Cost for the month' },
    diff: { hi: 'बचत (कमाई − ख़र्च)', en: 'What is left (income − cost)' },
    aidLine: { hi: 'मदद जोड़ने पर (पशु × ₹900)', en: 'With help added (animals × Rs 900)' },
    disclaimer: { hi: 'यह सिर्फ़ हिसाब है, पक्की कमाई नहीं', en: 'This is only a calculation, not a guaranteed income' },
    empty: { hi: 'ऊपर के चारों खाने भरें, तब हिसाब दिखेगा।', en: 'Fill the four boxes above to see the sum.' },
    perMonth: { hi: '₹ महीना', en: 'Rs a month' },
    days: 30,
  },
  faqs: [
    { q: { hi: 'पशुपालन से किसान की कमाई कितनी होती है?', en: 'How much does a farmer earn from animals?' }, a: { hi: 'सरकारी सर्वे (जुलाई 2018–जून 2019) में देश के खेतिहर परिवार की औसत कमाई का 15.5 प्रतिशत पशुओं से आया। मध्य प्रदेश में यह औसतन ₹1,295 हर महीने था। आपकी कमाई आपके पशुओं और ख़र्च पर निर्भर है।', en: 'In the government survey (July 2018–June 2019), 15.5 percent of an average agricultural household’s income in India came from animals. In Madhya Pradesh it averaged Rs 1,295 a month. Your income depends on your animals and costs.' }, f: ['F-I1', 'F-I2'] },
    { q: { hi: 'क्या कम ज़मीन वाले को पशु पालना चाहिए?', en: 'Should a farmer with little land keep animals?' }, a: { hi: 'सर्वे में 0.01 हेक्टेयर से कम ज़मीन वाले परिवारों की पशु-कमाई ₹2,084 और फ़सल-कमाई ₹1,660 महीना रही। पर पहले चारे, पानी और ख़रीदार का इंतज़ाम देख लें।', en: 'In the survey, families with under 0.01 hectare earned Rs 2,084 a month from animals and Rs 1,660 from crops. But first check fodder, water and a buyer.' }, f: ['F-I3'] },
    { q: { hi: 'मध्य प्रदेश दूध उत्पादन में कहाँ है?', en: 'Where does Madhya Pradesh stand in milk production?' }, a: { hi: 'पशुपालन आँकड़े 2025 के अनुसार 2024-25 में मध्य प्रदेश 9.12 प्रतिशत हिस्से के साथ देश में तीसरे स्थान पर रहा।', en: 'According to the Basic Animal Husbandry Statistics 2025, Madhya Pradesh was third in the country in 2024-25 with a 9.12 percent share.' }, f: ['F-I4'] },
    { q: { hi: 'क्या पशुपालन फ़सल से ज़्यादा स्थिर कमाई देता है?', en: 'Is income from animals steadier than from crops?' }, a: { hi: 'हमें इसका कोई सरकारी आँकड़ा नहीं मिला। दुधारू पशु रोज़ दूध देता है, इसलिए नकद पैसा लगातार आता है, पर चारे का ख़र्च और बीमारी का जोखिम भी रहता है।', en: 'We found no official figure for this. A milking animal gives milk daily, so cash comes steadily, but fodder cost and disease risk remain.' }, f: ['GEN'] },
    { q: { hi: 'कमाई का हिसाब कैसे लगाऊँ?', en: 'How do I work out my income?' }, a: { hi: 'ऊपर का कैलकुलेटर इस्तेमाल करें: पशुओं की संख्या, रोज़ का दूध, भाव और चारे का ख़र्च डालें। यह महीने की कमाई, ख़र्च और बचत दिखाएगा।', en: 'Use the calculator above: enter the number of animals, daily milk, price and fodder cost. It shows the monthly income, cost and what is left.' }, f: ['GEN'] },
    { q: { hi: 'क्या ₹900 की मदद मेरी कमाई में जुड़ेगी?', en: 'Will the Rs 900 help add to my income?' }, a: { hi: 'अभी तय नहीं। यह योजना अभी बन रही है और रकम प्रति गाय है या प्रति परिवार, यह घोषित नहीं हुआ। कैलकुलेटर में इसे सिर्फ़ उदाहरण के तौर पर जोड़ा जा सकता है।', en: 'Not decided. The scheme is still being prepared and it is not announced whether the amount is per cow or per family. The calculator can add it only as an illustration.' }, f: ['F-A1', 'F-A6'] },
  ],
  sources: [
    { title: { hi: 'राष्ट्रीय सांख्यिकी कार्यालय — खेतिहर परिवारों का सर्वे 2019 (रिपोर्ट 587)', en: 'National Statistical Office — Situation Assessment of Agricultural Households 2019 (Report 587)' }, url: 'https://www.mospi.gov.in/sites/default/files/publication_reports/Report_587m_0.pdf', type: 'OFFICIAL', date: '2021-09' },
    { title: { hi: 'पीआईबी — बुनियादी पशुपालन आँकड़े 2025', en: 'PIB — Basic Animal Husbandry Statistics 2025' }, url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2195049&reg=3&lang=2', type: 'OFFICIAL', date: '2025-11-26' },
    { title: { hi: 'पीआईबी — भारत का डेयरी क्षेत्र (जानकारी-पुस्तिका)', en: 'PIB — India’s Dairy Sector (backgrounder)' }, url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/sep/doc2025929650301.pdf', type: 'OFFICIAL', date: '2025' },
    { title: { hi: 'आईएएनएस — पशुपालन क्षेत्र का हिस्सा', en: 'IANS — livestock sector share' }, url: 'https://ianslive.in/livestock-sector-continues-to-strengthen-indias-agricultural-economy--20260108103917', type: 'NEWS', date: '2026-01-08' },
  ],
  related: ['/pashupalan/desi-gay-anudan', '/pashupalan/kamdhenu-yojana', '/pashupalan/pashu-kisan-credit-card', '/pashupalan', '/bazaar', '/sawaal', '/mausam', '/resources'],
}
