# Batch 20 - Kissan Mitra - how to ship (one step at a time, paste-ready)

Do the steps in order. Do not skip staging. Nothing here is automatic: you run every command.
Folder for all git commands: `~/projects/ks-b20`.

## Step 1 - make sure the branch is current (Batch 19 must be on main)
```
cd ~/projects/ks-b20
git fetch origin
git log origin/main --oneline | grep -i "Merge Batch 19"
```
Expected: one line "Merge Batch 19: pashupalan pages, admin picture button". If it is missing, STOP: shipping from a branch without Batch 19 would remove the pashupalan pages from the live site.
Then bring the branch up to date and re-check:
```
git merge origin/main
node --test "tests/unit/*.test.mjs"
VITE_SUPABASE_URL=https://mock.supabase.test VITE_SUPABASE_ANON_KEY=mock npm run build
```
Expected: all tests pass except the one old Batch 18 failure ("every district word and name exists..."); the build ends with "built in ...".
Print the new route count (after a full production build the script prints `Prerendered N/N`); this batch adds no route, so N should still be at least **278**. If Batch 19 added more pages since (N is higher), raise `MIN_ROUTES=` near the top of `scripts/ship-prod-20.sh` to N, so a future build that silently loses pages is stopped. Do not lower it.

## Step 2 - push and tag
```
git push origin release-20
git tag ship-20
git push origin ship-20
```

## Step 3 - STAGING database first (never skip)
1. Open the **staging** Supabase project, SQL editor. Paste the whole file `supabase/migrations/0075_kissan_mitra.sql` and run it. (It only adds; it can be run twice.)
2. Read-only checks (paste each, compare):
```
select count(*) from public.kissan_mitras;                 -- 0
select count(*) from public.kissan_mitra_payments;         -- 0
select count(*) from public.profiles where mitra_id is not null;   -- 0
select * from public.list_active_mitras();                 -- no rows
select column_name from information_schema.columns where table_name='profiles' and column_name in ('mitra_id','mitra_set_at','mitra_paid_id') order by 1;   -- 3 rows
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like '%mitra%' order by 1;   -- 9 rows
select key, value from public.site_settings where key in ('otp_required','session_enforced');   -- unchanged from before
```
3. Deploy the branch to the **staging site** the way you normally do, then on staging:
   - Admin > People > **Kissan Mitra**: add a test Mitra "TEST Mitra One", area "Test Area", rate per farmer 1. Add a second, "TEST Mitra Two".
   - Open the sign-up page: the dropdown "आपको किसने जोड़ा? (किसान मित्र)" shows both. Register a test farmer (use a test number) choosing "TEST Mitra One - Test Area".
   - Admin: TEST Mitra One shows 1 farmer, 1 unpaid, amount due Rs 1; the registration shows the phone as `******` + 4 digits.
   - **A second attempt is ignored:** in the SQL editor run `select public.set_my_mitra('<test farmer id>', '<TEST Mitra Two id>');` (get the ids with `select id, full_name from public.profiles order by created_at desc limit 3;` and `select id, display_name from public.kissan_mitras;`). Expected answer: `{"status": "already_set"}`, and the farmer stays with Mitra One. (If sessions are enforced on that database the answer is a `not_authenticated` error instead; that is also fine - it changed nothing.)
   - Click "Move to another Mitra / none" on the farmer: move to TEST Mitra Two (counts move), then to none (counts drop).
   - Move one back to Mitra One, press **Mark paid**: the dialog says "1 farmers + 0 businesses counted and unpaid", suggested Rs 1; confirm. The card shows unpaid 0, "Payments" shows one row, and "Move" on that registration now says it is already paid.
   - Switch TEST Mitra Two off: it disappears from the sign-up dropdown but stays (greyed) in the admin list.
4. Anything wrong or any SQL error: STOP, do not go to production, tell Claude the exact message.

## Step 4 - PRODUCTION
1. Production Supabase SQL editor: paste the same `0075_kissan_mitra.sql`, run, and repeat the read-only checks of step 3.2 (same expected results).
2. Dry run, then the real ship (needs `.env.production` in this folder, like the earlier ships):
```
bash scripts/ship-prod-20.sh --dry-run
bash scripts/ship-prod-20.sh
```
The script stops before any change if a check fails. It never touches the database and never sets the OTP switches.

## Step 5 - the first real Mitra
Admin > People > Kissan Mitra > "+ Add a Kissan Mitra": name, area, optional private phone, rate. Then register ONE test number choosing his name on the sign-up page, confirm it shows under his card, then move that test registration to "None" (so it is not paid for).

## Step 6 - rollback
- Site: `bash scripts/rollback-prod-20.sh <long id of the Batch 19 deployment>` (the ship script prints and records it; `--dry-run` first). The old site simply ignores the new tables.
- Database (only if you really want the Mitra tables gone): paste `supabase/migrations/rollback/0075_kissan_mitra_rollback.sql` in the SQL editor. **WARNING: this DELETES every recorded Mitra, every payment record and the "who registered this person" column.** Profiles stay.
