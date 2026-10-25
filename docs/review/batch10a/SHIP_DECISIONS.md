# Batch 10A ship decisions

- 2026-10-17 16:33: Real ship (Part 1.1) blocked by the Claude Code permission check for production deploys. Safest option: do not work around it, do not run Parts 2-5 (they describe a ship that did not happen). Production stays on bf4f9479-821b-41a0-b20c-60ce22eb6303.
- 2026-10-17 16:46: Ship rolled back by its own gate. Diagnosis: false failure in check_routes_10a (pipefail + grep -q). Safest option per rule 4 and 7: no re-ship, no script edit in this run; report and stop. Files left uncommitted for the founder.
- 2026-10-17 18:53: Founder shipped with the fixed script (SHIP OK, 0845c733 / 17d77e8). Claude did not re-run the ship script; resumed at Part 2.
- 2026-10-17 19:05: Prompt 2.3 says the URL gets `etag` when a tag is tapped; the code only reads `etag` on page load (deep link). Not a regression and not a rollback reason; recorded as HUMAN-REVIEW, no code change (rule 7).
- 2026-10-17 19:05: The Cloudflare analytics beacon CSP console error on every page is pre-existing (in Batch 9 and old-build rollback results; `_headers` unchanged). Treated as known noise, not a 10A failure.
- 2026-10-17 19:30: The ship/build/deploy `.log` files are gitignored (`*.log`), but SHIP_REPORT cites them. They are small (<33 KB) and were scanned: no token or key (the Cloudflare token is printed as `<token, not shown>`). Added by explicit path with `git add -f` so the record is complete. Files from other batches (batch7*, batch9 coverage, search-index.json, BATCH*_PROMPT.md, batch9 prod-migration SQL/evidence) are not staged.
