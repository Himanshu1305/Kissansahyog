# Batch 21 - decisions (weekly menu and crop-stage task line)

Everything here is a choice the prompt did not dictate, or a place where I had to reconcile two lines of it. Plain words first, then the detail.

## Start
- Working folder `~/projects/ks-b20`; `origin/main` contains the Batch 20 merge (`b41e568`), Batch 19 (`66f1bac`) and Batch 18 (`b492eff`). Branched `release-21` from `origin/main`, `npm ci`.
- The folder was **not clean**: `public/search-index.json` was already modified, and Batch 20 browser screenshots were untracked. I did not touch, stage or commit any of it (nor the prompt file).

## Built from an outdated prompt copy, corrected in 21B
The first version of the task line was built from an outdated copy of the prompt: fixed per-date lines about sowing windows, seed rate, varieties and "10-25 Nov sowers". The real situation (founder, 10 Nov 2026, from farmers): about 90% of Sagar farmers had already sown by 7 Nov, so the post must say what comes AFTER sowing. 21B replaced `crop-calendar.json` (w01-w10 removed; git history keeps them) and changed only the calendar logic; the weekly menu, kill switch, polls, rain rule, thin-pool throttle, gate and tests stay.

## The after-sowing line (21B)
- **Shape.** `sowing_dates` (2026-10-20..2027-01-05), three `stages` (irr1 20-25, irr2 50-55, irr3 80-85 days after sowing) and two `static` lines (s01, s02), plus `rain_hold` unchanged. All `reviewed:false`, all with the Krishisewa source.
- **Cohort.** On calendar day D a stage is due for the sowers sown in [D - das_to, D - das_from], clipped to `sowing_dates`; an empty cohort after clipping means "not due". The line is built from these dates with `S.cohortLine` (Hindi in `strings.hi.js`, month words from `S.months`). Nothing is typed per day; `evidence/stage-table.txt` lists every day 11 Nov 2026 - 20 Feb 2027.
- **Two stages due the same day** (irr2 and irr3 overlap with irr1 in some periods): the **earlier stage** is shown. Reason: it is the one nearest to farmers still waiting; the later ones return when the earlier is no longer due.
- **Every 3rd day** (`daysSinceEpoch % 3 === 0`) a static line is shown instead of the cohort line while a stage is due (only if a static line is eligible); on days when no stage is due the static lines rotate. Static lines end 5 Dec (s01) and 31 Dec (s02); after that, while a stage is due, the cohort line shows every day.
- **Review gate.** The cohort line needs `sowing_dates` AND the stage reviewed. The draft shows it with the WARNING listing `calendar:sowing_dates` and `calendar:irr1` (whichever are unreviewed). If a stage is due but not reviewed, the static lines (if reviewed) are shown.
- **No repeats.** The "never the same text two days in a row" fix is kept for the static pool (yesterday judged under the same rain state). Cohort lines change their dates every day. Checked 1 Nov 2026 - 20 Feb 2027 (dry): no static line repeats while more than one is eligible; the same line id does not appear twice in a row except cohort lines (different dates) and days where only one static line exists.
- **Cap.** Unchanged: at most 2 weather tasks plus the calendar line (max_tasks 3). Fallback to the old `sowing_season` rule is unchanged when nothing is reviewed.
- **Rain rule (founder's earlier addition, now applied to the cohort lines).** The cohort lines ARE the irrigation lines. When the 48-hour rain level is `light`, `moderate` or `heavy` they are hidden and the pool becomes the static lines plus `rain_hold` (rotating, no repeats). `dry` and `drizzle` do not hide. Static lines are never hidden. No forecast = cohort line shown as normal. If `rain_hold` is unreviewed it is not shown live and nothing replaces the hidden line (the old rule or nothing). The `rain_hold` wording was written by me (not a sourced fact), listed for KVK Sagar.
- **Report ids:** `calendar:irr1`, `calendar:s01`, `calendar:rain_hold`, `fallback:sowing_season`; a hidden line adds `irrigation line hidden (irr1)`.
- **Old pieces removed:** `derived`, the `too_long` seed (w05, varieties), `irrigation_stage` fields and the 10-25 Nov window. The `too_long`/`lint_blocked` rule stays for other data (static lines).
- **Events:** the "समय पर गेहूं बुवाई (सिंचित)" 10-25 Nov window was replaced by "गेहूं की देर से बुवाई" 1 Dec - 5 Jan (for the ~10% not yet sown). No "timely sowing ends 25 Nov" countdown anywhere except the static line s01, which is a plain sentence, not a countdown.
- **Poll p15** (Tuesday, when sowing was finished; 10 Nov - 31 Dec) added; p02, p03, p13, p14 untouched. Polls are not review-gated: p13, p14 and p15 go live on merge.
- **Varieties and the old seed-rate line** are no longer in the post (they were sowing-time advice); noted in `KVK_QUESTIONS.md`.

## The slot (Part 3)
- **Banner vs window.** The old "रबी बुवाई की खिड़की में N दिन बाकी" line comes from the rain-fed banner (ends 15 Nov). The new path does not use it (the post now speaks about what comes after sowing). Effect: until 14 Nov, Mon-Sat with nothing reviewed have **no slot** instead of the daily countdown (named in the founder report).
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
- After 21B: see `evidence/test-results.txt` (exact counts).
- Evidence (21B): `sample-` and `live-gate-2026-11-11..17.txt`, `irrigation-rain/dry-draft-2026-12-10.txt`, `stage-table.txt`, `content-status-*.txt`. Friday 13 Nov shows no how-to (last date unknown).
