import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { submitCarbonSuggestion, getCarbonSuggestionsPublic } from '../lib/carbon/carbonApi'

// Suggestions box: name/village optional, text required. Stored unpublished and
// shown here only after admin approval. No hardcoded Hindi — all via t().
export default function CarbonSuggestions() {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [village, setVillage] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState([])

  useEffect(() => { getCarbonSuggestionsPublic().then(setList).catch(() => {}) }, [])

  async function submit() {
    setErr(null); setBusy(true)
    try { await submitCarbonSuggestion({ name, village, body }); setDone(true); setBody('') }
    catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
    finally { setBusy(false) }
  }

  return (
    <section className="my-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-bold text-stone-900">{t('carbon_sugg_title')}</h2>
        <p className="mt-1 text-sm text-stone-600">{t('carbon_sugg_intro')}</p>
        {done ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{t('carbon_sugg_success')}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {err && <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('carbon_sugg_name')} className="w-full rounded-lg border border-stone-300 p-2 text-sm" />
            <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder={t('carbon_sugg_village')} className="w-full rounded-lg border border-stone-300 p-2 text-sm" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={t('carbon_sugg_body')} className="w-full rounded-lg border border-stone-300 p-2 text-sm" />
            <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-60">{t('carbon_sugg_submit')}</button>
          </div>
        )}
      </div>

      <h3 className="mt-5 mb-2 text-base font-bold text-stone-900">{t('carbon_sugg_heading')}</h3>
      {list.length === 0 ? (
        <p className="text-sm text-stone-500">{t('carbon_sugg_empty')}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <p className="text-stone-700">{s.body}</p>
              {(s.name || s.village) && <p className="mt-1 text-xs text-stone-500">— {[s.name, s.village].filter(Boolean).join(', ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
