# Batch 11A — close report (production)

Status: SHIPPED-AND-VERIFIED. Checked 2026-10-20.

| Item | Value |
|---|---|
| Shipped commit | `7d9adc54ce42fa46f20d330939b0f3e81933dc6d` (branch `release-11a`, tags `ship-11a`, `prod-11a`) |
| New production deployment | `11f140ef-859d-419a-85ee-7f1309bb0256` |
| Previous deployment (rollback target, PREV) | `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (Batch 10C) |
| Main chunk | `/assets/index-kXKG8WUQ.js` |
| Went out together | 10D, 10E, 10F, 10G, 11A (10C was already live) |
| Step 3b prerender re-run | not needed (all page-size gates passed first time) |

## Checks
Full list: `evidence/prod-live/RESULT.md`. Passed: pages, new-code markers, OTP config and invalid-number probe, login layout, earlier batches, SEO files. HUMAN-REVIEW: home-page mandi ticker glyphs in narrow screenshots; any founder OTP test on production. NOT-RUN by rule: OTP sign-in/up and session enforcement on production. NOT-VERIFIED: mandi backfill (needs a database read).

## Database
Ship log probes: 0064 present, 0065 present, 0066 present (probes answered as expected, nothing written). Switches at close: `otp_required` = true, `session_enforced` = false.

## Undo order
1. Turn both switches OFF (SHIP.md step 10.1).
2. `bash scripts/rollback-prod-11a.sh 7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`
3. `PROD_ROLLBACK_0066.sql` only if really needed. No rollback SQL for 0064/0065.

No `prod-10e` / `prod-10f` / `prod-10g` tags: those batches only went out inside this ship.
