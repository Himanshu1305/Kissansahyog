# Batch 16G - ship steps (founder)

What changes: the weather pages never show an old forecast as today's. /mausam and the homepage weather tile cut the cached forecast to "from now", show when it was updated, warn when it is more than 12 hours old, and hide it when it is more than 24 hours old. The GitHub refresh job now goes RED when the Sagar weather is older than 2 hours or a pilot town fails. No database change.

1. **Push the branch** (Git Bash, repo folder): `git push -u origin release-16g`
2. **Dry run** (changes nothing): `bash scripts/ship-prod-16g.sh --dry-run`. It lists what is pending (the tag `ship-16g`). Create it on the pushed commit: `git tag ship-16g && git push origin ship-16g`, then dry run again.
3. **Real run:** `bash scripts/ship-prod-16g.sh` (refuses unless production OTP is ON; rolls back by itself if a gate fails).
4. **Merge into `main`** with the worktree method used in 16D/16E, because the GitHub schedule only reads `main`. This also brings 16F into `main`. A throwaway trial merge into `origin/main` was run on the builder's machine (result in the batch report): it merges cleanly with no conflicts. Without this step the new RED rules and the 12-minute weather cut-off do not run on GitHub.
5. **Check the live site** (kissansahyog.com/mausam, Hindi and English): the line under the place says "Updated today ..." and the first row of the 7-day table is today. The homepage weather tile shows today's temperature.
6. **After the next scheduled GitHub run** (every 3 hours): both jobs (production and staging) are green and the run summary has a line "Sagar weather (23.8_78.7): fetched N min ago".
7. **Rollback:** `bash scripts/rollback-prod-16g.sh d26acfd3-80c8-4e09-90c5-ed65a6a7d24c` (the Batch 16F deployment that is live now).
