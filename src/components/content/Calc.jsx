import { useLang } from '../../lib/i18n/LanguageProvider'
import { pick } from './citeContext.jsx'
import Cite from './Cite.jsx'

// Renders a visible calculation: its inputs (each cited), the formula, and the
// result labelled "(गणना)". Example:
//   <Calc
//     formula={{hi:'₹2.9 करोड़ ÷ 2,550 किसान', en:'₹2.9 cr ÷ 2,550 farmers'}}
//     inputs={[{label:{hi:'कुल भुगतान',en:'Total paid'}, value:'₹2.9 करोड़', cites:['S-CARB-01']}, ...]}
//     result={{hi:'≈ ₹11,373 प्रति किसान', en:'≈ ₹11,373 per farmer'}}
//     cites={['S-CARB-01']} />
export default function Calc({ formula, inputs = [], result, cites, disclaimer, className = '' }) {
  const { t, lang } = useLang()
  return (
    <figure className={`my-5 rounded-xl border border-green-200 bg-green-50/60 p-4 ${className}`}>
      {inputs.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm text-stone-700">
          {inputs.map((inp, i) => (
            <li key={i} className="flex flex-wrap gap-x-2">
              <span className="font-semibold">{pick(inp.label, lang)}:</span>
              <span>{pick(inp.value, lang)}<Cite ids={inp.cites} /></span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-stone-900">
        <span>{pick(formula, lang)}</span>
        {result && (
          <span className="font-bold text-green-800"> = {pick(result, lang)}</span>
        )}
        <span className="ml-1 font-sans text-xs font-semibold text-stone-500">({t('calc_label')})</span>
        <Cite ids={cites} />
      </div>
      <figcaption className="mt-2 text-xs text-stone-500">
        {disclaimer ? pick(disclaimer, lang) : t('calc_disclaimer')}
      </figcaption>
    </figure>
  )
}
