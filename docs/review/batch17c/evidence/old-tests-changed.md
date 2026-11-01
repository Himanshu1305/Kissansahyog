# Old tests changed in 17C

Only one test, in `tests/unit/morning-16b.test.mjs` ("workflow: ... + manual run, ..."):
- It asserted the single cron `0 23 * * *` and the comment "DELAY scheduled runs by up to". Both are intentionally replaced by this batch (four crons; new comment "GitHub starts scheduled runs late").
- It now asserts exactly four `- cron:` lines and the new comment. All its other checks (manual run, no pull_request, 15-minute timeout, concurrency, pinned actions, 7-day artifacts, the three secrets, no service-role key, `if: always()`) are unchanged and still pass.
