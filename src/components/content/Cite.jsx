import { useCite } from './citeContext.jsx'

// Superscript numbered citation link(s). Pass one or more source ids; renders
// the per-page number(s) linking to the matching entry in <SourcesList/>.
//   <Cite ids={['S-CARB-01']} />  ->  ¹
//   <Cite ids={['S-CARB-01','S-CARB-02']} />  ->  ¹ ²
import { useLang } from '../../lib/i18n/LanguageProvider'

export default function Cite({ ids }) {
  const { numberOf } = useCite()
  const { t } = useLang()
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
  if (list.length === 0) return null
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.7em] font-bold text-green-700">
      {list.map((id, i) => {
        const n = numberOf(id)
        if (n == null) return null
        return (
          <span key={id}>
            {i > 0 && <span className="text-stone-400">,</span>}
            <a href={`#src-${id}`} className="hover:underline" aria-label={`${t('sources_heading')} ${n}`}>[{n}]</a>
          </span>
        )
      })}
    </sup>
  )
}
