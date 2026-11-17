# Batch 22 - Kissan Mitra moves from sign-up to "offering a service" and to ads

## What changed (plain words)
- **Sign-up** no longer has the Kissan Mitra dropdown.
- **Offer a service** (last step, before the consent boxes): a farmer sees "Did a Kissan Mitra help you offer this? (optional)" ONLY on their FIRST offer, and only if they have no Mitra yet and have never made an offer before (a removed or closed old offer still counts as "made"). Never for "requirement" posts. Old farmers who already offered are NOT linked to any Mitra.
- **Ads**: in the announcement form the admin can pick "Kissan Mitra who brought this ad" (optional). Every announcement with a Mitra counts as one ad for that Mitra.
- **Admin Mitra panel**: wording is now "service offers" and "ads". A Mitra's detail view lists people (with "not counted yet" and the number of offers) and ads.
- **Counting rule**: a farmer counts for a Mitra only after they have offered a service (paid once, at the first offer), and each ad with a Mitra counts as one ad. Farmers linked at registration (Batch 20) who never offered are not counted and not paid; they count the day they offer.
- New database file: `supabase/migrations/0076_mitra_at_offer.sql` (+ rollback). Needs 0075 first.

## STEP 0 - read-only check (run on staging AND production BEFORE applying 0076)
Paste in the Supabase SQL editor (SELECT only, changes nothing):

```sql
select
  count(*) filter (where p.mitra_id is not null) as profiles_with_a_mitra,
  count(*) filter (where p.mitra_id is not null and exists (
    select 1 from public.listings l
     where l.user_id = p.id and l.listing_type = 'offer' and l.status <> 'removed' and l.admin_disabled_at is null
  )) as of_those_who_have_offered
from public.profiles p;
```
- If the **second number is 0**: nothing changes for anyone when 0076 is applied.
- If it is **above 0**: those people will start counting (and become payable) the moment 0076 is applied. Decide first whether they should count.

## Exact order
1. Run STEP 0 on staging (`wzxtqbqlahyahsnoqqva`). Decide if needed.
2. Apply `0076_mitra_at_offer.sql` on **staging**.
3. Test on staging:
   1. Register a new farmer: no Mitra dropdown on sign-up.
   2. Post a first service offer (not a requirement): the Mitra dropdown shows on the last step; pick a Mitra; post.
   3. Admin > People > Kissan Mitra: that Mitra now shows 1 farmer (counted the same day).
   4. Post a second offer with the same farmer: no dropdown.
   5. An older farmer who already has an offer: no dropdown. A registered farmer with no offer: dropdown shows.
   6. Admin > Content > announcement: add or edit an ad, pick the Mitra, save; the list shows a chip; the Mitra panel shows 1 ad.
   7. Mitra panel: "Mark paid" (farmers + ads are stamped together); check the payment history shows both counts.
4. Run STEP 0 on **production** (`eltmcznjcqiahqhjvpjg`), decide, then apply 0076 on production, only after step 3 looks right.
5. Only then push the app (see the merge block below). Do NOT deploy the app to production before 0076 is applied there: the offer form would call functions that do not exist yet (it fails quietly by design, but the Mitra would not be saved).

## Roll back
Run `supabase/migrations/rollback/0076_mitra_at_offer_rollback.sql` (re-creates the four 0075 functions, drops the 0076 functions, and DELETES the ad-to-Mitra links). Mitras saved on first offers stay on the profiles. The app keeps working (the field hides itself when the check fails).

## NOT done
- A business/vendor sign-up type.
- Mitra on sponsored listings (`is_sponsored` untouched).
- Any online payment (payments are only recorded; money is paid outside).
- Hard-deleted offers (the seller's "delete permanently") are not remembered, see DECISIONS.md.

## Tests
See the report; evidence in `docs/review/batch22/evidence`.

## Merge and push (one paste-ready Git Bash block)
Local `main` is stale (79 behind), so the merge was prepared on the branch `merge-22` (= `origin/main` + `release-22`, `--no-ff`). Its tree is identical to `release-22`, which passed the full suite and the build. `origin/main` had not moved when this was prepared (23de6b7).

```bash
cd ~/projects/ks-b20
git fetch origin
# guard: stop if origin/main moved since Batch 21
[ "$(git rev-parse origin/main)" = "23de6b725c730d5daf7f6913c11675e80eddf251" ] || { echo "origin/main moved - stop and ask"; exit 1; }
git log merge-22 --oneline -3
git merge-base --is-ancestor origin/main merge-22 && echo "merge-22 contains origin/main: OK"
git push origin merge-22:main
git log origin/main --oneline -5
```
Reminder: nothing deploys on a push to main. The database file is applied by hand (staging first). Do NOT deploy the app to production before 0076 is applied there.
