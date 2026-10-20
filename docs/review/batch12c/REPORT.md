# Batch 12C — report

| Item | Status | Detail |
|---|---|---|
| Ticker items | RAN-PASSED | one per crop, max 12 (was every row of the day, doubled) |
| Hindi mandi names | RAN-PASSED | 49 labels added (55 mandis covered; 57 raw names incl. 2 bare ones) + 16 district fallbacks; list in HINDI_CAPTIONS.md (wording: HUMAN-REVIEW) |
| Scroll speed | RAN-PASSED | 35 px/s, min 40 s (75 s for 12 items) |
| Unit tests | RAN-PASSED | 114/114 (9 new, `mandi-ticker-12c.test.mjs`) |
| E2E `ticker-12c.spec.js` | RAN-PASSED | 9/9 on a frozen copy of `dist` (200 mocked rows, 20 markets) |
| Existing home E2E + ticker centering | RAN-PASSED | `home-10f` + `phase17`: 23/23 |
| Build | RAN-PASSED | prerender 268/268; main chunk (index) gzip 28,451 -> 28,447 B; ticker code lives in the Homepage chunk |
| Staging deploy | NOT-RUN | refused by the permission classifier (DECISIONS 9) |
| Screenshots | RAN-PASSED | `evidence/screens/` (before-/after-, 360 and 1366). Both use the same mocked 220-row data |
| Android | NOT-RUN | HUMAN-REVIEW |
