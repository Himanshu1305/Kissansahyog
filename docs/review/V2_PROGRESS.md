# V2 BUILD PROGRESS

Resume protocol: continue from the first unticked `[ ]` item. Commit hash recorded per phase.
This is an UNATTENDED run. OVERRIDE: Phase 15 deploys a **preview** (`--branch v2-preview`), not production.

Baseline: backend **690 passed / 0 failed**; E2E target **74/74**; JS gzip total **306,764 B** (15% cap = 352,778 B).

---

## Phase 0 — Baseline & housekeeping
- [x] git pull; read context docs
- [x] §0.8 hard-stop checks (all clear; DATA_GOV_IN_API_KEY missing = owner action, not stop)
- [x] Full backend suite baseline (690/0) → docs/review/v2_backend_baseline.log
- [x] E2E baseline + build + bundle size → V2_BASELINE.md
- [x] Create V2_PROGRESS.md + V2_DECISIONS.md
- [x] Fix stale PROJECT_CONTEXT.md (voice scope, 0019-0021 blockers resolved, GEMINI note, mela follow-ups)
- [x] Commit Phase 0

## Phase 1 — Citation & accuracy framework
- [x] docs/research/SOURCES.md (seed from dossiers + Appendix A)
- [x] src/content/sources.js (generated from SOURCES.md)
- [x] Structured content model src/content/pages/<slug>.js + block renderer
- [x] Components: Cite, SourcesList, LastUpdated, PastExampleNote, Calc
- [x] scripts/test/v2_citation_audit.mjs
- [x] scripts/test/v2_link_check.mjs
- [x] Commit

## Phase 2 — Central layout + SEO/prerender infra
- [x] PageShell + Section/ContentColumn/Grid/Breadcrumbs + tokens.css
- [x] Migrate every screen off max-w wrappers (Screen wrapper refactored to ks-content token column; Homepage uses global Footer; per D4)
- [x] <Seo/> + Organization + WebSite JSON-LD sitewide (RouteSeo + SiteJsonLd mounted in App; detail screens self-render Seo)
- [x] Real 404 (noindex)
- [x] scripts/prerender.mjs + build:full + CF serving (48 routes prerendered, 0 failed)
- [x] scripts/test/v2_seo_audit.mjs (48 pages, 2/2 pass)
- [x] Screenshot every route; commit (full screenshot review consolidated to Phase 15 per D7; key-page build verified)

## Phase 3 — Brand spelling & greeting
- [x] Rename brand to Kissan Sahyog (global src rename; migration 0038 author_name default + rows + RPC defaults; applied)
- [x] Greeting सीताराम 🙏 {name} (Home.jsx + Homepage logged-in; greeting_sitaram string, same in English)
- [x] §0.2(8) removed ReviewTag/समीक्षाधीन + mausam_msp_content_reviewed gating (Msp/Mausam/FasalSalah/Admin); fixed mausam_rules_by byline (no individual, no "under review")
- [x] Static test scripts/test/v2_brand.mjs (13/13); citation+i18n still green
- [ ] Commit

## Phase 4 — Legal, trust & compliance  (migration 0039)
- [x] Provider declarations server-enforced (create_listing: equipment+warehouse offers need details.provider_declared; greenhouse/jugaad/tanker added in their phases); ListingForm checkbox above rules; bilingual texts per category
- [x] /grievance content page + /contact; footer links grievance (IT Rules 2021 / GSR 120(E) cited S-JUG-29/30; GAC S-JUG-71). eGazette PDF 403 → cited registered gazette source (report note)
- [x] Report button (ReportButton modal) + listing_reports table (constrained anon insert, no anon read, per-IP/device rate limit) + admin ReportsPanel (age vs 24h/7d, remove/dismiss)
- [x] Terms & Privacy update (intermediary, provider decl, report/takedown+grievance, DPDP notice, FARMS model, sponsored policy, legal-review note) in legal.js
- [x] SponsoredBadge + is_sponsored flag + admin toggle (CP E-Commerce Rules 2026 S-JUG-31); wired into ListingCard + ListingDetail; feed selects include is_sponsored
- [x] Tests: v2_phase4.mjs (20/20); e2e phase4 updated for provider-decl; commit

## Phase 5 — Water tanker (inside Equipment)  (migration 0040)
- [x] Tanker equipment type (DB) + conditional fields in equipment.jsx (capacity/vehicle/use/source/rates/radius/months; photo omitted — equipment has no photo support, D14)
- [x] Offer+Requirement (no borewell warning, no benchmarks); homepage tile + seasonal box (Mar–Jun); बाज़ार menu entry; Browse etype=water_tanker filter
- [x] Validation client (equipment.jsx validate) + create_listing (tanker_capacity_required); 4 sample listings (is_test_data); test v2_phase5.mjs (13/13); E2E 77/77; eager bundle 189KB. (screenshots → Phase 15 per D7)

## Phase 6 — Cold storage (directory + marketplace)  (migration 0041)
- [x] Rename category label → "गोदाम और कोल्ड स्टोरेज / Warehouse & Cold Storage"; कोल्ड स्टोरेज tile + बाज़ार menu entry → /cold-storage
- [x] /cold-storage hub (bilingual content page + live directory with district/type filters + browse-by-district index; prerendered; A.4 capacity cited S-CS-01)
- [x] New cold-storage listing fields (warehouse_type='cold': facility type, temp, crops, space-available+updated, rate unit, season, loading, power, insurance, WDRA, pledge-loan)
- [x] cold_storage_directory table + public column-safe view + import 243 rows (notes private, phones shown, OLD LIST flagged, Kajal→Niwari §0.7)
- [x] Claim (submit_cs_claim → admin approve → owner-managed) + correction/removal via ReportButton target_type=cold_storage; admin ColdStorageClaimsPanel
- [x] District pages /cold-storage/<district> (prerendered, ItemList + LocalBusiness JSON-LD, Sagar special note); warehouse 100km wide-visibility
- [x] Tests v2_phase6.mjs (25/25); SEO 85 routes; E2E pending; commits after import + after pages. (screenshots → Phase 15)

## Phase 7 — Greenhouse/polyhouse hub + marketplace
- [ ] /greenhouse hub (3000+ words Hindi, structured, prerendered)
- [ ] MPFSTS scanned PDF read (cost norms) per §0.2(7)
- [ ] Calculators (cost, MP subsidy)
- [ ] Marketplace category + vendor sub-types + fields (100km)
- [ ] Ad slots empty w/ SponsoredBadge
- [ ] Links; tests; screenshots; commit

## Phase 8 — Carbon credit page
- [ ] /carbon-credit (2500-3500 words, structured, prerendered)
- [ ] /carbon-credit/niti-sujhav printable brief
- [ ] Poll + suggestions tables (RLS, constrained anon insert)
- [ ] 5 quotable stats; schema; links; tests; screenshots; commit

## Phase 9 — Jugaad (marketplace + info page)
- [ ] Category जुगाड़ + offer types + fields + road-vehicle validation
- [ ] /jugaad info page (3000+ words, prerendered)
- [ ] Tests; screenshots; commit

## Phase 10 — Site-wide search (typing + voice)
- [ ] NavBar search (desktop inline / mobile fullscreen + mic)
- [ ] searchSynonyms.js + search_all RPC (pg_trgm) + static index
- [ ] Results page grouped + chips + no-result state
- [ ] search_misses table + admin view
- [ ] SearchAction JSON-LD; /search noindex; tests; commit

## Phase 11 — Interlinking boxes
- [ ] boxRegistry.js + RelatedBoxes component
- [ ] Rules + seasonal
- [ ] view counter RPC + homepage/Browse boxes; commit

## Phase 12 — Kisan Sawaal knowledge base
- [ ] QA_DEMAND.md (KCC dataset skipped if no key; autocomplete/PAA; existing rows)
- [ ] Extend kisan_sawaal schema (slug, crop, category, season, answer_blocks, sources, ...)
- [ ] Q&A pages /sawaal/<slug>, crop hubs, category hubs, /sawaal index
- [ ] Author Q&As in ranked batches of 25 (fetch-and-quote)
- [ ] QAPage schema; related boxes; commit each batch

## Phase 13 — WhatsApp groundwork (no sending)
- [ ] Admin "आज की पोस्ट" builder (canvas 1080×1350)
- [ ] Hidden WhatsApp pieces gated on whatsapp_channel_url
- [ ] Consent at signup + profile (whatsapp_opt_in)
- [ ] Tests; commit

## Phase 14 — SEO/AEO/GEO completion
- [ ] §0.6 on every page; OG share images
- [ ] Split sitemaps + index; robots.txt; llms.txt
- [ ] KEYWORDS.md + SEO_CHECKLIST.md
- [ ] v2_seo_audit full; curl 20 routes; commit

## Phase 15 — Verification, PREVIEW deploy, report
- [ ] Run everything green (backend, e2e, citation, seo, link, i18n, bundle, build:full)
- [ ] Screenshot review all routes → docs/review/shots-v2/
- [ ] Deploy PREVIEW: npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview
- [ ] Live-verify preview
- [ ] Update PROJECT_CONTEXT + KNOWN_ISSUES
- [ ] V2_FINAL_REPORT.md (incl. production deploy command)

---
## Commit log
(phase → hash)
