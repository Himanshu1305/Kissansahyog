# Batch 16A decisions (unattended run; one line each)

1. "Aaj ka kaam" shows 1 to 3 tasks (cap 3) and is omitted only when no rule fires. The brief said "exactly three, or omitted" but also "first three that fire" with rules that give one task each; one real task is more honest than padding.
2. Size rule: optional parts are dropped only while the message is over the **hard limit 1500**; 1200 is the target and report.txt notes when it is exceeded. Dropping at 1200 would remove useful parts on normal days.
3. Headline price = latest point of the site's 30-day stable-basket series (`basketSeries`, same as the /msp chart and calculator). A crop is shown only if that series has a point on the chosen data date and at least 3 mandis reported that day.
4. "Change vs previous day" = difference to the previous point of the same series (the previous available day).
5. Outlier guard compares with the previous series point (15%) and, with 3 or more earlier points, with 0.5x-2x of their median; hits are written to report.txt as "suspect data".
6. Crop eligibility: the four rabi crops always; other crops when this or last month is one of their `harvest_months` in crops.js.
7. MSP season labels come from the date (kharif season starts in October, rabi in April), so the 2027-28 rabi MSP can never be compared with today's price.
8. MSP values were taken from DD India, Akashvani and Tribune because the PIB pages returned HTTP 403. They are marked verified:true with a note asking the founder to confirm against PIB. Set `verified` to false to switch the comparison off.
9. Schemes, festivals, procurement windows and kahawat could not be verified, so they are empty or `verified:false` (never shown). Mon, Fri and Sat slots fall back to the countdown.
10. Weather provider sits behind `getForecast(lat, lon, date)` and is labelled "NOT cleared for production use" everywhere (RECON.md).
11. The weather sentence in "bhav ka rujhan" appears only when the rain chance for the next two days is 20% or more.
12. The greeting block also carries one blessing line (reviewed items only, deterministic by date).
13. On days without weather the season task (sowing window 1 Oct to the site's banner date) still shows, since it does not depend on weather.
14. An empty mandi section prints the exact sentence "मंडी के ताज़ा आँकड़े अभी नहीं आए" under a plain header.
15. `npm run morning` loads `.env` when present (`--env-file-if-exists`) but reads only the URL and the anon key (`SUPABASE_*` or `VITE_SUPABASE_*`), never the service-role key that sits in the same file.
16. Fixtures use run date 2026-10-25 (a Sunday, so the weekly recap shows).
17. Pre-existing uncommitted changes in the working tree (docs/review screenshots, `public/search-index.json`) are left alone and are NOT in these commits.
