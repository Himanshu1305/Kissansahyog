# Batch 6A report

## Done

- Added a mounted `ErrorBoundary` with one-time stale-build recovery (unregister service workers, clear Cache Storage, set guarded session flag, reload) and a bilingual recovery screen.
- Added `getCategorySafe` for listing collections and used it where collection cards are rendered, so an unknown legacy category cannot blank the homepage/browse-style cards.
- Switched PWA configuration to auto-update, skip-waiting and clients-claim; the manual update tap is no longer required.
- Consolidated layout measurements in the existing tokens/primitives system: 72ch reading width, 1200px wide width, responsive `px-4 sm:px-6 lg:px-8` equivalent padding, card/grid/section values and a form-side-panel grid. `Screen` now defaults to wide. Bazaar removed its page-width clamps.
- Added homepage shared search hero (typing and existing voice path), hid the NavBar search on `/`, and added quick search links.
- Added pure Mela date status/sort helpers. Homepage now uses dated non-ended events only; calendar supports date/name sort, past toggle and ongoing badges. API queries require active, approved, unmerged rows.
- Added nine distinct optimized homepage tile images, traceability manifest records, a reviewer table and a visual contact sheet.
- Updated homepage Q&A to three equal-height cards, fetch limit three, clamped question/answer text and full-answer link.
- Added the linked USD Vision AI LLP footer credit; removed the future-listing-charge render/string.
- Self-hosted Noto Sans Devanagari Latin and Devanagari woff2 subsets for weights 400/600/700/800; removed Google font markup and CSP permissions.

## Verification

- `node scripts/verify-batch6a.mjs`: **21 passed, 0 failed**. Raw output: `BATCH6A_VERIFY_OUTPUT.txt`.
- Existing `scripts/test/*.mjs` were run without loading `.env`: 70 scripts, 19 exited 0 and 51 exited nonzero. Raw output: `BATCH6A_TEST_OUTPUT.txt`. Most nonzero exits are existing sandbox/secret/build constraints; `batch2_layout.mjs` is now green. Known pre-existing failures remain: `v11_phase6`, `v2_citation_audit`, `batch4_ui_style` (child-process EPERM). `phase8.mjs` also expects the previous prompt-update behaviour, and `v11_phase6.mjs` still expects the deliberately removed charge string; tests were not loosened or edited.
- `npm.cmd run build` was run and its raw output is in `BATCH6A_BUILD_OUTPUT.txt`. It is blocked before source compilation by the sandbox's Tailwind native module (`UNLOADABLE_DEPENDENCY`) and `spawn EPERM`.
- Browser viewport checks at 1440/1024/768/390 could not be run because Vite cannot start in this sandbox. No deploy was performed.

## Data to confirm

- `Krishi Mela, UAS Bengaluru` is reported as 22–25 Oct 2026 while its expected period says `Nov 2026`; the confirmed dates take precedence in the UI. No database data was edited.

## Files changed

- App/runtime: `src/main.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/PwaPrompts.jsx`, `vite.config.js`.
- Layout/search/footer: `src/styles/tokens.css`, `src/index.css`, `src/components/ui.jsx`, `src/components/layout/PageShell.jsx`, `src/components/home/kit.jsx`, `src/components/SearchBar.jsx`, `src/components/NavBar.jsx`, `src/components/layout/Footer.jsx`.
- Listings/Mela/pages: `src/lib/listings/categorySafety.js`, `src/lib/listings/registry.jsx`, `src/components/ListingCard.jsx`, `src/lib/mela/melaStatus.js`, `src/lib/mela/melaApi.js`, `src/screens/Homepage.jsx`, `src/screens/KisanMela.jsx`, `src/screens/Bazaar.jsx`, `src/screens/DroneDidi.jsx`, `src/screens/Post.jsx`, `src/components/categories/agri_inputs.jsx`.
- Copy/assets: `src/lib/i18n/strings.js`, `index.html`, `public/_headers`, `public/fonts/*`, `public/images/home/manifest.json`, `public/images/home/cat-{rotavator,seeds,building-materials,greenhouse,jugaad,tanker,transport,carbon,cold-storage}.jpg`.
- Support/review: `scripts/verify-batch6a.mjs`, `scripts/download-batch6a-images.mjs`, `scripts/download-batch6a-fonts.mjs`, `PROJECT_CONTEXT.md`, `BATCH6A_PROGRESS.md`, `BATCH6A_IMAGES.md`, raw verification/build/test output files and `batch6a-image-contact-sheet.jpg`.

## Pages to look at after deploy

- `/` — stale-category resilience, hero search/voice, unique tiles, Q&A and Mela badge.
- `/kisan-mela` — ongoing/current event ordering, date/name sort, past toggle.
- `/browse`, `/my`, `/drone-didi` — unknown-category rows should be skipped safely.
- `/bazaar` and `/post` — wide frame and no future-charges notice.
- Any page after a deploy while an old tab is open — automatic stale-build recovery/update.
