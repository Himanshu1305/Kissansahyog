# Data freshness at the early hours (01:07, 02:17, 03:17, 04:07 IST)

Found by reading the code and the 0071/0072 migrations. I could NOT query production, so real database contents at those hours are not checked.

## The date
All four tries fall on the same IST date (31 Oct 19:37-22:37 UTC = 1 Nov 01:07-04:07 IST). `run.mjs` uses `istDate()`. The tithi (computed at Sagar sunrise of that IST date), the sowing days left (`daysBetween(IST date, BANNERS.sowing.validUntil)`) and `sowingOpen` all take that IST date. Tests: `morning-17c-ontime.test.mjs`, "IST date, tithi and sowing days left come from the IST date at all four cron times" (three evenings: 31 Oct, 30 Sep -> 1 Oct, 14 Nov -> 15 Nov). Using the UTC date would be one day off; the test asserts that.

## Mandi date
The generator asks for "yesterday" (IST date minus 1) and takes the newest day with prices up to 3 days back (`chooseDate`, `FALLBACK_DAYS = 3`); an older day is labelled in the message. The time of day does NOT change this rule. What changes is which rows exist: `mandi-refresh` runs at minute 5 and 12 of every third hour UTC (0071), i.e. 02:35/02:42 IST is the refresh just before 03:17, and 23:35 IST the last one before 01:07. So at 01:07 IST the data is whatever the 23:35 IST refresh stored; if yesterday's prices are not yet published, the post uses the newest earlier day and says so. Not verifiable here: which day production has at 01:07.
New report.txt line: `mandi date used: <date> (yesterday | older than yesterday)`.

## Weather cache age
`weather_cache_v2` for Sagar is refreshed every 2 hours at minute 20 UTC (0072; "pilot cells always" - I assume Sagar is a pilot cell, not verified). Expected age at each try: 01:07 IST (19:37 UTC) about 1.3 h; 02:17 IST (20:47 UTC) about 0.5 h; 03:17 IST (21:47 UTC) about 1.5 h; 04:07 IST (22:37 UTC) about 0.3 h. Normal worst case is just over 2 h.
Past the 8-hour limit (`CACHE_MAX_AGE_H`): `weatherFromCacheRow` returns null, `loadWeather` tries Open-Meteo directly (which was unreliable from GitHub runners - the reason for the cache), and if that fails the weather part is left out and the report says "weather: OMITTED". Nothing breaks.
New report.txt line: `weather cache age: N.N hours (limit 8)` or `not from the saved forecast`.

## Outputs unchanged
The two lines were added to the report only. Test "report has ... identical to the 17D evidence" proves F1-F6 message text equals `docs/review/batch17d/evidence/message-after-*.txt` and the voice script equals `docs/review/batch17b/evidence/voice-script-*.txt`. Card: see `regeneration-compare.txt` (rendered before the report change; the card is built from the model, which the change does not touch).
