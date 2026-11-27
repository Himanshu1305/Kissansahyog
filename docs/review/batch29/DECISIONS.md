# Batch 29 - admin "KVK questions" tab
Why: facts the morning post needs but nobody has confirmed (days of the 2nd and 3rd wheat irrigation, the late-sowing date, the crop-insurance last date) used to wait for the founder. Now any admin phones KVK / the agriculture office, types the answer in the admin console, and the next morning post uses it by itself.

Decisions (founder, 2026-11-27)
- An answer goes live automatically (no second approval). It needs: who told us, the day they told us, and a "valid until" day. After that day the answer stops being used and the card says "ask again".
- Any admin may enter an answer (not only super admins). Every save and removal is written to the admin log.
- Typed fields only (numbers and dates, plus the name of who told us). No free text can reach a post.

Safety checks (same numbers in the form, the database and the morning job; a test compares them)
- Irrigation days: 10 to 150, "from" smaller than "to", at most 20 days apart; first day 15-35 (1st), 30-75 (2nd), 60-110 (3rd). The morning job also refuses days that overlap another irrigation.
- Dates: from the day told up to 400 days later. Extra seed 0-100%.
- Who told us: 3-120 characters. Told within the last 60 days, not in the future. Valid until: after today, at most 400 days (default 120).
- A bad or expired answer is ignored by the morning job with a WARNING line; the post then uses the repo data.
- The morning job reads answers with the public key through morning_kvk_answers() (read only; returns no admin id and no phone).
- If migration 0079 is not applied yet, the morning job simply sees "no answers" (no failure).

What an answer changes (in memory for that run only; no data file is rewritten)
- stage_days: replaces the days of that irrigation stage.
- date: replaces the scheme last date (Monday pick and Friday how-to).
- late_sowing: adds one calendar line "late sowing allowed until <date>" (and extra seed %) from the day told until that date.

Seeded questions: wheat irrigation 2 days, wheat irrigation 3 days, PM Fasal Bima rabi last date, wheat late-sowing last date and seed rate. KVK Sagar 07582-288228 is shown as the person to call.

Late wheat sowing (founder, 2026-11-27): the approved "गेहूं की देर से बुवाई" window (1 Dec to 5 Jan, one website) STAYS in the posts for now. The KVK tab question "wheat-late-sowing" is how it gets confirmed: when KVK's last date is entered, the window in events.json ends on that date (and the source becomes KVK); the seed % is added as a calendar line.
