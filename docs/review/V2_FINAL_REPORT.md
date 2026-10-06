# Kissan Sahyog — V2 Final Report

**Run:** autonomous build of all phases in `MASTER_BUILD_V2_PROMPT.md` (rev 2).
**Override:** Phase 15 deployed a **preview**, not production.
**Date:** 2026-10-06.

## Deploy URL (preview)
- **Branch alias:** https://v2-preview.kissansahyog.pages.dev
- **This deployment:** https://db5a1a0f.kissansahyog.pages.dev
- Live-verified: all new routes 200 (after trailing-slash 308), prerendered HTML served
  (content present without JS), unknown URLs render the real noindex 404 with hub links,
  grievance page shows Shri Abhinandan Dixit + grievance@kissansahyog.com + 24h/7-day,
  sitemaps/robots/llms/OG images all 200, search index (412 items) served.

### Production deploy command (run when ready)
```
cd ~/projects/Kissansahyog
npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog
```

## What was built, by phase
| Phase | Summary | Migration | Test |
|---|---|---|---|
| 0 | Baseline, housekeeping | — | baseline 690/0 |
| 1 | Citation framework (SOURCES.md→sources.js, content model, audits) | — | citation 6/6 |
| 2 | Central layout + `<Seo/>` + prerender + real 404 | — | seo audit |
| 3 | Brand "Kissan Sahyog" + सीताराम greeting + no under-review | 0038 | v2_brand 13/13 |
| 4 | Provider declarations, grievance, reports, Terms/Privacy, sponsored | 0039 | v2_phase4 20/20 |
| 5 | Water tanker | 0040 | v2_phase5 13/13 |
| 6 | Cold storage directory + hub + districts | 0041 | v2_phase6 25/25 |
| 7 | Greenhouse hub + marketplace | 0042 | v2_phase7 20/20 |
| 8 | Carbon credit page + brief + poll + suggestions | 0043 | v2_phase8 32/32 |
| 9 | Jugaad category + info page | 0044 | v2_phase9 20/20 |
| 10 | Site-wide search (typing + voice) | 0045 | v2_phase10 17/17 |
| 11 | Interlinking boxes + view counter | 0046 | v2_phase11 34/34 |
| 12 | Kisan Sawaal knowledge base (40 Q&As) | 0047–0048 | v2_phase12 17/17 |
| 13 | WhatsApp groundwork (no sending) | 0049 | v2_phase13 26/26 |
| 14 | SEO/AEO/GEO completion (OG, sitemaps, robots, llms) | — | v2_phase14 22/22 |
| 15 | Verification, preview deploy, report | — | full suite 959/0 |

## Test counts vs baseline
- **Backend + V2 suite:** **959 passed / 0 failed** (Phase 0 baseline: 690/0). The growth is the
  new V2 test files; several stale pre-V2 tests (Phases 4–9 behavior changes) were updated in Phase 15.
- **Citation audit:** 6/6. **SEO audit:** 176/176 prerendered pages. **i18n (v11_phase6):** 31/31.
- **Prerender:** 176/176 routes (0 failed). **Clean `build:full`:** green.
- **Bundle:** eager gzip **~140 KB** (cap ~209 KB) ✓. Total JS gzip ~434 KB (lazy content, by design — D1b).
- **E2E:** backend suites green; interactive flows (reports/claims/poll/suggestions) are RPC-backed and
  covered by the passing backend suites against the same Supabase the preview uses.

## Facts that could NOT be verified (and so were NOT published)
From `docs/research/QA_DEMAND.md` (fetch-and-quote failures — expired TLS certs / JS-only bodies /
image-only PDF pages). Listed for a future run / owner:
- Wheat irrigation CRI-stage day-counts; wheat sulfosulfuron dose.
- Soybean stem-fly & white-grub doses; soybean iron-chlorosis nutrient deficiency.
- Masoor (lentil) rust/wilt, varieties, sowing; urad & moong YMV + resistant varieties.
- Maize stem borer & storage; chilli leaf-curl & thrips chemical doses.
- Specific 2025-26 MSP ₹/quintal rates (sources conflicted → deliberately omitted).
- Deliberately excluded banned/Class-I pesticides (endosulfan, carbofuran 3G, phorate) from published
  answers even where a source quoted them.

## Dead / blocked source links
None genuinely dead. `v2_link_check`: **151 reachable, 16 flagged** — all are either PIB `pib.gov.in`
403 bot-blocking (valid, browser-openable; facts verified via domain search, D13/D18), a transient 500
(bioone), or expired/unverifiable TLS certs on govt sites (TNAU, icar.gov.in, fmttibudni, pmkisan).

## Q&A backlog
40 published (15 schemes, 13 grains, 12 pulses/veg) + 19 legacy = 59 live pages. Remainder ranked in
`docs/research/QA_DEMAND.md`. Target 150–300 needs `DATA_GOV_IN_API_KEY` (KCC ranking) + openable dose sources.

## Decisions (see docs/review/V2_DECISIONS.md)
D1–D20 recorded. Key: D1b (eager-bundle guard), D2/D18 (KCC skipped — no key), D3 (preview deploy),
D13 (PIB 403 → verified via official-domain search), D15 (MP greenhouse norms from verified registered
sources), D17 (search = static index + live RPC), D19 (Q&A fetch-and-quote at scale + skip-to-backlog).

## Owner actions (Mac Terminal-ready)
1. **Create the two mailboxes** (Cloudflare Email Routing → Gmail), then verify:
   - Cloudflare dashboard → kissansahyog.com → Email → Routing → add `hello@kissansahyog.com` and
     `grievance@kissansahyog.com` forwarding to your Gmail. (No Terminal command; dashboard only.)
2. **Set the WhatsApp Channel URL when ready:** log in as admin → `/admin` → WhatsApp panel →
   paste the channel invite URL into "WhatsApp चैनल URL" → Save. (Everything WhatsApp stays hidden until then.)
3. **Legal review** of Terms & Privacy (currently an honest plain-language draft; note says review pending).
4. **Google Search Console:** verify https://kissansahyog.com and submit the sitemap index:
   ```
   # after production deploy, in Search Console → Sitemaps → add:
   https://kissansahyog.com/sitemap.xml
   ```
5. **Add `DATA_GOV_IN_API_KEY` to `.env`** to pull the KCC dataset and expand the Kisan Sawaal backlog:
   ```
   echo 'DATA_GOV_IN_API_KEY=your_key_here' >> ~/projects/Kissansahyog/.env
   ```
6. **Always deploy with `build:full`** (never plain `vite build` — it skips prerender, search index and sitemaps):
   ```
   npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog
   ```
