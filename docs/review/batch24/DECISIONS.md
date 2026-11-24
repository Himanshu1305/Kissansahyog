# Batch 24 - decisions (plain words)

What the founder asked for: the fairs ("किसान मेला") must be highlighted, not hidden as two plain lines at the bottom of "अब आगे क्या?", and today's festival (Kartik Purnima, 24 Nov 2026) must be greeted.

## What changed
- **A section of its own:** `🎪 *किसान मेला*`, shown on EVERY weekday (before, fairs appeared only on Tuesdays and only as plain lines). Hindi names: भारत एग्री टेक, फार्म-टेक इंडिया (English kept in a new `name_en` field in `data/morning/events.json`).
- **Festival greeting:** "🎉 आज *कार्तिक पूर्णिमा* है" now comes from the approved festivals in `events.json` (it used to read only `festivals.json`, which is empty).
- **No double display:** the Tuesday list "अब आगे क्या?" no longer contains fairs.
- **Kill switch:** `MORNING_CONTENT=off` gives the old post byte for byte (checked on 14 dates). The workflow does not pass that variable today, so on GitHub the only rollback is reverting the commit.

## Choices the prompt did not fix (change any of them if you like)
- **Window: 90 days.** A fair shows from 90 days before its first day until its last day. With 90 days both fairs show on 24 Nov (46 and 82 days). With 60 days Farm-Tech India would be hidden until 14 Dec.
- **At most 2 lines**, nearest first (`MELA_MAX`). While a fair runs the line says "आज चल रहा है (… तक)".
- **Placement:** after the rotating slot, before the voting line. Own heading, so it is easy to see.
- **Dropped last:** if a day's message goes over the 1500-character limit, the fair section is the very last thing removed (after the slot, next-two-days weather, trend, third task and fourth crop).
- **Only reviewed, near fairs** show (same review gate as everything else). The three far fairs (Lucknow, Agra, Pune) stay hidden.
- **Card, voice and video are untouched**: they read only the rotating slot.
- An existing Batch 21 test used a fair as its example "upcoming" item; I changed that one example to a festival (one word in `morning-21-content.test.mjs`), because fairs deliberately no longer appear in that list.

## Evidence
- `evidence/sample-*.txt`: full messages for 24 Nov, 25 Nov, 1 Dec 2026 and 10 Jan 2027 (the day a fair is running). These use the test weather and mandi data, not the live data, so the weather and prices are sample numbers; the new parts are real.
- `evidence/diff-before-vs-after-14-days.txt`: the exact differences between the old and new message for 14 days.
- `evidence/kill-switch-off.txt`: OFF gives the old message, unchanged.
