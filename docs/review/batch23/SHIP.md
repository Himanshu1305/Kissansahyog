# Batch 23 - SHIP (STAGING ONLY, one step at a time)

Nothing here touches production. Nothing was pushed, deployed, migrated or written to any database by Claude. There is **no migration** in this batch.

**Before you start - read this honestly:** the staging Supabase project is over its storage quota and restricted. Staging reads may be limited or fail until `STAGING_STORAGE.md` is done, so some checks below may show "no data" on staging for a reason that has nothing to do with this batch. Do `STAGING_STORAGE.md` first if you can.

## Step 1 - put the branch on GitHub
```bash
git push origin release-23
```
(Claude did not push.)

## Step 2 - deploy `release-23` to the staging site the way you normally do
Then open the staging site on your phone (or a narrow desktop window). Do the six checks one by one:

1. **A mandi name next to every price.** Home page: look at the green scrolling strip. Every price (for example "चना ₹7,400 · अजयगढ़") ends with a mandi name, with a small badge on the left ("आज का भाव", "कल का भाव (dd/mm)" or "पिछला भाव (dd/mm)").
2. **Same number on home and /msp.** Pick a crop in the strip (say चना) and note the price and mandi. Open `/msp`: in "सभी फसलें" the same crop must show the **same price and the same mandi name** under it.
3. **View-source of `/` and `/msp`.** In the browser: right-click -> View page source (or add `view-source:` before the address). Search the page (Ctrl+F) for `कल का भाव` and `पिछला भाव`: **0 results**. You should only see "आज का भाव देखें" (a neutral line), no `₹` price in the strip area and no old date.
4. **The label words.** today = "आज का भाव"; yesterday = "कल का भाव (dd/mm)"; older = "पिछला भाव (dd/mm)". The dd/mm is the real date of the prices. Switch the language to English: "Today's price" / "Yesterday's price (dd/mm)" / "Previous price (dd/mm)".
5. **Monday behaviour (cannot be tested today).** On a Monday the old site showed thin Sunday prices; the new rule skips a thin day and shows the last full day (Saturday) with Saturday's real date. You cannot reproduce a Monday on a Sunday, so it is **proven by the unit tests** (`tests/unit/mandi-pick-23.test.mjs`, cases a-h) and by the replay on real production rows (`evidence/replay-pick.txt`). One caution: with the thresholds as written (5 crops) a Sunday that has 6 crops still counts as "full" - see `DECISIONS.md` section 8.
6. **The workflow run.** On GitHub -> Actions -> "Refresh Mandi Prices": the run must be **green** even if `refresh (staging)` is still red (staging is allowed to fail for now). After `STAGING_STORAGE.md` is done, `refresh (staging)` must turn green too. The production job's "Summary" tab shows the new small table (date, rows, mandis, crops). Note: GitHub only runs the scheduled workflow from `main`, so this check only shows the new rules after the later merge to `main`; on `release-23` you can run it by hand ("Run workflow", branch `release-23`).

## Step 3 - tell Claude what you saw
Paste anything odd. The production ship (`ship-prod-23.sh`) is a separate job, see `SHIP_NOTES.md`.
