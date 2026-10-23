# Mandi price history - source note (Batch 15A)

- **What:** monthly Modal prices (rupees per quintal), 2016-01 to 2025-10, for 12 crops (Wheat, Gram, Lentil, Mustard, Barley, Soyabean, Moong, Urad, Paddy(Dhan)(Common), Maize, Garlic, Linseed).
- **Source:** CEDA Agri-Market Data portal, Ashoka University - https://agmarknet.ceda.ashoka.edu.in/ - which republishes Agmarknet data of the Directorate of Marketing & Inspection (DMI), Ministry of Agriculture and Farmers Welfare, Government of India. The portal states no licence; the underlying data is Agmarknet / DMI open government data.
- **Attribution line shown on /msp:** "स्रोत: Agmarknet / DMI (कृषि मंत्रालय, भारत सरकार) के आँकड़े, CEDA अशोका विश्वविद्यालय के ज़रिए।"
- **Fetched:** 2026-10-23, once, by `scripts/fetch-mandi-history.mjs` (Node, run on the builder's machine, one request at a time). The website never calls CEDA.
- **How computed (file `ceda-monthly-2016-2025.json`):**
  - `mp`: the state-level monthly `p_modal` for Madhya Pradesh (state id 23), rounded to a whole rupee.
  - `sagar_division`: for each month, the plain mean of `p_modal` over the five CEDA districts that reported a value above zero that month (Tikamgarh 424, Chhatarpur 425, Panna 426, Sagar 427, Damoh 428), rounded to a whole rupee, with `districts_reporting` = how many districts contributed. Niwari is not a separate district in CEDA. The mean is not weighted by arrivals.
  - Months with no value are left out. Nothing is interpolated or invented.
- **Checked against** a hand-pulled table: see `docs/review/batch15a/DATA_CHECK.md` (all 12 crops match).
- **Loaded into the database** table `mandi_monthly_history` (migration 0069) by `scripts/build-mandi-history-sql.mjs` -> `docs/review/batch15a/history-prod/part-NN.sql`.
- **Gap:** nothing between 2025-11 and 2026-06; our own daily table starts 2026-06-20.
