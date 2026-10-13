# Batch 7L-2 report — one registration form, one login form, safer login, location privacy

Date: 2026-10-13 · Branch: `staging` · Safety tag: `pre-7l2` (on `ebad4be`) ·
**Stage A only. Nothing committed, nothing deployed, no migration applied, no database written
to, no account created.** Stage B has not started.

## Migrations for you to apply (staging first, then production), in this order

1. `supabase/migrations/0059_login_rules.sql`
2. `supabase/migrations/0060_one_registration.sql`

**Neither file has been run anywhere.** There is no local PostgreSQL on this machine, so the
SQL has only been read and checked as text. The first real run is yours; Stage B then tests it.

The new app code works against the database both before and after 0059 (sign-in falls back
gracefully). **Registration needs 0060**: until it is applied, the new sign-up form will fail
at the last step.

## Result

| Check | Result |
|---|---|
| `npm run build:prod` | 263/263 routes, 0 failed, production guard OK (`docs/review/batch7l2/BUILD_PROD_OUTPUT.txt`) |
| `scripts/verify-batch7l2.mjs` (new) | 59 passed, 0 failed |
| `scripts/shots-batch7l2.mjs` (new, Playwright, everything mocked) | 124/124, Hindi + English at 390 and 1440 |
| Verifiers 5a / 6a / 6b / 6c / 6d / 6g | 48 / 21 / pass / pass / 18 / 49, 0 failed (no 6e or 6f verifier exists) |
| Verifiers 7a / 7b / 7c / 7d / 7l1 | 76 / 88 / 58 / 78 / 54, 0 failed |
| Playwright 7l1 suite (mocked) | 140/140 |
| Old location scripts p_0026 / p_0027 / p_0028 | 20 / 22 / 21 (p_0027 with its one write check skipped) |

Screenshots (registration, login, throttled login, Clear button, after clear) are in
`docs/review/batch7l2/`.

Three older checks had to change because of this batch: 5a's "no test deleted" now counts only
deleted test files (this batch deletes the app component `AuthTabs.jsx`); 7d and 7l1 now allow
migrations 0059 and 0060; 7l1's "registration still has an optional pincode field" became
"registration has no pincode field".

## Step 0 — recon

| Function | Signature | What it does today |
|---|---|---|
| `app_signup` | `(p_full_name text, p_phone text, p_village_town text, p_pincode text, p_language text, p_disclaimer_accepted boolean) returns profiles` | Creates a phone-only profile. Requires a pincode that exists in `pincodes`. |
| `app_login` | `(p_phone text) returns profiles` | Returns the profile for a 10-digit number. No check of any kind. |
| `app_signup_email` | `(p_full_name text, p_village_town text, p_pincode text, p_language text) returns profiles` | Creates a profile for the already-signed-in Supabase Auth user. Phone is left empty. Requires a pincode. |
| `app_login_email` | `() returns profiles` | Returns the profile of the already-signed-in Supabase Auth user. |

- **Passwords.** The background note says "custom auth, not Supabase Auth". That is true for
  mobile only. **Email + password uses Supabase Auth**: the browser calls
  `supabase.auth.signUp` / `signInWithPassword`, Supabase Auth stores the hash and checks the
  password, and our functions only see `auth.uid()` afterwards. No password or hash is in any
  of our tables or functions.
- **Session.** The whole profile row returned by the function is saved in `localStorage` under
  `ks_session_v1`. That object is "the session": every later call sends `p_actor_id = user.id`.
  Email users also have a Supabase Auth session under `ks_sb_auth`.
- **Forgot password.** There is none. Only "change password" on the Profile page, which needs
  the current password.
- **A profile with `is_admin = true` today.** Entering its mobile number signs in as that
  admin, with no password. The Admin page opens because the saved profile says
  `is_admin: true`, and every `admin_*` function checks only that the `p_actor_id` it is given
  belongs to an admin. See "Could not decide" item 1.

## Part 1 — one registration form

`src/screens/Signup.jsx` is now a single form, no tabs: full name, email, password (min 8,
Show/Hide), mobile (10 digits, required), village/town, language, the visibility choice, then
the optional farmer fields (land, crops, lease, equipment, WhatsApp opt-in, preferred mandi).
The existing acknowledgment step follows, unchanged.

- **Village/town** is a new form field (`src/components/location/PlaceField.jsx`) built on the
  same places list and matching as the 7L-1 location flow: suggestions while typing, "Did you
  mean…?", then district → town. No pincode anywhere. What is saved is the town's name and the
  **town's** coordinates, never a device position.
- **Visibility choice.** Two large buttons with the explanation, "Show my details
  (recommended)" starts selected, "Keep hidden" is always selectable and shows a plain warning.
  Stored in the existing `profiles.consents` as
  `details_visibility: { choice: 'show' | 'hidden', chosen_at, version }`. No new column.
- **Errors** are shown in Hindi/English under the field and at the top: email already used,
  mobile already used, weak password, invalid mobile, no place chosen.
- **New function `app_register`** (in 0060). The two old sign-up functions both demand a
  pincode and neither can take email + mobile together, so they could not be reused. They are
  left in place, untouched.
- Existing phone-only users: no row is changed. They sign in by mobile as before.

## Part 2 — one login form

`src/screens/Login.jsx` shows both ways at once (side by side at 1440, stacked at 390): email +
password, and mobile number, each with its own button and its own error area. The mobile block
carries the note "OTP verification is coming soon." / "OTP से जाँच जल्द आ रही है।".

**OTP plug-in point:** `startPhoneLogin()` and `verifyPhoneOtp()` in
`src/lib/auth/authService.js`. Today `startPhoneLogin` returns `{ step: 'done' }`. When OTP
exists it returns `{ step: 'otp' }` and the screen already shows a code box for that step.

## Part 3 — server login rules (`0059_login_rules.sql`)

- **Admins never via mobile.** `app_login` gives an `is_admin` profile exactly the same answer
  as an unknown number.
- **Throttle.** `login_attempts (identifier, attempted_at, success)`. RLS on, no policies, all
  rights revoked from `anon` and `authenticated`. 5 failures for the same identifier inside 15
  minutes → refused for 15 minutes with "Too many attempts. Please try again after 15
  minutes." Rows older than 30 days are deleted inside the function. The lock is checked before
  the account is looked up, so the answer does not depend on whether the account exists.
- `app_login` and `app_login_email` keep their names, arguments, return type and grants
  (`CREATE OR REPLACE`). No `admin_*` function is touched. Rollback note in the file header.

Two things about how it had to be built:

1. **A failed mobile login now returns "no profile" instead of raising an error.** In
   PostgreSQL a raised error undoes everything the function wrote, including the row that
   counts the failure. The new app treats "no profile" as "not found". An *older cached copy*
   of the app would instead store an empty session after a failed mobile login until it
   updates itself.
2. **The email throttle is weaker than the mobile one.** Wrong passwords are rejected by
   Supabase Auth and never reach our database, so the app has to report them through a new
   function, `app_login_email_guard`. Someone who talks to Supabase Auth directly skips that.
   The real limit on password guessing is Supabase Auth's own rate limit.

## Part 4 — location privacy

**a. Round before saving.** There are exactly three places that write a weather coordinate, and
all three now use the centre of the same 0.1° cell that `grid_key` names:

| Write path | Before | Now |
|---|---|---|
| `requestGridCell` → `weather_grid_requests` (browser) | exact position | cell centre |
| `fetchLiveWeatherCell` → `cache_weather_cell` → `weather_cache_v2` (browser) | exact position | cell centre |
| `refreshCell` → `weather_cache_v2` (`scripts/refresh-data.mjs`, the scheduled job) | whatever was stored | cell centre |

The forecast request to Open-Meteo also uses the cell centre now, so the exact position no
longer goes to Open-Meteo either. The old `weather_cache` table is not written by anything.
A visitor is at most about 7 km from their cell centre; Open-Meteo's own forecast grid is of
similar size, so the forecast for the centre is the forecast for the cell. The verifier fails
if a fourth write path appears or if any of the three stops rounding first.

**Rows already saved are not changed by this batch.** See "Could not decide" item 5.

**b. Every other place a visitor's coordinates are saved to a server (not changed):**

| Where | What is saved | Exact or rounded |
|---|---|---|
| `profiles.latitude/longitude`, old sign-up and Profile edit | the centre of the pincode | rounded (pincode area) |
| `profiles.latitude/longitude`, new sign-up | the chosen town's coordinates | rounded (town) |
| `listings.latitude/longitude`, when the poster presses "use my current location" on the Post form | the device position | **exact**, and listings are public |
| `listings.latitude/longitude`, otherwise | the typed village, looked up through our `/geocode` function | village-level |
| Feedback and grievance form, daily-update sign-up, search-miss log, listing reports, view and click counters | no coordinates | — |
| Analytics | none in the app | — |
| Offers near you / nearby counts | the area box is in the query, nothing is stored by our code | not stored |

Not ours to control: BigDataCloud receives the exact device position when it is more than
12 km from every listed place, and Supabase / Cloudflare keep their own request logs.

**c. Clear button.** "मेरी लोकेशन हटाएँ" / "Clear my location" sits next to "Change" wherever
the location banner is shown. It removes the saved place from the device and brings back the
prompt card, with no dialog. It also stops the place from coming back on its own (no automatic
device position, no profile coordinates) until the visitor shares, types or picks again.

**d. Privacy paragraph** updated (rounded to about 10 km, exact position not saved for weather,
Clear button instead of "clear browser data"). No version bumped. Lawyer note added to
`docs/legal/TERMS_DRAFT_FOR_LAWYER.md`.

**e.** The registration form has no pincode text. The helper "Your pincode is used to show
nearby listings" (still used on the Profile edit form) now reads "The 6-digit pincode of your
area."

## Could not decide — please confirm

1. **Refusing admins on the mobile path does not protect the admin functions.** Every
   `admin_*` function trusts the `p_actor_id` it is sent. Anyone who knows an admin's profile
   id can call them without signing in at all. You said admin functions are a later batch;
   until then, 0059 closes the easy door (typing the admin's number) but not that one.
2. **"Keep hidden" is enforced, which you did not ask for.** You asked only to store the
   choice, but the explanation promises that hidden details will not be seen. So 0060 also
   changes `get_listing_contact`: a listing whose owner chose "Keep hidden" no longer gives out
   the name and number (the visitor sees "This person has chosen to keep their details
   hidden…"). Existing users never made the choice and are unaffected. If you want store-only,
   delete that function from 0060 before applying, and the explanation text should change.
3. **`accept_listing_consents` was also changed** (0060). It used to overwrite the whole
   `consents` value, which would have erased the visibility choice the first time someone
   posted a listing. It now keeps it.
4. **`profiles.pincode` is made nullable** (0060). The form has no pincode and the column was
   NOT NULL. Consequence: a new user who opens Profile → Edit must enter a pincode to save,
   because that older form still requires one. Not changed in this batch.
5. **Old exact weather rows.** To round what is already stored, this would do it (not run, not
   in a migration, because Part 4 was "code only"):
   `update public.weather_grid_requests set latitude = round(latitude, 1), longitude = round(longitude, 1);`
   and the same for `weather_cache_v2`. Also, anon can still write any coordinate into
   `weather_grid_requests` directly; only a database rule would stop that.
6. **"Show my details" starts selected.** That is the nudge you asked for, but a pre-selected
   choice may be weak as consent. Flagged for the lawyer.
7. **Anyone can lock anyone's sign-in for 15 minutes** by failing five times with that mobile
   number or email. That is how a per-identifier throttle works. For mobile it also means the
   throttle does little against someone trying many different numbers; a per-device or per-IP
   limit would, but it means storing IP addresses.
8. **A half-finished registration.** If the email is accepted but the mobile number turns out
   to be taken, the email already exists in Supabase Auth. Retrying with the same email and
   password and a different number finishes the registration. Retrying with a different
   password says "email already used", and signing in says the account was not finished.
   There is still no forgot-password flow to get out of that.
9. **Old browser tests that register through the form** (many of the `e2e/` specs and
   `scripts/test/` scripts) fill a pincode and use the tabs, and they write to the staging
   database. They are now out of date. I did not run or rewrite them.

## Not done / not tested

- The SQL has never been executed (see top).
- The admin refusal and the throttle were tested in the browser against a mock that behaves
  the way the SQL is written. The real functions are tested in Stage B.
- No real account was created; no real sign-in was attempted.

## Files

New: `supabase/migrations/0059_login_rules.sql`, `supabase/migrations/0060_one_registration.sql`,
`src/components/location/PlaceField.jsx`, `scripts/verify-batch7l2.mjs`,
`scripts/shots-batch7l2.mjs`, `docs/review/batch7l2/`.
Changed: `src/screens/Signup.jsx`, `src/screens/Login.jsx`, `src/lib/auth/authService.js`,
`src/lib/auth/AuthProvider.jsx`, `src/lib/errors.js`, `src/lib/i18n/strings.js`,
`src/lib/i18n/legal.js`, `src/lib/location/userLocation.js`,
`src/lib/location/LocationProvider.jsx`, `src/components/location/LocationControl.jsx`,
`src/lib/weather/weatherApiV2.js`, `scripts/refresh-data.mjs`,
`docs/legal/TERMS_DRAFT_FOR_LAWYER.md`, verifiers 5a / 7d / 7l1.
Deleted: `src/components/AuthTabs.jsx`.

## Stage B (waiting for "migrations applied")

Staging first, then production: `login_attempts` not readable or writable by anon; throttle and
admin-via-mobile refusal with a throwaway profile on **staging only**, created and then
deleted; existing users' sign-in still works on staging; build; `~/preview-prod.sh`; curl
check; screenshots; report.

---

# Stage B — real functions tested on staging, preview deployed (13 October 2026)

**Nothing committed. Live site untouched. No account created and nothing written on production.**

## State of the two databases (read-only check)

| | Staging | Production |
|---|---|---|
| `login_attempts`: exists, RLS on, 0 policies, no rights for anon/authenticated | yes | yes |
| `app_login` / `app_login_email` are the new 0059 versions | yes | **no, still the old ones** (as you said; you apply them before shipping) |
| `app_login_email_guard`, `app_register`, new `get_listing_contact`, new `accept_listing_consents`, `pincode` nullable | yes | yes |
| `login_attempts` rows / profiles with a visibility choice after this stage | 0 / 0 | 0 / 0 |

## Check 1 — `app_login` with an unknown number, through the real REST API (staging)

HTTP 200, and the body is **an object with all 23 fields null, not `null`**:

`{"id":null,"full_name":null,"phone":null, … ,"consents":null}`

The is_admin throwaway got byte-for-byte the same body. The app treats both shapes as "not
found" (`startPhoneLogin` requires an `id`); tested in the built app with each shape: message
"No account found for this number", still on the sign-in screen, no session stored.

**One fix made in Stage B** (`src/lib/auth/authService.js`): a stored session without an `id`
is no longer treated as signed in, and email sign-in also requires an `id`. Reason: the
all-null object is "truthy", so a copy of the app from before this batch stores it as a session
after a failed mobile login. The new app now ignores such a stored value.
**Consequence for shipping:** apply the production `app_login` only after (or together with)
publishing this build. Until a visitor's cached old copy updates itself, a failed mobile login
there would look "signed in" with an empty profile (no access to anyone's data, but confusing).

## Check 2 — staging, throwaway data (`scripts/verify-batch7l2-stageb.mjs`, 31 passed, 0 failed)

- Two users registered through the real form (Hindi 390 "Keep hidden", English 1440 "Show").
  `app_register` stored `details_visibility.choice` = `hidden` / `show`, with email, mobile,
  Khurai + the town's coordinates, no pincode, linked to Supabase Auth.
- "Keep hidden": `get_listing_contact` on that user's listing → HTTP 400 `contact_hidden`, no
  name or number. The "Show" user's listing still returns name and number.
  `accept_listing_consents` keeps the choice, and the listing stays refused afterwards.
- Normal sign-in works: mobile for the non-admin throwaway, email + password through the form.
- is_admin throwaway: mobile sign-in refused, same answer and same on-screen message as an
  unknown number, nobody signed in.
- Throttle, mobile: attempts 1–5 "not found", **attempt 6** shows "Too many attempts. Please
  try again after 15 minutes."; the server answers `too_many_attempts`; exactly 5 rows counted.
- Throttle, email: wrong password 1–5, attempt 6 shows the Hindi throttle message; while
  locked even the correct password is refused.
- anon cannot read or write `login_attempts`, nor call the two helper functions (HTTP 401).
- Cleanup: both profiles, their 2 listings, their 2 Supabase Auth users and this run's 15
  `login_attempts` rows deleted. Counts before = after (profiles 18, listings 77,
  login_attempts 0, auth users 4).

Not tested: sign-in with a pre-existing staging user's own number (only throwaway accounts
were used, to leave other rows alone).

Output: `docs/review/batch7l2/STAGEB_OUTPUT.txt`, `stageb-check.json`, `stageb-*.png`.

## Check 3 — production (read-only) and preview

- `npm run build:prod`: 263/263 routes, 0 failed, production guard OK. Verifier 59/59,
  mocked browser checks 124/124.
- Preview: https://preview.kissansahyog-prod.pages.dev — `/`, `/about/`, `/how-to-use/`,
  `/founder/`, `/grievance/`, `/sawaal/`, `/login`, `/signup`, `/privacy/`, `/mausam` all 200.
- Login and registration screens opened on the preview and photographed
  (`stageb-preview-*.png`); nothing was submitted and no write request left the browser.

**The preview uses the production database.** Registering there creates a real account.
Sign-in on the preview works against the old `app_login` (unknown number → "not found"), but
the admin refusal and the mobile throttle do not exist on production until you apply 0059's
two functions.
