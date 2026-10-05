import { useLang } from '../../lib/i18n/LanguageProvider'

// "पिछला उदाहरण — गारंटी नहीं" badge attached to any example (a past payout, a
// success story) so a reader never reads a past figure as a promise.
export default function PastExampleNote({ className = '' }) {
  const { t } = useLang()
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ${className}`}>
      ⚠️ {t('past_example_note')}
    </span>
  )
}
