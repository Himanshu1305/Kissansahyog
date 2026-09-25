# Known Issues

**Test checklists:** No test-checklist item (v1 Phases 1–9, plus v1.1 Phases 1–7,
positive/negative/edge) was ever deferred or skipped — every one passed before its phase was
committed. v1.1 backend suites `v11_phase1..7` (82 checks) are green against the live project;
the v1 backend suites still pass (seed-count assertions updated for the new lookup rows).

What follows are **resolved items**, **intentional MVP design limitations**, and Phase-2
follow-ups — documented so they're picked up deliberately, not discovered by surprise.

---

## Resolved in Phase 3

- **Homepage nav home button — FIXED.** The NavBar logo now links to `/` (public homepage)
  for all users, `/` is viewable while logged in, and the authenticated dashboard renders the
  global NavBar — so logged-in users can always get back to the homepage (Phase 1).

## Density / Vendor / Warehouse / Rojgar build (flagged)

- **Land category fencing should use the tehsil boundary** (tighter than the 30 km district
  radius) — confirmed backlog, **not yet implemented**. Land still uses the standard 30 km +
  30–50 km fallback like every other category.
- **Drone Didi icon** replaced with a non-helicopter multi-rotor quadcopter SVG (`<CatIcon>`).
  Verify on a real device that it reads clearly at small chip/card size; a real PIB/Govt Drone
  Didi image could be swapped in later if desired.

## New in Phase 3 (intentional / flagged)

- **Email verification is NOT enabled.** Email-registered users are trusted on signup without
  confirming their address (`mailer_autoconfirm` on) — acceptable for the MVP, flagged for a
  future phase (add confirmation emails before wider launch). Phone auth still lacks real OTP.
- **Deleting an account leaves the Supabase `auth.users` row.** `delete_account` removes the
  profile (cascading listings) and signs the user out, but the underlying auth user is not
  deleted from the client (that needs the service role). Harmless — login then finds no profile —
  but worth a server-side cleanup later.
- **Admin trust model.** Admin RPCs verify `is_admin` on the passed profile id (same trust model
  as the rest of the RPC surface); becomes cryptographic when phone OTP / `auth.uid()` lands.
- **v1 Playwright E2E specs** still need the new required listing fields (asset pincode, land
  price type, equipment rate) filled before re-running — carried from v1.1. Phase 3 features are
  covered by the `p3_phase*` backend suites + Playwright smoke checks.

## Resolved in v1.1

- **Asset-location distance bug — FIXED.** Listings previously inherited the poster's *profile*
  coordinates, so an asset located away from the poster's home matched in the wrong place. Now
  the create form asks the asset's pincode explicitly (required, never defaulted from the
  profile) and `create_listing` derives the coordinates from that pincode **server-side**.
  Verified across all 5 categories (`v11_phase1.mjs`, `v11_phase7.mjs`). See PROJECT_CONTEXT §6.

## New v1.1 limitations (intentional)

- **Expert phone is readable in the directory row.** Unlike listing phones (RPC-gated), the
  `experts` table exposes `phone` in the anon-readable active row; the UI still gates it behind
  the disclaimer + "Show number" button. Acceptable because experts are a small curated set who
  consent to being listed publicly. Revisit if the directory grows or abuse appears.
- **Land `price_type` is client-validated only** (server stores it as-is), consistent with the
  existing land `size_range` pattern; the bhusa/agri required fields *are* server-validated.
- **Agri-Inputs vendor listings are free** with only a "charges may apply later" UI note — no
  payment gate exists anywhere (never in this codebase).
- **v1 E2E specs need updating before re-run.** `e2e/phase{2..9}.spec.js` fill the v1 create
  forms, which now have new required fields (asset pincode, land price type, equipment rate).
  Those specs must fill the new fields before the Playwright suite will pass again; v1.1 logic
  is covered by the `v11_phase*` backend suites in the meantime.

---

## Intentional MVP trust-model limitations (by design)

1. **Identity is not cryptographically verified.** The SECURITY DEFINER RPCs take the
   acting `profile_id` as an argument; a crafted client could pass another user's id and
   act as them. This is the same trust model as the self-declaration checkbox and
   "no police verification" — deliberate for the low-friction MVP. **Resolved in Phase 2**
   when real Phone OTP gives `auth.uid()` and RLS row policies (see PROJECT_CONTEXT.md §5).
   *Impact:* a technical user could impersonate/close/create as another account.

2. **Phone numbers are reachable by any client.** `get_listing_contact` returns a lister's
   name + phone for any active listing (that's how "Call" works). A determined script could
   enumerate active listings and scrape phone numbers. Acceptable for the MVP (numbers are
   shared to enable calls); revisit with rate-limiting / auth-gating if abuse appears.

3. **Anonymous photo upload.** The `listing-photos` storage bucket allows `anon` inserts
   (trust-based, consistent with the rest of the platform). A spam vector in theory. Phase-2
   auth would scope uploads to `auth.uid()`'s folder.

4. **No rate limiting** on signup or listing creation. Fine for the pilot; add abuse
   controls (and Phase-2 auth) before wider launch.

---

## Data / content caveats

5. **Pincode seed is Sagar-district only** (20 real pincodes with real coordinates). Two
   rows carry a research caveat to confirm before wider launch (noted in the seed research):
   Kesli (used PO code 470235 vs a shared 470339) and Barodia Kalan (470661 vs 470441/470117
   in some listings). Core towns are high-confidence. Expanding to more regions is data-only
   (add pincode rows) — see PROJECT_CONTEXT.md §2.

6. **Crops/equipment lists are starter sets** for the Sagar pilot — confirm/expand with the
   founder before wider regional launch (flagged in `supabase/seed/lookups.json`).

---

## Minor / nice-to-have

7. **No client-side image compression** on land photos. On slow rural networks a large
   phone photo may upload slowly. Consider downscaling before upload in a later pass.

8. **Slow-3G / low-end usability** is addressed by a small bundle (~129KB gzip initial),
   code-splitting, lazy images, and an offline app shell, but has not been profiled on a
   physical low-end device — worth a real-device pass before launch.

9. **Deployment is not automated.** The app builds for Cloudflare Pages but is not deployed
   here (per scope). Founder connects Cloudflare Pages to the repo and sets the same env
   vars as a follow-up step.

## Homepage v4 (2026-09-24)

- **Official PIB / MP trust-row photos omitted.** drone-didi-official / pm-official /
  cm-official could not be verified (pib.gov.in returns 403 to automated fetch; no
  Wikimedia Commons match). Per spec those cells are omitted rather than substituted; the
  founder cell uses an initials avatar (अ.दी., `TODO: founder photo`). Swap in verified
  official images later if desired.
- **Sawaal photo upload is best-effort for anonymous users.** Uploads go to the
  `listing-photos` bucket; if storage RLS rejects an anonymous upload the question is still
  submitted (without the photo). Confirm/relax the storage policy for anon Q&A photos, or
  gate the photo field behind login, in a later pass.
- **Backend suites not re-run this session** (no service-role run performed). Homepage v4
  changes are additive (new functions, one optional RPC-backed count, one nullable column
  already migrated); `npm run build` is green and a Playwright route smoke passed.

## Fixes + Schemes build (2026-09-24)
- **Availability calendar auth**: writes go through the owner-gated
  `set_listing_unavailable` RPC (verifies `listings.user_id == actor`). It renders on
  equipment-offer detail pages (a Protected route), so it is not in the anonymous
  screenshot set — verified by build + code, not by a logged-in screenshot.
- **KVK events are seed placeholders** and need ongoing admin maintenance (dates roll
  forward relative to seeding; keep them current via the admin events panel).
- **MP `e-krishi-yantra` / `balram-talab` helplines** are null (no single official
  helpline verified); source URLs recorded instead.

## मौसम/MSP build (2026-09-25)
- **DATA_GOV_IN_API_KEY secret not set → 3-year mandi history not backfilled.** Trend
  and "पिछले सालों में" sections show only the short history the 3-hourly refresh has
  gathered; the past-years bar chart stays hidden until ≥12 months exist. Owner action:
  register at data.gov.in, add the `DATA_GOV_IN_API_KEY` repo secret, run the "Backfill
  mandi history" GitHub workflow.
- **ActionWindows / per-crop advice / procurement steps are pending expert review** —
  they carry a "समीक्षाधीन" tag until Shri A.K. Dixit reviews docs/content/
  MAUSAM_MSP_CONTENT_REVIEW.md and an admin flips the review flag.
- **Season-rainfall normal** is computed from the Open-Meteo archive (2015→) at refresh
  time; labelled "पिछले 10 साल का औसत". Values shift slightly as the archive updates.
