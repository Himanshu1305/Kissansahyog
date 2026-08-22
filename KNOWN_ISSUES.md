# Known Issues

**Test checklists:** No test-checklist item (Phases 1–9, positive/negative/edge) was
ever deferred or skipped — every one passed before its phase was committed, and the full
suite (72 backend + 26 E2E) passes on a clean clone. So there are **no open bugs** as of
this build.

What follows are **intentional MVP design limitations** and Phase-2 follow-ups —
documented so they're picked up deliberately, not discovered by surprise.

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
