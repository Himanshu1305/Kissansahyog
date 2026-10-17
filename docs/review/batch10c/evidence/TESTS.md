# Batch 10C — Task F test results

All runs local: `vite build --mode staging` served by `npx vite preview --port 4173`, against STAGING data.
E2E via `node --env-file=.env node_modules/@playwright/test/cli.js test …` (rule 0.9). Nothing written to staging
by the new tests (visitor writes blocked; `/post` reached with a FAKE local session, never past step 1).
Windows note: every Playwright run ends with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` from libuv
AFTER the report and teardown (exit code 127); results are unaffected.

| # | Check | Status | Numbers | Evidence |
|---|---|---|---|---|
| unit | OTP flag both values + demo integrity (`node --test "tests/unit/*.test.mjs"`) | RAN-PASSED | 9/9: shipped flag false → 0 OTP steps/nodes; `otpLive:true` → Send OTP, 6-digit code, verified (2 extra steps, 3 nodes); every step target exists on the screen showing at that step and is not hidden; every reveal/hide/go id exists; every strings.js key used by register/post/find exists in hi + en | `tests/unit/guide-otp.test.mjs`, `unit.txt` |
| F.1 | `/guide` 4 cards, no ErrorBoundary, no console errors, no failed backend requests (+ all 4 demo pages) | RAN-PASSED | 4/4 (hi/en × 360/412). Backend calls seen on guide pages: `GET /rest/v1/site_settings`, `GET /rest/v1/places` (+ CORS preflights) — the app shell; the control page `/about` makes the same two plus `get_public_feedback`. Guide pages ask for nothing the shell does not; 0 failed; guide chunks contain no `fetch`/XHR/beacon/supabase (static check) | `e2e/guide-10c.spec.js` F1, `e2e-guide.txt` (NOTE lines) |
| F.2 | each demo plays to the finish at speed 40, marks done, hub 4 / 4, badge | RAN-PASSED | 4/4; every `data-step` 0..n-1 seen in order (register 9, post 14, find 8), tour finishes; `ks_guide_done_v1` set; badge unlocked; badge name not in the WhatsApp link | F2 |
| F.3 | try-it: target advances, elsewhere does not | RAN-PASSED | 4/4; taps on other fields / caption leave step 0; tap and Enter on target advance | F3 |
| F.4 | jump to a later step shows the right state | RAN-PASSED | 4/4; for register/post/find: two jumps each (middle + last tappable step) — step number, screen id, target node, done/current marks and hidden nodes all match `engine.stateBefore` | F4 |
| F.5 | no OTP with `GUIDE_OTP_LIVE=false`; OTP when true | RAN-PASSED | e2e: 0 `[data-otp="1"]` on `/guide/register` (start, jumps, finish) and in the Signup sheet; `true` covered by the unit test | F4, F6, unit |
| F.6 | GuideSheet on /signup keeps typed name + mobile; Back closes, stays | RAN-PASSED | 4/4; closed by ✕, by finish-card Close, by browser Back — values intact, still `/signup`; next Back leaves to the previous page (sheet entry consumed) | F6 |
| F.7 | entry points exist and go to the right demo | RAN-PASSED | 4/4; welcome→/guide/register, home→/guide, nav pill on / and /browse→/guide, footer→/guide, how-to-use→/guide, help pills: signup + login→register sheet, browse→find sheet, post (fake session)→post sheet; demo "real app" links /signup, /login?next=%2Fpost, /browse | F7 |
| F.8 | no sideways overflow at 320/360/412/1024 on all 5 guide pages; Hindi not clipped | RAN-PASSED | 2/2 (hi, en) × 4 widths × 5 pages (finished state) + tour FAQ open: 0 problems (document scrollWidth, any guide element outside the viewport, any text element clipping with overflow hidden / ellipsis / line clamp, mock screen sideways scroll) | F8 |
| F.9 | full e2e regression vs 10A after-state | RAN-PASSED | 93 tests: **70 passed, 23 failed**; the 23 are EXACTLY the 10A set (diff empty); no new failure, none fixed; +5 passed are the new etag spec. (Run started before `guide-10c.spec.js` existed, so that spec ran separately.) 8.4 min, teardown cleaned test data | `e2e-full.txt`, `e2e-failed.txt` |
| F.10 | slow phone (360x640, CPU 4x, ~1.6 Mbps/150 ms, cold) | RAN-PASSED | hub visible 2.8 s (target 4 s); demo screen 3.2–3.7 s; play-through at normal speed: register 37.9 s, post 60.2 s, find 28.1 s, tour 24.6 s, all steps in order, all finished; long tasks > 200 ms during play: 0, longest 141 ms (target 300); `/guide/:id` guide chunks 16.7 KB gz (target 40) | `scripts/batch10c/slow-phone.mjs`, `slow-phone.md`, `slow-phone.json` |
| F.11 | battery / data care | RAN-PASSED | 4/4: hub scene `data-motion` on→paused when scrolled away and when `visibilityState=hidden`, back on; tour `data-auto` off while hidden and while pushed off screen, no rotation during 7 s; animated properties sampled: hub transform only (ksg-spin/sway/drive), tour transform+opacity, demo mid-play transform+opacity (finger transition, caption pop, cursor blink); saveData → hero `static`, no loop animations, tour does not rotate, all 3 demos finish in order; reduced motion → hero static, no tour rotation, finger never shown, no confetti, steps reach the end | F11 (`e2e-guide.txt`) |
| F.12 | Browse etag spec | RAN-PASSED | 5/5 (in the full run and again with the guide spec) | `e2e/guide-10c-browse-etag.spec.js` |
| bundle | main chunk / strings chunk / guide chunks | RAN-PASSED (main), HUMAN-REVIEW (strings) | index 27,156 → 27,391 gz (+235 B); LanguageProvider 56,143 → 61,207 gz (+5.0 KB, guide strings, DECISIONS A-46); total eager +5.98 KB gz (+2.5 %); demo route ~17 KB gz | `bundle-after.md` |
| screens | screenshots + visual check | RAN-PASSED | 100 shots; 10 looked at; no new problem (known: Browse English title truncation ≤ 360 px, C6) | `screens/`, `SCREENS.md` |

New e2e totals: `e2e/guide-10c.spec.js` 30 tests (+5 etag) — **35 passed, 0 failed** (`e2e-guide.txt`).

Not run: Android hardware Back on a device for the sheet (HUMAN-REVIEW, from Task C). No source code was changed in Task F.

Found during F (for task G): untracked `design/reference/` adds ~1.7 KB gz of unused classes to the app CSS when the
build runs in the working folder (Tailwind v4 scans untracked files). Build the release from a clean checkout. Details
in `bundle-after.md`.
