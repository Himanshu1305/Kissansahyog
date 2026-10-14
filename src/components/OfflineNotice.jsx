// Batch 8B — shown in place of a data section that could not load and has no usable offline
// copy (Android app only): a plain message and a "try again" button. `ageMs` turns it into the
// "saved data is too old" message.
// Batch 9 (1C): also used on the website by /cold-storage when its list fails to load.
import { useLang } from '../lib/i18n/LanguageProvider'
import { requestRefresh } from '../lib/offline/status'

const HOUR = 3600000

export function ageText(ms, t) {
  const hours = Math.max(1, Math.round(ms / HOUR))
  return hours < 48 ? t('offline_age_hours').replace('{n}', hours) : t('offline_age_days').replace('{n}', Math.round(hours / 24))
}

export default function OfflineNotice({ ageMs = null, className = '' }) {
  const { t } = useLang()
  return (
    <div data-testid="offline-notice" data-too-old={ageMs != null ? 'true' : 'false'} role="status" className={`rounded-xl border-2 px-4 py-3 ${className}`} style={{ borderColor: 'var(--ks-orange)', background: 'var(--ks-orange-tint)' }}>
      <p className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink)' }}>
        📴 {ageMs != null ? t('offline_too_old').replace('{age}', ageText(ageMs, t)) : t('offline_no_data')}
      </p>
      <button type="button" data-testid="offline-retry" onClick={() => requestRefresh()} className="mt-2 rounded-lg px-4 py-2 text-[15px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>
        {t('offline_try_again')}
      </button>
    </div>
  )
}
