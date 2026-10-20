# Batch 12C — ship to production (founder runs this)

Run, from the repo root in Git Bash:

    bash scripts/ship-prod-12c.sh 2>&1 | tee docs/review/batch12c/evidence/ship-real.log

It checks everything first, deploys, checks production with read-only gates and rolls back by itself if any gate fails. This ship also carries Batch 12A (WhatsApp channel card), which was never shipped on its own. Nothing in the database changes.

Undo (use the id the ship prints as "rollback target"):

    bash scripts/rollback-prod-12c.sh <rollback-target-id>

Then run `BATCH12C_CLOSE_PROMPT.md` in Claude Code.
