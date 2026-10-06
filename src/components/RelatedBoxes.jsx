import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { pickBoxes } from '../content/boxRegistry'

// Phase 11 — renders 3–6 contextual interlinking boxes for a page, from the
// central boxRegistry (seasonal + page rules applied there). No hardcoded Hindi:
// titles come from the registry data via the active language.
export default function RelatedBoxes({ page, max = 6, className = '' }) {
  const { t, lang } = useLang()
  const boxes = pickBoxes(page, undefined, max)
  if (!boxes.length) return null
  return (
    <section className={`my-6 ${className}`} aria-label={t('related_heading')}>
      <h2 className="mb-2 text-base font-bold text-stone-900">{t('related_heading')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {boxes.map((b) => (
          <Link key={b.id} to={b.link} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-green-50">
            <span aria-hidden className="text-lg">{b.icon}</span>
            <span>{b.title[lang] ?? b.title.hi}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
