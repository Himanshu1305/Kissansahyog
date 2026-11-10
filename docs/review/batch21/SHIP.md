# Batch 21 ship notes (founder) - a different, useful item every day in the morning post

**What this changes:** the daily "सुबह की खबर" post. (1) The small slot near the bottom now follows a weekly menu: Mon scheme news, Tue what is coming, Wed a money fact, Thu "क्या आप जानते हैं?", Fri how to apply, Sat kahawat, Sun the weekly recap (unchanged). (2) The "आज का काम" line now says what comes AFTER sowing (most Sagar farmers sowed by 7 Nov): a line computed from dates, like "15 नवंबर से 20 नवंबर के बीच बोई गेहूं की पहली सिंचाई का समय अब है (बुवाई के 20-25 दिन बाद)", with two static lines mixed in. When rain is expected the irrigation line is replaced by a rain line. (3) Three new poll questions: Monday PM-किसान money (p13), Tuesday "when was your sowing finished?" (p15), Friday rabi crop insurance (p14).
**What does NOT change:** weather, six districts, mandi prices, MSP gap, trend, the card, the voice and the video. The website is not touched. No database change, no SQL, no migration, no new secret, no new npm package.
**Only these things changed:** `scripts/morning/**`, `data/morning/*.json`, tests, docs, and ONE line in `.github/workflows/morning-post.yml` (`MORNING_CONTENT`). The four cron times are untouched.

## The review gate stays ON
The gate is still on in the code. On 10 Nov 2026 the founder approved the content (each flipped item is marked `approved_by`). **Not approved, so still blocked:** pmfby-rabi (no sourced Madhya Pradesh last date, so Friday has no how-to), the older pm-kisan and pmfby entries, the kahawat "उत्तर चमकै बीजुरी..." (OCR source, second line unconfirmed), the 4 far-away events, and the tips.

## How to see what is missing
```
npm run morning:content
```
Prints how many items each data file has (total / reviewed / not reviewed), then a table for the next 21 days: the task line source, and the slot shown or `cd ~/projects/ks-b20 && git fetch origin \
&& git merge-base --is-ancestor origin/main merge-21 && echo "OK: merge-21 contains origin/main (main has not moved)" \
&& git log merge-21 --oneline -3 \
&& git diff --stat origin/main merge-21 | tail -1 \
&& git push origin merge-21:main \
&& git fetch origin && git log origin/main --oneline -5ED (unreviewed: ids)` or `none`. Options: `-- --from 2026-11-20 --days 30`. It reads files only and uses sample weather, never the network.
To read how a day would look with the seeds: `npm run morning -- --draft --fixtures normal --date 2026-11-12` (shows the message and a WARNING listing the unreviewed items).

## The kill switch
If anything looks wrong after the merge, set the repository variable `MORNING_CONTENT` to `off`: GitHub > the repo > Settings > Secrets and variables > Actions > **Variables** > New repository variable, name `MORNING_CONTENT`, value `off` (any capitals, spaces ignored). The next post is then exactly the old one: the old weekday slots, old headings, the single sowing rule, and the old poll rotation. Delete the variable (or set anything else) to turn the new behaviour back on. No code change needed either way.

## What you will see tomorrow (11 Nov, Wednesday) - gate on, approvals applied
The full text is in `evidence/live-approved-2026-11-11.txt` (all seven days 11-17 Nov are there; each under 1500 characters and clean on lint).
- **Task line:** "... बोई गेहूं की पहली सिंचाई का समय अब है (बुवाई के 20-25 दिन बाद)" with the dates worked out for that day; every third day a plain static line instead. On a day with rain expected it becomes the rain line.
- **Slot:** the heading of the weekday. Tue "अब आगे क्या?" (festivals and fairs), Thu "क्या आप जानते हैं?", Sat the kahawat, Sun the recap. Wednesday's money fact shows once in four weeks (one item), so most Wednesdays show "अब आगे क्या?" instead. Monday shows a scheme (PM-किसान news or KCC) on some weeks. **Friday has no how-to** (insurance last date unknown).
- **Polls are not gated:** p13 (Mon, PM-किसान), p15 (Tue, sowing finished), p14 (Fri, crop insurance) go live on merge.
- The old daily line "रबी बुवाई की खिड़की में N दिन बाकी" is gone.

## Merge and push (the merge is already done locally on branch `merge-21`)
`origin/main` had not moved (still the Batch 20 merge `b41e568`), so `merge-21` is exactly `main` plus Batch 21, merged with `--no-ff`. The full test suite and the build were run on it. Nothing deploys on a push to main: the morning workflow simply uses the new code from its next try at **01:07 IST**.
**The repository variable `MORNING_CONTENT` must NOT be set to `off`** (GitHub > Settings > Secrets and variables > Actions > Variables: it should not exist or not say off).

Paste this whole block into Git Bash:
```
BLOCK
```

## Morning check (about 05:00 IST, after the 01:07 run)
Open /admin/morning and check:
1. a post exists for the new date;
2. the task line reads like "... बोई गेहूं की पहली सिंचाई का समय अब है";
3. the slot heading matches the weekday;
4. the post is under 1500 characters and the poll is the weekday poll (Mon p13, Tue p15, Fri p14).
If any of these is wrong or the post is missing: set the repository variable `MORNING_CONTENT` to `off` and re-run the "Morning post" workflow by hand.

## How to see what is still missing
`npm run morning:content` (add `-- --from 2026-11-20 --days 30`). It reads files only, no network. Read a day with the unapproved seeds: `npm run morning -- --draft --fixtures normal --date 2026-11-12`.

## Kill switch
Set the repository variable `MORNING_CONTENT` to `off`: the next post uses the old weekday slots, the old single sowing rule and the old poll rotation (on today's data). Delete the variable to turn the new behaviour back on.
