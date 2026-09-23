import { useLang } from '../lib/i18n/LanguageProvider'
import { classifyDay } from '../lib/weather/rainAlert'

// Advice i18n key from the heaviest single-day precip in the next 48h (IMD bands).
// Only heavy+ (>=64.5mm) uses "chetavni/alert" wording; below that is "sambhavna".
const ADVICE_KEY = {
  light: 'rain_adv_light', moderate: 'rain_adv_moderate', heavy: 'rain_adv_heavy',
  very_heavy: 'rain_adv_veryheavy', extreme: 'rain_adv_extreme',
}
// Per-day pill labels (kal / parson / narson).
const DAY_LABELS = ['rl_tomorrow', 'rl_dayafter', 'rl_third']

// Rich rain-alert strip (dark blue #1c3a70). `alert` = getRainAlert(...) or null.
// Renders only when rain is forecast in the next 48h (alert is null otherwise).
export default function RainAlert({ alert, className = '' }) {
  const { t } = useLang()
  if (!alert) return null
  const level = (classifyDay(alert.max48) || { level: 'light' }).level
  const daysWord = alert.days === 1 ? t('rl_day1') : t('rl_days')
  const pills = (alert.perDay || []).map((mm, i) => ({ label: t(DAY_LABELS[i] || 'rl_third'), mm })).filter((p) => p.mm > 0)

  return (
    <div className={`w-full bg-[#1c3a70] text-white ${className}`} role="status">
      <div className="flex items-start gap-2 px-[14px] py-2.5">
        <span className="mt-1.5 inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#5b9bff]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-snug">
            🌧️ {t('rl_next')} {alert.days} {daysWord} {t('rain_chance_word')}
          </div>
          {pills.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {pills.map((p, i) => (
                <span key={i} className="rounded-md bg-white/[0.12] px-2 py-[3px] text-[11px] font-semibold text-[#c8dcff]">
                  {p.label} ~{p.mm}{t('mm_unit')}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 text-[12px] font-medium leading-snug text-[#dbe6ff]">{t(ADVICE_KEY[level] || 'rain_adv_light')}</div>
        </div>
      </div>
    </div>
  )
}
