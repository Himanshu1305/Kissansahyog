# Batch 12A — ship to production (founder runs this)

Run, from the repo root in Git Bash:

    bash scripts/ship-prod-12a.sh 2>&1 | tee docs/review/batch12a/evidence/ship-real.log

It checks everything first, deploys, checks production with read-only gates and rolls back by itself if any gate fails. The switches (otp_required ON, session_enforced OFF) are read before and after and are never changed. **Nothing in the database changes in this batch.**

Undo, if something looks wrong later (use the id the ship prints as "rollback target"):

    bash scripts/rollback-prod-12a.sh <rollback-target-id>

Then run `BATCH12A_CLOSE_PROMPT.md` in Claude Code.
