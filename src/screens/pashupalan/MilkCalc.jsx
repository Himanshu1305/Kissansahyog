// Batch 19-B - the milk income calculator (lazy chunk of the income page). Everything stays on the phone:
// no storage, no network, no analytics. Inputs start empty; placeholders are labelled examples only.
import { useState } from 'react'
import { milkMath } from '../../lib/pashupalan/milk-calc'

const pick = (v, lang) => (v ? (v[lang] ?? v.hi) : '')
const fmt = (n) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
const EXAMPLES = { animals: '3', litres: '5', price: '40', cost: '120' } // placeholder hints only, never pre-filled

export default function MilkCalc({ calc, lang }) {
  const [v, setV] = useState({ animals: '', litres: '', price: '', cost: '' })
  const [aid, setAid] = useState(false)
  const r = milkMath({ ...v, aid })
  const field = (k) => (
    <label key={k} className="block">
      <span className="block text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{pick(calc.fields[k].l, lang)}</span>
      <input type="text" inputMode="decimal" autoComplete="off" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })}
        placeholder={`${pick(calc.fields[k].ph, lang)} ${EXAMPLES[k]}`} data-testid={`calc-${k}`}
        className="mt-1 min-h-[52px] w-full rounded-lg border-2 px-3 text-[18px]" style={{ borderColor: 'var(--ks-border)', background: '#fff', color: 'var(--ks-ink)' }} />
    </label>
  )
  const row = (label, value, strong, tid) => (
    <div className="flex items-baseline justify-between gap-3 py-2" style={{ borderTop: '1px solid var(--ks-border)' }}>
      <span className="text-[17px]" style={{ color: 'var(--ks-ink-2)' }}>{label}</span>
      <span className={`${strong ? 'text-[24px]' : 'text-[19px]'} font-extrabold`} data-testid={tid} style={{ color: strong ? 'var(--ks-green-dark)' : 'var(--ks-ink)' }}>{value}</span>
    </div>
  )
  return (
    <section id="calc" aria-labelledby="h-calc" className="p-4 md:p-6" data-testid="pashu-calc" style={{ background: 'var(--ks-card)', border: '2px solid var(--ks-green)', borderRadius: 'var(--ks-radius-lg)' }}>
      <h2 id="h-calc" className="text-[24px] font-extrabold leading-snug md:text-[28px]" style={{ color: 'var(--ks-ink)' }}>{pick(calc.h, lang)}</h2>
      <p className="mt-1 text-[17px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(calc.intro, lang)}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{['animals', 'litres', 'price', 'cost'].map(field)}</div>
      <label className="mt-4 flex min-h-[48px] cursor-pointer items-center gap-3 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>
        <input type="checkbox" checked={aid} onChange={(e) => setAid(e.target.checked)} data-testid="calc-aid" className="h-6 w-6" />
        <span>{pick(calc.aidSwitch, lang)}</span>
      </label>
      <div className="mt-3 p-3" aria-live="polite" data-testid="calc-result" style={{ background: 'var(--ks-green-tint)', borderRadius: 'var(--ks-radius-lg)' }}>
        {!r ? <p className="text-[17px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(calc.empty, lang)}</p> : (
          <>
            {row(pick(calc.income, lang), fmt(r.income), false, 'calc-income')}
            {row(pick(calc.spend, lang), fmt(r.spend), false, 'calc-spend')}
            {row(pick(calc.diff, lang), fmt(r.diff), true, 'calc-diff')}
            {aid && row(`${pick(calc.aidLine, lang)}: +${fmt(r.aidAmount)}`, fmt(r.diffWithAid), true, 'calc-diff-aid')}
          </>
        )}
        <p className="mt-2 text-[15px] font-bold" style={{ color: '#7A4B00' }}>{pick(calc.disclaimer, lang)}</p>
      </div>
    </section>
  )
}
