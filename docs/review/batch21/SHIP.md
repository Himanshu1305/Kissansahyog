# Batch 21 ship notes (founder) - a different, useful item every day in the morning post

**What this changes:** the daily "सुबह की खबर" post. (1) The small slot near the bottom now follows a weekly menu: Mon scheme news, Tue what is coming, Wed a money fact, Thu "क्या आप जानते हैं?", Fri how to apply, Sat kahawat, Sun the weekly recap (unchanged). (2) The "आज का काम" line now follows a wheat crop-stage calendar by date, instead of one sentence every day. (3) Two new poll questions, one on Mondays (PM-किसान money) and one on Fridays (rabi crop insurance).
**What does NOT change:** weather, six districts, mandi prices, MSP gap, trend, the card, the voice and the video. The website is not touched. No database change, no SQL, no migration, no new secret, no new npm package.
**Only these things changed:** `scripts/morning/**`, `data/morning/*.json`, tests, docs, and ONE line in `.github/workflows/morning-post.yml` (`MORNING_CONTENT`). The four cron times are untouched.

## The review gate stays ON
Every new item was added as **not reviewed**. The live post shows only reviewed items. So if you merge now, nothing new appears except the two polls (see "What you will see tomorrow"). A person must approve content first.

## How to see what is missing
```
npm run morning:content
```
Prints how many items each data file has (total / reviewed / not reviewed), then a table for the next 21 days: the task line source, and the slot shown or `BLOCKED (unreviewed: ids)` or `none`. Options: `-- --from 2026-11-20 --days 30`. It reads files only and uses sample weather, never the network.
To read how a day would look with the seeds: `npm run morning -- --draft --fixtures normal --date 2026-11-12` (shows the message and a WARNING listing the unreviewed items).

## The kill switch
If anything looks wrong after the merge, set the repository variable `MORNING_CONTENT` to `off`: GitHub > the repo > Settings > Secrets and variables > Actions > **Variables** > New repository variable, name `MORNING_CONTENT`, value `off` (any capitals, spaces ignored). The next post is then exactly the old one: the old weekday slots, old headings, the single sowing rule, and the old poll rotation. Delete the variable (or set anything else) to turn the new behaviour back on. No code change needed either way.

## What you will see tomorrow if you merge now
- **Mon-Sat until 14 Nov: the daily line "रबी बुवाई की खिड़की में N दिन बाकी" at the bottom disappears.** The old slot showed it every day only because nothing else was reviewed. The new menu does not use it (it is the rain-fed advice and would contradict the new irrigated 10-25 Nov window). With nothing reviewed, those days have no slot. After 14 Nov the old post had no slot either, so nothing differs then. Sunday (recap) is unchanged.
- **The task line is the same as today** (the old "बुवाई वाले खेत में नमी जाँचें" until 15 Nov, nothing after), because the calendar is unreviewed.
- **Monday's poll becomes the PM-किसान question and Friday's the crop-insurance question.** Polls have no review flag (never had), so these two go live at once. Delete `p13`/`p14` from `data/morning/polls.json` (or set the kill switch) if you do not want that yet.
- Everything else is identical to today. Proof: the six Batch 18 test messages (F1-F6) are byte-identical with the kill switch on `off`; with it unset only the slot differs.

## Steps for you, one at a time
1. **Review the content.** Read `docs/review/batch21/CONTENT_FOR_REVIEW.md` (one table per reviewer: KVK Sagar for the wheat calendar, the core team for schemes/MSP/events, Shri A.K. Dixit and team for the kahawats). Send `KVK_QUESTIONS.md` to KVK Sagar.
2. **Tell Cowork which ids to approve** (and any changed wording). Cowork flips them to reviewed and checks them with `npm run morning:content`.
3. **Merge `release-21` to `main`** the same way as Batch 18 (guard first, then merge `--no-ff`, then push). You run git yourself; this batch does not push.
4. **Push `main`.** The workflow runs from `main`, so the next scheduled try (01:07 IST) uses the new code.
5. **Watch the next day's post** in /admin/morning: the heading of the day's slot, the task line, and the poll. If wrong, use the kill switch above.

Rehearsal done in this batch: the kill switch run end to end through the real command for all six fixtures with `off`, `OFF` and ` off ` (identical to the old post), plus seven sample days with seeds shown and seven without (`evidence/`).
