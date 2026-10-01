# Kisan Mela — state normalization + robust deduplication review

**Date:** 2026-10-01
**Spec:** `docs/KISAN_MELA_DEDUP_STATE_PROMPT.md`
**Migration:** `0037_kisan_mela_dedup_state.sql`

---

## Phase 0 — Diagnosis (live `kisan_mela`, before any change)

### Distinct `state` values (all rows)

| state | count | canonical? |
|---|---:|---|
| Maharashtra | 9 | ✓ |
| Punjab | 5 | ✓ |
| Delhi | 5 | ✓ |
| Karnataka | 5 | ✓ |
| Uttar Pradesh | 5 | ✓ |
| Uttarakhand | 4 | ✓ |
| Haryana | 3 | ✓ |
| Rajasthan | 3 | ✓ (all 3 are test junk — see below) |
| Gujarat | 2 | ✓ |
| Madhya Pradesh | 2 | ✓ |
| **MP** | **1** | ✗ → Madhya Pradesh |
| **Chandigarh (UT)** | **1** | ✗ → Chandigarh |
| Telangana, Odisha, Bihar, Andaman and Nicobar Islands, Jharkhand | 1 each | ✓ |

**Two non-canonical variants confirmed:** `MP` (→ Madhya Pradesh) and `Chandigarh (UT)` (→ Chandigarh).
`kisan_mela_candidates.raw_state` is mostly `null` (60/64) because the scraper doesn't populate it; the
few set values were already canonical.

### Duplicate groups (active rows) and why the current (name+state) dedup missed each

Active before cleanup: **49**.

| # | Event (location) | Rows | Why current dedup failed |
|---|---|---|---|
| A | **Pantnagar autumn Kisan Mela** — GBPUAT, Udham Singh Nagar, Uttarakhand | `22222222` (EXP Oct 2026, seed, has coords), `d0cf533b` (confirmed 3–6 Oct 2026), `5dab16f8` (confirmed 3–6 Oct 2026) | Names worded completely differently ("Pantnagar Kisan Mela, GBPUA&T" vs "120th All India Kisan Mela & Agro-Industry Exhibition"); expected-month vs confirmed dates; the seed row was never compared to pipeline rows. **This is the Pantnagar example from the spec.** |
| — | Pantnagar **spring** edition `626c686e` (EXP March 2027) | — | **Must stay separate** (different edition, ~5 months apart) — the live 2c case. |
| B | **UAS Bengaluru Krishi Mela** — GKVK, Bengaluru, Karnataka | `44444444` (confirmed Oct 22–25 2026, seed), `79d5dd13` (EXP Nov 2026) | "Bengaluru" vs "Bangalore (GKVK)"; expected vs confirmed; seed vs pipeline. |
| C | **Pusa Krishi Vigyan Mela** — IARI, New Delhi | `dc5304cf` (EXP Feb 2027), `33333333` (EXP Feb 2027, seed, has coords) | Seed vs pipeline row never compared. |
| D | **Horti Agri India Expo 2027** — Yashobhoomi, Dwarka, Delhi | `d5a304d1`, `544a21fa` (both confirmed 5–7 Mar 2027) | Two groups promoted in the **same run** didn't check against each other. |
| E | **KISAN Agri Show 2026** — Pune Intl Exhibition Centre, Maharashtra | `4319c151`, `e3fdbbdd`, `f9e434d0` (all confirmed 9–13 Dec 2026) | Same run, three separate promotions, no in-run dedup. |
| F | **Agroworld Expo 2026** — Jalgaon, Maharashtra | `626e234b`, `cdee1eb2` (both confirmed 20–23 Nov 2026, same coords) | Same run, two promotions, no in-run dedup. |

**Root causes:** (1) corroboration used **name-Jaccard + state** only — venue/location and expected-vs-confirmed
dates were ignored; (2) a state mismatch (`MP` vs `Madhya Pradesh`) alone defeats the match; (3) promotions
within a single run never checked against rows promoted earlier in the **same** run (D/E/F); (4) seed /
pre-re-architecture rows were never re-compared against newer pipeline rows (A/B/C).

### Test-data pollution found on the live public page (not real events)

| id | name | note |
|---|---|---|
| `8c8441d5` | "Test Lead", state **MP** | leftover test row (also the sole `MP` state value) |
| `5def1d75`, `d01032ff`, `4a518b58` | "REJECTED CANDIDATE BACKENDTEST …", Rajasthan | orphaned rows from an earlier `p_mela_backend.mjs` publish-anyway run (before cleanup was added) |

These 4 are active + approved and visible to farmers. They will be **deleted** (documented separately
from merges — they are test artifacts, not real melas), so the "no visible duplicates" screenshot is clean.

### Interest marks
`kisan_mela_interest` currently has **0 rows**, so the one-time cleanup moves none — but the interest
re-pointing logic (3c) is implemented and covered by mocked tests regardless.

### Expected cleanup math
49 active − 8 merged-away (A:2, B:1, C:1, D:1, E:2, F:1) − 4 test rows deleted = **37 active** after cleanup.

---

---

## Phase 1 — Canonical state normalization

- **`src/content/states.js`** is the single source of truth: all 28 states + 8 UTs, each with its
  English name, Hindi name, and aliases (abbreviations, spellings, Hindi forms, and legacy names —
  Orissa→Odisha, Uttaranchal→Uttarakhand, Pondicherry→Puducherry, pre-2020 Daman/Dadra → merged UT).
  `normalizeState()` matches case/space/punctuation-insensitively (collapsing to a latin-alnum +
  Devanagari key) and returns **null** for anything unmappable — never a guess.
- Applied at **every entry point** (1b): scoped broad search, verification/promotion, and the
  submission form (now a **canonical dropdown**, not free text) + `submitMela` defense-in-depth.
- **1c:** when a promoted row's state can't be mapped, the pipeline reverse-geocodes the coordinates
  (BigDataCloud `principalSubdivision`) and logs the fallback; if still unmappable it logs a
  `::warning::` and leaves the row for admin review — never dropped.
- **1d backfill** (migration `0037`): a SQL mirror of the alias map folded every existing
  `kisan_mela.state` and `kisan_mela_candidates.raw_state`. **Applied live.**

**All state values normalized (live, before → after):**

| before | after |
|---|---|
| `MP` (1) | → Madhya Pradesh |
| `Chandigarh (UT)` (1) | → Chandigarh |
| all others | already canonical (unchanged) |

**Unmappable values:** none. After normalization the distinct states are all canonical
(Andaman and Nicobar Islands, Bihar, Chandigarh, Delhi, Gujarat, Haryana, Jharkhand, Karnataka,
Madhya Pradesh, Maharashtra, Odisha, Punjab, Telangana, Uttar Pradesh, Uttarakhand).

- **1e filter dropdown:** built only from canonical names of active melas (`statesIn`), shown in
  Hindi/English via `stateLabel`. **"MP" no longer appears** (verified live + e2e).

## Phase 2 — Robust duplicate matching (`scripts/mela/dedup.mjs`, one shared module)

`matchEvents()` — two entries are the same event ⇔ **canonical state compatible** AND **dates
overlap/near** AND (**precise-coordinate location match** OR **normalized text match**).

**Final tuned thresholds (chosen from the Phase 0 data, documented here per 2a):**
- **Distance: 5 km** (`MERGE_MAX_KM`) for a coordinate match.
- **Date window: 7 days** (`DATE_WINDOW_DAYS`) — merges a confirmed date with an adjacent "expected"
  month of the same event (e.g. Pantnagar's expected-Oct vs confirmed 3–6 Oct), while keeping
  distinct editions months apart (PAU March vs September).
- **2a-i:** coordinates merge **only** when BOTH rows are `geocode_precision = 'venue'`; at city/
  district centroid precision, text corroboration is also required — guards the "two different events
  in one city the same week" false-merge.
- **2b text match:** institution identity (collapses GBPUAT / UAS-Bengaluru / IARI / PAU variants),
  identical/one-contains-other venue, identical organizer, or a strong distinctive-name overlap —
  gated by a **district check** so an institution's different regional melas don't merge.

## Phase 3 — Merge rules

- **Survivor (3a):** confirmed > expected, then verified-against-primary-source, then more complete,
  then most recently checked. **Combine (3b):** union all `source_urls` (earns the multi-source
  badge), fill blank survivor fields, adopt a confirmed date over an expected one.
- **Preserve interest (3c):** re-point `kisan_mela_interest` to the survivor (skip a user already on
  it; record `original_mela_id`); re-point `kisan_mela_candidates.kisan_mela_id`.
- **Deactivate, don't delete (3d):** merged-away rows → `is_active=false` + `merged_into` + reason + time.
- **Link redirect (3e):** `/kisan-mela?mela=<id>` resolves a merged-away id to its active survivor
  (`resolve_active_mela`) and scrolls/highlights the card — no 404. Share URLs now carry `?mela=<id>`.
- **Admin visibility + undo (3f):** a "हाल के विलय" panel lists every merge with survivor + reason and
  an "अलग करें" (split) action (`admin_split_mela`) that reactivates the row, moves its original
  interest back, and records a **do-not-merge exclusion** so the next run won't re-merge the pair.

## Phase 4 — One dedup implementation everywhere + one-time cleanup

- The old name-only matcher was removed; `verify.mjs` now uses the shared matcher for candidate
  grouping (text+date — scraper leads aren't geocoded yet, per the note in 4b), live corroboration,
  and a **final `dedupActiveMelas` pass every run** that merges any duplicate created that run or
  against a pre-existing row. Approved farmer submissions merge into existing events via that same
  active-set pass. One implementation, two stages.

**One-time cleanup (4a) — every merge performed:**

| Survivor | Merged-away | Why |
|---|---|---|
| 120वां अखिल भारतीय किसान मेला (GBPUAT, Uttarakhand) | Pantnagar Kisan Mela GBPUA&T (seed) + 120th …Agro-Industry Exhibition | same institution + overlapping Oct dates (expected-Oct ↔ confirmed 3–6 Oct) |
| Pusa Krishi Vigyan Mela, IARI (Delhi) | Pusa Krishi Vigyan Mela | same institution (IARI), Feb 2027 |
| Krishi Mela, UAS Bengaluru (Karnataka) | Krishi Mela 2026, UAS Bangalore (GKVK) | same institution (UAS-Bengaluru), same district |
| KISAN Agri Show 2026 (Maharashtra) | KISAN Agri Show 2026 (34th edition) + KISAN Agri Show 2026 | identical venue (Pune Intl Exhibition Centre) + dates — same-run dups |
| Agroworld Expo 2026, Jalgaon (Maharashtra) | Agroworld Expo 2026 (26th Edition) | identical venue + coords + dates |
| Horti Agri India Expo 2027 (Delhi) | Horti Agri India Expo 2027 | identical venue (Yashobhoomi) + dates |

**Also removed 4 test-pollution rows** (not real events): "Test Lead" (the sole former "MP") and three
orphaned "REJECTED CANDIDATE BACKENDTEST" rows from an earlier backend-test run.

**Correctly NOT merged** (proves the guards): PAU's Ludhiana / Faridkot / Patiala melas (same org +
same "March 2027" but different districts) stayed separate, and the Pantnagar **spring** edition
(March 2027) stayed separate from the autumn one.

**Before / after (4c safety check):** 49 active → **37 active** = 49 − 4 (test rows) − 8 (merged-away).
Safety check passed: count dropped only by the reported removals + merges; no row vanished without a
`merged_into` survivor. Every survivor now carries its combined `source_urls` (3–4 each) and shows the
multi-source badge.

## Phase 5 — Testing

- `scripts/test/p_mela_dedup.mjs` — **49 pure/mock tests**: normalizeState (abbrev/Hindi/legacy/
  whitespace; unmappable→null), periodWindow, dedup positives (Pantnagar, MP-vs-Madhya-Pradesh,
  venue containment, venue-precision coordinate merge) and negatives (PAU March/September; PAU
  Ludhiana/Faridkot district gate; different district; different state; **the 2a-i same-city-centroid
  false-merge guard**), clusterByEvent + do-not-merge exclusion, merge rules + `mergeIntoSurvivor`
  against an in-memory mock DB (interest re-point without PK violation; deactivate with merged_into),
  the dropdown (no "MP"), and the digest-window regression on a merged survivor.
- `scripts/test/p_mela_backend.mjs` (+live) — `resolve_active_mela` redirect, `get_recent_mela_merges`,
  `admin_split_mela` (reactivate + move interest back + record exclusion), admin-gating.
- `e2e/phase20_mela.spec.js` — dropdown has no "MP"/"Chandigarh (UT)" but has "Madhya Pradesh"; state
  filter narrows; data-robust empty-state; submission uses the canonical dropdown; merged-away
  `?mela=` link redirects to its survivor.

**Full suite: all backend tests + 77 e2e green.** One failure surfaced and was **fixed, not
hand-waved** — `p_0026`'s Phase-3 assertions grepped `shared.jsx` for the OLD inline `'fresh'/'stale'`
staleness logic and `mandi_stale` key; that logic was refactored to `src/lib/mandi/staleness.js`
(`today`/`yesterday`/`older`; `mandi_price_older`/`_yesterday`) by prior work this change does not
touch (evidenced: these commits modify none of `shared.jsx` / `staleness.js` / `p_0026`). The test now
asserts the behaviour directly.

## Phase 6 — Screenshots (viewed) + deploy

Screenshots at 1280×800 and 375×812 in `docs/review/shots-dedup/`:
- `filters-{desktop,mobile}.png` — the state dropdown (canonical names; no "MP").
- `mp-filtered-{desktop,mobile}.png` — filtered to "मध्य प्रदेश": Bharat Agri Tech (Indore) + Farm-Tech
  India 2027 (Bhopal) together under one canonical name.
- `pantnagar-{desktop,mobile}.png` — the Pantnagar survivor appearing **once**, confirmed 3–6 Oct 2026
  (won over the seed's expected month), with the **✓ कई स्रोतों से जानकारी मिली** badge and **स्रोत 1 /
  स्रोत 2 / स्रोत 3** (all three merged sources), buttons usable at 375px.
- `list-{desktop,mobile}.png` — the full list, no visible duplicates (37 active).

**Deployed:** https://20a31f4d.kissansahyog.pages.dev (live-verified `/kisan-mela`, `/kisan-mela/submit`,
`/` all 200).

### Operational notes
- Migration `0037_kisan_mela_dedup_state.sql` holds all schema + the state backfill.
- Tunables: `MERGE_MAX_KM` (5), `DATE_WINDOW_DAYS` (7). Admin can undo any merge via the "हाल के विलय"
  split action, which also prevents re-merging that pair.

