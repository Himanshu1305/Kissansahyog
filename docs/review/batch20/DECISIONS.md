# Batch 20 - Kissan Mitra: decisions and what is (not) verified

Branch `release-20`, made from `origin/main` at `66f1bac` (Batch 19 merge). Hindi **किसान मित्र**, English **Kissan Mitra**.

## What was built
- **Database (written, NOT run anywhere):** `supabase/migrations/0075_kissan_mitra.sql` (0074 was the newest, 0075 is the next free number) and its rollback `supabase/migrations/rollback/0075_kissan_mitra_rollback.sql`.
- **Sign-up:** one optional dropdown "आपको किसने जोड़ा? (किसान मित्र)" under the village field. First option "कोई नहीं / None". Hidden while loading, when the list is empty and when the call fails.
- **Admin:** a "Kissan Mitra" panel in the People tab (search words: `mitra mitr field agent किसान मित्र एजेंट`). Add, edit, switch off, counts, amount due, registrations view with masked phones, move/reassign, mark paid, payments ledger, CSV without phones.
- **Reference model:** `scripts/batch20/mitra-model.mjs` (pure JavaScript copy of the counting, mark-paid, reassign and 15-minute rules) with `tests/unit/mitra-20-model.test.mjs`.

## Founder decisions, and how each is met
1. Optional dropdown, default None - `MitraField.jsx`, state only.
2. Locked after saving - `set_my_mitra` only writes when `mitra_id is null` and the account is under 15 minutes old; only `admin_reassign_registration` can change it afterwards.
3. Admin adds / edits / switches off; never deleted - there is no delete function; inactive Mitras leave the dropdown (`list_active_mitras` returns only active ones) but stay in the admin list.
4. Area is a short text. The dropdown shows "Name - area".
5. **No approval layer.** No status column, no queue, no reject/approve. *Counted* = attributed to the Mitra and the profile is not blocked. *Unpaid* = `mitra_paid_id is null`. A fake entry is moved to "None" with the reassign button, which removes it from the count. A test checks the SQL and screens contain none of those words.
6. Duplicates: nothing added for the mobile number (already unique). Same name is not blocked; the registrations view shows the small note "same name and village as another farmer".
7. Payment ledger: `kissan_mitra_payments`; `admin_mark_mitra_paid` creates the payment row and stamps `mitra_paid_id` on exactly the counted-and-unpaid rows of that Mitra in one transaction, storing the farmer and business counts; it refuses (`nothing_unpaid`) when nothing is unpaid. Rates are two optional numbers per Mitra; blank = "rate not set". No minimum-payout rule.
8. Admin only. No Mitra login, dashboard or account type.

## Business registration - investigated, then skipped (Part 2B)
Checked migrations 0001-0075, `authService.js`, `App.jsx` routes and the sign-up screens: there is **one** `profiles` table, no account-type / role column for businesses (only `admin_role`), one sign-up route (`/signup`), and "business" appears only as `business_name` inside listing details. There is no business sign-up form and no business registration function. So **no business dropdown was built.** The schema is ready: the Mitra id sits on `profiles`, the business rate column exists, and `ks_mitra_kind(profile)` (one SQL function that today returns `'farmer'`) is the single place to change when a business account type appears; every count, the payment counts and the screens already separate farmers and businesses.

## How the OTP functions stay untouched
`app_register_phone_otp` and `app_register_phone` are not re-created, altered or called by 0075 (a test reads every migration to prove it). The Mitra choice is not sent to them: the form keeps it in the same `payload` object the OTP flow already carries in its challenge, and after the account exists and the session is stored, `authService` calls `set_my_mitra` once (OTP path in `verifyPhoneOtp`, no-OTP path in `registerPhone`). `otp_required` and `session_enforced` are not touched. `set_my_mitra` uses `require_actor` like every actor function, so it works with the session token the OTP path just stored.
**The 15-minute rule:** `set_my_mitra` only saves if the account was created within the last 15 minutes. That covers a slow OTP step or a retry, and stops a person (or a script with a stolen id) from changing the helper later.
**Best effort:** one retry on a network error, never shown as an error, the next screen waits at most about one second (the call finishes in the background), warning in the console without personal data.

## Things decided that the brief did not say (or where the code differed)
- **Admin and `set_my_mitra` are granted to `anon` + `authenticated`**, not only the public list. The brief said `anon` may run only `list_active_mitras`, but this site has no Supabase login for admins or farmers (custom session, the anon key), exactly like 0066/0067; revoking `anon` would break the admin panel and the sign-up save. Each of those functions refuses inside the database: `require_admin_session` (admin profile AND live session token, even when sessions are not enforced) or `require_actor`. A test checks the exact `anon` list and that each one checks the caller first.
- **The require-actor allowlist is unchanged.** It lists only actor functions (first parameter `p_actor_id`) that must answer instead of raising, and the staging catalog test compares the file with a database table. `list_active_mitras` has no actor parameter, so it is not an "actor function" and adding it would make that test fail. A static test pins the allowlist to exactly `app_session_valid` and lists the one public function.
- Admin functions name the first parameter `p_actor` (the 0067 style), so the 0066 catalog test does not treat them as unguarded.
- Admin actions write to the existing admin action log (`mitra_create`, `mitra_update`, `mitra_reassign`, `mitra_paid`); no phone numbers are logged.
- "Counted" excludes blocked accounts, so card totals (today / 7 days / farmers / businesses) also exclude them; the registrations view still lists them, marked "blocked - not counted".
- `unattributed_total` = profiles with no Mitra created on or after the creation time of the first Mitra (the "launch" moment), so no extra setting is needed.
- A Mitra can be moved to an inactive Mitra by the admin (history); only the sign-up list and the 15-minute save require active.
- Rates are limited to 0-100000 whole rupees; the payment amount is any whole number >= 0 (the suggestion is only a suggestion).
- The sign-up payload also travels through `resendOtp`, so a resent code keeps the choice.
- Ship scripts are copies of the **Batch 19** pair (the newest on `origin/main`), not 17F as the brief said, because Batch 19 is already merged.

## Privacy
Public dropdown: only `id`, name, area of active Mitras. Admin registrations view: phones masked to the last 4 digits in SQL (the full number never leaves the database for this view). Private phone: optional, admin only, never in the public list, the CSV, the logs or the screens except the admin edit form. No bank, UPI or Aadhaar field exists. The CSV has no phone column. Test data in the browser checks uses made-up `TEST` names and `90000xxxxx` placeholders only.

## Verified, and NOT verified
**Verified (automatic):** 44 new unit tests (static SQL text, reference model, screen rules, strings, wiring) and 18 browser checks against the built app at 360 px and 1280 px (Hindi and English) with a fake backend driven by the reference model. The whole existing suite and the build pass (one old failing test is not ours, see below).
**NOT verified: the SQL was never executed against any database in this batch** (no staging, no production, no local Postgres). The static tests read its text and the model mirrors its rules, but a typing slip in the SQL can only be found by running it. SHIP.md therefore makes staging the first step, with read-only checks and a full walk-through, before production.
Also not verified: the ship script ends at "`.env.production` missing" in a dry run from this worktree (the file lives in the main folder and was not copied); everything before that gate passed. The prerender count was not rebuilt here; this batch adds no route, so `MIN_ROUTES` stays at Batch 19's 278.

## Old tests
- `tests/unit/admin-console-14a.test.mjs` line 147: panel count 31 -> 32 (the new panel). Nothing else changed.
- Already failing before this batch (not touched): `tests/unit/morning-18-message.test.mjs` "every district word and name exists..." (Devanagari in `scripts/morning/lib/compose.js`, a Batch 18 matter).
- Suite: before 759 tests (756 pass, 1 fail, 2 skipped); after 803 (800 pass, 1 fail - the same old one, 2 skipped). Browser checks: 18 passed, 10 skipped by design (the functional ones run once, in the phone project).
