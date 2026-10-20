# BATCH 12C: FIX THE HOME PAGE MANDI TICKER (too fast, English mandi names), then ship prep

You are Claude Code, the builder. I am Himanshu (non-technical founder). Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows). I am away while you work. Do not ask questions. Pick the SAFEST option, record it in `docs/review/batch12c/DECISIONS.md`, carry on. Be economical: one run, no repeated long suites, no `/loop`, wake-ups, cron or background processes left running. Use the model I selected (Sonnet).

## THE PROBLEM (diagnosed by the architect; verify it yourself first)
On the home page, the green mandi-price ticker (`src/components/MandiTicker.jsx`, CSS in `src/index.css`, data from `fetchMandiPrices()` in `src/lib/mandi/mandiApi.js`) is broken since the Sagar Division mandis were added:
1. **Moves very fast.** The ticker now loads EVERY price row of the day (hundreds: all crops x all Sagar Division mandis), duplicates them, and scrolls the whole strip in a fixed `80s` (`.ticker-content { animation: ticker-scroll 80s ... }`). A much longer strip in the same 80 s = very fast and unreadable.
2. **Text in a different language.** `MARKET_KEY` in `MandiTicker.jsx` has Hindi labels for only 6 mandis (Khurai, Sagar, Rehli, Banda, Deori, Malthone). Every other mandi (Damoh, Panna, Tikamgarh, Chhatarpur, Niwari, and the rest) shows its raw English name. Check `commodity_hi` too: if any row has an empty or English `commodity_hi`, fix that as well.

## WHAT I WANT
A calm, readable ticker with only Hindi text (in Hindi mode), showing a short, useful list that moves at a slow, steady reading speed. Nothing else on the home page changes.

## HARD RULES
- Start from the head of branch `release-12b` if it exists on the remote, else from `release-12a`; create `release-12c`, safety tag `pre-12c-ship` at the starting commit, push both (no `git pull`, no force-push). Commit with explicit paths only (never `git add -A`).
- **No database change, no migration, no switch change.** Production has `otp_required` = TRUE and `session_enforced` = FALSE; never touch them, never read or write the production database; only public HTTP gates. Staging: read the data only (a read-only query of staging `mandi_prices` is allowed to find the list of markets and crops).
- No new animation types; the existing slow scroll stays (respect `prefers-reduced-motion`, keep pause on hover/focus). No third-party scripts. No layout shift: the strip stays exactly 38 px high.
- The same ticker component is used elsewhere? Check with a search; if it is used on other pages, the fix must be correct there too.
- Never print or store a secret, key or full phone number. Do not run the real production ship.

## PHASE 0: START (cheap)
1. `git status`, `git branch --show-current`, `git log --oneline -5`; create `release-12c` and the tag.
2. Read `MandiTicker.jsx`, the ticker CSS, `fetchMandiPrices` / `pricesFor` / `withTrend`, `src/content/crops.js` (`cropByMandi`), and the mandi strings in `src/lib/i18n/strings.js` (the `mandi_mkt_*` keys).
3. Reproduce: from staging data (read-only), list the DISTINCT `market` and `district` values and the number of rows for the latest `price_date`; note how many items the ticker renders now. Save the numbers in `docs/review/batch12c/DECISIONS.md`.
4. Baseline `npm run build:full` (staging mode): record main chunk gzip and prerender result (expect 268/268). If the Windows error `UNKNOWN: open ... public/search-index.json` appears, delete `public/search-index.json` and run again.

## PHASE 1: FEWER, BETTER ITEMS
In `fetchMandiPrices` (or a small pure helper next to it, so it is unit-testable) reduce the rows used by the ticker:
- **One row per crop** (per `commodity_en`), choosing the mandi in this order: the user's nearest/local one if the existing `is_local` flag says so, else **Sagar** mandi, else the mandi with the highest `modal_price` count/arrivals if available, else the first row. Deterministic (no randomness) so the ticker does not reshuffle on reload.
- Order the crops in a fixed, farmer-friendly order: Wheat, Soyabean, Gram, Mustard, Lentil, Moong, Urad, Maize, Paddy, Garlic, then any others alphabetically. Cap the ticker at **12 items**.
- Keep the trend arrows (`delta`) and the staleness badge logic exactly as they are.
- The `/msp` page and other callers of the mandi API must keep getting all their rows: do NOT change `pricesFor` for them. Only the ticker's list is reduced.

## PHASE 2: HINDI NAMES FOR EVERY MANDI
- Replace the 6-entry `MARKET_KEY` with one complete mapping from the market name to a Hindi (and English-mode) label, covering EVERY distinct market found in Phase 0 (use the district Hindi names where the market is named after the district). Put the strings in `src/lib/i18n/strings.js`, keep the hi/en parity test passing, and list every new Hindi label in `docs/review/batch12c/HINDI_CAPTIONS.md` for my review.
- Unknown market names (a new mandi appears later) must fall back safely: show the district's Hindi name if known, else the raw name. Add a unit test that fails if any market present in the staging list has no mapping.
- If the app already has a market-name label helper used on `/msp`, reuse it so the ticker and `/msp` always show the same name.

## PHASE 3: SLOW, STEADY SPEED
- Remove the fixed `80s`. Set the duration from the real content width so the speed is constant: about **35 px per second** on phones and desktops (so a strip of N px scrolls its first half in `(N/2)/35` seconds), with a minimum of 40 s. Implement with a `ref` + `ResizeObserver` (or a measured `scrollWidth`) that sets a CSS custom property such as `--ticker-duration` on the element; the CSS uses `animation: ticker-scroll var(--ticker-duration, 60s) linear infinite`.
- If the content is narrower than the strip, do not scroll at all (no duplicate content, no animation).
- Keep: pause on hover/focus, `prefers-reduced-motion: reduce` = no animation (then make the strip horizontally scrollable by touch so nothing is unreachable), fixed 38 px height, no layout shift.

## PHASE 4: TESTS AND CHECKS
- Unit: the reducing helper (one per crop, order, cap 12, deterministic, prefers local then Sagar), market-label coverage test, parity test, duration calculation (given a width, returns the expected seconds, minimum 40). Full unit suite once.
- E2E (one new file, run alone against a frozen copy of `dist`, as in earlier batches; use mocked mandi data with 200+ rows across 20 markets): ticker has at most 12 distinct items; every visible market label is Hindi (no Latin-letter market names in Hindi mode); the computed animation duration is at least 40 s and the speed is at most 40 px/s; height is 38 px; no horizontal page overflow at 320 px; then run the existing home-page E2E file once so I know nothing broke.
- Screenshots (LOOK at them): the ticker on the home page at 360 x 640 and 1366 x 768, Hindi, saved under `docs/review/batch12c/evidence/screens/`, with a before/after of the strip.
- Build: prerender 268/268; prerendered text identical to baseline except nothing (the ticker loads client-side); main chunk gzip change in REPORT.md.
- Secret scan over the diff and evidence folders.

## PHASE 5: STAGING, SHIP SCRIPT (do NOT run the real ship)
1. Deploy staging ONCE: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`. Check it live (public pages only).
2. Create `scripts/ship-prod-12c.sh` and `scripts/rollback-prod-12c.sh` by copying the 12B ones (or 12A if 12B does not exist). Keep all gates: read the live deployment from Cloudflare as the rollback target; require `otp_required` = true and `session_enforced` = false BEFORE and AFTER; never set a flag; auto-rollback on a failed gate; `--dry-run` changes nothing. Add markers: the new build contains the new market labels (e.g. `दमोह`) and `--ticker-duration`; earlier markers (including the 12A WhatsApp ones and 12B ones if shipped) still pass.
3. `docs/review/batch12c/SHIP.md` with only: the one ship command, the undo line, and the sentence that nothing in the database changes.
4. Commit explicit paths, push `release-12c`, tag `ship-12c` on the final head (new tag; do not move older tags), push it. Run `bash scripts/ship-prod-12c.sh --dry-run` on the pushed head; it must end `DRY RUN OK` with nothing pending.
5. Write `BATCH12C_CLOSE_PROMPT.md` in the repo root (same style as `BATCH12A_CLOSE_PROMPT.md`, with tag `prod-12c`).
6. Nothing left running (servers, background processes, local key files).

## FINAL SUMMARY (print ONLY this; max 10 lines, plain language, no file dumps)
How many items the ticker showed before and shows now; the new scroll speed; whether every mandi name is Hindi now (and how many mandis were added to the mapping); test numbers as passed/total; staging deploy id; dry run result; the exact ship command I run; anything I must decide (Hindi labels are in `docs/review/batch12c/HINDI_CAPTIONS.md`).
