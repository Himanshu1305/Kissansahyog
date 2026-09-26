# Kisan Sahyog — Sawaal Grid, PWA Banner Diagnosis, Back-Button Audit, Ticker Fix, Agro Forestry Depth

DO NOT ask for approval or questions. Decide and proceed. No schema changes expected in this prompt — if one turns out to be needed, use one migration file.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after the final Phase passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Phase 1 — `/sawaal` grid layout

The category filter chips (सभी, ज़मीन, कीट, etc. with counts) already work correctly — do not touch them. The problem is the Q&A cards below: they render as a single-column stacked list, requiring a lot of scrolling. Change this to a responsive grid — reuse the exact card-grid pattern already used on `/yojana` (2-3 columns on desktop ≥1024px, 1 column on mobile <640px, 2 columns in between if that's what `/yojana` already does — match it exactly for visual consistency). Keep each card's question, category badge, village name, and "जवाब देखें" link; if answer-length variation creates awkward card-height differences in the grid, apply a line-clamp to the answer preview text so cards stay visually even. The search box and category chips stay above the grid, full width, unchanged.

---

## Phase 2 — PWA install banner: diagnose before fixing

An earlier build reported this banner as complete and verified with screenshots (Android native install, iOS fallback instructions, hidden when already in standalone mode, session-based dismiss). It is not showing on the current homepage. **Do not simply re-build it — find out why it's missing first**, and write the actual root cause in the review doc before applying a fix. Check, in order:

1. Does the banner component still exist in the codebase at all? (`git log` / `git blame` on the relevant file — was it ever actually merged, or removed in a later commit?)
2. If it exists, is it actually rendered on the homepage — check the homepage component for whether it's still imported and placed.
3. Is the `display-mode: standalone` detection incorrectly returning true in a normal (non-installed) browser — check this specific condition directly, since a false positive here would hide the banner for everyone, not just installed users.
4. Is a stale `localStorage` dismiss flag from earlier testing causing it to think it was already dismissed this session/for 14 days — check what key is used and whether test data left a flag set.
5. Did a later deploy (the duplicate-heading fix, the Agro Forestry nav move, or any other recent change touching the homepage or a shared layout) accidentally remove or break the import/render path?

Once the actual cause is found and fixed, verify with real screenshots in BOTH states: a fresh/incognito browser (banner should show, with the no-spam line and install button) and a simulated standalone/installed context (banner should NOT show). Confirm the iOS fallback instructions render correctly by simulating an iOS Safari user agent.

---

## Phase 3 — Back-button audit across all detail/sub-pages

Systematically check every detail or sub-page built across this project for a way to navigate back without relying on the browser's own back button — this matters especially in PWA standalone mode, where there is no browser chrome at all. Audit at minimum: `/yojana/:slug` (confirmed missing), `/agro-forestry`, `/drone-didi`, `/msp/:crop`, individual article detail pages, individual video detail pages (if they have their own route separate from the grid), and listing detail pages (`/listing/:id`). List every page checked and its current state (has one / missing) in the review doc — do not assume based on this list alone; verify each one directly.

**Build one shared `BackButton` component**, not a per-page patch: a simple, consistently-styled "← वापस" control placed identically on every page (top-left, directly above the page's main heading — the same position and visual treatment everywhere, not five different placements). Behavior: if the browser has in-app navigation history (the user arrived by clicking from within the site), call real browser `history.back()` — do NOT `navigate()` to a hardcoded parent route in this case, since pushing a new route on top of existing history creates a confusing double-back situation (the browser's own back button, or Android's hardware back, would then need pressing twice to actually leave). Only when there is no in-app history at all (the user arrived via a direct link — e.g. a WhatsApp-shared link opened fresh) should it navigate to a sensible fallback route: the relevant category/listing page for listings, `/yojana` for scheme pages, the homepage for anything else. **Test this fallback specifically** by opening a detail page URL directly in a fresh tab (simulating a shared link) and confirming the back button still does something sensible, not nothing — and separately test the in-history case to confirm the browser's own back button still works normally afterward, with no double-back needed.

Apply this component to every page identified in the audit.

---

## Phase 4 — Mandi ticker vertical alignment

The homepage mandi price ticker strip currently shows its text clipped/pushed to the top of the bar rather than vertically centered within it. Fix the ticker's CSS (likely a flex `align-items` or `line-height` issue) so the scrolling text sits vertically centered in the strip at all viewport widths, with no clipping top or bottom. Verify at both 1280px and 375px.

---

## Phase 5 — `/agro-forestry` — add real depth

First, screenshot the current live page and honestly assess against the "too thin" feedback — do not assume what's missing without looking. Likely issues to check: is the hero image actually rendering (or silently broken/blank)? Are the text sections substantive or one-line stubs? Is there a natural next step for a visitor beyond two scheme cards and a link out?

**Improve using only already-verified real content — no new facts, do not invent anything:**
- If the hero image is broken, fix it (re-verify the image file and its rendering, same as Phase 2 of the original Agro Forestry build required).
- Expand the "आपके क्षेत्र में" (South Sagar FDA) section with a bit more of the already-sourced detail from the MP Forest Department FDA document used in the original build, rather than leaving it at one thin sentence.
- **Embed a substantive excerpt from the intercropping article directly on this page** (not just a "पढ़ें →" link out) — pull the article's 40-100 word direct-answer summary and one or two of its key points inline, with a clear "पूरा लेख पढ़ें →" link to the full article for more. Keep this to a short teaser paragraph, not a large reproduced section — the same text appearing at length on both `/agro-forestry` and the article's own page works against the SEO goal both pages exist for (duplicate content competing with itself). This gives the page real content instead of being a pass-through, without undermining the article's own ranking.
- Add a small cross-link section to relevant existing content if any exists: Kisan Sawaal questions tagged with a relevant category, or videos, if any genuinely relate to horticulture/agroforestry topics — only if real matching content exists, do not force irrelevant links.
- Keep the two scheme cards, WhatsApp share, and FAQ section as already built.

---

## Phase 6 — Screenshot self-review + tests (mandatory before deploy)

Screenshots at 1280×800 and 375×812 of: `/sawaal` showing the new grid layout; the homepage with the PWA banner visible in a fresh browser state; a scheme detail page and at least two other audited pages showing the new back button, including one opened directly via URL in a fresh tab to prove the fallback works; the homepage ticker showing correctly centered text; the improved `/agro-forestry` page in full. **View every one.**

Add/update permanent tests: the sawaal grid renders in the expected column count at each breakpoint; the PWA banner shows in a fresh session and is hidden in a simulated standalone context (this test should have existed already — if it did and still passed while the banner was broken in practice, investigate why the test didn't catch the real regression, and fix the test's blind spot too); the back button falls back correctly with no in-app history, and uses real `history.back()` (not a new route push) when history exists; the ticker text is vertically centered (a computed-style check, not just visual). Run the full bilingual audit — every new or changed string across all five phases (sawaal grid labels, banner copy, the back button's own label, agro-forestry's new content) through i18n, no hardcoded single-language text. Re-run the full existing suite, confirm no regressions.

Write `docs/review/SAWAAL_PWA_BACKBUTTON_TICKER_AGROFORESTRY_REVIEW.md` covering all five phases, with Phase 2's actual root-cause finding stated explicitly and Phase 3's full audit table (page → had back button before → has one now).

Commit message: "Sawaal card grid; diagnosed and fixed missing PWA install banner; shared BackButton component audited across all detail pages with direct-link fallback; mandi ticker vertical alignment; Agro Forestry page depth (article excerpt embedded, expanded FDA section); screenshot-reviewed"
