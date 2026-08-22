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

  // --- post flow ---
  post_q_type: { hi: 'आप क्या करना चाहते हैं?', en: 'What do you want to do?' },
  post_q_category: { hi: 'किस चीज़ के बारे में?', en: 'About what?' },
  posting: { hi: 'लिस्टिंग जोड़ी जा रही है…', en: 'Posting your listing…' },
  post_success: { hi: 'आपकी लिस्टिंग जुड़ गई!', en: 'Your listing has been posted!' },
  view_listing: { hi: 'लिस्टिंग देखें', en: 'View listing' },
  post_another: { hi: 'एक और डालें', en: 'Post another' },
  coming_soon: { hi: 'जल्द आ रहा है', en: 'Coming soon' },
  select_placeholder: { hi: 'चुनें…', en: 'Select…' },

  // --- land fields ---
  field_size: { hi: 'ज़मीन का आकार', en: 'Land size' },
  field_arrangement: { hi: 'व्यवस्था', en: 'Arrangement' },
  field_water: { hi: 'पानी का स्रोत', en: 'Water source' },
  field_crop: { hi: 'फसल', en: 'Crop' },
  crop_any: { hi: 'कोई भी / तय नहीं', en: 'Any / not specified' },
  field_season: { hi: 'मौसम', en: 'Season' },
  field_photos: { hi: 'फोटो', en: 'Photos' },
  photos_help: { hi: 'ज़्यादा से ज़्यादा 3 फोटो (वैकल्पिक)', en: 'Up to 3 photos (optional)' },
  self_declaration_land: {
    hi: 'मैं पुष्टि करता/करती हूं कि यह ज़मीन मेरी है या मुझे इसे लिस्ट करने का अधिकार है।',
    en: 'I confirm this land belongs to me or I am authorized to list it.',
  },

  // --- equipment fields ---
  field_equipment_type: { hi: 'मशीन का प्रकार', en: 'Equipment type' },
  field_rental_basis: { hi: 'किराया किस आधार पर', en: 'Rental basis' },
  field_availability: { hi: 'उपलब्धता', en: 'Availability' },
  avail_now: { hi: 'अभी उपलब्ध', en: 'Available now' },
  avail_dates: { hi: 'तय तारीख़ों में', en: 'Specific dates' },
  field_from_date: { hi: 'तारीख़ से', en: 'From date' },
  field_to_date: { hi: 'तारीख़ तक', en: 'To date' },

  // --- browse ---
  browse_title: { hi: 'आस-पास खोजें', en: 'Browse nearby' },
  within_30km: { hi: 'आपके 30 किमी के भीतर', en: 'Within 30 km of you' },
  filter_all: { hi: 'सभी', en: 'All' },
  sort_nearest: { hi: 'नज़दीकी पहले', en: 'Nearest first' },
  sort_newest: { hi: 'नई पहले', en: 'Newest first' },
  no_listings: { hi: 'आस-पास कोई लिस्टिंग नहीं मिली।', en: 'No listings found nearby.' },
  km_away: { hi: 'किमी दूर', en: 'km away' },
  posted_label: { hi: 'डाली गई', en: 'Posted' },

  // --- detail ---
  detail_title: { hi: 'लिस्टिंग', en: 'Listing' },
  call_now: { hi: 'फ़ोन करें', en: 'Call now' },
  show_number: { hi: 'नंबर देखें', en: 'Show number' },
  listing_not_found: { hi: 'यह लिस्टिंग नहीं मिली।', en: 'This listing was not found.' },

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
