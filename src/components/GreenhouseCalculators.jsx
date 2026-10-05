import { useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { Cite } from './content'

// Interactive client-side greenhouse calculators for the /greenhouse hub.
// (a) Cost = area (m²) × size-band norm.  (b) MP state subsidy = official cost
// × 50%, capped at the 4,000 m² area limit.  The band norms (₹/m²) come from the
// MP state scheme cost-norm slab (cited S-GH-14); the figures live here as the
// calculator's data inputs, each surfaced next to a <Cite/>. This component sits
// in src/components/ (not sanctioned for Hindi literals), so all chrome text
// comes from t() keys — only numbers, currency symbols and ASCII band labels are
// rendered directly.
const AREA_CAP = 4000 // MP state scheme: max 4,000 m² per beneficiary

const BANDS = [
  { id: 'b1', label: '≤500', norm: 1060 },
  { id: 'b2', label: '500–1008', norm: 935 },
  { id: 'b3', label: '1008–2080', norm: 890 },
  { id: 'b4', label: '2080–4000', norm: 844 },
]

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

export default function GreenhouseCalculators() {
  const { t } = useLang()
  const [area, setArea] = useState('')
  const [bandId, setBandId] = useState(BANDS[3].id)

  const band = BANDS.find((b) => b.id === bandId) || BANDS[0]
  const areaNum = Number(area) > 0 ? Number(area) : 0
  const cappedArea = Math.min(areaNum, AREA_CAP)

  const cost = areaNum * band.norm
  const subsidy = cappedArea * band.norm * 0.5

  return (
    <section className="my-8 grid gap-4 sm:grid-cols-2" aria-label={t('calc_label')}>
      <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
        <h3 className="mb-3 font-bold text-stone-900">🧮 {t('calc_label')}</h3>

        <label className="block text-sm font-semibold text-stone-700">
          area (m²)
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="4000"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-stone-700">
          band (m²)
          <select
            value={bandId}
            onChange={(e) => setBandId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-sm"
          >
            {BANDS.map((b) => (
              <option key={b.id} value={b.id}>{b.label} m²</option>
            ))}
          </select>
        </label>

        <div className="mt-4 rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-stone-900">
          <div>
            {areaNum.toLocaleString('en-IN')} m² × {fmt(band.norm)}/m²
            <Cite ids={['S-GH-14']} />
          </div>
          <div className="mt-1 font-bold text-green-800">= {fmt(cost)}</div>
        </div>
        <p className="mt-2 text-xs text-stone-500">{t('calc_disclaimer')}</p>
      </div>

      <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
        <h3 className="mb-3 font-bold text-stone-900">💰 50% · ≤{AREA_CAP.toLocaleString('en-IN')} m²</h3>

        <div className="rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-stone-900">
          <div>
            min({areaNum.toLocaleString('en-IN')}, {AREA_CAP.toLocaleString('en-IN')}) m² × {fmt(band.norm)}/m² × 50%
            <Cite ids={['S-GH-14']} />
          </div>
          <div className="mt-1">
            = {cappedArea.toLocaleString('en-IN')} m² × {fmt(band.norm)}/m² × 50%
          </div>
          <div className="mt-1 font-bold text-green-800">= {fmt(subsidy)}</div>
        </div>
        <p className="mt-2 text-xs text-stone-500">{t('calc_disclaimer')}</p>
      </div>
    </section>
  )
}
