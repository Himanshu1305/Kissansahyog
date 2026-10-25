# BATCH 5 — New categories + more Q&As (CLOUD VERSION: paste this whole text into a Codex cloud task in the browser)

You are Codex (cloud), working unattended on the Kisan Sahyog repo (GitHub: Himanshu1305/Kissansahyog) (React 19 + Vite 8 + Tailwind v4 + react-router 7, Supabase, Cloudflare Pages). The owner is a non-technical founder who reviews your final report, so write it plainly.

This batch has two parts:

- **Part A**: new marketplace categories (vegetable-farming equipment, rare equipment, building materials).
- **Part B**: more Q&As (aim: at least 25 new) from sources other than the MP Agriculture Department.

Do **Part A first, then Part B**. Commit after each part.

---

## 0. Rules that override everything else

1. **Branch only.** Never commit to `main`. Never merge. Work on branch `codex/batch5-categories-qa` (create it from `main`). Do not push to any other branch. When finished, leave the commits on that branch so the owner can open a pull request from the Codex task (he will review it before merging). Never push or force-push to `main`.
2. **No deploys.** Do not run `wrangler`, do not touch Cloudflare, and do not deploy to preview or production. The owner is testing the current preview right now, and it must not change.
3. **No database access from here.** You do not have the Supabase service key and must not look for it, create it, or ask for it. If `.env` is missing, that is expected. If any Supabase, GitHub or other connector is attached to this account, **do not use any connector to read or write the database or any other service.** Therefore:
   - Do **not** run `scripts/seed-sawaal.mjs` or any script that writes to Supabase.
   - Do **not** apply migrations. Only write the migration files.
   - Do **not** create any listings, test or otherwise.
   - Everything that needs the database goes into `docs/review/BATCH5_RUN_ON_MAC.md` as exact commands for the owner's own computer (the one that holds the `.env`).
4. **Shared-DB, additive-only migrations.** The old live app (commit `ba455ae`, production kissansahyog.com) uses the same database as this V2 build. A migration must never drop, rename, narrow or change the meaning of anything the old app uses. Allowed: new tables, new nullable columns, widening a CHECK or enum, new functions, new indexes. Number the file `0053_...` onward (0038–0052 already exist; check the folder for the real next number). Make each migration idempotent (`IF NOT EXISTS`, guarded `DO $$` blocks) and put a short rollback note in a comment at the top. Study how the earlier category additions (e.g. agri_inputs, jugaad) were done in migrations 0038–0052 and copy that pattern.
5. **Old-app safety check.** Before finishing Part A, run `git show ba455ae:src/lib/listings/catalog.js` and `git show ba455ae:src/lib/listings/registry.jsx` (and related old files). Work out what the OLD production app does when it meets a listing whose category it does not know (crash, blank page, or silently skipped). Record the answer in the report under "Old app and new categories". If it would crash or break Browse, say so loudly, because V2 testers can create listings in the shared DB that production then reads.
6. **Land and Labor categories stay in scope and untouched.** The existing category behavior also stays unchanged: 30 km default visibility with the 30–50 km fallback, `wide_visibility` opt-in at 100 km, browse without login, login only for phone number, posting, My listings and Profile, and `is_test_data` sample listings stay visible. Sellers enter their own details and rates. The platform does no rate-finding and no verification.
7. **Content and brand rules.** Follow `docs/content/STYLE_GUIDE.md` exactly. Hindi-first, English second. Greeting is "सीताराम 🙏, {name}" (never "जी"). Byline "Team Kissan Sahyog". No "under review" labels. Do not touch the carbon page. Grievance Officer text is unchanged (Shri Abhinandan Dixit, grievance@kissansahyog.com; general contact hello@kissansahyog.com).
8. **Facts only from sources you fetched and quoted.** No fact (number, rule, scheme name, subsidy, legal statement, standard number) goes into the app or a Q&A unless you fetched the source page in this run and can quote the supporting sentence verbatim. Never write facts from memory. Check regional fit: facts must apply to Madhya Pradesh / the Sagar area, not another state. Derived unit conversions are fine only if the arithmetic is shown in the research notes.
9. **Cloud environment.** You run in a Linux cloud sandbox. Internet access may be limited. If a fetch is blocked, do not try to work around the block (no proxies, mirrors or cached copies); record the blocked URL and move on. Long tasks can be cut off: commit often and keep `docs/review/BATCH5_PROGRESS.md` current so a follow-up message can resume.
10. **Permissions and scope.** Work non-interactively. Do not ask questions. If something needs a human decision, pick the safest option, record it under "Decisions needed" in the report, and carry on. Only edit files inside this repo. Do not install global tools. Do not touch other projects in the parent folder.
11. **Resume.** Keep `docs/review/BATCH5_PROGRESS.md` as a checklist and tick items as you finish them. If the file already exists when you start, resume from the first unticked item. If you hit a true blocker, write `docs/review/BATCH5_BLOCKED.md` (what you tried, what is needed) and stop. Write `docs/review/BATCH5_REPORT.md` only when everything required is done (see Section 4 and Section 5).

---

## 1. Setup (do this first)

1. You are in the repo root, on `main`. Confirm with `git log -1 --oneline` that the latest commit is `e256176` or newer.
2. **Staleness check.** Confirm these exist: `docs/review/BATCH4_REPORT.md`, `src/content/`, `docs/content/STYLE_GUIDE.md`, `docs/research/SOURCES.md`, `scripts/build-qa.mjs`. If any is missing, write `docs/review/BATCH5_BLOCKED.md` ("main lacks V2") and stop.
3. `git checkout -b codex/batch5-categories-qa`. (This prompt is not stored in the repo; that is fine.)
4. Install dependencies if `node_modules` is missing (`npm ci`). Run only the unit, audit and content tests from `package.json` once on the untouched branch and record which pass (the baseline). **Never run any Playwright E2E suite (`e2e/`) and never start anything that talks to Supabase: those tests create listings in the shared live database.** If the environment has no Supabase variables, that is intended; leave them unset and do not ask for them. Note every test you skipped because it needs the database, `.env` or E2E.
5. Read, in this order: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `docs/content/STYLE_GUIDE.md`, `docs/review/BATCH4_REPORT.md`, `docs/research/SOURCES.md`, the category code (`src/lib/listings/`, `src/components/categories/` or wherever V2 keeps them), `src/lib/i18n/strings.js`, and the migrations 0038–0052.
6. Create `docs/review/BATCH5_PROGRESS.md` with the checklist from Parts A and B.

---

## 2. Part A — Categories

### Decisions already made (do not re-debate)

- **Equipment for vegetable farming** is NOT a new top-level category. It is a **sub-type of Equipment**.
- **Rare / hard-to-find / emergency machinery** (for example pit-digging attachments, field cranes) is also a **sub-type of Equipment**. A listing can carry either tag or both.
- **Building materials** (cement, sand, iron rods/steel, bricks, gravel/aggregate and similar, for farm structures such as boundary walls, sheds, godowns, tanks, farm ponds) **is a new top-level category**.
- A separate Vegetables produce category was discussed earlier. First check whether it already exists in V2. **Do not build it in this batch**, and do not duplicate it. Just report whether it exists.

### A1. Equipment sub-types

- Add two filterable sub-types to Equipment. Hindi-first labels, suggested wording (follow the style guide for the final text): "सब्ज़ी खेती के यंत्र" and "दुर्लभ / ज़रूरत पर मिलने वाले यंत्र".
- The Post form lets the seller tick one or both. Browse for Equipment gets filter chips for them. Listing card and detail show the tag.
- **Prefer no schema change.** If Equipment fields live in a JSONB or attributes column, store the sub-types there with no migration. Only write a migration if the existing design truly requires it. Reuse the existing field mechanism in `components/categories/equipment.jsx` (or its V2 equivalent) and the registry.
- Existing Equipment listings must keep working with no sub-type set.

### A2. Building materials category

- New category key (e.g. `building_materials`), Hindi label suggested "निर्माण सामग्री" with English "Building materials".
- Fields, in the same pattern as other categories: material type (cement, sand/रेत, iron rod/सरिया, bricks/ईंट, gravel/गिट्टी, other), brand or grade as free text, quantity, unit (bag, ton, trolley, piece, kg), seller's own rate, delivery available yes/no, pickup location. No platform price hints, no "market rate", no verification badges.
- Visibility radius: treat like `agri_inputs` (30 km default with the `wide_visibility` opt-in) unless the code gives a clear reason otherwise. Record what you chose.
- Add the category everywhere the others appear: catalog/registry, Post, Browse filters, Home category tiles, ListingCard, ListingDetail, My listings, the `/bazaar` hub, search index, sitemaps, i18n strings (Hindi and English), disclaimers if categories have per-category ones, voice-search category matching if it exists.
- **Compliance note on sand/gravel.** Sale of sand and aggregate is regulated. Include a short seller-responsibility line on the building-materials Post form and detail page ("बेचने वाले की ज़िम्मेदारी है कि वह वैध अनुमति के साथ बेचे / seller is responsible for selling with valid permissions"). Do not state any specific law, permit name, or rule unless you fetched an official MP government source and can quote it (Rule 8). If you cannot, keep the line generic. List the open legal question under "Decisions needed".
- Add one landing page under `/bazaar` in the same style as the six from Batch 4, for building materials, and one for vegetable-farming equipment. Hindi-first, no unsourced facts, internal links to Browse. Wire them into prerender routes, sitemaps and the search index. Listing pages themselves are not indexed (existing decision, do not change).

### A3. Migration (only if needed)

- Probably needed for `building_materials` if the category is stored under a CHECK constraint or enum or lookup table. Follow Rule 4 strictly. File name like `supabase/migrations/0053_building_materials_category.sql`.
- If the category list is only in code and not in the DB, write no migration and say so.
- Do not run it. Put the exact apply command in `BATCH5_RUN_ON_MAC.md`, using the same method earlier migrations were applied by (look in `docs/` and `README.md` for how 0038–0052 were applied).

### A4. Tests for Part A

- Update existing unit and audit tests whose expectations change (category counts, route counts, string audits).
- Add `e2e/batch5.spec.js`: post a building-materials listing, post an Equipment listing with each sub-type, filter by sub-type, view the landing pages. These need the migration and the deployed branch, so **do not run them here**. Mark clearly at the top of the file that they run only after the owner's local steps. Make sure the rest of the suite is unaffected.
- Run everything that can run here without `.env` or the database: lint, `npm run build`, the unit/audit tests, `v2_seo_audit`, `batch3_style`, `batch4_ui_style`. Try `npm run build:full` only if it works without Supabase variables (it uses Playwright prerender and may need the database; if it needs them, skip it). If Playwright's browser is missing and cannot be installed, do not fight it; record it and rely on the owner's local run.
- Write `docs/review/UI_STRINGS_BATCH5.md`: every new or changed Hindi and English UI string, as a table of key, Hindi, English, and the page it appears on.

**Commit Part A** to the branch (message like `Batch 5A: equipment sub-types + building materials category`).

---

## 3. Part B — More Q&As and sources

### Target

- **At least 25 new Q&As**, in the same JSON schema and tone as Batch 4 (study `docs/research/qa_raw/` and the generated content files first). Batch 4 ended with 61 new Q&As against an aim of 80. Adding 25 more takes the new-Q&A total past 80.
- You cannot query the database. Count from the repo content (the existing `qa_raw` files plus yours) and give the numbers in the report. The owner verifies the DB count after seeding.

### Sources

- Batch 4 used only the MP Agriculture Department. For this batch, **each new source must be a different official or academic publisher**, and at least **6 distinct publishers** must be used across the new Q&As. Good candidates (use only what you can actually fetch and quote): ICAR institutes (for example ICAR-Central Institute of Agricultural Engineering, Bhopal; ICAR-IISR Indore), JNKVV Jabalpur and Krishi Vigyan Kendra Sagar, National Horticulture Board, MP Horticulture / Udyan Vibhag, NABARD, Bureau of Indian Standards (for cement and steel bar quality marks), Soil Health Card portal, PM-KISAN and PMFBY portals, FAO, MP e-Uparjan or Mandi Board pages. Prefer `.gov.in`, `.nic.in`, `.ac.in`, `icar.org.in`, `bis.gov.in`, `fao.org`. No blogs, news sites, YouTube, or forums.
- For every source: add it to `docs/research/SOURCES.md` and regenerate `src/content/sources.js` the way the existing pipeline does it. Each Q&A carries `cites` pointing to it. Store the verbatim supporting quote in the research notes (same place and format Batch 4 used).
- **Network.** Fetching needs internet access. If you cannot reach external pages, do **not** write Q&As from memory. Write `BATCH5_BLOCKED.md` for Part B only, finish Part A, and report that Part B needs a re-run with network access.

### Citation and anti-hallucination protocol (mandatory)

1. **Snapshots.** For every page you use, save the fetched text to `docs/research/source_snapshots/<publisher>-<short-slug>.txt`. First line: `URL | fetched at (UTC) | page title`. Then the raw extracted text, unedited. For a PDF, extract the text of the pages you use. Never edit a snapshot to make a check pass.
2. **Every Q&A carries evidence.** Each Q&A record has `cites`, and each cite has: source id, exact URL, a `quote` (verbatim from the snapshot, at most 40 words, in the source's own language), and `claims` (every factual claim in the answer, each mapped to a quote). Any number, unit, date, scheme name, eligibility rule or amount in the answer must appear in a quote, or in a `derived` note that shows the arithmetic.
3. **No quote, no claim.** If you cannot find a supporting sentence, delete the claim. If a Q&A has no claims left, delete the Q&A. A short, fully-supported answer beats a long, partly-supported one.
4. **Automated checker.** Write `scripts/verify-batch5-citations.mjs`. For each Batch 5 Q&A it must check that: (a) every cite URL has a snapshot file; (b) the quote, after normalising whitespace, case, quotes and dashes, is an exact substring of that snapshot; (c) every number in the answer text (convert Devanagari digits to ASCII first) appears in the cited quotes or in a `derived` note; (d) the publisher's domain is on an allowed list (`.gov.in`, `.nic.in`, `.ac.in`, `icar.org.in`, `bis.gov.in`, `fao.org`, `nabard.org`); (e) the Q&A is not a duplicate of an existing question or slug. It prints a PASS/FAIL line per Q&A and **exits non-zero if anything fails**. Run it until it passes by fixing the Q&A, never by loosening the checker.
5. **Sceptic pass.** After authoring, reopen each snapshot and re-read each answer as a sceptic. In `docs/review/QA_BATCH5_FOR_REVIEW.md` give each Q&A a verdict: SUPPORTED, or PARTLY (then trim the unsupported part and re-check). Show the user-facing sources on each Q&A page using the existing `cites` display pattern from Batch 4.

### Topics (mix these, farmer-useful, short Hindi answers)

- Vegetable farming for MP: nursery and seedling basics, mulching, drip, staking, season calendar, post-harvest handling, only where a source supports the point.
- Equipment: choosing and hiring machinery, safe operation, maintenance, what to check before hiring rare machinery (ties to Part A).
- Farm structures and materials: checking cement and steel bar quality marks, storing cement, basic farm-pond or shed planning, only as sources support.
- Marketing and money: mandi basics, how crop insurance or subsidy applications generally work, only as sources support.
- No investment or legal advice. Soft-language only on anything regulatory.

### Pipeline

1. Author `docs/research/qa_raw/batch5.json` in the existing schema.
2. Run `node scripts/build-qa.mjs`. (It builds local content files and does not touch the database. If it turns out to need `.env` or write to Supabase, stop using it, and note that in the report.)
3. **Do not run `scripts/seed-sawaal.mjs`.** The owner runs it on his own computer.
4. Run the content tests: `v2_citation_audit`, `batch4_qa_facts`, `batch3_style`, `v2_seo_audit`, `v11_phase6`. Fix failures properly (never loosen a test just to pass). If a test hard-codes a Q&A count, update it to the new repo count and explain.
5. Write `docs/review/QA_BATCH5_FOR_REVIEW.md`: for each new Q&A, the question, the answer, the source, and the quote. Mark any Q&A where the source only partly supports it, and drop that Q&A rather than stretch it.

**Commit Part B** to the branch (`Batch 5B: N new Q&As from M new sources`).

---

## 4. Verification gate (all of this must pass before you write the report)

Write `scripts/verify-batch5.mjs` (plain Node, no new heavy dependencies). It runs the checks below, prints a PASS/FAIL table, and exits non-zero on any failure. Run it, plus `scripts/verify-batch5-citations.mjs` and the existing unit/audit/content tests. Paste the raw output into the report. **Never mark an item done unless a passing check covers it.** Anything that cannot be automated goes under "Manual checks for the owner".

**Part A checks**
- The `building_materials` key exists in the category catalog and registry, and every place that lists categories (Post, Browse filters, Home tiles, ListingCard, ListingDetail, My listings, `/bazaar`, search index, sitemaps, prerender routes) references it.
- Every new UI string exists in both Hindi and English, and none is empty or a placeholder. The existing style tests (`batch3_style`, `batch4_ui_style`) pass on the new strings.
- Equipment sub-type fields exist in the form, the filter chips and the listing display, and Equipment listings with no sub-type still render.
- Both new landing pages are in the prerender route list, the sitemap source and the search index.
- **Migration safety:** no `DROP`, `RENAME`, `TRUNCATE`, `DELETE`, `SET NOT NULL`, or any change that narrows an existing column or constraint. Every statement is guarded (`IF NOT EXISTS` or similar). Numbering continues from the last existing migration with no gaps or duplicates.
- **Scope guard:** `git diff --name-only main` shows no change to Land or Labor category files, the carbon page, Grievance Officer text, or any secret/`.env` file. List any other file touched outside the expected areas and justify it in the report.
- **Smoke render:** render the new building-materials form and the Equipment form in Hindi and English without errors. Use the repo's existing test setup if there is one. If there is none, use a small Node script with Vite's `ssrLoadModule`. Do not add heavy new tooling.
- **Test integrity:** `git diff main -- e2e tests` shows no test deleted, skipped or loosened. Any changed expectation has a one-line reason in the report.

**Part B checks**
- At least 25 new Q&As exist in `docs/research/qa_raw/batch5.json` and the built content, with no duplicates of the existing 119.
- At least 6 distinct publishers other than the MP Agriculture Department.
- `scripts/verify-batch5-citations.mjs` passes for every new Q&A.
- `node scripts/build-qa.mjs` and the content tests (`v2_citation_audit`, `batch4_qa_facts`, `v2_seo_audit`, `v11_phase6`) pass.

**Honesty rule.** If a check fails or a part is incomplete, say so plainly in the report. An honest partial report is far better than a false "done". Every "done" claim must point to a commit hash.

## 5. Finish

1. Make sure all work is committed on `codex/batch5-categories-qa` (Rule 1). Do not push to `main`.
2. Write `docs/review/BATCH5_RUN_ON_MAC.md`: exact copy-paste commands that work in zsh or Git Bash, to be run on the owner's computer that holds the `.env` file, in order:
   1. `git fetch && git checkout codex/batch5-categories-qa && git pull && npm ci` (use the branch name Codex actually produced if different)
   2. Apply migration(s) (only if you wrote any).
   3. `node --env-file=.env scripts/seed-sawaal.mjs` (and anything else the Q&A pipeline needs).
   4. `npm run build:full`, then the full test list including `e2e/batch5.spec.js`.
   5. Preview-only deploy: `npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview`. State clearly: **do not deploy until the owner finishes testing the current preview.**
   6. Rollback: how to undo the preview deploy and the migration if something is wrong.
3. Write `docs/review/BATCH5_REPORT.md` with exactly these sections (short, plain language):
   - **Done** (Part A, Part B; counts: new Q&As, distinct new publishers, new routes, new categories/sub-types)
   - **Not done / blocked and why**
   - **Old app and new categories** (Rule 5 finding)
   - **Tests**: baseline vs now; which could not run in the cloud sandbox
   - **Decisions needed** (radius choice, sand/gravel legal wording, anything unclear)
   - **Pages to look at on the preview after deploy** (list of routes for the owner to eyeball on desktop and phone)
   - **Verification output**: the raw output of `verify-batch5.mjs`, `verify-batch5-citations.mjs` and the test runs
   - **Citation ledger**: a table of every new Q&A with its publisher, URL, fetch date and verbatim quote
   - **Manual checks for the owner**: anything you could not automate
   - **Files to review**: `UI_STRINGS_BATCH5.md`, `QA_BATCH5_FOR_REVIEW.md`
4. Final commit of the docs. Report gate: do not write `BATCH5_REPORT.md` until both parts are done, or the blocked parts are written up in `BATCH5_BLOCKED.md`.
