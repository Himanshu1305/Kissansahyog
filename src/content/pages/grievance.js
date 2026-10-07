// /grievance — Grievance Officer page (Phase 4). Bilingual, authored as
// structured content so every legal number carries a citation (§0.2) and
// FAQPage JSON-LD is emitted from the same data. Contacts per §0.3.
export const grievancePage = {
  slug: 'grievance',
  title: {
    hi: 'शिकायत अधिकारी — किसान सहयोग',
    en: 'Grievance Officer — Kissan Sahyog',
  },
  h1: {
    hi: 'शिकायत अधिकारी और शिकायत निवारण',
    en: 'Grievance Officer & complaint redressal',
  },
  updated: '2026-10-06',
  blocks: [
    {
      type: 'summary',
      text: {
        hi: 'किसी लिस्टिंग, विक्रेता या जानकारी से आपको शिकायत है? हमारे शिकायत अधिकारी श्री अभिनंदन दीक्षित से grievance@kissansahyog.com पर संपर्क करें। हम शिकायत मिलने पर 24 घंटे में पावती (रसीद) देते हैं और आमतौर पर 7 दिन के भीतर निपटारा करते हैं।',
        en: 'Have a complaint about a listing, seller or information? Contact our Grievance Officer, Shri Abhinandan Dixit, at grievance@kissansahyog.com. We acknowledge every complaint within 24 hours and usually resolve it within 7 days.',
      },
      cites: ['S-JUG-29'],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'शिकायत अधिकारी कौन हैं', en: 'Who is the Grievance Officer' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'शिकायत अधिकारी: श्री अभिनंदन दीक्षित। ईमेल: grievance@kissansahyog.com। किसान सहयोग को USD Vision AI LLP, मध्य प्रदेश, भारत चलाती है। सामान्य संपर्क के लिए hello@kissansahyog.com पर लिखें।',
        en: 'Grievance Officer: Shri Abhinandan Dixit. Email: grievance@kissansahyog.com. Kissan Sahyog is operated by USD Vision AI LLP, Madhya Pradesh, India. For general contact, write to hello@kissansahyog.com.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'शिकायत कैसे करें', en: 'How to make a complaint' },
    },
    {
      type: 'list', ordered: true,
      items: [
        { text: { hi: 'हर लिस्टिंग, विक्रेता और कोल्ड स्टोरेज पेज पर दिए "शिकायत करें" बटन से शिकायत भेजें।', en: 'Use the "Report" (शिकायत करें) button shown on every listing, vendor and cold-storage page.' } },
        { text: { hi: 'या सीधे grievance@kissansahyog.com पर ईमेल करें — शिकायत का कारण, लिस्टिंग/विक्रेता का विवरण और आपका संपर्क नंबर लिखें।', en: 'Or email grievance@kissansahyog.com directly — state the reason, the listing/seller details and your contact number.' } },
        { text: { hi: 'हम आपकी शिकायत की पावती 24 घंटे के भीतर देते हैं।', en: 'We acknowledge your complaint within 24 hours.' }, cites: ['S-JUG-29'] },
        { text: { hi: 'आमतौर पर 7 दिन के भीतर शिकायत का निपटारा किया जाता है।', en: 'The complaint is usually resolved within 7 days.' }, cites: ['S-JUG-29'] },
      ],
    },
    {
      type: 'fact',
      text: {
        hi: 'सूचना प्रौद्योगिकी (मध्यवर्ती संस्था दिशानिर्देश) नियम, 2021 — जैसा कि G.S.R. 120(E) द्वारा संशोधित, 10 फ़रवरी 2026 को अधिसूचित और 20 फ़रवरी 2026 से लागू — के अनुसार शिकायत का निवारण 7 दिन के भीतर करना होता है (पहले 15 दिन था)।',
        en: 'Under the Information Technology (Intermediary Guidelines) Rules, 2021 — as amended by G.S.R. 120(E), notified 10 February 2026 and in force from 20 February 2026 — grievances must be resolved within 7 days (earlier 15 days).',
      },
      cites: ['S-JUG-29', 'S-JUG-30'],
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'शिकायत सही पाए जाने पर', en: 'If the complaint is found valid' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'शिकायत सही पाए जाने पर हम लिस्टिंग/विक्रेता को हटा सकते हैं। किसान सहयोग केवल एक मध्यस्थ (सूचना मंच) है — हम किसी लेन-देन, भुगतान या समझौते में शामिल नहीं होते। कृपया संपर्क से पहले सामने वाले की पहचान और जानकारी स्वयं जाँच लें।',
        en: 'If a complaint is found valid, we may remove the listing/seller. Kissan Sahyog is only an intermediary (information platform) — we are not part of any transaction, payment or agreement. Please verify the other person’s identity and details yourself before proceeding.',
      },
    },
    {
      type: 'heading', level: 2,
      text: { hi: 'आगे अपील (एस्केलेशन)', en: 'Further appeal (escalation)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'हमारे शिकायत अधिकारी के निर्णय से संतुष्ट न हों तो आप आगे अपील कर सकते हैं। अपील भारत सरकार की शिकायत अपीलीय समिति (Grievance Appellate Committee) में gac.gov.in पर करें — निर्णय की सूचना के 30 दिन के भीतर।',
        en: 'If you are not satisfied with the Grievance Officer’s decision, you may appeal to the Government of India’s Grievance Appellate Committee at gac.gov.in, within 30 days of being informed of the decision.',
      },
      cites: ['S-JUG-71'],
    },
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'शिकायत करने के लिए लॉगिन ज़रूरी है?', en: 'Do I need to log in to complain?' },
          a: { hi: 'नहीं। "शिकायत करें" बटन से बिना लॉगिन भी शिकायत भेजी जा सकती है। आप चाहें तो अपना फ़ोन नंबर दे सकते हैं ताकि ज़रूरत पर संपर्क किया जा सके।', en: 'No. You can report without logging in using the "Report" button. You may optionally share your phone number so we can contact you if needed.' },
        },
        {
          q: { hi: 'पावती कब तक मिलेगी?', en: 'How soon will I get an acknowledgement?' },
          a: { hi: 'शिकायत मिलने के 24 घंटे के भीतर।', en: 'Within 24 hours of receiving your complaint.' }, cites: ['S-JUG-29'],
        },
        {
          q: { hi: 'निपटारे में कितना समय लगता है?', en: 'How long does resolution take?' },
          a: { hi: 'आमतौर पर 7 दिन के भीतर, जैसा कि IT नियम 2021 (G.S.R. 120(E) संशोधन) में तय है।', en: 'Usually within 7 days, as set out in the IT Rules 2021 (G.S.R. 120(E) amendment).' }, cites: ['S-JUG-29'],
        },
        {
          q: { hi: 'क्या किसान सहयोग खुद खरीद-बिक्री करता है?', en: 'Does Kissan Sahyog itself buy or sell?' },
          a: { hi: 'नहीं। हम केवल एक मुफ़्त सूचना मंच (मध्यस्थ) हैं। कोई भुगतान, कमीशन या भाव तय करना हमारी ओर से नहीं होता।', en: 'No. We are only a free information platform (intermediary). We take no payment or commission and do not set any rates.' },
        },
      ],
    },
  ],
}

export default grievancePage
