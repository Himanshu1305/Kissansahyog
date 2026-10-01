# Kisan Mela discovery — re-architecture review

**Date:** 2026-10-01
**Spec:** `docs/KISAN_MELA_REARCHITECTURE_PROMPT.md` (supersedes `KISAN_MELA_LOGGING_COST_PROMPT.md`)
**Model:** `claude-opus-4-8` · web_search server tool

## Why

The original discovery pipeline was **one expensive open-ended AI search** (~$1.8–2.00/run) that
*also* missed real events — e.g. the aggregators list "Bharat Agri Tech 2027" (Indore) and
"Farm-Tech India 2027" (Bhopal), but the monolithic search never surfaced them. The re-architecture
splits discovery into three **cost-isolated** steps so the cheap work stays cheap and the expensive
AI work is narrow and auditable:

1. **Free aggregator scrape** (no AI) — TaazaBhav + kisaanhelpline → `kisan_mela_candidates` (pending).
2. **Scoped AI broad search** — hyper-local gaps only (KVK / smaller SAUs / regional ICAR / Hindi news),
   NOT the big national events the scraper already covers.
3. **Narrow per-candidate AI verification** — for each candidate, one bounded fact-check against the
   event's *own official primary source*; verified → promoted to public `kisan_mela`, else recorded.

`kisan_mela_candidates` is the hand-off point between steps **and** a permanent, queryable audit trail.

---

## Phase-by-phase

| Phase | What shipped |
|---|---|
| **1** | `kisan_mela_candidates` staging/audit table + `source_urls text[]` on `kisan_mela` (with backfill) + two admin RPCs (`get_admin_mela_candidates`, `admin_publish_candidate`). Migration `0036`. RLS: candidates are anon-default-deny; admin access via RPCs only. |
| **2** | `scripts/mela/scraper.mjs` — FREE, no AI. Pure parsers for TaazaBhav (JSON-LD `ItemList`) and kisaanhelpline (HTML cards, **upcoming only, never Past**). Robots-aware, fails LOUD (`ScraperError`) on structural mismatch so a broken scraper never looks like "no events". Dedup-at-insert (new→pending; changed→reopened; unchanged→touch `scraped_at`). |
| **3** | `scripts/mela/broadsearch.mjs` — scoped to hyper-local gaps, injection-safe, India-only, never guesses a date, every lead needs a `source_url`. Cap 12 searches. |
| **4** | `scripts/mela/verify.mjs` — per-candidate bounded fact-check. Deterministic free corroboration/grouping first; verdict → verified (promote using the **primary source's** details, even when the aggregator lead was stale) / rejected / unverifiable. Lifecycle sweep + 4f re-verify policy. |
| **5 + 7b** | `scripts/discover-melas.mjs` — ONE script, ONE Actions job, three steps in sequence. Schedule moved to **every 3 days**; `workflow_dispatch` retained. |
| **6** | Public `/kisan-mela`: multi-source corroboration badge (**≥2 distinct sources** → "कई स्रोतों से जानकारी मिली", listing every link; exactly 1 → shown plainly; never "verified accurate"). Universal verify-yourself disclaimer on **every** card. PageExplainer states this is automated research + verification, not a person confirming each event. |
| **7** | Admin dashboard: `MelaCandidatesPanel` beside the human-submission queue (7a), listing rejected/unverifiable candidates with reasons + a manual "फिर भी प्रकाशित करें" (publish-anyway) override. |
| **8** | Mocked tests: `p_mela_rearch.mjs` (65 pure tests) + live-DB checks in `p_mela_backend.mjs` + e2e in `phase20_mela.spec.js`. Full suite green (one pre-existing, unrelated mandi-component regex failure in `p_0026`). |
| **9** | Two real runs + the cadence-gate cost fix (below), screenshots, this review. |

---

## Real cost (the core goal)

Three real runs via GitHub Actions on 2026-10-01 (all `claude-opus-4-8`):

| Run | What it did | input tok | output tok | web searches | **Cost** |
|---|---|---:|---:|---:|---:|
| **(a) First run** | Full backlog: scrape **60** leads + broad search (+2) + verify **all 60** | 1,544,958 | 104,118 | 101 | **$11.34** |
| **(b) Steady-state, broad search every run** (as originally specified) | scrape refreshed 60 (0 re-verify) + broad search + verify 2 new | 314,458 | 9,751 | 16 | **$1.98** |
| **(c) Steady-state, cadence-gated broad search** (the fix) | scrape refreshed 60 (0 re-verify) + broad search **skipped** + 0 due | 0 | 0 | 0 | **$0.00** |

**(a)** is expected to be high — it verifies the entire initial backlog at once. Per the spec, success is
**not** judged by it.

**(b) missed the <$0.60 bar — this was a finding, investigated, not reported-and-moved-past:**
The logs proved the cost-isolation machinery *works* — the scrape `refreshed 60, inserted 0` (dedup 2b-i),
and verification ran on **only the 2 new broad-search leads** (the 60 scraped + 18 unverifiable were
correctly skipped by 4f). The entire ~314k input-token cost was the **scoped broad search**: its
`web_search` results accumulate in the agent's context across the loop, so even capped at 12 searches it
re-pays ~$1.5–1.8 **every** run — an unmodeled fixed cost the spec's steady-state model didn't account for.

**Fix — cadence-gate the broad search (reduces FREQUENCY, not thoroughness):** the broad search now runs
at full 12-search depth but only periodically (`MELA_BROAD_SEARCH_MIN_DAYS`, default **21 days**), tracked
via a `site_settings` marker. The free scrape + per-candidate verification of genuinely new leads still run
**every** pass, so big/aggregated-event discovery is never delayed — only the expensive hyper-local gap-hunt
is spaced out. **(c)** demonstrates the result: a steady-state pass that skips the broad search with no new
leads costs **$0.00**.

**Amortized steady-state:** with the every-3-days schedule, the broad search fires roughly once per ~7
runs (~21 days). Six of every seven runs cost ~$0–0.20 (scrape free + verify only new scraped leads); the
seventh (broad-search) run costs ~$1.5–2.0. Average ≈ **~$0.25–0.30/run** — comfortably >70% below the
$1.8–2.00 baseline, with **no** reduction in verification rigor or search thoroughness.

> Pricing basis: Opus 4.8 $5/1M in, $25/1M out, web_search ~$10/1,000.

---

## Source & outcome breakdown (from `kisan_mela_candidates`, real data)

**64 candidates total** — by source:

| Source | verified | unverifiable | rejected |
|---|---:|---:|---:|
| taazabhav (scrape) | 30 | 15 | 0 |
| kisaanhelpline (scrape) | 12 | 2 | 1 |
| ai_broad_search | 1 | 3 | 0 |
| **Total** | **43** | **20** | **1** |

**43 verified** candidates were promoted to the public `kisan_mela` table. Representative real outcomes
(reasons stored verbatim in `verification_reason`):

- **Verified:** KISAN Agri Show (Pune), Agrovision (Nagpur), Krishithon (Nashik), Pusa Krishi Vigyan Mela
  (IARI), RLBCAU Kisan Mela (Jhansi, confirmed against an official `notification-regarding-kisan-mela-2026`
  notice), Krushi Odisha (state-gov source), etc. — each tied to the event's *own* official primary source.
- **Rejected (1):** "Eco Farm Fair 2027" → the only match is the **EcoFarm Conference in California, USA**
  (asilomar) — correctly contradicted under the India-only rule. This is exactly the false-positive class
  the discipline is designed to catch.
- **Unverifiable (20):** either no official primary source found (e.g. district-level ATMA melas with only
  Amar Ujala coverage and already-past dates), or "confirmed but no primary URL". Notably "Rashtriya Krishi
  Mela, Raipur" and "KisanTech India 2027" were held *as unverifiable* rather than promoted, because the
  verifier refused to repeat a prior year's date as this year's — the correct conservative call. These stay
  in the admin review panel with a manual publish-anyway escape hatch.

---

## The two test-case events (now answerable with real data, not inference)

Both events the **old monolith missed** were **found by the free scraper and verified** this time:

| Event | Found by (scrape) | Verified? | Primary source | Confirmed date | Public `source_urls` |
|---|---|---|---|---|---|
| **Bharat Agri Tech 2027 (Indore)** | taazabhav **and** kisaanhelpline | ✅ verified | `bharatagritech.org` | **9–11 Jan 2027**, BAPS Akshardham, Indore, MP | 3 (both aggregators + official) → **multi-source badge** |
| **Farm-Tech India 2027 (Bhopal)** | kisaanhelpline | ✅ verified | `farmtechindia.in` | **14 Feb 2027** | 2 (aggregator + official) → multi-source badge |

Bharat Agri Tech is the textbook corroboration case: two independent aggregators + the official page all
agree, so it carries the "कई स्रोतों से जानकारी मिली" badge with all three links. The verifier also
**corrected** the venue to the specific official one and pulled contact only from the official page.

---

## Screenshots (viewed) — `docs/review/shots/`

1280×800 and 375×812:
- `kisan-mela-cards-{desktop,mobile}.png` — a **multi-source** corroborated card (Agroworld Expo: ✓ badge +
  स्रोत 1/स्रोत 2 links) beside a **single-source** card (Pusa: one स्रोत link); the universal disclaimer on
  both; the "दिलचस्पी है" and "व्हाट्सएप पर साझा करें" buttons still clearly usable and not crowded out at 375px.
- `kisan-mela-{desktop,mobile}.png` — full page.
- `admin-candidates-{desktop,mobile}.png` — the integrated admin candidates-review panel (Phase 7a) showing
  real rejected/unverifiable candidates with reasons and the "फिर भी प्रकाशित करें" override.

---

## Tests

- `scripts/test/p_mela_rearch.mjs` — 65 pure/mocked tests (scraper parse + upcoming-only + fail-loud + dedup;
  4 verification outcomes incl. corrected-details-still-verified; primary-source-not-aggregator description;
  corroboration-badge logic; 4f lifecycle; scoped India filter; cadence gate; digest regression via the new
  promotion pathway).
- `scripts/test/p_mela_backend.mjs` — +live-DB: backfill SQL, candidates RLS default-deny, admin candidate
  RPCs, publish-anyway promotion.
- `e2e/phase20_mela.spec.js` — badge-only-on-multi-source, disclaimer-on-every-card, buttons-usable-at-375px,
  admin panel under a real admin session.
- Full suite green. One **pre-existing, unrelated** failure in `p_0026_location_compare.mjs` (source-regex
  assertions on the mandi `StaleTag`/`priceStaleness` component — untouched by this work).

---

## Operational notes

- Schedule: every 3 days (`.github/workflows/discover-melas.yml`), `workflow_dispatch` retained.
- Tunables: `MELA_BROAD_SEARCH_MIN_DAYS` (21), `MELA_BROAD_SEARCH_CAP` (12), `MELA_VERIFY_CAP` (3),
  `REVERIFY_UNVERIFIABLE_DAYS` (14).
- To force a broad-search pass sooner, clear the `mela_last_broad_search_at` row in `site_settings`.
