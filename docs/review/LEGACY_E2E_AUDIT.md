# Legacy E2E Test Audit — `phase2`–`phase9` (catalog only, no fixes)

Date: 2026-09-27. Scope: the 23 currently-failing legacy v1 E2E specs. **No test or application code
was modified** — this is a decision catalog only.

**Method:** ran a fresh `npm run build` (deleted the git-ignored `dist/` first, per the caution) and
executed `e2e/phase2`–`phase9` against that output → **23 failed / 3 passed** (the 3 passing:
`phase7` "language toggle switches UI chrome", `phase8` "manifest is served", `phase8` "service worker
registers"). For every failing test I then **exercised the real flow live** against `vite preview`
(clicked through registration, posting land/equipment/labor, browse, My Listings mark-found, the crop
dropdown language switch, offline) rather than inferring from code — specifically to rule out a real
regression hiding behind an "it's just outdated" label.

**Headline: 0 real bugs found.** Every user flow these tests target still works today; all 23 failures
are stale entry points / selectors / value-formats left behind by later redesigns.

## Summary table

| # | Test (file:line) | Flow exists today? | Covered by a newer passing test? | Recommendation |
|---|------------------|--------------------|----------------------------------|----------------|
| 1 | phase2 · welcome defaults Hindi↔English | Yes (at `/welcome`) | No | **Rewrite** |
| 2 | phase2 · signup happy path reaches home | Yes (`/welcome`→`/signup`) | No | **Rewrite** |
| 3 | phase2 · rejects malformed phone | Yes | No | **Rewrite** |
| 4 | phase2 · unknown pincode handled | Yes | No | **Rewrite** |
| 5 | phase2 · duplicate phone rejected | Yes | No | **Rewrite** |
| 6 | phase2 · login unknown phone → not found | Yes (`/login`) | No | **Rewrite** |
| 7 | phase2 · language persists logout/login | Yes | No | **Rewrite** |
| 8 | phase3 · land offer self-decl → phone reveal | Yes | Partial (phase15 form, phase16 rules-gate) | **Rewrite** |
| 9 | phase3 · land requirement submits directly | Yes | Partial (phase15) | **Rewrite** |
| 10 | phase3 · browse shows nearby land + detail | Yes | No | **Rewrite** |
| 11 | phase4 · equipment offer availability toggle | Yes | No | **Rewrite** |
| 12 | phase4 · equipment requires a type | Yes (validation works) | No | **Rewrite** |
| 13 | phase4 · equipment in its own browse tab | Yes | No | **Rewrite** |
| 14 | phase5 · labor blank rate renders cleanly | Yes | No | **Rewrite** |
| 15 | phase5 · labor rejects zero workers | Yes (validation works) | No | **Rewrite** |
| 16 | phase5 · labor rejects from>to date | Yes | No | **Rewrite** |
| 17 | phase6 · mark Found closes listing | Yes (works) | No | **Rewrite** |
| 18 | phase6 · expired shows Expired, absent in browse | Yes | No | **Rewrite** |
| 19 | phase7 · crop dropdown DB labels switch language | Yes (works) | No | **Rewrite** |
| 20 | phase7 · posting works in Hindi UI | Yes | Partial (phase14/15/16 drive the Hindi post flow) | **Rewrite** |
| 21 | phase8 · offline reload shows app shell | Yes | **Yes** — phase10_location_pwa "offline: banner shows and the shell stays" | **Merge** |
| 22 | phase9 · Journey A: signup→post 3→close | Yes | Partial | **Rewrite** |
| 23 | phase9 · Journey B: 30km filter across categories | Yes | Partial (p_0025 geofencing backend) | **Rewrite** |

> **Real bugs found: 0.** No entry below is a functional regression.

---

## Detailed entries

### phase2 — registration / login / language (7 tests)
All seven start with `page.goto('/')` and expect the **old Welcome screen** (an "English" text toggle
button and a "नया खाता बनाएं / Create new account" CTA). Live check: `/` now renders the **Homepage**
(public landing) — it has **0** "नया खाता बनाएं/Create new account" buttons and **0** "English" buttons
(the toggle is now a "हिं/EN" pill). The Welcome/registration screens moved to `/welcome`, `/signup`,
`/login`, which are live and functional (verified: `/signup` form fields present and fillable). Drift
origin: the homepage-as-landing redesign (public `/` introduced in `3cc4420` "Phase 2: auth and profile"
and the subsequent homepage redesigns). No newer E2E covers signup/login/language-persistence.

1. **welcome defaults to Hindi and toggles to English** (`phase2:10`)
   1. Asserts the landing screen shows a Hindi signup CTA "नया खाता बनाएं", and clicking "English" swaps it to "Create new account".
   2. Fails at line 13: `getByRole('button',{name:'नया खाता बनाएं'})` not found — that CTA/screen is not at `/` anymore.
   3. Flow exists: **Yes** — language toggle lives in the nav (`हिं/EN`) on every screen incl. `/welcome`; the signup CTA is on `/welcome`.
   4. Covered elsewhere: No (phase7:28, which passes, checks chrome-language toggle on `/home` + `/browse`, not the Welcome CTA).
   5. **Rewrite** — point at `/welcome`, update the toggle selector to the `हिं/EN` pills and the CTA label.

2. **signup happy path reaches home** (`phase2:18`)
   1. Full registration: open English → Create account → fill name/phone/pincode → Continue → accept disclaimer → lands on `/home` showing the name.
   2. Fails at the `openInEnglish` helper (line 7): 30s timeout waiting for `getByRole('button',{name:'English'})` — no such button on `/`.
   3. Flow exists: **Yes** — verified `/signup` renders the form; the two-step form + disclaimer flow is intact (`Signup.jsx`), now with an optional non-blocking किसान-profile section added later.
   4. Covered elsewhere: No.
   5. **Rewrite** — start at `/signup` (or `/welcome`→signup), fix the toggle selector; assertions otherwise still valid.

3. **client-side rejects malformed phone before disclaimer** (`phase2:39`)
   1. Enters a 3-digit phone, expects to stay on the form with a "valid 10-digit mobile number" error (no disclaimer step).
   2. Fails at `openInEnglish` (no "English" button on `/`).
   3. Flow exists: **Yes** — client-side phone validation still runs in `Signup.jsx` before the disclaimer step.
   4. Covered elsewhere: No.
   5. **Rewrite** — fix entry point/selector; the validation assertion is still accurate.

4. **unknown pincode is handled gracefully** (`phase2:52`)
   1. Uses pincode 999999, expects a "was not recognised" message and no redirect to `/home`.
   2. Fails at `openInEnglish`.
   3. Flow exists: **Yes** — pincode resolution + graceful error still in the signup path.
   4. Covered elsewhere: No.
   5. **Rewrite**.

5. **duplicate phone is rejected with a clear message** (`phase2:67`)
   1. Pre-inserts a profile, then signs up with the same phone, expects an "already exists" message.
   2. Fails at `openInEnglish`.
   3. Flow exists: **Yes** — `app_signup` still rejects duplicate phones.
   4. Covered elsewhere: No.
   5. **Rewrite**.

6. **login with unknown phone shows not-found path** (`phase2:92`)
   1. Opens the login screen, enters an unregistered phone, expects "No account found" and no redirect.
   2. Fails at `openInEnglish`.
   3. Flow exists: **Yes** — `/login` is live; unknown-phone handling intact.
   4. Covered elsewhere: No.
   5. **Rewrite** — reach `/login` directly; assertion still valid.

7. **language persists across logout/login** (`phase2:101`)
   1. Signs up in English, logs out, logs back in, expects the UI to return in English (persisted to profile).
   2. Fails at `openInEnglish`.
   3. Flow exists: **Yes** — `set_language`/profile-persisted language still works (phase7:28 passing confirms toggle chrome).
   4. Covered elsewhere: Partially (phase7:28 covers toggling, not the logout/login persistence journey).
   5. **Rewrite**.

### phase3 — land posting + browse (3 tests)
Shared drift: `page.goto('/post')` then immediately `getByRole('button',{name:'Offering'/'Looking for'})`
— but `/post` now opens on a **source step** (farmer/vendor + "Continue") added by `8146f25`
"vendor/business tagging" before the Offering/Looking-for step; and the Land form's size field is a
**numeric input** (`#f_size_acres`), not the old "Land size" bucket `<select>` (`595fbbc` Land-acreage
build); and a **mandatory rules-compliance checkbox** now also gates submit (`d691da5`). Live check:
posting a land offer end-to-end (source→Offering→Land→numeric size→price type→village→self-declaration +
rules checkbox→Submit→"View listing") **works**.

8. **land OFFER: self-declaration gates submit, end-to-end to phone reveal** (`phase3:36`)
   1. Posts a land offer, asserts Submit is disabled until self-declaration is ticked, then submits, opens the detail, reveals the phone (`tel:` link).
   2. Fails: 30s timeout on `getByRole('button',{name:'Offering'})` (blocked by the source step). Would also fail later on `getByLabel('Land size').selectOption('2–5 acres')` (now numeric) and the added rules checkbox.
   3. Flow exists: **Yes** — self-declaration still gates land-offer submit; phone reveal via `get_listing_contact` intact.
   4. Covered elsewhere: Partial — phase15 covers the numeric land form; phase16 covers the rules-checkbox gating submit (on equipment). The full land-offer→phone-reveal journey is not covered.
   5. **Rewrite** — add source step, numeric size + price type + village + rules checkbox; keep the self-declaration + phone-reveal assertions.

9. **land REQUIREMENT: no self-declaration checkbox, submits directly** (`phase3:68`)
   1. Posts a land requirement and asserts there is no self-declaration checkbox, submits directly.
   2. Fails: 30s timeout on `getByRole('button',{name:'Looking for'})` (source step). Note: the assertion `expect(getByRole('checkbox')).toHaveCount(0)` is now wrong regardless — the mandatory rules checkbox means a requirement form has ≥1 checkbox.
   3. Flow exists: **Yes** — requirements still skip self-declaration; but every form now has the rules checkbox.
   4. Covered elsewhere: Partial (phase15 land form).
   5. **Rewrite** — the "no self-declaration for requirements" concept holds, but the zero-checkbox assertion must change to account for the rules checkbox.

10. **browse shows a nearby land listing and opens its detail** (`phase3:84`)
    1. Seeds a 0 km land offer, opens `/browse`, asserts a card + "0.0 km away" + navigates to detail.
    2. Fails at line 103: `getByText('0.0 km away')` — the card renders, but the distance label is now `toFixed(0)` → **"0 km away"** (format change, `ListingCard.jsx`), not "0.0 km away". Live: browse shows the card with "0 km away".
    3. Flow exists: **Yes** — browse + per-card distance + detail navigation all work.
    4. Covered elsewhere: No (no newer E2E asserts a browse card's distance label).
    5. **Rewrite** — update the distance-label expectation to the integer format; also note `/browse` now defaults to the **equipment** chip (Land is last), so select the land chip first.

### phase4 — equipment (3 tests)
Same source-step drift; Browse category tabs changed from `getByTestId('tab-<cat>')` to a
`CategoryStrip` with `data-testid="chip-<cat>"` (`76b59e7` density overhaul).

11. **equipment OFFER with availability toggle, no self-declaration** (`phase4:27`)
    1. Posts an equipment offer; toggles "Available now" ↔ "Specific dates" (date inputs appear/disappear); submits.
    2. Fails: 30s timeout on `getByRole('button',{name:'Offering'})` (source step). The `expect(getByRole('checkbox')).toHaveCount(0)` is also now wrong (rules checkbox).
    3. Flow exists: **Yes** — the equipment available-now/specific-dates toggle is intact in the equipment module.
    4. Covered elsewhere: No.
    5. **Rewrite** — add source step + rules checkbox; the availability-toggle assertions still hold.

12. **equipment requires an equipment type** (`phase4:55`)
    1. Submits an equipment listing without a type, expects "select the equipment type" error.
    2. Fails: 30s timeout on `getByRole('button',{name:'Looking for'})` (source step).
    3. Flow exists: **Yes** — **live-verified**: submitting equipment without a type shows the "select the equipment type" error.
    4. Covered elsewhere: No.
    5. **Rewrite** — add source step; the validation assertion is accurate.

13. **equipment appears in its own browse tab** (`phase4:66`)
    1. Seeds an equipment offer, opens `/browse`, clicks the equipment tab, expects a card.
    2. Fails: 30s timeout on `getByTestId('tab-equipment')` — the tab testid is now `chip-equipment` (CategoryStrip).
    3. Flow exists: **Yes** — live-verified: the equipment chip filters to equipment listings.
    4. Covered elsewhere: No.
    5. **Rewrite** — swap `tab-equipment` → `chip-equipment`.

### phase5 — labor (3 tests)
Same source-step drift.

14. **labor OFFER with blank rate renders cleanly (no undefined)** (`phase5:27`)
    1. Posts labor with a blank rate, opens detail, asserts "8 workers" and no literal "undefined".
    2. Fails: 30s timeout on `getByRole('button',{name:'Offering'})` (source step).
    3. Flow exists: **Yes** — labor posting with optional rate still renders cleanly.
    4. Covered elsewhere: No.
    5. **Rewrite** — add source step + rules checkbox; assertions otherwise valid.

15. **labor rejects zero workers** (`phase5:46`)
    1. Enters 0 workers, expects a "must be 1 or more" error.
    2. Fails: 30s timeout on `getByRole('button',{name:'Looking for'})` (source step).
    3. Flow exists: **Yes** — **live-verified**: 0 workers shows the "must be 1 or more" error.
    4. Covered elsewhere: No.
    5. **Rewrite** — add source step; validation assertion accurate.

16. **labor rejects from-date after to-date** (`phase5:57`)
    1. Sets From after To, expects a "cannot be after" error.
    2. Fails: 30s timeout on `getByRole('button',{name:'Offering'})` (source step).
    3. Flow exists: **Yes** — the labor date-range validation is intact in the module.
    4. Covered elsewhere: No.
    5. **Rewrite** — add source step; assertion accurate.

### phase6 — listing lifecycle (2 tests)

17. **mark Found closes listing: disappears from browse, stays (Found) in My Listings** (`phase6:29`)
    1. Seeds a land offer at remote coords, asserts it shows once in `/browse`, marks it Found in `/my`, asserts the Found badge + no Found button + gone from browse.
    2. Fails at line 41: `expect(getByTestId('listing-card')).toHaveCount(1)` on `/browse`. Root: `/browse` defaults to the **equipment** chip (Land is now last in `ENABLED_CATEGORIES`), so the seeded **land** listing isn't on the default view → 0 cards. Live: mark-Found itself **works** (found badge appears; closed listings are filtered from browse).
    3. Flow exists: **Yes** — the close/"Found" lifecycle works (`get_my_listings` + `close_listing`; `fetchNearby` filters non-active).
    4. Covered elsewhere: No.
    5. **Rewrite** — select the land chip before counting; keep the mark-Found assertions.

18. **expired listing shows Expired in My Listings and is absent from browse** (`phase6:58`)
    1. Seeds an expired labor requirement, asserts "Expired" in `/my`, then `/browse` labor tab shows 0 cards.
    2. Fails at line 74: `getByTestId('tab-labor')` — now `chip-labor`.
    3. Flow exists: **Yes** — expired listings still show "Expired" in My Listings and are excluded from browse (`expires_at` filter).
    4. Covered elsewhere: No.
    5. **Rewrite** — swap `tab-labor` → `chip-labor`.

### phase7 — bilingual (2 failing of 3; `phase7:28` passes)

19. **crop dropdown labels come from the DB and switch language** (`phase7:47`)
    1. Opens the land form, asserts the `#f_crop_id` dropdown has a "Wheat" option in English and "गेहूं" in Hindi after toggling.
    2. Fails: 30s timeout on `getByRole('button',{name:'Offering'})` (source step).
    3. Flow exists: **Yes** — **live-verified**: `#f_crop_id` still exists and its DB-driven options switch language (EN "Arhar (Tur)/Garlic/Gram/Maize/Masoor (Lentil)…" ↔ HI "अरहर (तूअर)/लहसुन/चना/मक्का/मसूर…", incl. Wheat/गेहूं).
    4. Covered elsewhere: No (phase7:28 covers chrome copy, not DB dropdown labels).
    5. **Rewrite** — add the source step; the crop-label assertions still hold (`#f_crop_id` unchanged).

20. **posting works in Hindi UI (functional, not just visual)** (`phase7:63`)
    1. In Hindi, posts a land offer via "दे रहे हैं → ज़मीन → ज़मीन का आकार (2–5 एकड़ select) → self-declaration → जमा करें → लिस्टिंग देखें".
    2. Fails: 30s timeout on `getByRole('button',{name:/दे रहे हैं/})` (the Hindi source step "किसान/व्यापारी → आगे बढ़ें" precedes it). Would also fail on the "ज़मीन का आकार" **select** (now numeric) + rules checkbox.
    3. Flow exists: **Yes** — posting in Hindi works (the newer specs drive exactly this Hindi flow: आगे बढ़ें → दे रहे हैं → मशीन/ज़मीन).
    4. Covered elsewhere: Partial — phase14/15/16 exercise the Hindi post flow (source→type→category→form), though not this exact land-submit-to-"लिस्टिंग देखें" assertion.
    5. **Rewrite** — add source step, numeric size, rules checkbox; keep the "functions in Hindi" intent.

### phase8 — PWA (1 failing of 3; manifest + SW-registration pass)

21. **offline reload shows the app shell, not a blank screen** (`phase8:22`)
    1. Loads `/`, waits for the SW, reloads, asserts "किसान सहयोग" is visible; goes offline, reloads, asserts the cached shell + a "नया खाता बनाएं/Create new account" button still render.
    2. Fails at line 27: `getByText('किसान सहयोग')` — **strict-mode violation, resolves to 3 elements** on the Homepage (brand appears in nav, hero, footer). The line-33 assertion also targets the old Welcome CTA that no longer exists on `/`. Live: offline PWA behavior itself is fine (manifest + SW tests pass; the shell renders offline).
    3. Flow exists: **Yes** — offline app-shell rendering works.
    4. Covered elsewhere: **Yes** — `e2e/phase10_location_pwa.spec.js` "offline: banner shows and the shell stays (no blank screen)" (currently passing) covers this exact behavior with current selectors.
    5. **Merge** — redundant with the newer, passing offline test; remove rather than patch a second offline test with stale Welcome-screen assertions.

### phase9 — whole-system journeys (2 tests)

22. **Journey A: signup → post all 3 categories → My Listings → close one** (`phase9:20`)
    1. Registers, posts land+equipment+labor, asserts 3 in My Listings, one card per browse tab, closes labor, asserts it leaves browse while land stays.
    2. Fails at line 23: `getByRole('button',{name:'English'})` (homepage-as-landing). Downstream it also hits every drift above (source step, numeric land size, rules checkbox, `tab-<cat>`→`chip-<cat>`, "0.0 km away"→"0 km away").
    3. Flow exists: **Yes** — each leg (register, post ×3, My Listings, close, browse-by-category) is live-verified working.
    4. Covered elsewhere: Partial (phase16 exercises the post flow; phase15 the land form) — but no newer test reproduces the full end-to-end journey.
    5. **Rewrite** — high-value end-to-end journey worth keeping; update entry point + all selectors/formats to current reality.

23. **Journey B: 30km filter consistent across all categories** (`phase9:86`)
    1. Seeds near+far listings for land/equipment/labor, asserts each category's browse tab shows exactly the near (0 km) one and filters the far (~55 km) one.
    2. Fails at line 129: `getByTestId('tab-land')` (now `chip-land`); the "0.0 km away" assertion is also stale ("0 km away").
    3. Flow exists: **Yes** — the shared 30 km distance filter is intact and consistent across categories (live-verified: near shown, far filtered; distance label "0 km away").
    4. Covered elsewhere: Partial — `scripts/test/p_0025_visibility.mjs` covers the geofencing/`partitionByRadius` logic at the backend/unit level, but not the cross-category browse UI journey.
    5. **Rewrite** — swap tab→chip testids and the distance format; keep the cross-category consistency assertion.

---

## Closing — recommendation counts

- **Rewrite: 22** — every registration, posting (land/equipment/labor), browse, lifecycle, bilingual,
  and journey flow still exists and matters; only their entry points/selectors/value-formats drifted.
- **Merge: 1** — `phase8` offline-shell (#21), already covered by the passing
  `phase10_location_pwa` "offline: banner shows and the shell stays".
- **Retire: 0** — no flow these tests target has been conceptually removed. The redesigns
  (homepage-as-landing, vendor source step, Land `size_acres`, rules-compliance checkbox, CategoryStrip
  chips, integer distance label) changed *how* each flow works, not *whether* it exists.
- **Uncertain: 0** — every case was resolved by exercising the live flow.
- **🐛 Real bugs found: 0** — importantly, the live walkthrough turned up **no functional regression**.
  Two things that *looked* like failures are intentional changes, confirmed working: the browse distance
  label is now integer km ("0 km away", was "0.0 km away"), and `/browse` defaults to the equipment chip
  because Land was intentionally moved last. Equipment "requires a type", labor "zero workers" / date-range
  validations, mark-Found, crop DB-label language switch, and posting in Hindi were all individually
  verified to still work.

**Common drift causes (for whoever does the rewrites):**
1. Landing page: `/` is the public Homepage; registration/login live at `/welcome`, `/signup`, `/login`
   (from the auth + homepage-landing redesign, `3cc4420` onward). Language toggle is a `हिं/EN` pill.
2. Post flow gained a **source step** (farmer/vendor + "Continue"/"आगे बढ़ें") before Offering/Looking-for
   (`8146f25`).
3. Land size is a **numeric `#f_size_acres`** input, not a bucket `<select>` (`595fbbc`, migration 0028).
4. Every listing form has a **mandatory rules-compliance checkbox** (`data-testid="rules-agree-checkbox"`)
   that gates Submit (`d691da5`, migration 0032).
5. Browse category tabs are a `CategoryStrip` with `data-testid="chip-<cat>"` (was `tab-<cat>`)
   (`76b59e7`); `ENABLED_CATEGORIES` puts **Land last**, so `/browse` defaults to equipment.
6. `ListingCard` distance label is `toFixed(0)` → "N km away".
