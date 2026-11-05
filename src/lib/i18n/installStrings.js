// Batch 17F - strings of the app install help: the sheet, the success / welcome messages, the
// QR block and the /install page. Hindi first, plain words. Listed with where they show in
// docs/review/batch17f/HINDI_STRINGS.md. Merged into strings.js.
// Rule kept everywhere: a website cannot place an icon or know whether it is on the home screen,
// so nothing here says "it has been added to your home screen" as a fact.
export const installStrings = {
  // --- the sheet (all environments) ---
  inst_sheet_title: { hi: 'ऐप इंस्टॉल करें', en: 'Install the app' },
  inst_close: { hi: 'बंद करें', en: 'Close' },
  inst_ok: { hi: 'ठीक है', en: 'OK' },
  inst_copy_link: { hi: 'लिंक कॉपी करें', en: 'Copy link' },
  inst_link_copied: { hi: 'लिंक कॉपी हो गया ✓', en: 'Link copied ✓' },
  inst_copy_failed: { hi: 'कॉपी नहीं हो पाया। यह लिंक लिख लें:', en: 'Could not copy. Note this link:' },
  inst_share_link: { hi: 'इंस्टॉल लिंक भेजें', en: 'Share install link' },
  inst_share_text: { hi: 'किसान सहयोग ऐप अपने फ़ोन में इंस्टॉल करें:', en: 'Install the Kissan Sahyog app on your phone:' },
  inst_native_btn: { hi: 'अभी इंस्टॉल करें', en: 'Install now' },

  // --- Android: menu steps ---
  inst_a_title: { hi: 'अपने फ़ोन में ऐसे इंस्टॉल करें', en: 'Install on your phone like this' },
  inst_a1: { hi: 'ब्राउज़र के कोने में तीन बिंदु (⋮) दबाएं।', en: 'Tap the three dots (⋮) in the corner of the browser.' },
  inst_a2: { hi: '"ऐप इंस्टॉल करें" या "होम स्क्रीन पर जोड़ें" दबाएं।', en: 'Tap "Install app" or "Add to Home screen".' },
  inst_a3: { hi: 'आख़िर में "इंस्टॉल करें" या "जोड़ें" दबाकर पक्का करें।', en: 'At the end, tap "Install" or "Add" to confirm.' },
  inst_a_hint: { hi: 'मेन्यू का बटन ⋮ (तीन बिंदु) या ☰ (तीन लकीरें) हो सकता है। वह स्क्रीन के ऊपर या नीचे के कोने में मिलता है।', en: 'The menu button can be ⋮ (three dots) or ☰ (three lines), in the top or bottom corner of the screen.' },
  inst_a_chrome_tip: { hi: 'सबसे आसान तरीका: यही पेज Chrome ब्राउज़र में खोलें।', en: 'The easiest way: open this same page in the Chrome browser.' },

  // --- iPhone ---
  inst_i_title: { hi: 'iPhone में ऐसे इंस्टॉल करें', en: 'Install on an iPhone like this' },
  inst_i1: { hi: 'शेयर बटन दबाएं (चौकोर के ऊपर तीर वाला निशान)। वह स्क्रीन के नीचे, या ⋯ मेन्यू के अंदर मिलता है।', en: 'Tap the Share button (a square with an arrow up). It is at the bottom of the screen, or inside the ⋯ menu.' },
  inst_i2: { hi: '"होम स्क्रीन पर जोड़ें" दबाएं। न दिखे तो सूची को नीचे सरकाएं।', en: 'Tap "Add to Home Screen". If you do not see it, scroll the list down.' },
  inst_i3: { hi: 'ऊपर कोने में "जोड़ें" दबाएं।', en: 'Tap "Add" in the top corner.' },
  inst_i_note: { hi: 'यह सिर्फ़ Safari ब्राउज़र में हो सकता है।', en: 'This works only in the Safari browser.' },
  inst_io_title: { hi: 'पहले यह पेज Safari में खोलें', en: 'First open this page in Safari' },
  inst_io_body: { hi: 'iPhone में ऐप सिर्फ़ Safari से इंस्टॉल होता है। नीचे लिंक कॉपी करें, Safari खोलें और ऊपर की पट्टी में चिपकाएं।', en: 'On an iPhone the app can be installed only from Safari. Copy the link below, open Safari and paste it in the top bar.' },
  inst_io_then: { hi: 'फिर Safari में:', en: 'Then in Safari:' },

  // --- inside another app (Facebook, Instagram ...) ---
  inst_x_title: { hi: 'पहले यह पेज अपने ब्राउज़र में खोलें', en: 'First open this page in your browser' },
  inst_x_body: { hi: 'आप किसी दूसरे ऐप (जैसे Facebook या Instagram) के अंदर हैं। यहाँ इंस्टॉल नहीं हो सकता।', en: 'You are inside another app (like Facebook or Instagram). The app cannot be installed from here.' },
  inst_x1: { hi: 'ऊपर या नीचे के कोने में तीन बिंदु (⋮ या ⋯) दबाएं।', en: 'Tap the three dots (⋮ or ⋯) in the top or bottom corner.' },
  inst_x2: { hi: '"ब्राउज़र में खोलें" (Open in browser / Chrome) चुनें।', en: 'Choose "Open in browser" (or "Open in Chrome").' },
  inst_x3: { hi: 'पेज खुलने पर वहाँ फिर से "इंस्टॉल" दबाएं।', en: 'When the page opens, tap "Install" there again.' },
  inst_x_or: { hi: 'या लिंक कॉपी करके Chrome में चिपकाएं।', en: 'Or copy the link and paste it in Chrome.' },

  // --- computer ---
  inst_d_title: { hi: 'फ़ोन में इंस्टॉल करने के लिए यह QR स्कैन करें', en: 'Scan this QR to install on your phone' },
  inst_d_body: { hi: 'फ़ोन का कैमरा खोलकर इस QR पर रखें। खुलने वाले पेज पर इंस्टॉल के कदम लिखे हैं।', en: 'Open your phone camera and point it at this QR. The page that opens shows the install steps.' },
  inst_d_pc: { hi: 'इसी कंप्यूटर पर: एड्रेस बार के दाईं ओर इंस्टॉल का निशान दिखे तो उसे दबाएं।', en: 'On this computer: if an install icon shows at the right end of the address bar, click it.' },
  inst_qr_alt: { hi: 'किसान सहयोग ऐप इंस्टॉल पेज का QR कोड', en: 'QR code for the Kissan Sahyog app install page' },

  // --- browser that cannot install ---
  inst_u_title: { hi: 'इस ब्राउज़र में इंस्टॉल नहीं हो सकता', en: 'The app cannot be installed in this browser' },
  inst_u_body: { hi: 'यह पेज Chrome ब्राउज़र में खोलें। या किसी दूसरे फ़ोन से QR स्कैन करें।', en: 'Open this page in the Chrome browser, or scan the QR from another phone.' },

  // --- after the person closes the phone\'s own install box ---
  inst_later: { hi: 'कोई बात नहीं। आप बाद में कभी भी "इंस्टॉल" दबाकर ऐप इंस्टॉल कर सकते हैं।', en: 'No problem. You can install the app later any time by tapping "Install".' },

  // --- success (browser said the app is installed) ---
  inst_done_title: { hi: 'ऐप इंस्टॉल हो गया', en: 'The app is installed' },
  inst_done_body: { hi: 'अपने फ़ोन की होम स्क्रीन या ऐप-लिस्ट में किसान सहयोग का निशान ढूँढें। अब वहीं से ऐप खोल सकते हैं।', en: 'Look for the Kissan Sahyog icon on your phone\'s home screen or in your app list. You can open the app from there now.' },
  inst_done_hint: { hi: 'अगर निशान सिर्फ़ ऐप-लिस्ट में है, होम स्क्रीन पर नहीं, तो उसे दबाकर रखें और "होम स्क्रीन पर जोड़ें" चुनें।', en: 'If the icon is only in the app list and not on the home screen, press and hold it and choose "Add to Home screen".' },

  // --- first launch from the icon ---
  inst_welcome_title: { hi: 'आप किसान सहयोग ऐप में हैं', en: 'You are in the Kissan Sahyog app' },
  inst_welcome_body: { hi: 'अगली बार भी इसी निशान से सीधे खोल सकते हैं।', en: 'Next time, open it straight from the same icon.' },

  // --- homepage QR / share block ---
  inst_block_title: { hi: 'किसान सहयोग ऐप अपने फ़ोन में रखें', en: 'Keep the Kissan Sahyog app on your phone' },
  inst_block_body_pc: { hi: 'फ़ोन का कैमरा इस QR पर रखें। इंस्टॉल के कदम खुल जाएंगे।', en: 'Point your phone camera at this QR. The install steps will open.' },
  inst_block_body_phone: { hi: 'इंस्टॉल का बटन न चले तो लिंक किसी दूसरे फ़ोन पर भेजें या दोस्त को भेजें।', en: 'If the Install button does not work, send the link to another phone or to a friend.' },
  inst_block_install: { hi: 'इंस्टॉल', en: 'Install' },

  // --- /install page ---
  inst_nav: { hi: 'ऐप इंस्टॉल करें', en: 'Install the app' },
  inst_page_title: { hi: 'किसान सहयोग ऐप इंस्टॉल करें — फ़ोन पर कदम-दर-कदम', en: 'Install the Kissan Sahyog app — step by step' },
  inst_page_desc: { hi: 'किसान सहयोग को अपने फ़ोन की स्क्रीन पर ऐप की तरह रखें। Android, iPhone और कंप्यूटर के लिए आसान कदम, और दूसरे फ़ोन से इंस्टॉल करने का QR।', en: 'Keep Kissan Sahyog on your phone screen like an app. Easy steps for Android, iPhone and computer, and a QR to install from another phone.' },
  inst_page_h1: { hi: 'किसान सहयोग ऐप इंस्टॉल करें', en: 'Install the Kissan Sahyog app' },
  inst_page_lead: { hi: 'किसान सहयोग को अपने फ़ोन में ऐप की तरह रखें। इंस्टॉल सीधे इस वेबसाइट से होता है, किसी ऐप स्टोर की ज़रूरत नहीं।', en: 'Keep Kissan Sahyog on your phone like an app. It installs straight from this website, no app store needed.' },
  inst_page_yours: { hi: 'आपके फ़ोन के लिए', en: 'For your phone' },
  inst_page_installed: { hi: 'ऐप इंस्टॉल है और आप उसी को चला रहे हैं।', en: 'The app is installed and you are using it now.' },
  inst_page_others: { hi: 'दूसरे फ़ोन और ब्राउज़र', en: 'Other phones and browsers' },
  inst_page_phone_h: { hi: 'फ़ोन पर यह पेज खोलें', en: 'Open this page on your phone' },
  inst_page_phone_body: { hi: 'कंप्यूटर पर हैं, या इंस्टॉल का बटन नहीं चला? फ़ोन का कैमरा इस QR पर रखें, या यह लिंक अपने फ़ोन पर भेजें।', en: 'On a computer, or the Install button did not work? Point your phone camera at this QR, or send this link to your phone.' },
  inst_page_link_label: { hi: 'पेज का लिंक:', en: 'Page link:' },
  inst_sec_android: { hi: 'Android फ़ोन — Chrome', en: 'Android phone — Chrome' },
  inst_sec_other: { hi: 'Android — Samsung Internet, Firefox, Mi Browser और दूसरे', en: 'Android — Samsung Internet, Firefox, Mi Browser and others' },
  inst_sec_ios: { hi: 'iPhone — Safari ब्राउज़र', en: 'iPhone — Safari' },
  inst_sec_inapp: { hi: 'Facebook, Instagram या किसी दूसरे ऐप के अंदर', en: 'Inside Facebook, Instagram or another app' },
  inst_sec_pc: { hi: 'कंप्यूटर', en: 'Computer' },
  inst_icon_note: { hi: 'ध्यान दें: कुछ फ़ोन में निशान सीधे होम स्क्रीन पर नहीं आता, सिर्फ़ ऐप-लिस्ट में आता है। तब निशान को दबाकर रखें और "होम स्क्रीन पर जोड़ें" चुनें।', en: 'Note: on some phones the icon does not land on the home screen, only in the app list. Then press and hold the icon and choose "Add to Home screen".' },
  inst_faq_title: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
  inst_faq1_q: { hi: 'ऐप कैसे इंस्टॉल करें?', en: 'How do I install the app?' },
  inst_faq1_a: { hi: 'Android के Chrome में "इंस्टॉल" बटन दबाएं और फ़ोन जो पूछे उसे मान लें। iPhone में Safari खोलकर शेयर बटन से "होम स्क्रीन पर जोड़ें" चुनें। हर फ़ोन के कदम इसी पेज पर लिखे हैं।', en: 'In Chrome on Android, tap the "Install" button and accept what the phone asks. On an iPhone, open Safari, tap Share and choose "Add to Home Screen". The steps for every phone are on this page.' },
  inst_faq2_q: { hi: 'इंस्टॉल का बटन क्यों नहीं दिख रहा या क्यों नहीं चल रहा?', en: 'Why is the Install button missing or not working?' },
  inst_faq2_a: { hi: 'Facebook या Instagram के अंदर खुला पेज इंस्टॉल नहीं होने देता। पेज को Chrome में (iPhone में Safari में) खोलें, या फ़ोन के मेन्यू (⋮) में "ऐप इंस्टॉल करें" ढूँढें। चाहें तो किसी दूसरे फ़ोन से QR स्कैन करें।', en: 'A page opened inside Facebook or Instagram cannot be installed. Open the page in Chrome (Safari on an iPhone), or look for "Install app" in the phone menu (⋮). You can also scan the QR from another phone.' },
  inst_faq3_q: { hi: 'क्या इंस्टॉल करने के लिए पैसे लगते हैं?', en: 'Does installing cost anything?' },
  inst_faq3_a: { hi: 'इंस्टॉल करने के लिए किसान सहयोग कोई शुल्क नहीं लेता। यह सीधे वेबसाइट से इंस्टॉल होता है, किसी ऐप स्टोर से नहीं।', en: 'Kissan Sahyog charges nothing for installing. It installs straight from the website, not from an app store.' },
}
