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
