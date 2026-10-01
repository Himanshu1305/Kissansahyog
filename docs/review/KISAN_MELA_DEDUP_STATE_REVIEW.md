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

*(Phases 1–6 appended below as implemented.)*
