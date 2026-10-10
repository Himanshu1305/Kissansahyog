# BATCH 5B — More Q&As from new sources (LOCAL run on the owner's Windows laptop)

You are Codex, working unattended in the Kisan Sahyog repo on the owner's own laptop (React/Vite app, Supabase, Cloudflare Pages). The owner is a non-technical founder who reads only your final report, so write it plainly.

**Goal:** add **at least 25 new Kisan Sawaal Q&As**, each backed by a verbatim quote from an official or academic source that is **not** the MP Agriculture Department, using **at least 6 different publishers**. Batch 4 added 61 new Q&As against an aim of 80. Adding 25 more takes the total past 80.

This batch is Q&A content only. Do not change app code, categories, routes, migrations or styles.

---

## 0. Rules that override everything else

1. **Branch only.** `git fetch origin`, `git checkout main`, `git pull origin main`, then `git checkout -b codex/batch5b-qa`. Never commit to `main`. Never merge. After finishing you may try one `git push -u origin codex/batch5b-qa`; if it fails, leave the commits local and say so.
2. **No database, no deploy.** You have no Supabase key and must not look for one. If `.env` is missing, that is expected. Do **not** run `scripts/seed-sawaal.mjs` or any script that writes to Supabase. Do **not** run Playwright E2E tests. Do **not** run `wrangler` or touch Cloudflare. Do not use any connector.
3. **Facts only from pages you fetched in this run and quoted verbatim.** Never write a fact from memory. Every number, unit, date, scheme name, eligibility rule, amount or standard number in an answer must appear in a verbatim quote or in a `derived` note that shows the arithmetic. Facts must apply to Madhya Pradesh or the Sagar area, not another state.
4. **If you cannot fetch, stop; do not work around it.** No proxies, mirrors, cached copies or archive sites. If every fetch fails with an error like "Operation not permitted", write `docs/review/BATCH5B_BLOCKED.md` stating that **network access is not enabled for this Codex run** and what the owner must switch on, then stop at once.
5. **Style and brand.** Follow `docs/content/STYLE_GUIDE.md` and the Batch 4 Q&A tone exactly: Hindi-first, short, farmer-friendly, byline "Team Kissan Sahyog", no "under review" labels. No investment or legal advice; use soft language on anything regulatory.
6. **Non-interactive.** Do not ask questions. If a decision is needed, pick the safest option and record it under "Decisions needed". Only edit files in this repo.
7. **Resume.** Keep `docs/review/BATCH5B_PROGRESS.md` as a checklist and tick items as you go. If it exists when you start, resume from the first unticked item. Write `docs/review/BATCH5B_REPORT.md` only when the verification gate (Section 4) is passed or the shortfall is honestly written up.

---

## 1. Setup

1. After the branch is created, run `npm ci`.
2. Confirm these exist, or write `BATCH5B_BLOCKED.md` and stop: `docs/review/BATCH4_REPORT.md`, `docs/content/STYLE_GUIDE.md`, `docs/research/SOURCES.md`, `scripts/build-qa.mjs`, `src/content/`.
3. Read: `PROJECT_CONTEXT.md`, `docs/content/STYLE_GUIDE.md`, `docs/review/BATCH4_REPORT.md`, `docs/research/SOURCES.md`, `docs/research/qa_raw/` (study the Batch 4 files for the exact JSON schema), `scripts/build-qa.mjs`, and the content tests.
4. Record the baseline: run the Q&A-related tests from `package.json` (`v2_citation_audit`, `batch4_qa_facts`, `batch3_style`, `v11_phase6`) and note which pass. Note which cannot run without the database or a prerendered build.
5. Create `docs/review/BATCH5B_PROGRESS.md` from Sections 2–4.

**Network preflight (do this before any research).** Fetch the home page of `icar.org.in`, `nhb.gov.in`, `bis.gov.in` and `nabard.org` using Node's `fetch` or `curl.exe`, and record each status code. If all fail, follow Rule 4. If some work, continue. Government sites can be slow, so allow a generous timeout and one retry per URL.

**Owner-supplied fallback.** If a folder `docs/research/manual_sources/` exists, treat the files in it as additional snapshots. Each file's original URL is listed in `docs/research/manual_sources/INDEX.md`. Use them the same way as fetched pages.

---

## 2. Sources and snapshots

- Each Q&A must cite a different **publisher** from the MP Agriculture Department. At least **6 distinct publishers** overall. Allowed domains only: `.gov.in`, `.nic.in`, `.ac.in`, `icar.org.in`, `bis.gov.in`, `fao.org`, `nabard.org`. Good candidates (use only what you actually fetch and can quote): ICAR institutes (for example ICAR-CIAE Bhopal for machinery, ICAR-IISR Indore for soybean), JNKVV Jabalpur and the Krishi Vigyan Kendra for Sagar, the National Horticulture Board, MP Horticulture (Udyan) department, NABARD, the Bureau of Indian Standards for cement and steel quality marks, the Soil Health Card, PM-KISAN and PMFBY portals, FAO. No blogs, news sites, YouTube, social media or forums.
- **Snapshots.** For every page you use, save the extracted text to `docs/research/source_snapshots/<publisher>-<short-slug>.txt`. First line: `URL | fetched at (UTC) | page title`. Then the raw text, unedited. For a PDF, extract the text of the pages you use. Never edit a snapshot to make a check pass.
- Add each source to `docs/research/SOURCES.md` and regenerate `src/content/sources.js` the way the existing pipeline does it.

---

## 3. Q&As

**Topics** (a mix, short Hindi answers, only where a source supports the point): vegetable farming for MP (nursery and seedlings, mulching, drip, staking, season calendar, post-harvest handling); choosing, hiring and safely using farm machinery, including what to check before hiring rare machinery; farm structures and materials (checking cement and steel bar quality marks, storing cement, basic farm-pond or shed planning); mandi basics; how crop insurance or subsidy applications generally work.

**Evidence protocol (mandatory).**
1. Author `docs/research/qa_raw/batch5b.json` in the exact schema Batch 4 used.
2. Each Q&A needs `cites` with source id, exact URL, a verbatim `quote` (at most 40 words, in the source's own language) and `claims` (every factual claim in the answer, each mapped to a quote). If `build-qa.mjs` rejects extra fields, keep the evidence in a sidecar file `docs/research/qa_raw/batch5b.evidence.json` keyed by Q&A id instead. Do not change the pipeline.
3. **No quote, no claim.** If you cannot find a supporting sentence, delete the claim. If a Q&A has no claims left, delete the Q&A. A short fully-supported answer beats a long partly-supported one.
4. Run `node scripts/build-qa.mjs`. It builds local content files and does not touch the database. If it needs `.env` or writes to Supabase, stop using it and say so in the report.
5. **Sceptic pass.** Reopen each snapshot and re-read each answer as a sceptic. In `docs/review/QA_BATCH5B_FOR_REVIEW.md` give each Q&A: question, answer, publisher, URL, quote, and a verdict SUPPORTED or PARTLY. Trim every PARTLY claim and re-check. Show the user-facing sources using the existing `cites` display pattern from Batch 4.

---

## 4. Verification gate (must pass before the report)

Write `scripts/verify-batch5b-citations.mjs` (plain Node, no new dependencies). For each Batch 5B Q&A it must check:
- (a) every cited URL has a snapshot file (or a manual-source entry);
- (b) the quote, after normalising whitespace, case, quotes and dashes, is an exact substring of that snapshot;
- (c) every number in the answer text (convert Devanagari digits to ASCII first) appears in the cited quotes or in a `derived` note;
- (d) the publisher's domain is on the allowed list and is **not** the MP Agriculture Department;
- (e) the question and slug are not duplicates of the existing Q&As;
- (f) at least 25 Q&As and at least 6 distinct publishers overall.

It prints a PASS or FAIL line per Q&A and a summary table, and **exits non-zero if anything fails**. Fix the Q&A, never loosen the checker.

Then run the content tests from Section 1 again. Fix real failures. If a test hard-codes a Q&A count, update it to the new repo count and explain in the report. `v2_seo_audit` may fail only because it needs a prerendered build (`npm run build:full`); if so, try `npm run build:full`, and if it needs Supabase variables, skip it and record that. Never delete, skip or loosen a test. `git diff main` must show only: new Q&A and source files, the snapshots, the two scripts' files, generated content files, doc files and any count updates in tests.

**Honesty rule.** If you reach fewer than 25 verified Q&As or 6 publishers, say so plainly. A smaller, fully verified set is better than padding. Every "done" claim must point to a commit hash.

---

## 5. Finish

1. Commit in logical steps (sources and snapshots; Q&As and content; scripts and docs). Try one push of `codex/batch5b-qa` (Rule 1).
2. Write `docs/review/BATCH5B_RUN_LOCAL.md`: copy-paste commands that work in Git Bash, for the owner to run on the computer that holds `.env`: pull the branch, `npm ci`, `node --env-file=.env scripts/seed-sawaal.mjs`, `npm run build:full`, the content tests, and how to read the Q&A count back from the database. Work out how the staging site is deployed from `README.md` and `docs/`, and state the command. Say clearly: **do not deploy until the owner has reviewed `QA_BATCH5B_FOR_REVIEW.md`.** Include how to roll back by unpublishing only these Q&As.
3. Write `docs/review/BATCH5B_REPORT.md` with exactly these sections, short and plain:
   - **Done** (new Q&A count, distinct publishers, total new since Batch 4 = 61 + this batch)
   - **Not done and why**
   - **Verification output** (raw output of `verify-batch5b-citations.mjs` and the test runs)
   - **Citation ledger** (table: Q&A id, publisher, URL, fetch date, verbatim quote)
   - **Decisions needed**
   - **Manual checks for the owner** (Hindi read-through of `QA_BATCH5B_FOR_REVIEW.md`, seed, DB count, spot-check three pages on staging after deploy)
