# Batch 17A vs 17B - what changed on the public /mausam rules

18 fixed inputs x 7 outputs = 126 outputs compared. **36 changed**, 90 unchanged. Changes with no decision: **0**.
Old = release-17a (`weatherRules.js`, `rainAlert.js`, the banner and badge decision of `Mausam.jsx`). New = release-17b. Same inputs in `scripts/batch17b/rain-behaviour.mjs`; raw results in `rain-behaviour-before.json` and `rain-behaviour-after.json`.
Decision numbers are those of `docs/review/batch17b/DECISIONS.md` (R = threshold row, D = builder decision, T = task rule).

Restored in this follow-up because no decision covered them: irrigation with dry or unknown soil (17B had turned the 17A caution into a green "No irrigation needed now", which is untrue for dry soil) and the spray-caution sentence (17B had added two new wordings; 17A's "Possible rain/wind" is back).

| Input | Output | 17A (old) | 17B (new) | Decision |
|---|---|---|---|---|
| dry | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| trace-0.3mm | spray | caution / aw_spray_caution | ok / aw_spray_ok | R8 + R9 (caution needs 2.5 mm in 24 h; a trace or drizzle under that is OK) |
| trace-0.3mm | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| trace-0.3mm | harvest | caution / aw_harvest_caution | ok / aw_harvest_ok | R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain) |
| trace-0.3mm | badge | badge shown: Light rain | no badge | R1 + D2 (a day total under 1 mm is a trace: no badge) |
| trace-spread-2.4mm | spray | caution / aw_spray_caution | ok / aw_spray_ok | R8 + R9 (caution needs 2.5 mm in 24 h; a trace or drizzle under that is OK) |
| trace-spread-2.4mm | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| trace-spread-2.4mm | harvest | caution / aw_harvest_caution | ok / aw_harvest_ok | R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain) |
| trace-spread-2.4mm | banner | No rain in the next 48 hours | Only a light drizzle possible in the next 48 hours (about 2.4 mm) | R2 + D3 (48 hours that only reach drizzle say so instead of "next rain") |
| trace-spread-2.4mm | badge | badge shown: Light rain | badge shown: Today's total: very light rain (2.4 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| drizzle-1.5mm | spray | caution / aw_spray_caution | ok / aw_spray_ok | R8 + R9 (caution needs 2.5 mm in 24 h; a trace or drizzle under that is OK) |
| drizzle-1.5mm | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| drizzle-1.5mm | harvest | caution / aw_harvest_caution | ok / aw_harvest_ok | R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain) |
| drizzle-1.5mm | banner | Next rain: 4 h later ~2 mm | Only a light drizzle possible in the next 48 hours (about 1.5 mm) | R2 + D3 (48 hours that only reach drizzle say so instead of "next rain") |
| drizzle-1.5mm | badge | badge shown: Light rain | badge shown: Today's total: very light rain (1.5 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| light-8mm-in-6h | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| light-8mm-in-6h | badge | badge shown: Light rain | badge shown: Today's total: light rain (8 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| moderate-20mm | badge | badge shown: Moderate rain | badge shown: Today's total: moderate rain (20 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| heavy-70mm | badge | badge shown: Heavy rain (Yellow) | badge shown: Today's total: heavy rain (70 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| wind-8 | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| wind-12 | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| wind-20 | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| soil-adequate | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| soil-high | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| light-8mm-no-hourly | spray | ok / aw_spray_ok | stop / aw_spray_stop_rain | D5 (only a day total known: 8 mm or more stops spraying) |
| light-8mm-no-hourly | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| light-8mm-no-hourly | banner | No rain in the next 48 hours | Next rain ~8 mm | D5 (only a day total known: it is used, 17A said "no rain" because it had no hourly series) |
| light-8mm-no-hourly | badge | badge shown: Light rain | badge shown: Today's total: light rain (8 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| dry-no-hourly | spray | ok / aw_spray_ok | caution / aw_spray_caution | D5 (only a day total known: the day's highest wind, 10 km/h, is read as wind 10-15, rule R8) |
| dry-no-hourly | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| real-30oct | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| real-30oct | harvest | caution / aw_harvest_caution | ok / aw_harvest_ok | R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain) |
| real-30oct | banner | No rain in the next 48 hours | No more rain expected in the next 48 hours | D2 (rain already fell today and none is coming: say so) |
| real-30oct | badge | badge shown: Light rain | badge shown: Today's total: very light rain (1 mm) | D2 (the badge now says it is the day total and uses the same class names) |
| harvest-trace-day3 | irrigation | caution / aw_irrig_caution | ok / aw_irrig_none | D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now") |
| harvest-trace-day3 | harvest | caution / aw_harvest_caution | ok / aw_harvest_ok | R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain) |

Unchanged for every input: sowing, rain strip (Homepage), and all outputs not listed above.
