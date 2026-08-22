// Central bilingual string table. Every user-facing string lives here as
// { hi, en } and is rendered via t(key) from LanguageProvider — no hardcoded
// UI copy in components. Phase 7 audits this for completeness.
//
// Note: the disclaimer BANNERS intentionally show Hindi + English together at
// all times (see src/lib/i18n/disclaimers.js) regardless of selected language.

export const strings = {
  // --- app / brand ---
  app_name: { hi: 'किसान सहयोग', en: 'Kisan Sahyog' },
  tagline: { hi: 'जानकारी साझा करने वाला मंच', en: 'An information-sharing platform' },

  // --- generic actions ---
  continue: { hi: 'आगे बढ़ें', en: 'Continue' },
  back: { hi: 'पीछे', en: 'Back' },
  submit: { hi: 'जमा करें', en: 'Submit' },
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  save: { hi: 'सेव करें', en: 'Save' },
  loading: { hi: 'कृपया प्रतीक्षा करें…', en: 'Please wait…' },
  required_field: { hi: 'यह ज़रूरी है', en: 'This is required' },
  optional: { hi: '(वैकल्पिक)', en: '(optional)' },

  // --- language ---
  choose_language: { hi: 'अपनी भाषा चुनें', en: 'Choose your language' },
  language: { hi: 'भाषा', en: 'Language' },
  hindi: { hi: 'हिंदी', en: 'Hindi' },
  english: { hi: 'English', en: 'English' },

  // --- welcome ---
  welcome_intro: {
    hi: 'ज़मीन, मशीन और मज़दूरों की जानकारी अपने आस-पास खोजें।',
    en: 'Find land, equipment, and labor near you.',
  },
  new_user: { hi: 'नया खाता बनाएं', en: 'Create new account' },
  returning_user: { hi: 'पहले से खाता है — लॉग इन करें', en: 'I already have an account — Log in' },

  // --- signup ---
  signup_title: { hi: 'नया खाता बनाएं', en: 'Create account' },
  full_name: { hi: 'पूरा नाम', en: 'Full name' },
  full_name_ph: { hi: 'जैसे: रामप्रसाद पटेल', en: 'e.g. Ramprasad Patel' },
  phone_number: { hi: 'मोबाइल नंबर', en: 'Mobile number' },
  phone_ph: { hi: '10 अंकों का नंबर', en: '10-digit number' },
  village_town: { hi: 'गाँव / कस्बा', en: 'Village / Town' },
  village_ph: { hi: 'जैसे: मकरोनिया', en: 'e.g. Makronia' },
  pincode: { hi: 'पिन कोड', en: 'Pincode' },
  pincode_ph: { hi: '6 अंकों का पिन कोड', en: '6-digit pincode' },
  pincode_help: {
    hi: 'आपके पिन कोड से आस-पास की लिस्टिंग दिखाई जाएंगी।',
    en: 'Your pincode is used to show nearby listings.',
  },

  // --- disclaimer step ---
  disclaimer_title: { hi: 'ज़रूरी सूचना', en: 'Important notice' },
  disclaimer_accept_label: {
    hi: 'मैंने ऊपर दी गई सूचना पढ़ ली और समझ ली है।',
    en: 'I have read and understood the notice above.',
  },
  accept_and_continue: { hi: 'स्वीकार करें और आगे बढ़ें', en: 'Accept and continue' },

  // --- login ---
  login_title: { hi: 'लॉग इन करें', en: 'Log in' },
  login_help: {
    hi: 'वही मोबाइल नंबर डालें जिससे आपने खाता बनाया था।',
    en: 'Enter the mobile number you signed up with.',
  },
  login_button: { hi: 'लॉग इन करें', en: 'Log in' },
  no_account_yet: { hi: 'खाता नहीं है? नया बनाएं', en: "No account? Create one" },

  // --- home / nav ---
  home_greeting: { hi: 'नमस्ते', en: 'Namaste' },
  logout: { hi: 'लॉग आउट', en: 'Log out' },
  browse: { hi: 'खोजें', en: 'Browse' },
  post_listing: { hi: 'नई लिस्टिंग डालें', en: 'Post a listing' },
  my_listings: { hi: 'मेरी लिस्टिंग', en: 'My listings' },

  // --- errors (mirrors src/lib/errors.js codes) ---
  err_name_required: { hi: 'कृपया अपना पूरा नाम भरें।', en: 'Please enter your full name.' },
  err_invalid_phone: {
    hi: 'कृपया सही 10 अंकों का मोबाइल नंबर भरें।',
    en: 'Please enter a valid 10-digit mobile number.',
  },
  err_invalid_pincode: {
    hi: 'कृपया सही 6 अंकों का पिन कोड भरें।',
    en: 'Please enter a valid 6-digit pincode.',
  },
  err_disclaimer_not_accepted: {
    hi: 'आगे बढ़ने के लिए सूचना स्वीकार करना ज़रूरी है।',
    en: 'You must accept the notice to continue.',
  },
  err_pincode_not_found: {
    hi: 'यह पिन कोड हमारे पास नहीं मिला। कृपया जांच कर दोबारा डालें।',
    en: 'This pincode was not recognised. Please check and re-enter.',
  },
  err_phone_exists: {
    hi: 'इस नंबर से पहले से खाता है। कृपया लॉग इन करें।',
    en: 'An account with this number already exists. Please log in.',
  },
  err_not_found: {
    hi: 'इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।',
    en: 'No account found for this number. Please sign up.',
  },
  err_self_declaration_required: {
    hi: 'ज़मीन देने के लिए स्व-घोषणा पर टिक करना ज़रूरी है।',
    en: 'You must tick the self-declaration to offer land.',
  },
  err_equipment_type_required: {
    hi: 'कृपया मशीन का प्रकार चुनें।',
    en: 'Please select the equipment type.',
  },
  err_invalid_worker_count: {
    hi: 'मज़दूरों की संख्या 1 या उससे अधिक होनी चाहिए।',
    en: 'Number of workers must be 1 or more.',
  },
  err_invalid_date_range: {
    hi: '“से” तारीख “तक” तारीख के बाद नहीं हो सकती।',
    en: 'The “from” date cannot be after the “to” date.',
  },
  err_not_owner: {
    hi: 'यह लिस्टिंग आपकी नहीं है।',
    en: 'This listing does not belong to you.',
  },
  err_not_available: {
    hi: 'यह लिस्टिंग अब उपलब्ध नहीं है।',
    en: 'This listing is no longer available.',
  },
  err_not_authorized: {
    hi: 'कृपया पहले लॉग इन करें।',
    en: 'Please log in first.',
  },
  err_unknown: {
    hi: 'कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।',
    en: 'Something went wrong. Please try again.',
  },
}
