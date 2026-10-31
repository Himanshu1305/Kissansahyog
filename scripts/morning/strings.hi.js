// Batch 16A - EVERY Hindi phrase of the daily morning message lives in this one file. Reword here, never in logic files.
// Placeholders look like {name}. Keep the spoken, simple style (what a farmer would say). The rules in
// BATCH16A_DAILY_MORNING_MESSAGE_PROMPT.md section 1 and 6 still apply: no "जी", no sell/hold/buy advice, no price prediction.
export const S = {
  // ---- greeting block (message top)
  greeting: '🙏 *सीताराम किसान भाइयो-बहनो!*',          // exact text required; used as the first line
  tithi: 'आज {paksha} की {tithi}',                       // {paksha} = शुक्ल पक्ष / कृष्ण पक्ष, {tithi} = tithi name
  tithiBold: 'आज *{paksha} की {tithi}*',                 // used for एकादशी, अमावस्या, पूर्णिमा
  tithiPoornima: 'आज *पूर्णिमा*',                         // used on पूर्णिमा (no paksha word)
  tithiAmavasya: 'आज *अमावस्या*',                         // used on अमावस्या
  pakshaShukla: 'शुक्ल पक्ष',
  pakshaKrishna: 'कृष्ण पक्ष',
  dateLine: '📅 {day}, {d} {m}',                          // Batch 17D: weekday, day, month of the post's IST date; the tithi follows after ' · '
  dateTithiSep: ' · ',
  tithiShort: '{paksha} {tithi}',                       // Batch 17D: tithi on the date line, no 'आज', no 'की'
  tithiShortBold: '*{paksha} {tithi}*',
  festival: '🎉 आज *{name}* है',                         // verified festival of the day
  pollYesterday: 'कल {pct}% साथियों ने "{answer}" कहा',    // {answer} comes from polls.json yes_label of yesterday's question
  pollYesterdayShort: 'कल {pct}% साथियों ने हाँ कहा',      // used when the question has no custom label
  // ---- weather
  weatherHeading: '☁️ *आज सागर का मौसम*',                   // Batch 17D layout: heading, then a temperature line, a rain line, then the next two days
  weatherTemp: '🌡️ {tmin}–{tmax}°C',                      // + ' · {sky}' when the day is dry (the sky word has no rain wording of its own)
  weatherTempSky: '🌡️ {tmin}–{tmax}°C · {sky}',
  weatherRain: '💧 {rain}',                                 // {rain} = the rain part of the ONE phrase from lib/weatherLine.js (S.wx below)
  weatherNext: 'कल: {a} · परसों: {b}',                     // next two days, compact
  weatherNextTwo: ['कल: {a}', 'परसों: {b}'],              // used when the two days do not fit on one short line
  weatherDay: '{tmin}–{tmax}°C, {wx}',                     // a day whose temperatures differ from today's; {wx} = S.wxDay phrase
  weatherDayRainOnly: '{wx}',                              // a day whose temperatures equal today's: the numbers are shown once, above
  // ---- aaj ka kaam
  workHeader: '🌾 *आज का काम*',
  workItem: '✅ {text}',
  // ---- mandi
  mandiHeader: '🛒 *कल की मंडी · सागर संभाग*',
  mandiHeaderOld: '🛒 *मंडी का भाव · सागर संभाग* ({date} के भाव)', // used when the data date is older than yesterday
  mandiLine: '▪️ *{crop}* ₹{price}/क्विंटल {arrow}{delta}',   // one entry per crop; arrow ▲ ▼ ▬, delta "₹20"; the MSP gap goes right under it
  mandiBest: '🏆 सबसे ऊँचा {crop} भाव: {market} ₹{price}',   // headline crop only, after the last crop entry
  mandiNone: '🛒 *मंडी*\nमंडी के ताज़ा आँकड़े अभी नहीं आए',
  mandiArrowUp: '▲',
  mandiArrowDown: '▼',
  mandiArrowFlat: '▬',
  mandiSame: 'वैसा ही',
  // ---- MSP line
  mspBelow: '    MSP ({season}) से ₹{gap} नीचे',            // season like 2026-27; indented under its crop entry
  mspAbove: '    MSP ({season}) से ₹{gap} ऊपर',
  mspAt: '    MSP ({season}) के बराबर',
  noteMark: 'ℹ️ ',                                         // Batch 17D: prefix of the procurement / ask-KVK lines (their wording below is unchanged)
  procurementActive: 'सरकारी खरीद चालू: {details}',         // only with a verified active window
  procurementUntil: '{crop}: {date} तक',                  // default detail of an active procurement window
  procurementAsk: 'MSP से नीचे है। खरीद की जानकारी KVK सागर ({phone}) या कृषि विभाग से पूछें।', // exact wording required
  // ---- bhav ka rujhan
  rujhanHeader: '📈 *भाव का रुझान*',
  rujhanUp: '{crop} पिछले 3 दिन से बढ़ा है।',
  rujhanDown: '{crop} पिछले 3 दिन से घटा है।',
  rujhanMixed: '{crop} पिछले 3 दिन में ऊपर-नीचे रहा है।',
  rujhanWeather: 'अगले दो दिन बारिश हो सकती है (करीब {mm} मिमी तक)।',  // plain weather fact, separate sentence; only when light rain or more is expected
  rujhanDisclaimer: '(यह रुझान है, पक्की बात नहीं।)',      // fixed line, exact
  // ---- rotating slot
  slotScheme: '📋 *योजना की खबर*',
  slotSchemeLine: '{title} - {who}',
  slotSchemeDeadline: 'आख़िरी तारीख़: {date} ({days} दिन बाकी)',
  slotSchemeSource: 'स्रोत: {source}',
  slotCountdown: '⏳ *{text}*',
  countdownSowing: 'रबी बुवाई की खिड़की में {days} दिन बाकी',
  countdownScheme: '{title}: {days} दिन बाकी',
  slotSaving: '💡 *आज की बचत*',
  slotGyaan: '📘 *मंडी का ज्ञान*',
  slotKahawat: '🗣️ *आज की कहावत*',
  slotRecap: '📊 *इस हफ़्ते का हाल*',
  recapLine: '{crop}: इस हफ़्ते {arrow}{delta}',            // facts only
  recapLineFlat: '{crop}: इस हफ़्ते लगभग वैसा ही',
  // ---- closing
  closing1: '🗳️ आज का सवाल नीचे पोल में 👇',
  closing2: '🌐 kissansahyog.com/msp',
  // ---- general
  dataDateLabel: '{d} {m}',                                 // "12 अक्टूबर"
  months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  weekdays: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  tithiNames: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा', 'अमावस्या'],
  // ---- weather words (WMO code groups)
  sky: { clear: 'साफ़ आसमान', fewClouds: 'कुछ बादल', cloudy: 'बादल', fog: 'कोहरा', lightRain: 'हल्की बारिश', rain: 'बारिश', heavyRain: 'तेज़ बारिश', storm: 'आँधी-बिजली' },  // Batch 17B: the weather phrase only ever uses clear/fewClouds/cloudy/fog from here (lib/weatherLine.js)
  // ---- Batch 17B: the one weather phrase (lib/weatherLine.js picks by the rain level; {sky} is a sky word above)
  wx: {
    dry: '{sky}, आज बारिश नहीं',
    drizzle: 'हल्की बूँदाबाँदी संभव (करीब {mm} मिमी)',
    light: 'हल्की बारिश संभव, संभावना {p}% (करीब {mm} मिमी)',
    moderate: 'मध्यम बारिश संभव, संभावना {p}% (करीब {mm} मिमी)',
    heavy: 'भारी बारिश की चेतावनी, संभावना {p}% (करीब {mm} मिमी)',
  },
  wxProbless: {   // used when only a day total is known and no chance (%) came with it
    light: 'हल्की बारिश संभव (करीब {mm} मिमी)', moderate: 'मध्यम बारिश संभव (करीब {mm} मिमी)', heavy: 'भारी बारिश की चेतावनी (करीब {mm} मिमी)',
  },
  wxDay: { dry: 'बारिश नहीं', drizzle: 'हल्की बूँदाबाँदी', light: 'हल्की बारिश (करीब {mm} मिमी)', moderate: 'मध्यम बारिश (करीब {mm} मिमी)', heavy: 'भारी बारिश (करीब {mm} मिमी)' },
  // spoken (voice) sentences - natural speech, no abbreviations; {mm} {p} are digits that the voice step turns into Hindi words
  wxVoiceSky: { clear: 'सागर में आज आसमान साफ़ रहेगा', fewClouds: 'सागर में आज आसमान में कुछ बादल रहेंगे', cloudy: 'सागर में आज आसमान में बादल छाए रहेंगे', fog: 'सागर में आज सुबह कोहरा रहेगा' },
  wxVoice: {
    dry: '{sky}, और आज बारिश नहीं होगी',
    drizzle: 'सागर में आज हल्की बूँदाबाँदी हो सकती है, करीब {mm} मिलीमीटर',
    light: 'सागर में आज हल्की बारिश हो सकती है, संभावना {p}% की है, करीब {mm} मिलीमीटर',
    moderate: 'सागर में आज मध्यम बारिश हो सकती है, संभावना {p}% की है, करीब {mm} मिलीमीटर',
    heavy: 'सागर में आज भारी बारिश की चेतावनी है, संभावना {p}% की है, करीब {mm} मिलीमीटर',
  },
  wxVoiceProbless: { light: 'सागर में आज हल्की बारिश हो सकती है, करीब {mm} मिलीमीटर', moderate: 'सागर में आज मध्यम बारिश हो सकती है, करीब {mm} मिलीमीटर', heavy: 'सागर में आज भारी बारिश की चेतावनी है, करीब {mm} मिलीमीटर' },
  // ---- poll file labels
  pollFileTitle: 'आज का सवाल',
  // ---- card (image)
  cardBrand: 'किसान सहयोग',
  cardWeatherTitle: 'आज का मौसम · सागर',
  cardMaxMin: 'अधिकतम {tmax}° · न्यूनतम {tmin}°',
  cardPriceTitle: 'मंडी भाव · {unit} ({date})',
  cardUnit: '₹ प्रति क्विंटल',
  cardFooter: 'पूरी जानकारी: kissansahyog.com · जय किसान',
  cardGreeting: 'सीताराम किसान भाइयो!',
  cardSub: '{day}, {d} {m} · सागर संभाग',
  weekdaysShort: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  cardWind: 'हवा {wind} किमी/घंटा',
  cardDayRain: 'बारिश {mm} मिमी',
  cardDayDry: 'बारिश नहीं',
  cardBestMandi: 'ऊँचा: {market}',
  cardToday: 'आज',
  cardSchemeTitle: 'आज की योजना · {title}',
  cardTaskTitle: 'आज का काम',
  cardTipTitle: 'आज की सलाह',
  cardOldNote: '({date} के भाव)',                        // card note when the prices are older than yesterday
  cardNoData: 'आज के आँकड़े अभी नहीं आए',
}

export function fmt(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])))
}
