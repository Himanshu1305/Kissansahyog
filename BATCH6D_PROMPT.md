# BATCH 6D — Site-wide width fix and homepage clean-up

You are the builder. The architect/reviewer (Claude) reviews afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).
Start from the branch the owner tells you. Create `codex/batch6d-sitewide`.

PREREQUISITE: Batch 6A is merged (central layout/theme in `src/styles/tokens.css`,
`src/components/ui.jsx`, `src/components/layout/PageShell.jsx`; `ErrorBoundary`; `getCategorySafe`).
Reuse them. If something from 6A is missing, STOP and say so in the report.

## 0. Rules

- Do NOT `git commit`, do NOT deploy, do NOT run migrations, do NOT write to the database.
- Never read/print/edit/commit `.env` or secrets.
- Hindi first, English second; all text through `src/lib/i18n/strings.js`. No hard-coded Devanagari in
  components. Plain farmer-friendly Hindi. No "coming soon" / "under review" labels.
- Pre-existing failing tests to leave alone: `v11_phase6` (except the one expectation named in D7),
  `v2_citation_audit`, `batch4_ui_style`. Do not delete/skip/loosen tests.
- Windows + Node 24: dynamic `import()` of absolute paths needs `pathToFileURL(...).href`.
- Keep `docs/review/BATCH6D_PROGRESS.md` updated. At the end write `docs/review/BATCH6D_REPORT.md`
  (done / not done and why / files changed / unsure / pages to check after deploy) and
  `scripts/verify-batch6d.mjs` (PASS/FAIL lines), UTF-8 output to `docs/review/BATCH6D_VERIFY_OUTPUT.txt`.
- If `npm run build` is blocked by the sandbox (Tailwind native module / `spawn EPERM`), say so and
  save the raw output; the owner builds on his own terminal.

## D1 — EVERY page uses the wide shared layout (owner: "pages are not edge to edge")

Batch 6A only moved the screens it listed. The owner still sees narrow pages, e.g. `/yojana/pmfby`,
`/sawaal`, `/mausam`, `/msp`, `/fasal-salah`, `/yojana`, `/resources`, `/videos`, `/info`, `/experts`.

1. Inventory first: write `docs/review/BATCH6D_LAYOUT_INVENTORY.md` — a table of EVERY file in
   `src/screens/` (and any page component under `src/components/pages/`) with: which layout primitive
   it uses (`PageShell`, `Screen`, `ContentColumn`, raw div), the width it ends up with, and the
   hard-coded width classes (`max-w-*`, `w-[..]`, `mx-auto` wrappers, fixed `px-*`).
2. Convert all of them to the shared frame: `PageShell`/`Screen` with the default `wide` width
   (about 1200px, responsive side padding from the tokens). Remove per-page `max-w-*` wrappers.
   Long reading text (Sawaal answer body, scheme description, Terms, Privacy, articles) keeps a
   readable text column INSIDE the wide frame (~72ch) with a sticky side panel (table of contents,
   related links, or the `PromoBento` from 6B if it exists; if it does not exist yet, just use
   a related-links card) so the page does not look empty on desktop.
3. Verifier: scan ALL `src/screens/**` and `src/components/pages/**` and FAIL on any hard-coded
   page-width wrapper outside a documented whitelist (images, modals, small cards). The whitelist
   lives in ONE place in the verifier and every entry has a comment.
4. Check mentally and by static analysis at 1440 / 1024 / 768 / 390: no horizontal scroll, no
   element wider than the viewport. If the sandbox can run Playwright with Chromium, also take
   screenshots of `/`, `/yojana/pmfby`, `/sawaal`, `/mausam`, `/msp`, `/fasal-salah`, `/resources`
   at 1440 and 390 into `docs/review/shots-batch6d/`; if not, say so.

## D2 — Homepage Farmer Q&A cards (the 6A change did not take effect)

Owner screenshot of the preview: still only 2 cards, old style with a "?" icon tile, answer text
not clamped (5 lines), and the section sits in a narrow column while the sections above are wide.

1. Find why: `fetchFeaturedSawaal(...)` returns only rows with `is_featured`; likely only 2 are
   featured. Fix in the API helper: return featured rows first, then top up with the most recent
   published questions that have a real answer until the requested count (3) is reached.
2. Render: 3 cards in a row on desktop (`lg`), 2 on tablet, 1 on phone, equal height (grid
   `items-stretch`, card `flex flex-col`), question clamped to 2 lines, short answer clamped to 3 lines,
   "पूरा उत्तर पढ़ें" pinned to the bottom of the card. Remove the oversized "?" tile (small inline
   icon at most). Section uses the same wide frame as the sections above it.
3. Keep the "Ask a question with a photo" button, and add "सभी सवाल देखें" → `/sawaal`.
4. Verifier checks the real rendered markup/classes in the compiled JSX (grep for the clamp
   classes and the grid classes) and the helper's top-up behaviour with a fake list.

## D3 — Remove the homepage events strip ("Fri — Drone spraying demo · खुरई, सागर")

Source (verified): `src/lib/events/eventsApi.js` `fetchUpcomingEvents` reads table `farm_events`
(3 sample rows, e.g. "Drone spraying demo", organizer "ATMA सागर", 16 Oct) and `Homepage.jsx`
renders the first one inside the hero as plain text (`in7`). It is not a link and the data looks
like seed samples, so it is an unverified claim in front of farmers.

1. Remove the strip from the homepage (delete the `in7` block, the `fetchUpcomingEvents` call there,
   and unused imports/state/strings). Do not delete the `farm_events` table or the API function.
2. Fix `fetchUpcomingEvents` so it never returns past events (`event_date >= today` in India time),
   since `/info` also uses it. Keep the `/info` list working.
3. In the report, state where else `farm_events` is shown (grep) and list those places.

## D4 — Remove the homepage "Most viewed" (सबसे ज़्यादा देखा गया) section

It is a LISTINGS section fed by `fetchTopViewed`. Live data: 74 listings, 6 views in total (max 4,
3 listings with any view), 65 of 74 rows are test data. It shows an arbitrary order, so it adds no
value. Remove the section, its `topViewed` state/fetch and the `most_viewed_heading` string.
Keep `fetchTopViewed` only if another screen uses it (grep); otherwise delete it too.

## D5 — Remove the "future listing charges" remnants and check footer credit

Verify (grep) that 6A removed every render of `agri_vendor_future_charges`. Verify the footer shows
the USD Vision AI LLP credit on EVERY page (not only the homepage). Fix if not.

## D6 — Data sources credit (small print, one place)

Add ONE small-print line to the shared Footer: hi "मौसम डेटा: Open-Meteo.com · मंडी भाव: Agmarknet/data.gov.in"
en "Weather data: Open-Meteo.com · Mandi prices: Agmarknet / data.gov.in", with `Open-Meteo.com`
linking to https://open-meteo.com . Reason (do not put this reason in the UI): Open-Meteo's free
tier requires attribution (CC BY 4.0). Do NOT add source lines anywhere else on weather pages.

## D7 — Tidy-ups left by 6A

1. `vite.config.js` still contains comments saying `registerType 'prompt'` / "NO skipWaiting" while the
   code now uses `autoUpdate` + `skipWaiting`. Rewrite those comments to match the code.
2. Two old tests assert behaviour the owner deliberately changed. You MAY update ONLY these two
   expectations, and list each change in the report: (a) `scripts/test/phase8.mjs` expects the
   manual "update available" prompt flow — update it to expect auto-update; (b) `scripts/test/v11_phase6.mjs`
   expects the removed future-charges string — remove that one expectation. Change nothing else in those files.

## D8 — Definition of done

- `node scripts/verify-batch6d.mjs` passes 0 failed; other tests unchanged (except D7).
- Layout inventory file exists and every screen is listed.
- Report written; nothing committed/deployed; DB untouched; no secrets touched.
