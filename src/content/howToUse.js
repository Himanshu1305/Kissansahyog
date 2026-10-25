// /how-to-use — "वेबसाइट कैसे इस्तेमाल करें / How to use the website" (Batch 7C).
// Bilingual page copy as plain data (same pattern as src/content/about.js), so no
// Devanagari literal lives in the screen and Node scripts can import this file.
//
// Every statement describes what the site does TODAY, read from the screens:
// Browse / ListingDetail / ContactActions / Post / PhotoPicker / MyListings /
// Sawaal / SawaalDetail / Msp / ColdStorage / KisanMela / Yojana / SchemeDetail /
// SearchBar / PwaInstallBanner / LanguageToggle / BottomTabBar. Registration and
// login are described only in general words (they are being redesigned).
//
// Diagram labels (`lines`) are short on purpose: each is one line of SVG text that
// has to fit a 320px-wide phone. scripts/shots-batch7c.mjs measures them.
const ORIGIN = 'https://kissansahyog.com'

export const howToUse = {
  seo: {
    title: { hi: 'वेबसाइट कैसे इस्तेमाल करें — किसान सहयोग', en: 'How to use the website — Kissan Sahyog' },
    description: {
      hi: 'किसान सहयोग पर लिस्टिंग देखना, अपनी लिस्टिंग डालना, किसान सवाल, मंडी भाव, कोल्ड स्टोरेज, मेला, योजनाएँ और फ़ोन पर जोड़ना — आसान चरणों और चित्रों में।',
      en: 'Browse listings, post your own, read farmer Q&A, check mandi prices, cold storage, melas and schemes, and add the site to your phone — in simple steps with diagrams.',
    },
  },
  h1: { hi: 'वेबसाइट कैसे इस्तेमाल करें', en: 'How to use the website' },
  lead: {
    hi: 'यह पेज छोटे-छोटे चरणों में बताता है कि किसान सहयोग पर क्या कहाँ है और उसे कैसे इस्तेमाल करें। हर हिस्से में एक चित्र है और उसके नीचे वही बात लिखकर भी दी गई है।',
    en: 'This page explains, in short steps, what is where on Kissan Sahyog and how to use it. Each part has a diagram, with the same points written out below it.',
  },
  toc_label: { hi: 'इस पेज पर', en: 'On this page' },
  steps_label: { hi: 'चरण', en: 'Steps' },
  register: { hi: 'रजिस्टर करें', en: 'Register' },
  login: { hi: 'लॉगिन करें', en: 'Log in' },

  // ---- a) what is here -----------------------------------------------------------
  services: {
    id: 'kya-kya-hai',
    title: { hi: 'यहाँ क्या-क्या है', en: 'What is here' },
    intro: {
      hi: 'किसान सहयोग पर ये सेवाएँ हैं। किसी भी नाम को दबाकर सीधे उस पेज पर जाएँ।',
      en: 'These are the services on Kissan Sahyog. Tap any name to go straight to that page.',
    },
    diagram: {
      title: { hi: 'किसान सहयोग की सेवाओं का नक्शा', en: 'Map of Kissan Sahyog services' },
      desc: {
        hi: 'बीच में किसान सहयोग और उससे जुड़ी आठ सेवाएँ: बाज़ार, किसान सवाल, मंडी भाव और MSP, मौसम, कोल्ड स्टोरेज, किसान मेला, सरकारी योजनाएँ और वीडियो।',
        en: 'Kissan Sahyog in the middle, linked to eight services: marketplace, farmer Q&A, mandi prices and MSP, weather, cold storage, Kisan Mela, government schemes and videos.',
      },
      hub: { hi: 'किसान सहयोग', en: 'Kissan Sahyog' },
    },
    items: [
      { to: '/bazaar', icon: 'tag', label: { hi: 'बाज़ार', en: 'Marketplace' }, text: { hi: 'ज़मीन, मशीन, मज़दूर, भूसा, खाद-बीज, गोदाम, ट्रांसपोर्ट जैसी लिस्टिंग।', en: 'Listings for land, machines, labour, fodder, seed and fertiliser, storage and transport.' } },
      { to: '/sawaal', icon: 'question', label: { hi: 'किसान सवाल', en: 'Farmer Q&A' }, text: { hi: 'खेती के सवाल और उनके जवाब।', en: 'Farming questions with their answers.' } },
      { to: '/msp', icon: 'chart', label: { hi: 'मंडी भाव · MSP', en: 'Mandi · MSP' }, text: { hi: 'आज का मंडी भाव और सरकारी MSP, साथ-साथ।', en: 'Today’s mandi price and the government MSP, side by side.' } },
      { to: '/mausam', icon: 'sun', label: { hi: 'मौसम', en: 'Weather' }, text: { hi: 'आपके इलाके का मौसम।', en: 'The weather for your area.' } },
      { to: '/cold-storage', icon: 'snow', label: { hi: 'कोल्ड स्टोरेज', en: 'Cold storage' }, text: { hi: 'मध्य प्रदेश के कोल्ड स्टोरेज की सूची।', en: 'A directory of cold storages in Madhya Pradesh.' } },
      { to: '/kisan-mela', icon: 'calendar', label: { hi: 'किसान मेला', en: 'Kisan Mela' }, text: { hi: 'आने वाले किसान मेलों की जानकारी।', en: 'Details of upcoming farmer fairs.' } },
      { to: '/yojana', icon: 'building', label: { hi: 'सरकारी योजनाएँ', en: 'Govt schemes' }, text: { hi: 'केंद्र और मध्य प्रदेश सरकार की योजनाएँ।', en: 'Central and Madhya Pradesh government schemes.' } },
      { to: '/videos', icon: 'play', label: { hi: 'वीडियो', en: 'Videos' }, text: { hi: 'खेती की छोटी वीडियो सलाह।', en: 'Short farming advice videos.' } },
    ],
    more: {
      hi: 'इनके अलावा एग्रो फॉरेस्ट्री, ग्रीनहाउस, ड्रोन दीदी, जुगाड़, लेख और उपयोगी संपर्क के पेज भी हैं। ये ऊपर के मेन्यू में मिलेंगे।',
      en: 'There are also pages for agro forestry, greenhouses, Drone Didi, jugaad, articles and useful contacts. You will find them in the menu at the top.',
    },
  },

  // ---- b) without login ----------------------------------------------------------
  access: {
    id: 'bina-login',
    title: { hi: 'बिना लॉगिन के क्या देख सकते हैं', en: 'What you can see without logging in' },
    intro: {
      hi: 'ज़्यादातर जानकारी सबके लिए खुली है। लॉगिन केवल कुछ कामों के लिए चाहिए।',
      en: 'Most information is open to everyone. You need to log in only for a few things.',
    },
    diagram: {
      title: { hi: 'बिना लॉगिन और लॉगिन के बाद की तुलना', en: 'Without login compared with after login' },
      desc: {
        hi: 'दो डिब्बे। पहला: बिना लॉगिन के लिस्टिंग देखना, किसान सवाल पढ़ना और पूछना, मंडी भाव, मौसम, योजनाएँ, कोल्ड स्टोरेज, मेला और वीडियो। दूसरा: लॉगिन के बाद विक्रेता का नंबर देखना, अपनी लिस्टिंग डालना, अपनी लिस्टिंग संभालना और मेले में दिलचस्पी दर्ज करना।',
        en: 'Two boxes. First: without login you can browse listings, read and ask farmer questions, and see mandi prices, weather, schemes, cold storage, melas and videos. Second: after login you can see a seller’s number, post your own listing, manage your listings and mark interest in a mela.',
      },
      open_title: { hi: 'बिना लॉगिन', en: 'Without login' },
      open_lines: [
        { hi: 'लिस्टिंग देखना', en: 'Browse listings' },
        { hi: 'सवाल पढ़ना और पूछना', en: 'Read and ask questions' },
        { hi: 'मंडी भाव, मौसम, योजनाएँ', en: 'Prices, weather, schemes' },
        { hi: 'कोल्ड स्टोरेज, मेला, वीडियो', en: 'Cold storage, melas, videos' },
      ],
      login_title: { hi: 'लॉगिन के बाद', en: 'After login' },
      login_lines: [
        { hi: 'विक्रेता का नंबर देखना', en: 'See a seller’s number' },
        { hi: 'अपनी लिस्टिंग डालना', en: 'Post your own listing' },
        { hi: 'अपनी लिस्टिंग संभालना', en: 'Manage your listings' },
        { hi: 'मेले में दिलचस्पी दर्ज करना', en: 'Mark interest in a mela' },
      ],
    },
    open_title: { hi: 'बिना लॉगिन के', en: 'Without logging in' },
    open: [
      { hi: 'बाज़ार की सभी लिस्टिंग और हर लिस्टिंग का पूरा पेज देखना।', en: 'Browse all marketplace listings and open any listing’s full page.' },
      { hi: 'किसान सवाल पढ़ना, खोजना और अपना सवाल भेजना।', en: 'Read and search farmer Q&A, and send your own question.' },
      { hi: 'मंडी भाव और MSP, मौसम, सरकारी योजनाएँ, किसान मेला, वीडियो और लेख देखना।', en: 'See mandi prices and MSP, weather, government schemes, Kisan Mela, videos and articles.' },
      { hi: 'कोल्ड स्टोरेज की सूची देखना। वहाँ दिए फ़ोन नंबर सीधे दिखते हैं।', en: 'See the cold storage directory. The phone numbers listed there are shown directly.' },
      { hi: 'पूरी वेबसाइट में खोजना, लिखकर या बोलकर।', en: 'Search the whole website, by typing or by voice.' },
    ],
    login_title: { hi: 'लॉगिन करने पर', en: 'After you log in' },
    needs_login: [
      { hi: 'बाज़ार की किसी लिस्टिंग में विक्रेता का नाम और फ़ोन नंबर देखना (कॉल या WhatsApp)।', en: 'See the seller’s name and phone number on a marketplace listing (Call or WhatsApp).' },
      { hi: 'अपनी लिस्टिंग डालना।', en: 'Post your own listing.' },
      { hi: '"मेरी लिस्टिंग" में अपनी लिस्टिंग देखना और बंद करना।', en: 'See and close your listings under “My listings”.' },
      { hi: 'किसी मेले पर "दिलचस्पी है" दबाना और अपनी प्रोफ़ाइल देखना।', en: "Tap “I'm interested” on a mela, and see your profile." },
    ],
    note: {
      hi: 'नए हैं तो पहले "रजिस्टर करें", पहले से जुड़े हैं तो "लॉगिन करें"। फ़ोन में नीचे की पट्टी में "लॉगिन" का बटन है।',
      en: 'If you are new, choose “Register”; if you have already joined, choose “Log in”. On a phone, the bar at the bottom has a “Login” button.',
    },
  },

  // ---- c) posting ----------------------------------------------------------------
  post: {
    id: 'listing-kaise-dalein',
    title: { hi: 'रजिस्टर करके अपनी लिस्टिंग कैसे डालें', en: 'How to register and post your listing' },
    intro: {
      hi: 'लिस्टिंग डालने के लिए लॉगिन ज़रूरी है। फ़ॉर्म तीन छोटे हिस्सों में है और "वापस" जाने पर भरी हुई जानकारी बनी रहती है।',
      en: 'You need to be logged in to post. The form has three short parts, and what you have entered stays if you go back.',
    },
    diagram: {
      title: { hi: 'लिस्टिंग डालने के चरण', en: 'Steps to post a listing' },
      desc: {
        hi: 'छह चरण ऊपर से नीचे: रजिस्टर या लॉगिन करें; "पोस्ट करें" दबाएँ; श्रेणी चुनें और बताएँ कि देना है या चाहिए; जानकारी भरें और फोटो जोड़ें; गाँव या जगह लिखें और सहमति दें; "जमा करें" दबाएँ, लिस्टिंग जुड़ जाती है।',
        en: 'Six steps from top to bottom: register or log in; tap “Post”; choose a category and say whether you are offering or looking; fill in details and add photos; enter your village or place and give consent; tap Submit and the listing is added.',
      },
      steps: [
        { icon: 'user', lines: [{ hi: 'रजिस्टर या लॉगिन करें', en: 'Register or log in' }] },
        { icon: 'plus', lines: [{ hi: '"पोस्ट करें" दबाएँ', en: 'Tap “Post”' }] },
        { icon: 'tag', lines: [{ hi: 'श्रेणी चुनें', en: 'Choose a category' }, { hi: 'देना है या चाहिए', en: 'Offering or looking for' }] },
        { icon: 'camera', lines: [{ hi: 'जानकारी भरें', en: 'Fill in the details' }, { hi: 'फोटो जोड़ें', en: 'Add photos' }] },
        { icon: 'pin', lines: [{ hi: 'गाँव / जगह लिखें', en: 'Enter village / place' }, { hi: 'सहमति दें', en: 'Give consent' }] },
        { icon: 'check', lines: [{ hi: 'जमा करें', en: 'Submit' }, { hi: 'लिस्टिंग जुड़ गई', en: 'Listing is added' }] },
      ],
    },
    steps: [
      { hi: 'पहले रजिस्टर करें या लॉगिन करें।', en: 'First register, or log in.' },
      { hi: '"पोस्ट करें" दबाएँ। फ़ोन में यह नीचे की पट्टी के बीच में हरा "＋" बटन है। लॉगिन के बाद के पेज पर "नई लिस्टिंग डालें" बटन भी है।', en: 'Tap “Post”. On a phone it is the green “＋” button in the middle of the bottom bar. The page you see after logging in also has a “Post a listing” button.' },
      { hi: 'हिस्सा 1: श्रेणी चुनें (जैसे मशीन, मज़दूर, ज़मीन) और बताएँ कि आपको "देना / बेचना है" या "चाहिए"। फिर "आगे बढ़ें"।', en: 'Part 1: choose a category (such as machines, labour or land) and say whether you are “Offering / selling” or “Looking for”. Then tap “Continue”.' },
      { hi: 'हिस्सा 2: उस श्रेणी की जानकारी भरें। "फोटो जोड़ें" से फोटो लगाएँ: आम तौर पर 3 तक, और ज़मीन, गोदाम व ग्रीनहाउस में 5 तक। JPG, PNG या WebP फोटो चलती है। पहली फोटो कवर बनती है; "कवर बनाएं" से इसे बदल सकते हैं।', en: 'Part 2: fill in the details for that category. Use “Add photos”: usually up to 3, and up to 5 for land, warehouse and greenhouse. JPG, PNG or WebP photos work. The first photo becomes the cover; “Make cover” changes it.' },
      { hi: 'इसी हिस्से में चुनें कि लिस्टिंग "किसान" डाल रहा है या "व्यापारी / दुकानदार"।', en: 'In the same part, choose whether a “Farmer” or a “Business or Shop” is posting.' },
      { hi: 'हिस्सा 3: गाँव या कस्बे का नाम लिखें, या "मेरी वर्तमान लोकेशन लें" दबाएँ। चाहें तो Google Maps का लिंक भी जोड़ सकते हैं। यहीं वह फ़ोन नंबर दिखता है जिस पर लोग आपसे संपर्क करेंगे।', en: 'Part 3: type your village or town, or tap “Use my current location”. You can also add a Google Maps link if you wish. The phone number people will contact you on is shown here.' },
      { hi: 'नियम और सहमति के सभी डिब्बों पर निशान लगाएँ और "जमा करें" दबाएँ।', en: 'Tick the rules and all the consent boxes, then tap Submit.' },
    ],
    after_title: { hi: 'लिस्टिंग डालने के बाद', en: 'After you post' },
    after: [
      { hi: '"आपकी लिस्टिंग जुड़ गई!" लिखा आता है। वहीं से "लिस्टिंग देखें" या "एक और डालें" चुन सकते हैं।', en: 'You see “Your listing has been posted!”. From there you can choose “View listing” or “Post another”.' },
      { hi: 'अगर जगह की पुष्टि में थोड़ा समय लगे तो इसका संदेश दिखता है; लिस्टिंग कुछ देर में नज़दीकी खोज में आ जाती है।', en: 'If confirming the place takes a little time, a message says so; the listing appears in nearby search shortly.' },
      { hi: 'आपकी सभी लिस्टिंग "मेरी लिस्टिंग" में रहती हैं। काम हो जाए तो वहाँ "मिल गया" दबाकर लिस्टिंग बंद कर दें।', en: 'All your listings stay under “My listings”. When the work is done, tap “Found” there to close the listing.' },
    ],
  },

  // ---- d) find and contact -------------------------------------------------------
  find: {
    id: 'khojein-aur-sampark',
    title: { hi: 'लिस्टिंग कैसे खोजें और संपर्क करें', en: 'How to find listings and make contact' },
    intro: {
      hi: 'लिस्टिंग देखने के लिए लॉगिन नहीं चाहिए। लॉगिन केवल नंबर देखने के समय माँगा जाता है।',
      en: 'You do not need to log in to look at listings. Login is asked for only when you want to see the number.',
    },
    diagram: {
      title: { hi: 'लिस्टिंग खोजने और संपर्क करने के चरण', en: 'Steps to find a listing and make contact' },
      desc: {
        hi: 'पाँच चरण ऊपर से नीचे: "खोजें" खोलें; श्रेणी और अपनी जगह चुनें; लिस्टिंग खोलकर जानकारी पढ़ें; कॉल या WhatsApp दबाएँ, जिसके लिए लॉगिन चाहिए; बात करने से पहले जानकारी खुद जाँच लें।',
        en: 'Five steps from top to bottom: open “Browse”; choose a category and your place; open a listing and read the details; tap Call or WhatsApp, which needs login; check the details yourself before you deal.',
      },
      steps: [
        { icon: 'search', lines: [{ hi: '"खोजें" खोलें', en: 'Open “Browse”' }] },
        { icon: 'pin', lines: [{ hi: 'श्रेणी चुनें', en: 'Choose a category' }, { hi: 'अपनी जगह चुनें', en: 'Choose your place' }] },
        { icon: 'list', lines: [{ hi: 'लिस्टिंग खोलें', en: 'Open a listing' }, { hi: 'जानकारी पढ़ें', en: 'Read the details' }] },
        { icon: 'phone', lines: [{ hi: 'कॉल या WhatsApp', en: 'Call or WhatsApp' }, { hi: 'लॉगिन चाहिए', en: 'Login needed' }] },
        { icon: 'shield', lines: [{ hi: 'जानकारी खुद जाँचें', en: 'Check details yourself' }] },
      ],
    },
    steps: [
      { hi: '"खोजें" खोलें: फ़ोन में नीचे की पट्टी में, या ऊपर "बाज़ार" मेन्यू से कोई श्रेणी चुनें।', en: 'Open “Browse”: in the bottom bar on a phone, or choose a category from the “Marketplace” menu at the top.' },
      { hi: 'ऊपर की पट्टी से श्रेणी चुनें और अपनी जगह बताएँ: लोकेशन साझा करके, या अपना गाँव या कस्बा लिखकर।', en: 'Pick a category from the row at the top and set your place: share your location, or type your village or town.' },
      { hi: 'छाँटें: "सभी", देने वाली या चाहिए वाली लिस्टिंग; और "नज़दीकी पहले" या "नई पहले"। मशीन की श्रेणी में काम के हिसाब से भी छाँट सकते हैं।', en: 'Filter: “All”, offers or requirements; and “Nearest first” or “Newest first”. In the machines category you can also filter by type of work.' },
      { hi: 'पहले 30 किमी के अंदर की लिस्टिंग दिखती है। वहाँ कुछ न हो तो 30–50 किमी दूर की लिस्टिंग अलग से दिखती है।', en: 'Listings within 30 km are shown first. If there are none, listings 30–50 km away are shown separately.' },
      { hi: 'किसी लिस्टिंग को दबाकर खोलें: पूरी जानकारी, फोटो और "Google Maps में खोलें" का बटन मिलेगा।', en: 'Tap a listing to open it: you get the full details, photos and an “Open in Google Maps” button.' },
      { hi: '"कॉल करें" या "WhatsApp करें" दबाएँ। लॉगिन नहीं है तो पहले लॉगिन माँगा जाएगा और उसके बाद आप उसी लिस्टिंग पर लौट आएँगे। फिर विक्रेता का नाम और नंबर दिखता है।', en: 'Tap “Call” or “WhatsApp”. If you are not logged in you are asked to log in first, and then you return to the same listing. The seller’s name and number are then shown.' },
      { hi: 'पूरी वेबसाइट में खोजने के लिए ऊपर का खोज बॉक्स (फ़ोन में 🔍) इस्तेमाल करें। माइक दबाकर बोलकर भी खोज सकते हैं। होम पेज पर बड़ा खोज बॉक्स है।', en: 'To search the whole website, use the search box at the top (🔍 on a phone). You can also tap the mic and speak. The home page has a large search box.' },
    ],
    safety_title: { hi: 'सावधानी', en: 'Stay safe' },
    safety: {
      hi: 'लेन-देन से पहले सामने वाले की पहचान और जानकारी खुद जाँच लें। किसान सहयोग केवल जानकारी देने वाला मंच है; हम किसी सौदे, भुगतान या समझौते में शामिल नहीं होते। कुछ गलत लगे तो लिस्टिंग के नीचे "शिकायत करें" दबाएँ।',
      en: 'Before any deal, check the other person’s identity and details yourself. Kissan Sahyog is only an information platform; we are not part of any deal, payment or agreement. If something looks wrong, tap “Report” below the listing.',
    },
  },

  // ---- e) sawaal -----------------------------------------------------------------
  sawaal: {
    id: 'kisan-sawaal',
    title: { hi: 'किसान सवाल कैसे पढ़ें', en: 'How to read farmer Q&A' },
    intro: {
      hi: 'किसान सवाल में खेती के सवाल और उनके जवाब हैं। इन्हें पढ़ने के लिए लॉगिन नहीं चाहिए।',
      en: 'Farmer Q&A has farming questions with their answers. You do not need to log in to read them.',
    },
    diagram: {
      title: { hi: 'किसान सवाल पढ़ने के चरण', en: 'Steps to read farmer Q&A' },
      desc: {
        hi: 'चार चरण ऊपर से नीचे: "किसान सवाल" खोलें; विषय चुनें या सवाल खोजें; "जवाब देखें" दबाएँ; पहले "संक्षेप में" पढ़ें, फिर पूरा जवाब और स्रोत।',
        en: 'Four steps from top to bottom: open “Farmer Q&A”; choose a topic or search for a question; tap “Show answer”; read “In brief” first, then the full answer and its sources.',
      },
      steps: [
        { icon: 'question', lines: [{ hi: '"किसान सवाल" खोलें', en: 'Open “Farmer Q&A”' }] },
        { icon: 'search', lines: [{ hi: 'विषय चुनें', en: 'Choose a topic' }, { hi: 'या सवाल खोजें', en: 'or search' }] },
        { icon: 'arrow', lines: [{ hi: '"जवाब देखें" दबाएँ', en: 'Tap “Show answer”' }] },
        { icon: 'book', lines: [{ hi: '"संक्षेप में" पढ़ें', en: 'Read “In brief”' }, { hi: 'फिर पूरा जवाब', en: 'then the full answer' }] },
      ],
    },
    steps: [
      { hi: 'ऊपर के मेन्यू से "किसान सवाल" खोलें।', en: 'Open “Q&A” from the menu at the top.' },
      { hi: 'विषय चुनें (जैसे फसल, कीट-रोग, मंडी, योजना), या खोज बॉक्स में सवाल के शब्द लिखें। माइक दबाकर बोल भी सकते हैं।', en: 'Choose a topic (such as crop, pests, market or schemes), or type words from your question in the search box. You can also tap the mic and speak.' },
      { hi: 'जिस सवाल का जवाब चाहिए उस पर "जवाब देखें" दबाएँ।', en: 'Tap “Show answer” on the question you want.' },
      { hi: 'सबसे ऊपर "संक्षेप में" छोटा जवाब है। उसके नीचे पूरा जवाब, जहाँ हैं वहाँ स्रोत, और "इनसे जुड़े सवाल" मिलते हैं।', en: 'At the top, “In brief” gives the short answer. Below it are the full answer, sources where there are any, and “Related questions”.' },
      { hi: 'अपना सवाल पूछना हो तो "अपना सवाल पूछें" दबाएँ; चाहें तो फोटो भी जोड़ें। सवाल जाँच के बाद जवाब के साथ प्रकाशित होता है।', en: 'To ask your own, tap “Ask a question”; you can add a photo if you wish. The question is published with an answer after review.' },
    ],
  },

  // ---- f) prices, cold storage, mela, schemes ------------------------------------
  info: {
    id: 'bhav-storage-mela-yojana',
    title: { hi: 'मंडी भाव, MSP, कोल्ड स्टोरेज, मेला और योजनाएँ', en: 'Mandi prices, MSP, cold storage, melas and schemes' },
    where_label: { hi: 'कहाँ दबाएँ', en: 'Where to tap' },
    see_label: { hi: 'क्या दिखेगा', en: 'What you will see' },
    blocks: [
      {
        to: '/msp', icon: 'chart',
        title: { hi: 'मंडी भाव और MSP', en: 'Mandi prices and MSP' },
        where: { hi: 'ऊपर के मेन्यू में "मंडी भाव"।', en: '“Mandi prices” in the menu at the top.' },
        see: { hi: 'फसल चुनने पर आज का मंडी भाव, सरकारी MSP और दोनों का फ़र्क; पास की मंडियाँ; भाव का रुझान; और "मंडी तुलना" में कई मंडियों के भाव साथ-साथ। हम भाव की भविष्यवाणी नहीं करते।', en: 'After you pick a crop: today’s mandi price, the government MSP and the gap between them; nearby mandis; the price trend; and “Compare mandis” to see several mandis side by side. We do not predict prices.' },
      },
      {
        to: '/cold-storage', icon: 'snow',
        title: { hi: 'कोल्ड स्टोरेज', en: 'Cold storage' },
        where: { hi: '"बाज़ार" मेन्यू में "कोल्ड स्टोरेज"।', en: '“Cold storage” in the “Marketplace” menu.' },
        see: { hi: 'अपनी लोकेशन साझा करने या अपना गाँव या कस्बा लिखने पर सबसे पास के कोल्ड स्टोरेज पहले; ज़िला, फसल और प्रकार से छाँटना; और हर एक पर रास्ते का बटन, और जहाँ नंबर दिया है वहाँ कॉल और WhatsApp।', en: 'Share your location or type your village or town to see the nearest cold storages first; filter by district, crop and type; each one has a directions button, and Call and WhatsApp where a number is listed.' },
      },
      {
        to: '/kisan-mela', icon: 'calendar',
        title: { hi: 'किसान मेला', en: 'Kisan Mela' },
        where: { hi: '"उपयोगी संपर्क" मेन्यू में "किसान मेला"।', en: '“Kisan Mela” in the “Resources” menu.' },
        see: { hi: 'आने वाले मेलों की सूची, राज्य और महीने से छाँटने के साथ। जिन तारीख़ों पर "अपेक्षित" लिखा है वे पक्की नहीं हैं, इसलिए जाने से पहले आयोजक से पुष्टि कर लें।', en: 'A list of upcoming melas, with state and month filters. Dates marked “Expected” are not final, so confirm with the organiser before you go.' },
      },
      {
        to: '/yojana', icon: 'building',
        title: { hi: 'सरकारी योजनाएँ', en: 'Government schemes' },
        where: { hi: 'ऊपर के मेन्यू में "सरकारी योजनाएं", फिर केंद्र सरकार या मध्यप्रदेश सरकार।', en: '“Govt schemes” in the menu at the top, then Central Government or Madhya Pradesh Government.' },
        see: { hi: 'योजनाओं के कार्ड। किसी कार्ड को दबाने पर लाभ, पात्रता, आवेदन कैसे करें, ज़रूरी कागज़ और आम सवाल मिलते हैं।', en: 'Scheme cards. Tap a card for its benefits, who is eligible, how to apply, the documents needed and common questions.' },
      },
    ],
  },

  // ---- g) phone + language -------------------------------------------------------
  phone: {
    id: 'phone-aur-bhasha',
    title: { hi: 'फ़ोन पर ऐप की तरह कैसे जोड़ें और भाषा कैसे बदलें', en: 'How to add it to your phone like an app, and change the language' },
    intro: {
      hi: 'किसान सहयोग को फ़ोन की होम स्क्रीन पर जोड़ लें तो यह ऐप की तरह एक बटन से खुलता है।',
      en: 'Add Kissan Sahyog to your phone’s home screen and it opens with one tap, like an app.',
    },
    diagram: {
      title: { hi: 'फ़ोन की होम स्क्रीन पर जोड़ने के चरण', en: 'Steps to add it to your phone’s home screen' },
      desc: {
        hi: 'चार चरण ऊपर से नीचे: फ़ोन में होम पेज खोलें; ऊपर की हरी पट्टी में "इंस्टॉल करें" दबाएँ; फ़ोन जो पूछे उसमें इंस्टॉल या "होम स्क्रीन पर जोड़ें" चुनें; होम स्क्रीन पर बने निशान से वेबसाइट खोलें।',
        en: 'Four steps from top to bottom: open the home page on your phone; tap “Install” in the green strip at the top; choose Install or “Add to Home screen” when the phone asks; open the website from the icon on your home screen.',
      },
      steps: [
        { icon: 'home', lines: [{ hi: 'फ़ोन में होम पेज खोलें', en: 'Open the home page' }] },
        { icon: 'download', lines: [{ hi: 'हरी पट्टी में', en: 'In the green strip' }, { hi: '"इंस्टॉल करें" दबाएँ', en: 'tap “Install”' }] },
        { icon: 'plus', lines: [{ hi: '"होम स्क्रीन पर जोड़ें"', en: '“Add to Home screen”' }] },
        { icon: 'phone-app', lines: [{ hi: 'होम स्क्रीन से खोलें', en: 'Open from home screen' }] },
      ],
    },
    install_title: { hi: 'होम स्क्रीन पर जोड़ना', en: 'Adding to the home screen' },
    install_steps: [
      { hi: 'फ़ोन में किसान सहयोग का होम पेज खोलें।', en: 'Open the Kissan Sahyog home page on your phone.' },
      { hi: 'सबसे ऊपर हरी पट्टी में "इंस्टॉल करें" दबाएँ।', en: 'Tap “Install” in the green strip at the very top.' },
      { hi: 'फ़ोन इंस्टॉल करने को पूछे तो हाँ कर दें।', en: 'If the phone asks to install, accept.' },
      { hi: 'अगर फ़ोन न पूछे तो पट्टी में तरीका लिखा आता है: ब्राउज़र का मेन्यू (⋮) खोलें और "ऐप इंस्टॉल करें" या "होम स्क्रीन पर जोड़ें" चुनें। iPhone में नीचे शेयर बटन दबाकर "होम स्क्रीन पर जोड़ें" चुनें।', en: 'If the phone does not ask, the strip shows how: open the browser menu (⋮) and choose “Install app” or “Add to Home screen”. On an iPhone, tap the Share button at the bottom and choose “Add to Home Screen”.' },
      { hi: 'अब होम स्क्रीन पर बने किसान सहयोग के निशान से वेबसाइट खोलें।', en: 'Now open the website from the Kissan Sahyog icon on your home screen.' },
    ],
    install_note: {
      hi: 'पट्टी को "✕" से बंद करेंगे तो वह अगली बार आने पर फिर दिखेगी। एक बार जोड़ लेने के बाद, होम स्क्रीन से खोलने पर यह पट्टी नहीं दिखती।',
      en: 'If you close the strip with “✕”, it shows again on your next visit. Once added, the strip does not show when you open the site from your home screen.',
    },
    lang_title: { hi: 'भाषा बदलना', en: 'Changing the language' },
    lang_steps: [
      { hi: 'हर पेज पर सबसे ऊपर "हिं" और "EN" के दो बटन हैं।', en: 'At the top of every page there are two buttons, “हिं” and “EN”.' },
      { hi: 'हिंदी के लिए "हिं" और अंग्रेज़ी के लिए "EN" दबाएँ। पेज उसी समय बदल जाता है।', en: 'Tap “हिं” for Hindi or “EN” for English. The page changes straight away.' },
      { hi: 'आपकी चुनी भाषा इस फ़ोन में याद रहती है। लॉगिन हैं तो यह आपकी प्रोफ़ाइल में भी सेव हो जाती है।', en: 'Your choice is remembered on this phone. If you are logged in, it is also saved to your profile.' },
    ],
    lang_note: {
      hi: 'किसान सवाल के कुछ जवाब अभी सिर्फ़ हिंदी में हैं; अंग्रेज़ी चुनने पर वहाँ इसकी सूचना दिखती है।',
      en: 'Some Q&A answers are in Hindi only for now; when English is selected, a note there says so.',
    },
  },

  // ---- h) FAQ --------------------------------------------------------------------
  faq: {
    id: 'aam-sawaal',
    title: { hi: 'आम सवाल', en: 'Common questions' },
    items: [
      {
        q: { hi: 'क्या लिस्टिंग देखने के लिए लॉगिन ज़रूरी है?', en: 'Do I need to log in to look at listings?' },
        a: { hi: 'नहीं। लिस्टिंग और उसकी पूरी जानकारी कोई भी देख सकता है। लॉगिन केवल विक्रेता का नंबर देखने और अपनी लिस्टिंग डालने के लिए चाहिए।', en: 'No. Anyone can see listings and their full details. You need to log in only to see a seller’s number and to post your own listing.' },
      },
      {
        q: { hi: 'विक्रेता का फ़ोन नंबर कैसे मिलेगा?', en: 'How do I get the seller’s phone number?' },
        a: { hi: 'लिस्टिंग पर "कॉल करें" या "WhatsApp करें" दबाएँ। लॉगिन नहीं है तो पहले लॉगिन करना होगा, फिर आप उसी लिस्टिंग पर लौट आएँगे और नाम व नंबर दिखेगा।', en: 'Tap “Call” or “WhatsApp” on the listing. If you are not logged in you log in first, then you return to the same listing and the name and number are shown.' },
      },
      {
        q: { hi: 'एक लिस्टिंग में कितनी फोटो लगा सकते हैं?', en: 'How many photos can I add to a listing?' },
        a: { hi: 'आम तौर पर 3 तक। ज़मीन, गोदाम और ग्रीनहाउस की लिस्टिंग में 5 तक। JPG, PNG या WebP फोटो चलती है और पहली फोटो कवर बनती है।', en: 'Usually up to 3. Land, warehouse and greenhouse listings allow up to 5. JPG, PNG or WebP photos work, and the first photo becomes the cover.' },
      },
      {
        q: { hi: 'काम हो जाने पर लिस्टिंग कैसे बंद करें?', en: 'How do I close a listing once the work is done?' },
        a: { hi: 'लॉगिन करके "मेरी लिस्टिंग" खोलें और उस लिस्टिंग पर "मिल गया" दबाएँ। उसके बाद वह खोज में नहीं दिखती।', en: 'Log in, open “My listings” and tap “Found” on that listing. After that it no longer appears in search.' },
      },
      {
        q: { hi: 'क्या किसान सहयोग सौदे या भुगतान में शामिल होता है?', en: 'Is Kissan Sahyog part of the deal or the payment?' },
        a: { hi: 'नहीं। यह केवल जानकारी देने वाला मंच है। सौदा, भाव और भुगतान आप दोनों के बीच होता है, इसलिए पहले सामने वाले की जानकारी खुद जाँच लें।', en: 'No. It is only an information platform. The deal, the price and the payment are between the two of you, so check the other person’s details yourself first.' },
      },
      {
        q: { hi: 'क्या मैं अपना सवाल पूछ सकता/सकती हूँ?', en: 'Can I ask my own question?' },
        a: { hi: 'हाँ। "किसान सवाल" पेज पर "अपना सवाल पूछें" दबाएँ। चाहें तो फोटो भी जोड़ें। सवाल जाँच के बाद जवाब के साथ प्रकाशित होता है।', en: 'Yes. On the “Q&A” page tap “Ask a question”. You can add a photo if you wish. The question is published with an answer after review.' },
      },
      {
        q: { hi: 'क्या मंडी भाव पेज आगे का भाव बताता है?', en: 'Does the mandi prices page tell me future prices?' },
        a: { hi: 'नहीं। वहाँ आज का मंडी भाव, सरकारी MSP और पिछले दिनों का रुझान दिखता है। हम भाव की भविष्यवाणी नहीं करते; मंडी में अंतिम भाव नीलामी से तय होता है।', en: 'No. It shows today’s mandi price, the government MSP and the trend over recent days. We do not predict prices; the final mandi price is set by auction.' },
      },
      {
        q: { hi: 'वेबसाइट अंग्रेज़ी में कैसे देखें?', en: 'How do I see the website in English?' },
        a: { hi: 'हर पेज पर सबसे ऊपर "EN" दबाएँ; वापस हिंदी के लिए "हिं"। किसान सवाल के कुछ जवाब अभी सिर्फ़ हिंदी में हैं।', en: 'Tap “EN” at the top of any page; tap “हिं” to go back to Hindi. Some Q&A answers are in Hindi only for now.' },
      },
    ],
  },

  feedback: {
    lead: { hi: 'कुछ समझ न आए या कोई गड़बड़ी दिखे तो हमें बताएँ: ', en: 'If something is unclear or looks wrong, tell us: ' },
  },
}

const pick = (v, lang) => v?.[lang] ?? v?.hi ?? ''

// FAQPage JSON-LD built from the same FAQ the page shows.
export function buildHowToUseJsonLd(data = howToUse, lang = 'hi') {
  return [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${ORIGIN}/how-to-use`,
    inLanguage: lang,
    mainEntity: data.faq.items.map((f) => ({
      '@type': 'Question',
      name: pick(f.q, lang),
      acceptedAnswer: { '@type': 'Answer', text: pick(f.a, lang) },
    })),
  }]
}

export default howToUse
