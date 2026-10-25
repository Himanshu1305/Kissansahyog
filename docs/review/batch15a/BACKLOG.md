# Batch 15A - backlog (things left for later or for a decision)

1. **Harvest months are assumptions.** Owner or Shri A.K. Dixit to confirm. Currently (in `src/content/crops.js`, `harvest_months`):
   - Rabi, March to May: Wheat (gehun), Gram (chana), Lentil (masoor), Mustard (sarson), Garlic (lahsun).
   - Kharif: Soyabean October-November, Paddy (dhan) October-November, Maize (makka) October-November, Moong September-October, Urad September-October.
   The "5 saal ka ausat bunam aaj" block averages exactly these months. Changing a crop's months is a one-line edit.
2. **Gap between 2025-11 and 2026-06.** The history table ends at 2025-10; our own daily table `mandi_prices` starts 2026-06-20. The months in between are missing. Could be filled later from a new CEDA pull (CEDA may already have newer months) or by rolling the daily table up into monthly rows.
3. **Niwari is not a separate district in CEDA.** The "Sagar division" series uses five CEDA districts (Tikamgarh, Chhatarpur, Panna, Sagar, Damoh); Niwari (carved out of Tikamgarh in 2018) is inside Tikamgarh there. The division mean is therefore a mean of five districts, not of the six official division districts.
4. **Refresh is manual.** Idea: re-run `scripts/fetch-mandi-history.mjs`, then `scripts/build-mandi-history-sql.mjs`, and paste only the new part(s) (inserts use `on conflict do nothing`) every quarter; or a GitHub workflow later. Not done in this batch.
5. **CEDA terms are not stated.** The portal publishes no licence. The underlying data is Agmarknet / DMI open government data; we show the attribution line wherever the history appears and never call CEDA from the browser. If CEDA ever states terms, re-check.
6. **Division mean is a plain mean of district Modal prices** (each district counts once, whatever its arrivals). It can differ from an arrivals-weighted price. Said in `data/mandi-history/SOURCE.md`.
7. **Barley and Linseed are loaded but not in the crops catalogue** (needed by Batch 15B); not shown on /msp.
8. **Chart axis labels** in the shared `MonthBars` component are 10 px (existing component, used only by /msp). The values are repeated in plain 14 px text under the chart (highest and lowest month). Could enlarge later.
9. **Month spelling:** the page writes the site's usual spelling for October (the prompt example had a different spelling of the same word).
10. **Admin screen for the history** (upload / refresh) was explicitly not part of this batch.
