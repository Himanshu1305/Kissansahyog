# Batch 17E - SHIP (founder steps, one at a time)

What this adds: every morning the job also makes a short video (the card as the picture, the voice as the sound) and stores it. On `/admin/morning` there is ONE
big button, **कार्ड + आवाज़ शेयर करें**, that shares that video with the message as its caption. In the chat it looks like the card with a play button; tapping play
plays the voice while the card stays. The two buttons from 17D stay below it as backups ("सिर्फ़ कार्ड + संदेश" and "सिर्फ़ आवाज़").

**Order matters:** staging database -> production database -> push and tag -> ship the site -> run the job once -> phone test -> merge into `main`.
If you ship the site before the production database step, the page just says "the video is not made yet" and the backups work. Nothing breaks.

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

## 4. Push and tag
```
git push -u origin release-17e
git tag ship-17e
git push origin ship-17e
```

## 5. Dry run
```
bash scripts/ship-prod-17e.sh --dry-run
```
Changes nothing. Read the last line: it must say `DRY RUN OK`. (After step 4 the "tag missing" and "not pushed" notes go away; the migration probe is only sent in the real run.)

## 6. The real ship
```
bash scripts/ship-prod-17e.sh
```
It checks that migration 0074 is on production (one harmless test with a wrong secret, expecting "forbidden"), that the live version is the expected 17D one
(`3d3ed43a-3b6b-4cfa-9128-38b86045143e`), builds, deploys, tests the live site, and rolls back by itself if a check fails. It never touches the login switches.

## 7. Make today's video
GitHub, **Actions**, **Morning post**, **Run workflow**, choose **Branch: release-17e** (not main), leave "check_first" off, press the green button. Do this after the day's scheduled run has finished.
Wait for the green tick. Open the run, then its **Summary**. It must contain a line like `video saved (530 KB, 40.4 s)`.
If it says `video skipped: ...` or `video not saved: ...`, copy that line to the architect (the post itself is still saved and the run is still green).

## 8. Phone test (Android)
1. Close the Kisan Sahyog site completely and open it again once (so the phone loads the new version).
2. Open `/admin/morning`. Under the card and voice you should see **कार्ड + आवाज़ (वीडियो)**: a small video showing the card. After a second the big green button **कार्ड + आवाज़ शेयर करें** is ready.
3. Tap it, choose WhatsApp, send it to a chat of your own (or yourself).
4. Tell the architect exactly what arrived:
   - Is it the card with a play button on it?
   - Does tapping play start the voice while the card stays on the screen?
   - Is the message the caption under it, or is the caption empty (then paste the copied message)?
   - How big was it and how fast did it send and open?
   - Your phone model and the WhatsApp type (normal WhatsApp or WhatsApp Business).
5. If the video does not open or the button does not work, use the two backup buttons below it and tell the architect what you saw.

## 9. Merge into `main` and check the next morning
Only after the phone test is fine. `main` has not moved since this branch was made, but use the same worktree method as 16C so your own folder is not disturbed:
```
cd ~/projects/Kissansahyog
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-17e
git merge --no-ff release-17e -m "Merge Batch 17E: card + voice video (ffmpeg), main share button"
git push origin merge-17e:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
GitHub runs the early-morning timer only from `main`, so the video is made by the scheduled runs only after this merge.
**Next morning:** open Actions, "Morning post". The first try that ran must have `video saved (...)` in its summary; the later tries must say "Skipped: today's post (...) is already complete (voice and video present)." and be green.
If the video keeps failing, all four early tries run the full job (that is accepted: the message, card and voice still exist from the first try). Tell the architect the summary line.

## 10. If something is wrong
- **Undo the site only:** `bash scripts/rollback-prod-17e.sh 3d3ed43a-3b6b-4cfa-9128-38b86045143e` (that is the 17D site). It changes no database.
- **Rollback of the site does NOT remove migration 0074.** That is on purpose: 0074 is additive and harmless (two unused columns and functions), and the 17D site works on the same database.
  Removing it is optional and never done by a script: paste `supabase/migrations/rollback/0074_morning_video_rollback.sql` in the SQL editor (it puts the functions back as 0073 made them and deletes any stored videos; messages, cards and voices stay).
- **Undo the job change** (after the merge): revert the merge on `main` (`git revert -m 1 <merge commit>`); the post then goes back to message + card + voice with no video.
- The login switches (`otp_required`, `session_enforced`) are never touched by any of this.
