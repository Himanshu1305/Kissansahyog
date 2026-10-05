import { useLang } from '../../lib/i18n/LanguageProvider'
import { useCite, sources } from './citeContext.jsx'

const TYPE_KEY = {
  Official: 'src_type_official',
  News: 'src_type_news',
  Company: 'src_type_company',
  Judgment: 'src_type_judgment',
  Secondary: 'src_type_secondary',
}
const TYPE_TONE = {
  Official: 'bg-green-100 text-green-800',
  News: 'bg-amber-100 text-amber-800',
  Company: 'bg-stone-200 text-stone-700',
  Judgment: 'bg-blue-100 text-blue-800',
  Secondary: 'bg-stone-100 text-stone-600',
}

export function SourceTypeBadge({ type }) {
  const { t } = useLang()
  const key = TYPE_KEY[type] || 'src_type_secondary'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[0.7rem] font-semibold ${TYPE_TONE[type] || TYPE_TONE.Secondary}`}>
      {t(key)}
    </span>
  )
}

// Numbered list of the sources cited on the page, in first-appearance order.
export default function SourcesList({ ids }) {
  const { t } = useLang()
  const { orderedIds } = useCite()
  const list = (ids && ids.length ? ids : orderedIds).filter((id) => sources[id])
  if (list.length === 0) return null
  return (
    <section aria-labelledby="sources-h" className="mt-10 border-t border-stone-200 pt-5">
      <h2 id="sources-h" className="mb-3 text-lg font-bold text-stone-800">{t('sources_heading')}</h2>
      <ol className="space-y-2 text-sm text-stone-600">
        {list.map((id, i) => {
          const s = sources[id]
          return (
            <li key={id} id={`src-${id}`} className="scroll-mt-20 leading-snug">
              <span className="font-semibold text-stone-700">[{i + 1}]</span>{' '}
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-green-700 underline">
                {s.title}
              </a>{' '}
              <SourceTypeBadge type={s.type} />
              <span className="ml-1 text-stone-500">
                — {s.publisher}{s.date && s.date !== 'n/a' ? `, ${s.date}` : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
