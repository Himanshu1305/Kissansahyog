# Batch 10E — SHIP (founder checklist)

Production has NOT been changed by Batch 10E. Everything below is for you (the founder) to run, **in this order**.

**Why the order differs from the brief's numbering.** The brief lists: (1) staging, (2) migration, (3) mandi backfill, (4) dry run, (5) ship, (6) undo, (7) close prompt. Two rules change the real order:
- The migration (brief item 2) must be in the production database **before** the new website goes live, because the new sign-up form calls `app_register_phone` (DECISIONS 31–32). The ship script checks this and refuses to deploy without it.
- The mandi backfill (brief item 3) must be pasted **after** the new website is live, because only the new `/msp` code reads more than 1,000 rows (paged reads, DECISIONS 21, 23, 29). With the old code live, the 90-day chart and the market search would be cut short.

So you run: brief 1 → 2 → 4 → 5 → 3 → 7. Brief item 6 (undo) is only for when something is wrong. The steps below are numbered in that run order, with the brief's item number in brackets.

**Batch 10D goes out with 10E.** `release-10e` contains 10C + 10D + 10E. If 10D was never shipped on its own, this ship puts the 10D live homepage on kissansahyog.com too. The script accepts either version as the one being replaced, and prints which one is live: Batch 10C `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`, or the 10D deployment named in `docs/review/batch10d/CLOSE_REPORT.md` if 10D shipped first.

**Ship tag: `ship-10e`.** The orchestrator puts it on the final commit and pushes it. Do not use `pre-10e-ship`: that is an older safety tag on the 10D head (`e81a100`) and must not be moved.

---

## Step 1 [brief 1] — staging: upload, then look at it on your phone

STAGING: <filled by orchestrator>

If the line above says it was NOT uploaded, run this once from the repo folder (Git Bash). It builds with the STAGING settings and uploads to staging only:

```
git checkout release-10e && git pull
node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true
```

Open **https://staging.kissansahyog.com** on your phone and check:
1. **Sign-up without email** (`/signup`): only name, mobile, village/town, the "show my details" choice and the notice tick. There is no email or password box. You may sign up on STAGING with a test name starting "KSTEST".
2. **Login line** (`/login`): under the title, "📱 ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें". Tapping it jumps to the mobile box.
3. **Post form** (`/post`, after login): pick equipment, land, labour or drone didi.
   - Step 2 has the date box: "कब से उपलब्ध *" (or "कब चाहिए *"), the आज / कल / परसों buttons, "📅 तारीख़ चुनें", and "कब तक (वैकल्पिक)".
   - You cannot go on without a start date, and a past date is refused.
   - The "अतिरिक्त जानकारी (वैकल्पिक)" box takes 300 characters and refuses a phone number.
4. **A listing photo**: open a listing that has a photo (or post one on staging with a photo). The photo shows on the card and on the detail page, not an empty box.
5. **/msp tabs with dates** (`/msp`, then a crop such as wheat): each of the 7 / 30 / 90 दिन tabs shows its date range (e.g. "18 सित – 17 अक्टू"). The chart shows the first and last dates. The sentence reads like "30 दिन में (…) भाव ₹… गिरा/बढ़ा". 90 days covers more than 30.
6. **Home tiles**: the photo tiles are links. The pointer becomes a hand on a computer, and hovering shows a glow/ring.
7. **Kisan Mela teaser** on the home page: only Madhya Pradesh first, then UP / Maharashtra / Chhattisgarh / Gujarat / Rajasthan melas. If none are listed, the whole section is hidden.
8. **Guide "how to post" demo** (`/guide/post`) has two new steps:
   - "कब उपलब्ध है" — tap "आज", then "जब तक चाहें" lights up.
   - "फोटो जोड़ें" — a drawn tractor picture "उदाहरण फोटो" appears, and the count goes 0/3 → 1/3.
   - The finish card says "सीताराम 🙏".

---

## Step 2 [brief 2] — PRODUCTION database: add the phone-only sign-up function (migration 0064)

**Do this BEFORE step 4.** The ship script checks for this function and stops before deploying if it is missing. The change only ADDS one new function: no table, column, policy or existing function changes.

1. Open https://supabase.com/dashboard and choose the **PRODUCTION** project (ref `eltmcznjcqiahqhjvpjg`). Do **not** choose staging (`wzxtqbqlahyahsnoqqva`).
2. Left menu → **SQL Editor** → **New query**.
3. Paste the whole SQL below. It is identical to `supabase/migrations/0064_app_register_phone.sql`. Then press **Run**.
4. Expected result: "Success. No rows returned".
5. Check it worked with a new query: `select proname from pg_proc where proname = 'app_register_phone';` → **exactly one row** `app_register_phone`.

```sql
-- 0064_app_register_phone.sql — Batch 10E Phase 3A: sign-up with name + mobile only (no email).
--
-- What this adds (ADDITIVE — no table, column, policy or existing function is changed)
--   * public.app_register_phone(...)  (new)  creates a phone-only profile: email NULL, auth_uid NULL,
--                                       auth_provider = 'phone'. Same 8 parameters and same visibility
--                                       choice (profiles.consents -> 'details_visibility') as
--                                       app_register (0060), but it needs no Supabase Auth session.
--     Checks: name not empty (name_required), mobile = exactly 10 digits after removing spaces
--     (invalid_phone), acknowledgment accepted (disclaimer_not_accepted), mobile not already on a
--     profile (phone_exists, also on a unique_violation race). Coordinates out of range are dropped.
--     It never sets is_admin, so no admin account can be created or reached through it; admins still
--     sign in only by email + password (0059 app_login refuses admins on the mobile path).
--   The app then signs the new user in exactly like a mobile login (the returned profile is the
--   local session, as app_login's is). Trust-based until OTP ships (same as mobile login today).
--
-- Relies on: profiles.email nullable and profiles.phone UNIQUE (profiles_phone_key), both already true.
--
-- STAGING: already applied by the founder (Cowork) before Batch 10E. This file reproduces the live
-- staging definition exactly (pg_get_functiondef, read-only, 2026-10-18) plus its grants.
-- PRODUCTION: not applied yet; the step is in docs/review/batch10e/SHIP.md.
-- Rollback: supabase/migrations/rollback/0064_app_register_phone_rollback.sql (drops the function).

CREATE OR REPLACE FUNCTION public.app_register_phone(p_full_name text, p_phone text, p_village_town text, p_latitude numeric, p_longitude numeric, p_language text, p_disclaimer_accepted boolean, p_show_details boolean)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_phone      text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang       text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat        numeric := p_latitude;
  v_lng        numeric := p_longitude;
  v_profile    public.profiles%rowtype;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if p_disclaimer_accepted is not true then
    raise exception 'disclaimer_not_accepted';
  end if;
  if v_lat is null or v_lng is null or abs(v_lat) > 90 or abs(v_lng) > 180 then
    v_lat := null;
    v_lng := null;
  end if;

  if exists (select 1 from public.profiles where phone = v_phone) then
    raise exception 'phone_exists';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, email, auth_uid, auth_provider,
      village_town, pincode, latitude, longitude, preferred_language,
      disclaimer_accepted_at, consents
    ) values (
      trim(p_full_name), v_phone, null, null, 'phone',
      nullif(trim(coalesce(p_village_town, '')), ''), null, v_lat, v_lng, v_lang,
      now(),
      jsonb_build_object('details_visibility', jsonb_build_object(
        'choice', case when p_show_details is false then 'hidden' else 'show' end,
        'chosen_at', now()::text,
        'version', '2026-10'
      ))
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'phone_exists';
  end;

  return v_profile;
end;
$function$
;

revoke all on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) from public;
grant execute on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) to anon, authenticated, service_role;
```

**Rollback of step 2.** Only needed if you want the function gone. First roll the website back (Undo below), so that no live page calls the function, and only then run this in the same SQL editor of the PRODUCTION project. It is identical to `supabase/migrations/rollback/0064_app_register_phone_rollback.sql`. Accounts already created stay and can still log in by mobile.

```sql
-- ROLLBACK of 0064_app_register_phone.sql (Batch 10E Phase 3A). Removes the phone-only sign-up function.
-- Profiles it already created stay (they are ordinary phone profiles; mobile login keeps working for them).
-- Deploy an app build whose sign-up form no longer calls app_register_phone BEFORE running this.

drop function if exists public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean);
```

---

## Step 3 [brief 4] — dry run (changes nothing)

```
git checkout release-10e && git pull
bash scripts/ship-prod-10e.sh --dry-run
```

It must end with **`DRY RUN OK`** and show **no "Pending" lines**.
- The probe line should say "migration 0064 is on production". The script checks this by calling `app_register_phone` with an empty name: the function refuses with `name_required` before it could save anything.
- The script prints which version is live now (10C or 10D). That id is the **rollback target**: write it down.
- If the snapshot file `docs/review/batch10e/evidence/prod-before.json` is missing, the dry run creates it. It does this with read-only page loads of the live site.

---

## Step 4 [brief 5] — the real ship

```
bash scripts/ship-prod-10e.sh 2>&1 | tee docs/review/batch10e/evidence/ship-real.log
```

The script runs these steps itself:
1. It checks again that migration 0064 is on production.
2. It builds with the production settings and runs the checks: no localhost links, no staging references, and the photo rule present.
3. It deploys.
4. It runs read-only checks on the live site:
   - `/`, `/signup`, `/browse`, `/guide`, `/msp`, `/post` and `/guide/post` all answer and serve the new build.
   - The 10C/10D/10E markers are there.
   - The photo security header allows the production storage host.

If any check fails, it **rolls back by itself** and tells you. On success it prints `SHIP OK` and the rollback target.

---

## Step 5 [brief 3] — PRODUCTION database: mandi price history backfill

**Only AFTER step 4 printed `SHIP OK`.** Do not paste these if the ship rolled back: the old `/msp` code reads only 1,000 rows. The files are in `docs/review/batch10e/backfill-prod/` (details in its `README.md`). They add 8,625 real Agmarknet prices (data.gov.in, GODL licence) for Sagar Division, 2026-06-20 … 2026-10-17. They only INSERT and never change or delete a row. They are safe to re-run, and a part that fails changes nothing.

Supabase dashboard → **PRODUCTION** project → **SQL Editor**. Open each file, paste it whole, press **Run**, one at a time, in this order:
1. `verify.sql` (read-only): note the numbers.
2. `part-01.sql`
3. `part-02.sql`
4. `part-03.sql`
5. `part-04.sql`
6. `part-05.sql`
7. `part-06.sql`
8. `part-07.sql`
9. `part-08.sql`
10. `part-09.sql`
11. `part-10.sql`
12. `part-11.sql`
13. `part-12.sql`
14. `part-13.sql`
15. `part-14.sql`
16. `part-15.sql`
17. `part-16.sql`
18. `part-17.sql`
19. `part-18.sql`
20. `verify.sql` again. In the `sagar_division` rows, days and first/last dates should now be about what the table in `backfill-prod/README.md` shows (e.g. Wheat 119 days, 2026-06-20 … 2026-10-17).

Then open https://kissansahyog.com/msp/wheat. The 90 दिन tab should now cover more days than the 30 दिन tab.

---

## Step 6 [brief 7] — close: paste `BATCH10E_CLOSE_PROMPT.md`

Paste the content of `BATCH10E_CLOSE_PROMPT.md` (repo root) into Claude Code. It checks the live site **read-only** and does no sign-ups, logins or submits on production. It then tags `prod-10e` and updates the project notes.

---

## Undo [brief 6] — only if something is wrong

```
bash scripts/rollback-prod-10e.sh <previous deployment id>
```

The ship script prints the previous deployment id as the "rollback target" in the dry run, at the start of the real run, and at the end. It also saves it in `docs/review/batch10e/evidence/prod-ship/prod-deployment-before.txt`. **Today that id is `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (Batch 10C), unless Batch 10D ships first.** In that case it is the 10D deployment id from `docs/review/batch10d/CLOSE_REPORT.md`.

A website rollback does not touch the database:
- Migration 0064 and the backfill rows stay. Both only add things, and the older website works with them.
- Remove 0064 only with the rollback SQL in step 2, and only after the website rollback.

---

## HUMAN-REVIEW notes

- **GODL attribution wording on /msp.** The source is credited as "Agmarknet / data.gov.in" in the /msp explanation (`msp_explain_2`) and the footer. The GODL licence requires attribution. Please confirm the wording is enough, or tell us to name the licence too.
- Hindi wording of all new text: `docs/review/batch10e/HINDI_CAPTIONS.md`.
- Phone-only sign-up and mobile login are trust-based until OTP ships (same as mobile login today).

## What the scripts do differently from the 10D ones

| | 10D | 10E |
|---|---|---|
| Branch / tag | `release-10d` / `pre-10d-ship` | `release-10e` / **`ship-10e`** |
| Live deployment accepted | only 10C `7f5dc56a-…` | 10C `7f5dc56a-…` **or** the 10D id from `docs/review/batch10d/CLOSE_REPORT.md` (here or on `origin/release-10d`) **or** `KS_EXPECT_LIVE_ID`; prints which one is live; that id is the rollback target |
| Database | none | step D before anything is built: read-only probe of `app_register_phone` on production (expects HTTP 400 `name_required`; missing → stop + the migration steps) |
| Snapshot | `batch10d/evidence/prod-before.json` had to exist | `batch10e/evidence/prod-before.json` is taken by the script (read-only) if missing or taken of another deployment |
| Dist checks | raw `grep -r wzxtqbqlahyahsnoqqva dist` | `check-prod-env --dist` + `check-no-localhost-dist` + staging-ref grep that ignores only the two CSP img-src host tokens in `dist/_headers` + `_headers` img-src must list the prod storage host; 10E marker (`app_register_phone` in a chunk) |
| Routes after deploy | `/ /signup /browse /guide` | `/ /signup /browse /guide /msp /post /guide/post` (redirects followed; final 200 + new main chunk) + live CSP img-src header contains `https://eltmcznjcqiahqhjvpjg.supabase.co` + sign-up chunk served |
| Kept | | `--dry-run`, read-only gates, `--max-growth root=1.40,browse=1.40`, here-string greps, automatic rollback, token never printed, `build:prod`, prerender 268/268 |

`KS_SKIP_DB_PROBE=1` skips the database probe **in a dry run only** (listed as pending). A real run always probes.

## Status

- `bash -n scripts/ship-prod-10e.sh` and `bash -n scripts/rollback-prod-10e.sh`: RAN-PASSED.
- Dry run: <filled by orchestrator>
- Real production ship: NOT-RUN (founder runs it).
