import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Field, TextInput, TextArea, Notice, Spinner } from '../components/ui'
import {
  fetchPublishedSafalta, submitSafalta, safaltaStory, safaltaHelped,
} from '../lib/community/communityApi'

// Public Kisan Safalta (success stories) page.
export default function Safalta() {
  const { t, lang } = useLang()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPublishedSafalta()
      .then((r) => alive && setRows(r))
      .catch((e) => alive && (setError(t(e.i18nKey || 'err_unknown')), setRows([])))
    return () => { alive = false }
  }, [t])

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-3xl px-2 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2 px-1">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{t('safalta_title')}</h1>
            <p className="mt-0.5 text-sm text-stone-600">{t('safalta_sub')}</p>
          </div>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white active:bg-green-800">
            + {t('safalta_share_cta')}
          </button>
        </div>

        {showForm && <ShareForm t={t} onDone={() => setShowForm(false)} />}

        {error && <Notice tone="error">{error}</Notice>}
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-green-300 bg-green-50 p-6 text-center">
            <div className="text-4xl">🌱</div>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-green-900">{t('safalta_empty')}</p>
            <button type="button" onClick={() => setShowForm(true)} className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">{t('safalta_share_cta')} →</button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((r) => <StoryCard key={r.id} r={r} t={t} lang={lang} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function StoryCard({ r, t, lang }) {
  const [expanded, setExpanded] = useState(false)
  const story = safaltaStory(r, lang)
  const lines = story.split(/\n\s*\n/).filter((p) => p.trim())
  const shown = expanded ? lines : lines.slice(0, 1)
  const hasIncome = r.income_before || r.income_after
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-xl">👨‍🌾</span>
        <div>
          <div className="font-bold text-stone-900">{r.farmer_name}</div>
          <div className="text-xs text-stone-500">📍 {[r.village, r.district].filter(Boolean).join(', ')} · {r.crop_or_activity}</div>
        </div>
      </div>

      {hasIncome && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 p-2 text-sm">
          <div className="flex-1 text-center">
            <div className="text-xs text-stone-500">{t('safalta_before')}</div>
            <div className="font-bold text-stone-700">{r.income_before || '—'}</div>
          </div>
          <div className="text-lg font-bold text-green-600">→</div>
          <div className="flex-1 text-center">
            <div className="text-xs text-stone-500">{t('safalta_after')}</div>
            <div className="font-bold text-green-800">{r.income_after || '—'} <span className="text-green-600">↑</span></div>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-800">
        {shown.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </div>
      {lines.length > 1 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-bold text-green-700">
          {expanded ? t('safalta_read_less') : t('safalta_read_more')}
        </button>
      )}

      {safaltaHelped(r, lang) && safaltaHelped(r, lang) !== '—' && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="text-xs font-bold text-green-800">✅ {t('safalta_how_helped')}</div>
          <p className="mt-1 text-sm text-green-900">{safaltaHelped(r, lang)}</p>
        </div>
      )}
    </article>
  )
}

const EMPTY = { farmer_name: '', village: '', crop_or_activity: '', story_hi: '', contact_phone: '' }

function ShareForm({ t, onDone }) {
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit() {
    setErr(null); setBusy(true)
    try {
      await submitSafalta(f)
      setOk(true)
      setTimeout(onDone, 2500)
    } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } finally { setBusy(false) }
  }

  if (ok) return <Notice tone="success">{t('safalta_submitted')}</Notice>

  return (
    <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      {err && <Notice tone="error">{err}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('safalta_f_name')} htmlFor="sf_name"><TextInput id="sf_name" value={f.farmer_name} onChange={set('farmer_name')} /></Field>
        <Field label={t('safalta_f_village')} htmlFor="sf_village"><TextInput id="sf_village" value={f.village} onChange={set('village')} /></Field>
        <Field label={t('safalta_f_crop')} htmlFor="sf_crop"><TextInput id="sf_crop" value={f.crop_or_activity} onChange={set('crop_or_activity')} /></Field>
        <Field label={t('safalta_f_phone')} htmlFor="sf_phone"><TextInput id="sf_phone" value={f.contact_phone} onChange={set('contact_phone')} /></Field>
      </div>
      <Field label={t('safalta_f_story')} htmlFor="sf_story"><TextArea id="sf_story" rows={4} value={f.story_hi} onChange={set('story_hi')} /></Field>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-60">{t('submit')}</button>
        <button type="button" onClick={onDone} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('cancel')}</button>
      </div>
    </div>
  )
}
