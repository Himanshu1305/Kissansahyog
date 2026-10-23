# Batch 15A - SHIP (founder checklist, one step each, in this order)

Branch `release-15a` (from `release-14a`). Ship tag `ship-15a` = the final head.
**What it adds:** on `/msp/<crop>` the "पिछले 5 सालों में महीने के हिसाब से औसत Modal भाव" chart opens, and a new block "5 साल का औसत बनाम आज" appears after the trend chart. Both read ten years of monthly prices (2016-01 to 2025-10) from a new table. Past averages only; nothing predicts a price.
**This batch changes the database** (migration 0069: ONE new table, nothing existing is touched; `mandi_prices` is not touched). Your two switches stay as they are: `otp_required` ON, `session_enforced` OFF. Nothing here changes them.

Load the data into production **before** the ship (steps 1 to 4), so the chart is there on day one. The ship itself is safe either way: if the table is still empty, the two new sections simply stay hidden and /msp looks exactly as it does today. If the table does not exist at all, the ship script stops and changes nothing.

## 1. Create the table (PRODUCTION, once)
1. Open https://supabase.com/dashboard/project/eltmcznjcqiahqhjvpjg/sql/new - **check the address says `eltmcznjcqiahqhjvpjg`** (that is production; staging is `wzxtqbqlahyahsnoqqva`).
2. Open `docs/review/batch15a/PROD_MIGRATION_0069.sql` in VS Code, select all, copy, paste straight into the SQL editor (do not retype and do not paste through a chat or document: the file is plain English letters only), press **Run**. Running it twice is safe.
3. It must say "Success".

## 2. Check it is empty
Paste the contents of `docs/review/batch15a/history-prod/verify.sql` and Run. Result: no rows in the first table and `total_rows = 0`.

## 3. Load the data (several small parts, one at a time)
For each file `docs/review/batch15a/history-prod/part-01.sql`, `part-02.sql`, ... up to the last part: open it, select all, copy, paste into the SQL editor, Run. Each must say "Success". A part can be run twice safely (rows that are already there are skipped). Do them in order.

## 4. Check the numbers
Run `verify.sql` again. The counts per crop and scope must match `docs/review/batch15a/DATA_CHECK.md` (and `history-prod/expected-counts.json`), and `total_rows` must match the total in `DATA_CHECK.md`. If a number differs, stop and tell the builder.

## 5. Ship the website
0. The builder has committed the work on branch `release-15a` but has NOT pushed it or tagged it. The ship script refuses to run for real until both are done. Run (or ask the architect to run): `git push origin release-15a`, then `git tag ship-15a`, then `git push origin ship-15a`.
1. `bash scripts/ship-prod-15a.sh --dry-run` - must end with `DRY RUN OK`. (A dry run does not touch the database; it lists one thing as pending: the table check, which a real run does.)
2. `bash scripts/ship-prod-15a.sh 2>&1 | tee docs/review/batch15a/evidence/ship-real.log` - ends with `SHIP OK`. If any check fails it puts the old version back by itself and says so. If it stops with "migration 0069 is NOT applied", do step 1 first.

## 6. Live check (2 minutes)
Open https://kissansahyog.com/msp/chana on the phone. You should see (open the sections if they are folded): "पिछले 5 सालों में महीने के हिसाब से औसत Modal भाव" with 12 bars, and "5 साल का औसत बनाम आज" with the average, today's price, the percent gap, the yearly values and the sentence "कटाई के समय भाव आज जितने ही रहेंगे, यह मानकर न चलें। यह पिछले सालों का औसत है, अनुमान नहीं।". Please also look at the Hindi wording (human review).

## Undo
`bash scripts/rollback-prod-15a.sh <previous deployment id>` (the ship prints it; it is the Batch 14A one, `3c5b9bbf-ec87-4766-9c65-9136affcbd79`). No database step is needed for the website rollback. `supabase/migrations/rollback/0069_mandi_monthly_history_rollback.sql` (drops the table and its data) is optional and is never run by a script.
