# Batch 17B - every Hindi string added or changed (for the Hindi reader to review)

Built from `git diff release-17a` (working tree of release-17b) on every file that contains Hindi: `src/lib/i18n/strings.js`, `src/lib/i18n/adminStrings.js`,
`scripts/morning/strings.hi.js`, `scripts/morning/voice/voiceScript.mjs`, `data/morning/work-rules.json`. The other changed files (`card/render.mjs`, `compose.js`,
`weatherLine.js`, `workRules.js`, `generate.js`, `Mausam.jsx`, ...) contain no new Hindi text a farmer sees (only the match word "छिड़काव" inside the code).

**Counts: 35 strings added, 7 changed, 4 removed (no longer used).**
Placeholders: `{mm}` = millimetres of rain (whole number, at least 1), `{p}` = chance in percent, `{sky}` = a sky word (साफ़ आसमान / कुछ बादल / बादल / कोहरा), `{label}` = a rain-level word from the `rv_level_*` rows.
Where: **site** = a page on kissansahyog.com, **card** = the share image, **message** = the WhatsApp text, **voice** = the spoken note.

## Changed (7)
| File | Key / function | Old Hindi | New Hindi | English meaning | Where |
|---|---|---|---|---|---|
| `data/morning/work-rules.json` | rule `rain_spray` (task) | दवा-खाद का छिड़काव कल पर टालें | दवा-खाद का छिड़काव बारिश रुकने के बाद करें | Spray medicine/fertiliser after the rain stops | card (advice/work box), message (आज का काम), voice |
| `src/lib/i18n/strings.js` | `advice_moderate` | मध्यम बारिश — छिड़काव टालें, कटी फसल सुरक्षित रखें | मध्यम बारिश — छिड़काव बारिश रुकने के बाद करें, कटी फसल सुरक्षित रखें | Moderate rain - spray after the rain stops, keep cut crop safe | site (Homepage rain strip) |
| `src/lib/i18n/strings.js` | `tf_advice_heavy` | आज छिड़काव और कटाई टालें — भारी बारिश की चेतावनी | भारी बारिश की चेतावनी — छिड़काव और कटाई बारिश रुकने के बाद करें | Heavy-rain warning - spray and harvest after the rain stops | site (Homepage "today for the farmer") |
| `scripts/morning/strings.hi.js` | `weatherToday` | ☁️ *आज सागर:* {tmin}–{tmax}°C, {sky}, बारिश की संभावना {rain}% | ☁️ *आज सागर:* {tmin}–{tmax}°C, {wx} | Today Sagar: temperature, then ONE weather phrase (rows below) | message |
| `scripts/morning/strings.hi.js` | `weatherDay` | {tmin}–{tmax}°C, बारिश {rain}% | {tmin}–{tmax}°C, {wx} | Temperature, then one day phrase (`wxDay`) for tomorrow / day after | message |
| `scripts/morning/strings.hi.js` | `rujhanWeather` | अगले दो दिन बारिश की संभावना {rain}% तक है। | अगले दो दिन बारिश हो सकती है (करीब {mm} मिमी तक)। | Rain may come in the next two days (up to about {mm} mm) | message (भाव का रुझान) |
| `scripts/morning/voice/voiceScript.mjs` | `weatherSentences` (spoken weather) | सागर के मौसम का हाल, {आसमान}। दिन में तापमान ... तक जाएगा, और बारिश की संभावना बहुत कम है, सिर्फ़ ... प्रतिशत (or: आज बारिश हो सकती है, संभावना ... प्रतिशत की है / बारिश की संभावना ... प्रतिशत बताई गई है) | {`wxVoice` sentence}। दिन में तापमान ... तक जाएगा। | A natural spoken weather sentence (rows below), then the day's highest temperature | voice |

## Removed (4) - no longer used
`cardRain` (बारिश {rain}%), `cardRainNone` (बारिश नहीं (संभावना {rain}%)), `cardRainMaybe` (बारिश की संभावना {rain}%), `cardRainLikely` (बारिश हो सकती है (संभावना {rain}%)) in `scripts/morning/strings.hi.js`. They were the percentage-only card wording.

## Added (35)
### Site (`src/lib/i18n/strings.js`, `src/lib/i18n/adminStrings.js`)
| File | Key | New Hindi | English meaning | Where |
|---|---|---|---|---|
| `adminStrings.js` | `adm_morning_link` | सुबह की पोस्ट | Morning post | site (admin console button) |
| `strings.js` | `aw_irrig_none` | सिंचाई की ज़रूरत नहीं | No irrigation needed now | site (/mausam Irrigation card, green) |
| `strings.js` | `rv_banner_none_more` | अगले 48 घंटे और बारिश नहीं | No more rain in the next 48 hours | site (/mausam banner) |
| `strings.js` | `rv_banner_drizzle` | अगले 48 घंटे में हल्की बूँदाबाँदी संभव (करीब {mm} मिमी) | Only light drizzle possible in the next 48 hours | site (/mausam banner) |
| `strings.js` | `rv_today_total` | आज का कुल: {label} ({mm} मिमी) | Today's total: {label} ({mm} mm) | site (/mausam badge) |
| `strings.js` | `rv_level_drizzle` | बहुत हल्की बारिश | very light rain | site (/mausam badge) |
| `strings.js` | `rv_level_light` | हल्की बारिश | light rain | site (/mausam badge) |
| `strings.js` | `rv_level_moderate` | मध्यम बारिश | moderate rain | site (/mausam badge) |
| `strings.js` | `rv_level_heavy` | भारी बारिश | heavy rain | site (/mausam badge) |

### Message and card (`scripts/morning/strings.hi.js`) - `wx`, `wxProbless`, `wxDay`, `cardDayDry`
| Key | New Hindi | English meaning | Where |
|---|---|---|---|
| `wx.dry` | {sky}, आज बारिश नहीं | {sky}, no rain today | message, card (weather line) |
| `wx.drizzle` | हल्की बूँदाबाँदी संभव (करीब {mm} मिमी) | Light drizzle possible (about {mm} mm) | message, card |
| `wx.light` | हल्की बारिश संभव, संभावना {p}% (करीब {mm} मिमी) | Light rain possible, {p}% chance (about {mm} mm) | message, card |
| `wx.moderate` | मध्यम बारिश संभव, संभावना {p}% (करीब {mm} मिमी) | Moderate rain possible, {p}% chance | message, card |
| `wx.heavy` | भारी बारिश की चेतावनी, संभावना {p}% (करीब {mm} मिमी) | Heavy-rain warning, {p}% chance | message, card |
| `wxProbless.light` | हल्की बारिश संभव (करीब {mm} मिमी) | Light rain possible (no chance shown) | message, card (when only a day total is known and no chance came with it) |
| `wxProbless.moderate` | मध्यम बारिश संभव (करीब {mm} मिमी) | Moderate rain possible | same |
| `wxProbless.heavy` | भारी बारिश की चेतावनी (करीब {mm} मिमी) | Heavy-rain warning | same |
| `wxDay.dry` | बारिश नहीं | No rain | message ("कल: ... · परसों: ...") |
| `wxDay.drizzle` | हल्की बूँदाबाँदी | Light drizzle | message |
| `wxDay.light` | हल्की बारिश (करीब {mm} मिमी) | Light rain (about {mm} mm) | message |
| `wxDay.moderate` | मध्यम बारिश (करीब {mm} मिमी) | Moderate rain | message |
| `wxDay.heavy` | भारी बारिश (करीब {mm} मिमी) | Heavy rain | message |
| `cardDayDry` | बारिश नहीं | No rain (one day box) | card (3 day boxes) |

### Voice (`scripts/morning/strings.hi.js`) - `wxVoiceSky`, `wxVoice`, `wxVoiceProbless` (numbers are turned into Hindi words by the voice step)
| Key | New Hindi | English meaning | Where |
|---|---|---|---|
| `wxVoiceSky.clear` | सागर में आज आसमान साफ़ रहेगा | The sky will be clear in Sagar today | voice |
| `wxVoiceSky.fewClouds` | सागर में आज आसमान में कुछ बादल रहेंगे | A few clouds in the sky in Sagar today | voice |
| `wxVoiceSky.cloudy` | सागर में आज आसमान में बादल छाए रहेंगे | The sky will stay cloudy in Sagar today | voice |
| `wxVoiceSky.fog` | सागर में आज सुबह कोहरा रहेगा | Fog in Sagar this morning | voice |
| `wxVoice.dry` | {sky}, और आज बारिश नहीं होगी | {sky}, and no rain today | voice |
| `wxVoice.drizzle` | सागर में आज हल्की बूँदाबाँदी हो सकती है, करीब {mm} मिलीमीटर | Light drizzle may fall in Sagar today, about {mm} mm | voice |
| `wxVoice.light` | सागर में आज हल्की बारिश हो सकती है, संभावना {p}% की है, करीब {mm} मिलीमीटर | Light rain may fall, {p}% chance, about {mm} mm | voice |
| `wxVoice.moderate` | सागर में आज मध्यम बारिश हो सकती है, संभावना {p}% की है, करीब {mm} मिलीमीटर | Moderate rain may fall | voice |
| `wxVoice.heavy` | सागर में आज भारी बारिश की चेतावनी है, संभावना {p}% की है, करीब {mm} मिलीमीटर | Heavy-rain warning | voice |
| `wxVoiceProbless.light` | सागर में आज हल्की बारिश हो सकती है, करीब {mm} मिलीमीटर | Light rain may fall, about {mm} mm | voice |
| `wxVoiceProbless.moderate` | सागर में आज मध्यम बारिश हो सकती है, करीब {mm} मिलीमीटर | Moderate rain may fall | voice |
| `wxVoiceProbless.heavy` | सागर में आज भारी बारिश की चेतावनी है, करीब {mm} मिलीमीटर | Heavy-rain warning | voice |

Unchanged Hindi that now appears in new places: the other work-rule tasks ("कटी फसल और अनाज ढककर रखें", "खेत से पानी निकलने की नाली साफ़ रखें", "तेज़ हवा में छिड़काव न करें", "सिंचाई वाले खेत में नमी जाँचें", "पाले का ध्यान रखें: छोटी फसल और नर्सरी ढकें", "बुवाई वाले खेत में नमी जाँचें") keep their exact old words; only the conditions that show them changed (see `DECISIONS.md` section 3).
