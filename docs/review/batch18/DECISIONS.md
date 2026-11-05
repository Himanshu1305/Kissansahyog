# Batch 18 - decisions (six-district weather in the daily morning post)

Status by priority: **P1 DONE** (data + message + kill switch + tests + documents), **P2 DONE** (card strip), **P3 DONE** (one voice sentence). Suite green after each priority's last commit.

## Facts re-checked against the real code (all matched the prompt)
- `SAGAR_GRID_KEY = '23.8_78.7'`, `CACHE_MAX_AGE_H = 8`, `weatherFromCacheRow` freshness rules: as described.
- PILOT had 8 points, all around Sagar district, in `supabase/functions/_shared/weather-core.js` and `scripts/refresh-data.mjs`.
- District cell keys re-derived with the real `cellCentre()`: Sagar 23.8_78.7, Damoh 23.8_79.4, Panna 24.7_80.2, Tikamgarh 24.7_78.8, Chhatarpur 24.9_79.6, Niwari 25.4_78.8. **Identical to the prompt.**
- Base: `origin/main` contains `c823ae9` and `92cce75`; `release-18` was already created from it.

## Why PILOT (guaranteed refresh) and not visitor-driven cells
Visitor-driven cells are refreshed only if someone asked for them in the last 30 days. Nobody has to open the site for the post, so the five far districts could be days old. PILOT cells are refreshed on every run of the Edge Function (every 2 hours). Cost: 5 more cells per run (13 pilot cells; `limit` 60 still leaves 47 for visitor cells). Sagar HQ falls in the existing 23.8_78.7 pilot cell, so only **5 points were added** (13 points, 13 distinct cells; a test checks both lists are identical and that no two points share a cell).
No database migration: `weather_cache_v2` is keyed by `grid_key` and already stores any cell the function writes (that is how visitor cells get in; `buildCellList` and the 16H tests show pilot cells need no row in `weather_grid_requests`). **Unverified:** what the production table holds for the five new cells before the first refresh.

## Old tests I changed (and why)
`tests/unit/weather-core-16h.test.mjs` only: the hard-coded pilot count 8 became 13 (PILOT length, `buildCellList([])`, `orderCells` with a tiny limit, `buildSummary` cells_written); in test "(c)" the limit 12 became 17 so it still leaves exactly 4 non-pilot cells (13 + 4); in "buildCellList dedupes" the expected length 9 became 14. No other old test changed.

## One cache request, then Open-Meteo
`loadDistrictsWeather` (scripts/morning/lib/weather.js): ONE request `weather_cache_v2?grid_key=in.(six keys)`; each district uses the same freshness rule as `weatherFromCacheRow` (today's date first, 3 days, not older than 8 h). Every district without a usable cell is fetched directly from Open-Meteo in ONE call with comma-separated coordinates. **Verified** in Open-Meteo's documentation (open-meteo.com/en/docs, read 5 Nov 2026): "Multiple coordinates can be comma separated" and "the JSON output changes to a list of structures" (one per location, same order). If that call fails, is not a list of the right length, or any entry does not parse: ONE call per district, 700 ms pause between them, 10 s timeout and one retry each (same as `getForecast`). Still failing = `unavailable`. Never throws. **Not verified against the live service** (no real network calls were made; the stub tests prove our handling, not Open-Meteo's real reply).
Direct data has daily numbers only, so the verdict uses the existing daily-only path (`toDailyShape`), like fixture F6.

## Same verdict as the Sagar sentence
`buildDistrictSummaries` (lib/districtWeather.js) calls `rainVerdict` (src/lib/weather/rainVerdict.js, untouched). "Today" is `windows.today.level`, the same field the Sagar sentence uses. `next2` is the higher of day+1 and day+2. **The Sagar row reuses the exact weather and verdict of the Sagar sentence** (no second number); the Sagar entry of the district loader is only a fallback when the main Sagar weather is missing.

## Message section
Heading `🗺️ *सागर संभाग के ज़िलों का मौसम*`, six lines in fixed order, closing line `📲 अपने गाँव का मौसम: kissansahyog.com/mausam`. 8 added lines + 1 blank separator (its own block, directly after the Sagar weather block). Each line: symbol, name, `min–max°`, a rain word, and ` · कल-परसों बारिश` when light rain or more is expected tomorrow or the day after. An unavailable district reads `जानकारी अभी उपलब्ध नहीं` and is never dropped. Every line is 48 characters or shorter (tested). The prompt's example closing line was 50 characters, so I dropped the word `देखें` to fit one line.
**Deviation:** when all five other districts are unavailable the section is still shown (Sagar plus five honest "not available" lines), because the prompt says an unavailable district is never dropped silently.
Size: +259 to +278 characters (F1-F6 now 1093-1295, under the 1500 hard limit). If a real day ever goes over 1500, the new section is dropped FIRST (before the slot etc.), so the post is then exactly what it was before this batch.
Regression: `evidence/baseline-F1..F6.txt` were produced from the untouched `origin/main` code before any change (they also equal the 17D `message-after-*` files apart from CRLF line endings). `evidence/message-compare.txt`: for every F1-F6, new message minus the section = baseline byte for byte; `MORNING_DISTRICTS=off` = baseline; no district loader = baseline.

## Kill switch and guard
`MORNING_DISTRICTS` exactly `off` (any case, surrounding spaces ignored) skips the whole feature before any network call. Anything else (empty, missing, "on", "false") = on. Workflow: one added line `MORNING_DISTRICTS: ${{ vars.MORNING_DISTRICTS }}` in the "Make and save the morning post" env; cron times untouched (tested). Guard: the whole district step is wrapped in try/catch and a 25 s time limit; any error or timeout means no district parts, the post as before, one report line `districts: LEFT OUT - <reason>`, job green (tested: throw, sync throw, hang, garbage rows). The job report has one line per district: source and saved-forecast age, or `unavailable - reason`.

## What I decided that the prompt did not say
- `scripts/morning/lib/districts.js` holds the six districts (id, key, coordinates); Hindi names are in `strings.hi.js`.
- `run.mjs --districts <scenario>` (offline scenarios built from the F1-F6 fixtures) for rehearsal; `fixtures.js` gained `districtScenario`.
- The "rain soon" marker uses light rain or more (drizzle does not count), the same split as `isRain` in rainVerdict.js.
- Drop order: district section first (above).

## Unverified
Production cache content for the 5 new cells before the first refresh; Open-Meteo's terms for this use (open item since 16A/17B, not decided here); the live batched Open-Meteo call; how WhatsApp shows a bare URL in the middle of a message (the existing closing line already uses the same style).

## P2 - Card strip: DONE
A section "सागर संभाग के ज़िले" right after the weather box: 3 x 2 grid of cells (name + min-max, rain word, and a small "कल-परसों बारिश" line when light rain or more is expected tomorrow or the day after), cell colour by rain level (green dry, light blue light, darker blue moderate, red heavy, grey = no information), and the hint line `अपने गाँव का मौसम: kissansahyog.com/mausam`. **The strip uses plain text and CSS colours only (no emoji or symbol glyphs)** so there can be no tofu boxes on a machine without emoji fonts; a test checks that no emoji is in the strip data. The card's existing fit() routine shrinks the boxes a little (down to 70 percent at most) so everything stays clear of the footer; every old element is still there and readable (screenshots). The card is still 1080 x 1350; size 152-170 KB (limit 500 KB, tested). Old elements unchanged in content; with `MORNING_DISTRICTS=off` the card has no strip and renders as before (`card-none-off.png`).
Evidence: `evidence/card-all-dry.png`, `card-mixed-heavy.png`, `card-rain-two.png`, `card-one-unavailable.png`, `card-all-unavailable.png`, `card-none-off.png`, `card-report.txt` (made by `evidence/make-cards.mjs`). Tests: `tests/unit/morning-18-card.test.mjs`.

## P3 - Voice sentence: DONE
`districtSentence()` in `voice/voiceScript.mjs`, words from `strings.hi.js` (`voiceDistrict*`). Rule: names only the districts with **light rain or more today or tomorrow** (drizzle does not count), up to three names, then `और अन्य ज़िलों` ("आज या कल सागर, दमोह, पन्ना और अन्य ज़िलों में बारिश हो सकती है।"); if none, "सागर संभाग के किसी भी ज़िले में आज बारिश नहीं होगी।" **only when all six districts are available**; unavailable districts are never mentioned (a district with no data cannot be named, and if some are unavailable and no available one has rain there is no sentence). It goes right after the weather sentences, before the mandi prices. Numbers: the sentence contains none.
**Cap:** the sentence is tried LAST on the finished old script and kept only if the script stays within +12 percent AND at most 765 characters (my extra safety rule: about 45 s at a conservative 17 characters per second); otherwise it is left out and the script is exactly the old one. Without the sentence the script equals the old script (tested for F1-F6 x four district scenarios and for the kill switch).
**Before/after characters** (`evidence/voice-counts.txt`): F1-F6 old 533-605 characters, new 580-658 (+36 to +53 characters, +6.0 to +9.8 percent). **Seconds: ESTIMATED, not measured.** ffmpeg, ffprobe and ElevenLabs are not available in this environment and `voice/e2e-fake.mjs` uses a fake 48 KB audio file, so it cannot give a real length. Estimate: the 17E real voice was 34.7 s; at 17 characters per second the new scripts are 34.1-38.7 s (old 31.4-35.6 s), under 45 s. The founder will see the real length in the 17E video line ("video saved (... s)") in the rehearsal run. The e2e-fake rehearsal itself ran with the new sentence (`e2e-fake.mjs <dir> rain-f3 rain-two`): 1 ElevenLabs call, second run makes none, no secret in any file, only Devanagari and the marks `। , ! ?`.
**The mausam invitation is not spoken** because a web address read aloud ("किसान सहयोग डॉट कॉम स्लैश मौसम") is hard to follow and impossible to tap, it would add 4-5 seconds to a voice that must stay short, and the message and card already carry the link as text. (A test checks it is absent from the script.)
