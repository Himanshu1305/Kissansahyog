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
- [x] Commit (committed as part of Phase 3 history; verified in git log)

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

## Phase 7 — Greenhouse/polyhouse hub + marketplace  (migration 0042)
- [x] /greenhouse hub (~3046 words Hindi, structured content, prerendered, 22 FAQs, HowTo, cost-norm table)
- [x] MP cost norms cited from S-GH-14 (official MIDH-pattern slabs) + S-GH-38 (MP news 935/844/50%) + S-GH-10 (fan-pad) — scanned MP PDF not re-rendered (values already verified in registered sources; D15)
- [x] Calculators (cost + MP 50% subsidy, formula visible, cited S-GH-14, disclaimer)
- [x] Marketplace category 'greenhouse' (vendor sub-types + farmer requirement + vendor fields; 100km wide; provider declaration; 4 samples)
- [x] Ad slot gated via SponsoredBadge (no ads live)
- [x] Links from Agro Forestry + homepage tile + बाज़ार menu; tests v2_phase7 20/20; e2e phase18 chip count →9; SEO 86 routes. (screenshots → Phase 15)

## Phase 8 — Carbon credit page  (migration 0043)
- [x] /carbon-credit (~2845 words Hindi, question title, structured, prerendered, 21 FAQs, पक्ष/विपक्ष, risks, policy options, glossary, red-flag checklist; §0.7 clean)
- [x] /carbon-credit/niti-sujhav printable policy brief (print CSS A4, cited)
- [x] Poll (one-per-device, results after voting) + suggestions (unpublished→admin approve) tables + RPCs (RLS, constrained anon insert, no anon raw read); admin CarbonSuggestionsPanel
- [x] 5 quotable stats (cited); PastExampleNote + Calc(avg) on examples; Article/FAQPage schema; links from Agro Forestry + homepage tile; tests v2_phase8 32/32; SEO 88 routes. (screenshots → Phase 15)

## Phase 9 — Jugaad (marketplace + info page)  (migration 0044)
- [x] Category जुगाड़ + 5 offer types (incl "विकास में — मदद/साझेदारी") + fields (name/problem/crop/how/video/price/units/tested+body/maker/village) + road-vehicle validation (not_road_vehicle required, server-enforced) + jugaad provider declaration; 3 samples
- [x] /jugaad info page (~3005 words Hindi, 18 FAQs: NIF/MVIF/NIDHI-PRAYAS/Startup India/MP Startup 2025/CFMTTI; legal guide RSRTC v Santosh, RTO v Jayachandra, Shreya Singhal, Dangerous Machines Act, CPA 2019, Patents; soft-help text; §9.3 no patent/award solicitation)
- [x] Tests v2_phase9 20/20; e2e phase18 chips→10; SEO 89 routes; citation green. (screenshots → Phase 15)

## Phase 10 — Site-wide search (typing + voice)  (migration 0045)
- [x] NavBar SearchBar (desktop inline / mobile fullscreen + VoiceSearchButton mic)
- [x] searchSynonyms.js (crops/categories hi/hinglish/en + expandQuery) + search_listings RPC (pg_trgm, live listings) + build-time static index public/search-index.json (370 items; built in build:full) [D17]
- [x] /search results grouped by type + counts, listing distance, popular chips, no-result state (nearby categories + post-your-need)
- [x] search_misses table + log RPC (rate-limited) + admin SearchMissesPanel
- [x] SearchAction JSON-LD → /search?q= (sitewide); /search noindex + excluded from prerender; tests v2_phase10 17/17; SEO 89 routes. (screenshots → Phase 15)

## Phase 11 — Interlinking boxes  (migration 0046)
- [x] boxRegistry.js + RelatedBoxes component (15 boxes, bilingual data layer; pickBoxes seasonal+priority)
- [x] Rules + seasonal (mausam/msp/greenhouse/carbon/listing/sawaal mounts; tanker Mar–Jun, harvester/seed_drill harvest/sowing months)
- [x] view counter RPC 0046 (increment_listing_view idempotent/device/24h) + fetchTopViewed; Homepage "सबसे ज़्यादा देखा गया" + existing "आपके आसपास" near feed; Browse most-viewed box; test v2_phase11 34/34; i18n+citation green; commit

## Phase 12 — Kisan Sawaal knowledge base  (migrations 0047, 0048)
- [x] QA_DEMAND.md (KCC dataset skipped — no DATA_GOV_IN_API_KEY per D2/D18; autocomplete/PAA + existing rows + ICAR/KVK calendars; ranked list + backlog documented)
- [x] Extend kisan_sawaal schema 0047 (slug/season/answer_blocks/sources/published_at/updated_at + admin_answer_sawaal extended to edit everything); 0048 expand category CHECK
- [x] Q&A pages /sawaal/<slug> (QAPage, Hindi-only), crop hubs /fasal/<crop>/samasya (ItemList), category hubs /sawaal/vishay/<cat> (ItemList), /sawaal index links to detail pages
- [x] Authored 40 fetch-and-quoted Q&As (15 schemes [official PIB/HP/FAO], 13 grains [TNAU/ICAR/HP + labeled News/Company], 12 pulses+veg [ICAR PDFs]); 19 legacy rows slugged → 59 published pages. Banned pesticides (endosulfan/carbofuran/phorate) kept out of published blocks; chemical lines carry "लेबल पर लिखी मात्रा". Backlog (lentil/urad/moong/doses) → report per §12.5
- [x] QAPage+ItemList+BreadcrumbList schema; SourcesList; RelatedBoxes; tests v2_phase12 17/17; citation 6/6; SEO 176 routes; i18n green; build:full prerendered 176/176. (E2E → Phase 15 per D7)

## Phase 13 — WhatsApp groundwork (no sending)  (migration 0049)
- [x] Admin "आज की पोस्ट" builder (WhatsAppAdminPanel: canvas 1080×1350 from mandi+weather, Hindi caption w/ channel placeholder+reel, download image/copy caption) + channel URL setter + opt-in CSV export + poster QR download
- [x] Hidden WhatsApp pieces gated on site_settings.whatsapp_channel_url (empty→nothing shows): Footer link, Homepage banner, contextual boxes (Mausam/Msp/KisanMela/Home post-signup/Post post-listing), in-app QR (qrcode lib, no third-party service), /join?src= → log_join_click → redirect
- [x] Consent at signup + profile (KisanFields whatsapp_opt_in unchecked default + preferred_mandi; update_kisan_profile extended w/ opt-in+timestamp; withdraw clears; admin export get_whatsapp_optins; privacy notice covers it)
- [x] Tests v2_phase13 26/26; i18n 31/31 (panel allowlisted — Hindi post content); citation 6/6; build green; commit

## Phase 14 — SEO/AEO/GEO completion
- [x] §0.6 enforced by v2_seo_audit on all 176 prerendered pages; OG share images generated (scripts/gen-og.mjs → /og/default+greenhouse+carbon-credit+jugaad+cold-storage+sawaal.png, 1200×630, Devanagari verified); Seo resolves relative→absolute; per-hub images wired
- [x] Split sitemaps + index generated in build:full (scripts/gen-sitemaps.mjs → sitemap-pages/sawaal/cold-storage/schemes.xml + sitemap.xml index; 35/88/35/18=176); robots.txt (disallow /search,/join,admin,profile,my,post + sitemap ref); llms.txt (sections + key pages)
- [x] docs/seo/KEYWORDS.md (primary+secondary hi/Hinglish/en, AC/PAA sourced) + SEO_CHECKLIST.md
- [x] v2_seo_audit 176/176; 20 sample routes curl-verified (content present without JS incl Q&A/district/hubs); test v2_phase14 22/22; i18n+citation green; commit

## Phase 15 — Verification, PREVIEW deploy, report
- [x] Run everything green: full backend+V2 suite 959/0 (baseline 690); citation 6/6; seo 176/176; i18n 31/31; link-check 151 reachable/16 blocked-not-dead (PIB 403 + transient certs); clean build:full 176/176; bundle eager ~140KB (<209KB cap). Fixed stale pre-V2 tests (provider-decl, equipment type-id, grown constants, land-last regex)
- [x] Screenshot review → docs/review/shots-v2/ (40 shots, key routes × 375×812 + 1280×800; reviewed Q&A detail/404/cold-storage/hubs — clean, no overflow)
- [x] Deployed PREVIEW: https://v2-preview.kissansahyog.pages.dev (also db5a1a0f.kissansahyog.pages.dev)
- [x] Live-verified preview (routes 200, prerendered content without JS, real 404 w/ hub links, grievance officer+email+timelines, sitemaps/robots/llms/OG 200, search-index 412 items)
- [x] Updated PROJECT_CONTEXT.md (per-phase section) + KNOWN_ISSUES.md (V2 follow-ups)
- [x] V2_FINAL_REPORT.md written (deploy URL, test counts, unverified facts, dead links, Q&A backlog, decisions, owner actions incl. production deploy command)

---
## Commit log
(phase → hash; phases 0–10 in earlier history, see `git log`)
- Phase 11 → 633a90a
- Phase 12 → 0a6322e (migrations 0047–0048)
- Phase 13 → 0bc9ce9 (migration 0049)
- Phase 14 → f0eace1
- Phase 15 → e13afe7 (test fixes) + af93be2 (verify/deploy/report)
- Preview deploy: https://v2-preview.kissansahyog.pages.dev
