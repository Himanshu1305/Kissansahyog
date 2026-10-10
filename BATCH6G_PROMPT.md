# BATCH 6G — Founder page (`/founder`), homepage trust band, footer link

You are the builder. The architect/reviewer (Claude) reviews afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).
The owner has ALREADY put you on the correct branch. Do NOT create or switch branches.

PREREQUISITE: Batch 6A is present (central layout/theme in `src/styles/tokens.css`,
`src/components/ui.jsx`, `src/components/layout/PageShell.jsx`, `Footer.jsx`; self-hosted Noto Sans
Devanagari; `ErrorBoundary`). Reuse them. If any is missing, STOP and say so in the report.

## 0. Rules

- Do NOT `git commit`, do NOT deploy, do NOT run migrations, do NOT write to the database.
- Never read/print/edit/commit `.env` or secrets.
- Hindi first, English second. No hard-coded Devanagari inside `.jsx` components: long copy lives in
  `src/content/founder.js` (bilingual objects, same style as the other files in `src/content/`),
  short UI labels live in `src/lib/i18n/strings.js`. Run the existing i18n audit if one exists.
- Plain, dignified, farmer-friendly Hindi. No "coming soon" / "under review" labels anywhere.
- Pre-existing failing tests to leave alone: `v11_phase6`, `v2_citation_audit`, `batch4_ui_style`.
  Do not delete/skip/loosen tests.
- Windows + Node 24: dynamic `import()` of absolute paths needs `pathToFileURL(...).href`.
- No localStorage/sessionStorage for this feature. No new npm dependencies. No stock photos of faces.
- Keep `docs/review/BATCH6G_PROGRESS.md` updated. At the end write `docs/review/BATCH6G_REPORT.md`
  (done / not done and why / files changed / unsure / pages to check after deploy),
  `scripts/verify-batch6g.mjs` (PASS/FAIL lines) with UTF-8 output saved to
  `docs/review/BATCH6G_VERIFY_OUTPUT.txt`.
- If `npm run build` is blocked by the sandbox (Tailwind native module / `spawn EPERM`), say so and save
  the raw output; the owner builds on his own terminal.
- If your own shell cannot start, STOP and tell the owner. Do not work around it with unsandboxed commands.

## 1. Purpose and tone

A page about the founder, Shri Abhinandan Dixit (retired DCF, Madhya Pradesh Forest Department),
meant to create trust and faith in a farmer who has never heard of the site, and respect in an
official who reads it. It must feel dignified, personal and motivating, never boastful, never
film-like. The founder speaks in the first person ("मैं"). The motto "WE WILL DO IT" stays in English.

The two site missions must appear exactly as on the rest of the site (do not reword):
- किसान की आय बढ़ाना  /  Increasing Farmer Income
- रोज़गार के अवसर बनाना  /  Creating Employment Opportunities
(reuse the existing strings `mission_income` and `mission_rojgar` / `hero_h1_l1` and `hero_h1_l2`).

Service length is **42 years** (1981 to 2023). Write "42 वर्ष" / "42 years" everywhere. Never write
40 or चालीस for the length of service.

## 2. Owner decisions already taken (do not argue, implement)

- Keep "ब्राह्मण परिवार" in the birth line. Keep the opening "ॐ सीताराम".
- Parents' names, wife's name and the whole family list are shown by name.
- Do NOT name or hint at the company that failed to deliver the carbon-credit project.
  Say only "शुरुआती कठिनाइयाँ".
- Do NOT promise that the site is free. Promises are about information quality and the two missions only.
- Awards are shown plainly (no "verified" badge). If a certificate image path is set in the data file,
  show a small "प्रमाणपत्र देखें" link/lightbox; if not set, show nothing extra.
- The site byline elsewhere stays "Team Kissan Sahyog". Do not add his name to the carbon-credit pages.

## 3. Tasks

### G1 — Data file `src/content/founder.js`

One exported object with bilingual `{hi, en}` fields. Contents (the Hindi text below is the source of
truth, use it verbatim; write a faithful, plain English version, adding nothing new):

```
hero_greeting:  ॐ सीताराम
hero_title:     42 वर्ष की सेवा। एक संकल्प: किसान की आय बढ़ाना।
name:           श्री अभिनन्दन दीक्षित
role:           संस्थापक, किसान सहयोग · सेवानिवृत्त उप वन संरक्षक (DCF), मध्य प्रदेश शासन
motto:          WE WILL DO IT

glance (list):
 - किसान परिवार से; जन्म खुरई, ज़िला सागर में
 - 42 वर्ष शासकीय सेवा (1981 से 2023)
 - 1981 में म.प्र. लोक सेवा आयोग से चयन
 - वनस्पति विज्ञान की पढ़ाई, सागर विश्वविद्यालय
 - फॉरेस्ट्री डिप्लोमा, नॉर्दर्न फॉरेस्ट रेंजर्स कॉलेज, 1982-83
 - उप वन संरक्षक (DCF) पद से सेवानिवृत्त, 2023
 - स्वर्ण पदक, म.प्र. शासन, 20 अप्रैल 2011
 - गिनीज वर्ल्ड रिकॉर्ड, 2014-15 (कृषि क्षेत्र में सफल रोपण)
 - बैहर में सबई घास की रस्सी और बाँस के फर्नीचर के नवाचार, जो उद्योग बने
 - "बुंदेली व्यंजन, बिजावर" की शुरुआत; प्रदेश स्तर पर कई पुरस्कार
 - 2011 से किसानों को कार्बन क्रेडिट का लाभ दिलाने का प्रयास

roots_heading:  मेरी जड़ें किसान परिवार में हैं
roots_p1: मेरा जन्म सागर ज़िले के खुरई में, एक ब्राह्मण परिवार में हुआ। पाँच भाइयों और चार बहनों के भरे-पूरे परिवार में मैं सबसे छोटा था, इसलिए बड़े भाई-बहनों का स्नेह और संरक्षण मुझे बचपन से मिला।
roots_p2: मेरी माँ, श्रीमती त्रिवेणी बाई दीक्षित, खेती करती थीं। खेत, बीज, बारिश का इंतज़ार और फसल की चिंता मेरे लिए किताबी बातें नहीं, घर की रोज़ की बातें थीं। मेरे पिता, पंडित शालिग राम दीक्षित, प्राचार्य पद से सेवानिवृत्त हुए। शिक्षा और ईमानदारी का महत्व मैंने अपने घर से सीखा।
roots_p3: मेरी पढ़ाई ग्राम धंगर के स्कूल से शुरू हुई। फिर सागर का लाल स्कूल, शासकीय उच्चतर माध्यमिक विद्यालय से 11वीं बोर्ड, और फिर सागर विश्वविद्यालय में वनस्पति विज्ञान।
roots_p4: मैं किसान परिवार से हूँ और अपनी सेवा में गाँवों और किसानों के बीच काम किया है। इसलिए किसान की समस्याएँ और उसके सामने खुले अवसर, दोनों समझता हूँ। अब मैं अपना अनुभव किसान की भलाई में लगाना चाहता हूँ। हमारे दो उद्देश्य हैं:
  [pull-quote 1] किसान की आय बढ़ाना
  [pull-quote 2] रोज़गार के अवसर बनाना
roots_p5: तकनीक की मदद से हम किसान तक सही जानकारी और बेहतर बाज़ार पहुँचाएँगे, ताकि उसकी कमाई बढ़े। इसी रास्ते से गाँव में ही काम के नए अवसर बनेंगे।

education_timeline (4 steps, in order): ग्राम धंगर का स्कूल → लाल स्कूल, सागर → शासकीय उच्चतर माध्यमिक विद्यालय, 11वीं बोर्ड → सागर विश्वविद्यालय, वनस्पति विज्ञान

service_heading: जब पढ़ाई बीच में छोड़नी पड़ी
service_p: 1981 में मध्य प्रदेश लोक सेवा आयोग में मेरा चयन हो गया। सागर विश्वविद्यालय में वनस्पति विज्ञान की एम.एससी. (पूर्वार्ध) की पढ़ाई मुझे बीच में छोड़नी पड़ी। 1982-83 में नॉर्दर्न फॉरेस्ट रेंजर्स कॉलेज से फॉरेस्ट्री का डिप्लोमा किया। एक साल के कठिन प्रशिक्षण के बाद प्रदेश के कई ज़िलों में सेवा करने का अवसर मिला। 42 वर्ष की सेवा के बाद 2023 में उप वन संरक्षक (DCF) पद से सेवानिवृत्त हुआ।
service_timeline: 1981 चयन · 1982-83 फॉरेस्ट्री डिप्लोमा · कई ज़िलों में सेवा · 2023 उप वन संरक्षक पद से सेवानिवृत्ति

innovations_heading: जो नवाचार उद्योग बन गए
innovations (cards, each with optional image `src: null`, `alt`):
 - बैहर: सबई घास की रस्सी और बाँस के फर्नीचर के नवाचार, जो आगे चलकर बड़े उद्योग बने।
 - बिजावर: सेवा के अंतिम वर्ष में "बुंदेली व्यंजन, बिजावर" की शुरुआत, जिसे प्रदेश स्तर पर कई पुरस्कार मिले।
awards (cards, each with `year`, optional `proof_src: null`):
 - स्वर्ण पदक — वर्ष 2007-08 के उत्कृष्ट वानिकी कार्यों के लिए 20 अप्रैल 2011 को म.प्र. शासन द्वारा।
 - गिनीज वर्ल्ड रिकॉर्ड — वर्ष 2014-15 में कृषि क्षेत्र में सफल रोपण का गिनीज वर्ल्ड रिकॉर्ड दर्ज हुआ।
after_service: सेवानिवृत्ति के बाद भी भारत विकास परिषद, आदिवासी विकास मंच और साहित्यिक गतिविधियों में सक्रिय हूँ।

resolve_heading: एक संकल्प जो जिद बन गया
resolve_p: 2011 से मैं चाहता था कि किसान को कार्बन क्रेडिट का सीधा लाभ मिले। शुरुआती कठिनाइयों ने मेरा इरादा कमज़ोर नहीं किया, और पक्का कर दिया। मैंने तय किया कि यह काम अब मैं खुद करूँगा। मेरे दो सिद्धांत हैं:
  [pull-quote] "अकर्म से कर्म श्रेष्ठ"
  [pull-quote] "परिश्रम के अतिरिक्त कोई रास्ता नहीं"

promises_heading: किसान सहयोग: मेरे तीन वादे
 1. सही और भरोसेमंद जानकारी — सरकारी और प्रमाणित स्रोतों के आधार पर, सरल हिंदी में और समय पर अपडेट, इसके लिए सच्चे मन से काम करूँगा।
 2. किसान की आय बढ़ाना — हर नई सुविधा इसी कसौटी पर परखूँगा कि उससे किसान को क्या लाभ होता है।
 3. रोज़गार के अवसर बनाना — ज़मीन, उपकरण और मज़दूर जैसे बाज़ार के माध्यम से गाँव में काम के अवसर जोड़ने का प्रयास करूँगा।

blessings_heading: आशीर्वाद और स्नेह
family (grouped, each name is plain text, no links, no photos):
 - धर्मपत्नी: श्रीमती नीलम दीक्षित
 - पुत्र एवं पुत्रवधुएँ: अनुपम · अमन · वेदिका (अनुपम की पत्नी) · अंकिता (अमन की पत्नी)
 - बड़ों का आशीर्वाद और स्मृति:
     स्व. पंडित उमाशंकर दीक्षित एवं भाभी जी डॉ. कमलेश दीक्षित
     रविशंकर दीक्षित एवं स्व. डॉ. छाया दीक्षित (भाभी जी)
     एडवोकेट संतोष दीक्षित
 - भतीजे-भतीजियाँ: राहुल-सुप्रिया · हिमाँशु-सुरभि · रिचा · श्रुति दीक्षित
blessings_close: इन सभी परिजनों के स्नेह, आशीर्वाद और सहयोग से ही यह नया कदम उठा रहा हूँ।

cta_ask:  किसान से सवाल पूछें      (links to the existing Sawaal ask flow, same target the homepage uses)
cta_join: WhatsApp पर जुड़ें        (the existing WhatsApp join path used on the homepage)
```

Also add to the data file: `portrait: { src: null, alt }`, `video: { youtube_id: null }`,
and for every image slot `src: null` (see G6). All slots render nothing / a designed placeholder when
`src` is null. Names must be written exactly as above (transliterate faithfully in English:
Smt. Neelam Dixit, Smt. Triveni Bai Dixit, Pt. Shalig Ram Dixit, Anupam, Aman, Vedica, Ankita,
late Pt. Umashankar Dixit and Bhabhi ji Dr. Kamlesh Dixit, Ravishankar Dixit and late Dr. Chhaya Dixit,
Advocate Santosh Dixit, Rahul–Supriya, Himanshu–Surbhi, Richa, Shruti Dixit).

### G2 — The page `src/screens/Founder.jsx` (route `/founder`)

Register the route in `src/App.jsx` (lazy, like the others). Use the shared `PageShell` with the default
wide width. Section order:

1. **Hero**: greeting line, H1 (the only h1 on the page), name, role, large motto "WE WILL DO IT".
   Portrait on the right on desktop (stacked above on phone). If `portrait.src` is null show a dignified
   initials avatar from tokens ("अ.दी."), never a stock face.
2. **"एक नज़र में"**: the `glance` list as a responsive grid of compact tiles (2 columns on phone, 3–4 on
   desktop). Do not render it as a plain bullet list.
3. **Roots** section (heading `roots_heading`): text column about 72ch plus, on desktop, a side card with
   the education timeline (vertical stepper). The two mission lines are large pull-quote blocks.
4. **Service** section: text plus a horizontal timeline (vertical on phone).
5. **Innovations and awards**: two innovation cards and two award cards. Cards can hold an optional photo
   (`src`) and an optional "प्रमाणपत्र देखें" link when `proof_src` is set (lightbox or opens the image).
6. **Resolve**: the carbon-credit story with the two principles as pull-quotes.
7. **Three promises**: three numbered cards.
8. **Blessings**: the grouped family list, calm typography, each group with a small label. Keep it
   respectful: no icons next to names of the departed.
9. **Closing band**: full-width green token band, motto "WE WILL DO IT" very large, two buttons
   (`cta_ask`, `cta_join`), and a small "इस पेज को शेयर करें" WhatsApp share link using
   `https://wa.me/?text=` with the page URL (no tracking).
10. Optional **video** block above the closing band only if `video.youtube_id` is set (use
    `youtube-nocookie.com`, click-to-load, no autoplay). Reuse whatever pattern `Videos.jsx` already uses;
    do not loosen the CSP beyond what that screen already needs. If it is null, render nothing.

Design rules: use only tokens/ui primitives; large Devanagari headings (self-hosted Noto Sans Devanagari),
generous spacing, calm green/earth palette from tokens, no emojis in the page body except none; the
greeting "ॐ सीताराम" is plain text (the 🙏 is not needed). Mobile first at 390px, then 768, 1024, 1440; no
horizontal scroll; tap targets at least 44px; contrast AA; images have width/height, `loading="lazy"`
(except the portrait), and Hindi alt text. Heading order must be valid (h1 → h2 → h3).

### G3 — Homepage "People you can trust" band

Read `src/screens/Homepage.jsx` around the founder card (it uses `founder_initials`, `founder_name`,
`founder_role`, `founder_quote`). Replace the small card with a richer band that keeps the same section
position and wide frame:
- portrait (or initials avatar), name, role line "संस्थापक · सेवानिवृत्त उप वन संरक्षक (DCF)";
- three short badge chips: "42 वर्ष की सेवा", "स्वर्ण पदक, 2011", "गिनीज वर्ल्ड रिकॉर्ड, 2014-15";
- the quote line: "WE WILL DO IT";
- a link "पूरा परिचय पढ़ें →" to `/founder`.
Remove the old `founder_role` string value "कृषि विशेषज्ञ, किसान परिवार से" and replace the old `founder_name`
text with "श्री अभिनन्दन दीक्षित" / "Shri Abhinandan Dixit" (the site must use one spelling). If other people
are listed in the same section, keep them unchanged.

### G4 — Links to the page

- Footer: add one link "संस्थापक" / "Founder" to `/founder` in the About/Information group of `Footer.jsx`.
- `AgroForestry.jsx`: the author line for the intercropping article ("लेखक: श्री ए.के. दीक्षित, ...") must
  link to `/founder` and use the same name spelling. Do not change anything else on that page.
- Do NOT add his name to the carbon-credit pages.

### G5 — SEO / AEO / sharing

- Add `/founder` to the sitemap generator, the prerender route list and the site search index
  (`scripts/gen-sitemaps.mjs`, `scripts/prerender.mjs`, `scripts/build-search-index.mjs`), following how
  the other static pages are registered.
- Page title (hi): "श्री अभिनन्दन दीक्षित — संस्थापक, किसान सहयोग"; description (hi) about 150 characters:
  "सेवानिवृत्त उप वन संरक्षक श्री अभिनन्दन दीक्षित का परिचय: किसान परिवार से 42 वर्ष की सेवा तक, और किसान की आय बढ़ाने का संकल्प।"
  Same for English. Open Graph and Twitter tags using the site's existing image mechanism.
- JSON-LD `Person` (and `Organization` for Kisan Sahyog as `founder` relation) containing ONLY: name,
  jobTitle ("Retired Deputy Conservator of Forests, Madhya Pradesh"), birthPlace Khurai, worksFor/founder of
  Kisan Sahyog. Include the `award` property ONLY for an award whose `proof_src` is set. With `proof_src`
  null, awards must NOT appear in structured data.
- Add a short FAQ block on the page (3 questions, plain Hindi/English, visible text, not hidden) such as
  "किसान सहयोग किसने शुरू किया?", "संस्थापक का अनुभव क्या है?", "किसान सहयोग का उद्देश्य क्या है?",
  answered only from the facts above, and mark it up as `FAQPage` JSON-LD.

### G6 — Image slots and documentation for the owner

Create `public/founder/README.md` (Hindi + English) listing the exact filenames the owner will add later
and the field in `src/content/founder.js` to set for each: `portrait.jpg`, `medal-certificate.jpg`,
`guinness-certificate.jpg`, `baihar-1.jpg`, `bijawar-1.jpg`, `parents.jpg` (optional). Recommended size
(portrait 1200×1500, others 1600 wide, JPEG under 300 KB). Nothing in the build must break when files are
absent (all `src` default to null; never reference a file that does not exist).

### G7 — Review documents (no UI)

- `docs/review/FOUNDER_CONFIRM_LIST.md`: list the sentences the founder must confirm before the page goes
  live, exactly these: (a) "खेत, बीज, बारिश का इंतज़ार और फसल की चिंता... घर की रोज़ की बातें थीं",
  (b) "शिक्षा और ईमानदारी का महत्व मैंने अपने घर से सीखा", (c) the exact wording of the Guinness record and
  the founder's role in it (from the certificate), (d) whether the Baihar rope was sabai grass (सबई घास)
  or bamboo, (e) the start year and exact names of the Bijawar awards, (f) spelling of Dr. Chhaya/Chaya.
- `docs/review/FOUNDER_VIDEO_SCRIPT.md`: store this 45-second Hindi script for the founder to read:
  "ॐ सीताराम। मैं अभिनन्दन दीक्षित, किसान सहयोग का संस्थापक हूँ। मैं किसान परिवार से हूँ। 42 वर्ष की सेवा में गाँवों और किसानों के बीच काम किया है। किसान की समस्याएँ और अवसर, दोनों समझता हूँ। अब अपना अनुभव आप तक पहुँचाना चाहता हूँ। हमारे दो उद्देश्य हैं: किसान की आय बढ़ाना और रोज़गार के अवसर बनाना। सरकारी और प्रमाणित स्रोतों की जानकारी सरल हिंदी में, समय पर आप तक पहुँचाने के लिए काम करूँगा। मेरा विश्वास है: "अकर्म से कर्म श्रेष्ठ" और "परिश्रम के अतिरिक्त कोई रास्ता नहीं।" इसी विश्वास के साथ: WE WILL DO IT।"

### G8 — Verifier `scripts/verify-batch6g.mjs`

PASS/FAIL checks, exit non-zero on failure, UTF-8 output saved to `docs/review/BATCH6G_VERIFY_OUTPUT.txt`:
1. Route `/founder` registered in `App.jsx`; screen uses `PageShell`; exactly one `<h1>`.
2. Founder copy contains: "42 वर्ष", "ब्राह्मण परिवार", "ॐ सीताराम", "WE WILL DO IT", the two mission strings exactly,
   all family names listed in G1 (including "डॉ. छाया दीक्षित" and "एडवोकेट संतोष दीक्षित"),
   "श्रीमती नीलम दीक्षित", "श्रीमती त्रिवेणी बाई दीक्षित", "पंडित शालिग राम दीक्षित".
3. Founder copy and strings do NOT contain: "40 वर्ष", "चालीस", "40 years", "Shubh Tech", "शुभ टेक",
   "गुरुग्राम", "Gurugram", "मुफ़्त", "free of cost", "free for farmers".
4. Hindi/English parity for every field; no `.jsx` file in the batch contains Devanagari literals.
5. The homepage band links to `/founder`; the footer links to `/founder`; the old role string
   "कृषि विशेषज्ञ, किसान परिवार से" is gone; the name spelling is the same everywhere (grep `ए.के. दीक्षित`
   and `अभिनन्दन दीक्षित`; the only allowed remaining `ए.के.` is in historical docs/comments).
6. `/founder` present in the sitemap generator, prerender list and search index.
7. JSON-LD builder omits `award` when `proof_src` is null (test with the real data and a fake item).
8. No image path in the data file points to a missing file; no `localStorage` in the new files.
9. The carbon-credit screens do not mention the founder's name.

## 4. Definition of done

- `node scripts/verify-batch6g.mjs` passes with 0 failed; other tests unchanged.
- Report written (including honest list of anything not verified because the sandbox cannot build).
- Nothing committed or deployed; the database untouched; no secrets touched.
- Pages the owner should open after the build and preview deploy: `/founder` at 1440 and 390 wide,
  `/` (trust band), `/agro-forestry` (author link), the footer link on any page.
