# Batch 10C — report (live Guide demos: register / post / find a number / tour)

Branch `release-10c` (from `release-10a` head `b6a65bf`). Tag `pre-10c-ship` → `3b619d0` (pushed).
**Website only, no database change.** Production was not touched (no SQL, no sign-ups, no deploy; only read-only GETs for the ship snapshot).
Decisions: `DECISIONS.md` · progress: `PROGRESS.md` · tests: `evidence/TESTS.md` · ship: `SHIP.md` · Hindi review: `HINDI_CAPTIONS.md`.

**Overall: STOPPED at the staging upload.** Everything else is built, tested and ready, including the production
ship script (dry run OK). The upload to STAGING (`wrangler pages deploy … --project-name kissansahyog --branch main`)
was blocked by Claude Code's permission system as a "production deploy". The founder runs it (SHIP.md step 1).

## Tasks

| Task | Status | One line |
|---|---|---|
| A — guide feature | DONE | `src/features/guide/`: DemoPlayer (finger, ripple, typing, confetti, Watch / Try-it, Play/Pause, Again, Listen, jump to step, finish card), demos as data (register, post, find), TourExplorer (5 tabs, 6 s rotation, day picker, accordion), hub with field scene, progress ring n / 4, tips, "Kisan Sahyog Mitra" badge + WhatsApp share. Follows the app's हिं/EN switch (preview's own button dropped). |
| B — routes + SEO | DONE | `/guide` and `/guide/:id` lazy routes (unknown id → NotFound); Hindi title, description, h1, canonical per page; added to the prerender list (feeds sitemap + prerender: 268/268), search index, llms.txt. Service worker and `_redirects` needed no change. No structured data. |
| C — help sheet | DONE | `GuideSheet` plays a demo over the page; typed data is kept; ✕, backdrop, Esc and Back close it; scroll lock; focus in and back. Help pills on Signup (top), Login ("पहली बार हैं? रजिस्टर कैसे करें", Register link kept), Post step 1 (small, after the who-is-posting block), Browse ("नंबर कैसे मिलेगा?", in the title row; results do not move). |
| D — entry points | DONE | Welcome card above "नया खाता बनाएं" (above the fold at 360x640), Homepage card in the first screen, Footer link, HowToUse top card, and — founder change — an always-visible turmeric "▶ गाइड" pill in the top bar at every width. |
| E — strings | DONE | 136 `guide_` keys in `strings.js`, Hindi + English. |
| F — tests | DONE | 35 new e2e (30 guide + 5 etag) + 9 unit tests all pass; regression: same 23 old failures, nothing new; slow phone and battery checks pass. |
| H — Browse tag in the web address | DONE | `etag` follows the chip taps (history replace), deep link / refresh keep it, unknown value ignored. |
| I — Hindi caption sheet | DONE | `HINDI_CAPTIONS.md` (283 rows: every step caption and screen label, Hindi + English). Hindi wording: **HUMAN-REVIEW**. |
| G — staging + ship prep | PARTLY | Staging build OK; staging upload NOT-RUN (blocked); tag + push done; prod ship script dry run OK. |

## Top bar: what was changed to make room for the "गाइड" pill

- Phones: smaller gaps (8→4 px), हिं/EN switch 77→61 px wide, search icon 38→30 px, ☰ button 36→32 px, pill text 12 px.
  Nothing removed at 360 px and up when logged out.
- Below 360 px (and below 412 px when logged in): the round logo picture is hidden; the name "किसान सहयोग" stays and still goes home.
  (Side effect: the name is now fully readable at 320 px; before it was cut.)
- Tablet: the inline search box 144→112 px; a logged-in user's name beside the avatar hides at 768–1535 px.
- Desktop 1024–1279 px: the "उपयोगी संपर्क ▾" menu moves into "और ▾" (More). From 1280 px it is back in the row. Slightly smaller item padding at 1280–1679 px.
- No horizontal overflow at 320–1440 px, Hindi and English; header height unchanged.

## Where the demos differ from the preview (the real app wins; details in DECISIONS.md)

- **Register:** no OTP (shown only when `GUIDE_OTP_LIVE` is true); email + password are required; village picked from a list; "show my details" box starts ticked; real notice text; button "स्वीकार करें और आगे बढ़ें".
- **Post:** farmer already chosen; category tiles + offer/need on step 1; machine type, brand and rent basis are dropdowns; tags not auto-picked for a plain Tractor; real labels ("निर्माण वर्ष", "ट्रैक्टर की अश्वशक्ति (HP)"); step 3 has the real consent boxes; button "जमा करें"; login needed.
- **Find:** no "संपर्क देखें" button — the real path is "कॉल करें" → login if needed → sheet with caution, name, number, Call / WhatsApp; equipment chip pre-selected, no "all".
- **Tour:** weather days are a sample picture of the real 7-day table; tabs link to `/msp`, `/mausam`, `/yojana`, `/sawaal`, `/browse`.

## Tests (honest statuses)

| Check | Status | Numbers |
|---|---|---|
| New guide e2e (`e2e/guide-10c.spec.js`, 360 + 412, hi + en; 320/1024 for overflow) | RAN-PASSED | 30/30 |
| Browse etag e2e | RAN-PASSED | 5/5 |
| Unit (`node --test "tests/unit/*.test.mjs"`, OTP flag both values + demo integrity) | RAN-PASSED | 9/9 |
| Full e2e regression vs 10A | RAN-PASSED | 70 passed / 23 failed — the 23 are exactly the 10A set (diff empty, checked twice) |
| Slow phone (360x640, CPU 4x, 1.6 Mbps / 150 ms) | RAN-PASSED | hub usable 2.8 s (target 4); longest task during play 141 ms (target 300); guide chunks 16.7 KB gz (target 40); every demo finishes, no skipped step |
| Battery / data care | RAN-PASSED | loops pause when hidden or off screen; transform/opacity only; data saver → static hero, no tour rotation; reduced motion → no finger/confetti |
| No backend calls from guide code | RAN-PASSED | guide pages only make the app shell's two reads (`site_settings`, `places`); 0 failed |
| Help sheet keeps typed data; Back closes it (browser) | RAN-PASSED | |
| Help sheet Back on the Android app | HUMAN-REVIEW | uses the app's existing `useNativeBack`; verified by reading code only |
| Staging build (`build:full`, guard before + after) | RAN-PASSED | 268/268 prerendered, no production reference |
| Staging upload + re-test on staging | NOT-RUN | blocked by the permission system (see top) |
| Prod ship dry run | RAN-PASSED | exit 0, `DRY RUN OK` |
| Real prod ship | NOT-RUN | founder runs it |
| `npm run lint` | RAN-FAILED (pre-existing) | ESLint not installed (same as 10A) |
| Hindi wording | HUMAN-REVIEW | `HINDI_CAPTIONS.md` |
| Browse title next to the help pill | HUMAN-REVIEW | English "Browse nearby" is cut to "Browse nea…" at ≤ 360 px; Hindi fine at 360/412, cut at 320 |

Screenshots: `evidence/screens/` (100 images, guide pages + every entry point, 360/412, hi/en). I looked at about a dozen
across tasks (hub, register mid-play, signup sheet, Browse head in English, nav at 360 and 1024, Welcome) and the
test agent looked at 10 (`evidence/SCREENS.md`): no overlap, clipped Hindi or sideways scroll, apart from the Browse title
note above. Full-page captures show the fixed bottom bar mid-image (capture artefact, as in 10A).

## Bundle (gzip -9, staging build)

| Chunk | Before | After | Change |
|---|---|---|---|
| main `index-*.js` | 27,156 | 27,391 | **+235 B** |
| `LanguageProvider-*.js` (holds `strings.js`, loaded on every page) | 56,143 | 61,207 | +5.0 KB — HUMAN-REVIEW (rule 4 puts all text in strings.js) |
| main CSS `index-*.css` | 11,938 | 12,305 | +367 B |
| guide route (lazy) | — | ~17 KB | under the 40 KB target |

Found and fixed: Tailwind was scanning the untracked `design/` folder (your new `design/reference/`), adding ~1.7 KB gz
of unused CSS to every page in builds made from the working folder (including the prod ship). `src/index.css` now
tells Tailwind to skip `design/`; your files are untouched.

## Numbers

- Code head + tag `pre-10c-ship`: `3b619d0`. Staging deployment: none yet (blocked).
- Live production: `0845c733-e8d0-4553-957c-10f3db23ecca` (Batch 10A, source `17d77e8`), confirmed by the dry run.

## Commands (founder)

```
# 1. staging (blocked for the AI)
node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true
# 2. production
bash scripts/ship-prod-10c.sh 2>&1 | tee docs/review/batch10c/evidence/ship-real.log
# undo
bash scripts/rollback-prod-10c.sh 0845c733-e8d0-4553-957c-10f3db23ecca
```

## Not done on purpose

- OTP steps stay hidden: flip `GUIDE_OTP_LIVE` to `true` in `src/features/guide/config.js` when OTP signup goes live (10B).
- Recorded audio (Listen uses the phone's built-in voice for now).
- Close-out steps (live checks, tag `prod-10c`, project notes) — `BATCH10C_CLOSE_PROMPT.md` after the ship.
