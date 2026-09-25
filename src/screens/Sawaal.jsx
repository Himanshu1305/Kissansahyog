import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Field, TextInput, TextArea, Select, Notice, Spinner } from '../components/ui'
import { uploadPhotos } from '../lib/listings/photos'
import { fetchVideos, videoTitle, videoWatchUrl } from '../lib/videos/videosApi'
import {
  fetchPublishedSawaal, submitSawaal, sawaalQuestion, sawaalAnswer,
} from '../lib/community/communityApi'

// Sawaal categories (order per spec). 'all' is a UI-only filter.
const CATS = ['all', 'land', 'equipment', 'crop', 'pest', 'weather', 'market', 'scheme', 'drone_didi', 'general']
// Drop markdown bold markers for plain rendering.
const plain = (s) => String(s || '').replace(/\*\*/g, '')

// Public Kisan Sawaal (Q&A) page — accordion cards + an ask-a-question form.
export default function Sawaal() {
  const { t, lang } = useLang()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [cat, setCat] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [params] = useSearchParams()
  const [showForm, setShowForm] = useState(params.get('ask') === '1')
  const photoDefault = params.get('photo') === '1'
  const [videosById, setVideosById] = useState({})
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('') // debounced search term

  useEffect(() => { const id = setTimeout(() => setDq(q.trim().toLowerCase()), 250); return () => clearTimeout(id) }, [q])

  useEffect(() => {
    let alive = true
    fetchVideos().then((vs) => alive && setVideosById(Object.fromEntries((vs || []).map((v) => [v.id, v])))).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    fetchPublishedSawaal()
      .then((r) => alive && setRows(r))
      .catch((e) => alive && (setError(t(e.i18nKey || 'err_unknown')), setRows([])))
    return () => { alive = false }
  }, [t])

  // Per-category counts for the chip labels.
  const counts = useMemo(() => {
    const c = { all: (rows || []).length }
    for (const r of rows || []) c[r.category] = (c[r.category] || 0) + 1
    return c
  }, [rows])
  // Filter by category AND debounced search over question text (client-side; small set).
  const shown = useMemo(() => (rows || []).filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false
    if (!dq) return true
    return `${r.question_hi || ''} ${r.question_en || ''}`.toLowerCase().includes(dq)
  }), [rows, cat, dq])
  const chip = (active) =>
    `whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold border ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-3xl px-2 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2 px-1">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{t('sawaal_title')}</h1>
            <p className="mt-0.5 text-sm text-stone-600">{t('sawaal_sub')}</p>
          </div>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white active:bg-green-800">
            + {t('sawaal_ask_cta')}
          </button>
        </div>

        {showForm && <AskForm t={t} photoDefault={photoDefault} onDone={() => setShowForm(false)} />}

        {/* Search (debounced, client-side) */}
        <div className="mt-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sawaal_search_ph')}
            className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} />
        </div>

        {/* Category filter chips with counts (horizontal scroll on mobile) */}
        <div className="-mx-2 mt-3 flex gap-1.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATS.filter((c) => c === 'all' || counts[c]).map((c) => (
            <button key={c} type="button" className={chip(cat === c)} onClick={() => setCat(c)}>{t(`scat_${c}`)} ({counts[c] || 0})</button>
          ))}
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {rows === null ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-stone-500">{dq ? t('sawaal_no_match') : t('sawaal_empty')}</p>
            <button type="button" onClick={() => setShowForm(true)} className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">📷 {t('qa_photo_ask')}</button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {shown.map((r) => {
              const open = openId === r.id
              return (
                <div key={r.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-start gap-2 p-3 text-left">
                    <span className="mt-0.5 text-lg" aria-hidden="true">❓</span>
                    <span className="flex-1">
                      <span className="block font-bold leading-snug text-stone-900">{sawaalQuestion(r, lang)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                        {r.category && <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-semibold text-green-800">{t(`scat_${r.category}`)}</span>}
                        {r.asked_by_village && <span>📍 {r.asked_by_village}</span>}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-green-700">{open ? t('sawaal_hide_answer') : t('sawaal_show_answer')}</span>
                  </button>
                  {open && (
                    <div className="border-t border-stone-100 bg-green-50/40 p-3">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-stone-800">{plain(sawaalAnswer(r, lang))}</p>
                      {r.related_video_id && videosById[r.related_video_id] && (
                        <a href={videoWatchUrl(videosById[r.related_video_id])} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-green-700">
                          ▶ {t('video_related')}: {videoTitle(videosById[r.related_video_id], lang)}
                        </a>
                      )}
                      {r.answered_by && <p className="mt-2 text-xs font-semibold text-stone-500">{t('sawaal_answered_by')}{r.answered_by}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

const EMPTY = { asked_by_name: '', asked_by_village: '', category: 'general', question_hi: '', crop: '', symptom_tag: '' }
const CROPS = ['soybean', 'wheat', 'gram', 'mustard', 'paddy', 'maize']
const SYMPTOMS = ['yellow_leaves', 'wilting', 'pest_visible', 'fungal_spots', 'stunted_growth', 'other']

function AskForm({ t, onDone, photoDefault = false }) {
  const { user } = useAuth()
  const [f, setF] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  function pickFile(e) {
    setErr(null)
    const fl = e.target.files?.[0]
    if (!fl) { setFile(null); return }
    if (!/^image\/(jpe?g|png)$/.test(fl.type)) { setErr(t('sawaal_photo_type')); e.target.value = ''; return }
    if (fl.size > 2 * 1024 * 1024) { setErr(t('sawaal_photo_too_big')); e.target.value = ''; return }
    setFile(fl)
  }

  async function submit() {
    setErr(null); setBusy(true)
    try {
      let photo_url
      if (file) {
        // Best-effort upload; a failed upload must not block the question.
        try {
          const urls = await uploadPhotos([file], user?.id || 'sawaal')
          photo_url = urls[0]
        } catch { /* submit without photo */ }
      }
      await submitSawaal({ ...f, photo_url })
      setOk(true)
      setTimeout(onDone, 2500)
    } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } finally { setBusy(false) }
  }

  if (ok) return <Notice tone="success">{t('sawaal_submitted')}</Notice>

  return (
    <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      {err && <Notice tone="error">{err}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('sawaal_f_name')} htmlFor="sw_name"><TextInput id="sw_name" value={f.asked_by_name} onChange={set('asked_by_name')} /></Field>
        <Field label={t('sawaal_f_village')} htmlFor="sw_village"><TextInput id="sw_village" value={f.asked_by_village} onChange={set('asked_by_village')} /></Field>
        <Field label={t('sawaal_f_category')} htmlFor="sw_cat">
          <Select id="sw_cat" value={f.category} onChange={set('category')}>
            {['land', 'equipment', 'crop', 'pest', 'weather', 'market', 'scheme', 'drone_didi', 'general'].map((c) => (
              <option key={c} value={c}>{t(`scat_${c}`)}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('sawaal_f_question')} htmlFor="sw_q">
        <TextArea id="sw_q" rows={3} value={f.question_hi} onChange={set('question_hi')} placeholder={t('sawaal_f_question_ph')} />
      </Field>
      {/* Optional crop + symptom (Phase 6 — feeds the pest-report banner) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('sawaal_f_crop')} htmlFor="sw_crop">
          <Select id="sw_crop" value={f.crop} onChange={set('crop')}>
            <option value="">{t('sym_none')}</option>
            {CROPS.map((c) => <option key={c} value={c}>{t(`pest_crop_${c}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('sawaal_f_symptom')} htmlFor="sw_sym">
          <Select id="sw_sym" value={f.symptom_tag} onChange={set('symptom_tag')}>
            <option value="">{t('sym_none')}</option>
            {SYMPTOMS.map((s) => <option key={s} value={s}>{t(`pest_sym_${s}`)}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={`📷 ${t('sawaal_f_photo')}`} htmlFor="sw_photo">
        <input id="sw_photo" type="file" accept="image/jpeg,image/png" autoFocus={photoDefault} onChange={pickFile} className="block w-full text-sm text-stone-700" />
        {file && <span className="mt-1 block text-xs text-green-700">✓ {file.name}</span>}
      </Field>
      <p className="mt-1 text-xs text-stone-500">{t('sawaal_ask_note')}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-60">{t('submit')}</button>
        <button type="button" onClick={onDone} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('cancel')}</button>
      </div>
    </div>
  )
}
