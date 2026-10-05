import { useLang } from '../../lib/i18n/LanguageProvider'

// "अंतिम अपडेट <date> · Team Kissan Sahyog" line shown on content pages.
// `date` is an ISO string or display string. `checked` optionally adds an
// "अंतिम जाँच" stamp (used for live-portal facts, e.g. MPFSTS notices).
export default function LastUpdated({ date, checked, byline = true, className = '' }) {
  const { t } = useLang()
  return (
    <p className={`text-sm text-stone-500 ${className}`}>
      <span>{t('last_updated')}: <time dateTime={date}>{date}</time></span>
      {checked && (
        <span> · {t('last_checked')}: <time dateTime={checked}>{checked}</time></span>
      )}
      {byline && <span> · {t('byline')}</span>}
    </p>
  )
}
