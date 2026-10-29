// Phase 3b — the signature "आज किसान के लिए" card content. Pure derivation from
// the already-fetched weather / mandi / msp / rainAlert; all bilingual text is
// pulled through t() (strings live in strings.js) so the i18n audit stays clean.
// Returns { weatherLine, rainLine, priceLine, priceValue, priceNote, priceCaption, priceTone, advice } — priceTone is
// 'above' (green) | 'below' (amber) | null.
import { MANDI_TO_MSP } from '../msp/mspApi'
import { weatherInfo } from '../weather/weatherApi'
import { isImdAlert } from '../weather/rainAlert'
import { tickerRows } from '../mandi/tickerRows.js'
import { marketLabel } from '../mandi/marketNames.js'
import { priceStaleness, ddmm } from '../mandi/staleness.js'

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

const mspOf = (msp, cropEn) => {
  const row = (msp || []).find((m) => m.crop_en === cropEn)
  return row ? Number(row.msp_per_quintal) : null
}
// Batch 16F: the SAME row the mandi strip shows for the crop (tickerRows = one row per crop, the strip's
// own choice of mandi), not rows[0] (which is the cheapest mandi of the division).
const mandiOf = (mandi, cropEn) => {
  const row = tickerRows(mandi?.rows).find((r) => MANDI_TO_MSP[r.commodity_en] === cropEn && r.modal_price != null)
  return row || null
}

// Prefer wheat, then soybean — a crop for which BOTH mandi + MSP exist.
function pickCrop(mandi, msp) {
  for (const [cropEn, labelKey] of [['Wheat', 'hl_crop_wheat'], ['Soyabean', 'hl_crop_soybean']]) {
    const row = mandiOf(mandi, cropEn)
    const sp = mspOf(msp, cropEn)
    if (row && sp != null) return { labelKey, mp: Number(row.modal_price), sp, row }
  }
  return null
}

export function getTodayForFarmer({ weather, mandi, msp, alert, t }) {
  // weatherLine: "24° · बादल छाए"
  const weatherLine = weather?.current_temp != null
    ? `${Math.round(weather.current_temp)}° · ${t(weatherInfo(weather.current_weathercode).key)}`
    : t('weather_unavailable')

  // rainLine: "कल बारिश की संभावना (18 मिमी)" / "अगले 2 दिन बारिश नहीं"
  const rainLine = alert
    ? `${t('tf_rain_tomorrow')} (${alert.perDay?.[0] ?? alert.max48 ?? 0} ${t('mm_unit')})`
    : t('tf_rain_none')

  // advice: reuse the IMD thresholds already in rainAlert.
  let advice
  if (alert && isImdAlert(alert.level)) advice = t('tf_advice_heavy')
  else if (alert) advice = t('tf_advice_rain_soon')
  else advice = t('tf_advice_clear')

  // priceLine: top crop with mandi + MSP, "गेहूं ₹2,580 · MSP ₹2,585 से ₹5 नीचे"
  let priceLine = null
  let priceTone = null
  let priceValue = null
  let priceNote = null
  // Same honest caption as the strip: today -> "Today's price"; otherwise "Yesterday's price (dd/mm)" / "Previous price (dd/mm)".
  let priceCaption = t('tf_price_cap')
  const crop = pickCrop(mandi, msp)
  if (crop) {
    const diff = crop.mp - crop.sp
    priceTone = diff >= 0 ? 'above' : 'below'
    const gap = rs(Math.abs(diff))
    // "गेहूं ₹2,580 · MSP ₹2,585 से ₹5 नीचे" — t() has no interpolation, so
    // assemble from word keys + numbers.
    const mspPart = `MSP ${rs(crop.sp)} ${t('tf_from')} ${gap} ${t(priceTone === 'above' ? 'tf_above_word' : 'tf_below_word')}`
    priceValue = `${t(crop.labelKey)} ${rs(crop.mp)}`
    priceNote = `${marketLabel(crop.row.market, crop.row.district, t)} · ${mspPart}`
    priceLine = `${priceValue} · ${mspPart}`
    const st = mandi?.date ? priceStaleness(mandi.date) : null
    if (st === 'yesterday' || st === 'older') priceCaption = `${t(st === 'yesterday' ? 'mandi_price_yesterday' : 'mandi_price_older')} (${ddmm(mandi.date)})`
  }

  return { weatherLine, rainLine, priceLine, priceValue, priceNote, priceCaption, priceTone, advice }
}
