# Batch 9 — SHIP (Phase 4)

Written 2026-10-15 (resumed session). **Staging is shipped. Production is NOT deployed** (founder
decision); it is prepared as one gated command that rolls itself back on failure — see `PROD_SHIP_STEPS.md`.

## What was deployed to STAGING (staging.kissansahyog.com)

| Item | Value |
|---|---|
| Pages project | `kissansahyog` (its "Production" environment = staging.kissansahyog.com) |
| Deployment | `ce06082e-f94f-4734-a8ca-fab375d08873` (https://ce06082e.kissansahyog.pages.dev), branch `main` |
| Source commit | `534581b` — merge of `android-app` (`95dcbce`) into `release-9` |
| Time | 2026-10-15 ~04:06 IST (2026-10-14 22:36 UTC) |
| Build | `npm run build:full` (staging env `.env`): 263/263 routes prerendered, main chunk `index-B9eiHYmW.js` 80.9 KB raw / 27.2 KB gz (`evidence/phase4/dist-check-staging.txt`) |
| Command | `npx wrangler pages deploy dist --project-name kissansahyog --branch main` (`evidence/phase4/staging-deploy.txt`) |
| Pages secrets set on staging | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (previous session, `staging-secret-put.txt`) — **verified to be the STAGING project** (`wzxtqbqlahyahsnoqqva`), see below |
| Previous staging deployment | `6574f68b` (source `3c1b4e0`, Batch 6G) — `evidence/phase4/staging-deployments-before.txt` |

Branch `release-9` is pushed to origin. Commits after the deploy are docs, evidence and scripts only:
`1b4ef41` (evidence, verifier, ship/rollback scripts), `885a433` (script hardening), and the commit
that adds this file. The `main` and `staging` branches are untouched and nothing was merged into `main`.

Tags: `pre-9-ship` → `206cd86` (= what prod runs, local + origin), `pre-9-start` → `2bf9aef`.

## Gates on staging — final status

Final full run: 2026-10-15 04:29–04:30 UTC, `evidence/phase4/staging-gates.txt` +
`evidence/phase4/staging-after/results-staging-gates.json` → **ALL PASSED (62 checks)**.

| Gate | Status | Evidence / note |
|---|---|---|
| a. `/` + 10 key pages (+ /grievance): 200, rendered, h1, no ErrorBoundary, no failed own-origin request | **RAN-PASSED** | `staging-after/page-staging-gates-*.png`. Console note: listing photos from Supabase Storage are blocked by CSP `img-src` (pre-existing, also on prod — finding F1) |
| b. `OPTIONS /api/feedback`: https://localhost and capacitor://localhost → 204 + echoed origin; https://evil.example → no allow-origin; no `*` | **RAN-PASSED** | |
| c. `POST /api/feedback` KSTEST from https://localhost → `{ok:true}`, row stored | **RAN-PASSED** | rows `KSTEST-B9P4-1792017434519` (run 1) and `KSTEST-B9P4-1792038619612` (final run) in `staging-test-data.json`; both confirmed in the STAGING `feedback_messages` table (`staging-secrets-check.txt`) |
| d. `/geo`, `/geocode?…`, `/transcribe`: JSON + CORS for the app origins only | **RAN-PASSED** | |
| e. Static `/`, `/mausam`, `/sitemap.xml` carry no CORS from our middleware | **RAN-PASSED** | Cloudflare Pages itself adds `Access-Control-Allow-Origin: *` to static files (platform default, on both sites before Batch 9). The gate records and allows it |
| f. Real SW installed in Playwright → `/sitemap.xml`, `/sitemap-pages.xml`, `/robots.txt` are the real files | **RAN-PASSED** | `staging-after/sw-staging-gates-*.png` |
| g. SW update for an existing client | **RAN-PASSED** | `staging-after-swupdate.txt`, `results-staging-swupdate.json`: one client installed the OLD staging build (main `index-EC2jILHl.js`, SW controlling) before the deploy, then moved to the new `index-B9eiHYmW.js` with no ErrorBoundary. Ran once (22:35–22:36 UTC). It can only run across a deploy, so it was not repeated |
| data. Mandi ticker on `/` shows ₹ prices; `/mausam` shows weather | **RAN-PASSED** (after test fix) | The first run RAN-FAILED (`staging-gates-run1-failed.txt`). Cause: a **test problem**. The browser had no place set, and /mausam shows weather only for a place the visitor has set (7L-1). The fixed test grants a Sagar position, waits for the place banner and checks that the weather read returned 200. Results: staging 21°, `weather_cache_v2` 200 (`mausam-recheck/`); prod read-only 28° (writes aborted). See `evidence/phase4/assertion-changes.json` and DECISIONS Phase 4 #1 |

Also on record (previous session, before the deploy): website baseline on `release-9`
(`evidence/phase4/baseline-release9/summary.tsv`). The failing scripts are exactly the pre-existing
Phase 0 ones (batch3_style, batch4_ui_style, batch4_voice, v11_phase6, v2_brand, v2_citation_audit,
verify-batch5b-citations, verify-batch7a, verify-batch7b, verify-batch7l1). verify-batch7d has passed
since Phase 2, so there is no NEW failure. `build:full` and `build:prod` both prerender 263/263 routes,
the prod dist guard passes, and the prod dist has no staging reference (`dist-check-prod.txt`).

### Staging Pages secrets (task check)

`.env` holds the staging URL and a service key whose JWT `ref` is `wzxtqbqlahyahsnoqqva`.
`.env.production` holds prod (`eltmcznjcqiahqhjvpjg`). There is no `.dev.vars`. Pages secrets cannot be
read back, so the proof is behavioural: the staging function's KSTEST rows are in the **staging**
database (`evidence/phase4/staging-secrets-check.txt`).
**Verdict: the staging secrets point at STAGING, not prod.** The prod database was never queried.

## What the morning prod step will change

`bash scripts/ship-prod-9.sh` builds `release-9` with `npm run build:prod` and deploys it with
`npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true`.
That replaces prod deployment `7aebf863-7f12-4f7b-956c-86d42a1f65f6` (source `206cd86`, 7L-2).

Shipped code changes (`git diff --stat 206cd86..release-9 -- functions public src vite.config.js package.json`):

```
 functions/_middleware.js               |  46 +++++++++++
 package.json                           |  14 ++++
 public/_routes.json                    |   5 ++
 src/App.jsx                            |   9 +-
 src/components/BottomTabBar.jsx        |   1 +
 src/components/BuyerComplianceGate.jsx |   6 +-
 src/components/ContactActions.jsx      |   7 +-
 src/components/HelpModal.jsx           |   4 +-
 src/components/MandiTicker.jsx         |   4 +-
 src/components/NativeShell.jsx         |  90 ++++++++++++++++++++
 src/components/NavBar.jsx              |   4 +-
 src/components/OfflineNotice.jsx       |  27 ++++++
 src/components/OfflineStamp.jsx        |  24 ++++++
 src/components/PwaInstallBanner.jsx    |   3 +-
 src/components/PwaPrompts.jsx          |  89 +++++++++++++++++++-
 src/components/ReportButton.jsx        |   4 +-
 src/components/SearchBar.jsx           |   4 +-
 src/components/VoiceSearchButton.jsx   |   3 +-
 src/components/ui.jsx                  |   7 ++
 src/index.css                          |  38 +++++++++
 src/lib/apiBase.js                     |  16 ++++
 src/lib/feedback/feedbackApi.js        |   3 +-
 src/lib/i18n/strings.js                |  10 +++
 src/lib/location/geocodeQueue.js       |   3 +-
 src/lib/location/places.js             |   3 +-
 src/lib/location/postPosition.js       |  40 +++++++++
 src/lib/mandi/mandiApi.js              |  19 ++++-
 src/lib/native.js                      |  21 +++++
 src/lib/offline/cachedFetch.js         | 147 +++++++++++++++++++++++++++++++++
 src/lib/offline/policy.js              |  77 +++++++++++++++++
 src/lib/offline/status.js              |  62 ++++++++++++++
 src/lib/offline/store.js               |  86 +++++++++++++++++++
 src/lib/offline/useOffline.js          |  45 ++++++++++
 src/lib/share/shareMessages.js         |   3 +-
 src/lib/supabaseClient.js              |  10 +++
 src/lib/useNativeBack.js               |  20 +++++
 src/lib/voice/voiceSearch.js           |   9 +-
 src/lib/weather/weatherApiV2.js        |   6 +-
 src/main.jsx                           |   5 ++
 src/screens/AgroForestry.jsx           |   3 +-
 src/screens/ArticleDetail.jsx          |   5 +-
 src/screens/Browse.jsx                 |  12 ++-
 src/screens/ColdStorage.jsx            |   8 +-
 src/screens/DroneDidi.jsx              |   3 +-
 src/screens/Homepage.jsx               |   2 +
 src/screens/KisanMela.jsx              |   3 +-
 src/screens/ListingDetail.jsx          |  10 ++-
 src/screens/Mausam.jsx                 |  13 ++-
 src/screens/Msp.jsx                    |  11 ++-
 src/screens/Post.jsx                   |  35 +++++---
 src/screens/SchemeDetail.jsx           |   3 +-
 vite.config.js                         |  11 +++
 52 files changed, 1051 insertions(+), 42 deletions(-)
```

In words, the prod step ships:
- the CORS middleware for the app (`functions/_middleware.js`, limited by `public/_routes.json` to
  `/api/*`, `/geo`, `/geocode` and `/transcribe`);
- the service-worker fix in `vite.config.js` (sitemaps and robots are no longer answered with the
  app shell);
- the /cold-storage failure notice (1C) and the Post-page location fallback (1D);
- the Batch 8A/8B native-only code paths. They are gated by `isNative()`, so on the website they do nothing.

Prod already has the Pages secrets it needs (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`GEMINI_API_KEY`, `RESEND_API_KEY`; only the names were checked). No database migration is involved.

The script's own checks are all read-only on prod: the verifier aborts every non-GET request from
the browser and refuses the feedback POST on prod hosts.
- **Before deploying:** live prod must still equal `evidence/phase4/prod-before.json`. This was
  verified read-only tonight (every page ratio 1.000, `evidence/phase4/prod-readonly-now/`). The
  script then takes a fresh snapshot.
- **After deploying:** pages; compare (title and h1 identical, size −15 %/+15 %, up to +60 % only when
  the FAQ block was added — DECISIONS Phase 4 #3); sitemaps and robots; CORS; functions; static;
  service worker; mandi ticker and /mausam.
- **Any failure** triggers an automatic rollback.

**Dry runs** (nothing changed; prod was still on `7aebf863` afterwards):
- `evidence/phase4/ship-prod-9-dryrun.txt`: "DRY RUN OK — all preconditions valid", EXIT 0.
- `evidence/phase4/rollback-prod-9-dryrun.txt`: "DRY RUN OK — preconditions valid; rollback target
  7aebf863…", EXIT 0.

The ship dry-run named commit `885a433`. A morning run ships whatever `release-9` HEAD is at that time;
the later commits are docs only.

## Rollback (exact command)

```
bash scripts/rollback-prod-9.sh
```

This uses the deployment id the ship script recorded in
`evidence/phase4/prod-ship/prod-deployment-before.txt`. The explicit form is
`bash scripts/rollback-prod-9.sh 7aebf863-7f12-4f7b-956c-86d42a1f65f6`.

- **Method:** Cloudflare API `POST /accounts/{account}/pages/projects/kissansahyog-prod/deployments/{id}/rollback`.
  wrangler 4.151.0 has no Pages rollback command.
- **Auth:** wrangler's own login token or `$CLOUDFLARE_API_TOKEN`. Read-only use of that token was
  verified tonight; the rollback call itself was not exercised.
- **Manual fallback:** Cloudflare dashboard → kissansahyog-prod → Deployments → `7aebf863` → Rollback.
- **Staging rollback** (if ever needed): the same API with project `kissansahyog` and deployment
  `6574f68b…` (see `staging-deployments-before.txt`).

## Findings

- **F1 (pre-existing, prod too): CSP `img-src` lacks `https://*.supabase.co`.** Listing photos stored
  in Supabase Storage are blocked by the browser on the website home page (console errors in gates a and
  data). Not changed in Phase 4 (no app code changes); added to the backlog.
- **F2 (observation):** prod's mandi ticker shows "पिछला भाव (12/10)" while staging shows 14/10 data.
  This is data freshness on prod, not a code issue.
- **B17 (known):** prerendered pages carry `http://localhost:<port>` modulepreload links. The CSP blocks
  them and they are harmless; the verifier allowlists them.

## Committed / skipped

Committed by explicit path:
- `evidence/phase4/**` (no file over 5 MB; the whole folder is 3.6 MB);
- the Phase 1 extra run evidence (`evidence/phase1/prod-dev1..3`, `staging-dev4..5`, `results-*.json`);
- `scripts/verify-batch9-live.mjs`, `scripts/ship-prod-9.sh`, `scripts/rollback-prod-9.sh`;
- `DECISIONS.md`, `staging-test-data.json`, `HEARTBEAT.log` (force-added because `*.log` is gitignored);
- this file and `PROD_SHIP_STEPS.md`.

Skipped:
- No file was over 5 MB.
- The `*.log` build and baseline logs in `evidence/phase4/` (`build-*.log`,
  `baseline-release9/logs/*.log`) stay on disk only. They are gitignored (`.gitignore:29`), the same
  rule as in Phase 0.
- Not staged because they are not ours: `docs/review/batch7*/VERIFY_OUTPUT.txt` (5 files) and
  `public/search-index.json`. `PROGRESS.md` is left to the orchestrator.
