# BATCH 4 — PROGRESS (resume from first unticked item)

**Pre-batch commit:** `617f9a68095b30cfcaf785790a524d6c2c8efeb6` (recorded for the strings.js placeholder-diff guard).
**Started:** 2026-10-08.

## Baseline (captured before any change)

- **Published Q&As (DB query):** `select count(*) from kisan_sawaal where is_published=true and slug is not null` → **58**.
- **Backend audits (all green):** `v2_citation_audit` 6/0 · `v2_seo_audit` 2/0 · `v11_phase6` 31/0 · `v2_phase12` 17/0 · `batch3_style` 2/0.
- **E2E baseline (from BATCH3_REPORT):** 79 passed / 82. 3 known failures: `phase18_transport`, `phase20_mela` (time/env), `phase6` land "mark Found" (dummy-seed land-count sensitivity). Item H targets these 3.
- **strings.js:** 2149 lines. Pre-batch version for the placeholder-diff guard: `git show 617f9a6:src/lib/i18n/strings.js`.

## How to run things
- DB ad-hoc query: `node --env-file=.env scripts/db.mjs query "SQL"`
- Seed Q&As: `node scripts/build-qa.mjs && node --env-file=.env scripts/seed-sawaal.mjs`
- Audits: `node --env-file=.env scripts/test/<name>.mjs`
- E2E: `npm run test:e2e`
- Build: `npm run build:full`
- Preview deploy (ONLY allowed): `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview`

## Priority order: B → F → A ch1 (rabi ~38) → C → E → D → A rest → G → H

## Checklist
- [x] **B** full natural-Hindi pass on UI strings + homepage
- [x] **F** agri_inputs wide-visibility opt-in (keep 30 km default)
- [ ] **A** Kisan Sawaal Q&As (target 80, gate 60) — chunks of ~10. **Published: 72 (was 58, +14).**
  - [x] ch1 rabi wheat/chana/masoor — 14 Q&As from MP agri dept (S-QBR-01/02/03). Seeded.
  - [ ] ch2 mustard (MP sarson page name not found via WebFetch — try ICAR-DRMR/beez_kism) + more wheat/chana
  - [ ] ch3 soybean harvest/storage/selling; schemes&finance; inputs/soil; water; bhusa/fodder; storage; greenhouse basics
  - fact-check tool: `scripts/test/batch4_qa_facts.mjs` (14/0). Fetch via WebFetch works; IIWBR icar.gov.in refused, mpkrishi sarson/mustard URL 404 (names tried: mustard, Sarson, rai).
- [x] **C** Fasal Salah 3–5 bullets per crop (rendering change; all 4 rabi crops = 3 bullets; read-full link)
- [x] **E** voice search — audit: already built (VoiceSearchButton in SearchBar/Search/Sawaal; transcribe.js
      Gemini fallback + DB rate limit + 18MB cap). Added: Origin allow-list on /transcribe, cleanTranscript
      +unit test, 44px mic, offline msg, Privacy voice line, e2e denied path. batch4_voice 23/0, phase19 6/6.
      NOTE for owner: preview env lacks GEMINI_API_KEY → the MediaRecorder/Gemini fallback path cannot be
      tested on preview; Web Speech (Chrome/Android) works without a key. Owner adds the secret to test fallback.
- [x] **D** `/bazaar/*` — hub + 6 landing pages (equipment/labor/bhusa/agri-inputs/transport/land),
      ≥250 words hi+en each, FAQ+Breadcrumb JSON-LD, Browse/Post buttons, footer link, sitemap pages 44,
      196/196 prerendered, v2_seo_audit 2/0, batch4_bazaar 58/0. Dedicated pages linked, not duplicated.
- [x] **A** — **61 new published** (58→119). 5 chunks, all MP agri dept (S-QBR-01..11). Gate (60) met.
      QA_NEW_FOR_REVIEW.md written (61 rows). Aim-80 not reached — see report "not done".
- [x] **G** STRAY_LISTINGS.md — no stray/test listings found (6 real, 65 sample kept). Read-only.
- [x] **H** phase18_transport + phase20_mela + phase6 — all self-contained now (create own data,
      assert tolerantly, teardown by id). 11/11 pass. No seed data deleted/changed.
- [ ] Verification (full e2e + build:full) + screenshots + preview deploy
- [ ] BATCH4_REPORT.md (finish marker)

## Deferred items
_(none yet)_

## Item B — done (chunk 1, visibility-first)
Approach (judgement call): instead of mechanical 300-line chunks, I built the guard,
ran the over-15-word report (66 strings), and fan-out-analysed the whole file, then
rewrote the genuine defects on the most-visible surfaces. Most homepage/nav/help/consent
strings were already natural (Batch 3) and were reviewed and kept — recorded honestly.
- Guard tool: `scripts/test/batch4_ui_style.mjs` (avoid-list on UI strings; report >15-word
  strings; FAIL on any Hindi **sentence** >25 words except `ks-style-ok` legal — a
  sentence-based gate aligned with the ≤22/sentence style rule, so legitimately-multi-
  sentence help cards are not gutted; placeholder/HTML-tag/key-set diff vs 617f9a6).
- Changed **18 Hindi** + **14 English** strings; fixed 3 run-on sentences (agro_explain_1,
  agro_region_body2, dd_intro); marked `rules_agreement_buyer` legal (ks-style-ok).
- `UI_STRINGS_REVIEW.md` written (40 visible strings before→after, 5 flagged).
- Regression: batch4_ui_style 4/0, batch3_style 2/0, v11_phase6 31/0, v2_seo_audit 2/0;
  no e2e spec references any changed Hindi text (grep-checked).
- Keys total: 1671. No key removed/renamed; no placeholder/tag changed (guard enforces).

## Item F — done (mechanism already existed; reused, no migration)
**Mechanism found & recorded:** per-listing `wide_visibility` boolean column (migration
0025), `create_listing` RPC param `p_wide_visibility boolean default false`; server guard
(latest RPC 0050 line 55) allows wide only for `('bhusa','agri_inputs','warehouse','greenhouse')`.
JS policy in `src/lib/distance.js`: `RADIUS_KM=30`, `FALLBACK_RADIUS_KM=50`, `WIDE_RADIUS_KM=100`,
`WIDE_ELIGIBLE_CATEGORIES=['bhusa','agri_inputs','warehouse','greenhouse']`, applied by
`partitionByRadius` / `isWideVisible`. **Nothing is wide-by-default** — wide is always a
per-listing opt-in (default false). agri_inputs is already eligible and already defaults to
30 km. **No migration needed** (storage already expresses this; rule 5 satisfied).
- The posting step-3 toggle **already existed** (off by default, `data-testid="wide-visibility-checkbox"`,
  gated by `canWiden`). Added this batch: concrete wording "100 किमी तक के किसानों को दिखाएँ" +
  helper "ज़्यादा किसानों तक पहुँचेगा"; a **vendor-stronger** variant shown when `source==='vendor'`
  (still off by default); a **wide badge** "100 किमी तक दिखेगा" on the listing page
  (`ListingDetail`) and the post-success confirmation (`data-testid="wide-badge"`).
- Test: `scripts/test/batch4_wide_visibility.mjs` posts a real agri_inputs listing via RPC with
  wide ON/OFF, applies the 60 km policy (ON visible, OFF hidden), 8/0, teardown deletes BY ID
  (title prefix `[B4-TEST]`, profile phone 9000000252 is_test_data). p_0025_visibility still 44/0.

## Judgement-call log
- 2026-10-08: Baseline captured. B done (visibility-first, quality over count). F done
  (reused existing wide_visibility mechanism; no migration; default stays 30 km).
- Item B sentence-based >25-word FAIL gate (vs literal whole-string): documented above.
