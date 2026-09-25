# Kisan Sahyog — Combined Overnight Run: Village Geocoding (Part A) + Land Acreage (Part B)

DO NOT ask for approval or questions. Decide and proceed. This is an unattended overnight run — the person will review results in the morning, not mid-run. Work through Part A completely, in order, then Part B completely, in order. Do not skip ahead.

**Repo:** https://github.com/Himanshu1305/Kissansahyog

## Execution rules for this combined run

1. **Commit after every numbered phase in both parts** — `git add -A && git commit -m "<phase description>"` — even though the phase isn't independently deployed yet. This means if the session is interrupted at any point (session limit, crash, rate limit), whatever phases completed are safely checkpointed in git history, and a fresh session can see exactly how far it got via `git log` before deciding how to continue.

2. **Only ONE production deploy, at the very end** — after Part B's final Phase 4 passes its screenshot review. Do not run `npx wrangler pages deploy` after Part A finishes on its own, even though Part A has its own "Phase 5" review step below — that step's screenshots and tests run against the local build/preview, not a production deploy. The single deploy command runs once, after everything in both parts is done and verified.

3. **Hard stop condition:** if Part A's Phase 1-5 cannot be completed successfully (a blocking failure, not just a minor issue), STOP — do not proceed to Part B under any circumstances. Land Acreage's Phase 1a in Part B checks for Part A's completion and will correctly refuse to proceed against an incomplete geocoding system — but since this is one continuous session, you already know whether Part A actually succeeded, so don't let it get to that check; stop earlier and write a clear summary of what's blocking before ending the session.

4. **Write one combined final summary** at the very end (after the single deploy), listing every phase from both parts, its commit hash, and pass/fail status — in addition to the individual review docs each part's phases already call for.

5. **If you are resuming this session after an interruption** (session limit, crash, or any stop mid-run): do NOT restart from Phase 1. First run `git log --oneline -20` to see which phases already have a commit, and check for `docs/review/VILLAGE_GEOCODING_FINDING.md` and any other review docs already written. Continue from the first phase that has no corresponding commit. If Part A's commits are all present but Part B has none, Part A is done — proceed straight to Part B, starting with its own Phase 1a dependency check (which should now pass, since Part A already completed in a prior session).

6. **Permanent automated tests must mock the Nominatim response, not call the live API.** Live Nominatim calls are for this session's one-time manual verification only (Phase 4a of Part A, and the CSP/network-tab checks) — confirm the integration actually works end to end with one real call, then write the permanent regression tests (the ones future builds will re-run as their baseline check) against a mocked/stubbed response. A permanent test suite that hits a shared, rate-limited public service on every future run is a standing liability for this project, not a one-time convenience.

---

# PART A — Village Geocoding


## Context — the actual bug being fixed

Indian rural postal pincodes commonly cover a cluster of villages spread across a real geographic area — sometimes 10km or more across — because one post office serves several villages. If the platform's 30km-radius distance matching (used for nearby listings, "आपके आसपास" counts, and mandi-distance ranking) has been anchored to pincode-level coordinates, then two villages that are genuinely 15-20km apart but share a pincode would currently be treated as being at the exact same point. This silently degrades the accuracy of every distance shown on the platform, not just for one category — it needs a platform-wide fix, not a narrow patch in one feature.

**The correct fix:** village name becomes the real anchor, not pincode. Coordinates come from geocoding the actual village name, using the same class of free service already proven in the last build (BigDataCloud does reverse geocoding — coordinates to name; this prompt adds forward geocoding — name to coordinates — via a free, keyless service, most likely Nominatim/OpenStreetMap's public API, which has a real entry for most named villages in India). Pincode, if it remains anywhere, becomes a fallback only, never the primary distance anchor.

---

## Phase 1 — Investigate current state before changing anything

**1a.** Grep the entire codebase for every place distance/proximity is calculated: the nearby-listings query, the `nearby_counts` RPC, the MSP mandi-distance ranking, and any other consumer of location for a 30km/50km/100km threshold. For each one, confirm exactly what coordinate source it currently uses — pincode-derived lat/lng, the 8-village `matchedVillage` lookup, or something else. Do not assume; read the actual query/function code.

**1b.** Check how many distinct pincodes exist across the current dummy/seed listing data, and whether any two of the seeded villages (Khurai, Sagar, Bina, Rehli, Deori, Banda, Rahatgarh, Malthon) already share a pincode or are already precisely enough distinguished. Document the actual current state of the bug — is it theoretical (seed data happens to have distinct pincodes per village) or already demonstrably wrong with real seed data (two different villages resolving to identical or near-identical coordinates)?

**1c.** Write findings plainly in `docs/review/VILLAGE_GEOCODING_FINDING.md` before writing any fix code.

---

## Phase 2 — Forward geocoding service

**2a.** Add forward geocoding using a free, keyless service — Nominatim (OpenStreetMap) is the standard choice: `https://nominatim.openstreetmap.org/search?q={village name}, {district}, Madhya Pradesh, India&format=json&limit=1`. Nominatim's usage policy requires a descriptive `User-Agent` header identifying the application (e.g. `Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)`) and a maximum of 1 request per second.

**2a-i. Enforce the rate limit server-side — do not rely on documentation alone.** If multiple listings are created around the same time with new (uncached) village names, concurrent Nominatim calls will exceed 1/sec with nothing stopping them, risking the whole domain being rate-limited or blocked by OpenStreetMap. Implement a real serialized queue: a single worker/function that processes geocoding requests one at a time with a minimum 1-second gap between actual outbound calls to Nominatim (e.g. a Cloudflare Durable Object, or a database-backed job table with a `last_nominatim_call_at` timestamp that each call checks and waits against before firing). New village names are enqueued rather than geocoded inline in the request that introduced them — see 2e for what this means for the listing form's UX.

**2b. CSP.** Add `https://nominatim.openstreetmap.org` to `connect-src` in `_headers` — same lesson as the last build's BigDataCloud omission; do this first, verify the request actually reaches the service (Network tab, 200 response) before building anything on top of it.

**2c. Caching — this matters for both cost/politeness to Nominatim and for consistency.** Once a village name is successfully geocoded, cache the result permanently (a small `village_coordinates` table: `village_name text, district text, latitude numeric, longitude numeric, source text default 'nominatim', resolved_at timestamptz` — or extend whatever table already holds the 8 pilot villages, if one exists as a proper DB table rather than a JS constants file per the consumer-audit finding from the weather-split build). Never re-geocode the same village name twice — check the cache first, only enqueue a Nominatim call for names not already resolved.

**2d. Failure handling.** If Nominatim returns no result for a typed village name (misspelling, a very small hamlet not in OpenStreetMap, network failure): fall back to asking for a nearby larger town/tehsil name, or as a last resort accept a pincode as a coarser fallback — never silently fail to store any location at all. Log unresolved village names somewhere admin-visible (even a simple table row) so patterns of consistently-failing names can be reviewed and manually corrected later.

**2e. Non-blocking listing creation — do not let geocoding delay slow the post-listing flow.** Given a farmer may be on poor rural connectivity, and given 2a-i's queue can introduce a real wait when many new villages are being resolved at once, the listing form must NOT block submission on a live geocoding round-trip. Flow: on submit, if the typed village name is already in the `village_coordinates` cache, use it immediately (fast path, no wait). If it's a new name, save the listing immediately with a `geocoding_status: 'pending'` flag and enqueue the geocoding job — the listing is created and visible in category browsing right away, but is excluded from distance-sorted views (nearby listings, आपके आसपास counts) until geocoding resolves, typically within seconds. Once the queued job completes, update the listing's stored coordinates and flip the status, making it appear in distance-based results. Show the poster a brief, honest note if their village was new: "आपकी जगह की पुष्टि हो रही है — कुछ ही देर में लिस्टिंग नज़दीकी खोज में दिखेगी।"

---

## Phase 3 — Replace pincode as the primary distance anchor

**3a.** For every consumer identified in Phase 1a: change the coordinate source from pincode-derived lat/lng to the village-geocoded lat/lng (from Phase 2's cache, or the existing 8-village lookup where applicable — that lookup was already doing this correctly, just extend the same pattern to any village, not only the 8 pilot ones).

**3a-i. Denormalize — each listing stores its own resolved coordinates.** Do not make distance queries join against `village_coordinates` live on every read. At the point a listing's village name resolves (immediately for a cache hit, or when Phase 2e's queued job completes for a new name), write the resolved `latitude`/`longitude` directly onto the listing row itself — same pattern already used for every other category's asset location. `village_coordinates` is the geocoding cache and lookup table, not something distance queries read from directly at request time.

**3b.** Listing creation forms across every category that captures a location for distance-matching: change the input from "pincode" to "village name" (with autocomplete against the `village_coordinates` cache for previously-resolved names, falling through to the Phase 2e queued-geocoding flow for a new name). This is a form-field relabeling plus a backend source-of-truth change, not a new UI paradigm — keep the existing form layout, just change what's being asked for and where the coordinates come from.

**3c.** Decide, and document the decision, on backward compatibility for existing seed/dummy listings that only have a pincode on file: either (a) batch-geocode their existing village-name field if one exists separately from pincode, or (b) leave existing seed listings on their current pincode-derived coordinates as a known, documented approximation while all new listings use the corrected village-geocoding path going forward. Do not silently leave this ambiguous — pick one and say so in the review doc.

**3d. Pincode's remaining role.** Keep pincode as a fallback input only (for `LocationControl`'s manual-entry path when a user doesn't know or want to type a village name) — resolve a manually-entered pincode to its rough area centroid as before, but this is now explicitly the less-precise fallback option, not the default or primary path for listings.

---

## Phase 4 — Verification against the actual reported problem

**4a.** Test with at least two real village names that plausibly share a pincode in the Sagar district area (research actual pincode boundaries for the district if needed, or construct a clear test case) — confirm they now resolve to genuinely different coordinates via Nominatim, and that the 30km distance calculation between them is now accurate rather than showing 0km or an identical point.

**4b.** Re-verify the 8 existing pilot villages still resolve correctly and consistently with whatever the weather/mausam system already uses for them (per the 1a-ii consistency rule from the location-naming build) — this refactor must not cause the same village to show two different coordinate sets in different parts of the app.

---

## Phase 5 — Screenshot self-review + tests (mandatory before deploy)

Screenshots at 1280×800 and 375×812 of: a listing creation form showing the village-name input (with autocomplete for known villages); a listing posted with a brand-new (never-cached) village name showing the "आपकी जगह की पुष्टि हो रही है" pending note and appearing correctly once geocoding resolves; the resulting listing card showing accurate distance for a newly-geocoded, non-pilot village; the admin view of any unresolved-geocoding log entries if Phase 2d's fallback was exercised during testing. **View every one.**

Add permanent tests: forward geocoding resolves a known village name to expected coordinates (positive); two villages known to share a pincode resolve to genuinely different coordinates and produce a non-zero, accurate distance between them (this is the direct regression test for the reported bug); a geocoding failure for a nonsense/misspelled village name falls through cleanly per Phase 2d, never crashing or silently defaulting to 0,0; posting a listing with a new village name does not block on the geocoding call — the listing save completes immediately regardless of queue length (Phase 2e, positive); simulating several new village names submitted in quick succession confirms actual outbound Nominatim calls are serialized with the enforced 1-second minimum gap, not fired concurrently (Phase 2a-i, the direct regression test for the rate-limit risk). Re-run the full existing suite — confirm the geofencing (mega-prompt), weather-split, and location-naming tests from prior builds all still pass after this refactor of the shared distance-calculation code.

Write `docs/review/VILLAGE_GEOCODING_REVIEW.md` covering all five phases, explicitly stating the Phase 3c backward-compatibility decision and the Phase 1b/4a findings on whether the bug was real in current seed data or theoretical-but-now-prevented.

Commit message: "Replace pincode as the primary distance anchor with village-level forward geocoding (Nominatim, free/keyless, cached); fixes distance inaccuracy for villages sharing a postal pincode; pincode retained only as a manual-entry fallback; applies across nearby-listings, आपके आसपास counts, and mandi-distance ranking; permanent regression tests; screenshot-reviewed"

---

**End of Part A. Confirm Part A's Phase 5 fully passed (all tests green, screenshots viewed, review doc written, git commit made) before proceeding to Part B below. Do NOT run a production deploy here — proceed directly to Part B first.**

---

# PART B — Land Acreage


## Context

Land listings currently use size-range buckets (e.g. "1–2 एकड़", "2–5 एकड़", "5–10 एकड़"), which caps how large a listing can be. A farmer with 50 acres to give on contract should be able to list exactly that — the farmer decides the size, not a dropdown. This applies uniformly to all three Land listing sub-types: ठेका (fixed-price contract), बटाई (sharecropping), and पट्टा (lease).

**Desired end-state fields for a Land listing:**
- Land size in acres — a plain numeric input, no upper limit, no bucket selection.
- Village name / location — **this prompt depends on the village-level geocoding fix (docs/VILLAGE_GEOCODING_PROMPT.md) having already landed.** That prompt replaces pincode as the platform's distance anchor with real village-name-based coordinates (via forward geocoding, cached in a `village_coordinates` table). This Land prompt must use that system directly: a village-name input with autocomplete against `village_coordinates`, falling through to the same forward-geocoding path for a new village name. **Do not fall back to a pincode-based location field for Land listings** — if Phase 1's inspection finds the village-geocoding system has NOT yet landed (still pincode-only), stop and report this as a blocking dependency rather than building against the old system.
- Per-acre rate — numeric, ₹/acre.
- Contact number — confirm whether this already exists (via the poster's profile phone) or needs to be an explicit per-listing field if a farmer wants a different contact number for this specific listing than their account's default.

**Privacy requirement:** the exact plot location is never shown publicly — only village/area name, exactly matching the display pattern already used on every other listing card across the platform ("📍 [Village], Sagar"). Exact plot details and final negotiated price are discussed directly between farmer and buyer once they connect via WhatsApp/call — the listing exists to start that conversation, not to finalize the deal.

---

## Phase 1 — Inspect current implementation

**1a. Dependency check first.** Confirm the village-level geocoding fix from `docs/VILLAGE_GEOCODING_PROMPT.md` has been applied — check for a `village_coordinates` table (or equivalent) and confirm the nearby-listings/distance logic no longer relies on pincode as its primary anchor. If this dependency has not landed yet, stop here, do not proceed with the rest of this prompt, and report that Village Geocoding must run first.

**1b.** Read the actual Land category's listing schema (whatever JSONB shape or dedicated columns it currently uses), the listing creation form component for Land, and the listing card/detail display component for Land. Document in the review doc: the current size-bucket field name and values, and whether contact number is already sourced from the poster's profile or is a separate field.

**1c.** Confirm whether the existing display pattern already shows only village-level location (not exact address) for Land listings, matching every other category — if this is already true, no display change is needed there, only the size-input change (Phase 2). If Land listings currently show anything more precise than village/district, fix that as part of this prompt too.

---

## Phase 2 — Remove size buckets, add plain numeric acreage

**2a.** In the Land listing creation/edit form, replace the size-range bucket selector with a plain numeric input: "ज़मीन का आकार (एकड़ में)" — accepts any positive number, no upper limit, reasonable lower bound (e.g. minimum 0.1 acre) to prevent nonsense entries, no bucket/dropdown UI remaining. Apply this identically for ठेका, बटाई, and पट्टा — do not keep different size-input behavior per sub-type.

**2b.** Update the underlying schema: if size is currently stored as a bucket string (e.g. `size_range: "2-5"`), migrate it to a numeric field (e.g. `size_acres: numeric`). Write a migration that adds the new numeric column and, for existing dummy/seed listings using bucket strings, converts them to a representative numeric value (e.g. "2–5 एकड़" → `3.5`) so existing seed data doesn't break — clearly comment in the migration that this is an approximation for pre-existing bucketed data, not a precision claim.

**2c.** Update the listing card and detail view to display the exact numeric acreage (e.g. "50 एकड़") instead of a bucket range.

---

## Phase 3 — Per-acre rate and contact number fields

**3a.** Confirm whether a per-acre rate field already exists for Land listings (the original schema mentioned "price type: fixed/sharecropping/negotiable" — determine if a numeric ₹/acre value is already captured for the fixed/ठेका type, or only a type flag with no numeric rate). Add a numeric per-acre rate field if missing: "प्रति एकड़ दर (₹)" — required for ठेका, optional/not applicable for बटाई (which is typically a % split, not a flat rate — keep बटाई's existing rate/split mechanism unchanged unless Phase 1's inspection shows it also needs this field).

**3b.** Confirm whether contact number is already sourced from the poster's account profile for all listings. If a farmer should be able to specify a different contact number for a specific listing (e.g. a family member's number), add an optional per-listing contact number field, defaulting to the profile's number if left blank — do not make this required if the profile number is already sufficient for the platform's existing contact/WhatsApp-share pattern.

---

## Phase 4 — Screenshot self-review + tests (mandatory before deploy)

**4a.** Screenshots at 1280×800 and 375×812 of: the Land listing creation form (ठेका, बटाई, पट्टा — showing the plain numeric acreage input, no buckets, no cap) and the listing card/detail view showing a large listing (test with 50 acres specifically, per the original request) displaying correctly with village name only, no exact address. **View every one.**

**4b.** Confirm the 30km-radius visibility rule still applies correctly to Land listings after this change — a 50-acre Land listing should behave identically to any other listing for distance-based visibility (Phase 0's geofencing logic from the earlier mega-prompt build is untouched by this change; verify, don't assume).

**4c.** Add/update permanent tests: a Land listing can be created with a size far exceeding the old bucket maximum (e.g. 50 acres) and is stored and displayed correctly; the migration correctly converts existing bucketed seed data to numeric values without data loss; village-level (not exact) location still displays on Land listing cards. Re-run the full existing suite, confirm no regressions.

Write `docs/review/LAND_ACREAGE_REVIEW.md` documenting Phase 1's findings (what was actually already there) and the final state of all fields.

Commit message: "Land listings: removed size-range buckets in favour of plain numeric acreage (no upper limit) across ठेका/बटाई/पट्टा; confirmed/added per-acre rate and contact number fields; village-only location display confirmed; migration converts existing bucketed seed data; screenshot-reviewed"

---

## Final step — the single production deploy for this whole overnight run

Only after Part B's Phase 4 has fully passed (tests green, screenshots viewed, review doc written, git commit made):

```bash
npm run build && npx wrangler pages deploy dist --project-name kissansahyog
```

Then re-verify the live staging URL matches what was verified locally (same discipline as every prior build this session — screenshot the live site, view it, confirm it matches).

Write the combined final summary called for in the Execution Rules above, as `docs/review/OVERNIGHT_VILLAGE_GEOCODING_LAND_ACREAGE_SUMMARY.md`, and stop. The person will review this and the live site in the morning.
