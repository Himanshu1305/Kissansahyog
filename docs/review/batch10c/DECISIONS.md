# Batch 10C — decisions

Rule: when unsure, the SAFEST option was picked. "Preview" = `design/guide-demo-preview.html`.
"Real app" = the screens on branch `release-10c`. Where they differ, the real app wins.

## A. Preview vs the real app (what each demo now shows)

### Register (`src/screens/Signup.jsx`)
1. **OTP.** Preview: Send OTP → 6-digit code → "number verified". Real app: signup has no OTP today. Demo: OTP steps exist only when `GUIDE_OTP_LIVE` (in `src/features/guide/config.js`) is `true`; it is `false`, so the demo shows today's flow. OTP steps and nodes carry `otp: true` / `data-otp="1"`. `buildRegisterDemo({ otpLive })` builds either version.
2. **Email + password.** Preview: "optional (चाहें तो)". Real app: both are REQUIRED (Batch 10A, `EmailPasswordFields required=true`, password at least 8 characters, Show button). Demo: both shown as required (red *), password hint "कम से कम 8 अक्षर", Show button; caption says to fill them.
3. **Labels and placeholders.** Preview: "आपका नाम / जैसे रामप्रसाद पटेल", "गाँव / अपने गाँव का नाम". Real app: `full_name` "पूरा नाम", `full_name_ph` "जैसे: रामप्रसाद पटेल", `phone_number`, `phone_ph`, `email_label`, `email_ph`, `password_label`, `village_town` "गाँव / कस्बा", `village_ph` "जैसे: खुरई, बंडा, रहली". Demo uses those keys.
4. **Village.** Preview: free-text box. Real app: `PlaceField` — type, then pick from a suggestion list (with a "खोजें" button), then a green chosen box with "बदलें". Demo: type → pick from list → chosen box.
5. **Visibility box.** Preview: unticked box "मेरी जानकारी दूसरों को दिखे", demo ticks it. Real app: heading `vis_title`, box `vis_show` "मेरी जानकारी दिखाएँ (सुझाया गया)" that starts TICKED, plus the `vis_explain` text. Demo: box shown already ticked; the step only points at it ("keep it ticked").
6. **Notice.** Preview: placeholder text "यहाँ ऐप का नोटिस दिखता है". Real app: heading `disclaimer_title` "ज़रूरी सूचना" and the signup banner from `disclaimers.js` (Hindi + English together). Demo shows the real banner text, unchanged.
7. **Accept box and button.** Preview: "मैंने नोटिस पढ़ लिया है", button "रजिस्टर करें". Real app: `disclaimer_accept_label`, button `accept_and_continue` "स्वीकार करें और आगे बढ़ें". Demo uses those; the caption says "press the green button" so it reads right in both languages.
8. **After Register.** Preview: "स्वागत है, रामप्रसाद जी!" screen. Real app: goes straight to the home page (`/home`). Demo: a short "account is ready, you now land on your home page" screen (guide text, not a fake app screen).
9. **Free registration pill.** Not in the preview; the real form shows "✓ निःशुल्क रजिस्ट्रेशन" at the top. Demo shows it.

### Post (`src/screens/Post.jsx`, `components/categories/equipment.jsx`)
10. **Step 1 order and words.** Preview: "यह पोस्ट कौन कर रहा है?" (no default), then machine-type chips. Real app: `post_who_posting` "कौन डाल रहा है?" with किसान ALREADY picked; then `post_step_what` category tiles (मशीन first); then `post_q_type` देना / बेचना है · चाहिए; then `continue` "आगे बढ़ें". Demo follows the real order; step 1 only points at the who-block.
11. **Machine type.** Preview: type chips on step 1 (ट्रैक्टर, क्रेन ट्रैक्टर, ड्रोन, जेसीबी). Real app: a dropdown `field_equipment_type` on step 2. Demo: dropdown on step 2, value "ट्रैक्टर".
12. **Tags.** Preview: "श्रेणी (अपने आप चुनी गई)" with "सब्ज़ी खेती के यंत्र" auto-picked, and a "rare" step for crane tractors. Real app: optional `field_equipment_tags` chips (EQUIPMENT_TAGS); only Crane / Pit-digging tractor, JCB, Drone and Water tanker pre-tick "rare"; a plain Tractor pre-ticks NOTHING. Demo (Tractor) shows both chips unticked and has no "auto category" step.
13. **Spec fields.** Preview: ब्रांड (typed "महिंद्रा"), मॉडल, साल, "हॉर्सपावर (HP)". Real app: section `spec_section_title`, brand is a DROPDOWN "ब्रांड / कंपनी", मॉडल (placeholder "जैसे 575 DI"), "निर्माण वर्ष" ("जैसे 2023"), "ट्रैक्टर की अश्वशक्ति (HP)" ("जैसे 45"), in two-column rows. Demo reads these labels and placeholders from `catalog.js` (`equipmentSpecFields('Tractor')`, `specPlaceholder`), so they cannot drift.
14. **Rent.** Preview: chips प्रति घंटा / प्रति दिन, field "किराया (₹)" "जैसे 600". Real app: dropdown `field_rental_basis` (प्रति घंटा / प्रति एकड़ / प्रति दिन) and `field_equipment_rate` "किराया राशि" with placeholder "जैसे: ₹800"; plus `field_availability` (अभी उपलब्ध / तय तारीख़ों में). Demo matches the real app (value प्रति घंटा, ₹600).
15. **Step 3.** Preview: "गाँव (प्रोफ़ाइल से)" + one box "खरीदार मेरा नंबर देख सकें" + "पोस्ट करें". Real app: `post_step_location`, `field_asset_village` prefilled from the profile (editable) with `asset_village_hint`, "मेरी वर्तमान लोकेशन लें", Maps link (optional), `post_phone_check` with the number, then for a farmer's equipment OFFER: the provider declaration `post_declare_provider` AND the contact-consent box (`contact_consent_text` + "मैं सहमत हूँ"), then the four-item consent checklist (`consent_title`, `disclaimers.listingConsents`), button `submit` "जमा करें". Demo shows all of these except the optional Maps link and the photo picker (left out to keep the demo about a minute; nothing false is shown). The consent items show in the chosen language only (the real form shows Hindi + English together) — HUMAN-REVIEW if you want both.
16. **Success.** Preview: "पोस्ट हो गई!". Real app: `post_success` "आपकी लिस्टिंग जुड़ गई!". Demo uses the real text.
17. **Login.** Preview did not mention it. Real app: `/post` is login-only. Card sub-line says "लॉग इन के बाद, 3 आसान चरण" and the "try in the real app" link goes to `/login?next=%2Fpost` (a logged-in visitor goes straight to /post).

### Find a number (`Browse.jsx`, `ListingCard.jsx`, `ListingDetail.jsx`, `ContactActions.jsx`)
18. **Categories.** Preview: chips "सब / यंत्र / उपकरण / बीज-खाद / निर्माण सामग्री", user picks "यंत्र / उपकरण". Real app: no "all" category; `CATEGORY_META` chips with मशीन first and PRE-SELECTED. Demo: real chips, step only points at them.
19. **Tag chips.** Same names as the real app (`EQUIPMENT_TAGS`), with "सभी" (`filter_all`) first; large chips with ✓ when chosen, as on Browse.
20. **Location.** Not in the preview. Browse needs a place to show results; demo shows a small "📍 खुरई, सागर · बदलें" line.
21. **Cards.** Real cards also carry Call / WhatsApp buttons and the offer pill; the demo shows them. Every card is marked "नमूना".
22. **Getting the number.** Preview: a "संपर्क देखें" button that reveals the number on the page. Real app: no such button. The detail page has `contact_call` "कॉल करें" and WhatsApp; a logged-out visitor is sent to login and back; a logged-in one gets a bottom sheet with the `phoneReveal` caution (Hindi + English), "name · number", Call / WhatsApp, "रद्द करें". Demo shows exactly this; the caption says login comes first if needed.
23. **Hidden numbers.** Preview: "the number shows when the poster allowed it". Real app (`get_listing_contact`, migration 0062): refused only when the owner chose "hidden" AND the listing has no contact consent. Demo's last caption: "If someone hid their details, their number does not show."
24. **Caution text.** Preview: made-up "सावधानी: पैसे देने से पहले…". Demo uses the real `disclaimers.phoneReveal` text.

### Tour
25. **Mandi link.** Preview: `/msp`. Real app: mandi prices + MSP live at `/msp` — kept. Weather `/mausam`, schemes `/yojana`, questions `/sawaal`, buy-and-sell `/browse` (all public routes in `App.jsx`).
26. **Weather day picker.** The real `/mausam` page shows the 7-day forecast as a table (no day picker). The tour's tappable days are a sample picture of that 7-day forecast; the caption says "7-day weather for your place", it does not claim the real page has day buttons. Weekday names reuse `wday_*`, conditions reuse `wcode_*`.
27. **Questions accordion.** Sample questions with one shared answer "यह नमूना है। असली जवाब किसान सवाल पेज पर हैं।" — real answers are not copied into the guide.
28. **Schemes.** PM-Kisan (₹6,000 a year in three parts), crop insurance, Kisan Credit Card — general facts, marked sample, with "see who can apply and dates on the real page".
29. **Mandi prices** are marked sample; crop names reuse `crop_gehun / crop_soyabean / crop_chana`.

### Hub and player
30. **Language button.** Preview had its own HI/EN button. Dropped: the guide follows the app's language (`useLang()`).
31. **Top progress dots** of the preview are dropped (the hub has the ring; the app NavBar stays).
32. **Greeting** ("सुप्रभात / नमस्कार") dropped — fewer strings on the eagerly loaded strings chunk.
33. **Fonts.** Preview used Yatra One / Mukta from Google Fonts. The guide uses the app's own Noto Sans Devanagari (no external font, no new download).
34. **Card icons** in the preview animated `stroke-dashoffset` forever; they are static now (rule F.11: loops may animate only transform / opacity). The progress ring does not animate either.
35. **Brand spelling in English**: "Kissan Sahyog" (the app's `app_name`), so the badge reads "Kissan Sahyog Mitra".
36. **"Try on the real site ↗"** opened kissansahyog.com in a new tab. Now an in-app link (same tab) to the real route.

## B. Other decisions
37. **Embedded mode** (`<DemoPlayer embedded />`, for the GuideSheet): finish card shows "फिर देखें" and, when `onClose` is passed, a Close button; it hides "next demo" and the real-app link (the person is already on the real page). The layout always stacks in one column and the phone height is `min(540px, 64vh)`.
38. **Auto-start.** The player starts in Watch mode 450 ms after opening. Any tap on a step / Play / mode button cancels that pending start (bug found in the smoke test and fixed).
39. **Try-it mode** has no Play button (as in the preview). The target gets `data-testid="demo-target"`, `tabIndex=0`, `role=button`; Enter / Space work. Focus moves to the target only if focus was already inside the phone (keyboard users), so mouse/touch users are not scrolled around.
40. **Reduced motion**: no finger, no confetti, no typing animation (text appears at once), instant scrolling, hero static, tour does NOT auto-rotate (safest reading of "no looping motion"). Steps still advance.
41. **Data saver** (`navigator.connection.saveData`): hero static, no tour auto-rotation; demos unchanged.
42. **Progress** key `ks_guide_done_v1`, badge name key `ks_guide_name_v1` (localStorage, try/catch, in-memory copy when storage throws). The badge name is NOT put in the WhatsApp text (it never leaves the phone). Share text carries `https://kissansahyog.com/guide`.
43. **Tour finishes** when all five tabs have been shown (by auto-rotation or taps).
44. **SEO head** (title, description, canonical, sitemap, prerender, service worker) is left to Task B; the strings `guide_*_seo_title / _desc / _h1` are ready. The pages render their h1 from `guide_hub_h1` and `guide_<id>_h1`.
45. **No network, no supabase**: guide code imports only `LanguageProvider`, `PageShell`, `NotFound`, `catalog.js` and `disclaimers.js` (labels). It does not import AuthProvider (which pulls in supabase); this is why the post demo's real link goes through `/login?next=/post` instead of checking login state.
46. **Strings size**: 136 new `guide_` keys add about 20.5 KB raw / 5.0 KB gzip to the eagerly loaded `LanguageProvider` chunk (all new text must live in `strings.js`, rule 4). HUMAN-REVIEW if that is too much; the demo captions could move to a lazily loaded file only if rule 4 is relaxed.
47. **Sample data**: name "राम कुमार", number 98765 43210, e-mail ram@example.com, village खुरई (a real town, used only as a place name), prices ₹600 / ₹1,200. Inside the phone, sample name / number / cards carry a yellow "नमूना" tag and every page says "names, numbers and prices inside the phone are only samples".

## Added by the orchestrator

- **H1 — Browse `etag` uses `cat=`, not `category=`.** The brief says `etag` with `category=equipment`; the real Browse/Bazaar parameter is `cat` (`/browse?cat=equipment&etag=rare_emergency`). The real app wins.
- **H2 — tag filter only applies on the equipment category.** Category chips never wrote to the URL, so a leftover `etag` could stay in the address after switching category; to avoid it hiding every Land/Labour card, the tag filter is ignored unless the category is equipment. Switching category does not delete `etag` from the URL (category chips are untouched, per "do not change anything else").
- **D1 — Guide link visible in the top bar (founder change, mid-run).** Founder asked that "गाइड" be a highlighted pill with a play icon directly in the top bar at 360 px and desktop, not inside the menu.
