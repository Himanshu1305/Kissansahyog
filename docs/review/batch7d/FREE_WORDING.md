# Batch 7D — "free" wording audit

Searched for: `free`, `Free`, `मुफ़्त`, `मुफ्त`, `निःशुल्क`, `निशुल्क`, `no charge`, `without charge`, `0 rupees`, `बिना पैसे`
in `src/`, `public/` (text files), `index.html`, `vite.config.js`, `functions/`, `supabase/migrations/`, and the scripts that write visible text.
A second sweep for other no-fee phrasings (`कोई शुल्क`, `no fee`, `no cost`, `no commission`, `फ्री`…) found nothing that is a claim about this site.

The table shows the text **as it was before this batch**. Status:

- **CHANGED** — an unconditional claim about our service; removed or reworded in code.
- **KEPT** — not a claim about our service; left as it is, with the reason.
- **DB** — lives in the database; SQL is in `DB_FIXES.sql` (not applied).
- **DECIDE** — needs your decision.


## CHANGED (15)

| File | Line | Old text | What changed |
|---|---|---|---|
| `src/content/pages/grievance.js` | 123 | a: { hi: 'नहीं। हम केवल एक मुफ़्त सूचना मंच (मध्यस्थ) हैं। कोई भुगतान, कमीशन या भाव तय करना हमारी ओर से… | Grievance FAQ: "मुफ़्त सूचना मंच … कोई भुगतान, कमीशन / free information platform … no payment or commission" → says only that the deal, price and payment are between the two parties. |
| `src/content/seo.js` | 13 | description: { hi: 'सागर व मध्य प्रदेश के किसानों के लिए मुफ़्त मंच: मंडी भाव, MSP, मौसम, सरकारी योजनाएं, किसान सवाल और एक मुफ़्त लिस… | Homepage meta description (also used for search/JSON-LD): "मुफ़्त मंच … मुफ़्त लिस्टिंग बाज़ार / free platform … free listings marketplace" → "जानकारी मंच … लिस्टिंग बाज़ार". |
| `src/lib/i18n/strings.js` | 106 | toll_free_badge: { hi: 'निःशुल्क', en: 'Toll Free' }, | Hindi badge on helpline numbers read just "निःशुल्क"; now "टोल-फ्री" so it cannot be read as a claim about the site. |
| `src/lib/i18n/strings.js` | 219 | wa_join_title: { hi: 'रोज़ सुबह सागर मंडी भाव + मौसम WhatsApp पर — मुफ़्त', en: 'Daily Sagar mandi prices + weather on WhatsApp — free' }, | Removed "— मुफ़्त / — free" from the WhatsApp join banner. |
| `src/lib/i18n/strings.js` | 635 | …nner_text: { hi: 'किसान सहयोग को अपने फ़ोन में इंस्टॉल करें — बिल्कुल मुफ़्त, कोई स्पैम नहीं', en: 'Install Kissan Sahyog on your phone — complete… | Install banner: "बिल्कुल मुफ़्त, कोई स्पैम नहीं / completely free, no spam" replaced by what installing does. |
| `src/lib/i18n/strings.js` | 1271 | hero_listings_sub: { hi: '30 किमी दायरे में · मुफ़्त', en: 'Within 30 km · Free' }, | Removed "· मुफ़्त / · Free". |
| `src/lib/i18n/strings.js` | 1281 | hero_subline2: { hi: 'सीधा संपर्क · बिना बिचौलिए · बिल्कुल मुफ़्त', en: 'Direct contact · No middlemen · Completely free' }, | Removed "· बिल्कुल मुफ़्त / · Completely free". |
| `src/lib/i18n/strings.js` | 1290 | stat_free_label: { hi: 'बिल्कुल', en: 'Free' }, | Stat tile "बिल्कुल / Free" reworded to "सीधा / Direct" (string is not used on any screen today). |
| `src/lib/i18n/strings.js` | 1292 | stat_free_value: { hi: 'मुफ़्त', en: 'Free' }, | Stat tile "मुफ़्त / Free" reworded to "संपर्क / Contact" (not used on any screen today). |
| `src/lib/i18n/strings.js` | 1439 | …ीज-खाद, ढुलाई, ज़मीन और गोदाम — सब एक जगह। कोई बिचौलिया नहीं, बिल्कुल मुफ़्त।', en: 'Connect directly with farmers near you. Machines, workers, st… | Removed ", बिल्कुल मुफ़्त / , completely free" from the /bazaar intro and meta description. |
| `src/lib/i18n/strings.js` | 1613 | …{ hi: 'रोज़ सुबह अपने गाँव का मौसम WhatsApp पर पाएँ — पायलट के दौरान मुफ़्त', en: 'Get your village weather on WhatsApp every morning — free duri… | Removed "— पायलट के दौरान मुफ़्त / — free during the pilot". |
| `src/lib/i18n/strings.js` | 1676 | …up_h: { hi: 'भाव MSP से ऊपर जाए तो WhatsApp पर बताएँ — पायलट के दौरान मुफ़्त', en: 'Get a WhatsApp alert when the price rises above MSP — free dur… | Removed "— पायलट के दौरान मुफ़्त / — free during the pilot". |
| `src/lib/i18n/strings.js` | 2185 | cs_post_cta: { hi: 'कोल्ड स्टोरेज मालिक हैं? मुफ़्त में अपनी लिस्टिंग डालें', en: 'Own a cold storage? List it free' }, | "मुफ़्त में अपनी लिस्टिंग डालें / List it free" → "अपनी लिस्टिंग डालें / Add your listing". |
| `src/lib/i18n/termsContent.js` | 4 | …का स्वरूप','Nature of the service','किसान सहयोग USD Vision AI LLP की निःशुल्क सूचना और नोटिस-बोर्ड सेवा है। यह लोगों को खेती, काम, सामान और स्थानीय… | Terms clause 1: "निःशुल्क सूचना और नोटिस-बोर्ड सेवा / free information and notice-board service" → "सूचना और नोटिस-बोर्ड सेवा". |
| `public/llms.txt` | 3 | > A free, bilingual (Hindi-first) marketplace and knowledge hub for farmers in | "A free, bilingual … marketplace" → "A bilingual … marketplace". |

## DB (1)

| File | Line | Old text | Reason |
|---|---|---|---|
| `supabase/migrations/0024_mausam_msp.sql` | 210 | …ें — मोबाइल नंबर, पिनकोड और फसल चुनें और सहमति दें। पायलट के दौरान यह मुफ़्त है। कभी भी STOP लिखकर बंद कर सकते हैं।','Fill the ''Get your village… | Seed for the /mausam FAQ: "free during the pilot" about OUR WhatsApp update. Lives in the database → SQL in DB_FIXES.sql. |

## DECIDE (1)

| File | Line | Old text | Reason |
|---|---|---|---|
| `scripts/gen-og.mjs` | 30 | 'default':       { hi: 'किसानों के लिए मुफ़्त मंच', en: 'A free marketplace & knowledge hub for farmers' }, | Text baked into the social share image public/og/default.png ("किसानों के लिए मुफ़्त मंच / A free marketplace…"). Not changed: the share image was to be left alone. Needs your decision. |

## KEPT (104)

| File | Line | Old text | Reason |
|---|---|---|---|
| `src/components/AvailabilityCalendar.jsx` | 2 | // (logged in, viewing their own listing) taps dates to toggle busy/free; everyone | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/AvailabilityCalendar.jsx` | 4 | // just an owner-maintained busy/free view so callers know before they call. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/categories/fields.jsx` | 106 | // Labelled free-text input. Pass inputMode="decimal" (+ optional min/step) for a | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/categories/transport.jsx` | 16 | capacity: '', // optional free text (e.g. "5 टन" / "50 क्विंटल") | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/categories/transport.jsx` | 18 | rate_amount: '', // optional free text (e.g. "₹25/किमी") | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/coldStorage/ColdStorageFinder.jsx` | 8 | // Labels live in strings.js (cs_crop_<key>); `match` tests the free-text products field. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/components/VoiceSearchButton.jsx` | 10 | // Primary: Web Speech API (hi-IN), free + client-side. Fallback (browsers without | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/content/pages/bazaar.js` | 39 | …the machine, the rate (per hour, per acre or per day) and when it is free. Farmers find a machine nearby and fix the booking by phone. When you… | "free" means the machine/vehicle is not busy ("when it is free", "free times"). |
| `src/content/pages/bazaar.js` | 155 | …om, and how the fare is charged (per trip or per kilometre). Give the free times too, so a farmer can book the right day. A farmer can find a ne… | "free" means the machine/vehicle is not busy ("when it is free", "free times"). |
| `src/content/qa/batch4_rabi3.js` | 381 | …0), Yamuna Safed 3 (G-282) and Yamuna Safed 4 (G-323). Choose disease-free, bold bulbs for seed.", | Farming term (disease-free seed), not a price claim. |
| `src/content/qa/legacy.js` | 323 | …"text": "PM-KISAN money comes as three equal instalments of 2,000 rupees, straight to the Aadhaar-linked bank account. The instalment comes on… | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/legacy.js` | 437 | …branch. From 1 January 2025, loans up to 2 lakh rupees are collateral-free. The government gives 7% concessional interest up to 3 lakh rupees, w… | Bank term: collateral-free loan (KCC). |
| `src/content/qa/legacy.js` | 604 | "text": "From 1 January 2025, the collateral-free loan limit was raised from 1.60 lakh to 2 lakh rupees per farmer.", | Bank term: collateral-free loan (KCC). |
| `src/content/qa/legacy.js` | 1766 | …ट्टी की स्थिति और फसल के लिए खाद की मात्रा बताता है। यह हर दो साल में मुफ़्त मिलता है।", | Describes a government scheme that is without charge (Soil Health Card / Drone Didi training), from the cited source. |
| `src/content/qa/legacy.js` | 1767 | …status on 12 parameters and the fertiliser amount for the crop. It is free, every two years.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/legacy.js` | 1771 | …मिट्टी की स्थिति 12 मापदंडों पर बताता है। यह किसानों को हर दो साल में मुफ़्त दिया जाता है।", | Describes a government scheme that is without charge (Soil Health Card / Drone Didi training), from the cited source. |
| `src/content/qa/legacy.js` | 1866 | …hat tells your soil's status on 12 parameters. It is given to farmers free every two years.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/legacy.js` | 2891 | "text": "ड्रोन उड़ाने की मुफ़्त ट्रेनिंग दी जाती है।", | Describes a government scheme that is without charge (Soil Health Card / Drone Didi training), from the cited source. |
| `src/content/qa/legacy.js` | 2976 | "text": "Free training to fly the drone is given.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/pulses_veg.js` | 980 | …Use well-drained raised beds. Avoid sprinkler irrigation. Sow disease-free seed.", | Farming term (disease-free seed), not a price claim. |
| `src/content/qa/schemes.js` | 12 | …is a central government scheme. Every eligible farmer family gets 6,000 rupees a year. This money comes in three equal instalments of 2,000 rupees e… | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 32 | …ber 2018. It gives every eligible farmer family income support of 6,000 rupees a year.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 39 | …raight to the farmer's bank account in three equal instalments of 2,000 rupees each.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 57 | …ike doctors and lawyers, and retired people drawing a pension of 10,000 rupees or more are not included.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 138 | "text": "Retired people drawing a monthly pension of 10,000 rupees or more.", | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 449 | …s damaged, report it within 72 hours. You can report through the toll-free number 1800-209-5959, the Fasal Bima app, or the local agriculture de… | A toll-free government helpline number. |
| `src/content/qa/schemes.js` | 499 | "text": "Report through the toll-free number 1800-209-5959, the Fasal Bima app, or the local agriculture de… | A toll-free government helpline number. |
| `src/content/qa/schemes.js` | 631 | …े हैं। 1 जनवरी 2025 से 2 लाख रुपये तक का कर्ज बिना गारंटी (collateral-free) मिलता है। बैंक शाखा में जाकर आवेदन करें।", | Bank term: collateral-free loan (KCC). |
| `src/content/qa/schemes.js` | 632 | …or KCC. From 1 January 2025, loans up to 2 lakh rupees are collateral-free. Apply by going to a bank branch.", | Bank term: collateral-free loan (KCC). |
| `src/content/qa/schemes.js` | 643 | "text": "1 जनवरी 2025 से बिना गारंटी (collateral-free) कर्ज की सीमा 1.60 लाख रुपये से बढ़ाकर 2 लाख रुपये प्रति किसान कर दी… | Bank term: collateral-free loan (KCC). |
| `src/content/qa/schemes.js` | 682 | "text": "From 1 January 2025, the collateral-free loan limit has been raised from 1.60 lakh rupees to 2 lakh rupees per… | Bank term: collateral-free loan (KCC). |
| `src/content/qa/schemes.js` | 723 | …कार्ड एक रिपोर्ट कार्ड है जो किसानों को हर दो साल में दिया जाता है और मुफ़्त होता है। यह मिट्टी की स्थिति 12 मापदंडों (parameters) पर बताता है और… | Describes a government scheme that is without charge (Soil Health Card / Drone Didi training), from the cited source. |
| `src/content/qa/schemes.js` | 724 | …e Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises… | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/qa/schemes.js` | 728 | …यल हेल्थ कार्ड (SHC) एक रिपोर्ट कार्ड है, जो किसानों को हर दो साल में मुफ़्त दिया जाता है और उनकी मिट्टी की स्थिति 12 मापदंडों पर बताता है। यह योज… | Describes a government scheme that is without charge (Soil Health Card / Drone Didi training), from the cited source. |
| `src/content/qa/schemes.js` | 752 | …"text": "The Soil Health Card (SHC) is a report card given to farmers free every two years. It tells the state of their soil on 12 parameters. T… | An amount of money in an answer ("2,000 rupees"); it matched the "0 rupees" search only by its last digits. |
| `src/content/sources.js` | 637 | "publisher": "Free Press Journal", | Name or title of a cited source (e.g. "Free Press Journal", a scheme headline). |
| `src/content/sources.js` | 651 | "publisher": "Free Press Journal", | Name or title of a cited source (e.g. "Free Press Journal", a scheme headline). |
| `src/content/sources.js` | 1394 | "url": "https://www.bighaat.com/kisan-vedika/blogs/weed-free-wheat-field-sustainable-practices-for-effective-weed-management", | Name or title of a cited source (e.g. "Free Press Journal", a scheme headline). |
| `src/content/sources.js` | 1462 | "title": "Kisan Credit Card ecosystem — collateral-free limit raised ₹1.6 lakh → ₹2 lakh (from 1 Jan 2025); MISS loan limit e… | Name or title of a cited source (e.g. "Free Press Journal", a scheme headline). |
| `src/content/sources.js` | 1469 | …Health Card — launched 19 Feb 2015; issued every two years; provided free", | Name or title of a cited source (e.g. "Free Press Journal", a scheme headline). |
| `src/lib/community/communityApi.js` | 91 | // applies — keeps this file free of hardcoded Devanagari (bilingual audit). | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/i18n/strings.js` | 133 | res_card_soil_1: { hi: 'टोल-फ्री: 1800-180-1551', en: 'Toll-free: 1800-180-1551' }, | A toll-free government helpline number. |
| `src/lib/i18n/strings.js` | 136 | res_card_vet_1: { hi: 'टोल-फ्री: 1962 (घर पर इलाज)', en: 'Toll-free: 1962 (home treatment)' }, | A toll-free government helpline number. |
| `src/lib/i18n/strings.js` | 149 | f_phone_tollfree: { hi: 'टोल-फ्री नंबर', en: 'Toll-free number' }, | A toll-free government helpline number. |
| `src/lib/i18n/strings.js` | 1943 | …page SEO (templated; {crop} is replaced at render — keeps render code free of literals). | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/listings/categorySafety.js` | 1 | // Framework-free so static verification can exercise the unknown-category path. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/listings/listingsApi.js` | 144 | // contact-free. We enrich each row with village/town + district (from the public | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/location/locationStore.js` | 143 | // on Earth, via BigDataCloud's free, keyless client API (Hindi names where available). | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/mela/melaFormat.js` | 3 | // module stays free of hardcoded Devanagari. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/lib/voice/voiceSearch.js` | 2 | //  1) Web Speech API (SpeechRecognition) — free, client-side, no key. Primary path. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/screens/Msp.jsx` | 37 | // Phase 3b — free mandi search (deliberately NOT geofenced). | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `src/screens/Msp.jsx` | 302 | {/* Phase 3b — free mandi search (distance-unrestricted). */} | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `functions/geocode.js` | 2 | //   or (Batch 2 item B) GET /geocode?q=<free-form MP place> for the cold-storage finder. | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `functions/geocode.js` | 18 | // `q` is a free-form Madhya Pradesh place search (cold-storage finder); `village` | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `functions/geocode.js` | 20 | const free = (url.searchParams.get('q') \|\| '').trim() | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `functions/geocode.js` | 21 | if (!free && !village) return json({ found: false, error: 'village or q require… | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `functions/geocode.js` | 22 | const q = free ? `${free}, Madhya Pradesh, India` : `${village}, ${district}, Madhya… | Code comment or variable name (free-text field, free/busy calendar, keyless API); never shown to a visitor. |
| `supabase/migrations/0008_v11_agri_inputs.sql` | 6 | -- Vendor listings are free (no payment gate); the "charges may apply later" note | SQL comment, not shown to anyone. |
| `supabase/migrations/0016_resources.sql` | 184 | $r$Call the toll-free number for any agriculture-related query or problem$r$, | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 491 | 'ड्रोन पर 80% सब्सिडी + मुफ्त ट्रेनिंग। ड्रोन छिड़काव से ₹1,000-1,500 प्रति एकड़ की कमाई।', | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 492 | '80% subsidy on drone + free training. Earn ₹1,000-1,500 per acre from drone spraying service.', | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 511 | 'अपनी मिट्टी की जांच कराएं — मुफ्त में। पता चलेगा कि किस फसल के लिए कितनी खाद चाहिए। सही खाद डालने से खर… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 512 | 'Get your soil tested — for free. Know exactly what fertilizer your soil needs for each crop. Right fe… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 513 | 'मुफ्त मिट्टी जांच + खाद की सटीक सलाह। ऑनलाइन Soil Health Card मिलता है।', | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 514 | 'Free soil testing + precise fertilizer advice. Get Soil Health Card online… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 618 | KVK सागर-I (09425854876) से मुफ्त परामर्श लें।', | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0021_community_features.sql` | 629 | Free consultation from KVK Sagar-I: 09425854876', | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0023_schemes_content_features.sql` | 272 | ('मिट्टी जांच शिविर', 'Soil testing camp', 'निःशुल्क मिट्टी नमूना संग्रह एवं मृदा स्वास्थ्य कार्ड वितरण।', 'KVK सागर', (cu… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0023_schemes_content_features.sql` | 311 | …कार्यालय और CSC केंद्र से मिलती है। किसान कॉल सेंटर 1800-180-1551 पर निःशुल्क कृषि सलाह ले सकते हैं। इसके अलावा गाँव के कृषि सखी और पटवारी भी मार्ग… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0023_schemes_content_features.sql` | 366 | …VK सागर से संपर्क करें। किसी बिचौलिये को पैसे न दें, पंजीकरण पूरी तरह मुफ्त है।","a_en":"First check e-KYC is complete and the account is Aadhaar… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0023_schemes_content_features.sql` | 370 | …योजना में महिला स्वयं सहायता समूह को ड्रोन की कीमत पर 80% सब्सिडी और मुफ्त ट्रेनिंग मिलती है। ड्रोन से किसानों के खेतों में दवा/खाद का छिड़काव क… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0023_schemes_content_features.sql` | 371 | …s a Soil Health Card benefit me?","a_hi":"इस योजना में आपकी मिट्टी की मुफ्त जांच होती है और आपको Soil Health Card मिलता है, जिस पर लिखा होता है क… | Seed text about a government scheme or helpline that really is without charge (soil testing, drone training, KVK advice, PM-KISAN registration). |
| `supabase/migrations/0036_kisan_mela_candidates.sql` | 2 | …Mela re-architecture: a candidate-staging + audit table shared by the free aggregator | SQL comment, not shown to anyone. |
| `public/search-index.json` | 457 | …branch. From 1 January 2025, loans up to 2 lakh rupees are collateral-free. The government gives 7% ", | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 459 | …branch. from 1 january 2025, loans up to 2 lakh rupees are collateral-free. the government gives 7%" | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 763 | …s damaged, report it within 72 hours. You can report through the toll-free number 1800-209-5959, the Fasal Bima app, or the local agriculture de… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 765 | …s damaged, report it within 72 hours. you can report through the toll-free number 1800-209-5959, the fasal bima app, or the local agriculture de… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 826 | …is a central government scheme. Every eligible farmer family gets 6,000 rupees a year. This money comes in three equal instalments of 2,000 rupees e… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 828 | …is a central government scheme. every eligible farmer family gets 6,000 rupees a year. this money comes in three equal instalments of 2,000 rupees e… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1230 | …कार्ड एक रिपोर्ट कार्ड है जो किसानों को हर दो साल में दिया जाता है और मुफ़्त होता है। यह मिट्टी की स्थिति 12 मापदंडों (parameters) पर बताता है और… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1231 | …e Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1233 | …कार्ड एक रिपोर्ट कार्ड है जो किसानों को हर दो साल में दिया जाता है और मुफ़्त होता है। यह मिट्टी की स्थिति 12 मापदंडों (parameters) पर बताता है और… | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1366 | …0), Yamuna Safed 3 (G-282) and Yamuna Safed 4 (G-323). Choose disease-free, bold bulbs", | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1368 | …0), yamuna safed 3 (g-282) and yamuna safed 4 (g-323). choose disease-free, bold bulbs" | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1402 | …or KCC. From 1 January 2025, loans up to 2 lakh rupees are collateral-free. Apply b", | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/search-index.json` | 1404 | …or kcc. from 1 january 2025, loans up to 2 lakh rupees are collateral-free. apply b" | Generated copy of a Q&A answer about a government scheme/helpline (see the matching src/content/qa row). Rebuilt from the database by build-search-index. |
| `public/images/home/manifest.json` | 7 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 15 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 23 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 31 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 39 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 47 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 55 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 63 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 71 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 79 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 87 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 95 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 103 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 111 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 119 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 127 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 135 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |
| `public/images/home/manifest.json` | 143 | "license": "Pexels License (free to use, no attribution required)", | Photo licence text ("free to use"), not about our service. |

## The one deliberate promotion

"निःशुल्क रजिस्ट्रेशन / Free Registration" (string `free_registration`) is used in exactly three places, with no "now / अभी / during launch":

1. Homepage hero — badge beside the eyebrow line (`data-testid="hero-free-registration"`).
2. Homepage hero — line directly under the post-listing button "मेरे पास कुछ है" (`data-testid="post-free-registration"`).
3. Sign-up page — one line under the page heading (`data-testid="signup-free-registration"`); the form and auth logic are untouched.

The two homepage lines show only to visitors who are not logged in.

## Also fixed while here

- `public/llms.txt` said the marketplace was "login-gated browse". Browsing is public; corrected.
- Live database rows were also checked (staging, read-only): one `page_faqs` row (`mausam`) says "free during the pilot" → `DB_FIXES.sql`. No `site_settings` value and no article body contains the words.
