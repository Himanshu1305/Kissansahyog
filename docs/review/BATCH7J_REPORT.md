# Batch 7J report — wording fixes, shipped to production

Date: 13 October 2026

## 1. Ship result

**Shipped.** Batch 7J is live on https://kissansahyog.com.

- Deployment: https://68b806e2.kissansahyog-prod.pages.dev
- Git: commit `c11bba4` on `staging`, pushed. Nothing was pushed to `main`.
- No migration, `.env` file or live data was touched. The feedback form was not submitted.
- This report was written after the ship, so it is not in the commit.

## 2. Check results

**Ship gate (all passed)**

| Check | Result |
|---|---|
| `npm run build:prod` | Passed. 263/263 routes prerendered, 0 failed. Production guard OK. |
| verify-batch7a | 76 passed, 0 failed |
| verify-batch7b | 88 passed, 0 failed |
| verify-batch7c | 58 passed, 0 failed |
| verify-batch7d (now holds the 7J checks) | 78 passed, 0 failed |

The browser (Playwright) scripts were not re-run for this batch. Only text changed, and the
verifiers check the built pages directly.

**Live site (curl, after the deploy)**

| Check | Result |
|---|---|
| `/`, `/about/`, `/terms/`, `/privacy/`, `/grievance/`, `/how-to-use/`, `/sawaal/` | All 200 |
| `/terms/` contains "Draft" | No |
| `/terms/` contains "USD Vision AI" | Only once, in the footer credit. Not in the Terms text. |
| `/terms/` shows "Version 1.2" | Yes |
| `/grievance/` has hello@ and grievance@ | Yes, both as mailto links. See note 3 in section 5. |
| `/articles/intercropping-madhya-pradesh/` shows "Team Kissan Sahyog" | Yes. "USD Vision AI Team" is gone. |

## 3. Every place "pilot" / "पायलट" was changed

| # | Place | Before | After |
|---|---|---|---|
| 1 | Terms, clause 1 (`src/lib/i18n/termsContent.js`) | "The service is currently a pilot in Sagar, Madhya Pradesh." / "सेवा अभी सागर, मध्य प्रदेश में पायलट रूप में है।" | "It is starting in Sagar and may expand to other places over time." / "इसकी शुरुआत सागर से हो रही है, और समय के साथ इसे दूसरे स्थानों तक बढ़ाया जा सकता है।" |
| 2 | About, section heading (`src/content/about.js`) | "The pilot in Sagar, Madhya Pradesh" / "सागर, मध्य प्रदेश में पायलट" | "Starting in Sagar, Madhya Pradesh" / "सागर, मध्य प्रदेश से शुरुआत" |
| 3 | About, that section's paragraph | "Right now Kissan Sahyog is running as a pilot in Sagar district, Madhya Pradesh. So most of the information here is for Sagar and the nearby area." / "अभी किसान सहयोग एक पायलट के रूप में सागर ज़िले (मध्य प्रदेश) में चल रहा है। इसलिए यहाँ सबसे ज़्यादा जानकारी सागर और आस-पास के इलाके की मिलेगी।" | "Kissan Sahyog is starting in Sagar district, Madhya Pradesh, and may expand to other places over time. So for now most of the information here is for Sagar and the nearby area." / "किसान सहयोग की शुरुआत सागर ज़िले (मध्य प्रदेश) से हो रही है, और समय के साथ इसे दूसरे स्थानों तक बढ़ाया जा सकता है। इसलिए अभी यहाँ सबसे ज़्यादा जानकारी सागर और आस-पास के इलाके की मिलेगी।" |
| 4 | About, that section's link anchor | `#sagar-pilot` | `#sagar-se-shuruaat` (nothing on the site linked to the old anchor) |
| 5 | About, meta description | "…what a farmer can do here, the pilot in Sagar, Madhya Pradesh, and how to contact us." / "…सागर (मध्य प्रदेश) का पायलट और हमसे संपर्क कैसे करें।" | "…what a farmer can do here, our start in Sagar, Madhya Pradesh, and how to contact us." / "…सागर (मध्य प्रदेश) से शुरुआत और हमसे संपर्क कैसे करें।" |
| 6 | Site-search keywords for the About page (`scripts/build-search-index.mjs`) | "… sagar pilot सागर …" | "… sagar farm marketplace खेती का बाज़ार सागर …" |
| 7 | Unused label `stat_pilot_label` (`src/lib/i18n/strings.js`; not shown on any page) | "Pilot area" / "पायलट क्षेत्र" | "Starting area" / "शुरुआती क्षेत्र" |

Home, Contact, `llms.txt`, the JSON-LD and the other meta descriptions did not use the word,
so there was nothing to change there.

**Left as it is, on purpose:** the carbon-credit pages (`/carbon-credit`,
`/carbon-credit/niti-sujhav`, and the article `/articles/kisaan-carbon-credit-kya-hai`) still
say "pilot projects" / "पायलट". That is about the Government's 11 carbon-market pilot
projects, a cited fact, not about Kissan Sahyog. The new check allows only those three pages.

## 4. Before and after

### 4a. Terms, clause 1 "Nature of the service"

**Before (EN):** Kissan Sahyog is an information and notice-board service of USD Vision AI LLP. It helps people share information about farming, work, goods, and local services. The platform is not a party to a sale, rental, job, wage, transport, land, or other deal. The service is currently a pilot in Sagar, Madhya Pradesh.

**Before (HI):** किसान सहयोग USD Vision AI LLP की सूचना और नोटिस-बोर्ड सेवा है। यह लोगों को खेती, काम, सामान और स्थानीय सेवाओं की जानकारी साझा करने में मदद करती है। मंच किसी बिक्री, किराये, नौकरी, मजदूरी, परिवहन, जमीन या दूसरे सौदे का पक्षकार नहीं है। सेवा अभी सागर, मध्य प्रदेश में पायलट रूप में है।

**After (EN):** Kissan Sahyog (kissansahyog.com) is a farm marketplace and information website for Sagar, Madhya Pradesh, where farmers, labourers, machine owners and local suppliers meet in one place. Post or find farm land, tractors and machinery, labour, seeds, produce and local farm services near you, and keep up with mandi prices, weather, government schemes and answers to farming questions. Kissan Sahyog is owned and run by Shri Abhinandan Dixit. It is starting in Sagar and may expand to other places over time. We connect people; the deal is between you and the other person. Kissan Sahyog is not a party to any sale, rental, job, wage, transport, land or other agreement, and does not handle payments. Please check the other person's details yourself before you go ahead.

**After (HI):** किसान सहयोग (kissansahyog.com) सागर, मध्य प्रदेश के लिए खेती का बाज़ार और सूचना वेबसाइट है, जहाँ किसान, मज़दूर, मशीन मालिक और स्थानीय आपूर्तिकर्ता एक ही जगह मिलते हैं। अपने आस-पास खेत, ट्रैक्टर-मशीनें, मज़दूर, बीज, उपज और खेती की सेवाएँ खोजें या खुद पोस्ट करें, और साथ में मंडी भाव, मौसम, सरकारी योजनाएँ और खेती के सवालों के जवाब भी पाएँ। किसान सहयोग के स्वामी और संचालक श्री अभिनन्दन दीक्षित हैं। इसकी शुरुआत सागर से हो रही है, और समय के साथ इसे दूसरे स्थानों तक बढ़ाया जा सकता है। हम लोगों को जोड़ते हैं; सौदा आपके और दूसरे व्यक्ति के बीच होता है। किसान सहयोग किसी बिक्री, किराये, काम, मज़दूरी, ढुलाई, ज़मीन या अन्य समझौते का पक्षकार नहीं है और भुगतान नहीं संभालता। आगे बढ़ने से पहले दूसरे व्यक्ति की जानकारी खुद जाँच लें।

**Also changed, "Limit of responsibility" clause:** "Kissan Sahyog and USD Vision AI LLP are not responsible…" is now "Kissan Sahyog, its owner, operator and service providers are not responsible…". Hindi: "किसान सहयोग और USD Vision AI LLP" is now "किसान सहयोग, इसके स्वामी, संचालक और सेवा प्रदाता". The rest of that clause is unchanged.

### 4b. Terms, "Law, contact, and version" (#law)

**Before (EN):** These terms are intended to be interpreted under Indian law. Lawyer confirmation required: proposed jurisdiction of courts at Sagar, Madhya Pradesh and the liability wording may change after legal review. Contact: hello@kissansahyog.com; grievance: grievance@kissansahyog.com or /grievance. Effective date 12 October 2026, version Terms Draft 1.2.

**Before (HI):** ये शर्तें भारत के कानूनों के अनुसार समझी जाएंगी। वकील से पुष्टि आवश्यक: विवाद के लिए सागर, मध्य प्रदेश के न्यायालयों की प्रस्तावित अधिकारिता और जिम्मेदारी-सीमा की भाषा कानूनी समीक्षा के बाद बदली जा सकती है। संपर्क: hello@kissansahyog.com; शिकायत: grievance@kissansahyog.com या /grievance। प्रभावी तिथि 12 अक्टूबर 2026, संस्करण Terms Draft 1.2।

**After (EN):** These terms are intended to be interpreted under Indian law. Disputes are subject to the courts at Sagar, Madhya Pradesh. Contact: hello@kissansahyog.com; grievance: grievance@kissansahyog.com or /grievance. Effective date 12 October 2026, Version 1.2.

**After (HI):** ये शर्तें भारत के कानूनों के अनुसार समझी जाएंगी। विवाद सागर, मध्य प्रदेश के न्यायालयों की अधिकारिता में होंगे। संपर्क: hello@kissansahyog.com; शिकायत: grievance@kissansahyog.com या /grievance। प्रभावी तिथि 12 अक्टूबर 2026, संस्करण 1.2।

**Header line under the page title.** Before: "Last updated: 12 October 2026 · Terms Draft 1.2" / "आख़िरी बदलाव: 12 अक्टूबर 2026 · Terms Draft 1.2". After: "Last updated: 12 October 2026 · Version 1.2" / "आख़िरी बदलाव: 12 अक्टूबर 2026 · संस्करण 1.2".

The removed lawyer-review sentence (Hindi and English) is saved at the end of
`docs/legal/TERMS_DRAFT_FOR_LAWYER.md`, which is not public.

### 4c. Grievance page, e-mail lines under the form

**Before (EN):** You can also email us directly: hello@kissansahyog.com

**Before (HI):** चाहें तो सीधे ईमेल भी कर सकते हैं: hello@kissansahyog.com

**After (EN):**
General questions: hello@kissansahyog.com
Complaints and grievances: grievance@kissansahyog.com

**After (HI):**
सामान्य प्रश्न: hello@kissansahyog.com
शिकायतें: grievance@kissansahyog.com

Each address is on its own line and is a mailto link.

### 4d. "What Kissan Sahyog is" block (About page)

**Before, title:** "What Kissan Sahyog is" / "किसान सहयोग क्या है"

**Before, body (EN):** It is a website where farmers can see information about land, machines, labour and other farm services near them, and post their own. We are only an information platform. We are not part of any deal, payment or agreement. Please check the other person's details yourself before going ahead.

**Before, body (HI):** यह एक वेबसाइट है जहाँ किसान अपने आस-पास की ज़मीन, मशीन, मज़दूर और खेती की दूसरी सेवाओं की जानकारी देख सकते हैं और अपनी जानकारी डाल सकते हैं। हम केवल जानकारी देने वाला मंच हैं। किसी सौदे, भुगतान या समझौते में हम शामिल नहीं होते। बात आगे बढ़ाने से पहले सामने वाले की जानकारी खुद जाँच लें।

**After, title:** "Your village's farm bazaar, now online" / "आपके गाँव का खेती-बाज़ार, अब ऑनलाइन"

**After, body (EN):** Need a tractor for sowing? Labour for harvest? Land on rent, or a buyer for your produce? Kissan Sahyog is a farm marketplace for Sagar, Madhya Pradesh: post what you have, and find what you need from farmers and suppliers near you. You also get mandi bhav, weather, government schemes and answers to farming questions, in simple Hindi and English. We are starting in Sagar and growing district by district, so your area could be next. We only bring people together. The deal, price and payment stay between you and the other person, so check their details before you go ahead.

**After, body (HI):** बुवाई के लिए ट्रैक्टर चाहिए? कटाई के लिए मज़दूर? किराये पर ज़मीन, या अपनी उपज के लिए खरीदार? किसान सहयोग सागर, मध्य प्रदेश के लिए खेती का बाज़ार है: अपना सामान डालें, और अपने पास के किसानों और सप्लायर्स से ज़रूरत की चीज़ें खोजें। साथ में मंडी भाव, मौसम, सरकारी योजनाएँ और खेती के सवालों के जवाब, सरल हिंदी और अंग्रेज़ी में। हमारी शुरुआत सागर से हुई है, और हम ज़िले-ज़िले आगे बढ़ रहे हैं, हो सकता है अगला नंबर आपके इलाके का हो। हम सिर्फ़ लोगों को जोड़ते हैं। सौदा, दाम और भुगतान आपके और दूसरे व्यक्ति के बीच रहते हैं, इसलिए आगे बढ़ने से पहले उनकी जानकारी खुद जाँच लें।

### 4e. SEO / AEO / GEO (item 6)

The definitional sentence is the first sentence of Terms clause 1 (English and Hindi). It is
now used in three places:

- **About page intro.** Before: "Kissan Sahyog is an information platform made for farmers — useful farming information in one place, in simple language." / "किसान सहयोग किसानों के लिए बना एक जानकारी मंच है — खेती के काम की बातें, एक जगह, आसान हिंदी में।" The About page's own JSON-LD description uses the same sentence.
- **Site-level JSON-LD** (Organization and WebSite, on every page). There was no description before.
- **`public/llms.txt`.** The opening description now starts with the sentence in English and Hindi, followed by "It is owned and run by Shri Abhinandan Dixit." The old opening was "A bilingual (Hindi-first) marketplace and knowledge hub for farmers in Sagar district, Madhya Pradesh, India." The rest of the file is unchanged.

**FAQ entry "What is Kissan Sahyog?" was skipped.** Neither the home page nor the About page
has an FAQ or FAQ JSON-LD, so there was nowhere to put it under the rule you gave.

## 5. Things to decide or know

1. **The "What Kissan Sahyog is" block is not collapsible.** The brief said to keep it
   collapsible. The only block with that title and the phrase "We are only an information
   platform" is the About page section, which has always been a normal open section. I changed
   its text and left its layout alone. The grievance page has a collapsed FAQ answer with a
   similar phrase ("We are only an information platform (intermediary)"); I did not touch it.
   If you meant that one, tell me.
2. **The Privacy page still says it is a draft.** Its note reads "Note: this is an initial
   draft. Legal review is pending before public launch." / "नोट: यह एक प्रारंभिक मसौदा है…".
   It was not in the list of text to change, so I left it. The new check looks for the word
   "Draft" with a capital D, as written in the brief, so it passes. Say the word and I will
   remove the note.
3. **Curl cannot read the e-mail addresses on the live grievance page.** Cloudflare hides
   e-mail links from non-browser tools on the live domain. I decoded the two protected links
   and they are hello@kissansahyog.com and grievance@kissansahyog.com. On the direct
   deployment URL both plain mailto links are there. In a browser they show and work normally.
4. **The Sagar courts sentence is new legal wording.** The old text only said the Sagar
   jurisdiction was "proposed". To keep "courts at Sagar" after removing the lawyer note, I
   wrote "Disputes are subject to the courts at Sagar, Madhya Pradesh." A lawyer should
   confirm it, and the new "its owner, operator and service providers" wording. Both points are
   listed in `docs/legal/TERMS_DRAFT_FOR_LAWYER.md`.
5. **The article byline needed no change from me.** The production database already had
   "Team Kissan Sahyog" for the intercropping article, so the rebuild picked it up.
6. **Two other "information platform" lines remain** (How-to-use safety note and FAQ, the
   grievance FAQ, and the home meta description "An information platform for Sagar & MP
   farmers…"). They were not in the brief, so they are unchanged. They no longer match the new
   "farm marketplace" description.
7. `public/search-index.json` shows as changed locally. The ship script leaves it out on purpose.
