// Disclaimer copy — used EXACTLY as written by the spec. These always render
// Hindi (primary) + English (secondary) together, styled as visible banners,
// regardless of the selected UI language. Do not edit the wording.

export const disclaimers = {
  // Listing consent is intentionally itemised. A previous single acknowledgement
  // is not a substitute for these four choices.
  listingConsents: [
    { id: 'connect_only', hi: 'मुझे पता है कि किसान सहयोग सिर्फ़ लोगों को आपस में जोड़ता है। किसान सहयोग किसी सौदे का पक्ष नहीं है।', en: 'I understand Kisan Sahyog only connects people. It is not a party to any deal.' },
    { id: 'no_verification', hi: 'मुझे पता है कि किसान सहयोग लिस्टिंग या लोगों की जाँच नहीं करता।', en: 'I understand Kisan Sahyog does not verify listings or people.' },
    { id: 'no_payments', hi: 'पैसे का लेन-देन किसान सहयोग से नहीं होता। भुगतान से पहले सामान या सेवा और सामने वाले को खुद जाँच लेना मेरी ज़िम्मेदारी है।', en: 'Payments do not go through Kisan Sahyog. It is my responsibility to check the goods or service and the other person before paying.' },
    { id: 'posting_rules', hi: 'मेरी दी हुई जानकारी सही है, और मुझे पोस्टिंग के नियम मंज़ूर हैं।', en: 'The information I give is correct, and I accept the posting rules.', terms: true },
  ],
  // One-time signup acknowledgment.
  signup: {
    hi: 'किसान सहयोग एक जानकारी साझा करने वाला मंच है। हम किसी भी सौदे, भुगतान या समझौते में शामिल नहीं हैं। कृपया किसी भी लेन-देन से पहले दूसरे व्यक्ति की पहचान और जानकारी स्वयं जांच लें।',
    en: 'Kissan Sahyog is an information-sharing platform only. We are not involved in any deal, payment, or agreement between users. Please verify the other person’s identity and details yourself before proceeding.',
  },
  // Short caution shown right above a phone-number reveal / Call button.
  phoneReveal: {
    hi: 'सावधान: लेन-देन से पहले जानकारी जांचें। हम ज़िम्मेदार नहीं हैं।',
    en: 'Caution: Verify details before dealing. We are not responsible for the transaction.',
  },
  // Footer note on every listing-creation form.
  listingForm: {
    hi: 'गलत जानकारी देने पर आपकी लिस्टिंग हटाई जा सकती है।',
    en: 'Providing false information may result in your listing being removed.',
  },
  // Bhusa/Parali form: encourage selling residue instead of burning it.
  bhusa: {
    hi: 'भूसा/पराली जलाने से पर्यावरण को नुकसान होता है। इसे बेचकर आप आय कमाएं और प्रदूषण भी कम करें।',
    en: 'Burning crop residue harms the environment. By selling it, you earn income and reduce pollution.',
  },
  building_materials: {
    hi: 'बेचने वाले की ज़िम्मेदारी है कि वह ज़रूरी अनुमति के साथ बेचे।',
    en: 'Seller is responsible for selling with the required permissions.',
  },
}
