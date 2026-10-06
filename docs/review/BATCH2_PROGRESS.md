# BATCH 2 — Progress checklist

Priority order: A → B → C → D → E → F → G. Commit after every item. Report only after A–F.
Preview-only deploys (`--branch v2-preview`). Additive migrations from 0051. Live app must keep working.

- [x] **Item A** — one layout everywhere. All 21 screens no longer set a page-level `max-w-*`/`maxWidth`. Prose pages (Privacy, Terms, SchemeDetail) → `PageShell width="content"` (~70ch readable). Dashboards/grids/directories (Info, Resources, Articles, Sawaal, Safalta, Admin, KisanMela, Mausam, Msp, FasalSalah, AgroForestry, DroneDidi) → `PageShell width="wide"`. Inner readable clamps (NotFound 404 text/grid, Admin access-denied notice, Safalta/KisanMelaSubmit confirmations, ListingDetail share button, Post success note/box, DroneDidi hero overlay, Homepage hero column) kept with `ks-allow-width` markers. Added `scripts/test/batch2_layout.mjs` (static guard, PASS). Deleted dead `src/components/ListingForm.jsx`; updated the two static assertions (v2_phase4, v2_phase9) that read it to point at Post.jsx. build:full green; v11_phase6 31/0.
  - **Judgement:** Welcome stays a standalone centred pre-auth language chooser (no NavBar before language is picked) — its centred column is `ks-allow-width`-marked, not forced into PageShell. SchemeDetail's `PrerenderReady` was mapped to PageShell's `ready` prop.
- [ ] **Item B** — cold storage rebuilt (`/cold-storage`, `/cold-storage/:district`): remove claim UI + admin claim queue; ReportButton link; full address + Call/WhatsApp + directions; location search + distance sort; migration 0051 lat/lng + geo_precision; `scripts/geocode-cold-storage.mjs`; post CTA; trimmed sections; district links; tests.
- [ ] **Item C** — Greenhouse split: `/greenhouse` marketplace-first; `/greenhouse/subsidy` guide (moved content); `/post?cat=&type=` preselect; MP PDF citation verification; update nav/tiles/RelatedBoxes/search/sitemap.
- [ ] **Item D** — Jugaad split: `/jugaad` marketplace-first; `/jugaad/jankari` guide; simpler jugaad form (client+RPC agree); existing listings still display.
- [ ] **Item E** — Fasal Salah actionable: crop cards → buttons/panel with today's call, season work (cropadv_*), common problems (Q&A links), nearby help; location control public.
- [ ] **Item F** — Kisan Sawaal fixes: meaningful slugs + redirects table (migration); breadcrumb fix; English columns + toggle; legacy answer_blocks rendering; `/sawaal` grouped grid.
- [ ] **Item G (optional)** — public category pages `/bazaar/*`.
- [ ] **Verification** — backend suites, e2e, v11_phase6, v2_seo_audit, v2_citation_audit, batch2_* tests, build:full. Screenshots 375×812 + 1280×800. Preview deploy. Routes 200.
- [ ] **Report** — BATCH2_REPORT.md (only after A–F). Update PROJECT_CONTEXT.md + KNOWN_ISSUES.md.

## Judgement calls / notes
- (recorded as work proceeds)
