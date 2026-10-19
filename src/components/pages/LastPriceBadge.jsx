// Batch 10F — the date the /msp prices are from, as a badge farmers cannot miss (founder point 4).
//   price date = today (India)  → green  "आज का भाव · 19 अक्टू"
//   one day old or more         → saffron "अंतिम भाव: 17 अक्टू 2026", a gentle glow that pulses about
//                                 three times on load and then stays as a steady highlight
// Under prefers-reduced-motion it is the steady highlight from the start (index.css .ks-date-badge).
// The colour comes from the real price date; nothing is assumed.
import { useLang } from '../../lib/i18n/LanguageProvider'
import { formatDay, formatDateFull, todayIst } from '../../lib/mandi/mspWindow'

export default function LastPriceBadge({ date, testId = 'last-price-badge' }) {
  const { t, lang } = useLang()
  if (!date) return null
  const isToday = String(date).slice(0, 10) === todayIst()
  const text = isToday
    ? t('msp_badge_today').replace('{date}', formatDay(date, lang))
    : t('msp_badge_last').replace('{date}', formatDateFull(date, lang))
  return (
    <span className={`ks-date-badge ${isToday ? 'ks-date-today' : 'ks-date-old'}`} data-testid={testId} data-date={String(date).slice(0, 10)} data-kind={isToday ? 'today' : 'old'}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      <span>{text}</span>
    </span>
  )
}
