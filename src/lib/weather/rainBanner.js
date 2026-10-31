// Batch 17B - the /mausam rain banner and the "today's total" badge text, both read from the one rain verdict.
import { bannerKind, DRY_BELOW_MM } from './rainVerdict.js'

const mmText = (n) => String(Math.round(n * 10) / 10)

// -> { kind, text }   kind: 'none' | 'none_more' | 'drizzle' | 'rain'
export function bannerText(v, t) {
  const kind = bannerKind(v)
  if (kind === 'none') return { kind, text: t('mausam_no_rain_48') }
  if (kind === 'none_more') return { kind, text: t('rv_banner_none_more') }
  if (kind === 'drizzle') return { kind, text: t('rv_banner_drizzle').replace('{mm}', mmText(v.mm48h)) }
  const mm = Math.round(v.nextRainMm || v.mm48h)
  const when = v.nextRainInHours == null ? '' : `: ${v.nextRainInHours === 0 ? t('mausam_rain_now') : `${v.nextRainInHours} ${t('hours_short')} ${t('mausam_rain_after')}`}`
  return { kind, text: `${t('mausam_rain_next')}${when} ~${mm} ${t('mm_unit')}` }
}

// Today's whole-day total (rain that already fell included) - shown only when it is drizzle or more.
export function todayTotalText(v, t) {
  if (v.todayTotalMm < DRY_BELOW_MM) return null
  return t('rv_today_total').replace('{label}', t(`rv_level_${v.todayTotalLevel}`)).replace('{mm}', mmText(v.todayTotalMm))
}
