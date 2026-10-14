# Admin access diagnosis — phone 9849993171 cannot see the admin dashboard

Date: 2026-10-13. Read-only: no code, deploy or data was changed. Only this file was written.

## Verdict

**No front-end or routing defect was found.** The repo code (`staging` and `main`) and the bundle
currently served by https://kissansahyog.com are both correct: they gate on `user.is_admin`, the
login RPC returns the whole `profiles` row including `is_admin`, and a logout + login always
replaces the cached profile.

So the session that is logging in is receiving a profile row with `is_admin = false` (or absent).
That is a data/identity mismatch, not a code bug. **I could not confirm which mismatch**: my
read-only call to the production `app_login` RPC was blocked by the session's permission rules
("Production Reads"), so the production row was not inspected. The two checks in "Confirm in two
minutes" below settle it.

## 1. Route and links

- Route: **`/admin`** — `src/App.jsx:171`, `<Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />`.
  Screen: `src/screens/Admin.jsx` (lazy chunk; live as `assets/Admin-B2ggvG10.js`).
- It is linked, but **every link is rendered only when `user.is_admin` is truthy**:
  - `src/components/NavBar.jsx:263` — header button. `hidden` below the `sm` breakpoint, and
    **icon-only (⚙️, no text) from `lg` up to `2xl`** (`lg:hidden 2xl:inline` on the label, line 273).
  - `src/components/NavBar.jsx:302` — avatar dropdown item "⚙️ एडमिन / Admin".
  - `src/components/NavBar.jsx:392` — mobile hamburger menu item.
  - `src/screens/Profile.jsx:192` — "Admin Resource Dashboard" card on `/profile`.
- For a non-admin session there is no link anywhere; typing `/admin` shows the 🔒 Access Denied notice.

## 2. The exact condition

`user?.is_admin`, where `user` comes from `useAuth()` (`src/lib/auth/AuthProvider.jsx`).

- `user` is initialised from **localStorage key `ks_session_v1`** (`authService.getCurrentUser`,
  `src/lib/auth/authService.js:42`).
- That key is written by `storeSession(profile)` with whatever the login RPC returned:
  - phone login → `supabase.rpc('app_login', { p_phone })` (`authService.js:127`)
  - email login → `supabaseAuth.rpc('app_login_email')` (`authService.js:214`)
- There is **no profile re-fetch on page load**. The cached object is the only source until the next
  login or a profile-editing RPC.
- Page guard: `AdminOnly` (`App.jsx:90`) only checks `isLoggedIn` (else redirect to `/login`);
  `Admin.jsx:44` then checks `!user?.is_admin` → Access Denied.

## 3. Does login return and store `is_admin`?

Yes, by code.

- `app_login(p_phone)` (`supabase/migrations/0003_functions.sql:64`) is `returns public.profiles` and
  does `select * into v_profile from public.profiles where phone = v_phone`. There is no column
  list, so `is_admin` (added in `0010_p3_email_auth.sql:20`) is included. No later migration
  redefines `app_login`. `profiles.phone` is `unique`, so one row per phone.
- `app_login_email()` (`0010:82`) is the same shape but selects `where auth_uid = auth.uid()`.
- The other RPCs that overwrite the cached session (`update_profile`, `update_kisan_profile`,
  `accept_listing_consents`, `set_language`) also return the full `profiles` row, so none of them
  strips `is_admin`. `patchUser` (language toggle) merges, it does not replace.
- Stale cache: possible only **without** a re-login. If `is_admin` is set to true while a session is
  open, that browser keeps `is_admin=false` until logout + login (and `/login` redirects a logged-in
  user to `/home`, so "logging in again" without logging out does nothing). A real logout removes
  `ks_session_v1` and the next login stores the fresh row, so a stale cache cannot survive the
  logout/login already done.

## 4. Other possible blockers — checked, none found

- No feature flag, build-time check or env switch on admin (`vite.config.js`, `scripts/check-prod-env.mjs`,
  `functions/`, `public/_redirects`, `public/_headers` contain nothing admin-related).
- `https://kissansahyog.com/admin` returns 200 (SPA shell), no redirect.
- Live bundle (`assets/index-CaT1F4rf.js` → `PageShell-CawcIrcd.js`) contains the three NavBar
  `is_admin` gates, session key `ks_session_v1`, the `app_login` RPC, and points at the production
  Supabase project (`eltmcznjcqiahqhjvpjg`) only. Deployment is not stale or mis-pointed.
- `main` and `staging` have the same gate logic.

## Likely causes, in order

1. **`is_admin = true` is on a different row or project than the one the login returns.**
   - The repo has two Supabase projects: staging `wzxtqbqlahyahsnoqqva` (`.env`) and production
     `eltmcznjcqiahqhjvpjg` (`.env.production`). The 9849993171 admin profile id hardcoded in
     `scripts/mela/shots.mjs` and the flag set by local scripts belong to whichever project `.env`
     points at, i.e. staging.
   - `supabase/manual/admin_accounts.sql` grants admin **by email** (`himanshu1305@gmail.com`,
     `admin@kissansahyog.com`). Email-registered profiles are separate rows with `phone = null`.
     Logging in on the Email tab returns that row, not the phone row, and vice versa.
2. **The link is there but not recognised**: on a laptop-width window (1024–1535 px) the header
   button is a bare ⚙️ with no label, and on a phone it is only inside the hamburger menu.
3. **Different origin**: localStorage is per origin, so a session on `staging.kissansahyog.com`
   or a `*.pages.dev` preview talks to the staging DB.

## Confirm in two minutes

1. On https://kissansahyog.com, logged in, open DevTools → Console:
   `JSON.parse(localStorage.ks_session_v1)` and read `id`, `phone`, `email`, `auth_provider`, `is_admin`.
   Also type `/admin` in the address bar: Access Denied means the session has `is_admin` false.
2. In the Supabase dashboard, confirm the project ref in the URL is `eltmcznjcqiahqhjvpjg`, then:
   ```sql
   select id, phone, email, auth_provider, is_admin
   from public.profiles
   where phone = '9849993171'
      or email in ('himanshu1305@gmail.com', 'admin@kissansahyog.com');
   ```
   Compare the `id` with the one from step 1.

## Smallest fix (proposal only, nothing applied)

- If step 1 shows `is_admin: false`: set the flag on the row whose `id` the session actually holds,
  in the production project, then log out and log in once:
  `update public.profiles set is_admin = true where id = '<id from step 1>';`
- If step 1 shows `is_admin: true`: nothing is broken; use the avatar menu → "⚙️ एडमिन" or go to
  `/admin`. Optional one-line polish: drop `lg:hidden 2xl:inline` from the label span at
  `NavBar.jsx:273` so the button always reads "⚙️ Admin".
- Optional hardening (separate change): refresh the cached profile once on app load so an
  `is_admin` change takes effect without a manual logout/login.
