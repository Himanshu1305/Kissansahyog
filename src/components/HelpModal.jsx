import { useLang } from '../lib/i18n/LanguageProvider'
import { strings } from '../lib/i18n/strings'
import { CATEGORY_META } from '../lib/listings/catalog'

// A small circular '?' button that opens a category help modal. Pass the category
// key ('land' | 'equipment' | ... | 'experts'); content comes from help_<key>.
export function HelpButton({ categoryKey, onOpen, className = '' }) {
  const { t } = useLang()
  return (
    <button
      type="button"
      aria-label={t('help_aria')}
      data-testid={`help-${categoryKey}`}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpen(categoryKey) }}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-green-600 bg-white text-xs font-bold text-green-700 ${className}`}
    >
      ?
    </button>
  )
}

// The modal / bottom-sheet. `categoryKey` null → closed. Dismiss by tapping the
// backdrop or the close button. Hindi first + English below (both always shown,
// following the disclaimer convention). Bottom sheet on mobile, centered on desktop.
export default function HelpModal({ categoryKey, onClose }) {
  const { t } = useLang()
  if (!categoryKey) return null
  const meta = CATEGORY_META[categoryKey]
  const icon = meta?.icon || (categoryKey === 'experts' ? '👨‍🌾' : 'ℹ️')
  const label = t(categoryKey === 'experts' ? 'home_cat_experts' : `home_cat_${categoryKey}`)
  const help = strings[`help_${categoryKey}`] || { hi: '', en: '' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">{icon}</span>
          <h2 className="flex-1 text-lg font-bold text-stone-900">{label}</h2>
          <button
            type="button"
            aria-label={t('help_close')}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-2xl text-stone-500 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <p className="text-base font-medium leading-relaxed text-stone-800">{help.hi}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{help.en}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-green-700 px-5 py-3 text-lg font-bold text-white active:bg-green-800"
        >
          {t('help_close')}
        </button>
      </div>
    </div>
  )
}
