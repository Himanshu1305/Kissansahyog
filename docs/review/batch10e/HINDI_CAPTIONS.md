# Batch 10E — HINDI_CAPTIONS

**HUMAN-REVIEW: every row below is new or changed Hindi.** Greeting rule: "सीताराम" (never "सीताराम जी").

| key | hi | en | where |
|---|---|---|---|
| `guide_well_done` (changed in Phase 1B; was "शाबाश! अब असली ऐप पर आज़माइए या अगला डेमो देखिए।" / "Well done! Try the real app, or watch the next demo.") | सीताराम 🙏 अब असली ऐप पर आज़माइए या अगला डेमो देखिए। | Sitaram 🙏 Try the real app, or watch the next demo. | Guide demo finish card (`data-testid="demo-finish"`): `src/features/guide/DemoPlayer.jsx:370` (register / post / find demos) and `src/features/guide/TourExplorer.jsx:194` (tour) |
| `msp_trend_up` (changed in Phase 2D; was "{d} दिन में {n} चढ़ा" / "Up {n} in {d} days") | {d} दिन में ({range}) भाव {n} बढ़ा | Up {n} in {d} days ({range}) | /msp trend sentence above and below the chart, and the WhatsApp share text (`src/screens/Msp.jsx` trendSentence) |
| `msp_trend_down` (changed in Phase 2D; was "{d} दिन में {n} गिरा" / "Down {n} in {d} days") | {d} दिन में ({range}) भाव {n} गिरा | Down {n} in {d} days ({range}) | same as above |
| `msp_only_ndays` (changed in Phase 2D; was "इस अवधि में केवल {n} दिन का डेटा उपलब्ध" / "Only {n} days of data available in this window") | इस अवधि में {n} दिन का भाव उपलब्ध | Prices available for {n} days in this period | /msp trend, under the chart when a window has fewer priced days than calendar days |
| `msp_tab_days` (new, Phase 2D) | {d} दिन | {d} days | /msp trend tab, first line |
| `msp_tab_nodata` (new, Phase 2D) | भाव नहीं | no prices | /msp trend tab, second line when the window has no price |
| `msp_data_since` (new, Phase 2D) | {date} से पहले का भाव उपलब्ध नहीं | No prices before {date} | /msp trend, when the first price is more than a week after the window start (e.g. 30 and 90 days hold the same data) |
| `msp_trend_scope_all` (new, Phase 2D) | सागर संभाग का भाव नहीं मिला — मध्य प्रदेश की दूसरी मंडियों का भाव दिखाया है | No Sagar Division prices — showing other Madhya Pradesh mandis | /msp trend, only when the window has no Sagar Division row and the read falls back to all stored MP rows |
| `MONTHS_HI` (label data, `src/content/months.js`; changed in Phase 2D: 'फर' → 'फ़र', 'अप्रैल' → 'अप्रै') | जन, फ़र, मार्च, अप्रै, मई, जून, जुल, अग, सित, अक्टू, नव, दिस | Jan … Dec (`MONTHS_SHORT_EN`) | /msp trend tab ranges ("11–17 अक्टू", "18 सित – 17 अक्टू"), x-axis end dates; also the month bars (shown only with ≥ 12 months of data) |
| `login_no_email` (new, Phase 3A) | ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें | No email? Log in with your mobile number | /login, one line directly under the page title (`data-testid="login-no-email"`, shown as "📱 …"; a tap moves to the mobile box), `src/screens/Login.jsx` |
| `guide_reg_3` (no longer shown, Phase 3A) | ईमेल और पासवर्ड भरिए। पासवर्ड कम से कम 8 अक्षर का हो। | Fill in email and password. … | removed from the register demo steps (the form has no e-mail/password); string kept in strings.js, unused |
| `extra_info_label` (new, Phase 3B) | अतिरिक्त जानकारी (वैकल्पिक) | Additional information (optional) | post form step 2, every category, label of the multi-line box |
| `extra_info_ph` (new, Phase 3B) | कोई और बात जो खरीदार या किसान को जाननी चाहिए | Anything else the buyer or farmer should know | placeholder of that box |
| `extra_info_help` (new, Phase 3B) | फ़ोन नंबर यहाँ न लिखें | Do not write a phone number here | helper line under the box ("📵 ...", with the live counter "28/300") |
| `err_extra_info_phone` (new, Phase 3B) | कृपया फ़ोन नंबर यहाँ न लिखें। खरीदार लॉगिन करके आपका नंबर देख सकेंगे। | Please do not write a phone number here. Buyers can see your number after they log in. | error when the box holds a phone-like number |
| `err_extra_info_long` (new, Phase 3B) | अतिरिक्त जानकारी 300 अक्षरों से ज़्यादा नहीं हो सकती। | Additional information can be at most 300 characters. | safety net (the box itself stops at 300) |
| `extra_info_title` (new, Phase 3B) | अतिरिक्त जानकारी | Additional information | listing detail, heading of the owner's text |
| `field_available_from` (existing, now also Phase 3C) | कब से उपलब्ध | Available from | date block, offer start (mandatory, "*") |
| `date_from_req` (new, Phase 3C) | कब चाहिए | When needed | date block, requirement start (mandatory) |
| `date_to_optional` (new, Phase 3C) | कब तक (वैकल्पिक) | Until when (optional) | date block, end date (offer and requirement) |
| `date_open_ended` (new, Phase 3C) | जब तक चाहें | No end date | date block, offer: chip for "no end date" |
| `date_today` / `date_tomorrow` / `date_day_after` (new, Phase 3C) | आज / कल / परसों | Today / Tomorrow / Day after | quick buttons that set the start date |
| `date_pick` (new, Phase 3C) | तारीख़ चुनें | Pick a date | quick button that opens the phone's date picker ("📅 ...") |
| `err_date_required` (new, Phase 3C) | कृपया तारीख़ चुनें | Please choose a date | start date missing |
| `err_date_past` (new, Phase 3C) | तारीख़ आज से पहले की नहीं हो सकती | The date cannot be before today | start date before today (IST) |
| `err_date_end_before_start` (new, Phase 3C) | अंतिम तारीख़ शुरू की तारीख़ से पहले नहीं हो सकती | The end date cannot be before the start date | end before start |
| `dates_label_offer` / `dates_label_req` (new, Phase 3C) | उपलब्ध / चाहिए | Available / Needed | listing card line + detail row label ("उपलब्ध: 20 अक्टू से") |
| `dates_from_only` / `dates_to_only` / `dates_range` (new, Phase 3C) | {d} से / {d} तक / {a} से {b} तक | from {d} / until {d} / {a} to {b} | date words on cards and detail (short months from `MONTHS_HI`) |
