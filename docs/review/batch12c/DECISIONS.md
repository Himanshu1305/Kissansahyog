# Batch 12C — decisions

1. Base: `release-12b` does not exist on origin, so `release-12c` starts from `release-12a` (4ee0d5a). Safety tag `pre-12c-ship` there.
2. **Batch 12A was never shipped to production** (no `prod-12a` tag; the channel link is not on kissansahyog.com). So the 12C ship carries 12A + 12C on top of the live 11A build. The ship script keeps the 11A gate and the 11A rollback target; the 12A markers stay.
3. **Diagnosis, verified on staging (read-only, public key):** 57 distinct market names, all but two written "X APMC" (e.g. "Khurai APMC"). The old 6-entry map used the bare names, so it matched none of them: every mandi showed in English. `commodity_hi` is Hindi on every row (10 crops). The latest day (2026-10-20) is partial (5 rows); full days have 110-126 rows (2026-10-16: 126), so before the fix the ticker rendered that many items, doubled, in 80 s. Staging mandi list: `tests/unit/fixtures/staging-markets-12c.json`.
4. Production data cannot be read (rule), so the labels also work for bare names ("Khurai", "Sagar"): the lookup ignores spaces, case and a trailing "APMC". Fruit-and-vegetable markets ("Sagar(F&V)") get their own label (".. फल-सब्ज़ी मंडी").
5. Crop pick per crop: a local mandi (`is_local`) first, then Sagar, then larger arrivals if the row has them, then name. Deterministic.
6. English mode shows the same Hindi mandi label as Hindi mode (as the six old strings already did); no English transliteration was invented.
7. The reduction is done in the component (`tickerRows`), not in `fetchMandiPrices`, because the home info cards and the admin panel use the full rows.
8. Scroll: the repeat copy is rendered only when the list is wider than the strip; speed 35 px/s, minimum 40 s, set as `--ticker-duration` by a ResizeObserver. Reduced motion: no animation, swipeable, repeat copy hidden.
9. **Staging deploy NOT done:** the auto-mode permission classifier refused `wrangler pages deploy` (treated as a production deploy). Not worked around. Build, unit tests and E2E ran on a local frozen copy of `dist`.
10. `/msp` has no Hindi market-name helper (it shows raw names); `marketLabel` is the one to reuse there later. Not changed (scope: ticker only).
