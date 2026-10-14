# Batch 9 — Phase 0: preflight and safety

Recorded 2026-10-15 (night run). Branch `android-app`. Decisions: `docs/review/batch9/DECISIONS.md`.

## 0.1 Git state at the start

Full output: `docs/review/batch9/evidence/p0-git-state.txt`.

| Item | Value |
|---|---|
| Branch | `android-app`, up to date with `origin/android-app` |
| HEAD at start | `2bf9aef` Batch 8B: docs — preflight, README, report, results, staging test data |
| Local branches | android-app, main, staging, integration/batch5-test, codex/batch5a-categories, codex/batch5b-qa, codex/batch6a-fixes, codex/batch6b-post, codex/batch6c-content, codex/batch6d-sitewide, codex/batch6g-founder (all also on origin) |
| `pre-*` tags before tonight | `pre-7l1`, `pre-7l2`, `pre-7l2-ship` |
| Working tree | 16 modified `docs/review/batch7l1/*.png`, modified `public/search-index.json`, untracked `BATCH9_OVERNIGHT_PROMPT.md`, `docs/review/ADMIN_ACCESS_DIAGNOSIS.md`, `docs/review/BATCH7J_REPORT.md`, 29 `docs/review/batch7l2/*.png` |

Last 15 commits: 2bf9aef, f3eac12, 1139c7f, b66525d, 2c95478 (8B) · d165fbb, fa948e4, d92bcb0, f29a1f4 (8A) ·
206cd86 (7L-2) · ebad4be (7L-1) · c11bba4 (7J) · c4a136f, 7d1a309 (7A–7I) · 82bce14 (founder page).

## 0.2 How the two sites are deployed (from evidence, not guesses)

**Cloudflare Pages projects** (`npx wrangler pages project list`, read-only; saved in
`evidence/p0-pages-projects.txt`):

| Project | Domains | Git provider |
|---|---|---|
| `kissansahyog-prod` | kissansahyog-prod.pages.dev, **kissansahyog.com**, www.kissansahyog.com | **No** (Direct Upload) |
| `kissansahyog` | kissansahyog.pages.dev, **staging.kissansahyog.com** | **No** (Direct Upload) |

Neither project is connected to GitHub, so **pushing a branch deploys nothing**. Both sites change
only when someone runs `wrangler pages deploy` from this PC.

### Production (kissansahyog.com)

`~/ship-prod.sh` (37 lines, read in full; NOT run):

- line 7: `[ "$(git branch --show-current)" = "staging" ] || { echo "STOP: not on the staging branch"; exit 1; }` — prod ships **from the `staging` git branch**.
- line 11: `git add -A -- . ':!public/search-index.json'` — stages everything (this is why Hard rule 4 forbids running it tonight).
- line 23: `git push -q origin staging`
- line 25: `npm run build:prod` — `package.json`: runs `scripts/check-prod-env.mjs` (env guard), search index, `vite build --mode production`, prerender, sitemaps, then `check-prod-env.mjs --dist`, all with `--env-file=.env.production`.
- line 27: `npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true` — **Direct Upload; `--branch main` = the project's production branch, so it goes live at once.**
- lines 30–32: curl check of `/`, `/about/`, `/how-to-use/`, `/founder/`, `/grievance/`, `/sawaal/` on https://kissansahyog.com.

Related scripts in `~`: `deploy-prod.sh` (line 41, same deploy command, also sets the
`GEMINI_API_KEY` Pages secret), `deploy-prod-finish.sh` (line 23, same deploy command),
`preview-prod.sh` (line 8: `npx wrangler pages deploy dist --project-name kissansahyog-prod --branch preview --commit-dirty=true` → https://preview.kissansahyog-prod.pages.dev; its line 16 warns "the preview uses the real production database").

Deployment history (`wrangler pages deployment list --project-name kissansahyog-prod`, read-only,
`evidence/p0-pages-deployments.txt`): current Production deployment `7aebf863` from source
`206cd86` (7L-2) on branch `main`, 1 day ago; earlier Production `486ea700` from `ebad4be`
(7L-1); previews from `ebad4be` and `c11bba4`. 7J report line 9 confirms the same pattern
("Deployment: https://68b806e2.kissansahyog-prod.pages.dev", "commit c11bba4 on staging").

### Staging (staging.kissansahyog.com)

There is **no ship script for staging**. Evidence for the command used:

- `docs/review/V2_FINAL_REPORT.md:18` and `:93`: `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog`
- `docs/review/BATCH4_PROGRESS.md:19`: preview variant `… --project-name kissansahyog --branch v2-preview`
- `package.json` `build:full` = search index + `vite build --mode staging` + prerender + sitemaps, with `--env-file=.env` (the **staging** Supabase project, per `docs/review/batch8b/PREFLIGHT.md` "Which env file is which").

Deployment history (`wrangler pages deployment list --project-name kissansahyog`): current
Production deployment `6574f68b`, source `3c1b4e0` (Batch 6G, 11 Oct), branch `main`, **3 days
ago** — i.e. staging.kissansahyog.com is currently **behind** prod (it does not have 7A–7L-2 or
the 8A/8B server files: `functions/_middleware.js` CORS, `public/_routes.json`). Without
`--branch`, wrangler uses the current git branch name; the last staging production deploy was
recorded with branch `main`. **Phase 4 should pass `--branch main` explicitly** so the upload is
the project's production deployment (the one behind staging.kissansahyog.com) regardless of the
local branch name.

### Rollback today

- **No rollback script exists** (searched `~/*.sh`, `scripts/`, `docs/`).
- What is available, with evidence:
  1. Cloudflare Pages keeps every earlier deployment (see the deployment lists above: e.g. prod
     `486ea700` = 7L-1, `7aebf863` = 7L-2). Rolling back = making an older deployment the
     production one again (Cloudflare dashboard "Rollback", or Pages API), or re-uploading an
     older build.
  2. Re-build from a safety tag: tags `pre-7l1`, `pre-7l2`, `pre-7l2-ship` (= `ebad4be`) and now
     `pre-9-start` (= `2bf9aef`) mark known states; check out the tag, run `npm run build:prod`
     and the same `wrangler pages deploy` line.
  3. Docs: `docs/review/BATCH5A_RUN_LOCAL.md:36` — "Preview rollback: redeploy the previously
     reviewed preview build." Database changes are rolled back with the "Rollback note" in each
     migration header (e.g. BATCH7L1_REPORT.md:208, BATCH7L2_REPORT.md:105) — not relevant
     tonight (no migrations).
- Phase 4.5 must therefore write the rollback step itself (record the current prod deployment id
  `7aebf863` before shipping, and use the Pages rollback for it).

## 0.3 Baseline of the website tests (current `android-app`, before any Batch 9 change)

All logs: `docs/review/batch9/evidence/baseline/` (`summary.tsv`, `logs/*.log`, `build-full.log`,
`lint.log`, copies of the rewritten `VERIFY_OUTPUT-*.txt`). Each script ran with
`node --env-file=.env` (staging env) and a 300 s timeout. **Later gates = no NEW failure versus
this table.**

### Build and tooling

| Check | Status | Detail |
|---|---|---|
| `npm run build:full` (staging) | RAN-PASSED | 263/263 routes prerendered, 1 via fallback (`/`), 0 failed; 4 m 20 s |
| `npm run lint` | RAN-FAILED (pre-existing) | `'eslint' is not recognized` — ESLint is not a dependency and there is no config |
| `npm test` | not a test | placeholder `echo "Error: no test specified" && exit 1` |

### Scripts that ran

| Script | Status | Pass / Fail lines | Known failure(s) |
|---|---|---|---|
| test/batch2_fasal | RAN-PASSED | 14 / 0 | |
| test/batch2_layout | RAN-PASSED | 1 / 0 | |
| test/batch3_style | **RAN-FAILED** | 1 / 1 | "no avoid-list word in Hindi content" |
| test/batch4_bazaar | RAN-PASSED | 74 / 0 | |
| test/batch4_qa_facts | RAN-PASSED | 61 / 0 | |
| test/batch4_ui_style | **RAN-FAILED** | 2 / 2 | Hindi string `loc_card_text` 30 words; "no existing key removed" (tab_phone, tab_email, … removed in 7L-1/7L-2) |
| test/batch4_voice | **RAN-FAILED** | crash | `ERR_MODULE_NOT_FOUND …src\lib\apiBase` (8A import without `.js`, plain node cannot resolve it; Vite can) |
| test/p_0028_location_naming | RAN-PASSED | 21 / 0 | |
| test/p_community | RAN-PASSED | 46 / 0 | |
| test/p_mandi_labeling | RAN-PASSED | 9 / 0 | |
| test/p_mela_dedup | RAN-PASSED | 49 / 0 | |
| test/p_mela_digest | RAN-PASSED | 12 / 0 | |
| test/p_mela_format | RAN-PASSED | 14 / 0 | |
| test/p_mela_pipeline | RAN-PASSED | 25 / 0 | |
| test/p_mela_rearch | RAN-PASSED | 64 / 0 | |
| test/p_rain_alert | RAN-PASSED | 10 / 0 | |
| test/phase8 | RAN-PASSED | 21 / 0 | PWA / bundle budget |
| test/v11_phase2 | RAN-PASSED | 11 / 0 | anon read-only |
| test/v11_phase6 | **RAN-FAILED** | 29 / 3 | `listingConsents` disclaimer lacks hi+en; keys tab_phone/tab_email gone; Devanagari check (Windows `\` path bug, known from 8B — real offenders PromoBento.jsx, termsContent.js, places.js, melaFormat.js) |
| test/v2_brand | **RAN-FAILED** | 12 / 1 | single-s "Kisan Sahyog" in `src/lib/i18n/disclaimers.js:9,10,…` |
| test/v2_citation_audit | **RAN-FAILED** | crash | `ERR_UNSUPPORTED_ESM_URL_SCHEME` (Windows `c:` path import) |
| test/v2_link_check | RAN-PASSED (informational) | exit 0 | 155 reachable, 18 dead external source links (reported, not failed) |
| test/v2_phase14 | RAN-PASSED | 22 / 0 | |
| test/v2_seo_audit | RAN-PASSED | 2 / 0 | |
| test/_factscan | n/a | exit 0 | dev helper, prints usage — not a test |
| verify-batch5a | RAN-PASSED | 48 / 0 | |
| verify-batch5b-citations | **RAN-FAILED** | 0 / 17 | "no evidence for block:N" on all 17 Q&As (live citation check) |
| verify-batch6a | RAN-PASSED | 21 / 0 | |
| verify-batch6b | RAN-PASSED | 11 / 0 | |
| verify-batch6c | RAN-PASSED | 1 / 0 | |
| verify-batch6d | RAN-PASSED | 18 / 0 | |
| verify-batch6g | RAN-PASSED | 49 / 0 | |
| verify-batch7a | **RAN-FAILED** | 74 / 2 | 7H: "header is still sticky … hamburger below lg"; "prerendered header is one bar with the nav inside it" (8B moved the header/banner) |
| verify-batch7b | **RAN-FAILED** | 86 / 2 | "function file is functions/api/feedback.js → /api/feedback, same convention as /transcribe"; "the form posts only to /api/feedback" (8A `apiUrl()` change) |
| verify-batch7c | RAN-PASSED | 58 / 0 | |
| verify-batch7d | **RAN-FAILED** | 77 / 1 | built `mausam/index.html` contains "pilot"/"पायलट" |
| verify-batch7l1 | **RAN-FAILED** | 53 / 1 | "no new external host — … Pages Functions unchanged" → `functions/_middleware.js` (8A CORS middleware) |
| verify-batch7l2 | RAN-PASSED | 59 / 0 | |

**Baseline totals:** 27 RAN-PASSED (26 scripts + the build), 12 RAN-FAILED (11 scripts + lint), 1 helper n/a,
all failures pre-existing on `2bf9aef`.

### Scripts NOT-RUN (reason: they write to the staging database or need a live dev server)

- `e2e/*.spec.js` (22 Playwright specs, `npm run test:e2e`) — write temporary records; 7L-2 report
  note 9 says they are out of date.
- 45 `scripts/test/*` scripts that import the service-role `adminClient` / sign-up helpers from
  `e2e/support.js`: batch1_categories, batch1_item0, batch2_coldstorage, batch2_jugaad,
  batch2_sawaal, batch4_wide_visibility, p3_drone_didi, p3_phase2, p3_phase3, p3_phase4, p3_phase7,
  p3_resources, p3_vendor, p3_warehouse, p_0025_visibility, p_0026_location_compare,
  p_0027_weather_split, p_0029_village_geocoding, p_0031_land_acreage,
  p_0032_legal_availability_profile, p_mela_backend, p_transport, phase1, phase2, phase3, phase4,
  phase5, phase6, phase9, v11_homepage, v11_phase1, v11_phase3, v11_phase4, v11_phase5, v11_phase7,
  v2_phase4 … v2_phase13.
- `verify-batch7l2-stageb.mjs` (creates/deletes staging accounts), `verify-batch7l1-db.mjs`
  (can query production).

See DECISIONS.md entries 4–5.

## 0.4 Leftover files

Commit `e9f7177` "chore: leftover review artefacts (no code)" — 47 files, explicit paths:
`docs/review/ADMIN_ACCESS_DIAGNOSIS.md`, `docs/review/BATCH7J_REPORT.md`, the 16 modified
`docs/review/batch7l1/*.png`, the 29 untracked `docs/review/batch7l2/*.png`. Largest file 0.37 MB
(nothing over 5 MB). Checked before commit: no `.env*`, `.dev.vars`, keystore, `*.apk`, `*.aab`.

**Skipped (listed as required):**

| File | Why |
|---|---|
| `public/search-index.json` (modified, 0.32 MB) | build output, rewritten by every build — not evidence |
| `BATCH9_OVERNIGHT_PROMPT.md` | instruction file, not a review artefact — committed with the Phase 0 outputs instead (DECISIONS.md 2) |

## 0.5 Safety tag

`pre-9-start` → `2bf9aef` (HEAD at the start of Phase 0), pushed:
`git ls-remote --tags origin pre-9-start` → `2bf9aefc9a4b… refs/tags/pre-9-start`.

## 0.6 Emulator health

| Step | Result |
|---|---|
| `adb devices` at start | `emulator-5554 device` (sdk_gphone64_x86_64), already running, uptime 2 h 37 m (`evidence/p0-adb-devices-before.txt`) |
| `avd-setup.sh` on the running emulator | took 824 s, then "WARNING — the emulator has no working internet after 3 minutes" (`evidence/p0-avd-setup.txt`); `ping dns.google` → unknown host; the PC itself was online |
| Reboot 1 (`avd-setup.sh --stop` + `avd-setup.sh`) | cold boot in 67 s, "emulator internet OK (DNS + reachability)" (`evidence/p0-avd-reboot1.txt`) |
| Smoke 1: `run-tests.mjs --skip-build --only T2,T4` (existing prod APK, read-only) | T2 RAN-PASSED, T4 RAN-PASSED, 0 FATAL EXCEPTION. **But the cold-start screenshot shows a "System UI isn't responding" dialog** right after the boot (`evidence/p0-smoke/ev/T4/cold-start.jpg`); it was gone a minute later |
| Smoke 2 (same) | T2 RAN-PASSED, T4 RAN-PASSED, clean screenshot (`evidence/p0-smoke2/ev/T4/cold-start.jpg`), logcat: 0 `FATAL EXCEPTION` / `ANR in` |

Device: API 36, 1080x2400, WebView 133.0.6943.137. **Status: healthy after one reboot.** Lesson for
later phases: after a long-running emulator session DNS can die → reboot first; after a cold
boot, give System UI ~1 minute (or dismiss with Wait) before the first screenshot. Smoke 1's
logcat has 4 "Process … has died" lines — all system cached-process kills (printspooler,
localtransport, chrome, adservices), not our app.

The raw logcat files (`evidence/p0-smoke*/logs/`, ~1 MB each) are kept on disk but not committed
(DECISIONS.md 8).

## 0.7 Staging build guard (S2 guard part only)

Command (as in `scripts/android/staging-tests.mjs` S2):
`VITE_SUPABASE_URL=https://<prod ref>.supabase.co node scripts/build-android.mjs --target staging`

Result: exit 1, `STAGING GUARD: REFUSED — VITE_SUPABASE_URL in the process environment … points at
the PRODUCTION project`, `[build-android] FAILED — 1/5 staging guard`. `dist/` untouched (the guard
runs before the dist wipe). **RAN-PASSED.** Log: `evidence/p0-s2-guard.txt`.

Note: `*.log` is gitignored (`.gitignore:29`), so the per-script baseline logs
(`evidence/baseline/logs/*.log`, `build-full.log`, `lint.log`) stay on disk only; `summary.tsv`
and the failure lines quoted above are committed. The short Phase 0 logs were saved as `.txt`.
