# Privacy policy — additions for the Android app

> **DRAFT — NEEDS LAWYER REVIEW. Do not publish as is.**
> This text is NOT on the live site. The live privacy page (`src/screens/Privacy.jsx`, text in
> `src/lib/i18n/legal.js`) was deliberately **not edited**. After the lawyer approves (backlog
> L1/L2, `docs/review/batch9/BACKLOG.md:26-27`), these paragraphs go into `privacyPolicy` in
> `src/lib/i18n/legal.js`, Hindi first, in the same `{ hi, en }` format.

Operator: **USD Vision AI LLP**. Contact for this draft: **usdvisionai@gmail.com**.
Note for the lawyer/founder: the live page currently gives `hello@kissansahyog.com` (data
requests) and `grievance@kissansahyog.com` (complaints) (`src/lib/i18n/legal.js:46,50`). Decide
which address(es) the final policy uses; it must match the Play Console contact.

Every statement below is checked against the code; the evidence column is for the reviewer only
and is not part of the text to publish.

---------------------------------------------------------------------

## A. Paragraphs to add (Hindi first, then English)

### A1. Who runs the app

**हिंदी:** किसान सहयोग वेबसाइट और Android ऐप USD Vision AI LLP चलाती है। निजता से जुड़े किसी भी सवाल के लिए usdvisionai@gmail.com पर लिखें।

**English:** The Kisan Sahyog website and Android app are operated by USD Vision AI LLP. For any privacy question, write to usdvisionai@gmail.com.

### A2. What the app keeps on your phone

**हिंदी:** ऐप आपके फ़ोन में ये चीज़ें रखता है: (1) सार्वजनिक जानकारी की एक कॉपी — जैसे मंडी भाव, MSP, मौसम, लिस्टिंग, योजनाएँ, सवाल-जवाब — ताकि नेटवर्क न होने पर भी आख़िरी बार देखी जानकारी दिखे; यह कॉपी 5 MB से ज़्यादा नहीं होती और पुरानी जानकारी अपने-आप हटती रहती है। (2) आपका लॉगिन सत्र (आपकी अपनी प्रोफ़ाइल, जिसमें आपका मोबाइल नंबर है)। (3) आपकी चुनी हुई जगह, भाषा, और ऐप का बनाया एक रैंडम नंबर (डिवाइस आईडी)। सार्वजनिक कॉपी में किसी की निजी जानकारी नहीं रखी जाती — न किसी की प्रोफ़ाइल, न "नंबर देखें" दबाकर खोला गया विक्रेता का नंबर, न लॉगिन से जुड़ी जानकारी। लॉगआउट करने पर लॉगिन सत्र फ़ोन से हट जाता है। ऐप हटाने (uninstall) पर यह सब फ़ोन से हट जाता है। ऐप का डेटा फ़ोन के बैकअप में नहीं जाता।

**English:** The app keeps these on your phone: (1) a copy of public information — such as mandi prices, MSP, weather, listings, schemes and questions and answers — so that what you last opened is still shown when there is no network; this copy is limited to 5 MB and older entries are removed automatically. (2) Your login session (your own profile, which includes your mobile number). (3) Your chosen place, your language, and a random number created by the app (device ID). The public copy never contains anyone's private information — no profiles, no seller number opened with "show number", and nothing about logins. Logging out removes the login session from the phone. Uninstalling the app removes all of this from the phone. App data is not included in phone backups.

| Evidence (reviewer only) |
|---|
| allow-list of public tables `src/lib/offline/policy.js:13-24`; never-stored list `:26-38`; 5 MB cap `:9`; oldest-first eviction `src/lib/offline/store.js:64-83`; session `src/lib/auth/authService.js:23,41-67` (logout removes `ks_session_v1` and signs out of Supabase Auth); `src/lib/supabaseClient.js:41-47`; place `src/lib/location/userLocation.js:36-42`; device id `src/lib/device.js:1-17`; `android:allowBackup="false"` `android/app/src/main/AndroidManifest.xml:5` |
| Caveat to resolve first: published success stories expose `contact_phone` to anyone (`supabase/migrations/0021_community_features.sql:69,77,80-83`), so a copy of such a row could be in the offline cache. Fix the column exposure, or soften "never contains anyone's private information" to "never contains private account data". Kisan Mela organiser numbers are public on purpose (`src/lib/mela/melaApi.js:15`). |

### A3. Location in the app

**हिंदी:** ऐप आपकी लोकेशन सिर्फ़ तब लेता है जब ऐप खुला हो और आप लोकेशन वाला बटन दबाकर अनुमति दें; बैकग्राउंड में कभी नहीं। आप चाहें तो लोकेशन दिए बिना गाँव या शहर का नाम लिख सकते हैं। (1) "मेरी लोकेशन" से मिली जगह सिर्फ़ आपके फ़ोन में रहती है; "मेरी लोकेशन हटाएँ" दबाकर उसे हटा सकते हैं। मौसम के लिए जगह लगभग 10 किमी तक गोल करके ही भेजी जाती है। जगह का नाम दिखाने के लिए आपकी लोकेशन मैप सेवा BigDataCloud को भेजी जा सकती है। (2) लिस्टिंग डालते समय अगर आप "मेरी अभी की लोकेशन" चुनते हैं, तो वह लोकेशन आपकी लिस्टिंग के साथ सेव होती है और लिस्टिंग देखने वालों को दिख सकती है। फ़ोन की सेटिंग में जाकर आप लोकेशन की अनुमति कभी भी बंद कर सकते हैं।

**English:** The app uses your location only while it is open and only after you press a location button and allow it — never in the background. You can always type your village or town instead. (1) A place found with "My location" stays on your phone only; press "Clear my location" to remove it. For weather, the place is rounded to about 10 km before it is sent. To show the name of the place, your position may be sent to the map service BigDataCloud. (2) If you choose "use my current location" while posting a listing, that position is saved with your listing and can be seen by people who view the listing. You can turn off the location permission at any time in your phone's settings.

| Evidence (reviewer only) |
|---|
| foreground only, no `ACCESS_BACKGROUND_LOCATION`: `AndroidManifest.xml:44-46`; ask only after agreement `src/lib/location/userLocation.js:90-100`; on-phone storage `:36-42`; clear `docs/review/BATCH7L2_REPORT.md:150-156`; rounding `BATCH7L2_REPORT.md:121-134`; BigDataCloud `src/lib/location/locationStore.js:17-27`; listing position saved unrounded `src/lib/location/postPosition.js:1-40`, `BATCH7L2_REPORT.md:144`. **If backlog B9 (round listing positions) is done first, change sentence (2) to say "rounded to about 1 km" / "the village centre".** |

### A4. Microphone and voice search in the app

**हिंदी:** ऐप माइक का इस्तेमाल सिर्फ़ तब करता है जब आप बोलकर खोजने के लिए माइक बटन दबाते हैं; रिकॉर्डिंग अधिकतम 15 सेकंड की होती है। ऐप में यह रिकॉर्डिंग सुरक्षित कनेक्शन से हमारे सर्वर पर जाती है, जो उसे लिखित शब्दों में बदलने के लिए Google की Gemini सेवा को भेजता है; सिर्फ़ शब्द वापस आते हैं और उनसे खोज होती है। हम रिकॉर्डिंग कहीं सेव नहीं करते। गलत इस्तेमाल रोकने के लिए हमारा सर्वर आपके इंटरनेट पते (IP) और समय का रिकॉर्ड लगभग एक दिन तक रखता है, रिकॉर्डिंग नहीं। माइक कभी बैकग्राउंड में इस्तेमाल नहीं होता।

**English:** The app uses the microphone only when you tap the mic button to search by voice; a recording lasts at most 15 seconds. In the app, the recording is sent over a secure connection to our server, which passes it to Google's Gemini service to turn it into text; only the text comes back and is used for the search. We do not save the recording anywhere. To prevent misuse, our server keeps a record of your internet address (IP) and the time for about one day — not the recording. The microphone is never used in the background.

| Evidence (reviewer only) |
|---|
| `src/components/VoiceSearchButton.jsx:122-123,140`; app does not use the phone's speech service `src/lib/voice/voiceSearch.js:31-35`; server `functions/transcribe.js:94-147` (no storage of audio); IP + time `supabase/migrations/0034_voice_transcribe_rate_limit.sql:6-10,33-34`. **This replaces, for the app, the live sentence "your phone or browser's own service (for example Google or Apple) may process it" (`src/lib/i18n/legal.js:26-27`)**, which stays true for the website in Chrome. Lawyer: Google's handling depends on the Gemini API tier (paid vs free) — confirm before publishing "Google … only to turn it into text". |

### A5. What else the app sends (complete list for the "what we collect" section)

**हिंदी:** खाता बनाने पर: नाम, ईमेल, पासवर्ड (सुरक्षित रूप में, Supabase की लॉगिन सेवा में), मोबाइल नंबर, गाँव/शहर; चाहें तो ज़मीन (एकड़), मुख्य फ़सलें, पसंदीदा मंडी और WhatsApp सहमति। लिस्टिंग डालने पर: लिस्टिंग की जानकारी और फ़ोटो (फ़ोटो सार्वजनिक होती हैं)। अपने-आप: बिना नतीजे वाली खोजें, लिस्टिंग कितनी बार देखी गई, और ऐप का रैंडम डिवाइस आईडी — ताकि गिनती और गलत इस्तेमाल रोकने की सीमा सही रहे। लॉगिन की कोशिशें (मोबाइल नंबर या ईमेल के साथ) सुरक्षा के लिए दर्ज होती हैं। ऐप में कोई विज्ञापन, विज्ञापन-ट्रैकिंग या एनालिटिक्स टूल नहीं है, और क्रैश रिपोर्ट नहीं भेजी जाती।

**English:** When you create an account: name, e-mail, password (stored securely by Supabase's login service), mobile number, village/town; optionally land (acres), main crops, preferred mandi and WhatsApp consent. When you post a listing: the listing details and photos (photos are public). Automatically: searches that found nothing, how often a listing was viewed, and the app's random device ID — so that counts and anti-misuse limits work. Login attempts (with the mobile number or e-mail) are recorded for security. The app has no ads, no ad tracking and no analytics tools, and sends no crash reports.

| Evidence (reviewer only) |
|---|
| `src/lib/auth/authService.js:115-124,246-287`; photos `src/lib/listings/photos.js:24-44`; search misses `supabase/migrations/0045_search.sql:44-51`; views `supabase/migrations/0046_view_counter.sql:5-12`; device id `src/lib/device.js`; login attempts `supabase/migrations/0059_login_rules.sql:45-50`; no SDKs `docs/store/data-safety-answers.md` §4. |

### A6. Deleting your account and data

**हिंदी:** ऐप में Profile → "अकाउंट डिलीट करें" दबाकर पुष्टि करें — आपकी प्रोफ़ाइल और आपकी सभी लिस्टिंग हट जाती हैं और फ़ोन से लॉगिन सत्र हट जाता है। बाकी जानकारी (जैसे सुझाव/शिकायत फ़ॉर्म के संदेश, आपकी डाली गई फ़ोटो, सफलता की कहानी) हटवाने के लिए, या ऐप के बिना खाता हटवाने के लिए, usdvisionai@gmail.com पर अपने मोबाइल नंबर या ईमेल के साथ लिखें। हम [X] दिनों में जवाब देंगे। फ़ोन में रखी जानकारी ऐप हटाने (uninstall) पर हट जाती है।

**English:** In the app, go to Profile → "Delete Account" and confirm — your profile and all your listings are removed and the login session is removed from the phone. To remove other information (such as feedback/grievance messages, photos you uploaded, a success story), or to delete your account without the app, write to usdvisionai@gmail.com with your mobile number or e-mail. We will reply within [X] days. Information kept on the phone is removed when you uninstall the app.

| Evidence (reviewer only) |
|---|
| `src/screens/Profile.jsx:102-110,233-241`; `src/lib/auth/authService.js:334-339`; `supabase/migrations/0011_p3_profile.sql:52-68` (profile delete, listings cascade). **Before publishing, either fix or reword:** the Supabase Auth login (e-mail + password hash) is NOT deleted today and photo files are NOT removed from storage (`docs/store/data-safety-answers.md` §5). "[X] days" — lawyer to fill (DPDP Rules 2025). |

---------------------------------------------------------------------

## B. Live sentences that must change at the same time (do not change tonight)

| Live (`src/lib/i18n/legal.js`) | Why |
|---|---|
| line 15 "What we collect: your mobile number, pincode, village/town, and your listing details" | Incomplete — see A5 |
| lines 26-27 voice: "your phone or browser's own service … may process it" | Not true in the app — see A4 |
| line 34 location "It is saved in your browser on this device" | Add the app ("on your phone") and the Post-form exception — see A3 |
| lines 46, 50 contact e-mails | Align with the chosen contact address |
| Page banner "legal review pending" (`src/screens/Privacy.jsx:17`) | Remove only after the lawyer signs off |
