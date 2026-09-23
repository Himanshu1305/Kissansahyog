import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner } from '../components/ui'
import {
  fetchActiveYojana, yojanaName, yojanaMinistry, yojanaDesc, yojanaBenefit,
  yojanaEligibility, yojanaHowTo, yojanaDeadline,
} from '../lib/community/communityApi'

// Filter categories per spec (+ storage/general shown when present).
const CATS = ['all', 'income_support', 'crop_insurance', 'credit', 'equipment', 'solar', 'women', 'market', 'storage', 'general']

// Public Sarkari Yojana (government schemes) directory.
export default function Yojana() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let alive = true
    fetchActiveYojana()
      .then((r) => alive && setRows(r))
      .catch((e) => alive && (setError(t(e.i18nKey || 'err_unknown')), setRows([])))
    return () => { alive = false }
  }, [t])

  // Only show category chips that actually have schemes (plus 'all').
  const present = useMemo(() => new Set((rows || []).map((r) => r.category)), [rows])
  const cats = CATS.filter((c) => c === 'all' || present.has(c))
  const shown = useMemo(() => (rows || []).filter((r) => cat === 'all' || r.category === cat), [rows, cat])

  const chip = (active) =>
    `whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold border ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-3xl px-2 py-4">
        <div className="px-1">
          <h1 className="text-xl font-bold text-stone-900">{t('yojana_title')}</h1>
          <p className="mt-0.5 text-sm text-stone-600">{t('yojana_sub')}</p>
        </div>

        <div className="-mx-2 mt-3 flex gap-1.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cats.map((c) => (
            <button key={c} type="button" className={chip(cat === c)} onClick={() => setCat(c)}>{t(`ycat_${c}`)}</button>
          ))}
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {rows === null ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-stone-500">{t('yojana_empty')}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {shown.map((r) => <SchemeCard key={r.id} r={r} t={t} lang={lang} />)}
          </div>
        )}

        {/* MSP vs mandi cross-link */}
        {rows && rows.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/info#msp')}
            className="mt-4 block w-full rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-900 active:bg-green-100"
          >
            🏷️ {t('yojana_msp_crosslink')} →
          </button>
        )}
      </main>
    </div>
  )
}

function SchemeCard({ r, t, lang }) {
  const [open, setOpen] = useState(false)
  const deadline = yojanaDeadline(r, lang)
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="font-bold leading-snug text-stone-900">{yojanaName(r, lang)}</h2>
      <p className="text-xs text-stone-500">{lang === 'hi' ? r.scheme_name_en : r.scheme_name_hi}</p>
      {yojanaMinistry(r, lang) && <p className="mt-0.5 text-xs text-stone-500">{t('yojana_ministry_label')}: {yojanaMinistry(r, lang)}</p>}

      {/* Benefit highlight box — the first thing visible */}
      <div className="mt-2 rounded-xl bg-green-100 px-3 py-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-green-700">{t('yojana_benefit_label')}</div>
        <div className="text-sm font-bold text-green-900">{yojanaBenefit(r, lang)}</div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-stone-700">{yojanaDesc(r, lang)}</p>

      {deadline && (
        <div className="mt-2 inline-block rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">⏰ {t('yojana_deadline_label')}: {deadline}</div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs font-bold text-stone-800">👥 {t('yojana_eligibility_label')}</div>
            <p className="mt-0.5 whitespace-pre-line text-sm text-stone-700">{yojanaEligibility(r, lang)}</p>
          </div>
          {yojanaHowTo(r, lang) && (
            <div>
              <div className="text-xs font-bold text-stone-800">📝 {t('yojana_howto_label')}</div>
              <p className="mt-0.5 whitespace-pre-line text-sm text-stone-700">{yojanaHowTo(r, lang)}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg border-2 border-green-700 px-3 py-1.5 text-sm font-bold text-green-800">
          {open ? t('yojana_show_less') : t('yojana_show_more')}
        </button>
        {r.helpline && (
          <a href={`tel:${r.helpline}`} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white active:bg-green-800">📞 {t('yojana_helpline')}: {r.helpline}</a>
        )}
        {r.official_website && (
          <a href={r.official_website} target="_blank" rel="noopener noreferrer" className="rounded-lg border-2 border-stone-300 px-3 py-1.5 text-sm font-bold text-stone-700">🌐 {t('yojana_website')} ↗</a>
        )}
      </div>
    </article>
  )
}
