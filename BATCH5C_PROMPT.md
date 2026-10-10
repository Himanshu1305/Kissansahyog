# BATCH 5C — Repair and re-verify the Batch 5B Q&As (LOCAL run, Windows laptop)

You are Codex, working unattended in the Kisan Sahyog repo on the owner's laptop. The owner is a non-technical founder who reads only your final report, so write it plainly.

**Background.** Batch 5B produced 29 draft Q&As in `docs/research/qa_raw/batch5b.json` (generated into `src/content/qa/batch5b.js`), committed on this branch as `9fe73e8`. An independent review found real problems, and this batch fixes them:

1. The six PMFBY Q&As rest on a registration-form page whose field text does not exist in the page's static HTML (a plain fetch returns only metadata), and the status and loss-report answers came from a different PMFBY page than the one cited.
2. The four ICAR Q&As rest on a national 2021-22 Rabi advisory, not Madhya Pradesh. The snapshot file is named `icar-mp-kharif.txt`, because the real MP 2025 file failed on an expired site certificate and a different document was silently substituted.
3. The "snapshots" are short hand-selected extracts with placeholder timestamps (`00:00:00Z`), so the citation checker compared quotes against text that was written by the same run. A passing check proved nothing.
4. The checker held quotes per source, not per claim, so a claim was never tied to the sentence that supports it.
5. One-sentence sources were stretched into 3 to 6 Q&As each, which is padding.
6. The Batch 5B report's test output shows `exit=null` for every command, so no real test output was recorded.

**Goal:** a smaller, honest, fully verified set, **aiming for 25 Q&As from at least 6 publishers**. If you cannot verify 25, deliver fewer (never below what is genuinely verified) and say so plainly. Quality beats count.

This batch is Q&A content and its verification tooling only. Do not change app code, categories, routes, migrations, styles or the database.

---

## 0. Rules that override everything else

1. **Git.** The owner has this checked out on branch `codex/batch5b-qa`. Confirm with `git branch --show-current`; if it is not that branch, write `docs/review/BATCH5C_BLOCKED.md` and stop. The sandbox cannot write inside `.git`, so **do not run any git command that writes** (fetch, pull, checkout, add, commit, push, stash). Read-only `status`, `diff`, `log`, `show` are fine. Leave all work uncommitted; the owner commits.
2. **No database, no deploy.** Never run `scripts/seed-sawaal.mjs` or anything that writes to Supabase. No Playwright E2E, no `wrangler`, no connectors. If `.env` is missing, that is expected.
3. **Fetching rules (important).**
   - Fetch only with **Node's built-in `fetch`** from a script. `curl.exe` does not work in this sandbox (schannel credential error); do not use it.
   - **Never** disable certificate checks (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `--insecure`, custom agents that skip verification). If a site has an expired or invalid certificate, **skip that site** and log it.
   - **Do not use Codex's built-in web search or any cached index as a source of facts.** You may use search only to discover candidate URLs; every fact must come from a page fetched by the script in Section 2.
   - No proxies, mirrors, archive sites or cached copies.
   - Pages that need JavaScript to show their content (the static HTML lacks the text) are **not usable**. Do not reconstruct their text from anywhere else.
4. **Facts only from fetched text, quoted verbatim, mapped claim by claim.** Never write a fact from memory. Every number, unit, date, scheme name, eligibility rule, amount or standard number in an answer must appear in the quote that supports that specific claim. Facts must apply to Madhya Pradesh or the Sagar area, or be genuinely national (a central scheme or a BIS standard). Avoid anything out of date; prefer pages that state a current year or are standing reference pages.
5. **Style and brand.** Follow `docs/content/STYLE_GUIDE.md` and the Batch 4 Q&A depth and tone: Hindi-first, short, farmer-friendly, actionable (look at several Batch 4 answers and match their depth). Byline "Team Kissan Sahyog", no "under review" labels, no investment or legal advice, soft language on anything regulatory. A Q&A that is a bare list of form fields is not useful; skip those.
6. **Non-interactive.** Do not ask questions. Pick the safest option and record it under "Decisions needed". Only edit files in this repo.
7. **Resume.** Keep `docs/review/BATCH5C_PROGRESS.md` as a checklist and tick items as you go. If it exists when you start, resume from the first unticked item. Write `docs/review/BATCH5C_REPORT.md` only after the Section 5 gate has run for real, or if you honestly write up what is incomplete.
8. **Capture real test output.** Run commands so their full output lands in a file, for example in PowerShell: `node scripts/x.mjs *> docs/review/BATCH5C_VERIFY_OUTPUT.txt; "exit=$LASTEXITCODE" | Add-Content docs/review/BATCH5C_VERIFY_OUTPUT.txt`. In the report, paste the actual contents. `exit=null` or an empty output is never acceptable.

---

## 1. Setup

1. Confirm the branch (Rule 1). Do not run `npm ci` unless `node_modules` is missing (the Windows cache can block it).
2. Read `docs/content/STYLE_GUIDE.md`, `docs/review/BATCH5B_REPORT.md`, `docs/review/QA_BATCH5B_FOR_REVIEW.md`, `docs/research/qa_raw/batch5b.json`, `scripts/verify-batch5b-citations.mjs`, `scripts/build-qa.mjs`, `docs/research/SOURCES.md`, and a few Batch 4 Q&As for answer depth.
3. Record a baseline: run the Q&A content tests (`batch4_qa_facts`, `batch3_style`, `v11_phase6`, `v2_citation_audit`) with output captured to a file (Rule 8). Note which pass and which already fail (for example the existing hardcoded-Devanagari scan in `v11_phase6`, and the citation audit's Windows module-path problem on Node 24). Do not try to fix pre-existing failures, and do not worsen them.
4. Create `docs/review/BATCH5C_PROGRESS.md` from Sections 2 to 6.

---

## 2. Tooling (build this first)

**A. `scripts/lib/page-text.mjs`**: one shared function that turns a fetched body into text. HTML: strip scripts, styles and tags, decode entities, collapse whitespace. PDF: extract text with a tool that exists (try `pdftotext` or a package already in `node_modules`; if no extractor is available, do not use PDFs, and say so in the report). Never hand-type or hand-trim page text.

**B. `scripts/fetch-snapshot.mjs <url> <slug>`**: fetches the URL with Node `fetch` (generous timeout, one retry, a plain descriptive User-Agent), requires HTTP 200, and writes `docs/research/source_snapshots/<host>-<slug>.txt` as:

- line 1: `URL | HTTP status | fetched at <real UTC time> | sha256 of raw body | page title`
- then the **entire** extracted page text from `page-text.mjs`, not a selection.

It appends a row to `docs/research/BATCH5C_FETCH_LOG.md` for every attempt, success or failure (URL, status, error text, bytes, characters). If the extracted text is under about 600 characters, or looks like a JavaScript shell, mark the attempt **unusable** in the log and do not use that page.

**C. Rebuild the evidence model.** The evidence for each Q&A lives in a sidecar `docs/research/qa_raw/batch5b.evidence.json`, shaped as `{ "<slug>": [ { "item": <index of the answer item or "short">, "claim": "...", "source": "<source id>", "quote": "<verbatim, at most 40 words>", "derived": "<arithmetic, only if a number is not literally in the quote>" } ] }`. Every answer item (each bullet, and the short answer) must have at least one evidence row. If `build-qa.mjs` rejects extra fields in the raw file, leave them out of the raw file and keep them only in the sidecar.

**D. Rewrite `scripts/verify-batch5b-citations.mjs`.** It exits non-zero on any failure, prints PASS or FAIL per Q&A and a summary, and checks:
1. every cited source URL has a snapshot made by `fetch-snapshot.mjs` (the header must have a real fetched time, not `00:00:00`, and an HTTP 200 status);
2. every evidence quote, after normalising whitespace, case, quotes and dashes, is an exact substring of the **full** snapshot text;
3. **per item:** every number in an answer item (Devanagari digits converted to ASCII) appears in that item's own evidence quotes or its `derived` note;
4. **no padding:** no evidence quote is used by more than one Q&A, and no single source page supports more than 3 Q&As;
5. publisher domain is on the allowed list (`.gov.in`, `.nic.in`, `.ac.in`, `icar.org.in`, `bis.gov.in`, `fao.org`, `nabard.org`) and is **not** the MP Agriculture Department;
6. question and slug are not duplicates of any existing Q&A;
7. overall: at least 6 distinct publishers, and the Q&A count is printed (the 25 target is a goal, not an automatic pass).

**With `--live`**, it also **re-fetches every cited URL fresh** with Node `fetch` using `page-text.mjs`, and confirms each evidence quote is still present in the live text. Any URL that cannot be re-fetched, or whose quote is missing from the live text, fails every Q&A that depends on it. This is the independent check that stops hand-written snapshots from passing.

---

## 3. Triage the 29 existing Q&As

Make a table (slug, decision, reason) in the report. Rules:

- **Drop all 6 PMFBY Q&As** (`pmfby-*`) unless a static page that genuinely contains the needed text passes the live check. Do not reuse the registration-form page.
- **Drop all 4 ICAR Q&As** unless you re-source them from a Madhya Pradesh specific or still-current ICAR/JNKVV/KVK page fetched by the script. Delete `icar-mp-kharif.txt` either way (its name is wrong), and do not leave orphan sources.
- **Re-fetch and re-verify** the National Horticulture Board (tomato), BIS (ISI mark, complaint categories), FAO and PM-KISAN sources with the new script, quoting per claim. Keep a Q&A only if it passes the live check.
- **Merge or drop padding.** The FAO page supports one distinct point; keep at most 1 or 2 FAO Q&As. Where several Q&As rest on the same one or two sentences, keep the best one and drop the rest.
- A kept Q&A may need its answer rewritten so that each answer item matches its own quote; do that rather than keeping unsupported wording.

---

## 4. New Q&As to reach the target

- Find new **static, official, current** pages (use search only to discover URLs, then fetch with the script). Good candidates, only if they pass: ICAR institutes (ICAR-IISR Indore for soybean; ICAR-CIAE Bhopal for machinery), JNKVV Jabalpur, KVK Sagar, other National Horticulture Board crop pages (for example onion, chilli, potato), BIS pages on cement and steel bar marks, the Soil Health Card portal, eNAM, PM-KUSUM, Kisan Credit Card information pages, NABARD, MP Horticulture, the MP Mandi Board. Sites with expired certificates or robots/JS-only content are skipped and logged.
- Topics, only where a source supports them: vegetable farming for MP; choosing, hiring and safely using farm machinery; farm structures and materials (cement and steel bar quality marks, storage); mandi basics; how schemes or credit or insurance generally work.
- Use at least **6 distinct publishers** overall across kept and new Q&As. Each new Q&A needs its own distinct fact and distinct evidence quotes.
- Add or update each source in `docs/research/SOURCES.md`, regenerate content with `node scripts/build-qa.mjs`, and regenerate `src/content/sources.js` through the existing pipeline. `build-qa.mjs` builds local files and does not touch the database; if it needs `.env` or writes to Supabase, stop using it and say so. Make sure dropped Q&As are really gone from `src/content/qa/batch5b.js`.

---

## 5. Verification gate (must run for real before the report)

1. `node scripts/verify-batch5b-citations.mjs` and then `node scripts/verify-batch5b-citations.mjs --live`, both with output captured to files (Rule 8). Both must pass for every Q&A you keep. Fix the Q&A, never loosen the checker.
2. Re-run the content tests from Section 1 with output captured. Compare with the baseline: no new failures. If a test hard-codes a Q&A count, update it to the new repo count and explain. Never delete, skip or loosen a test.
3. **Sceptic pass.** Reopen each full snapshot and re-read each answer item against its own quote. In `docs/review/QA_BATCH5B_FOR_REVIEW.md` (rewrite it) list for each kept Q&A: question, answer, publisher, URL, fetched-at time, per-item quote, and a verdict SUPPORTED or PARTLY. Trim PARTLY items and re-check.
4. `git status` and `git diff main --stat` must show only: Q&A and source files, snapshots, the new scripts, generated content files, doc files and any count updates in tests.

---

## 6. Finish

1. Do not commit or push (Rule 1). List every new, changed and deleted file in the report.
2. Update `docs/review/BATCH5B_RUN_LOCAL.md` if the commands or the Q&A count changed. It must give copy-paste commands for Git Bash on the computer that holds `.env`: pull the branch, `node --env-file=.env scripts/seed-sawaal.mjs`, `npm run build:full`, the content tests, the command to read the published Q&A count back, and a rollback that unpublishes only the Batch 5B Q&As. State clearly: **do not seed or deploy until the owner has reviewed `QA_BATCH5B_FOR_REVIEW.md`.**
3. Write `docs/review/BATCH5C_REPORT.md` with exactly these sections, short and plain:
   - **Result** (final Q&A count, distinct publishers, how many dropped, how many new, honest statement of whether the 25 target was met)
   - **Triage table** (all 29 old slugs)
   - **What could not be done and why** (sites skipped for certificates, JavaScript-only pages, missing PDF extractor, anything else)
   - **Fetch log summary** (counts of usable and unusable attempts; the full log is in `BATCH5C_FETCH_LOG.md`)
   - **Verification output** (the real captured contents of the normal run, the `--live` run and the test runs, with exit codes)
   - **Citation ledger** (table: Q&A id, publisher, URL, fetched-at, one verbatim quote per answer item)
   - **Decisions needed**
   - **Manual checks for the owner** (Hindi read-through, seed, DB count, spot-check three Q&A pages on staging after deploy)
