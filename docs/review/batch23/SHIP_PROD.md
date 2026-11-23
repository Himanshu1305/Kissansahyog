# Batch 23 - SHIP TO PRODUCTION (kissansahyog.com), one step at a time

Plain words first: **this ship has no database change. The OTP switches are never touched. The script rolls back by itself if a check fails.** It only deploys the site (and the daily-check workflow goes to `main` with the push in step B).

Do the steps in order, in **Git Bash**, in `~/projects/ks-b20`. Stop at the first thing that looks wrong and send it to Claude. Nothing in this list was run by Claude: nothing was pushed, deployed, migrated or written to any database while preparing it.

---

## A. Look at it on your own computer first (optional, recommended because staging is down)

```bash
cd ~/projects/ks-b20 && git checkout release-23 && npm run build:prod
```
This builds with the production settings (several minutes). Then start a local preview of that build:
```bash
npx vite preview --port 4173
```
Open `http://localhost:4173` in your browser. The preview **only READS** production prices (the same public read the live site does); nothing is written anywhere. Stop it with **Ctrl+C**.

What to look at:
1. Home page: the green scrolling strip shows a **mandi name next to every price** and a small label on the left: "आज का भाव", or "कल का भाव (dd/mm)", or "पिछला भाव (dd/mm)" (dd/mm is the real date of those prices).
2. Open `/msp`: for the same crop (say चना) it shows the **same price and the same mandi name** as the strip.
3. Right-click -> View page source on `/` and `/msp`, press Ctrl+F: **`कल का भाव` and `पिछला भाव` must give 0 results**. You will only see the neutral "आज का भाव देखें".

If sign-in / OTP or other server (`/api/...`) things do not work in the local preview, that is expected and unrelated (those run on Cloudflare, not in the preview).

## B. Put `release-23` on `main` (this does NOT change the live site)

```bash
git fetch origin && git rev-parse origin/main
```
The line printed **must be** `e46b586a5aff310fcc7cff98e5f0d0aeca4e6ebc`. If it is different, stop and tell Claude. If it is right, paste this one command:
```bash
git checkout release-23 && [ "$(git rev-parse origin/main)" = "e46b586a5aff310fcc7cff98e5f0d0aeca4e6ebc" ] && git merge-base --is-ancestor origin/main release-23 && git push origin release-23:main && git fetch origin && git rev-parse HEAD origin/main || echo "STOPPED - a check or the push failed (read the lines above). Do not go on."
```
The last two lines it prints must be **two identical hashes**. The push does **not** change the live site; it only puts the new daily-check workflow on `main` (GitHub runs scheduled workflows only from `main`).

## C. Dry run (builds the site here, checks everything, deploys nothing)

```bash
bash scripts/ship-prod-23.sh --dry-run 2>&1 | tail -60
```
It takes several minutes (it does the production build). Look for:
- the last line **`DRY RUN OK`** with **no "(N pending)"** after it and no "WARNING (pending" lines;
- `all four Batch 22 markers are in the live chunks`, `PASS  [price_data]`, `PASS  [db]` x4;
- if it says the live deployment is not the expected one, it prints the id it found: if that is really the Batch 22 deployment, run again with `bash scripts/ship-prod-23.sh --dry-run --expect-live <that long id> 2>&1 | tail -60`;
- if wrangler asks you to log in: `npx wrangler login`, and answer **`n`** to the "Cloudflare skills" question.

## D. The real ship

```bash
bash scripts/ship-prod-23.sh 2>&1 | tail -60
```
Expect **`SHIP OK`**. The previous deployment id (the rollback target) is printed in that block ("Previous deployment (rollback target): ...") and saved in `docs/review/batch23/evidence/prod-ship/prod-deployment-before.txt`. If any check fails after the deploy, the script rolls back **by itself** and says so in plain words ("the new version was NOT kept").

## E. Five-line check on the live site (hard refresh first: Ctrl+F5)

1. Home page: the green strip shows prices **with a mandi name and a label** ("आज का भाव" / "कल का भाव (dd/mm)" / "पिछला भाव (dd/mm)").
2. `/msp`: for one crop (say चना) it shows the **same price and mandi** as the strip.
3. View page source of `/`: Ctrl+F `कल का भाव` -> **0 results** (same for `/msp`).
4. The sign-up page opens, and **Admin > Kissan Mitra** (Batch 22) still opens.
5. The rest of the site works (browse a page or two, switch Hindi/English).

## F. GitHub: the daily price check

GitHub -> **Actions** -> **"Refresh Mandi Prices"** -> **Run workflow** (branch **`main`**). The **production** job must be green and its **Summary** tab shows the small table (date, rows, mandis, crops).

From now on a **red** run means a real price problem. Before **14:00 IST** a thin or late day is only a **warning**; the first run that can fail is the **15:47 IST** one (then 17:47, 19:47, 21:47, 23:47). The staging job may stay red until staging storage is cleaned (`STAGING_STORAGE.md`); that does not make the whole run red.

## G. Rollback (only if you want the old site back)

First look (changes nothing):
```bash
bash scripts/rollback-prod-23.sh --dry-run
```
Then, to really roll back to the Batch 22 deployment (the id the ship printed in step D, or leave it out to use the recorded one):
```bash
bash scripts/rollback-prod-23.sh <long id of the previous deployment>
```
**No database step is needed** (this batch has no migration). The old site simply shows the old price strip again. The daily-check workflow on `main` is **not** undone by a site rollback; to undo it, revert that one file (`.github/workflows/refresh-mandi-prices.yml`) in git and push it to `main`.
