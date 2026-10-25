// /grievance — Feedback & Grievance page (Phase 4; friendly form added in Batch 7A).
// Bilingual, authored as structured content; FAQPage JSON-LD is emitted from the same
// data. Batch 7E kept this short on purpose: the form, a plain e-mail address and a
// few lines on how complaints work. No named officer, no appeal route and no promised
// response time. `blocks` is shown inside the collapsed "More information" section.
export const grievancePage = {
  slug: 'grievance',
  title: {
    hi: 'सुझाव और शिकायत — किसान सहयोग',
    en: 'Feedback & Grievance — Kissan Sahyog',
  },
  h1: {
    hi: 'सुझाव और शिकायत',
    en: 'Feedback & Grievance',
  },
  intro: {
    hi: 'आपकी बात हमारे लिए महत्वपूर्ण है। सुझाव दें या समस्या बताएँ, हम सुधार करेंगे।',
    en: 'What you tell us matters. Share a suggestion or tell us about a problem, and we will work to put it right.',
  },
  description: {
    hi: 'किसान सहयोग को सुझाव दें या समस्या बताएँ। हम आपके दिए ईमेल या मोबाइल नंबर पर संपर्क करेंगे। सामान्य सवाल के लिए hello@kissansahyog.com पर लिखें।',
    en: 'Send Kissan Sahyog a suggestion or report a problem. We contact you on the email or mobile number you give. General questions: hello@kissansahyog.com.',
  },
  // Heading of the collapsed section.
  legal_h2: {
    hi: 'शिकायत के बारे में',
    en: 'About complaints',
  },
  updated: '2026-10-12',
  blocks: [
    {
      type: 'heading', level: 2,
      text: { hi: 'शिकायत कैसे करें', en: 'How to make a complaint' },
    },
    {
      type: 'list', ordered: true,
      items: [
        { text: { hi: 'हर लिस्टिंग, विक्रेता और कोल्ड स्टोरेज पेज पर दिए "शिकायत करें" बटन से शिकायत भेजें।', en: 'Use the "Report" (शिकायत करें) button shown on every listing, vendor and cold-storage page.' } },
        { text: { hi: 'या इसी पेज का फ़ॉर्म भरें — शिकायत का कारण और लिस्टिंग/विक्रेता का विवरण लिखें।', en: 'Or fill in the form on this page — state the reason and the listing/seller details.' } },
      ],
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
      text: { hi: 'इस फ़ॉर्म की जानकारी का क्या होता है', en: 'What happens to what you enter in this form' },
    },
    {
      // Batch 7B — the same line is in the privacy policy (src/lib/i18n/legal.js).
      type: 'paragraph',
      text: {
        hi: 'इस फ़ॉर्म में दिया गया ईमेल या मोबाइल नंबर केवल आपके संदेश का जवाब देने के लिए रखा जाता है और सार्वजनिक रूप से नहीं दिखाया जाता।',
        en: 'The email or mobile number you give in this form is stored only to reply to your message and is not shown publicly.',
      },
    },
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'शिकायत करने के लिए लॉगिन ज़रूरी है?', en: 'Do I need to log in to complain?' },
          a: { hi: 'नहीं। "शिकायत करें" बटन से बिना लॉगिन भी शिकायत भेजी जा सकती है। आप चाहें तो अपना फ़ोन नंबर दे सकते हैं ताकि ज़रूरत पर संपर्क किया जा सके।', en: 'No. You can report without logging in using the "Report" button. You may optionally share your phone number so we can contact you if needed.' },
        },
        {
          q: { hi: 'क्या किसान सहयोग खुद खरीद-बिक्री करता है?', en: 'Does Kissan Sahyog itself buy or sell?' },
          a: { hi: 'नहीं। हम केवल एक सूचना मंच (मध्यस्थ) हैं। सौदा, भाव और भुगतान दोनों पक्षों के बीच होता है; हम उसमें शामिल नहीं होते।', en: 'No. We are only an information platform (intermediary). The deal, the price and the payment are between the two parties; we are not part of them.' },
        },
      ],
    },
  ],
}

export default grievancePage
