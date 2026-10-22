# BATCH 13A: BROWSE PAGE POLISH (collapse arrows, working Offering / Looking for, two sections) + footer wording + desktop clipping, then ship prep

You are Claude Code, the builder. I am Himanshu (non-technical founder). Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows). I am away while you work. Do not ask questions. Pick the SAFEST option, record it in `docs/review/batch13a/DECISIONS.md`, carry on. Be economical: one run, no repeated long suites, no `/loop`, wake-ups, cron or background processes left running. Use the model I selected (Sonnet). Background research (read it, do not redo it): `IMPROVEMENT_RESEARCH_2026-10-21.md` in the repo root, section "Own-product observations" and the marketplace-filter findings (collapsed filters on phones, applied-filter chips, live counts, clear fallbacks).

## WHAT I WANT (from testing the Android app on my phone)
1. **Collapse arrows.** On the Browse page the equipment filter block (and similar blocks) makes people scroll too much. Add an arrow (▸ / ▾) on each block's heading to collapse and expand it.
2. **Offering / Looking for do not work.** Selecting them does not visibly change the list. (Architect's diagnosis, verify first: the filter code in `src/screens/Browse.jsx` does re-query by `listing_type`, and staging has both types in every category, but the "Popular listings" block above the grid ignores the filter and fills the first phone screen, so nothing seems to change.) Reproduce it at 360 x 640 on staging data before changing anything and record what you saw. Whatever the true cause, the end result must be: tapping a choice visibly and immediately changes everything on screen.
3. **Separate sections.** Offering and Looking for must be two clearly separate sections, so that when "All" is selected the user still sees which are offers and which are requests.
4. **Footer wording.** Change the footer line from "... USD Vision AI LLP · Madhya Pradesh, India" to "... USD Vision AI LLP · India" (we are based in Hyderabad). Hindi: " · भारत".
5. **Desktop clipping (small polish).** On a wide desktop home page (seen at about 1725 px) the left edge of the greeting line ("🙏, Himanshu Dixit") and of the green category strip ("... के सारी जानकारी देखें") is cut off. Find the cause (likely negative margin/overflow in the home layout or the strip) and fix it with the smallest safe change. Check 1366, 1536, 1725 and 1920 px. If a safe small fix is not possible, do nothing and put it in `BACKLOG.md`.

## HARD RULES
- Start from the head of `release-12b` (production runs commit `e7432c8`, deployment `8c6a66f2-ad48-444c-8730-67a072c49e0c`; the 12B close commit `fa4993a` may sit on top of it). Create `release-13a`, safety tag `pre-13a-ship` at the starting commit, push both (no `git pull`, no force-push). Commit with explicit paths only (never `git add -A`).
- **No database change, no migration, no switch change.** Production has `otp_required` = TRUE and `session_enforced` = FALSE; never touch them, never read or write the production database; only public HTTP gates. Staging switches: read and record only.
- No animation. No third-party scripts. No layout shift on the home page; the two big home buttons stay where they are (about y 615 and 691 at 360 x 640).
- The home page prerender must stay small and free of listing/ticker rows: `dist/index.html` must stay within 1.40x of the live size and contain no ticker links (the 12C rule). Browse is client-only and noindex.
- Never print or store a secret, key or full phone number. Do not run the real production ship.

## PHASE 0: START (cheap)
1. `git status`, `git branch --show-current`, `git log --oneline -5`; create `release-13a` and the tag.
2. Read `src/screens/Browse.jsx`, `src/components/CollapsibleSection.jsx` (reuse it for the arrows if it fits; the 10B/10C home sections use it), `fetchNearby` / `fetchTopViewed` in `src/lib/listings/listingsApi.js`, `LISTING_TYPE_META` in `src/lib/listings/catalog.js`, `src/components/ListingCard.jsx`, `src/components/layout/Footer.jsx`, and the footer strings (`footer_company_place`, `footer_credit_prefix`) in `src/lib/i18n/strings.js`.
3. Baseline: `npm run build:full` (staging mode); record main chunk gzip and prerender result (expect 268/268). If the Windows error `UNKNOWN: open ... public/search-index.json` appears, delete `public/search-index.json` and run again.

## PHASE 1: BROWSE REWORK
1. **Load once, split on the phone.** Fetch the nearby listings for the category WITHOUT a type filter, then split into offers and requirements in the browser (same distance policy, same sort, same 30 km / fallback ring logic as today: reuse `partitionByRadius` results; do not change the radius rules). Toggling the choice then updates instantly with no new request and no spinner.
2. **Top choice (segmented control, one row, 48 px high):** All, Offering, Looking for, each with a live count, e.g. "Offering (7)". Hindi labels: `सब`, `दे रहे हैं`, `चाहिए` (plain Hindi, no English in brackets in the NEW labels; keep the old `LISTING_TYPE_META` strings for the card badges and the post form). The choice is stored in the web address as `?type=offer|requirement` (replace, not push), unknown values ignored, so a refresh or shared link keeps it.
3. **Two sections.** When "All" is selected show two headed sections in this order: "दे रहे हैं / Offering (n)" then "चाहिए / Looking for (n)", each with its own cards, its own collapse arrow, and its own empty message ("इस श्रेणी में अभी कोई नहीं / None yet nearby") instead of vanishing. When Offering or Looking for is selected show only that section, expanded. Each section keeps its own soft "30-50 km" fallback block exactly as today (only when that section has none within 30 km). Distinct but calm styling (a coloured heading bar or icon; AA contrast, 4.5:1 or better).
4. **"Popular listings" block:** keep it, but make it respect the chosen type (filter the popular list by `listing_type`), collapsible with an arrow, and DEFAULT COLLAPSED on phones (under 640 px) so results start higher; default open on desktop. If the type filter leaves it empty, hide it.
5. **Collapse arrows.** Add an arrow toggle (button with `aria-expanded`, `aria-controls`, 48 px target, Hindi/English `aria-label` "खोलें/बंद करें") to: the equipment tag filter block (heading text stays; when collapsed show the selected tag as a one-line summary, e.g. "टैग: ट्रैक्टर ✕"), the Popular listings block, and each of the two result sections. Equipment tag block default: collapsed on phones when no tag is selected, open on desktop. Remember each block's open/closed state for the session (`sessionStorage` inside `try/catch`; the page must work if storage is blocked). No animation: the content simply shows or hides.
6. **Applied-filter summary:** under the controls, when a tag or a type is active, show small removable chips ("दे रहे हैं ✕", "टैग: ... ✕") so users can see and clear what narrows the list.
7. Keep: category chips, location control, nearest/newest sort, drone-didi and bhusa banners, offline stamp/notice, `data-testid`s that existing tests use (add new ones for the new controls). Existing E2E for Browse must be updated only where behaviour intentionally changed.
8. New strings go in `src/lib/i18n/strings.js` (hi AND en, parity test must pass). List every new Hindi line in `docs/review/batch13a/HINDI_CAPTIONS.md` for my review.

## PHASE 2: FOOTER
Change `footer_company_place` to hi `' · भारत'` and en `' · India'`. Search the source, tests and docs for any other place where the company location is shown as Madhya Pradesh and tell me (do not change legal pages without telling me; only list them in REPORT.md). Update any test that asserts the old text.

## PHASE 3: DESKTOP CLIPPING
As item 5 above. Before/after screenshots at 1725 x 900 and 1366 x 768 (Hindi), mobile 360 x 640 unchanged.

## PHASE 4: TESTS AND CHECKS
- Unit: the split/count helpers, URL-param handling, parity test. Full unit suite once.
- E2E (one new file, run alone on a frozen copy of `dist`, with mocked listing data containing both types): selecting Offering shows only offers and the count matches; Looking for shows only requirements; All shows two headed sections; popular block respects the choice and starts collapsed at 360 px; arrows collapse and expand (aria-expanded flips; content hidden); equipment tag summary shows when collapsed; state survives a reload via URL; works with `sessionStorage` blocked; no horizontal overflow at 320 px, Hindi and English; footer shows "· India" / "· भारत". Then run the existing Browse/home E2E files once.
- Screenshots (LOOK at them): Browse at 360 x 640 and 320 x 640 in Hindi (All, Offering, Looking for, equipment with tags collapsed and open), desktop 1366; footer; desktop home before/after the clipping fix. Save under `docs/review/batch13a/evidence/screens/`.
- Build: prerender 268/268, prerendered text identical to baseline except the footer line; main chunk gzip change in REPORT.md.
- Secret scan over the diff and evidence folders.

## PHASE 5: STAGING, SHIP SCRIPT (do NOT run the real ship)
1. Try the staging deploy ONCE: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`. If the tool permission check refuses it, do not work around it; say so in the summary.
2. Create `scripts/ship-prod-13a.sh` and `scripts/rollback-prod-13a.sh` by copying the 12B ones. Keep all gates: read the live deployment from Cloudflare as the rollback target; require `otp_required` = true and `session_enforced` = false BEFORE and AFTER; never set a flag; auto-rollback on a failed gate; `--dry-run` changes nothing; the predeploy size gate (do not loosen it). Add markers: the new build's footer contains `· India` (and not `Madhya Pradesh, India`), the Browse chunk contains the new section test ids, and ALL earlier markers (12A WhatsApp, 12B Dussehra/Neelkanth, 12C ticker) still pass.
3. `docs/review/batch13a/SHIP.md` with only: the one ship command, the undo line, and the sentence that nothing in the database changes.
4. Commit explicit paths, push `release-13a`, tag `ship-13a` on the final head (new tag; do not move older tags), push it. Run `bash scripts/ship-prod-13a.sh --dry-run` on the pushed head; it must end `DRY RUN OK` with nothing pending (if the permission check refuses it, say so; I will run it).
5. Write `BATCH13A_CLOSE_PROMPT.md` in the repo root (same style as `BATCH12B_CLOSE_PROMPT.md`, tag `prod-13a`).
6. Nothing left running (servers, background processes, local key files).

## FINAL SUMMARY (print ONLY this; max 12 lines, plain language, no file dumps)
What the cause of "Offering / Looking for not working" really was; what the Browse page looks like now (sections, arrows, defaults on phone); footer and desktop-clipping result; test numbers as passed/total; staging deploy id (or why not); dry run result; the exact ship command I run; anything I must decide (Hindi wording is in `docs/review/batch13a/HINDI_CAPTIONS.md`).
