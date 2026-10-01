# Kisan Sahyog — Kisan Mela: State Name Normalization + Robust Deduplication

DO NOT ask for approval or questions. Decide and proceed. Read `docs/review/KISAN_MELA_REARCHITECTURE_REVIEW.md`, the current dedup logic in the discovery pipeline, and the current `/kisan-mela` page before starting.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 6 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

**One migration file** for all schema/data changes — use the next available number.

**Commit after every phase. When done, run `git push origin main` and verify `git log origin/main..HEAD` is empty** — this project has previously gone 50 commits without pushing; do not repeat that.

---

## Context — two live issues, and they're connected

1. **The state filter shows both "MP" and "Madhya Pradesh" as separate states.** Different sources write state names differently (MP, M.P., Madhya Pradesh, मध्य प्रदेश, म.प्र.), and the pipeline stores whatever text it found.
2. **Many duplicate Melas are displayed.** The current dedup matches on state + venue + near-date — so a state-name mismatch alone ("MP" vs "Madhya Pradesh") defeats the match and lets the same event in twice. Fixing Issue 1 fixes part of Issue 2, but not all of it. A confirmed live example: **"Pantnagar Kisan Mela, GBPUA&T — Expected Oct 2026"** and **"120th All India Kisan Mela & Agro-Industry Exhibition — 3–6 Oct 2026, GBPUAT Campus, Pantnagar"** are the same event, but slip past dedup because the venue is worded differently and one has an expected month while the other has confirmed dates. Entries written by the original (pre-re-architecture) pipeline's first run may also never have been checked against the newer entries.

**Fix state normalization first (Phase 1), then dedup (Phase 2 onward)** — dedup depends on clean state names.

---

## Phase 0 — Diagnose before changing anything

Query the live `kisan_mela` table and report in the review doc:
- Every distinct `state` value currently stored, with its count (this reveals every variant in use, not just MP — e.g. UP vs Uttar Pradesh may also exist).
- Every group of rows that appears to be the same event (same organizer or nearby venue, overlapping dates), with the specific reason the current dedup failed to catch each group (state mismatch, venue wording, expected-vs-confirmed date, pre-re-architecture row never compared, etc.).
- Confirm the Pantnagar example above appears in this list.

---

## Phase 1 — Canonical state normalization

**1a.** Create a single canonical list (one source-of-truth file, e.g. `src/content/states.js`, or a DB table if preferred) of all 28 Indian states and 8 union territories, each with its official English name, its Hindi name, and every common alias/abbreviation/spelling variant: e.g. Madhya Pradesh ← MP, M.P., M P, Madhya Pradesh, Madhyapradesh, मध्य प्रदेश, मध्यप्रदेश, म.प्र.; Uttar Pradesh ← UP, U.P., उत्तर प्रदेश, उ.प्र.; and equivalents for every other state/UT. **Include legacy/former names as aliases** — Orissa → Odisha, Uttaranchal → Uttarakhand, Pondicherry → Puducherry, and the pre-2020 "Dadra and Nagar Haveli" / "Daman and Diu" → the merged UT "Dadra and Nagar Haveli and Daman and Diu." Matching must be case-insensitive and tolerant of extra spaces/punctuation.

**1b.** Write one shared `normalizeState()` function and apply it at **every** point a Mela enters the system: the free aggregator scraper, the scoped broad search, the per-candidate verification/promotion step, and the farmer submission form (submission form should use a dropdown of canonical states rather than free text, so new submissions can't introduce variants at all).

**1c. Unknown values must not be silently dropped or guessed.** If a stored or incoming state value cannot be mapped to any canonical state (e.g. a city name in the state field, or genuinely ambiguous text), log it clearly and leave it for admin review — never guess, and never silently discard the Mela because of it. Where a value is missing or unmappable but the entry has valid map coordinates, the state may be derived from reverse geocoding (the BigDataCloud reverse-geocoding integration already exists) — log when this fallback was used.

**1d. Backfill existing data:** normalize every existing `state` value in both `kisan_mela` and `kisan_mela_candidates` in the migration. Report any values that couldn't be mapped.

**1e. Filter dropdown:** build the `/kisan-mela` state filter only from canonical names that actually have at least one active Mela — never from raw stored strings. Show the Hindi state name in Hindi mode and the English name in English mode (through the existing i18n system). Confirm "MP" no longer appears and all former "MP" entries now appear under "Madhya Pradesh" / "मध्य प्रदेश."

---

## Phase 2 — Robust duplicate matching (replace the current venue-text-based match)

**2a. Match on map location, not venue wording.** Every Mela already gets geocoded coordinates via the existing Nominatim pipeline. Treat two entries as the same event when **all** of these hold:
- Canonical state matches (after Phase 1), AND
- Venues are within a small distance of each other (start around 5 km — tune using the Phase 0 findings and document the final threshold), AND
- Date ranges overlap or are within a few days of each other, where an "अपेक्षित" (expected) month counts as overlapping any confirmed date falling inside that month.

**2a-i. Only trust coordinates when the geocode is precise — this prevents false merges.** Nominatim frequently cannot resolve an exact venue and falls back to a town/city/district centroid. Two genuinely different Melas in the same city in the same week (e.g. a KVK Mela and a separate expo, both in Bhopal) would then share the same centroid and be wrongly merged — hiding a real event, which is worse than showing a duplicate. Record the geocode's precision (Nominatim returns the matched place type/class — e.g. a specific building/campus vs. a city or district) when geocoding, and store it (add a `geocode_precision` column). Use the coordinate-distance match **only** when both entries have venue-level precision. When either entry is only city/district-level, coordinates alone are never sufficient — also require the normalized organizer/venue text match from 2b. When in doubt, do not merge.

**2b. Supporting signal when coordinates are missing or imprecise:** if either entry lacks reliable coordinates, fall back to a normalized-text match on organizer name + venue (lowercase, strip punctuation, collapse common variants like "GBPUA&T" / "GBPUAT" / "G.B. Pant University") combined with the same date-overlap rule. Never merge on name similarity alone.

**2c. Must NOT merge genuinely different events.** The same venue often hosts separate editions in the same year — e.g. PAU Ludhiana's spring (March) and autumn (September) Melas are different events. Date-window matching must keep these separate. Write this explicitly as a test case (Phase 5).

---

## Phase 3 — Merge rules (when duplicates are found)

**3a. Pick the survivor:** prefer the entry with confirmed dates over an "अपेक्षित" one; then the one verified against an official primary source; then the one with more complete fields (address, highlights, contact); then the most recently checked.

**3b. Combine, don't lose:** merge every `source_urls` entry from all duplicates into the survivor (deduplicated) — this also correctly earns the "कई स्रोतों से जानकारी मिली" multi-source badge. Fill any field empty on the survivor but present on a duplicate.

**3c. Preserve farmers' interest marks:** re-point every `kisan_mela_interest` row from a merged-away duplicate to the survivor (skip if the same user already marked the survivor, so the primary key isn't violated). No farmer should lose an "I'm interested" mark because of a merge. Also re-point any `kisan_mela_candidates.kisan_mela_id` references to the survivor.

**3d. Deactivate, don't hard-delete:** set merged-away rows to `is_active = false` with a `merged_into` reference to the survivor's id (add this column), so every merge is reversible and auditable.

**3e. Shared links must not break.** If a Mela has its own detail URL or a link that may already have been shared on WhatsApp, any link pointing to a merged-away entry must redirect to its `merged_into` survivor — never land on an empty or "not found" page. Check how Mela links are currently constructed (detail page by id, or anchor on `/kisan-mela`) and apply the redirect accordingly.

**3f. Admin visibility and undo.** Merges happen automatically with no human review, so add a "हाल के विलय" (recent merges) section to the existing admin Kisan Mela area: each merge listed with survivor, merged-away entry, and the reason/matching signals used, plus a "अलग करें" (split) action that reactivates the merged-away row, removes its `merged_into` link, restores its own source URLs, and moves back any `kisan_mela_interest` rows that originally belonged to it (track original ownership so this is possible). A split pair must also be remembered so the next pipeline run doesn't re-merge them (store the pair as a "do not merge" exclusion).

---

## Phase 4 — Apply the new dedup everywhere + one-time cleanup

**4a. One-time cleanup:** run the Phase 2/3 logic across all existing active `kisan_mela` rows (including rows from the original pre-re-architecture pipeline). Report every merge performed in the review doc: which rows merged into which survivor, and why.

**4b. Ongoing:** use the same matching logic at every entry point — scraper insertion into candidates (2b-i of the re-architecture), verification/promotion into `kisan_mela`, and admin approval of farmer submissions (an approved submission matching an existing event should merge into it, not create a duplicate). Remove or replace the old venue-text dedup so there is one dedup implementation, not two. **Note the stage difference:** candidates at the scraper stage are not yet geocoded (geocoding happens at verification/promotion), so the candidate-stage check must use the normalized text + date-overlap fallback (2b), while the full location-based check (2a/2a-i) applies at promotion time. Both stages use the same shared functions, not two separate implementations.

**4c. Safety check after cleanup:** confirm the active Mela count went down only by the number of merges reported, and that no Mela disappeared without a recorded `merged_into` survivor.

---

## Phase 5 — Testing (permanent, mocked; never hitting live sites or the live API)

Positive, negative, and edge cases:
- `normalizeState()`: MP / M.P. / मध्य प्रदेश / म.प्र. / "madhya pradesh " all → "Madhya Pradesh"; UP / उत्तर प्रदेश → "Uttar Pradesh"; an unmappable value is logged and not guessed; a missing state with valid coordinates is derived via reverse geocoding.
- Dedup: the Pantnagar pair (expected Oct vs confirmed 3–6 Oct, different venue wording, same location) merges into one; "MP" vs "Madhya Pradesh" duplicates merge after normalization; PAU's March and September Melas at the same venue stay separate; two genuinely different events on the same date in different districts stay separate; **two genuinely different events in the same city in the same week, both geocoded only to the city centroid, stay separate (direct test for 2a-i's false-merge guard)**; a pair split by an admin is not re-merged on the next run.
- Shared links: a link to a merged-away entry redirects to its survivor; the admin "split" action correctly restores the merged-away entry, its sources, and its original interest marks.
- Merge rules: confirmed-date entry survives over expected; `source_urls` are combined; `kisan_mela_interest` rows are re-pointed without primary-key violations; merged rows are deactivated with `merged_into`, not deleted.
- Filter dropdown shows only canonical names with active Melas; "MP" never appears.
- The digest-readiness window function still works on merged survivors (regression).

Re-run the full existing suite. **If any test fails, name it, state what it checks, and state whether it is related to this change — do not label any failure "pre-existing, unrelated" without evidence** (this label has been wrong twice before in this project). Bug-fix loop: after any fix, re-run the entire suite, not just the failed test.

---

## Phase 6 — Screenshot review + deploy

Screenshots at 1280×800 and 375×812 of: the `/kisan-mela` state dropdown (showing "Madhya Pradesh" only, no "MP"); the page filtered to Madhya Pradesh showing all MP events together; the Pantnagar event appearing once, with merged sources and the multi-source badge; a general scroll of the list confirming no visible duplicates. **View every one.** Then deploy, re-check the live URL, and push.

Write `docs/review/KISAN_MELA_DEDUP_STATE_REVIEW.md`: Phase 0 findings, all state values normalized (and any unmappable ones), every merge performed with reasons, the final distance/date thresholds chosen, and before/after active Mela counts.

Commit message: "Kisan Mela: canonical state normalization (all states/UTs with Hindi + abbreviation aliases, applied at every entry point, backfilled); location-based dedup (coordinates + date overlap, expected-month aware, keeps separate editions apart); merge rules preserving sources and farmers' interest marks; one-time cleanup with audit trail; tests; screenshot-reviewed"
