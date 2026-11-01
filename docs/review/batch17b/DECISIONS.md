# Batch 17B - decisions (thresholds and wording) for the founder to confirm with KVK Sagar

Every number below is a named constant at the top of `src/lib/weather/rainVerdict.js`. Change it there and nowhere else (the site, the card, the message, the voice and the tasks all follow).

## 1. The rain verdict (the defaults that were asked for)
| # | What | Value | Constant |
|---|---|---|---|
| R1 | Dry (a trace is not rain) | under 1 mm in the window | `DRY_BELOW_MM = 1` |
| R2 | Drizzle | 1 to under 2.5 mm | `LIGHT_MIN_MM = 2.5` |
| R3 | Light rain | 2.5 to under 15.6 mm | `MODERATE_MIN_MM = 15.6` |
| R4 | Moderate rain | 15.6 to under 64.5 mm | `HEAVY_MIN_MM = 64.5` |
| R5 | Heavy rain | 64.5 mm or more | (IMD daily-rainfall classes) |
| R6 | A rain chance (%) is shown only when the window brings | 2.5 mm or more | `PROB_SHOWN_MIN_MM = 2.5` |
| R7 | Spraying: STOP | 2 mm or more in the next 6 hours, or wind over 15 km/h in the next 6 hours | `SPRAY_STOP_MM_6H = 2`, `SPRAY_STOP_WIND_KMH = 15` |
| R8 | Spraying: CAUTION | 2.5 mm or more in the next 24 hours, or wind 10 to 15 km/h | `SPRAY_CAUTION_MM_24H = 2.5`, `SPRAY_CAUTION_WIND_KMH = 10` |
| R9 | Spraying: OK | everything else (a trace is OK) | |
| R10 | Harvest / drying: STOP | 5 mm or more in the next 48 hours | `HARVEST_STOP_MM_48H = 5` |
| R11 | Harvest / drying: CAUTION | 2.5 mm or more in the next 72 hours | `HARVEST_CAUTION_MM_72H = 2.5` |

## 2. Things that were not in the brief, decided by the builder (please confirm)
**D1.** **"Rest of today" is the main window.** The level on the card is for the hours still to come today (rain that already fell earlier is not counted). The 48-hour and 72-hour windows are separate. In the morning (05:00) "rest of today" is nearly the whole day.
**D2.** **The day total so far is still shown on /mausam, honestly labelled.** The badge says "Today's total: very light rain (1 mm)" and appears only from 1 mm. The banner then says "No more rain expected in the next 48 hours" when rain fell earlier today and none is coming.
**D3.** **Hour counts as rainy** when it has 0.5 mm or more (`HOUR_RAIN_MM`), used only for "rain in N hours". The banner shows a "next rain" time only when the whole 48 hours reach drizzle or more.
**D4.** **72-hour window** is built from the hourly series (48 hours) plus the day totals of the remaining hours, at that day's average hourly rate (never counting hours already covered).
**D5.** **Only day totals known** (no hourly series, or the direct Open-Meteo fallback): "rest of today" = the day total. Spraying is then STOP only when the day total is 8 mm or more (`DAILY_ONLY_SPRAY_STOP_MM`, because an 8 mm day almost surely has a 6-hour spell of 2 mm), CAUTION from 2.5 mm; wind uses the day's highest wind.
**D6.** **Irrigation.** STOP at 10 mm or more in 48 h (as before). Green "No irrigation needed now / सिंचाई की ज़रूरत नहीं" when the soil is adequate or wet and it is not hot-dry. Hot-dry (evaporation 5 mm/day or more, under 2 mm rain in 48 h, soil dry or unknown) stays green; dry soil with 2 mm or more of rain coming is also CAUTION (wait for it) "irrigation is fine". CAUTION when the soil is dry **or not known** and it is not hot-dry (same as 17A; the 17A sentence under it still says "adequate", which is not true for dry soil - an old wording problem, not changed here). Soil limits (0.20) and evaporation (5) are unchanged.
**D7.** **Sowing** keeps its rules; its numbers (40 mm today = wait, 10 to 30 mm over 5 days = fine) are now named constants in `rainVerdict.js`.
**D8.** **The Homepage rain strip** (`rainAlert.js`) now starts at 2.5 mm a day (was "over 3 mm"), and its classes use the IMD edges 15.6 / 64.5 / 115.5 / 204.5 (were 15 / 64.5 / 115.5 / 204.5).
**D9.** **7-day table and hourly strip on /mausam.** A chance (%) is shown only next to light rain or more (the same 2.5 mm rule, per day or per hour).
**D10.** **Stale saved forecast.** The morning post uses the saved Sagar forecast only if it was fetched within 8 hours (`CACHE_MAX_AGE_H`); otherwise it asks Open-Meteo directly (day numbers only) and says so in `report.txt` (`weather source: open-meteo-direct (cache stale/missing)`). If both fail, the weather is left out, as before.

## 3. The tasks ("आज का काम")
- **T1.** "दवा-खाद का छिड़काव बारिश रुकने के बाद करें" appears only when the spraying window says STOP **because of rain** (the same window as /mausam). Wording changed in the follow-up: it no longer says "on the next day" (wrong when tomorrow is rainy too); it says to spray after the rain stops. The same change was made to the two older rain-strip sentences that said "postpone spraying" (`advice_moderate`, `tf_advice_heavy`).
- **T2.** "कटी फसल और अनाज ढककर रखें" appears only when the harvest window says STOP (5 mm in 48 h).
- **T3.** "खेत से पानी निकलने की नाली साफ़ रखें" appears when the 48-hour level is moderate or heavy.
- **T4.** "तेज़ हवा में छिड़काव न करें" appears at wind 25 km/h or more (as before) **and** whenever /mausam says spraying is STOP because of wind (over 15 km/h), so the card never stays silent when /mausam says stop.
- **T5.** "सिंचाई वाले खेत में नमी जाँचें" (hot and dry) now needs "tmax 35 or more and the 48-hour level dry or drizzle" (was: chance under 20%).
- **T6.** The spraying sentence appears **once** on the card: in the work/advice box if it is there, otherwise in the weather box.

## 4. Wording (all Hindi is in `scripts/morning/strings.hi.js` for the post and `src/lib/i18n/strings.js` for the site)
- dry: "<sky>, आज बारिश नहीं" - no percentage. A rain-coded sky (for example code 80) is shown as plain "बादल" when the verdict is dry.
- drizzle: "हल्की बूँदाबाँदी संभव (करीब N मिमी)" - no percentage, no spraying warning.
- light / moderate / heavy: "हल्की / मध्यम बारिश संभव, संभावना P% (करीब N मिमी)" and "भारी बारिश की चेतावनी, संभावना P% (करीब N मिमी)".
- The message line for "कल / परसों" uses the same levels without a percentage ("बारिश नहीं", "हल्की बूँदाबाँदी", "हल्की बारिश (करीब N मिमी)").
- "भाव का रुझान" no longer quotes a bare chance; it says "अगले दो दिन बारिश हो सकती है (करीब N मिमी तक)" only when light rain or more is expected on one of the next two days.
- Voice opening, natural: "सागर में आज आसमान साफ़ रहेगा / में कुछ बादल रहेंगे / में बादल छाए रहेंगे / सुबह कोहरा रहेगा", then "और आज बारिश नहीं होगी". Rain: "सागर में आज हल्की बारिश हो सकती है, संभावना ... प्रतिशत की है, करीब ... मिलीमीटर". Amounts are spoken as whole millimetres (at least 1).
- Repeated-word guard (test): the same word may not appear twice in a row, nor twice in one short sentence or line. Small function words ("है", "की", "आज" ...), number words and unit words ("सौ", "रुपये", "मिलीमीटर" ...) are exempt, and a line is cut into separate sentences at "।", "!", "?" and at the middle dot "·" that separates "कल: ... · परसों: ...".

## 5. Not done on purpose
No IMD or other weather provider (the verdict keeps a `source` field: `cache`, `open-meteo-direct`, later `imd`). No migration, no change to the refresh jobs, mandi, the voice mechanism or model, or the WhatsApp flow.

See `docs/review/batch17b/evidence/rain-behaviour-changes.md` for every /mausam output that changed between 17A and 17B, each one tied to a decision number above (R = threshold row, D = builder decision, T = task rule).
