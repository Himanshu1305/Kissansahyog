# Batch 24 - how to ship (morning post: fair section + festival greeting)

The morning post is made by GitHub from the `main` branch. **Nothing deploys to the site**: pushing to `main` is the whole ship. The next scheduled post uses the new code. To remake today's post, run the "Morning post" workflow by hand (check_first unticked).

Rollback: `git revert <the batch-24 commit>` and push (the workflow does not read `MORNING_CONTENT`, so there is no switch on GitHub).

Steps are in the chat, one at a time. Short version: (1) check `origin/main`, (2) make the branch and commit, (3) run the morning tests (expect exactly 1 failure, the known Batch 18 one), (4) push `release-24:main`.
