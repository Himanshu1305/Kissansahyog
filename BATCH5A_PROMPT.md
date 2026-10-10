# BATCH 5A — New categories and equipment tags (LOCAL run on the owner's Windows laptop)

You are Codex, working unattended in the Kisan Sahyog repo on the owner's own laptop (React 19 + Vite 8 + Tailwind v4 + react-router 7, Supabase, Cloudflare Pages). The owner is a non-technical founder who reads only your final report, so write it plainly.

This is **PART A ONLY**: new marketplace categories and equipment tags. Do **not** do any Q&A work (that is finished on another branch). This work was already built once in a cloud sandbox that could not push, so you are rebuilding it locally from the spec below. Do not re-debate the decisions.

The branch must be `codex/batch5a-categories` (confirm with `git branch --show-current`; if it is not, write `docs/review/BATCH5A_BLOCKED.md` and stop). Keep `docs/review/BATCH5A_PROGRESS.md` as a checklist and tick items as you go. **If it already exists when you start, resume from the first unticked item** (a previous run may have stopped on a usage limit). Write `docs/review/BATCH5A_REPORT.md` only when the verification gate (Section 4) has genuinely run, or write up honestly what is incomplete.

---

## 0. Rules that override everything else

1. **Git is read-only for you** (`status`, `diff`, `log`, `show` only). Never run git add, commit, push, checkout, stash, fetch or pull. Leave all work uncommitted; the owner commits. The sandbox cannot write inside `.git`.
2. **No database, no deploy.** Never touch Supabase, wrangler or Cloudflare. Never run `scripts/seed*.mjs`, `scripts/db.mjs` or any script that writes to Supabase. **Never run Playwright E2E tests** (they create listings in the shared live database). Do not apply migrations; only write the migration file. Do not use any connector. If `.env` is missing or has no Supabase values, that is expected.
3. **Shared-database rule.** The old production app (commit `ba455ae`) uses the same database as this build, so migrations must be additive and must keep every value the old app uses. Allowed: new tables, new nullable columns, new indexes, new functions, and **widening a CHECK constraint**. Widening a CHECK needs a guarded `DROP CONSTRAINT` followed by re-adding the same-named constraint with the old values PLUS the new one; that single pattern is allowed only if the new list is a strict superset of the old list. Everything else that drops, renames, truncates, deletes, sets NOT NULL or narrows anything is forbidden. Make the migration idempotent (guarded `DO $$` blocks / `IF NOT EXISTS`) with a short rollback note in a comment at the top. Check the `supabase/migrations` folder for the real next number (expected 0053) and copy the pattern of how the `agri_inputs` and `jugaad` categories were added in migrations 0038–0052.
4. **Land and Labor categories, the carbon page, Grievance Officer text, `.env` files and secrets stay untouched.** Existing behavior stays unchanged: 30 km default visibility with the 30–50 km fallback, `wide_visibility` opt-in at 100 km, browse without login, login only for phone number / posting / My listings / Profile, `is_test_data` sample listings stay visible. Sellers enter their own details and rates. No platform price hints, no "market rate", no verification badges.
5. **Style.** Follow `docs/content/STYLE_GUIDE.md` exactly. Hindi-first, English second. Greeting "सीताराम 🙏, {name}" (never "जी"). Byline "Team Kissan Sahyog". No "under review" labels. No unsourced facts, numbers, laws, permit names or subsidy claims anywhere in new text. Keep wording generic where unsure.
6. **Hindi quality.** Write plain, natural Hindi a farmer in Sagar would say. Use Hindi words wherever one exists; keep English only for terms people really use in English (for example "cement", "GST", "WhatsApp"). Do not mix English words into Hindi sentences just because they are easier. List every new or changed Hindi string in `UI_STRINGS_BATCH5A.md` so the owner can read them.
7. **Non-interactive.** Do not ask questions. If a decision is needed, pick the safest option and record it under "Decisions needed" in the report. Only edit files inside this repo.
8. **Windows / sandbox failures.** If a command fails because of Windows or sandbox permissions (for example `npm ci`), record the exact error, do not work around it unsafely, and continue with what can run. `node_modules` may already exist because the owner ran `npm ci` beforehand.
9. **Real output only.** Capture real command output to files with the PowerShell-safe redirect (`*> file`) and record `$LASTEXITCODE`. Never report `exit=null`. Never delete, skip or loosen an existing test; any changed expectation needs a one-line reason in the report.

---

## 1. Setup

- Confirm these exist, else write `BATCH5A_BLOCKED.md` and stop: `PROJECT_CONTEXT.md`, `docs/content/STYLE_GUIDE.md`, `src/content/`, `supabase/migrations/`.
- Read: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `docs/content/STYLE_GUIDE.md`, `docs/review/BATCH4_REPORT.md`, the category code (`src/lib/listings/`, `src/components/categories/`), `src/lib/i18n/strings.js`, and migrations 0038–0052.
- **Baseline:** run only the unit, audit and content tests from `package.json` BEFORE changing anything (never E2E, never anything that needs the database). Save output to `docs/review/BATCH5A_BASELINE_OUTPUT.txt` and note which pass, which fail, and which need a database, `.env` or a prerendered build. Known from an earlier run: lint may be missing (ESLint not installed), one mela test and the UI-style git-baseline check can fail in a sandbox, and the SEO audit needs `npm run build:full`.
- Create `docs/review/BATCH5A_PROGRESS.md` from Sections 2–4.

---

## 2. What to build

**Decisions already made (do not re-debate):**

- Equipment for vegetable farming is NOT a new category: it is a **sub-type (tag) of Equipment**.
- Rare / hard-to-find / emergency machinery (for example pit-digging attachments, field cranes) is also a **sub-type (tag) of Equipment**. A listing can carry either tag or both.
- Building materials is a **new top-level category**.
- A separate Vegetables produce category was NOT built and must not be built. Just report whether it exists in V2.

### A1. Equipment tags

- Two filterable tags on Equipment. Hindi-first labels, suggested: "सब्ज़ी खेती के यंत्र" and "दुर्लभ / ज़रूरत पर मिलने वाले यंत्र" (follow the style guide for the final text).
- The Post form lets the seller tick one or both. Equipment Browse gets filter chips for them. Listing card and detail show the tag.
- **Prefer no schema change.** If Equipment fields live in a JSONB / attributes column, store the tags there. Only write a migration if the design truly requires it. Reuse the existing field mechanism in the Equipment category component and the registry. Existing Equipment listings with no tag must keep working.

### A2. Building materials category

- New category key `building_materials`, Hindi label "निर्माण सामग्री", English "Building materials".
- Fields, in the same pattern as the other categories: material type (cement, sand/रेत, iron rod/सरिया, bricks/ईंट, gravel/गिट्टी, other), brand or grade as free text, quantity, unit (bag, ton, trolley, piece, kg), seller's own rate, delivery available yes/no, pickup location.
- Visibility radius: same as `agri_inputs` (30 km default, `wide_visibility` opt-in). Record that you chose this.
- Add the category everywhere categories appear: catalog/registry, Post, Browse filters, Home category tiles, ListingCard, ListingDetail, My listings, the `/bazaar` hub, search index, sitemaps, prerender routes, i18n strings (Hindi and English), per-category disclaimers if they exist, voice-search category matching if it exists.
- **Sand/gravel compliance.** Put a short generic seller-responsibility line on the building-materials Post form and detail page: "बेचने वाले की ज़िम्मेदारी है कि वह ज़रूरी अनुमति के साथ बेचे / Seller is responsible for selling with the required permissions." Do not name any specific law, permit, authority or rule. List the open legal question under "Decisions needed".
- **Landing pages:** add `/bazaar/building-materials` and `/bazaar/vegetable-equipment` in the same style as the six Batch 4 `/bazaar` landing pages. Hindi-first, generic farmer guidance only, **no numbers, laws or facts that need a source**, with internal links to Browse. Wire them into prerender routes, sitemaps and the search index. Listing pages themselves stay not indexed (existing decision).

### A3. Migration

- Write `supabase/migrations/0053_building_materials_category.sql` (or the real next number) if `building_materials` is stored in a CHECK constraint, enum or lookup table; follow rule 3 strictly. If the category list is only in code, write none and say so. **Do not run it.**
- **Old-app safety:** run `git show ba455ae:src/lib/listings/catalog.js` and the old registry file. Already known: the old production app knows exactly 8 categories, `getCategory()` throws on an unknown category, the homepage renders every listing, and there is no error boundary, so one listing with an unknown category can blank the old homepage; greenhouse and jugaad (7 test rows) are already unknown to it. Confirm this from the old files and record it in the report under "Old app and new categories". It only matters if the old build is publicly served; the owner says production is not set up yet.

### A4. Tests

- Update existing unit/audit tests whose expectations legitimately change (category counts, route counts, string audits), each with a one-line reason. If an existing test hard-codes the number of filter chips or categories, update it and say why. Do not edit any test just to make it pass without a real reason.
- Add `e2e/batch5a.spec.js` (**do not run it**): post a building-materials listing, post an Equipment listing with each tag, filter by tag, open both landing pages. Put a comment at the top that it runs only after the owner applies the migration and deploys.
- Write `docs/review/UI_STRINGS_BATCH5A.md`: every new or changed Hindi and English string as a table (key, Hindi, English, page).

---

## 3. Smoke render

Render the building-materials form and the Equipment form in Hindi and English without errors, using the repo's existing test setup, or a small Node script with Vite's `ssrLoadModule`. No heavy new tooling. If it cannot run, record why. Also confirm an Equipment listing with no tag still renders.

---

## 4. Verification gate (must run for real before the report)

Write `scripts/verify-batch5a.mjs` (plain Node). It checks and prints PASS/FAIL, and exits non-zero on any FAIL:

- `building_materials` exists in catalog and registry and in every place that lists categories (Post, Browse filters, Home tiles, ListingCard, ListingDetail, My listings, `/bazaar`, search index, sitemaps, prerender routes).
- Every new UI string exists in Hindi and English, none empty or placeholder.
- Equipment tag fields exist in the form, filter chips and display.
- Both landing pages are in the prerender route list, sitemap source and search index.
- Migration safety: only the permitted patterns from rule 3; guarded; correct numbering with no gaps or duplicates; the widened CHECK list is a strict superset of the old list.
- Scope guard: `git diff --name-only` (and untracked files) shows no change to Land or Labor files, the carbon page, Grievance text, `.env` or secrets; list any other file touched outside the expected areas and justify it.
- Test integrity: no test deleted, skipped or loosened.

Run it, then the unit/audit/content tests that run without a database (`batch3_style`, `batch4_ui_style`, `v2_seo_audit`, `v11_phase6`, `v2_citation_audit` and any other), and `npm run build` (and `npm run build:full` only if it works without Supabase). Save raw outputs to `docs/review/BATCH5A_VERIFY_OUTPUT.txt` and `docs/review/BATCH5A_TEST_OUTPUT.txt`, with exit codes. Compare against the baseline. **Known pre-existing failures (record, do not fix):** `v11_phase6` hardcoded-Devanagari scan across many existing files; `v2_citation_audit` fails on Windows with Node 24 (absolute path ESM error). Report any NEW failure and fix it properly.

**Honesty rule.** If a check fails or something is incomplete, say so plainly. Every "done" claim must point to a file or output that proves it.

---

## 5. Finish

1. Write `docs/review/BATCH5A_RUN_LOCAL.md`: copy-paste commands for Git Bash on the computer that holds `.env`, in order: confirm branch, `npm ci`, apply the migration (look in `docs/` and `README.md` for how migrations 0038–0052 were applied and use the same method), `npm run build:full`, the tests, and a "do not deploy until reviewed" warning. Include rollback notes (how to undo the migration and the preview deploy).
2. Write `docs/review/BATCH5A_REPORT.md` with sections: **Done** (new category, tags, routes, files), **Not done and why**, **Old app and new categories**, **Tests** (baseline vs now, which could not run and why), **Decisions needed** (radius choice, sand/gravel legal wording, anything unclear), **Pages to look at after deploy** (routes to eyeball on desktop and phone), **Verification output**, **Files changed**, **Manual checks for the owner**.
3. In your final message list every new or changed file path, the verifier pass/fail counts, and any new test failure. Leave everything uncommitted.
