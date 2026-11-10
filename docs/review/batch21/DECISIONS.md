# Batch 21 - decisions (weekly menu and crop-stage task line)

Everything here is a choice the prompt did not dictate, or a place where I had to reconcile two lines of it. Plain words first, then the detail.

## Start
- Working folder `~/projects/ks-b20`; `origin/main` contains the Batch 20 merge (`b41e568`), Batch 19 (`66f1bac`) and Batch 18 (`b492eff`). Branched `release-21` from `origin/main`, `npm ci`.
- The folder was **not clean**: `public/search-index.json` was already modified, and Batch 20 browser screenshots were untracked. I did not touch, stage or commit any of it (nor the prompt file).

## The founder's later addition: irrigation lines and rain
- **Which lines.** The four calendar entries that say "it is time to irrigate" carry `irrigation_stage`: `irr1` = w07 and w08 (first irrigation, timely and late sowing), `irr2` = w09, `irr3` = w10. The plan lines w02 ("first irrigation 20-25 days after") and w04 ("three irrigations: ...") say what comes later, not "do it now", so rain does not hide them.
- **Rule.** When the 48-hour rain level of the same rain verdict the weather lines use (`windows.h48.level`) is `light`, `moderate` or `heavy`, no irrigation-stage line is shown; one **static line** (`rain_hold` in `crop-calendar.json`) takes its place. `dry` and `drizzle` do not hide it (drizzle is below "light" in `rainVerdict.js`). The threshold is one constant (`RAIN_HIDES_IRRIGATION_FROM`, `workRules.js`).
- **One slot.** Two irrigation lines on one day (w08 and w09 overlap 30 Dec-19 Jan) become one static line, never two. Other entries that day keep rotating with it.
- **Static line wording.** The prompt gave no text, so I wrote the plainest line I could: "बारिश आने वाली है: सिंचाई का फ़ैसला खेत की नमी देखकर करें". It is **not a sourced fact** (it is the same "check moisture" idea the old hot-dry rule already uses). It is seeded **not reviewed** like everything else and listed for KVK Sagar. If it is not reviewed the irrigation line is still hidden and nothing replaces it (the old sowing rule or nothing shows). Safe side: a missing line beats a wrong irrigation prompt before rain.
- **No forecast.** If the forecast failed there is no rain information, so the irrigation line is shown as normal (a "no weather" day cannot claim rain). The report notes when a line was hidden: `irrigation line hidden (w07): ...`.
- **Weather rules still first.** On a rainy irrigation day the task list is e.g. [नाली साफ़ रखें, static line]. Report ids: `rain_drain, calendar:rain_hold`.
- Tests: `tests/unit/morning-21-calendar.test.mjs` (every stage, every rain level, dry/drizzle boundary, two-entries-one-slot, review gate of the static line, no forecast, and a full `generate()` run).

## The calendar line (Part 4)
- **Cap.** `max_tasks` stays 3. When a calendar line exists, at most **2 weather tasks** are kept plus the calendar line, so weather safety tasks always come first and the calendar line always has its place. Before, a 3rd weather task could crowd out the sowing line; now it cannot crowd out the calendar line. (With no calendar line the old 3 weather tasks stay exactly as today.)
- **Fallback.** No reviewed entry for today means the old `sowing_season` rule exactly as before (so nothing regresses before review). Report says `fallback:sowing_season`; a day with a calendar line says `calendar:<id>`.
- **Overlap rotation.** `daysSinceEpoch % k`, with one fix: where `k` changes at a window edge (e.g. 29 -> 30 Nov) the plain formula showed the same entry two days running. I move on by one entry when today's pick equals yesterday's pick (yesterday judged under the same rain state), so the same text never shows two days in a row while k > 1. Checked on every day 1 Nov 2026 - 18 Feb 2027.
- **`too_long`.** Entry w05 (varieties) is 151 characters; the prompt caps lines at 140 and says not to edit seeds except spelling. I kept the text, set `too_long:true` (not eligible until a reviewer shortens it), and a test requires every over-140 seed to carry that flag. Same idea as `lint_blocked` for kahawat.
- **Seed text kept as given** apart from spelling (तारीख़, सरसों, गेहूं). w01 keeps its full stop `.` from the seed.
- **Arithmetic checked** (test): w07 30 Nov-20 Dec, w08 21 Dec-30 Jan, w09 30 Dec-19 Jan, w10 29 Jan-18 Feb. All four agree with the seed texts; no seed needed changing.

## The slot (Part 3)
- **Banner vs window.** The old "रबी बुवाई की खिड़की में N दिन बाकी" line comes from the **rain-fed** banner (ends 15 Nov); the new wheat window is **irrigated** (10-25 Nov). Showing both would contradict. The new path does not use the banner line at all; it is in `KVK_QUESTIONS.md` (rain-fed vs irrigated). Effect: until 14 Nov, Mon-Sat with nothing reviewed have **no slot** instead of the daily countdown (named in the founder report).
- **Thin-pool throttle numbers.** A pool under 4 items: item number `weekIndex % 4` shows only if `< poolSize` (pool 1: one week in four; pool 3: three weeks in four, each item once per four weeks; pool 4+: weekly cycle). `weekIndex = floor(epochDays / 7)` (the counter the old `pick` used). Other weeks fall back to "अब आगे क्या?" or none. Applied to scheme, money, know and kahawat.
  - **Not throttled:** (a) "अब आगे क्या?" itself (a dated list whose numbers change every day, nearest 1-3, soonest first), and (b) a scheme with a real deadline within 45 days (urgent, kept from the old rule). Both exempt; neither can repeat a stale line.
- **Far events.** The prompt said both "scope near or kind festival/window" and "far fairs are not shown by default; Chhath is far". I used: show everything except `scope:"far"`. So Chhath (a festival) stays hidden.
- **Upcoming window items.** A window that has started shows "N दिन बाकी (date_to तक)"; a window not yet started or a fair shows "N दिन बाद". A window whose last day is today has 0 days left and is not shown.
- **Monday and Friday match.** Friday calls the same scheme pick on that week's Monday (Monday-Sunday weeks). If Monday's scheme has no how-to, or its `last_date` is null, Friday has none and falls back. A null last date blocks the how-to **even in `--draft`** ("not eligible even if reviewed").
- **Card and voice.** The card's tip box now also takes the new `know` kind (it took `gyaan` before); `upcoming`, `money`, `howto` are ignored (generic), `scheme` still uses `who_hi`. The voice speaks only `scheme`, so it is unchanged for the new kinds (tests render the card for every kind: no overflow; voice text byte-equal to "no slot").
- **Where the Hindi lives.** Every phrase is in `strings.hi.js` or a data file. New strings I added beyond the prompt: `upcomingPlace`, `kahawatMeaning`, `kahawatSource`.
- Month words in "source" lines come from `S.months` (अक्टूबर); the seed texts use the prompt's spelling (अक्तूबर). Both exist in the files; I did not unify them.

## Seeds
- **Spelling** changed from the prompt's draft: सरसों, गेहूं, तारीख़. Crop words checked against `fixtures.js` HI map.
- **Fairs' sources.** I had no deep link for the Tractor Gyan listing, so those five events carry `https://tractorgyan.com` with a note. Our own mela research files list the official sites and say Bharat Agri Tech is **9-11 Jan 2027** (the prompt says 8-11 Jan); I kept the prompt's date and wrote the difference into the item's `note`.
- **Kahawats 7-12:** I wrote the meanings plainly (the prompt gave none). #12 carries the reviewer note from the prompt. #6 got a source label "OCR स्कैन (दूसरी पंक्ति पक्की करना बाकी)". No saying failed lint, so none is `lint_blocked`.
- **Gyaan k01** has `text_hi` (not `lines`), like the other gyaan items. The MSP rises (+25, +83, +390, +413) **all match** `new 2027-28 MSP minus 2026-27 MSP in msp-reference.json`; a test recomputes them.
- Old schemes and gyaan items untouched. The two new schemes are appended.

## Polls
- `pickPoll(polls, date, { weekdays })`: in-window poll whose `weekday` equals today's wins; otherwise the old rotation **without** weekday polls (so p13/p14 do not leak onto other days). With the kill switch `off` weekday polls are ignored completely (old rotation byte-for-byte). `poll-result.mjs` follows the same switch.
- **Polls have no review flag**, so p13 (Mon) and p14 (Fri) go live on merge. This is the one thing in the batch that is not gated. Said plainly in `SHIP.md`.

## Kill switch and old tests
- `contentOff(env)` mirrors `districtsOff`. `generate()` reads it once; `pickSlot` (new `env` option), the task line, the poll and the report all follow it. Off = old map, old formats (including old kahawat/gyaan rendering), old single rule, old poll rotation.
- **Old tests.** `tests/unit/helpers/morning18.mjs` now runs with `MORNING_CONTENT=off` by default (merged under any env a test passes). Four older files (`morning-16a`, `17c-ontime`, `17d-message`, `17e-regression`) import `helpers/contentOff.mjs` (one line that sets the switch), because they prove the OLD post byte for byte. Two count assertions in `morning-16a` now count only the original 12 polls / 12 gyaan items. No baseline file changed.
- `content-status` runs each day twice (live and `--draft`) and prints `BLOCKED (unreviewed: ids)` where the draft would show something the gate blocks.

## The one failing test
`strings: every district word and name exists; the Hindi lives only in strings.hi.js` (Batch 18) fails exactly as before this batch: on this Windows checkout `compose.js` has CRLF line endings, so its comment-stripping regex leaves a Hindi comment in. I did not touch it. My own Hindi-only test strips CRLF first and passes for all logic files, including `content.js` and `workRules.js`.

## Counts
- Before my changes: 803 tests, 800 pass, 1 fail (the one above), 2 skipped.
- After: **867 tests, 864 pass, 1 fail (the same one), 2 skipped**. 64 new tests in `morning-21-content`, `-calendar`, `-data`. `npm run build` succeeds.
- Evidence: `evidence/sample-2026-11-08..14.txt` (seeds shown with `--draft`), `evidence/live-gate-2026-11-08..14.txt` (what goes out with the gate on). All 14 pass lint and are under the 1200 target. **Friday 13 Nov shows no how-to** (last date unknown), as required; it shows "अब आगे क्या?" in the draft and no slot live. With one seeded money fact, Wednesday 11 Nov also falls back (the fact shows 25 Nov, then once a month).
