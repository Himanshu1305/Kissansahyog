# Batch 22 - go LIVE on production (Mitra at the offer, Mitra on ads, Mitra statement)

**Read this first.** Production gets the **database files BEFORE the site**: steps B and C (database) come first, then D-F (site). The script in step F refuses to build or deploy if the database files are not there. **The OTP switches are never touched** (the script only reads them, before and after, and they must be the same).

Do ONE step at a time. Stop at the first thing that does not look right and ask. All commands are for Git Bash in `~/projects/ks-b20`.

Before you start: staging already has 0076 and 0077 and was tested (SHIP.md steps 1-3).

---

## A. Read-only check on PRODUCTION (changes nothing)
Open the **production** project (`eltmcznjcqiahqhjvpjg`) > SQL editor, paste, run:

```sql
select
  count(*) filter (where p.mitra_id is not null) as profiles_with_a_mitra,
  count(*) filter (where p.mitra_id is not null and exists (
    select 1 from public.listings l
     where l.user_id = p.id and l.listing_type = 'offer' and l.status <> 'removed' and l.admin_disabled_at is null
  )) as of_those_who_have_offered
from public.profiles p;
```
- It errors with **"column mitra_id does not exist"**: **STOP.** Migration `0075` is missing on production. Do not go on.
- Second number **0**: nothing changes for anyone when 0076 is applied. Go to B.
- Second number **above 0**: those people start counting (and become payable) the moment 0076 is applied. **Decide with me first.**

## B. Apply `0076_mitra_at_offer.sql` on PRODUCTION
Open `supabase/migrations/0076_mitra_at_offer.sql`, copy all of it, paste it into the **production** SQL editor, run.
Expect: **Success. No rows returned.**

## C. Apply `0077_mitra_statement.sql` on PRODUCTION
Same way with `supabase/migrations/0077_mitra_statement.sql`. Expect: **Success. No rows returned.**

## D. Push the code to `origin/main`
First show where `origin/main` is now, and compare it with the number in the guard line below:
```bash
cd ~/projects/ks-b20
git fetch origin
git rev-parse origin/main
```
It must print `23de6b725c730d5daf7f6913c11675e80eddf251`. If it prints anything else, **stop and ask** (someone pushed). If it matches, paste this block:
```bash
[ "$(git rev-parse origin/main)" = "23de6b725c730d5daf7f6913c11675e80eddf251" ] || { echo "origin/main moved - stop and ask"; exit 1; }
git merge-base --is-ancestor origin/main merge-22 && echo "merge-22 contains origin/main: OK" || { echo "merge-22 does not contain origin/main - stop"; exit 1; }
git push origin merge-22:main
git checkout merge-22
git fetch origin
git rev-parse HEAD origin/main
```
The last command prints two identical lines. (Nothing goes live on a push; the site changes only in step F.)

## E. Dry run (changes nothing, deploys nothing)
```bash
bash scripts/ship-prod-22.sh --dry-run
```
Read the end. You want **`DRY RUN OK`** and no "pending" lines. It prints the live deployment id it found. If it says the live deployment is not the expected Batch 20 one, check the Cloudflare dashboard; if the printed id is the right one to replace, use it in step F as `--expect-live <that id>`. If it says the database is not ready, go back to B and C.

## F. The real ship
```bash
bash scripts/ship-prod-22.sh
```
(or `bash scripts/ship-prod-22.sh --expect-live <id>` if step E told you to). It builds, deploys, checks the live site, and **rolls back by itself** if a check fails. You want **`SHIP OK`**. It prints the previous deployment id (your rollback target).

## G. After it is live - a 5-line check on production
1. Sign-up page: **no** "Kissan Mitra" dropdown.
2. Admin > People > **Kissan Mitra** opens and shows the Mitra cards.
3. Press **Statement** on a Mitra: it opens (totals, rows, CSV button).
4. A person with **no offer yet** (and no Mitra): Offer a service > last step shows the Mitra dropdown.
5. The farmer site works as before (home, a mandi page, a listing, sign-in with OTP).

## H. Roll back (the one command)
```bash
bash scripts/rollback-prod-22.sh <long id of the previous deployment>
```
Add `--dry-run` first to see what it would do. The id is printed at the end of step F (also saved in `docs/review/batch22/evidence/prod-ship/prod-deployment-before.txt`; the Batch 20 deployment is `e2b01aeb-b5a7-4df3-b66b-988e9625546f`).
The old site ignores the new database objects, so **a site rollback needs no database change.** Optional, by hand in the production SQL editor, **0077 first**: `supabase/migrations/rollback/0077_mitra_statement_rollback.sql` (loses no data), then `supabase/migrations/rollback/0076_mitra_at_offer_rollback.sql` (**deletes** the ad-to-Mitra links; Mitras already saved on profiles stay).
