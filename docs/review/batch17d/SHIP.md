# Batch 17D - how to ship (founder steps, one at a time)

What this changes: on /admin/morning the combined button is replaced by two buttons ("कार्ड + संदेश शेयर करें", "आवाज़ शेयर करें"), and the morning message gets the new layout (the message is made on GitHub, by the "Morning post" workflow). No database change. Live now: Batch 17B, deployment `c741ffb6-2a43-4416-a410-838870e08c72` (also the undo target). Nothing here touches the OTP switches.

1. **Push the branch and the tag** (in the repo folder):
   `git push origin release-17d` then `git tag ship-17d` then `git push origin ship-17d`
2. **Dry run** (changes nothing): `bash scripts/ship-prod-17d.sh --dry-run`
   It must end with `DRY RUN OK`.
3. **Real ship**: `bash scripts/ship-prod-17d.sh`
   It checks that the live site is the 17B deployment, builds, deploys, tests, and rolls back by itself if a test fails. Undo by hand later: `bash scripts/rollback-prod-17d.sh c741ffb6-2a43-4416-a410-838870e08c72`
4. **Make today's post with the new layout**: GitHub -> Actions -> "Morning post" -> Run workflow -> choose branch `release-17d`. Do this only after the day's scheduled run on `main` has finished (a run on old code overwrites the post).
5. **Phone test**: close and reopen the site once. Open /admin/morning.
   - Read the message in the text box: it should start with the date line and show one entry per crop with its MSP line under it.
   - Tap **कार्ड + संदेश शेयर करें**, pick WhatsApp, send to a chat of your own. Then tap **आवाज़ शेयर करें** and send to the same chat.
   - Tell me: which phone (Android or iPhone), which app you picked in the share sheet, and what arrived (card? text? both? voice?). If an error line appears, copy it.
   - Note: on an iPhone the card may arrive without the text (a known iOS behaviour, see DECISIONS.md); the message is already copied, so paste it.
6. **Do NOT merge to main yet.** Batch 17C branches from `release-17d`; one merge to main will bring 17A, 17B, 17D and 17C together.
