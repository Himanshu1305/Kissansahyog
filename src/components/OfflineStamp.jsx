// Batch 8B — "📴 last updated <time>" under data that came from the phone's offline copy
// (Android app only). Hidden when the data on screen is live, and always on the website.
import { useLang } from '../lib/i18n/LanguageProvider'
import { useOfflineInfo } from '../lib/offline/useOffline'

export function formatStamp(ms, lang) {
  return new Date(ms).toLocaleString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function OfflineStamp({ resources, className = '' }) {
  const { t, lang } = useLang()
  const info = useOfflineInfo(resources)
  if (!info.fromCache || info.cachedAt == null) return null
  return (
    <p data-testid="offline-stamp" data-cached-at={info.cachedAt} className={`text-[13px] font-semibold ${className}`} style={{ color: 'var(--ks-orange-dark)' }}>
      📴 {t('offline_stamp')} {formatStamp(info.cachedAt, lang)}
    </p>
  )
}
