# Batch 10D — Baseline (Task A, before any homepage change)

Measured 2026-10-18 on the local machine. Nothing under `src/` was changed.

## Build
- Branch `release-10d`, HEAD `0c7379f` (= `release-10c` head, what production runs).
- Staging build: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist` → OK, 268/268 routes prerendered, staging guard OK. Log: `evidence/baseline/build.txt`.
  - Note: `/` was prerendered "via fallback, no marker" (the homepage does not set `data-prerender-ready`; the prerenderer waited for network idle instead). The HTML is complete.
- Frozen copy of this `dist/` for later side-by-side runs: `C:/Users/usdvi/AppData/Local/Temp/claude/C--Users-usdvi-projects-Kissansahyog/96adcb5e-cc7a-42fe-b6ff-2a5d315c4140/scratchpad/baseline-dist`
  (serve with `npx vite preview --outDir <that path> --port 4190 --strictPort`).
- Main chunk (entry module loaded by `dist/index.html`): `assets/index-Berk0UA3.js` — **81,615 B raw, 27,576 B gzip -9** (Node zlib).
  CSS `assets/index-C9S2MTQ5.css` 62,993 B raw / 12,369 B gzip -9.
- JS chunks the homepage loads on first visit (from the perf network log, same set in all 5 runs): **32 chunks, 1,014,029 B raw, 293,575 B gzip -9 total** (largest: react-vendor 72,344, LanguageProvider 61,296, supabase 53,198, index 27,576, PageShell 15,262, registry 13,198, Homepage 9,361). Details: `evidence/baseline/chunks.json`.

## Performance — slow phone (`scripts/batch10d/perf.mjs`)
Profile: 360x640, isMobile + touch, DPR 2, service workers blocked, HTTP cache disabled, fresh context per run, Hindi, logged out,
CPU throttling 4x, network = Lighthouse mobile "Slow 4G" devtools values: **latency 562.5 ms, download 180,000 B/s, upload 84,375 B/s**.
Read at max(load + 5 s, 10 s). TBT = Σ(long task clipped to [FCP, 10 s] − 50 ms). 5 runs against the frozen baseline copy on port 4190.

| | LCP ms | CLS (session) | TBT ms | FCP ms | long tasks | max long task ms | load (wall) ms | farmer photo req / bytes | failed req |
|---|---|---|---|---|---|---|---|---|---|
| run 1 | 8908 | 0.66108 | 655 | 6996 | 7 | 597 | 11426 | 1 / 145,232 | 23 |
| run 2 | 10672 | 0.67063 | 539 | 4168 | 8 | 284 | 7191 | 1 / 145,232 | 23 |
| run 3 | 10144 | 0.66108 | 662 | 4236 | 7 | 292 | 7815 | 1 / 145,232 | 23 |
| run 4 | 9372 | 0.85854 | 334 | 3424 | 5 | 199 | 6943 | 1 / 145,232 | 23 |
| run 5 | 9880 | 0.66108 | 552 | 3984 | 8 | 261 | 7197 | 1 / 145,232 | 23 |
| **median** | **9880** | **0.661** | **552** | **4168** | | 284 | 7197 | 1 | |

- LCP element in every run: the mobile hero photo `<img class="h-[200px] w-full object-cover">` = `/images/home/hero-farmer.jpg`.
- CLS is high in the baseline: one shift of 0.661 on `FOOTER.ks-section` at about the same moment as LCP (9.3–14.4 s). Likely cause: `src/main.jsx` uses `createRoot` (not hydrate) over the prerendered HTML and `Homepage` is `lazy()`, so the prerendered content is replaced by the Suspense fallback until the Homepage chunk arrives, and the footer jumps. Because that shift lands either just before or just after 10 s, a "first 10 s only" CLS (`cls10s` in the JSON) flips between 0 and 0.66 (median 0.0097) and is not a stable number; compare the session CLS.
- 23 failed requests per run = the prerendered `modulepreload` links to `http://localhost:4178/assets/…` (BACKLOG **B17**, pre-existing, not fixed; on production they are blocked by CSP). They also show as 23 console errors.
- Median: 116 requests, 1,437,007 B transferred.
- Raw data: `evidence/baseline/perf-slow.json` (all runs, long tasks, shifts, request log), console output `perf-slow.txt`.

## Farmer photo requests (`perf.mjs --photo-check`, no throttling)
| viewport | after load + 3 s | after scrolling the whole page |
|---|---|---|
| 360x640 (phone) | 1 request, 145,232 B | 1 |
| 1280x720 (desktop) | 1 request, 145,232 B | 1 |

Phones load it once (the `md:hidden` `<img>`); desktop loads it once (CSS background of the `hidden md:flex` hero). File: `evidence/baseline/perf-photo.json`.

## First-action positions (`scripts/batch10d/positions.mjs`, unthrottled, logged out)
Page y in px (top–bottom); ✔ fully above the fold, ✘ below, "partly" = cut by the fold. The fold is the viewport height; note the fixed bottom nav (~60 px) and the PWA install banner (shown in these runs) are both present.

| lang | viewport | hero instance | H1 (desktop: visible heading `<p>`) | I need | I have | free-reg pill | first InfoTile | entry-home-guide | home-open-strip |
|---|---|---|---|---|---|---|---|---|---|
| hi | 360x640 | mobile | 732–767 ✘ | **1184–1248 ✘** | 1260–1324 ✘ | 689–720 ✘ | 814–941 ✘ | 379–440 ✔ | 184–369 ✔ |
| hi | 412x915 | mobile | 732–767 ✔ | 1129–1193 ✘ | 1205–1269 ✘ | 689–720 ✔ | 814–913 ✔ | 379–440 ✔ | 184–369 ✔ |
| hi | 1280x720 | desktop | 363–418 ✔ | 633–697 ✔ | 633–697 ✔ | 320–351 ✔ | 469–617 ✔ | 230–291 ✔ | 159–220 ✔ |
| en | 360x640 | mobile | 795–865 ✘ | 1304–1368 ✘ | 1380–1444 ✘ | 752–783 ✘ | 934–1061 ✘ | 400–503 ✔ | 205–390 ✔ |
| en | 412x915 | mobile | 752–787 ✔ | 1226–1290 ✘ | 1302–1366 ✘ | 709–740 ✔ | 856–983 partly | 379–460 ✔ | 184–369 ✔ |
| en | 1280x720 | desktop | 363–418 ✔ | 633–697 ✔ | 633–697 ✔ | 320–351 ✔ | 469–617 ✔ | 230–291 ✔ | 159–220 ✔ |

On 360x640 the first homepage actions above the fold are the open strip (chips) and the guide card; the hero's "मुझे कुछ चाहिए" button is at y 1184 (about 1.9 screens down). The single `<h1>` lives in the mobile instance, so at 1280 the DOM `h1` is hidden and the visible heading is the desktop `<p>`. No horizontal overflow anywhere. File: `evidence/baseline/positions.json`.

## SEO text of the prerendered homepage (`scripts/batch10d/seo-text.mjs`)
- `evidence/baseline/home-text.txt` — 305 text lines of `<body>` in document order (both hero instances; includes data-driven text such as mandi ticker prices and listings captured from staging at build time, which can differ between builds).
- `evidence/baseline/home-seo.json` — title "किसान सहयोग — मंडी भाव, मौसम, योजनाएं व बाज़ार", meta description, canonical `https://kissansahyog.com`, 2 JSON-LD blocks (Organization, WebSite; verbatim), 1 h1 "आज किसान के लिए", 11 h2, 0 h3, section text per h2, link list, sitemap sha256.
- **There is no FAQ block on the homepage** (no faq element, no `<details>`, no FAQPage JSON-LD); `faq` is `null`.
- Sitemaps: raw sha256 of the 5 `dist/sitemap*.xml` files plus a `sitemapsSha256NoLastmod` hash. `<lastmod>` is the build date, so compare the NoLastmod hashes across days.

## Screenshots (`evidence/baseline/screens/`)
`home-{360x640,412x915,1024x768}-{hi,en}-{first,full}.png` (12 files, DPR 1). Looked at 360 hi first, 412 en first, 1024 en first: no overlap or clipping seen; the PWA install banner is showing; the EN mandi ticker shows Hindi crop names (data, pre-existing).

## E2E regression baseline
Command: `node --env-file=.env node_modules/@playwright/test/cli.js test --reporter=list` against the `build:full` (prerendered) staging build served by `vite preview` on 4173. 16.5 min; teardown cleaned the staging test data. The process exit code is 127 because of the known Windows libuv `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` at exit, not a test result.

**123 tests: 76 passed, 47 failed.** Full output: `evidence/baseline/e2e-full.txt`. Sorted failing titles: `evidence/baseline/e2e-failed.txt`.
- **Old 93 tests: 70 passed, 23 failed.** The 23 are exactly the 10C/10A failing set (`docs/review/batch10c/evidence/e2e-failed.txt`, diff empty).
- **`e2e/guide-10c.spec.js` (30 tests): 6 passed, 24 failed.** Every one of the 24 fails only on its "no console errors" check, and every extra console line is `Failed to load resource: net::ERR_CONNECTION_REFUSED`. That is B17: the prerendered pages' `modulepreload` links to `localhost:4178`. 10C ran this spec against a plain `vite build` with no prerender, where all 35 passed. So this is a test-setup artifact of `build:full`, not a guide regression.
- **For E.7:** compare against these same files, using the same build type (`build:full`). Either use exactly this failing list, or run the guide spec on a non-prerendered build as 10C did.

## Scripts
- `scripts/batch10d/perf.mjs <baseURL> <outJson> [--runs N] [--label X] [--dist DIR] [--path /]` and `--photo-check`
- `scripts/batch10d/seo-text.mjs <htmlFile> <outDir> [--sitemaps DIR]`
- `scripts/batch10d/positions.mjs <baseURL> <outDir> [--no-shots] [--langs hi,en]`
