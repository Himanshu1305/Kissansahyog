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
- [ ] **B** full natural-Hindi pass on UI strings + homepage (chunked ~300 lines)
- [ ] **F** agri_inputs wide-visibility opt-in (keep 30 km default)
- [ ] **A** Kisan Sawaal Q&As (target 80, gate 60) — chunks of ~10
  - [ ] ch1 rabi (wheat/chana/masoor/mustard ~38)
  - [ ] ch2…
- [ ] **C** Fasal Salah 3–5 bullets per crop
- [ ] **E** voice search (audit first, build if missing)
- [ ] **D** `/bazaar/*` category landing pages
- [ ] **G** STRAY_LISTINGS.md (read-only)
- [ ] **H** stabilise phase18_transport, phase20_mela, phase6 e2e specs
- [ ] Verification + screenshots + preview deploy
- [ ] BATCH4_REPORT.md (finish marker)

## Deferred items
_(none yet)_

## Judgement-call log
- 2026-10-08: Baseline captured. Starting item B.
