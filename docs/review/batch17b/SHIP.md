# Batch 17B - ship steps for the founder

What this fixes (three things, nothing else):
- **The voice could not play** on `/admin/morning` (the site's security header blocked it). Fixed in `public/_headers` (`media-src 'self' data: blob:`).
- **No way to reach the morning post** from the admin dashboard. There is now a green "Morning post / सुबह की पोस्ट" button at the top of the admin console.
- **The weather said contradicting things** (for example "light rain, rain possible (80%)" with "postpone spraying" for 1 mm, while /mausam said "no rain in 48 hours"
  and "Caution" for everything). Now one rain verdict (`src/lib/weather/rainVerdict.js`) feeds /mausam, the card, the message, the voice and the "आज का काम" tasks, and the
  morning post reads the same saved forecast that /mausam shows.

There is **no database change** and no new secret in 17B. Live now: 17A (deployment `f692b6da-d3c2-4588-b2ab-8803b340827f`). That is also the undo target.

**Order matters.** Do the steps in this order, one at a time.

1. **Push and tag.** From the repository folder:
   `git push -u origin release-17b` then `git tag ship-17b` then `git push origin ship-17b`

2. **Dry run.** `bash scripts/ship-prod-17b.sh --dry-run`
   It changes nothing. Read the last line: it must say `DRY RUN OK` (a "(n pending)" note is fine only if the pending items are just the not-yet-sent probe of a dry run).

3. **Real ship.** `bash scripts/ship-prod-17b.sh`
   It builds, deploys, checks the live site (including the new security header, the new admin link and the new /mausam banner) and **rolls back by itself** if any check fails.
   To undo later by hand: `bash scripts/rollback-prod-17b.sh f692b6da-d3c2-4588-b2ab-8803b340827f`.

4. **Make a fresh card and voice with the new rules.** In GitHub, Actions, "Morning post", press "Run workflow" and pick **branch `release-17b`**
   (the workflow checks out the branch it is started from). Wait until it is green. (Running it again with the same data does not call ElevenLabs a second time; the voice is made again only when the spoken text changed, and it did change in 17B.)

5. **Check on your phone.** Close the site tab completely and open it again once, so the old cached version is dropped. Sign in as admin, open the admin console, tap the green
   **"Morning post"** button. Then check:
   - the **voice plays** (press play on the player);
   - the **card has no word twice** and says the same thing as /mausam (compare with the "Today's total" line and the banner there);
   - on a day with only a trace or about 1 mm of rain, the card says **"आज बारिश नहीं"** or a light drizzle, with no percentage and no "postpone spraying".

6. **Merge into `main` with the worktree method.** The daily "Morning post" workflow reads `main`. This merge also brings 17A into `main`. Do it **ONLY after steps 3, 4 and 5 passed**.
   (Same worktree method as 16G/16H/17A.)

7. **Check the next morning at about 05:00 IST** that the new post and its voice are there, and that `report.txt` of the run says `weather source: cache`.

If step 3 stops before deploying, nothing changed on the live site. If something looks wrong after step 3, run the undo command above and tell the architect.
