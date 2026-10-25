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
  festival: '🎉 आज *{name}* है',                         // verified festival of the day
  pollYesterday: 'कल {pct}% साथियों ने "{answer}" कहा',    // {answer} comes from polls.json yes_label of yesterday's question
  pollYesterdayShort: 'कल {pct}% साथियों ने हाँ कहा',      // used when the question has no custom label
  // ---- weather
  weatherToday: '☁️ *आज सागर:* {tmin}–{tmax}°C, {sky}, बारिश की संभावना {rain}%',
  weatherNext: 'कल: {a} · परसों: {b}',                     // next two days, compact
  weatherDay: '{tmin}–{tmax}°C, बारिश {rain}%',
  // ---- aaj ka kaam
  workHeader: '🌾 *आज का काम*',
  workItem: '{n}. {text}',
  // ---- mandi
  mandiHeader: '🛒 *कल की मंडी (सागर संभाग)*',
  mandiHeaderOld: '🛒 *मंडी का भाव (सागर संभाग)* ({date} के भाव)', // used when the data date is older than yesterday
  mandiLine: '{crop}: ₹{price}/क्विंटल {arrow}{delta}',   // arrow ▲ ▼ ▬, delta "₹20"
  mandiBest: 'सबसे ऊँचा भाव: {market} ₹{price}',           // headline crop only
  mandiNone: '🛒 *मंडी*\nमंडी के ताज़ा आँकड़े अभी नहीं आए',
  mandiArrowUp: '▲',
  mandiArrowDown: '▼',
  mandiArrowFlat: '▬',
  mandiSame: 'वैसा ही',
  // ---- MSP line
  mspBelow: '{crop}: MSP ({season}) से ₹{gap} नीचे',       // season like 2026-27
  mspAbove: '{crop}: MSP ({season}) से ₹{gap} ऊपर',
  mspAt: '{crop}: MSP ({season}) के बराबर',
  procurementActive: 'सरकारी खरीद चालू: {details}',         // only with a verified active window
  procurementUntil: '{crop}: {date} तक',                  // default detail of an active procurement window
  procurementAsk: 'MSP से नीचे है। खरीद की जानकारी KVK सागर ({phone}) या कृषि विभाग से पूछें।', // exact wording required
  // ---- bhav ka rujhan
  rujhanHeader: '🔎 *भाव का रुझान*',
  rujhanUp: '{crop} पिछले 3 दिन से बढ़ा है।',
  rujhanDown: '{crop} पिछले 3 दिन से घटा है।',
  rujhanMixed: '{crop} पिछले 3 दिन में ऊपर-नीचे रहा है।',
  rujhanWeather: 'अगले दो दिन बारिश की संभावना {rain}% तक है।',  // plain weather fact, separate sentence
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
  closing2: 'भाव और जानकारी: kissansahyog.com/msp',
  // ---- general
  dataDateLabel: '{d} {m}',                                 // "12 अक्टूबर"
  months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  weekdays: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  tithiNames: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा', 'अमावस्या'],
  // ---- weather words (WMO code groups)
  sky: { clear: 'साफ़ आसमान', fewClouds: 'कुछ बादल', cloudy: 'बादल', fog: 'कोहरा', lightRain: 'हल्की बारिश', rain: 'बारिश', heavyRain: 'तेज़ बारिश', storm: 'आँधी-बिजली' },
  // ---- poll file labels
  pollFileTitle: 'आज का सवाल',
  // ---- card (image)
  cardBrand: 'किसान सहयोग',
  cardWeatherTitle: 'आज सागर का मौसम',
  cardRain: 'बारिश {rain}%',
  cardMaxMin: 'अधिकतम {tmax}° · न्यूनतम {tmin}°',
  cardPriceTitle: 'कल की मंडी ({unit})',
  cardUnit: '₹ प्रति क्विंटल',
  cardFooter: 'KVK सागर: {phone} · kissansahyog.com',
  cardOldNote: '({date} के भाव)',                        // card note when the prices are older than yesterday
  cardNoData: 'आज के आँकड़े अभी नहीं आए',
}

export function fmt(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])))
}
