# Batch 17A - ship steps for the founder

What this adds: every morning the post also holds a spoken Hindi voice note (ElevenLabs, voice Raju, about 30-40 seconds), the card has the new look,
and `/admin/morning` has a player, a download button, "WhatsApp: send text" and "Share card + voice".

**Order matters.** Do the steps in this order. The staging test comes first, then the production database step, and the merge to `main` comes last.
If you merge to `main` before the production database step (step 2) and the ship, the morning post is still made and saved, only the voice is skipped. That is harmless.

1. **Test on STAGING first.** Open the SQL editor of the STAGING project (ref `wzxtqbqlahyahsnoqqva`), not production.
   a. Paste and run `docs/review/batch17a/PROD_MIGRATION_0073.sql` (safe to run twice).
   b. Then paste and run `docs/review/batch17a/TEST_0073_STAGING.sql`. The last line of the result must be `ALL 0073 CHECKS PASSED`.
   c. **`TEST_0073_STAGING.sql` is NEVER run on production.**
   d. If staging is missing migrations 0070-0072, step a or b stops with an error such as `relation "public.morning_posts" does not exist` or `function public.morning_post_secret_ok(text) does not exist`. Stop there and tell the architect; do not go on.

2. **Database (production SQL editor).** Open the production project SQL editor, paste the whole file
   `docs/review/batch17a/PROD_MIGRATION_0073.sql` and run it once. It is safe to run twice. It only adds three columns and replaces five functions.

3. **ElevenLabs key.** In ElevenLabs create an API key restricted to **Text to Speech only**. In GitHub, repository Settings, Secrets and variables, Actions,
   add a secret named `ELEVENLABS_API_KEY` with that key. Never paste the key in chat. (Optional: secrets `ELEVENLABS_VOICE_ID` for another voice, Raju is the default, and `ELEVENLABS_MODEL` for another model; when empty the defaults are used.)

4. **Push and tag.** From the repository folder:
   `git push -u origin release-17a` then `git tag ship-17a` then `git push origin ship-17a`

5. **Dry run, then the real ship.**
   `bash scripts/ship-prod-17a.sh --dry-run` (changes nothing; read the last line). If it says DRY RUN OK, run
   `bash scripts/ship-prod-17a.sh`. It rolls back by itself if any gate fails. To undo later: `bash scripts/rollback-prod-17a.sh 3585b4c1-6ce6-4c51-a47d-660ca75217fe`.

6. **Merge into `main` with the worktree method.** The "Morning post" workflow reads `main`, so `release-17a` must be merged into `main` (same worktree method as 16G/16H).
   Do this only after steps 2 and 5.

7. **Try it once by hand.** In GitHub, Actions, "Morning post", press "Run workflow". When it is green, open `/admin/morning` on your phone: look at the card,
   press play on the voice note, then press "Share card + voice" (on a computer use the Download buttons instead).

8. **Check again the next morning at about 05:00 IST** that the new post and its voice are there.

Cost note: the voice is made again only when the spoken text changes. Running the workflow twice with the same data does not call ElevenLabs a second time.

To try voices by ear before step 3 (optional, uses at most 3 short calls): put `ELEVENLABS_API_KEY` in your local `.env`, then run `npm run morning:voice-try`.
Files appear in `out/morning/try-<model>.mp3`. To compare more models, set `ELEVENLABS_TRY_MODELS` in `.env`, for example `eleven_multilingual_v2,eleven_v3`.
