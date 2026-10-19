# Batch 10F — Hindi wording for founder review (all HUMAN-REVIEW)

All text lives in `src/lib/i18n/strings.js` (hi + en). "सीताराम" greeting rule unchanged (no new greeting).

## Phase 1 — homepage hero
| Key | Hindi | English | Note |
|---|---|---|---|
| `home_hero_demo` | 1 मिनट का डेमो देखें | Watch a 1-minute demo | Same words as the 10D button (key renamed from `home_live_cta_demo`). Not new wording. |

Removed (no longer shown anywhere): the five persona tabs ("किराये पर यंत्र चाहिए" …), their captions, "उदाहरण" in the phone, "रजिस्टर करें" hero button, the field-picture sentence, the crop strip words and the four facts ("… छोटे डेमो — साइट चलाना सीखें" etc.).

## Phase 2 — collapsible sections
| Key | Hindi | English | Where |
|---|---|---|---|
| `section_expand` | खोलें | Expand | Screen-reader text after a collapsed section heading (not visible). |
| `section_collapse` | बंद करें | Collapse | Screen-reader text after an open section heading (not visible). It appears in the prerendered page text (SEO diff: "बंद करें" per section). |

No visible new wording: the arrow is a drawn chevron. The mandi-compare view's new heading reuses the existing tab label "मंडी तुलना".

## Phase 3 — /msp badge, chart, trend integrity (all HUMAN-REVIEW)
| Key | Hindi | English |
|---|---|---|
| `msp_badge_last` | अंतिम भाव: {date} → "अंतिम भाव: 17 अक्टू 2026" | Last price: {date} |
| `msp_badge_today` | आज का भाव · {date} → "आज का भाव · 19 अक्टू" | Today’s price · {date} |
| `msp_chart_help` | किसी बिंदु को छुएँ या चार्ट पर उँगली चलाएँ — उस दिन की तारीख़ और भाव दिखेगा | Touch a dot or slide your finger along the chart — that day’s date and price appear |
| `msp_chart_mandis` / `msp_chart_mandi_one` | {n} मंडी / 1 मंडी | {n} mandis / 1 mandi |
| `msp_chart_few` | कम मंडियों का भाव | Based on few mandis |
| `msp_chart_table` | सारणी देखें | View table |
| `msp_chart_col_mandis` | मंडियाँ | Mandis |
| `msp_chart_aria` (screen readers only) | {crop} चार्ट, {range}: पहला …, आख़िरी …, सबसे ऊँचा …, सबसे नीचा … | {crop} chart, {range}: first …, last …, highest …, lowest … |
| `msp_trend_skipped` | {n} दिन बहुत कम मंडियों के भाव आए — वे दिन चार्ट और हिसाब में नहीं जोड़े गए, ताकि झूठा उतार-चढ़ाव न दिखे। | On {n} days very few mandis reported — those days are left out of the chart and the maths, so no false rise or fall is shown. |
| `msp_calc_price_from` | हिसाब का भाव: {price} ({date}, {n} मंडियों का बीच का भाव) | Price used: {price} ({date}, middle price of {n} mandis) |

Dates: one helper (`src/lib/mandi/mspWindow.js`: `formatDay` "17 अक्टू", `formatDateFull` "17 अक्टू 2026"; months जन फ़र मार्च अप्रै मई जून जुल अग सित अक्टू नव दिस). The "पिछला भाव (17/10)" tags on /msp now read "पिछला भाव (17 अक्टू)" (other pages keep dd/mm). "बीच का भाव" = median — HUMAN-REVIEW wording.
