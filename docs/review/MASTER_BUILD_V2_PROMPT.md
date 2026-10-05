# KISSAN SAHYOG — MASTER BUILD V2 (single prompt, all phases) — rev 2

You are building the next major release of **Kissan Sahyog** (repo: https://github.com/Himanshu1305/Kissansahyog · live: kissansahyog.com and `*.kissansahyog.pages.dev`). Stack: React 19 + Vite 8 + Tailwind v4 + React Router 7, Supabase (Postgres 17, custom trust auth + email auth), Cloudflare Pages (+ Pages Functions), Playwright E2E, GitHub Actions crons. The owner is a non-technical founder. This build runs on a **Mac (Terminal, zsh)**: every command you print for the owner must work in macOS Terminal (never PowerShell or Windows paths).

Work autonomously through all phases, in order. Do not stop to ask questions: when something is ambiguous, pick the most conservative reasonable option, record it in `docs/review/V2_DECISIONS.md`, and continue. Stop only for the hard-stop conditions in §0.8.

**Read this entire prompt before writing code. Re-read the relevant phase section at the start of every phase.**

---

## 0. NON-NEGOTIABLE RULES (apply to every phase)

### 0.1 Run control: progress, resume, commits
1. Create `docs/review/V2_PROGRESS.md` at the start: a checklist of every phase and sub-task in this prompt. Tick items as you finish them. Note the commit hash per phase.
2. **Resume protocol:** if `V2_PROGRESS.md` already exists when you start, you are resuming. Read it, `git log`, and continue from the first unticked item. Do not redo finished phases.
3. **Commit and push after every phase**, with message `V2 Phase N: <summary>`. For long phases (6, 7, 12), also commit after each sub-batch.
4. Keep your working context small. Read files only when you need them. Use `grep`/`rg` before opening large files. Summarise long tool outputs into `V2_PROGRESS.md` notes rather than keeping them in context.
5. Do not refactor, rename or "improve" anything outside this prompt's scope. Never break existing pipelines: mandi/weather cron, Kisan Mela discovery, geocoding, voice transcribe, PWA, auth.

### 0.2 Accuracy: zero hallucination
1. **Every number, percentage, ₹ amount, date, law section, court ruling, scheme rule or statistic shown on the site must come from the source register (`docs/research/SOURCES.md`, built in Phase 1) and be cited on the page.** No exceptions.
2. The owner has already placed verified research in the repo:
   - `docs/research/carbon_credit_dossier.md`
   - `docs/research/greenhouse_dossier.md`, including the 5 Oct 2026 MPFSTS addendum at the end
   - `docs/research/jugaad_legal_dossier.md`
   - `docs/research/mp_cold_storages.csv` (243 rows) and `docs/research/mp_cold_storages_README.md`
3. Anything a dossier lists under "Not verified — do not publish", and everything in §0.7, must NOT appear on the site.
4. **Fetch-and-quote rule.** Before you publish any fact that is not already in Appendix A or a dossier, do all of the following:
   - Open the source (WebFetch, curl or a download).
   - Confirm the exact text.
   - Save the URL, publisher, date and a verbatim quote in `SOURCES.md`.

   If you cannot open and confirm the source, do not publish the fact. List it in the final report instead. **Never write a fact from memory.**
5. Every calculation shown on a page must display its working: formula, inputs and each input's citation. For example: `₹2.9 करोड़ ÷ 2,550 किसान ≈ ₹11,373 प्रति किसान (गणना)`.
6. Label source types where shown: सरकारी स्रोत (Official), समाचार (News), कंपनी का दावा (Company claim).
7. **For scanned government PDFs** (MPFSTS guidelines are scanned):
   - Download the file with curl.
   - Convert pages to PNG (`pdftoppm -r 150`; install poppler if missing).
   - Open the PNGs yourself and read the values.
   - Publish only the values you can read clearly, and record the page number in `SOURCES.md`.
8. **No "under review" labels anywhere.** Remove the existing "समीक्षाधीन" tags, the `ReviewTag` usages and the `mausam_msp_content_reviewed` gating, and show the content normally.

### 0.3 Brand, voice, greeting, contacts
- **English brand name:** **Kissan Sahyog** (double "s", matching the domain).
  - Replace the exact English phrase "Kisan Sahyog" in all of these: UI strings, `index.html` `<title>`/meta, Open Graph, PWA manifest `name`/`short_name`, footer, schema `Organization.name`, share messages, the default article author, and docs.
  - **Do not touch other uses of "Kisan"/"किसान":** Kisan Mela, Kisan Sawaal, Kisan Safalta, PM-KISAN, Kisan Credit Card, Kisan Call Centre, route paths, table/column names, Hindi text.
  - The Hindi name **किसान सहयोग** is unchanged.
- **Byline** on all content: **Team Kissan Sahyog**. Never name an individual as author. Change the existing intercropping article's author credit to Team Kissan Sahyog.
- **Greeting:**
  - Logged in: **"सीताराम 🙏, {name}"** (no "जी").
  - No name or logged out: **"सीताराम 🙏"**.
  - Same text in English mode.
  - Replaces the current `home_greeting` ("नमस्ते"). Also show it on the homepage for logged-in users.
- **Contacts:**
  - General: **hello@kissansahyog.com**
  - Grievance: **grievance@kissansahyog.com**
  - Grievance Officer: **Shri Abhinandan Dixit**

### 0.4 Marketplace philosophy (keep it simple)
- **What we are:** a free listing marketplace. No payments, no commission, no price-setting.
- **Labels:** never use "verified", "guaranteed", "approved" or "empanelled" claims. Use only factual labels such as "फ़ोन सत्यापित", "सार्वजनिक स्रोत से जानकारी", "मालिक द्वारा पुष्टि".
- **Sellers own their information.** They enter their own details and rates; we do not check or benchmark rates. No warnings beyond the ones specified here.
- **Keep the existing conventions:**
  - Bilingual i18n via `strings.js` (no hardcoded Hindi in render code; the `v11_phase6` audit must stay green).
  - Land is LAST in every ordered category list.
  - The asset-location rule.
  - 30 km radius, with the 30–50 km fallback.
  - `create_listing` requires `p_rules_agreed=true`.
  - Writes go through SECURITY DEFINER RPCs, and RLS is on for every table.
- **Access:**
  - Listing browse/detail pages stay login-gated as today.
  - Public hub pages show listing teasers: counts plus a few cards that lead to the gated detail.
  - Public directory entries (cold storage) are fully public.
- **New listing categories** (greenhouse, jugaad, water tanker sub-type) each get 3–5 clearly marked `is_test_data` sample listings, so pages are not empty.

### 0.5 Language policy
- **Hub pages:** Greenhouse, Carbon, Jugaad, Cold Storage, and the Grievance/Terms/Privacy pages are **bilingual** (Hindi default, full English version), with `hreflang` hi-IN / en-IN / x-default.
- **Kisan Sawaal Q&A pages** (Phase 12) are **Hindi only** (hi-IN). Their English title and summary go in metadata only. `hreflang` is hi-IN + x-default.
- **Writing level:** plain Hindi a class-8 student can read. Short sentences. Explain technical terms in brackets.

### 0.6 Universal page standards (every public page, old and new)
1. **Layout:** uses the central layout system (Phase 2), with the same theme, tokens, spacing and edge-to-edge behaviour on mobile and desktop.
2. **On-page SEO:**
   - Unique `<title>`: up to 60 characters, primary keyword first.
   - Meta description: up to 155 characters.
   - Exactly one H1, and an H2/H3 hierarchy that mirrors real search questions.
   - Clean slug.
   - Hindi alt text on images.
   - Breadcrumbs.
   - At least 3 contextual internal links.
   - "अंतिम अपडेट" date and the byline Team Kissan Sahyog.
3. **Keywords:** for each content page, record in `docs/seo/KEYWORDS.md`:
   - A primary keyword plus 5–15 secondary keywords in Hindi, Hinglish and English.
   - Sources: Google autocomplete, People Also Ask and related searches. Record where each came from.
   - Use the keywords naturally in the title, H1, first 100 words, H2s and FAQ. No keyword stuffing.
4. **AEO/GEO:**
   - A 40–60 word "संक्षेप में" direct-answer box at the top.
   - A FAQ section.
   - Quotable one-line facts with citations.
   - A "स्रोत" (Sources) section.
   - Explicit entity names (scheme names, departments, places).
5. **JSON-LD:**
   - Sitewide: Organization and WebSite (with SearchAction).
   - Every page: BreadcrumbList.
   - Content pages: Article. Pages with FAQs: FAQPage. Q&A pages: QAPage. Step-by-step guides: HowTo. Directories: ItemList.
   - Cold storage / vendor entries: LocalBusiness-type data, using only fields we actually have.
6. **Technical SEO:**
   - Canonical tag, `hreflang`, and Open Graph + Twitter cards with a share image.
   - Sitemap entry, robots-allowed, no broken links.
   - Lazy-loaded, sized images, no layout shift.
   - Per-route code splitting. The initial JS bundle must not grow by more than 15% over the Phase 0 baseline.
7. **Head tags:** use React 19's native document metadata (render `<title>`, `<meta>`, `<link>`, JSON-LD `<script>` inside a shared `<Seo/>` component). Do not add react-helmet.
8. **Pre-rendering (critical):** all public content routes are served as pre-rendered HTML containing the full content, title, meta and JSON-LD. Implementation is in Phase 2.
9. **Real 404:** replace the current catch-all `<Navigate to="/">` (a soft-404 problem) with a proper 404 page that is `noindex` and links to key hubs.
10. **Share hooks:** a WhatsApp share button with pre-written Hindi text, one shareable fact line, and related boxes (Phase 11).
11. **Accessibility:** keep the 44px tap-target rule (with `min-h-0` opt-outs for compact strips), sufficient contrast, labelled form fields and keyboard focus states.

### 0.7 Do-not-publish list (in addition to the dossiers' lists)
- Any statement or hint that carbon trading was "allowed / legalised / permitted / recently started" in Punjab or anywhere. Do not mention that idea at all.
- Punjab "₹35 crore expected" or "8,327 ha"; "$12 per credit / $6 to farmers"; "agroforestry sequesters up to 12 t CO₂/ha/yr"; "regenerative practices cut fertiliser by 20%".
- A "₹150/m² MIDH cost norm"; "80–85% drip subsidy" for MP.
- Calling any vendor "empanelled/approved" today.
- Any claim that daily weather/mandi WhatsApp messages can go as cheap "utility" templates. This is false: Meta classifies them as marketing.
- "36 hours" as the current takedown timeline (outdated).
- "Kajal Cold Storage" placed in Sagar (it is in Niwari/Tikamgarh).

### 0.8 Hard-stop conditions (stop and tell the owner exactly what is needed)
- A research file in §0.2(2) is missing or unreadable.
- `.env` is missing the Supabase keys or `SUPABASE_ACCESS_TOKEN`, so migrations cannot run.
- (Not a hard stop) `DATA_GOV_IN_API_KEY` is missing: skip the KCC API in Phase 12, use the other demand sources, and list the key as an owner action.
- The baseline test suite fails before you change anything. Record it, and fix it only if the cause is obvious and small; otherwise stop.

### 0.9 Engineering hygiene (every phase)
- **Migrations:** start at **0038**, additive and idempotent. Apply with `npm run db migrate`. Every new table gets RLS; anonymous inserts are tightly constrained; admin access goes through `require_admin` RPCs.
- **Tests:** after each phase run the relevant backend tests (`node --env-file=.env scripts/test/<suite>.mjs`) and E2E (`npm run test:e2e`). Loop bug-fix and retest until green. Never let the pass count drop below the Phase 0 baseline. Add permanent tests for every new feature.
- **Screenshots:** take every changed page at **375×812 and 1280×800**, view them, and fix any problems.
- **Docs:** update `PROJECT_CONTEXT.md` and `KNOWN_ISSUES.md` at the end of every phase (standing instruction).
- **Deploy:** in the final phase only, run `npx wrangler pages deploy dist --project-name kissansahyog`.

---

## PHASE 0 — Baseline & housekeeping
1. Run `git pull`. Read `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md` and the `docs/review/*` files from the last 10 days.
2. Check the §0.8 conditions. Confirm the research files exist and that the CSV has 243 data rows.
3. Run the full backend suite, the full E2E suite and a production build. Record pass counts and initial JS bundle size (gzip) in `docs/review/V2_BASELINE.md`.
4. Create `V2_PROGRESS.md` and `V2_DECISIONS.md`.
5. Fix the stale parts of `PROJECT_CONTEXT.md`:
   - Add the two 1 Oct Kisan Mela follow-ups (`kisan_mela_candidates` re-architecture; state normalization + dedup; migrations 0036/0037).
   - Remove "voice I/O out of scope" (voice search exists).
   - Remove the resolved "token expired / migration not applied" blockers for 0019–0021.
   - Note that `GEMINI_API_KEY` is set in Cloudflare Pages.
6. Commit.

## PHASE 1 — Citation & accuracy framework
1. **`docs/research/SOURCES.md`:** one row per source with `id` (e.g. `S-CARB-01`), title, publisher, URL, publication date, accessed date, type (Official / News / Company / Judgment) and the verbatim quote(s) used. Seed it from the three dossiers and Appendix A.
2. **`src/content/sources.js`:** the single site-side registry, mapping id → {title, publisher, url, date, type}. Generate it from `SOURCES.md` with a small script so the two cannot drift.
3. **Structured content model:** all long-form pages in this build are authored as data files in `src/content/pages/<slug>.js`:
   - Blocks: heading / paragraph / list / table / fact / calc / faq / checklist / cta.
   - Every block with a digit, ₹, % or date in its text carries `cites: ['S-…']`.
   - A shared renderer turns blocks into JSX, renders citations, and emits FAQPage/HowTo JSON-LD from the same data.
4. **Components:**
   - `<Cite/>`: superscript numbered link.
   - `<SourcesList/>`: list of sources with publisher, date, link and type badge.
   - `<LastUpdated/>`.
   - `<PastExampleNote/>`: "पिछला उदाहरण — गारंटी नहीं".
   - `<Calc formula inputs result cites/>`: renders the working.
5. **Citation audit** `scripts/test/v2_citation_audit.mjs` fails if any of these is true:
   - A content block contains a digit, ₹, % or date but has no `cites`.
   - A cite id is missing from `sources.js`.
   - Any §0.7 phrase or dossier do-not-publish phrase appears anywhere in `src/`.
   - The Q&A source records (Phase 12) lack a source.
6. **Link check** `scripts/test/v2_link_check.mjs`: request every source URL and list dead ones. Do not fail on transient network errors; report them.
7. Commit.

## PHASE 2 — Central layout system + SEO/prerender infrastructure
1. **Layout system:**
   - `src/components/layout/PageShell.jsx` (NavBar + main + Footer) with the primitives `Section` (full-bleed), `ContentColumn` (about 70 characters per line, for long text and forms), `Grid` and `Breadcrumbs`.
   - Tokens live in `src/styles/tokens.css`. Mobile and desktop rules are defined once via breakpoints (side padding 14px mobile / 40px desktop), not per page.
2. **Migrate every screen:**
   - Replace the old `Screen` (`max-w-xl`) wrapper and every per-page `max-w-*` container.
   - Screens: Homepage, Welcome, Signup, Login, Home, Browse, Post, ListingDetail, MyListings, Experts, ExpertDetail, Profile, Admin, Articles, ArticleDetail, Info, Resources, Sawaal, Safalta, Yojana, SchemeDetail, Videos, DroneDidi, Mausam, FasalSalah, AgroForestry, Msp, Credits, KisanMela, KisanMelaSubmit, Terms, Privacy.
   - Listing grids: 2 columns on mobile, 3–4 on desktop. Land stays 1 column on mobile.
3. **`<Seo/>`:** title, description, canonical, `hreflang`, Open Graph/Twitter and a JSON-LD slot. Add Organization + WebSite JSON-LD sitewide. Every route gets `<Seo/>`.
4. **Real 404** page (`noindex`), per §0.6(9).
5. **Pre-rendering:**
   - Add a post-build script `scripts/prerender.mjs`:
     - Build the route list from static routes plus data-driven slugs (schemes, articles, MSP crops, and later the new pages, cold-storage districts and Q&A slugs) fetched from Supabase at build time.
     - Serve `dist` locally, render each route with Playwright, and write `dist/<route>/index.html`.
     - Wait for a `data-prerender-ready` marker that each page sets once its data has loaded.
   - Add `npm run build:full` = `vite build && node --env-file=.env scripts/prerender.mjs`. All deploys from now on use `build:full`.
   - Confirm that Cloudflare Pages serves `dist/<route>/index.html` for that path, and that the SPA still hydrates and works.
   - Auth-gated routes are excluded.
6. **SEO audit** `scripts/test/v2_seo_audit.mjs` checks every pre-rendered HTML file and fails if any of these is missing or wrong:
   - A title, a meta description, exactly one H1, a canonical tag, `hreflang`, OG tags, and JSON-LD that parses.
   - The title and description must not duplicate another page's.
7. Screenshot every route at both sizes. Fix overflow and clipping. Commit.

## PHASE 3 — Brand spelling & greeting
1. Rename the brand per §0.3, including a migration that sets `articles.author_name` default to "Team Kissan Sahyog" and updates existing rows.
2. Implement the greeting per §0.3, with strings in `strings.js`.
3. Static test: no English "Kisan Sahyog" remains in `src/`, `public/`, `index.html` or the manifest, and the protected words in §0.3 are untouched.
4. Commit.

## PHASE 4 — Legal, trust & compliance
1. **Provider declarations.** Add a category-specific checkbox above the existing rules checkbox. It is enforced on the server (`create_listing` validates `details.provider_declared=true` for these categories) and has bilingual strings:
   - Equipment (incl. water tanker): "मेरा उपकरण चालू हालत में है, सुरक्षा गार्ड लगे हैं, ऑपरेटर प्रशिक्षित/लाइसेंसधारी है, सामान्य उपयोग में खराबी की ज़िम्मेदारी मेरी है, कोई छिपा शुल्क नहीं।"
   - Water tanker adds: "पानी का स्रोत वैध है; पीने योग्य होने का दावा मेरी स्वयं की घोषणा है।"
   - Cold storage: "बताया गया तापमान बनाए रखूँगा; भंडारित माल के बीमा की स्थिति सही बताई है।"
   - Greenhouse vendor: "काम की लिखित वारंटी दूँगा; किसी सब्सिडी की गारंटी का वादा नहीं करता।"
   - Jugaad: "यह मशीन/सेवा सुरक्षित है, मैं इसका निर्माता/मालिक हूँ, कानून और सुरक्षा की ज़िम्मेदारी मेरी है; यह सड़क पर चलने वाला वाहन नहीं है।"
2. **Grievance Officer page** `/grievance`, linked from the footer of every page:
   - Shri Abhinandan Dixit, **grievance@kissansahyog.com**.
   - How to complain, in Hindi and English.
   - Acknowledgement within **24 hours**; resolution within **7 days**. Cite the IT Rules 2021 as amended by G.S.R. 120(E), notified 10 Feb 2026, in force 20 Feb 2026. **Fetch the official Gazette/MeitY PDF and cite it as the primary source.**
   - Escalation to the Grievance Appellate Committee.
   - The usual resolution: "शिकायत सही पाए जाने पर हम लिस्टिंग/विक्रेता को हटा सकते हैं।"
   - The footer and `/contact` show **hello@kissansahyog.com** for general contact.
3. **Report button** "शिकायत करें" on every listing, vendor, jugaad and cold-storage page:
   - Reasons: धोखाधड़ी, गलत जानकारी, असुरक्षित उपकरण, गलत भाव, अवैध वस्तु, डुप्लीकेट, उत्पीड़न, अन्य. Plus an optional note and an optional phone number.
   - Stored in a `listing_reports` table (constrained anonymous insert, no anonymous read, simple per-IP rate limit like `voice_transcribe_calls`).
   - **Admin queue:** shows the age against the 24h/7-day targets, with actions "लिस्टिंग हटाएँ" (sets status removed), "खारिज करें" and a resolution note. The complaint log is retained.
4. **Terms & Privacy update:**
   - Intermediary role; no transactions on the platform; provider declarations; report/takedown process; grievance officer.
   - DPDP-style notice: what we collect (name, phone, village, optional profile and WhatsApp preference), why, and how to withdraw consent or delete the account.
   - Sponsored-content policy.
   - Use the government FARMS app disclaimer as a model for the "verify independently, negotiate offline" wording, and cite it.
   - Keep the "initial draft / legal review pending" note, and list legal review as an owner action.
5. **Sponsored readiness:**
   - Add `<SponsoredBadge/>` and an `is_sponsored` flag on vendor/listing cards, so any paid placement is clearly and prominently labelled.
   - Cite the Consumer Protection (E-Commerce) Amendment Rules 2026: notified 10 Sep 2026, effective 1 Jan 2027.
   - No ads go live in this build.
6. Tests. Commit.

## PHASE 5 — Water tanker (inside Equipment)
1. Add "पानी का टैंकर / Water tanker" as an equipment type. Its own fields appear only when it is selected:
   - Capacity in litres (required).
   - Vehicle: tractor-trolley / truck / other.
   - Water use: पीने योग्य / गैर-पीने योग्य / दोनों (seller's declaration).
   - Source: own borewell / panchayat-municipal / river-pond / other.
   - The seller's own rate, per trip and/or per 1,000 L.
   - Service radius in km, available months, photo.
2. Works for both Offer and Requirement listings. No borewell warning. No price benchmarks.
3. Gets its own homepage tile, a बाज़ार menu entry, and a seasonal box (shown prominently March–June).
4. Validation on client and in `create_listing`; sample listings; tests; screenshots. Commit.

## PHASE 6 — Cold storage (public directory + marketplace)
1. **Naming and entry points:**
   - Rename the category label to "गोदाम और कोल्ड स्टोरेज / Warehouse & Cold Storage".
   - Add a **कोल्ड स्टोरेज** tile and a menu entry.
2. **`/cold-storage` hub page** ("MP Cold Storage Finder"), bilingual and prerendered:
   - District, crop and type filters, and a near-me sort.
   - An intro section with MP's capacity vs requirement (Appendix A.4, cited).
   - "How to choose a cold storage" checklist and FAQs.
3. **New cold-storage listing fields:**
   - Facility type: bulk / multi-commodity / solar cold room / ripening chamber / CA.
   - Temperature range and crops accepted.
   - Total capacity, and **space available now** with its last-updated date.
   - Rate with a unit selector: per quintal/month, per bag/season, per crate/day, other.
   - Season dates and loading charges.
   - Power backup (Y/N) and stored-goods insurance (Y/N).
   - Optional WDRA registration number, and a pledge-loan facility (Y/N, with bank name).
   - These listings get the **100 km wide-visibility** exception, like bhusa and agri_inputs.
4. **Directory import:**
   - Import the 243 rows of `docs/research/mp_cold_storages.csv` into a new `cold_storage_directory` table (separate from user listings), with public read and admin write.
   - Fields: name, city, district, address, pincode, phone, capacity, type, rating text, source_name, source_url, notes, slug, status, claimed_by, plus the space-available fields.
   - Phones are shown as listed (owner approved).
   - Any notes containing "verify" are kept private (admin only).
   - Rows labelled "OLD LIST" show "पुरानी सरकारी सूची (2000–2009) — वर्तमान स्थिति की पुष्टि करें".
   - Every card shows "सार्वजनिक स्रोत से जानकारी", the source link, and **"क्या यह आपका है? दावा करें · सुधार करें · हटवाएँ"**.
5. **Claim and removal:**
   - Claim: the owner submits name, phone and a proof note. Admin approves, and the entry becomes owner-managed: the owner can edit fields, including space available now.
   - Removal requests work without login and are actioned by admin.
6. **District pages** `/cold-storage/<district-slug>` (prerendered): intro, count, entries, ItemList + LocalBusiness-type JSON-LD.
   - **Sagar page:** explain that few public entries exist and invite owners to register.
7. Tests, screenshots. Commit after the import and again after the pages.

## PHASE 7 — Greenhouse / polyhouse hub + marketplace
1. **Hub page** `/greenhouse`: bilingual, at least 3,000 words of Hindi, prerendered, authored as structured content. It covers:
   - The structure types: polyhouse, shade-net, fan-pad, walk-in/low tunnel.
   - Crops suited to Bundelkhand (cited).
   - Benefits, using verified ICAR figures only.
   - **Step-by-step setup** (HowTo schema).
   - **The MP state scheme's official cost-norm and 50% subsidy table**, read from the scanned PDF per §0.2(7) (Appendix A.2).
   - MIDH central assistance: 50%, up to 4,000 m².
   - **The NHB central scheme cut from 50% to 35% from 21 Aug 2026**, shown clearly separate from the MP state scheme.
   - PMKSY drip: 55% for small/marginal farmers, 45% for others.
   - AIF: 3% interest subvention.
   - **How to apply on MPFSTS**, with the current portal rules (lottery, 5-day document upload, 7-day vendor confirmation, current pause notice). Mark these "पोर्टल पर <date> को प्रदर्शित" and re-check them live during this phase.
   - Official portal links (Appendix A.2).
   - **MP Agro rate-contract vendor lists by year**, labelled "वर्ष X की MP Agro दर-अनुबंध सूची — वर्तमान स्थिति MPFSTS पर जाँचें".
   - ICAR success stories, labelled with their location and "गारंटी नहीं".
   - **The Khargone polyhouse-loan fraud (Sep 2026)** and a 15-point "पैसा देने से पहले जाँचें" vendor-safety checklist.
   - At least 20 FAQs.
2. Every subsidy figure carries "वित्तीय वर्ष 2026-27 · स्रोत · अंतिम जाँच" stamps.
3. **Calculators** (client-side, formula visible, each input cited):
   - Cost: area in m² × the norm for the matching size band.
   - MP state subsidy: official cost × 50%, capped at the scheme's area limit. Show the worked example 4,000 m² × ₹844 × 50% = ₹16,88,000 (गणना), only once the ₹844 band is confirmed from the PDF.
   - Disclaimer: "अनुमान — अंतिम राशि विभाग तय करेगा".
4. **Marketplace category "ग्रीनहाउस / पॉलीहाउस":**
   - Vendor sub-types: निर्माण/टर्नकी, मरम्मत व फ़िल्म बदलना, ड्रिप/फॉगर/फर्टिगेशन, पौध/नर्सरी, सलाह व सब्सिडी कागज़ात, पुराना ढांचा/सामग्री.
   - Farmer requirement listings: area, structure, crop, budget, village.
   - Vendor fields: structure types, pipe gauge and film micron, warranty years, projects done (photos), the vendor's own price range per m², districts served, and the claimed MP Agro rate-contract year (shown as "दावा").
   - 100 km wide visibility. Sample listings.
5. Ad slots exist but are empty, wired to `<SponsoredBadge/>`.
6. Link the hub from Agro Forestry & Horticulture, crop pages and the homepage. Tests, screenshots. Commit.

## PHASE 8 — Carbon credit page (question format, thought-provoking)
1. **`/carbon-credit`:** bilingual, 2,500–3,500 words of Hindi, prerendered, structured content.
   - The title is a question. Choose the best from the dossier's headline options, or use **"कार्बन क्रेडिट: क्या यह किसानों की आय का नया ज़रिया बन सकता है — और क्या मध्य प्रदेश को इसे अपनाना चाहिए?"**
2. **Sections:**
   - What a carbon credit is.
   - How farmers can earn: soil practices, agroforestry/bund trees, manure/biogas. Link each to a verified methodology or project only.
   - **Real Indian examples, stated as plain facts:**
     - The Punjab Forest Department's agroforestry carbon scheme (2024).
     - Grow Indigo's payments to 2,550 Punjab & Haryana farmers (Sep 2026).
     - The UP scheme, as verified in the dossier.
     - Each example uses `<PastExampleNote/>` and a `<Calc/>` for the average.
   - How long payment takes, plus contract length and revenue-share terms (verified only).
   - India's framework: CCTS and the offset mechanism; the Ministry of Agriculture framework and pilots; the Lok Sabha reply that no farmer-income assessment has been done.
   - Green Credit vs carbon credit.
   - Madhya Pradesh today: no state farmer scheme found; private projects; the MP High Court transit-permit ruling and any later exemption, only as verified in the dossier.
   - What suits Sagar/Bundelkhand.
   - **पक्ष में तर्क vs विपक्ष में तर्क.**
   - Risks: the non-payment study, middlemen, long contracts, tenant/batai farmers.
   - **Policy options MP could consider:** district pilots, FPO aggregation, a standard farmer contract, a public registry, a transit-permit fix.
   - A farmer **red-flag checklist** before signing anything.
   - A glossary and 20 FAQs.
3. **Do NOT mention, hint at or fact-check any idea that carbon trading was "allowed" anywhere** (§0.7).
4. **Printable policy brief** `/carbon-credit/niti-sujhav`: a 1–2 page Hindi summary of the facts and policy options, styled for printing (print CSS, A4), with all citations. Meant for sharing with officials.
5. **Public opinion:**
   - Poll: "क्या मध्य प्रदेश में किसानों के लिए कार्बन क्रेडिट योजना होनी चाहिए?" Options हाँ / नहीं / पता नहीं. One vote per device; results shown after voting.
   - Suggestions box: name and village optional, text required. Submissions are stored unpublished and shown on the page after admin approval in `/admin`.
   - Create the tables with RLS and constrained anonymous insert.
6. 5 quotable stats (cited), WhatsApp share text, Article + FAQPage schema. Link from Agro Forestry and the homepage. Tests, screenshots. Commit.

## PHASE 9 — Jugaad (marketplace + information page)
1. **Category "जुगाड़ / Rural Innovations":** public listings like any other category.
   - **Offer types:** बेचना, किराये पर, सेवा, ऑर्डर पर बनाना, and **"विकास में — मदद/साझेदारी चाहिए"** (work in progress, open to help).
   - **Fields:** name of the innovation, the problem it solves, crop/activity, how it helps (no drawings needed), photos, demo video link, price/rent (the seller's own), units made so far, "परीक्षित / अपरीक्षित" (with an optional testing-body name), maker name and village, contact.
   - The jugaad declaration from Phase 4.
   - **Road vehicles are not accepted:** add validation and a clear message.
   - The standard disclaimer on every listing. Sample listings.
2. **Information page `/jugaad`:** bilingual, at least 3,000 words of Hindi, prerendered. It covers:
   - What jugaad/grassroots innovation is.
   - Verified inspiring examples (from the dossier).
   - **Support available, informational only** ("इन सेवाओं की जानकारी"):
     - National Innovation Foundation – India: what it does, MVIF, the current 15th Biennial competition (open till 31 Mar 2027), how to submit.
     - Honey Bee Network/SRISTI/GIAN.
     - DST NIDHI-PRAYAS.
     - Startup India Seed Fund.
     - MP Startup Policy 2025.
     - **CFMTTI Budni** machine testing.
   - **Legal & safety guide in plain Hindi:**
     - Patents Act: public disclosure can affect patentability. Explain it simply and offer no help with patents.
     - Design and trademark basics.
     - Dangerous Machines (Regulation) Act 1983.
     - Consumer Protection Act 2019 product liability.
     - Motor Vehicles Act, with RSRTC v. Santosh (2013) and RTO v. K. Jayachandra (9 Jan 2019).
     - Electrical safety.
     - How platforms are treated: IT Act s.79 and Shreya Singhal v. Union of India (24 Mar 2015).
   - A safety checklist for makers and buyers, and how to list a jugaad.
   - **How Kissan Sahyog may try to help, in soft language only:** "हम कोशिश करेंगे कि अच्छे नवाचारों को इंजीनियरिंग कॉलेजों, पॉलिटेक्निक, ITI, मेडिकल व फार्मा क्षेत्र और कंपनियों के सामने प्रस्तुत/प्रस्तावित करें; रुचि हो तो हमसे hello@kissansahyog.com पर संपर्क करें।" No named institutions, no commitments.
   - At least 15 FAQs and the disclaimers.
3. Never write offers like "पेटेंट/पुरस्कार चाहिए?". Tests, screenshots. Commit.

## PHASE 10 — Site-wide search (typing + voice)
1. **Search bar in the NavBar on every page.**
   - Desktop: an inline bar.
   - Mobile: a 🔍 icon that opens a full-screen search with a large 🎤.
   - Voice reuses `lib/voice/voiceSearch.js` (Web Speech hi-IN first, with the Gemini `/transcribe` fallback; the key is set).
2. **It searches only site content:**
   - Listing teasers (category, crop, equipment type, village).
   - The cold-storage directory, videos, Kisan Sawaal Q&A pages, schemes, articles, Kisan Mela, resources/contacts, experts, MSP crop pages.
   - All hub pages.
3. **Hindi, Hinglish and English matching:**
   - `src/content/searchSynonyms.js` covering every crop, category and common term (गेहूं/gehu/gehun/wheat, ट्रैक्टर/ट्रेक्टर/tractor, सोयाबीन/soyabean/soybean, etc.).
   - Fuzzy matching: a `search_all` RPC using `pg_trgm` for DB content, plus a build-time static index for content pages. Record the design in `V2_DECISIONS.md`.
4. **Results page:**
   - Results grouped by type, with counts. Listings show distance.
   - Popular-search chips.
   - The no-result state shows nearby categories and "अपनी ज़रूरत पोस्ट करें".
5. Log zero-result queries in a `search_misses` table (anonymous insert, rate-limited) with an admin view.
6. WebSite SearchAction JSON-LD pointing to `/search?q=`. `/search` is `noindex`. Tests. Commit.

## PHASE 11 — Interlinking boxes (one central registry)
1. **`src/content/boxRegistry.js`:** each box has `{id, title, icon, link, pages[], months[], priority}`. A `<RelatedBoxes page=…/>` component renders 3–6 small boxes.
2. **Rules:**
   - मौसम page → tanker (summer), cold storage, transport.
   - MSP/crop price pages → cold storage, transport, harvester/thresher.
   - Greenhouse → drip, nursery, cold storage, vendors.
   - Carbon → Agro Forestry, jugaad.
   - Listing detail → other categories nearby.
   - Q&A pages → experts, inputs, Drone Didi spraying, KVK contacts.
   - **Seasonal:**
     - March–June: tanker.
     - Harvest (March–April, October–November): harvester, thresher, transport, cold storage.
     - Sowing (June–July, October–November): seed drill, inputs.
3. "आपके आसपास नया" and "सबसे ज़्यादा देखा गया" boxes on the homepage and Browse. Add a lightweight, rate-limited view counter via an RPC. Commit.

## PHASE 12 — Kisan Sawaal knowledge base (most-asked farmer questions)
1. **Find out what farmers actually ask.** Document the method and the data in `docs/research/QA_DEMAND.md`.
   - **The Kisan Call Centre (KCC) query dataset** on data.gov.in:
     - Locate it, and use `DATA_GOV_IN_API_KEY` from `.env` if the API needs one.
     - Pull the Madhya Pradesh records, Sagar and neighbouring districts first.
     - Rank query types by frequency, per crop and season.
     - If the dataset is unavailable, record that and move on to the next sources.
   - Google autocomplete and People Also Ask in Hindi, Hinglish and English, for each crop × problem.
   - The existing `kisan_sawaal` rows (about 19 seeded, plus user submissions).
2. **Scope: cover all the important, most-asked questions** for Sagar/MP's major crops: soybean, wheat, chana, masoor, urad, moong, maize, and vegetables including tomato, onion, garlic and chilli.
   - **Topics:** pests, diseases, nutrient deficiency, weeds, seed varieties, sowing time, irrigation, weather damage, harvesting, storage, mandi/MSP selling, soil testing, schemes (PM-KISAN, PMFBY, KCC, Soil Health Card), equipment.
   - Expect roughly 150–300 Q&As. Publish them in ranked order, most-asked first, in batches of 25. Commit each batch.
   - **If the run must stop:** finish and commit the current batch, and list the remaining ranked questions in the final report.
3. **Data model:** extend `kisan_sawaal` with `slug`, `crop`, `category`, `season`, `answer_blocks jsonb`, `sources jsonb` (ids from `sources.js`), `published_at` and `updated_at`.
   - The admin can edit everything.
   - The existing answered rows get slugs and pages too.
4. **Pages:**
   - Each Q&A gets its own page, `/sawaal/<slug>`, prerendered.
   - Crop hub pages: `/fasal/<crop>/samasya`.
   - Category hubs.
   - `/sawaal` becomes the index, with search and filters.
5. **Content rules for every answer:**
   - A short direct answer (AEO box).
   - Symptoms and identification, causes.
   - What to do, in order: cultural, then biological, then chemical. **Name chemicals and doses only exactly as given in the cited ICAR/KVK/SAU/state-department source.** Always add "लेबल पर लिखी मात्रा ही उपयोग करें".
   - Prevention.
   - When to contact KVK Sagar or the agriculture office (contact details from the existing resources table).
   - Related questions, and sources.
   - **The fetch-and-quote rule (§0.2(4)) applies to every answer.** If no source can be opened and quoted, skip the question and list it in the report. No "under review" tags.
6. QAPage + BreadcrumbList schema. Related boxes to inputs, experts and Drone Didi.

## PHASE 13 — WhatsApp groundwork (no sending)
1. **Admin "आज की पोस्ट" builder** (a `/admin` tab):
   - Generates a 1080×1350 PNG card via canvas with:
     - Today's Sagar-area mandi prices from `mandi_prices`, with the latest available date shown clearly.
     - A weather summary from `weather_cache_v2`.
     - Kissan Sahyog branding.
   - Also writes a Hindi caption with channel/bot link placeholders and an optional reel/video link.
   - Buttons: Download image, Copy caption.
2. **"WhatsApp पर जुड़ें" pieces, built but hidden:**
   - An admin setting `whatsapp_channel_url` in `site_settings`. **While it is empty, nothing shows.**
   - Once it is set, these appear:
     - A footer and nav link.
     - A homepage section: "रोज़ सुबह सागर मंडी भाव + मौसम WhatsApp पर — मुफ़्त".
     - Contextual boxes on मौसम, MSP, Kisan Mela, after signup and after posting a listing.
     - A mobile button and a desktop QR code (generated in the app, no third-party QR service).
     - A `/join?src=<page>` redirect that logs the source in a `join_clicks` table and then redirects.
   - The admin can download a high-resolution QR PNG for posters.
3. **WhatsApp consent at signup and on the profile:**
   - Checkbox "मुझे Kissan Sahyog से WhatsApp पर जानकारी भेजें", unchecked by default.
   - Stored as `whatsapp_opt_in` and `whatsapp_opt_in_at`.
   - Optional preferred mandi and main crops.
   - Editable and withdrawable on the Profile page, and covered in the privacy notice.
   - Admin-only export of opted-in users.
4. Tests. Commit.

## PHASE 14 — SEO/AEO/GEO completion (all pages)
1. Apply §0.6 to every public page, old and new. Create OG share images for every hub page; page-specific images are acceptable.
2. **Sitemaps:**
   - Split into `sitemap-pages.xml`, `sitemap-sawaal.xml`, `sitemap-cold-storage.xml` and `sitemap-schemes.xml`, plus a `sitemap.xml` index. All are generated at build.
   - Update `robots.txt`.
   - Write `llms.txt` describing the site's sections and key pages.
3. Complete `docs/seo/KEYWORDS.md` and write `docs/seo/SEO_CHECKLIST.md`.
4. Run `v2_seo_audit` on the full build. Then `curl` 20 sample routes, including Q&A, cold-storage district and hub pages, and confirm the content is present without JavaScript. Commit.

## PHASE 15 — Full verification, deploy, report
1. **Run everything:**
   - Full backend suite, full E2E, `v2_citation_audit`, `v2_seo_audit`, `v2_link_check`, `v11_phase6` (i18n), a bundle-size check against the baseline, and a clean `npm run build:full`. There is no lint script in the repo; do not add one.
   - Loop bug-fix and retest until green. The link check may list transient failures.
2. **Screenshot review** of every route at 375×812 and 1280×800, saved in `docs/review/shots-v2/`. View them and fix any problems.
3. **Deploy:** `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog`. Then live-verify:
   - All new routes return 200.
   - The pre-rendered HTML is served.
   - Unknown URLs return the 404 page.
   - Search, voice, the report button, claim and removal requests, the poll and suggestions all work.
   - The grievance page is reachable from the footer.
4. Update `PROJECT_CONTEXT.md` with a section per phase, and `KNOWN_ISSUES.md`.
5. **Write `docs/review/V2_FINAL_REPORT.md`:**
   - What was built in each phase, and test counts against the baseline.
   - The deploy URL.
   - Every fact that could not be verified (and so was not published).
   - Dead source links.
   - The Q&A backlog, if any.
   - All entries from `V2_DECISIONS.md`.
   - **Owner actions,** with Mac Terminal-ready commands where needed:
     - Create `grievance@` and `hello@kissansahyog.com` (Cloudflare Email Routing to Gmail).
     - Paste the WhatsApp Channel URL into admin when ready.
     - Get the Terms/Privacy legal review done.
     - Verify the site in Google Search Console and submit the sitemap index.
     - Always deploy with `npm run build:full` from now on.

---

## APPENDIX A — Verified facts (cite exactly; add all to SOURCES.md)

### A.1 Carbon credits
| Fact | Source |
|---|---|
| 17 Sep 2026: Grow Indigo's "Aadi" programme (launched 2019 with ICAR technical guidance) made DBT payments to **2,550 farmers** in Punjab & Haryana, **₹2.9 crore** in total, about **₹3,000–₹15,000** each, for DSR, reduced tillage and crop-residue management in **2019–2022**. Farmers could choose an assured upfront payment or **75% of net carbon revenue**. Grow Indigo paid from its own funds. The DBT was initiated by Dr M. L. Jat, Secretary DARE & DG ICAR | PIB, Ministry of Agriculture: https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2311218&lang=2&reg=48 [Official] |
| Calculation: ₹2,90,00,000 ÷ 2,550 ≈ ₹11,373 average per farmer (label it "गणना") | Derived from the PIB figures above |
| Punjab Forest Department agroforestry carbon-credit compensation (Aug 2024): ₹45 crore for 3,686 farmers in four instalments; first instalment ₹1.75 crore to 818 farmers (Hoshiarpur); trees to be kept at least 5 years | Indian Express, 7 Aug 2024: https://indianexpress.com/article/cities/chandigarh/in-a-first-punjab-farmers-take-home-cheque-worth-rs-1-75-cr-as-carbon-credit-compensation-9499609/ ; ANI: https://aninews.in/news/national/general-news/punjab-cm-mann-exhorts-people-to-transform-plantation-drives-into-mass-movement-launches-carbon-credit-scheme-worth-rs-45-crore20240806201342/ [News] |
| Ministry of Agriculture framework for a voluntary carbon market in agriculture; agriculture is included in the CCTS offset mechanism | PIB: https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2000331 ; https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2037660 [Official] |
| BEE methodology BM AG04.001: methane recovery from livestock/manure management at households and small farms | https://beeindia.gov.in/view_content.php?lang=1&lid=571 [Official] |
| CCTS offset credits cannot be used for compliance obligations | https://icapcarbonaction.com/en/ets/indian-carbon-credit-trading-scheme [Secondary — try to confirm on beeindia.gov.in] |
| Jul 2026 Lok Sabha reply: 11 pilots; "no assessment has been carried out so far on the potential for income generation for farmers" | https://www.outlookbusiness.com/news/11-pilot-projects-to-help-farmers-tap-carbon-credit-market-govt [News — try to fetch the original Lok Sabha answer and cite that instead] |
| A Supreme Court-appointed committee (Jul 2025) discussed carbon credits as an income source and suggested pilots. Do not call this an order or recommendation of the Court itself | https://www.tribuneindia.com/news/punjab/sc-panel-for-increase-in-farmers-income-through-carbon-credits [News] |
| A study of 800+ farmers in carbon projects in Haryana & MP found over 99% had received no payment | https://www.downtoearth.org.in/climate-change/99-farmers-in-haryana-and-mp-participating-in-voluntary-carbon-market-received-no-benefits-finds-study [News] |
| MP High Court, Vivek Kumar Sharma v. State of MP (1 Mar 2025), struck down the transit-permit exemption notification for farm-grown tree species | https://www.scconline.com/blog/post/2025/03/13/mp-high-court-strikes-down-notification-exempting-62-species-of-forest-produce-from-transit-rules-scc-times/ [Secondary legal] |
| Grow Indigo's "Ragini" project is registered with Verra across Bihar, MP, Rajasthan and UP | https://www.growindigo.co.in/grow-indigos-ragini-project-achieves-verra-registration-across-four-indian-states/ [Company claim] |
| Everything else (UP scheme, Green Credit Programme status, other developers' revenue shares, the Jan 2026 species exemption) | Use only as verified in `carbon_credit_dossier.md`, with its citations |

### A.2 Greenhouse / polyhouse (MP)
| Fact | Source |
|---|---|
| Official portal: MP Farmers Subsidy Tracking System (MPFSTS), Horticulture & Food Processing Dept | https://mpfsts.mp.gov.in/mphd/ · guidelines: https://mpfsts.mp.gov.in/mphd/#/SchemeGuidLine · farmer manual: https://mpfsts.mp.gov.in/mphd/document/Farmer_UserManual.pdf · helpdesk: mpfsts.helpdesk@mp.gov.in [Official] |
| MP state scheme "व्यावसायिक उद्यानिकी फसलों की संरक्षित खेती को प्रोत्साहन योजना" (from the PDF's text layer). Cost norm → 50% subsidy per m²: naturally ventilated polyhouse ₹1,060 / 935 / 890 / 844 → ₹530 / 467.50 / 445 / 422; fan-pad ₹1,650 / 1,465 / 1,420 / 1,400 → ₹825 / 732.50 / 710 / 700; shade net ₹710 → ₹355. Area limits of 1,000 m² and 4,000 m² appear by item. **Render the scanned pages per §0.2(7) and confirm every row label and the size bands (up to 500 / 500–1,008 / 1,008–2,080 / 2,080–4,000 m²). Publish only what you can read** | State scheme guideline PDF linked on MPFSTS under "State - व्यावसायिक उद्यानिकी फसलो की संरक्षित खेती को प्रोत्साहन योजना" (see the greenhouse dossier addendum) [Official] |
| 2026-27 targets for the state protected-cultivation scheme are open | https://mpfsts.mp.gov.in/reports/UploadImage/file/STATE%2020_7_2026.pdf [Official] |
| MIDH 2026-27 targets are open | https://mpfsts.mp.gov.in/reports/UploadImage/file/149-150%20MIDH%20%E0%A4%B2%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A5%8D%E0%A4%AF%202026-27.pdf [Official] |
| Portal notices as displayed on 5 Oct 2026: the lottery and letter-of-intent process is temporarily paused for cluster-based target allocation under MIDH, PDMC, RKVY and state schemes; selected farmers must upload documents within 5 days; the work order auto-cancels if the vendor doesn't confirm the farmer's share within 7 days | MPFSTS homepage notices [Official]. **Re-check live and stamp with the date seen** |
| MP Agro rate-contract vendor lists for protected cultivation. **2022-23:** Chaoudhary Traders; Diksha Green House Construction Company, Guna; Greentech Services. **2021-22:** Chuadhary Traders; Deeksha Green House; Maa Narmada Trading Company. **2019–21:** Aero Green House Pvt Ltd; AM BI Interprises; Bhavya Agritech; Earth Agro Structures Pvt Ltd; Flora Rose Services; Hindustan Agrotech; Kisan Agrotech; Madhyapradesh Poly House; Oswal Hortitech Pvt Ltd; Rajsthan Agro Products; Ratanpuri Green House Pvt Ltd; Shri Narayan Green House Infra Pvt Ltd. No 2025-26 or 2026-27 protected-cultivation list is posted | https://mpfsts.mp.gov.in/mphd/#/MPAgroVendorList (data: https://mpfsts.mp.gov.in/mphd/Home/getAgroRateListAllSchemes/) [Official]. Label by year and say "वर्तमान स्थिति MPFSTS पर जाँचें". Spell names exactly as listed |
| MIDH: 50% assistance for protected cultivation, up to 4,000 m² per beneficiary | PIB (10 Feb 2023), per the greenhouse dossier [Official] |
| NHB central scheme: assistance for protected cultivation cut from 50% to 35% (revised guidelines dated 21 Aug 2026); farmers protesting | https://www.freepressjournal.in/pune/pune-farmers-protest-nhb-subsidy-cut-demand-restoration-of-50-assistance-for-polyhouses-shade-net-houses [News]. Also try the NHB guideline page (nhb.gov.in) for the official notice |
| ICAR: protected cultivation adoption in MP; 2,000–4,000 m² structures; ₹2–5 lakh net per season from half an acre to one acre | https://www.icar.gov.in/en/node/4630 [Official] |
| ICAR success story: 3,000 m² coloured-capsicum polyhouse, cost ₹35 lakh, ₹11 lakh subsidy, about ₹20 lakh gross and ₹15 lakh net (state its location; "गारंटी नहीं") | https://icar.gov.in/en/protective-cultivation-polyhouse-success-story-coloured-capsicum-production [Official] |
| Khargone (MP) polyhouse-loan fraud, Sep 2026: EOW FIR; 33 farmers; about ₹9.7 crore (reports give ₹9.70–9.71 crore, so show "लगभग ₹9.7 करोड़") | https://www.newindianexpress.com/states/madhya-pradesh/2026/Sep/23/in-mp-33-farmers-got-loans-for-greenhouses-that-never-existed-eow-finds-rs-97-crore-fraud [News] |
| PMKSY drip: 55% for small/marginal farmers, 45% for others. AIF: 3% interest subvention on loans up to ₹2 crore | Per the greenhouse dossier's citations [Official] |

### A.3 Jugaad / legal
| Fact | Source |
|---|---|
| NIF – India (a DST autonomous body): grassroots innovation database and recognition figures. Use the current figures on the DST page, with the date | https://dst.gov.in/autonomousstinstitutions/national-innovation-foundation [Official] |
| NIF 15th National Biennial Competition is open till 31 Mar 2027 | https://nif.org.in/biennial_campaign (or https://nif.org.in/ignite/index.php) [Official] |
| MVIF gives support without collateral or guarantor | https://www.indiascienceandtechnology.gov.in/funding-opportunities/research-grants/institutional/micro-venture-innovation-fund-mvif [Official] |
| Startup India Seed Fund: up to ₹20 lakh grant (PoC/prototype) and up to ₹50 lakh investment | https://seedfund.startupindia.gov.in/faq [Official] |
| DST NIDHI-PRAYAS: up to ₹10 lakh for prototyping | https://nidhi.dst.gov.in/schemes-programmes/nidhiprayas/ [Official] |
| MP Startup Policy & Implementation Scheme 2025 | https://startup.mp.gov.in/policyandscheme [Official] |
| CFMTTI Budni (Sehore, MP): farm-machinery testing, including commercial and confidential tests, with a fee schedule that covers startups | https://www.fmttibudni.gov.in/ ; https://fmttibudni.gov.in/index.php/en/testing [Official] |
| Supreme Court, RSRTC v. Santosh (2013): a "jugaad" is a motor vehicle under MV Act s.2(28) | https://indiankanoon.org/doc/100267722/ [Judgment] |
| Supreme Court, RTO v. K. Jayachandra (9 Jan 2019): a vehicle cannot be altered from the manufacturer's specification (MV Act s.52) | https://www.scconline.com/blog/post/2019/01/09/original-specifications-made-by-the-manufacturer-of-the-vehicle-cant-be-altered-sc/ [Secondary legal] |
| Shreya Singhal v. Union of India (24 Mar 2015): s.79 read down; "actual knowledge" means a court order or government notification | https://www.legitquest.com/case/shreya-singhal-v-union-of-india/90624 [Judgment] |
| Patents Act; Dangerous Machines (Regulation) Act 1983; Consumer Protection Act 2019 ss.82–87 | Use the `jugaad_legal_dossier.md` citations, preferring indiacode.nic.in |
| IT Rules amendment G.S.R. 120(E), notified 10 Feb 2026, in force 20 Feb 2026: grievance resolution 7 days (was 15); court/government takedowns 3 hours; NCII 2 hours. A separate April 2026 MeitY draft is NOT law | https://gazettetracker.com/g/CG-DL-E-10022026-269993 ; https://blog.ipleaders.in/it-rules-2026/ [fetch and cite the official Gazette/MeitY PDF as the primary source] |
| Consumer Protection (E-Commerce) Amendment Rules 2026: notified 10 Sep 2026, effective 1 Jan 2027; sponsored listings must be clearly and prominently disclosed | https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=294532 [Official] |
| DPDP Rules notified 13 Nov 2025, with staged commencement (most obligations after 18 months) | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf [Official] |
| Government FARMS app disclaimer: users and providers should verify independently; negotiation happens offline | https://agrimachinery.nic.in/index/CHCMobAppDisclaimer [Official] |

### A.4 Cold storage
- **Directory data:** `docs/research/mp_cold_storages.csv`, 243 entries, 73 with phones.
  - Sources: the NHB official list (old 2000–2009 sanctions, labelled "OLD LIST"), MoFPI, NaPanta, IndiaMART, Justdial, and Google Maps business listings accessed 5 Oct 2026.
  - Sagar district entries: Shiv Shankar Cold Storage (099937 39544); Janta Cold Storage and Ice Factory; Mahalaxmi Cold Store; ShriRam Warehouse, Bina (096693 13999; Google category: cold storage facility).
- **MP capacity:** 13,64,003 MT created vs 18,67,179 MT required (as of 31 May 2024). Source: MoFPI Rajya Sabha annex, https://www.mofpi.gov.in/sites/default/files/_annex_266_au2954_9twhtb.pdf [Official].

---

## APPENDIX B — Final checklist (all must be true before you finish)
- [ ] Every phase is ticked in `V2_PROGRESS.md`, committed, pushed, deployed with `build:full`, and live-verified.
- [ ] Every public page uses the central layout, is pre-rendered (checked with curl) and passes `v2_seo_audit`. Unknown URLs return a real 404.
- [ ] Every number on new pages is cited and `v2_citation_audit` is green. Nothing from §0.7 or the dossiers' do-not-publish lists appears.
- [ ] English brand is "Kissan Sahyog" everywhere, with the protected "Kisan" words untouched. Byline is "Team Kissan Sahyog". Greeting is "सीताराम 🙏, {name}" / "सीताराम 🙏".
- [ ] No "समीक्षाधीन / under review" labels anywhere.
- [ ] The grievance page and footer show Shri Abhinandan Dixit, grievance@kissansahyog.com and the 24h/7-day timelines. hello@kissansahyog.com is shown for general contact.
- [ ] Test counts are not below baseline, every suite is green, and the bundle grew by no more than 15%.
- [ ] `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `V2_DECISIONS.md` and `docs/review/V2_FINAL_REPORT.md` are complete, including the owner actions in Mac Terminal-ready form.
