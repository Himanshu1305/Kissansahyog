# Batch 27 - the morning post never quotes a deadline that has passed

Why: on 27 Nov 2026 the post said wheat could be sown "by 25 Nov". The data line carried that date in its text but was shown until 5 Dec; nothing compared the two.

## What changed
1. `scripts/morning/lib/freshness.js` (new). A deadline is a date written in a text followed by the words in `S.deadlineWords` ("until" / "before"). Past sowing-date ranges are not deadlines.
2. Run time: every picker (calendar static lines, scheme, events, fairs, festivals, money facts, gyaan, kahawat) skips an item whose own text quotes a deadline that is over. The old-post path (MORNING_CONTENT=off) is untouched.
3. Approvals expire: an item with `review_expires` (YYYY-MM-DD) is not used after that day. Optional; no data file was changed.
4. Priority: a due irrigation stage now shows every day it is due. Before, every 3rd day a static line replaced it (that is how the stale line reached 27 Nov). Rain still hides irrigation lines. Static lines fill only the days with no stage due and the rain days.
5. Audit + runway: every run adds report lines (and GitHub-summary lines) "WARNING freshness", "WARNING data" (an item can still be shown after its own deadline), "WARNING runway" (a file has under 30 days left).
6. Tests: `tests/unit/morning-27-fresh.test.mjs` (12 tests, including a 120-day sweep with the real data and the exact 27 Nov data bug). `morning-21-calendar.test.mjs`: the 3rd-day test is replaced by the priority test.

## Not changed
`crop-calendar.json` (the s01 window was already shortened to 25 Nov on main in commit 907b059). No database, no migration, no site deploy.

## Known and open
- Warning today: `scheme-calendar.json` runs out on 30 Nov (all its reviewed items end then). It needs refilling with sourced items.
- The late-sowing line (25 Nov, 25% extra seed) is retired, not replaced: its facts are unconfirmed (source says "KVK Sagar to confirm").
- The sowing-date table in the crop calendar ends 5 Jan 2027; the irrigation line runs to 31 Mar 2027.

## Rollback
`git revert <the Batch 27 commit>` and push. The post then behaves as before (with s01 still retired by its window).
