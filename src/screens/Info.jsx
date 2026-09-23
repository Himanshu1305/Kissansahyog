import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import WeatherWidget from '../components/WeatherWidget'
import RainAlert from '../components/RainAlert'
import { Spinner } from '../components/ui'
import { fetchWeather } from '../lib/weather/weatherApi'
import { getRainAlert } from '../lib/weather/rainAlert'
import { fetchMsp, MANDI_TO_MSP, mspCropName } from '../lib/msp/mspApi'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { fetchFeaturedYojana, yojanaName, yojanaBenefit } from '../lib/community/communityApi'

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')

// Farmer's Info Centre — weather, MSP (with MSP-vs-mandi comparison), contacts.
export default function Info() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  const [weather, setWeather] = useState(undefined)
  const [msp, setMsp] = useState(null)
  const [mandi, setMandi] = useState({ rows: [], day: 'none' })
  const [season, setSeason] = useState('rabi')
  const [schemes, setSchemes] = useState([])

  useEffect(() => {
    let alive = true
    fetchWeather().then((w) => alive && setWeather(w)).catch(() => alive && setWeather(null))
    fetchMsp().then((m) => alive && setMsp(m)).catch(() => alive && setMsp([]))
    fetchMandiPrices().then((m) => alive && setMandi(m)).catch(() => {})
    fetchFeaturedYojana(3).then((y) => alive && setSchemes(y)).catch(() => alive && setSchemes([]))
    return () => { alive = false }
  }, [])

  // Scroll to #weather/#msp/#contacts when arriving via a hash link.
  useEffect(() => {
    const id = (location.hash || '').replace('#', '')
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [location.hash, msp, weather])

  const seasonRows = useMemo(() => (msp || []).filter((m) => m.season === season), [msp, season])

  // MSP-vs-mandi comparison rows (skip commodities with no MSP mapping).
  const comparison = useMemo(() => {
    if (!msp) return []
    const out = []
    for (const row of mandi.rows) {
      const mspCrop = MANDI_TO_MSP[row.commodity_en]
      if (!mspCrop) continue
      const m = msp.find((x) => x.crop_en === mspCrop)
      if (!m) continue
      const above = row.modal_price != null && Number(row.modal_price) >= Number(m.msp_per_quintal)
      out.push({ key: row.commodity_en + row.market, commodity_hi: row.commodity_hi, mandi: row.modal_price, msp: m.msp_per_quintal, above })
    }
    // de-dup by commodity (first market wins)
    const seen = new Set()
    return out.filter((r) => (seen.has(r.commodity_hi) ? false : seen.add(r.commodity_hi)))
  }, [msp, mandi])

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-2xl px-2 py-3">
        <h1 className="mb-3 px-1 text-xl font-bold text-stone-900">{t('info_title')}</h1>

        <div className="flex flex-col gap-3">
          {/* Section 1 — Weather */}
          <section id="weather" className="scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-sky-400 bg-white p-3">
            <h2 className="mb-2 font-bold text-stone-800">🌤️ {t('weather_title')} — {t('weather_near_you')}</h2>
            <WeatherWidget data={weather} loading={weather === undefined} />
            <RainAlert alert={getRainAlert(weather?.forecast)} className="mt-2 rounded-lg" />
          </section>

          {/* Section 2 — MSP */}
          <section id="msp" className="scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-green-500 bg-white p-3">
            <h2 className="font-bold text-stone-800">🏷️ {t('info_msp_heading')}</h2>
            <p className="mt-1 text-sm text-stone-600">{t('msp_explain')}</p>

            {/* Kharif / Rabi pill toggle */}
            <div className="mt-3 flex w-full overflow-hidden rounded-full border border-green-600">
              {['kharif', 'rabi'].map((s) => (
                <button key={s} type="button" onClick={() => setSeason(s)} className={`flex-1 py-1.5 text-sm font-bold ${season === s ? 'bg-green-700 text-white' : 'bg-white text-green-800'}`}>
                  {t(s === 'kharif' ? 'tab_kharif' : 'tab_rabi')}
                </button>
              ))}
            </div>

            {msp === null ? (
              <Spinner />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-stone-100 text-stone-500">
                      <th className="whitespace-nowrap py-1.5 pr-3">{t('msp_col_crop')}</th>
                      <th className="whitespace-nowrap py-1.5 pr-3">{t('msp_col_price')}</th>
                      <th className="whitespace-nowrap py-1.5 pr-3">{t('msp_col_increase')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonRows.map((m) => (
                      <tr key={m.id} className="border-b border-stone-100">
                        <td className="whitespace-nowrap py-1.5 pr-3 font-semibold text-stone-800">{mspCropName(m, lang)}</td>
                        <td className="whitespace-nowrap py-1.5 pr-3">₹{fmt(m.msp_per_quintal)}</td>
                        <td className="whitespace-nowrap py-1.5 pr-3 text-green-700">{m.increase_from_previous > 0 ? `+₹${fmt(m.increase_from_previous)} ↑` : '—'}</td>
                      </tr>
                    ))}
                    {seasonRows.length === 0 && <tr><td colSpan={3} className="py-3 text-center text-stone-400">—</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* MSP vs Mandi comparison */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-stone-800">{t('msp_vs_mandi')}</h3>
              {mandi.day !== 'none' && (
                <p className="text-xs text-stone-500">{t(mandi.day === 'yesterday' ? 'msp_mandi_yesterday' : 'msp_mandi_today')}</p>
              )}
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {comparison.length === 0 ? (
                      <tr><td className="py-2 text-stone-400">—</td></tr>
                    ) : comparison.map((c) => (
                      <tr key={c.key} className="border-b border-stone-100">
                        <td className="whitespace-nowrap py-1.5 pr-3 font-semibold text-stone-800">{c.commodity_hi}</td>
                        <td className="whitespace-nowrap py-1.5 pr-3">₹{fmt(c.mandi)} <span className="text-stone-400">/ MSP ₹{fmt(c.msp)}</span></td>
                        <td className="whitespace-nowrap py-1.5 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.above ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {c.above ? `${t('msp_above')} ✓` : `${t('msp_below')} ⚠️`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-3 text-xs text-stone-400">{t('msp_source')}</p>
            <p className="text-xs text-stone-400">{t('msp_next_update')}</p>
          </section>

          {/* Section 2b — Government schemes (featured) */}
          {schemes.length > 0 && (
            <section id="schemes" className="scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-emerald-500 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-bold text-stone-800">🏛️ {t('info_yojana_heading')}</h2>
                <button type="button" onClick={() => navigate('/yojana')} className="text-sm font-bold text-green-700">{t('info_yojana_link')} →</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {schemes.map((s) => (
                  <button key={s.id} type="button" onClick={() => navigate('/yojana')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-left active:bg-emerald-100">
                    <div className="text-sm font-bold leading-snug text-stone-900">{yojanaName(s, lang)}</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-800">{yojanaBenefit(s, lang)}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 3 — Contacts */}
          <section id="contacts" className="scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-amber-400 bg-white p-3">
            <h2 className="mb-2 font-bold text-stone-800">📞 {t('info_contacts_section')}</h2>
            <button type="button" onClick={() => navigate('/resources')} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white active:bg-green-800">
              {t('info_contacts_link')}
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
