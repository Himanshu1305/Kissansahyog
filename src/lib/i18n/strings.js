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
    hi: 'ज़मीन, उपकरण, भूसा, सामग्री और विशेषज्ञ — सीधे आपसे जुड़ें',
    en: 'Land, equipment, residue, inputs and experts — connect directly with you',
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
  experts_nav: { hi: 'विशेषज्ञ', en: 'Experts' },

  // --- experts directory ---
  experts_title: { hi: 'विशेषज्ञ / Experts', en: 'Experts' },
  experts_filter_label: { hi: 'विशेषज्ञता से खोजें', en: 'Filter by specialisation' },
  experts_filter_ph: { hi: 'जैसे: मिट्टी, कीट, बागवानी', en: 'e.g. soil, pest, horticulture' },
  experts_none: { hi: 'कोई विशेषज्ञ नहीं मिला।', en: 'No experts found.' },
  expert_not_found: { hi: 'यह विशेषज्ञ नहीं मिला।', en: 'This expert was not found.' },

  // --- global nav (public + authenticated) ---
  nav_login: { hi: 'लॉगिन', en: 'Login' },
  nav_signup: { hi: 'जुड़ें', en: 'Sign Up' },
  nav_menu: { hi: 'मेन्यू', en: 'Menu' },
  nav_home: { hi: 'होम', en: 'Home' },
  my_profile: { hi: 'मेरी प्रोफ़ाइल', en: 'My Profile' },
  home_cat_land: { hi: 'ज़मीन', en: 'Land' },
  home_cat_equipment: { hi: 'उपकरण', en: 'Equipment' },
  home_cat_labor: { hi: 'कृषि सहयोगी', en: 'Labor' },
  home_cat_bhusa: { hi: 'भूसा-पराली', en: 'Residue' },
  home_cat_agri_inputs: { hi: 'कृषि सामग्री', en: 'Inputs' },
  home_cat_experts: { hi: 'विशेषज्ञ', en: 'Experts' },

  // --- public homepage: hero ---
  hero_headline: { hi: 'किसान की आय बढ़ाना — हमारा लक्ष्य', en: 'Increasing farmer income — our mission' },
  hero_sub: {
    hi: 'ज़मीन, उपकरण, मज़दूर और अनाज के लिए सीधा संपर्क — अपने 30 किमी के दायरे में',
    en: 'Direct connections for land, equipment, labor and produce — within 30km of you',
  },
  cta_browse: { hi: 'लिस्टिंग देखें', en: 'Browse Listings' },
  cta_join: { hi: 'अभी जुड़ें', en: 'Join Now' },

  // --- public homepage: how it works ---
  how_title: { hi: 'यह कैसे काम करता है', en: 'How it works' },
  how_1_title: { hi: 'लिस्ट करें', en: 'List it' },
  how_1_body: { hi: 'अपनी ज़मीन, उपकरण या सेवा लिस्ट करें', en: 'List your land, equipment, or service' },
  how_2_title: { hi: 'मिलाएं', en: 'Match' },
  how_2_body: { hi: '30 किमी के दायरे में सही व्यक्ति खोजें', en: 'Find the right person within 30km' },
  how_3_title: { hi: 'जुड़ें', en: 'Connect' },
  how_3_body: { hi: 'सीधे फ़ोन पर बात करें — कोई बिचौलिया नहीं', en: 'Talk directly by phone — no middleman' },

  // --- public homepage: category cards ---
  categories_title: { hi: 'श्रेणियाँ', en: 'Categories' },
  card_browse: { hi: 'देखें', en: 'Browse' },
  desc_land: { hi: 'किराये/बटाई के लिए ज़मीन खोजें या दें', en: 'Find or offer land for lease/sharecropping' },
  desc_equipment: { hi: 'ट्रैक्टर, ड्रोन और मशीनें किराये पर', en: 'Rent tractors, drones and machinery' },
  desc_labor: { hi: 'कृषि कार्य के लिए कुशल टीम खोजें', en: 'Find skilled teams for farm work' },
  desc_bhusa: { hi: 'भूसा/पराली बेचें या खरीदें', en: 'Buy or sell crop residue' },
  desc_agri_inputs: { hi: 'बीज, खाद, कीटनाशक — किसान व दुकानें', en: 'Seeds, fertilizer, pesticides — farmers & shops' },
  desc_experts: { hi: 'कृषि विशेषज्ञों से सलाह लें', en: 'Get advice from farming experts' },

  // --- public homepage: live listings ---
  listings_section_title: { hi: 'हाल की लिस्टिंग', en: 'Recent listings' },
  home_offer: { hi: 'दे रहे हैं', en: 'Offer' },
  home_requirement: { hi: 'चाहिए', en: 'Requirement' },
  signup_to_contact: { hi: 'संपर्क देखने के लिए जुड़ें', en: 'Sign up to see contact' },
  listings_empty: {
    hi: 'अभी Sagar में लिस्टिंग जुड़ रही हैं — पहले बनें!',
    en: 'Listings are being added in Sagar — be one of the first!',
  },
  add_listing_cta: { hi: 'लिस्टिंग जोड़ें', en: 'Add a listing' },
  ago_just_now: { hi: 'अभी', en: 'Just now' },
  ago_yesterday: { hi: 'कल', en: 'Yesterday' },
  ago_days: { hi: 'दिन पहले', en: 'days ago' },

  // --- public homepage: mission ---
  mission_title: { hi: 'हम क्यों बने?', en: 'Why we exist' },
  mission_body: {
    hi: 'हमारा एक ही लक्ष्य है — किसान की आय बढ़ाना। किसान सहयोग किसानों को सीधे एक-दूसरे से जोड़ता है — कोई बिचौलिया नहीं, कोई कमीशन नहीं, और भुगतान हम नहीं संभालते। यह पायलट सागर, मध्य प्रदेश से शुरू हो रहा है।',
    en: 'We exist for one reason — to increase farmer income. Kisan Sahyog connects farmers directly with each other — no middleman, no commission, and we handle no payments. This pilot is starting in Sagar, Madhya Pradesh.',
  },
  mission_disclaimer: {
    hi: 'किसान सहयोग एक जानकारी मंच है — हम किसी भी लेन-देन में शामिल नहीं हैं।',
    en: 'Kisan Sahyog is an information platform — we are not involved in any transaction.',
  },

  // --- public homepage: footer ---
  footer_privacy: { hi: 'गोपनीयता नीति', en: 'Privacy Policy' },
  footer_terms: { hi: 'उपयोग की शर्तें', en: 'Terms of Use' },
  footer_contact: { hi: 'संपर्क', en: 'Contact' },
  footer_copyright: { hi: 'किसान सहयोग © 2026 | USD Vision AI LLP', en: 'Kisan Sahyog © 2026 | USD Vision AI LLP' },

  // --- legal pages ---
  privacy_title: { hi: 'गोपनीयता नीति', en: 'Privacy Policy' },
  terms_title: { hi: 'उपयोग की शर्तें', en: 'Terms of Use' },
  legal_review_pending: {
    hi: 'नोट: यह एक प्रारंभिक मसौदा है। सार्वजनिक लॉन्च से पहले कानूनी समीक्षा बाकी है।',
    en: 'Note: this is an initial draft. Legal review is pending before public launch.',
  },
  back_to_home: { hi: 'वापस होमपेज', en: 'Back to Homepage' },

  // --- post flow ---
  post_q_type: { hi: 'आप क्या करना चाहते हैं?', en: 'What do you want to do?' },
  post_q_category: { hi: 'किस चीज़ के बारे में?', en: 'About what?' },
  posting: { hi: 'लिस्टिंग जोड़ी जा रही है…', en: 'Posting your listing…' },
  post_success: { hi: 'आपकी लिस्टिंग जुड़ गई!', en: 'Your listing has been posted!' },
  view_listing: { hi: 'लिस्टिंग देखें', en: 'View listing' },
  post_another: { hi: 'एक और डालें', en: 'Post another' },
  coming_soon: { hi: 'जल्द आ रहा है', en: 'Coming soon' },
  select_placeholder: { hi: 'चुनें…', en: 'Select…' },

  // --- asset location (v1.1: the listing's OWN location, not the poster's home) ---
  field_asset_pincode: { hi: 'स्थान का पिनकोड', en: 'Location pincode' },
  field_land_pincode: { hi: 'ज़मीन का पिनकोड', en: "Land's pincode" },
  field_equipment_pincode: { hi: 'मशीन कहाँ है? पिनकोड', en: "Equipment's pincode" },
  field_labor_pincode: { hi: 'काम की जगह का पिनकोड', en: "Work location pincode" },
  field_bhusa_pincode: { hi: 'भूसे/पराली का स्थान (पिनकोड)', en: 'Location of residue (pincode)' },
  field_agri_pincode: { hi: 'सामग्री / दुकान का पिनकोड', en: 'Material / shop pincode' },
  asset_pincode_hint: {
    hi: 'यह उस जगह का पिनकोड है जहाँ यह उपलब्ध है — आपके घर का पिनकोड नहीं।',
    en: 'This is the pincode of where it is located — not your home pincode.',
  },
  err_asset_pincode_required: {
    hi: 'कृपया उस जगह का पिनकोड भरें जहाँ यह उपलब्ध है।',
    en: 'Please enter the pincode of where this is located.',
  },

  // --- land fields ---
  field_size: { hi: 'ज़मीन का आकार', en: 'Land size' },
  field_arrangement: { hi: 'व्यवस्था', en: 'Arrangement' },
  field_water: { hi: 'पानी का स्रोत', en: 'Water source' },
  field_crop: { hi: 'फसल', en: 'Crop' },
  crop_any: { hi: 'कोई भी / तय नहीं', en: 'Any / not specified' },
  field_season: { hi: 'मौसम', en: 'Season' },
  field_price_type: { hi: 'दर / कीमत', en: 'Rate / Price' },
  field_price_amount: { hi: 'ठेका राशि', en: 'Rent amount' },
  price_amount_ph: { hi: 'जैसे: ₹20,000 प्रति वर्ष', en: 'e.g. ₹20,000 per year' },
  field_photos: { hi: 'फोटो', en: 'Photos' },
  photos_help: { hi: 'ज़्यादा से ज़्यादा 3 फोटो (वैकल्पिक)', en: 'Up to 3 photos (optional)' },
  self_declaration_land: {
    hi: 'मैं पुष्टि करता/करती हूं कि यह ज़मीन मेरी है या मुझे इसे लिस्ट करने का अधिकार है।',
    en: 'I confirm this land belongs to me or I am authorized to list it.',
  },

  // --- equipment fields ---
  field_equipment_type: { hi: 'मशीन का प्रकार', en: 'Equipment type' },
  field_rental_basis: { hi: 'किराया किस आधार पर', en: 'Rental basis' },
  field_equipment_rate: { hi: 'किराया राशि', en: 'Rental amount' },
  field_availability: { hi: 'उपलब्धता', en: 'Availability' },
  avail_now: { hi: 'अभी उपलब्ध', en: 'Available now' },
  avail_dates: { hi: 'तय तारीख़ों में', en: 'Specific dates' },
  field_from_date: { hi: 'तारीख़ से', en: 'From date' },
  field_to_date: { hi: 'तारीख़ तक', en: 'To date' },

  // --- labor fields ---
  field_worker_count: { hi: 'कितने कृषि सहयोगी', en: 'Number of workers' },
  field_work_type: { hi: 'काम का प्रकार', en: 'Type of work' },
  field_rate_basis: { hi: 'दर किस आधार पर', en: 'Rate basis' },
  field_rate_amount: { hi: 'दर / मज़दूरी', en: 'Rate / wage' },
  rate_amount_ph: { hi: 'जैसे: ₹400 या बातचीत से', en: 'e.g. ₹400 or negotiable' },
  workers_unit: { hi: 'कृषि सहयोगी', en: 'workers' },

  // --- bhusa / parali (agricultural residue) ---
  field_residue_type: { hi: 'अवशेष का प्रकार', en: 'Residue type' },
  field_quantity: { hi: 'मात्रा', en: 'Quantity' },
  quantity_ph: { hi: 'जैसे: 5 क्विंटल, 2 ट्रॉली', en: 'e.g. 5 quintal, 2 trolley loads' },
  field_pickup: { hi: 'उठाव की व्यवस्था', en: 'Pickup arrangement' },
  field_buyer_type: { hi: 'खरीदार किस प्रकार का हो', en: 'Preferred buyer type' },
  field_buyer_type_self: { hi: 'आप किस प्रकार के खरीदार हैं', en: 'Your buyer type' },
  field_asking_price: { hi: 'माँगा गया दाम', en: 'Asking price' },
  asking_price_ph: { hi: 'जैसे: ₹200 प्रति क्विंटल या बातचीत से', en: 'e.g. ₹200 per quintal or Negotiable' },
  field_available_from: { hi: 'कब से उपलब्ध', en: 'Available from' },
  err_residue_type_required: { hi: 'कृपया अवशेष का प्रकार चुनें।', en: 'Please select the residue type.' },
  err_quantity_required: { hi: 'कृपया मात्रा भरें।', en: 'Please enter the quantity.' },
  err_pickup_required: { hi: 'कृपया उठाव की व्यवस्था चुनें।', en: 'Please select the pickup arrangement.' },
  err_buyer_type_required: { hi: 'कृपया खरीदार का प्रकार चुनें।', en: 'Please select the buyer type.' },
  err_asking_price_required: { hi: 'कृपया माँगा गया दाम भरें।', en: 'Please enter the asking price.' },

  // --- agri-inputs (seeds / fertilizer / pesticide) ---
  field_agri_subtype: { hi: 'आप कौन हैं?', en: 'Which are you?' },
  agri_subtype_farmer_surplus: { hi: 'किसान — अतिरिक्त सामग्री', en: 'Farmer selling surplus' },
  agri_subtype_vendor: { hi: 'दुकान / विक्रेता', en: 'Shop / Vendor' },
  field_input_type: { hi: 'सामग्री का प्रकार', en: 'Input type' },
  field_input_types: { hi: 'क्या-क्या बेचते हैं', en: 'What you sell' },
  field_item_name: { hi: 'सामग्री का नाम', en: 'Item name' },
  item_name_ph: { hi: 'जैसे: HI-8498 गेहूं बीज, DAP', en: 'e.g. HI-8498 Wheat Seed, DAP' },
  field_material_address: { hi: 'सामग्री कहाँ उपलब्ध है?', en: 'Where is the material available?' },
  material_address_ph: { hi: 'पूरा पता', en: 'Full address' },
  field_condition: { hi: 'स्थिति', en: 'Condition' },
  field_business_name: { hi: 'दुकान / व्यवसाय का नाम', en: 'Business name' },
  field_items_description: { hi: 'सामग्री का विवरण', en: 'Items description' },
  items_description_ph: { hi: 'जैसे: बीज, खाद, कीटनाशक…', en: 'e.g. seeds, fertilizer, pesticides…' },
  field_price_range: { hi: 'दाम (लगभग)', en: 'Price range' },
  price_range_ph: { hi: 'जैसे: ₹500–₹1500', en: 'e.g. ₹500–₹1500' },
  field_shop_address: { hi: 'दुकान का पता', en: 'Shop address' },
  field_contact_phone: { hi: 'संपर्क नंबर', en: 'Contact number' },
  agri_vendor_future_charges: {
    hi: 'भविष्य में लिस्टिंग शुल्क लागू हो सकता है।',
    en: 'Listing charges may apply in the future.',
  },
  err_input_type_required: { hi: 'कृपया सामग्री का प्रकार चुनें।', en: 'Please select the input type.' },
  err_item_name_required: { hi: 'कृपया सामग्री का नाम भरें।', en: 'Please enter the item name.' },
  err_material_address_required: { hi: 'कृपया बताएं सामग्री कहाँ उपलब्ध है।', en: 'Please enter where the material is available.' },
  err_condition_required: { hi: 'कृपया सामग्री की स्थिति चुनें।', en: 'Please select the condition.' },
  err_business_name_required: { hi: 'कृपया दुकान / व्यवसाय का नाम भरें।', en: 'Please enter the business name.' },
  err_input_types_required: { hi: 'कृपया कम से कम एक प्रकार चुनें।', en: 'Please select at least one input type.' },
  err_items_description_required: { hi: 'कृपया बताएं आप क्या बेचते हैं।', en: 'Please describe what you sell.' },
  err_shop_address_required: { hi: 'कृपया दुकान का पता भरें।', en: 'Please enter the shop address.' },
  err_agri_subtype_required: {
    hi: 'कृपया चुनें कि आप किसान हैं या दुकानदार।',
    en: 'Please select whether you are a farmer or a vendor.',
  },

  // --- browse ---
  browse_title: { hi: 'आस-पास खोजें', en: 'Browse nearby' },
  within_30km: { hi: 'आपके 30 किमी के भीतर', en: 'Within 30 km of you' },
  filter_all: { hi: 'सभी', en: 'All' },
  sort_nearest: { hi: 'नज़दीकी पहले', en: 'Nearest first' },
  sort_newest: { hi: 'नई पहले', en: 'Newest first' },
  no_listings: { hi: 'आस-पास कोई लिस्टिंग नहीं मिली।', en: 'No listings found nearby.' },
  radius_fallback: { hi: '30–50 किमी दूर', en: '30–50 km away' },
  km_away: { hi: 'किमी दूर', en: 'km away' },
  posted_label: { hi: 'डाली गई', en: 'Posted' },

  // --- my listings ---
  my_listings_title: { hi: 'मेरी लिस्टिंग', en: 'My Listings' },
  no_my_listings: { hi: 'आपने अभी तक कोई लिस्टिंग नहीं डाली।', en: 'You have not posted any listings yet.' },
  mark_found: { hi: 'मिल गया', en: 'Found' },
  badge_found: { hi: 'मिल गया', en: 'Found' },
  badge_expired: { hi: 'समय समाप्त', en: 'Expired' },
  badge_active: { hi: 'चालू', en: 'Active' },
  found_confirm: { hi: 'क्या यह लिस्टिंग बंद करनी है? यह अब खोज में नहीं दिखेगी।', en: 'Close this listing? It will no longer appear in search.' },

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
  err_price_type_required: {
    hi: 'कृपया दर / कीमत का प्रकार चुनें।',
    en: 'Please select a rate / price option.',
  },
  err_rental_basis_required: {
    hi: 'कृपया किराया किस आधार पर है, यह चुनें।',
    en: 'Please select the rental basis.',
  },
  err_equipment_rate_required: {
    hi: 'कृपया किराया राशि भरें।',
    en: 'Please enter the rental amount.',
  },
  err_invalid_worker_count: {
    hi: 'कृषि सहयोगियों की संख्या 1 या उससे अधिक होनी चाहिए।',
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
