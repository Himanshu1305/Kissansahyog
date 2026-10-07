// /cold-storage hub intro — authored as structured content so the MP capacity
// figures carry citations (§0.2). The live directory (filters + cards) is
// rendered by the screen below this content.
export const coldStoragePage = {
  slug: 'cold-storage',
  title: {
    hi: 'मध्य प्रदेश कोल्ड स्टोरेज खोजें — गोदाम सूची',
    en: 'MP Cold Storage Finder — warehouse directory',
  },
  h1: {
    hi: 'मध्य प्रदेश कोल्ड स्टोरेज खोजें',
    en: 'MP Cold Storage Finder',
  },
  updated: '2026-10-06',
  blocks: [
    {
      type: 'summary',
      text: {
        hi: 'अपने ज़िले में कोल्ड स्टोरेज और गोदाम खोजें। यह सूची सार्वजनिक स्रोतों से बनाई गई है — आलू, प्याज, लहसुन, फल और बीज के भंडारण के लिए नाम, शहर, ज़िला, क्षमता और (जहाँ उपलब्ध हो) फ़ोन नंबर दिखाती है।',
        en: 'Find cold storage and warehouses in your district. This directory is compiled from public sources — showing name, city, district, capacity and (where available) phone, for storing potato, onion, garlic, fruit and seed.',
      },
    },
    {
      type: 'fact',
      text: {
        hi: 'मध्य प्रदेश में कोल्ड स्टोरेज की बनाई गई क्षमता 13,64,003 मीट्रिक टन है, जबकि ज़रूरत 18,67,179 मीट्रिक टन की है (31 मई 2024 तक) — यानी माँग के मुक़ाबले क्षमता कम है।',
        en: 'Madhya Pradesh has 13,64,003 MT of created cold-storage capacity against a requirement of 18,67,179 MT (as of 31 May 2024) — capacity is short of demand.',
      },
      cites: ['S-CS-01'],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'कोल्ड स्टोरेज कैसे चुनें', en: 'How to choose a cold storage' },
    },
    {
      type: 'checklist',
      title: { hi: 'भंडारण से पहले यह जाँचें', en: 'Check before you store' },
      items: [
        { text: { hi: 'सही तापमान: आपकी फसल के लिए सही तापमान बनता है या नहीं — आलू के लिए ठंडा, प्याज और लहसुन के लिए सूखा और हवादार।', en: 'Right temperature: whether it suits your crop — cold for potato, dry and ventilated for onion and garlic.' } },
        { text: { hi: 'खाली जगह: अभी कितनी जगह उपलब्ध है और वह जानकारी कब अपडेट हुई।', en: 'Space available now and when that was last updated.' } },
        { text: { hi: 'भाव और इकाई: प्रति क्विंटल/माह, प्रति बोरी/सीज़न या प्रति क्रेट/दिन — और लोडिंग शुल्क।', en: 'Rate and unit: per quintal/month, per bag/season or per crate/day — and loading charges.' } },
        { text: { hi: 'बिजली बैकअप और बीमा: पावर बैकअप है या नहीं, और भंडारित माल का बीमा है या नहीं।', en: 'Power backup and insurance of stored goods.' } },
        { text: { hi: 'दूरी और ढुलाई: आपके गाँव से दूरी और ढुलाई का खर्च।', en: 'Distance from your village and transport cost.' } },
        { text: { hi: 'WDRA पंजीकरण और गिरवी-ऋण (pledge loan): यदि आप भंडारण रसीद पर बैंक ऋण लेना चाहते हैं।', en: 'WDRA registration and pledge-loan facility, if you want a bank loan against the storage receipt.' } },
        { text: { hi: 'जानकारी स्वयं जाँचें: फ़ोन करके वर्तमान भाव, जगह और शर्तें ख़ुद पक्की करें।', en: 'Verify yourself: call to confirm current rate, space and terms.' } },
      ],
    },
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'यह सूची कहाँ से आई है?', en: 'Where does this directory come from?' },
          a: { hi: 'सार्वजनिक स्रोतों से — राष्ट्रीय बागवानी बोर्ड (NHB), MoFPI, NaPanta, IndiaMART, Justdial और Google Maps। हर कार्ड पर स्रोत का लिंक दिया है।', en: 'From public sources — NHB, MoFPI, NaPanta, IndiaMART, Justdial and Google Maps. Each card links its source.' }, cites: ['S-CS-02'],
        },
        {
          q: { hi: '"पुरानी सरकारी सूची" का क्या मतलब है?', en: 'What does "old government list" mean?' },
          a: { hi: 'कुछ प्रविष्टियाँ NHB की 2000–2009 की स्वीकृति सूची से हैं। ये इकाइयाँ अभी चालू हैं या नहीं, यह पुष्टि नहीं की गई — कृपया फ़ोन करके जाँचें।', en: 'Some entries come from NHB’s 2000–2009 sanction list. Whether these units still operate is not verified — please call to check.' }, cites: ['S-CS-02'],
        },
        {
          q: { hi: 'मेरा कोल्ड स्टोरेज इस सूची में है — मैं इसे कैसे ठीक करूँ?', en: 'My cold storage is listed — how do I correct it?' },
          a: { hi: 'हर कार्ड पर "गलत जानकारी? बताएँ" लिंक है — उससे सही जानकारी भेजें, हम सुधार कर देंगे। अपनी इकाई खुद डालने के लिए ऊपर दिया बटन दबाएँ।', en: 'Each card has a "Wrong info? Tell us" link — send the correction and we will fix it. To list your own unit, use the button above.' },
        },
        {
          q: { hi: 'सागर ज़िले में इतनी कम प्रविष्टियाँ क्यों हैं?', en: 'Why so few entries in Sagar district?' },
          a: { hi: 'सागर के लिए सार्वजनिक ऑनलाइन सूची बहुत कम है। यदि आपके पास कोल्ड स्टोरेज है, तो कृपया अपनी इकाई पंजीकृत करवाएँ।', en: 'Public online listings for Sagar are very thin. If you own a cold storage, please register your unit.' },
        },
      ],
    },
  ],
}

export default coldStoragePage
