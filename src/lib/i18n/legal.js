// Legal page content (Privacy Policy + Terms of Use). Like disclaimers.js, this
// is an i18n content source: each point is { hi, en } and both languages are
// rendered together (Hindi first) so the page is fully bilingual regardless of
// the selected UI language.
//
// LEGAL REVIEW PENDING: this is a plain-language placeholder written to avoid a
// 404 and set honest expectations. Have it reviewed by counsel before public
// launch. Contact for data/legal queries: usdvisionai@gmail.com

export { termsOfUse, termsNote } from './termsContent.js'

export const privacyPolicy = [
  {
    hi: 'हम क्या जानकारी लेते हैं: आपका मोबाइल नंबर, पिन कोड, गाँव/कस्बा और आपकी लिस्टिंग का विवरण (जैसे ज़मीन का आकार, उपकरण का प्रकार, दाम)।',
    en: 'What we collect: your mobile number, pincode, village/town, and your listing details (such as land size, equipment type, price).',
  },
  {
    hi: 'इसका उपयोग कैसे होता है: आपके 30 किमी के दायरे में सही मिलान दिखाने और दूसरे उपयोगकर्ताओं को आपकी लिस्टिंग दिखाने के लिए। फ़ोन नंबर तभी दिखता है जब कोई उपयोगकर्ता सूचना पढ़कर संपर्क करना चुनता है।',
    en: 'How it is used: to show relevant matches within 30km of you and to display your listing to other users. A phone number is shown only when a user chooses to make contact after reading the notice.',
  },
  {
    hi: 'हम क्या नहीं करते: हम कोई भुगतान नहीं संभालते, आपका डेटा बेचते नहीं, और अभी किसी तीसरे पक्ष के विज्ञापन के लिए डेटा साझा नहीं करते।',
    en: 'What we do NOT do: we do not process any payments, we do not sell your data, and we do not share data for third-party advertising at this time.',
  },
  {
    hi: 'आवाज़ से खोज: माइक से बोली गई बात केवल खोज चलाने के लिए इस्तेमाल होती है; किसान सहयोग इसे कभी सेव नहीं करता। आवाज़ को लिखाई में बदलने के लिए आपके फ़ोन या ब्राउज़र की अपनी सेवा (जैसे Google या Apple) उसे प्रोसेस कर सकती है।',
    en: 'Voice search: what you say into the mic is used only to run a search; Kissan Sahyog never saves it. To turn your voice into text, your phone or browser’s own service (for example Google or Apple) may process it.',
  },
  // Batch 7L-1 Stage B — "Your location". States only what the code does (userLocation.js,
  // LocationProvider.jsx, weatherApiV2.js, locationStore.js, places.js). Flagged for lawyer
  // review in docs/legal/TERMS_DRAFT_FOR_LAWYER.md.
  {
    hi: 'आपकी लोकेशन: इसे साझा करना ज़रूरी नहीं है। अगर आप अपने फ़ोन की लोकेशन साझा करते हैं, या अपना गाँव या कस्बा लिखते या चुनते हैं, तो हम उसका इस्तेमाल सिर्फ़ आपके पास के ऑफ़र, मंडी भाव, मौसम, और मेला, कोल्ड स्टोरेज व खोज के नतीजों की दूरी दिखाने के लिए करते हैं। यह आपके इसी फ़ोन के ब्राउज़र में सेव रहती है, आपके खाते या प्रोफ़ाइल में नहीं। अगर आप लॉगिन हैं और इस फ़ोन पर कोई जगह सेव नहीं है, तो आपकी प्रोफ़ाइल में पहले से दर्ज गाँव की जगह इस्तेमाल होती है। पास के ऑफ़र खोजने के लिए हमारे डेटाबेस से आपके आस-पास के इलाके के ऑफ़र माँगे जाते हैं; यह आपके खाते में सेव नहीं होता। मौसम दिखाने के लिए आपकी जगह हमारे मौसम-भंडार और मौसम सेवा Open-Meteo को भेजी जाती है, और लगभग 10 किमी के नक्शे के खाने के साथ रखी जाती है, आपके नाम, मोबाइल नंबर या खाते के साथ नहीं। आपकी जगह का नाम बताने के लिए जगह नक्शा सेवा BigDataCloud को भेजी जा सकती है, और जो नाम आप नक्शे पर खोजने को कहें वह OpenStreetMap को जाता है। आप अपनी जगह के नाम के पास "बदलें" दबाकर इसे कभी भी बदल सकते हैं। इसे हटाने के लिए अपने ब्राउज़र में इस साइट का डेटा साफ़ करें; ब्राउज़र की सेटिंग में लोकेशन की अनुमति भी बंद कर सकते हैं।',
    en: 'Your location: sharing it is optional. If you share your device location, or type or pick your village or town, we use it only to show offers near you, mandi prices, weather, and how far melas, cold storages and search results are from you. It is saved in your browser on this device, not in your account or profile. If you are logged in and no place is saved on this device, the village location already in your profile is used. To find offers near you, our database is asked for offers in the area around you; this is not saved to your account. To show the weather, your position is sent to our weather store and to the weather service Open-Meteo, and is kept against a map square of about 10 km, not against your name, mobile number or account. To name your place, the position may be sent to the map service BigDataCloud, and a place name you ask us to look up on the map goes to OpenStreetMap. You can change it anytime with the "Change" link next to your place name. To remove it, clear this site\'s data in your browser; you can also turn off location permission in your browser settings.',
  },
  {
    hi: 'वैकल्पिक जानकारी: आपकी प्रोफ़ाइल का अतिरिक्त विवरण, और यदि आप सहमति दें तो WhatsApp पर जानकारी पाने की पसंद (डिफ़ॉल्ट रूप से बंद) — जैसे पसंदीदा मंडी और मुख्य फसलें। यह सहमति देना ज़रूरी नहीं है।',
    en: 'Optional information: extra profile details, and — only if you opt in — a preference to receive information on WhatsApp (off by default), such as a preferred mandi and your main crops. This consent is not required.',
  },
  {
    hi: 'सुझाव और शिकायत फ़ॉर्म: इस फ़ॉर्म में दिया गया ईमेल या मोबाइल नंबर केवल आपके संदेश का जवाब देने के लिए रखा जाता है और सार्वजनिक रूप से नहीं दिखाया जाता।',
    en: 'Feedback & Grievance form: the email or mobile number you give in this form is stored only to reply to your message and is not shown publicly.',
  },
  {
    hi: 'आपकी सहमति और उसे वापस लेना: आप कभी भी अपनी WhatsApp सहमति या खाता Profile पेज से या hello@kissansahyog.com पर लिखकर वापस ले/हटवा सकते हैं। यह डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) नियम, 2025 (13 नवंबर 2025 को अधिसूचित) की भावना के अनुरूप है।',
    en: 'Your consent and withdrawal: you can withdraw your WhatsApp consent or delete your account anytime from the Profile page or by writing to hello@kissansahyog.com. This follows the spirit of the Digital Personal Data Protection (DPDP) Rules, 2025 (notified 13 November 2025).',
  },
  {
    hi: 'डेटा से जुड़े सवाल, डेटा अधिकार या अपना डेटा हटवाने के लिए hello@kissansahyog.com पर लिखें। शिकायत के लिए grievance@kissansahyog.com पर लिखें या सुझाव और शिकायत पेज (/grievance) का फ़ॉर्म भरें।',
    en: 'For data queries, data rights or deletion requests, write to hello@kissansahyog.com. For complaints, write to grievance@kissansahyog.com or use the form on the Feedback & Grievance page (/grievance).',
  },
]

export const legacyTermsOfUse = [
  {
    hi: 'किसान सहयोग केवल एक जानकारी सेवा है। हम उपयोगकर्ताओं के बीच किसी भी लेन-देन, सौदे या समझौते के लिए ज़िम्मेदार नहीं हैं।',
    en: 'Kissan Sahyog is an information service only. We are not liable for any transaction, deal, or agreement between users.',
  },
  {
    hi: 'ज़मीन की लिस्टिंग के लिए स्व-घोषणा ज़रूरी है — आप पुष्टि करते हैं कि ज़मीन आपकी है या आपको इसे लिस्ट करने का अधिकार है।',
    en: 'Land listings require a self-declaration — you confirm the land is yours or that you are authorised to list it.',
  },
  {
    hi: 'किसी भी लेन-देन से पहले दूसरे व्यक्ति की पहचान और जानकारी स्वयं जांच लें।',
    en: 'Verify the identity and details of the other party yourself before dealing.',
  },
  {
    hi: 'मिलने से पहले कभी पैसे न भेजें। आमने-सामने मिलकर ही लेन-देन करें — ऑनलाइन अग्रिम भुगतान से बचें।',
    en: 'Never send money before meeting in person. Deal only face to face — avoid any advance online payment.',
  },
  {
    hi: 'गलत या भ्रामक जानकारी वाली लिस्टिंग हटाई जा सकती है।',
    en: 'False or misleading listings may be removed.',
  },
  {
    hi: 'विक्रेता घोषणाएँ: कुछ श्रेणियों (जैसे उपकरण, गोदाम/कोल्ड स्टोरेज) में लिस्टिंग डालने से पहले विक्रेता को सुरक्षा व जानकारी की सत्यता की घोषणा पर सहमति देनी होती है। इन घोषणाओं की ज़िम्मेदारी विक्रेता की है।',
    en: 'Provider declarations: in some categories (e.g. equipment, warehouse/cold storage) the seller must agree to a declaration about safety and the accuracy of information before posting. Responsibility for these declarations lies with the seller.',
  },
  {
    hi: 'शिकायत व हटाने की प्रक्रिया: किसी लिस्टिंग या विक्रेता की शिकायत "शिकायत करें" बटन से, grievance@kissansahyog.com पर लिखकर या सुझाव और शिकायत पेज (/grievance) के फ़ॉर्म से करें। हम हर शिकायत की जाँच करते हैं और शिकायत सही पाए जाने पर लिस्टिंग/विक्रेता को हटा सकते हैं (सूचना प्रौद्योगिकी नियम, 2021 — G.S.R. 120(E), 10 फ़रवरी 2026 को संशोधित)।',
    en: 'Report & takedown: report any listing or seller via the "Report" button, by writing to grievance@kissansahyog.com, or by using the form on the Feedback & Grievance page (/grievance). We look into every complaint and may remove the listing or seller if the complaint is found valid (Information Technology Rules, 2021 — as amended by G.S.R. 120(E), 10 February 2026).',
  },
  {
    hi: 'मध्यस्थ की भूमिका: किसान सहयोग एक मध्यवर्ती मंच (intermediary) है और मंच पर कोई लेन-देन नहीं होता। सरकारी FARMS ऐप की तरह, उपयोगकर्ता व सेवा प्रदाता को जानकारी स्वयं स्वतंत्र रूप से जाँचनी चाहिए और मोल-भाव आमने-सामने करना चाहिए।',
    en: 'Intermediary role: Kissan Sahyog is an intermediary platform and no transaction happens on the platform. As with the government FARMS app, users and providers should verify information independently and negotiate offline.',
  },
  {
    hi: 'प्रायोजित सामग्री: भविष्य में कोई भुगतान-आधारित (प्रायोजित) लिस्टिंग स्पष्ट रूप से "प्रायोजित" लेबल के साथ दिखाई जाएगी (उपभोक्ता संरक्षण (ई-कॉमर्स) संशोधन नियम, 2026 — 10 सितंबर 2026 को अधिसूचित, 1 जनवरी 2027 से लागू)। अभी कोई विज्ञापन सक्रिय नहीं है।',
    en: 'Sponsored content: any future paid (sponsored) listing will be clearly labelled "Sponsored" (Consumer Protection (E-Commerce) Amendment Rules, 2026 — notified 10 September 2026, effective 1 January 2027). No ads are active at this time.',
  },
  {
    hi: 'ये शर्तें अभी शुरुआती मसौदा हैं। कानूनी समीक्षा बाकी है। लॉन्च से पहले इन्हें वकील से जँचवाया जाएगा।',
    en: 'This is an initial draft of the terms; legal review is pending. It will be reviewed by counsel before public launch.',
  },
]
