# Batch 6D report

## Done

- Completed the required screen inventory in `BATCH6D_LAYOUT_INVENTORY.md`. Every route screen now uses `PageShell`, `Screen`, or the homepage shared `Section` frame. The page frame is responsive with a 1200px maximum and token-controlled side padding.
- Preserved readable long-form content inside the wide frame. `PageShell width="content"` now uses a 72ch reading column plus a sticky related-links panel on desktop; existing Terms navigation remains in place.
- Converted the legacy direct-NavBar screens (`ArticleDetail`, `Credits`, `Home`, `Join`, `Videos`, `Welcome`, and `Yojana`) to the shared frame. Removed per-screen page-width clamps; the verifier has one documented whitelist for a homepage thumbnail and hero proportion only.
- Fixed `fetchFeaturedSawaal(3)`: featured, answered rows lead, and recent published answered rows fill any missing cards. The pure selection helper has a fake-list verifier check. Homepage Q&A remains a 3/2/1 equal-height grid, clamps question/answer copy to 2/3 lines, uses the bottom-pinned full-answer label, removes the large question-mark tile, keeps the photo-question CTA, and exposes the all-questions link.
- Removed the homepage event strip, its fetch/state/imports, and the homepage most-viewed section/state/fetch. `fetchUpcomingEvents` now starts with `event_date >= today` using `Asia/Kolkata`; `/info` remains its sole event-list screen. `farm_events` is referenced by `src/lib/events/eventsApi.js` and rendered by `src/screens/Info.jsx`.
- Kept `fetchTopViewed` because `/browse` still uses it, and renamed that browse-only display to the bilingual `popular_listings_heading` so the removed most-viewed string no longer remains in product source.
- Confirmed future-listing-charge rendering is absent from product source. The globally mounted footer retains the USD Vision AI LLP credit and now has exactly one Open-Meteo attribution line, with the required link.
- Updated PWA comments and the two explicitly permitted old-test expectations: `phase8.mjs` now asserts `autoUpdate`/`skipWaiting`; `v11_phase6.mjs` no longer requires `agri_vendor_future_charges`.
- Ran `node scripts/verify-batch6d.mjs`: 18 passed, 0 failed. Raw UTF-8 output is in `BATCH6D_VERIFY_OUTPUT.txt`.
- Ran `npm.cmd run build`: success (279 modules transformed). Ran `node scripts/test/phase8.mjs`: 21 passed, 0 failed.
- Captured local responsive screenshots at 1440px and 390px for `/`, `/yojana/pmfby`, `/sawaal`, `/mausam`, `/msp`, `/fasal-salah`, and `/resources` in `shots-batch6d/`. Static checks and those captures showed no horizontal overflow.

## Not done / why

- No commit, deployment, migration, database write, or secret-file access was performed, per instructions.
- `node scripts/test/v11_phase6.mjs` still has its established unrelated failures: the pre-existing `listingConsents` disclaimer shape and its Windows path-separator mismatch in the hardcoded-Devanagari scan. The specifically permitted future-charge expectation now passes; no other v11 expectation was changed.

## Files changed

- Layout: `src/components/layout/PageShell.jsx`, `src/styles/tokens.css`, and the route screens listed in the layout inventory.
- Homepage/data: `src/screens/Homepage.jsx`, `src/lib/community/communityApi.js`, `src/lib/community/sawaalSelection.js`, `src/lib/events/eventsApi.js`, `src/screens/Browse.jsx`.
- Footer/copy/PWA/tests: `src/components/layout/Footer.jsx`, `src/lib/i18n/strings.js`, `vite.config.js`, `scripts/test/phase8.mjs`, `scripts/test/v11_phase6.mjs`.
- Review/verification: `docs/review/BATCH6D_{PROGRESS,LAYOUT_INVENTORY,VERIFY_OUTPUT,REPORT}.md`, `docs/review/shots-batch6d/*`, and `scripts/verify-batch6d.mjs`.

## Unsure

- The Q&A row was empty in the local anonymous preview because the local data request did not return published questions. The helper and markup were verified statically and with fake rows; confirm against the deployed data that the featured-plus-recent query returns three answered cards.
- Local screenshots use the current build and local browser state, not production API data.

## Pages to check after deploy

- `/` — three populated Q&A cards, no event strip, no most-viewed listings, and the new footer source line.
- `/yojana/pmfby`, `/sawaal/<slug>`, `/articles/<slug>`, `/privacy`, and `/terms` — readable content column plus desktop related/sticky side navigation.
- `/mausam`, `/msp`, `/fasal-salah`, `/resources`, `/videos`, `/yojana`, and `/credits` — shared wide frame at desktop and mobile.
- `/info` — only future `farm_events` display, with India-date filtering.
