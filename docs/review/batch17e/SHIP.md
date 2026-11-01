# Batch 17E - SHIP (founder steps, one at a time)

What this adds: every morning the job also makes a short video (the card as the picture, the voice as the sound) and stores it. On `/admin/morning` there is ONE
big button, **कार्ड + आवाज़ शेयर करें**, that shares that video with the message as its caption. In the chat it looks like the card with a play button; tapping play
plays the voice while the card stays. The two buttons from 17D stay below it as backups ("सिर्फ़ कार्ड + संदेश" and "सिर्फ़ आवाज़").

**Order of this fix:** push the branch -> run the Morning post workflow from `release-17e` -> phone test -> merge into `main`. (The database and the site steps above were done before; the fix touches the job only.)

Do each step, then tell the architect the result before the next one.

## 1. Before you start (check only)
- Batch 17C is merged into `main` and Batch 17D is live. Check: `git ls-remote --tags origin ship-17d` prints a line, and `git log origin/main --oneline -1` shows "Merge release-17c ...".
- You are on the branch: `git checkout release-17e`

## 2. Test on STAGING (never production)
Open the Supabase SQL editor of the **STAGING** project (ref `wzxtqbqlahyahsnoqqva`). Staging must already have migrations 0070 to 0073.
1. Paste the whole file `supabase/migrations/0074_morning_video.sql` and press Run. It is safe to run twice. Expected: **Success. No rows returned**.
2. Open a new query, paste the whole file `docs/review/batch17e/TEST_0074_STAGING.sql` and press Run. Expected: one result row that says **ALL 0074 CHECKS PASSED**.
3. **`TEST_0074_STAGING.sql` is NEVER run on production.** It runs inside a transaction that is rolled back, so it leaves nothing behind, but it replaces the secret inside that transaction.
4. If it says an error such as `relation "public.morning_posts" does not exist` or `function public.morning_post_secret_ok(text) does not exist`, staging is missing 0070-0073. Stop and tell the architect.

## 3. Apply the migration on PRODUCTION
Only after step 2 passed. Open the SQL editor of the **PRODUCTION** project, paste the whole file `supabase/migrations/0074_morning_video.sql`, press Run.
Expected: **Success. No rows returned**. It adds two columns and three new functions, and replaces four functions that 0073 made (with the video rules added). It is additive: nothing is dropped.
(Do not run the test file here.)

## 4. Push the branch (fix of the video length)
Run #14 made a video of 64.5 s for a 34.7 s voice (picture with no sound for the last 30 s). This fix is in the job only, so **no site ship is needed**: skip `ship-prod-17e.sh`, there is nothing new for the website.
```
git push -u origin release-17e
```
(No tag, no `ship-prod-17e.sh` run: the site and the database are already as they must be. The ship scripts stay in the repo for the record.)

## 5. Make today's video again (a manual run always rebuilds it)
GitHub, **Actions**, **Morning post**, **Run workflow**, choose **Branch: release-17e** (not main), leave "check_first" **off**, press the green button. A manual run with check_first off now ALWAYS builds the video again and replaces the stored one (the old bad video is overwritten). Do this after the day's scheduled run has finished.
Wait for the green tick. Open the run, then its **Summary**. It must contain a line like `video saved (459 KB, 34.7 s)` where the seconds **equal the length of the voice** (about 34.7 s for today's voice; not 64.5 s).
If it says `video skipped: durations do not match (audio X s, video Y s)`, `video skipped: ...` or `video not saved: ...`, copy that line to the architect (the post itself is still saved and the run is still green; a bad video is never stored).

## 6. Phone test (Android) again
1. Close the Kisan Sahyog site completely and open it again once.
2. Open `/admin/morning`. Under the card and voice, **कार्ड + आवाज़ (वीडियो)** shows the video. Its length must now be the same as the voice player's (about 0:35).
3. Tap **कार्ड + आवाज़ शेयर करें**, choose WhatsApp, send it to a chat of your own (or yourself).
4. Tell the architect: does the voice play to the END and the video stop right there, with no silent card afterwards? The card with a play button, the caption, the size and your phone model as before.

## 7. Merge into `main` and check the next morning
Only after the phone test is fine. Use the worktree method so your own folder is not disturbed:
```
cd ~/projects/Kissansahyog
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-17e
git merge --no-ff release-17e -m "Merge Batch 17E: card + voice video (ffmpeg), main share button, video length fix"
git push origin merge-17e:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
**The early-morning timer runs only from `main`**, so the video is made by the scheduled runs only after this merge (until then only your manual runs from `release-17e` make it).
**Next morning:** open Actions, "Morning post". The first try that ran must have `video saved (..., <seconds> s)` in its summary, the seconds equal to the voice length; the later tries must say "Skipped: today's post (...) is already complete (voice and video present)." and be green.
If the video keeps failing, all four early tries run the full job (accepted: the message, card and voice still exist from the first try). Tell the architect the summary line.

## 8. If something is wrong
- **Undo the site only:** `bash scripts/rollback-prod-17e.sh 3d3ed43a-3b6b-4cfa-9128-38b86045143e` (that is the 17D site). It changes no database.
- **Rollback of the site does NOT remove migration 0074.** That is on purpose: 0074 is additive and harmless (two unused columns and functions), and the 17D site works on the same database.
  Removing it is optional and never done by a script: paste `supabase/migrations/rollback/0074_morning_video_rollback.sql` in the SQL editor (it puts the functions back as 0073 made them and deletes any stored videos; messages, cards and voices stay).
- **Undo the job change** (after the merge): revert the merge on `main` (`git revert -m 1 <merge commit>`); the post then goes back to message + card + voice with no video.
- The login switches (`otp_required`, `session_enforced`) are never touched by any of this.
