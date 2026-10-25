# Batch 10A — ship and close progress

| Time | Part | Status | Note |
|---|---|---|---|
| 2026-10-17 16:32 | 0.1 | RAN-PASSED | On release-10a, HEAD 0306039 = origin/release-10a (docs-only on top of 020a50a); tag pre-10a-ship -> 020a50a locally and on origin; only allowed files dirty. |
| 2026-10-17 16:33 | 0.3 | RAN-PASSED | Read SHIP.md, ship-prod-10a.sh, rollback-prod-10a.sh. |
| 2026-10-17 16:33 | 0.2 | RAN-PASSED | Ship dry run ended DRY RUN OK; live prod = bf4f9479-821b-41a0-b20c-60ce22eb6303 (source ee3ecfd). Log: evidence/prod-ship/ship-dry-run-2.txt |
| 2026-10-17 16:33 | 1.1 | NOT-RUN | The real ship command was blocked by the Claude Code auto-mode permission check (production deploy). Nothing was built or deployed; production unchanged. Waiting for the founder to allow it or run it. |
| 2026-10-17 16:46 | 1.1 | RAN-FAILED | Real ship ran: deployed 60bca777 (0306039), all verify-batch9-live gates passed, then the 10A route check falsely failed /post and /browse (pipefail + grep -q SIGPIPE bug in the script). |
| 2026-10-17 16:46 | 1.2 | ROLLED-BACK | Automatic rollback to bf4f9479 done, page check passed; curl confirms the old main chunk index-Cy1O2hd0.js on / /signup /post /browse. SHIP_REPORT.md written. Parts 2-5 skipped per the prompt. |
| 2026-10-17 17:59 | 0.2 | RAN-PASSED | After the script fix (17d77e8: here-strings instead of `printf \| grep -q`), dry run ended DRY RUN OK; live prod still bf4f9479. Log: evidence/prod-ship/ship-dry-run-3.txt |
| 2026-10-17 18:28 | 0 + 1 | RAN-PASSED (shipped by the founder) | The founder ran `bash scripts/ship-prod-10a.sh` once (stamp 20261017-182316). Preconditions passed (HEAD 17d77e8 = origin, live = bf4f9479), build, deploy, all verify-batch9-live gates ALL PASSED, 10A routes /signup /post /browse serve /assets/index-DRo2-cnt.js. Verdict: SHIP OK. Live now: 0845c733-e8d0-4553-957c-10f3db23ecca (17d77e8). Log: evidence/prod-ship/ship-real-2.log; gates: prod-gates-20261017-182316.txt. |
| 2026-10-17 18:53 | 1.2 | RAN-PASSED | Verdict read by Claude: SHIP OK, no rollback. Repo checked: HEAD = origin/release-10a = 17d77e8; prod-deployment-after.txt = 0845c733. Ship script NOT run again. Continuing to Part 2. |
| 2026-10-17 19:05 | 2 | RAN-PASSED | Read-only checks on kissansahyog.com: 6/6 groups passed (run-2; run-1 was a checker bug, fixed once). 5 app writes blocked in the browser. One HUMAN-REVIEW: tag tap does not put etag in the URL (deep link works). No rollback. evidence/prod-live/RESULT.md |
| 2026-10-17 19:08 | 3 | RAN-PASSED | Tag prod-10a -> 17d77e8 created and pushed (did not exist before). SHIP_REPORT.md rewritten as SHIPPED (earlier rolled-back attempt kept as history). |
| 2026-10-17 19:25 | 4 | RAN-PASSED | Read both notes files in full plus batch9/10a docs, migrations 0059-0063 and scripts. Appended "Batches 7L–10A (state as of this ship)" to PROJECT_CONTEXT.md (+113 lines) and a "Batch 10A production ship" section to KNOWN_ISSUES.md; no existing text changed. |
| 2026-10-17 19:30 | 5 | RAN-PASSED | Staged by explicit path only PROJECT_CONTEXT.md, KNOWN_ISSUES.md and docs/review/batch10a/ ship records (incl. 6 ship logs via -f); none over 5 MB, no secrets. Commit + push origin release-10a; no merge into main. |
