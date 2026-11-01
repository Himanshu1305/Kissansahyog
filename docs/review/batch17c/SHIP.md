# Batch 17C - SHIP (founder steps, one at a time)

Nothing here deploys the website. No site file changed, so there is NO ship script and NO database migration for 17C.

**Important:** GitHub runs the timer only from the `main` branch. These changes work only after `release-17c` is merged into `main`.

1. **17B and 17D must be shipped first**, by their own SHIP.md steps (tags `ship-17b` and `ship-17d` exist on the remote - check with `git ls-remote --tags origin`).
2. **Merge into main.** Do NOT merge `release-17b` or `release-17d` on their own. Instead push `release-17c` and merge `release-17c` into `main` with the worktree method. This brings 17A, 17B, 17D and 17C into `main` together.
3. **Prove both paths by hand before trusting the timer** (GitHub > Actions > "Morning post" > "Run workflow", branch `main`):
   a. First run with **check_first OFF**. It must run fully, finish green, and the post must have its voice.
   b. Then run again with **check_first ON**. It must finish green in a few seconds, and its summary must say "Skipped: today's post ... is already complete (voice present)."
4. **Next morning at 05:00 IST:** check the post exists. Then open Actions and look at the day's tries (up to four). The first one that started should have made the post; the later ones should say "Skipped" and be green.
5. If a day is still late, tell the architect (Plan 2: `PLAN2_SUPABASE_CATCHUP.md`).

If something goes wrong: set the workflow back by reverting the merge of `release-17c` on `main`; nothing else changes.

If the check step shows a yellow warning, or the summary says "The check step crashed, so the full job ran.", the check failed safely and the post was still made. Tell the architect.
