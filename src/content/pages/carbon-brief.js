// /carbon-credit/niti-sujhav — a short, printable policy brief for officials.
// Same §0.2 rule: every block with a number/₹/%/date/करोड़/लाख/प्रतिशत carries
// cites from src/content/sources.js. Hindi literals allowed (this is data).
export const carbonBriefPage = {
  slug: 'carbon-credit/niti-sujhav',
  title: {
    hi: 'कार्बन क्रेडिट — नीति सुझाव (मध्य प्रदेश)',
    en: 'Carbon credit — policy brief (Madhya Pradesh)',
  },
  h1: {
    hi: 'कार्बन क्रेडिट — नीति सुझाव (मध्य प्रदेश)',
    en: 'Carbon credit — policy brief (Madhya Pradesh)',
  },
  updated: '2026-10-06',
  checked: '2026-10-06',
  blocks: [
    {
      type: 'summary',
      text: {
        hi: 'यह छोटा नीति-पत्र अधिकारियों के लिए है। कार्बन क्रेडिट किसानों के लिए अतिरिक्त आय का संभावित अवसर है, पर आय तय नहीं है और अब तक लाभ पहुँचना अनिश्चित रहा है। एक अध्ययन में 99% से ज़्यादा किसानों को कोई भुगतान नहीं मिला। मध्य प्रदेश के लिए सुझाव — सधे पायलट, FPO के ज़रिए किसानों को जोड़ना, मानक अनुबंध, सार्वजनिक रजिस्ट्री, और पारगमन-अनुमति में साफ़ नियम।',
        en: 'This short policy note is for officials. Carbon credit is a possible extra-income opportunity for farmers, but income is not fixed and benefits reaching farmers has so far been uncertain. In one study, over 99% of farmers got no payment. Suggestions for Madhya Pradesh — careful pilots, connecting farmers through FPOs, a standard contract, a public registry, and clear transit-permit rules.',
      },
      cites: ['S-CARB-11'],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'मुख्य आँकड़े', en: 'Key figures' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'भारत के पहले मृदा-कार्बन भुगतान में पंजाब और हरियाणा के 2,550 किसानों को कुल ₹2.9 करोड़ दिए गए।', en: 'India\'s first soil-carbon payments: ₹2.9 crore to 2,550 farmers in Punjab and Haryana.' }, cites: ['S-CARB-01'] },
        { text: { hi: 'पंजाब की कृषि-वानिकी कार्बन-क्रेडिट योजना में 3,686 किसानों को चार क़िस्तों में ₹45 करोड़ देने की घोषणा हुई।', en: 'Punjab\'s agroforestry carbon-credit scheme: ₹45 crore for 3,686 farmers in four instalments.' }, cites: ['S-CARB-03'] },
        { text: { hi: 'हरियाणा और म.प्र. के 800+ किसानों के अध्ययन में 99% से ज़्यादा को कोई भुगतान नहीं मिला; 28% ने दूसरे साल तरीक़े छोड़ दिए।', en: 'In a study of 800+ farmers in Haryana and MP, over 99% got no payment; 28% dropped the practices by year 2.' }, cites: ['S-CARB-11'] },
        { text: { hi: 'जुलाई 2026 के लोकसभा उत्तर में किसानों की आय-संभावना पर "अब तक कोई आकलन नहीं किया गया"; 11 पायलट चल रहे हैं।', en: 'A July 2026 Lok Sabha reply: "no assessment has been carried out so far" on farmers\' income; 11 pilots are running.' }, cites: ['S-CARB-09'] },
        { text: { hi: 'पौधारोपण से बने ग्रीन क्रेडिट को "ग़ैर-व्यापारिक और ग़ैर-हस्तांतरणीय" बनाया गया, 5 साल बाद 40% कैनोपी घनत्व की शर्त के साथ।', en: 'Plantation-based green credits made "non-tradable and non-transferable", with a 40% canopy-density condition after 5 years.' }, cites: ['S-CARB-33'] },
      ],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'नीति विकल्प', en: 'Policy options' },
    },
    {
      type: 'list',
      ordered: true,
      items: [
        { text: { hi: 'चुनिंदा ज़िलों में छोटे, मापे-जा-सकने वाले पायलट चलाना, ताकि असल लाभ और जोखिम पहले समझ आ जाएँ।' } },
        { text: { hi: 'किसान उत्पादक संगठनों (FPO) के ज़रिए किसानों को जोड़ना, ताकि छोटे किसानों को मोलभाव की ताक़त मिले।' } },
        { text: { hi: 'एक मानक किसान अनुबंध, जिसमें भुगतान, हिस्सेदारी और अवधि सरल भाषा में साफ़ हों।' } },
        { text: { hi: 'एक सार्वजनिक रजिस्ट्री, जिसमें परियोजनाएँ, कंपनियाँ और भुगतान खुले तौर पर दर्ज हों।' } },
        { text: { hi: 'पारगमन-अनुमति की व्यवस्था साफ़ और सरल करना, ताकि खेत के पेड़ों से किसान सचमुच लाभ ले सके।' } },
      ],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'स्रोत', en: 'Sources' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इस पत्र के सभी आँकड़े सरकारी और समाचार स्रोतों से लिए गए हैं और नीचे स्रोत-सूची में क्रमांक सहित दर्ज हैं। पूरे विश्लेषण के लिए मुख्य पेज "कार्बन क्रेडिट" देखें।',
        en: 'All figures in this note are drawn from official and news sources and are listed, numbered, in the sources list below. For the full analysis, see the main "Carbon credit" page.',
      },
    },
  ],
}

export default carbonBriefPage
