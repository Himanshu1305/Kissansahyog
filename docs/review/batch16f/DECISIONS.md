# Batch 16F decisions

1. The tile's crop row comes from `tickerRows(mandi.rows)` (the strip's own function), then the first of wheat, soybean that also has an MSP.
2. Reused existing word keys only (`tf_price_cap`, `mandi_price_yesterday`, `mandi_price_older`, `tf_from`, ...). No new string keys were needed, so `strings.js` is untouched.
3. The older-than-yesterday caption uses the existing key `mandi_price_older` ("पिछला भाव" / "Previous price"), exactly what the strip shows, instead of the prompt's "Last price", so tile and strip never disagree.
4. `getTodayForFarmer` reads `mandi.date` (already returned by `fetchMandiPrices`), so the Homepage call is unchanged. New return fields: `priceValue`, `priceNote`, `priceCaption`; `priceLine` is kept as before.
5. The mandi name uses `marketLabel`, which gives the Hindi name in both languages (same as the strip).
6. Ship scripts: copied from the 16B scripts (the latest website ship, live deployment 6cf93531...). The generator is `scripts/batch16f/make-ship-scripts.mjs` (one-off). The 16B read-only probe stays as a regression check; it writes nothing.
7. Test-only loader `tests/unit/fixtures/loader-16f.mjs` lets Node import `forFarmer.js` (extensionless imports, browser Supabase client stubbed).
8. No separate i18n audit script exists in the repo; the unit suite checks hi/en parity and this batch adds no keys.
