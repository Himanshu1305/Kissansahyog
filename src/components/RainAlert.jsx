import { useLang } from '../lib/i18n/LanguageProvider'
import { isImdAlert } from '../lib/weather/rainAlert'

// Per-level presentation (ascii only). Strip bg: blue for light/moderate, amber
// for heavy (Yellow), orange for very_heavy, red for extreme.
const META = {
  light: { dot: '🟢', bg: 'bg-sky-100 text-sky-900' },
  moderate: { dot: '🔵', bg: 'bg-blue-100 text-blue-900' },
  heavy: { dot: '🟡', bg: 'bg-amber-300 text-amber-950', imd: 'imd_yellow' },
  very_heavy: { dot: '🟠', bg: 'bg-orange-300 text-orange-950', imd: 'imd_orange' },
  extreme: { dot: '🔴', bg: 'bg-red-400 text-red-950', imd: 'imd_red' },
}

// Rich, actionable rain alert. `alert` = getRainAlert(...) output or null.
export default function RainAlert({ alert, className = '' }) {
  const { t } = useLang()
  if (!alert) return null
  const m = META[alert.level] || META.light
  const imd = isImdAlert(alert.level)
  const daysWord = alert.days === 1 ? t('rl_day1') : t('rl_days')

  return (
    <div className={`px-3 py-1.5 text-sm font-semibold ${m.bg} ${className}`} role="status">
      <div className="leading-snug">
        <span aria-hidden="true">{m.dot} </span>
        {imd && <span className="font-extrabold">{t(m.imd)} — </span>}
        {t('rl_next')} {alert.days} {daysWord} {t(`rl_${alert.level}`)}{!imd && ` ${t('rl_expected')}`} — {t('weather_location')}
        <span className="font-normal"> · ~{alert.total} {t('mm_unit')}</span>
      </div>
      <div className="mt-0.5 text-xs font-medium leading-snug">{t(`advice_${alert.level}`)}</div>
    </div>
  )
}
