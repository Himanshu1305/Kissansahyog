# Batch 17D - Hindi strings for the reviewer

## /admin/morning (`src/lib/i18n/morningStrings.js`)

| Key | Hindi | English meaning | Where shown |
|---|---|---|---|
| `mp_share_card_msg` | कार्ड + संदेश शेयर करें | Share card + message | Green button; copies the message, then opens the share sheet with the card and the text |
| `mp_share_voice` | आवाज़ शेयर करें | Share voice | Green button, only when a voice exists; shares the mp3 alone |
| `mp_share_help` | पहले कार्ड भेजें, फिर आवाज़। दो बार शेयर करना होगा। | Send the card first, then the voice. You have to share twice. | Small line above the two buttons |
| `mp_share_copied_note` | संदेश कॉपी हो गया। WhatsApp में कैप्शन खाली दिखे तो वहाँ दबाकर पेस्ट करें। | Message copied. If WhatsApp shows the caption empty, press and hold there and paste. | Under the card button, only after the copy really worked |
| `mp_share_failed` | शेयर नहीं हो सका। नीचे डाउनलोड से कार्ड और आवाज़ रखकर WhatsApp से भेजें। | Could not share. Download the card and voice below and send them from WhatsApp. | Red line under the buttons, after any share failure other than closing the share sheet |
| `mp_share_all_hint` (unchanged) | फ़ोन पर यह शेयर-शीट खोलता है। कंप्यूटर पर कार्ड और आवाज़ डाउनलोड करें। | On a phone this opens the share sheet; on a computer use Download. | Instead of the buttons when the browser has no share |
| `mp_share_all` (removed) | कार्ड + आवाज़ शेयर करें | (old combined button) | gone |

## The morning message (`scripts/morning/strings.hi.js`)

| Key | Hindi | Meaning | Where |
|---|---|---|---|
| `dateLine` | 📅 {day}, {d} {m} | weekday, day month | 2nd line of the message |
| `dateTithiSep` | ` · ` | separator | between date and tithi |
| `tithiShort` / `tithiShortBold` | {paksha} {tithi} / *{paksha} {tithi}* | e.g. कृष्ण पक्ष पंचमी (bold for एकादशी) | date line (replaces `आज कृष्ण पक्ष की पंचमी`) |
| (blessing) | _अन्नदाता सुखी भव 🌾_ | same text, italic | under the date |
| `weatherHeading` | ☁️ *आज सागर का मौसम* | Today's weather, Sagar | weather block heading |
| `weatherTemp` / `weatherTempSky` | 🌡️ {tmin}–{tmax}°C / ... · {sky} | temperature (and the sky word on a dry day) | weather block line 2 |
| `weatherRain` | 💧 {rain} | the rain sentence, word for word as before (e.g. आज बारिश नहीं; हल्की बारिश संभव, संभावना 90% (करीब 8 मिमी)) | weather block line 3 |
| `weatherNext` / `weatherNextTwo` | कल: {a} · परसों: {b} / कल: {a} + परसों: {b} on two lines | tomorrow / day after | last weather line(s); a day's temperatures are shown only if different from today's |
| `workItem` | ✅ {text} | task | under आज का काम (no numbers now) |
| `mandiHeader` | 🛒 *कल की मंडी · सागर संभाग* | yesterday's mandi, Sagar division | mandi heading (· instead of brackets) |
| `mandiLine` | ▪️ *{crop}* ₹{price}/क्विंटल ▲₹{delta} | one entry per crop | mandi block |
| `mspBelow` / `mspAbove` / `mspAt` | (4 spaces)MSP ({season}) से ₹{gap} नीचे / ऊपर / के बराबर | gap to MSP, under its crop | under each crop |
| `mandiBest` | 🏆 सबसे ऊँचा {crop} भाव: {market} ₹{price} | highest price of the lead crop, now names the crop | after the last crop |
| `noteMark` | ℹ️ | prefix of the MSP-ask / procurement lines; their wording is unchanged | before `MSP से नीचे है। खरीद की जानकारी KVK सागर (...) या कृषि विभाग से पूछें।` |
| `rujhanHeader` | 📈 *भाव का रुझान* | emoji changed from 🔎 | trend block |
| (disclaimer) | _(यह रुझान है, पक्की बात नहीं।)_ | same words, italic | trend block |
| `closing2` | 🌐 kissansahyog.com/msp | was `भाव और जानकारी: kissansahyog.com/msp` | last line |

Unchanged wording: greeting, rain phrases (`wx`, `wxDay`), task texts, KVK line, disclaimer, `आज का सवाल नीचे पोल में 👇`, countdown line.
