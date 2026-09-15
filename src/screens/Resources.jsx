import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner } from '../components/ui'
import { fetchResources, resName, resDesc, resAddress, resTimings } from '../lib/resources/resourcesApi'

// Tabs ↔ resource_type ↔ URL hash (homepage cards deep-link to #soil/#veterinary/#offices).
const TABS = [
  { key: 'soil_lab', hash: 'soil', labelKey: 'tab_soil' },
  { key: 'veterinary', hash: 'veterinary', labelKey: 'tab_veterinary' },
  { key: 'govt_office', hash: 'offices', labelKey: 'tab_offices' },
]
const TYPE_BY_HASH = { soil: 'soil_lab', veterinary: 'veterinary', offices: 'govt_office' }
// Bilingual labels for the stored (English) area values.
const AREA_KEY = { Khurai: 'area_khurai', 'Sagar City': 'area_sagar_city', Deori: 'area_deori', 'All areas': 'area_all', 'Madhya Pradesh': 'area_mp', Sagar: 'area_sagar' }

export default function Resources() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const initialType = TYPE_BY_HASH[(location.hash || '').replace('#', '')] || 'soil_lab'
  const [active, setActive] = useState(initialType)

  useEffect(() => {
    let alive = true
    fetchResources().then((r) => alive && setRows(r)).catch((e) => alive && setError(t(e.i18nKey || 'err_unknown')))
    return () => { alive = false }
  }, [t])

  // Keep the active tab in sync with the URL hash (e.g. arriving from a homepage card).
  useEffect(() => {
    const type = TYPE_BY_HASH[(location.hash || '').replace('#', '')]
    if (type) setActive(type)
  }, [location.hash])

  const shown = useMemo(() => (rows || []).filter((r) => r.resource_type === active), [rows, active])

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-bold text-stone-900">{t('resources_title')}</h1>
        <p className="mt-1 text-stone-600">{t('resources_subtitle')}</p>

        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold leading-snug">⚠️ {t('resources_disclaimer')}</p>
        </div>

        {/* Tabs */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => navigate(`/resources#${tab.hash}`)}
              className={`rounded-xl px-2 py-3 text-sm font-bold ${active === tab.key ? 'bg-green-700 text-white' : 'bg-white text-stone-700 border-2 border-stone-200'}`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="mt-5 space-y-4">
          {rows === null ? (
            <Spinner />
          ) : shown.length === 0 ? (
            <p className="py-8 text-center text-stone-500">{t('res_none')}</p>
          ) : (
            shown.map((r) => <ResourceCard key={r.id} r={r} lang={lang} t={t} />)
          )}
        </div>

        {/* Soil-sample process guide — only under the soil tab. */}
        {active === 'soil_lab' && rows !== null && <SoilGuide t={t} />}
      </main>
    </div>
  )
}

function PhoneRow({ number, tollfree, t }) {
  if (!number) return null
  return (
    <a href={`tel:${number}`} className="flex items-center gap-2">
      <span className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">📞 {number}</span>
      {tollfree && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{t('toll_free_badge')}</span>}
    </a>
  )
}

function ResourceCard({ r, lang, t }) {
  const areaLabel = r.area ? (AREA_KEY[r.area] ? t(AREA_KEY[r.area]) : r.area) : null
  const desc = resDesc(r, lang)
  const address = resAddress(r, lang)
  const timings = resTimings(r, lang)
  return (
    <div className="rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-stone-900">{resName(r, lang)}</h3>
          <p className="text-sm text-stone-500">{lang === 'hi' ? r.name_en : r.name_hi}</p>
        </div>
        {areaLabel && <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">📍 {areaLabel}</span>}
      </div>

      {desc && <p className="mt-2 text-sm text-stone-700">{desc}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <PhoneRow number={r.phone_tollfree} tollfree t={t} />
        <PhoneRow number={r.phone_primary} t={t} />
        <PhoneRow number={r.phone_secondary} t={t} />
      </div>

      <div className="mt-2 space-y-1 text-sm text-stone-600">
        {r.email && <div>✉️ <a href={`mailto:${r.email}`} className="text-green-800 underline">{r.email}</a></div>}
        {r.website && <div>🌐 <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-green-800 underline">{r.website.replace(/^https?:\/\//, '')}</a></div>}
        {timings && <div>🕒 {t('res_timings')}: {timings}</div>}
        {address && <div>🏠 {t('res_address')}: {address}</div>}
      </div>
    </div>
  )
}

function SoilGuide({ t }) {
  const [open, setOpen] = useState(false)
  const steps = ['soil_step_1', 'soil_step_2', 'soil_step_3', 'soil_step_4', 'soil_step_5', 'soil_step_6']
  return (
    <div className="mt-6 rounded-2xl border-2 border-green-200 bg-green-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-bold text-green-900"
      >
        <span>🧪 {t('soil_guide_title')}</span>
        <span className="text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ol className="list-decimal space-y-2 px-8 pb-4 text-stone-800">
          {steps.map((s) => (<li key={s}>{t(s)}</li>))}
        </ol>
      )}
    </div>
  )
}
