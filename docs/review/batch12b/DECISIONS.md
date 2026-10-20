# Batch 12B — decisions

1. **Start point.** The prompt said to branch from `release-12a`. `release-12c` (head `936dfcc`, tag `ship-12c`) is release-12a plus the ticker fix, and the 12C ship log shows it is live (deployment `e85e91a0-1674-4726-91e6-1051ebdb47a5`). Branching from 12a would have removed the ticker fix from production, so `release-12b` starts from `release-12c`. Safety tag `pre-12b-ship` is on `936dfcc`.
2. **Ship script gate** is "12C shipped" (tag `ship-12c` on origin, live = the 12C deployment id), not "11A closed", because the 12C close prompt has not been run yet. `KS_EXPECT_LIVE_ID` still overrides.
3. **Card position:** first thing under the mandi ticker (above the hero and everything else on the home page).
4. **Prerender guard:** the prerender step runs the page in a browser on today's date, so the card first leaked into `dist/index.html`. The card now returns nothing when `window.__KS_PRERENDER` is set (the flag the prerender script already sets).
5. **Phone card:** the "from the family" line is hidden below 768 px to keep the card about 88 px (measured 90 px).
6. **Desktop layout fix:** the guide card and the WhatsApp card now sit in the same `.ks-section-inner` column as the hero (layout only). Below 640 px their padding is the same 16 px as before.
7. **Existing tests:** `home-10f.spec.js` and `whatsapp-channel-12a.spec.js` measure button positions on a normal day; they now pre-dismiss the card (localStorage key) so they pass on 20 Oct too.
8. **Picture:** CC0 photo (see IMAGE_LICENSE.md). No fallback illustration needed.
9. **Not done (blocked by the tool permission check, not by a failure):** staging deploy, and the ship-script dry run (it makes live HTTP calls to production). See REPORT.md.
