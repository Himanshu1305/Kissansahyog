import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { Screen, Field, Notice, Spinner, TextInput } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import HelpModal, { HelpButton } from '../components/HelpModal'
import { fetchExperts } from '../lib/experts/expertsApi'

// Expert helpers: pick the localized field, falling back to the other language.
export const expertName = (e, lang) => (lang === 'hi' && e.name_hi) || e.name
export const expertSpec = (e, lang) =>
  (lang === 'hi' ? e.specialisation_hi : e.specialisation_en) || e.specialisation_en || e.specialisation_hi || ''
export const expertBio = (e, lang) => (lang === 'hi' ? e.bio_hi : e.bio_en) || e.bio_en || e.bio_hi || ''

// Curated expert directory. No distance filtering — experts help everyone. A
// simple client-side specialisation filter narrows the list.
export default function Experts() {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [experts, setExperts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [helpKey, setHelpKey] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const rows = await fetchExperts()
        if (alive) setExperts(rows)
      } catch (err) {
        if (alive) setError(t(err.i18nKey || 'err_unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return experts
    return experts.filter((e) =>
      [e.specialisation_en, e.specialisation_hi].filter(Boolean).some((s) => s.toLowerCase().includes(q)),
    )
  }, [experts, query])

  return (
    <Screen title={t('experts_title')} onBack={() => navigate('/home')} right={<div className="flex items-center gap-2"><HelpButton categoryKey="experts" onOpen={setHelpKey} /><LanguageToggle /></div>}>
      <HelpModal categoryKey={helpKey} onClose={() => setHelpKey(null)} />
      <Field label={t('experts_filter_label')} htmlFor="expert_filter">
        <TextInput
          id="expert_filter"
          value={query}
          placeholder={t('experts_filter_ph')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-stone-500">{t('experts_none')}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              data-testid="expert-card"
              onClick={() => navigate(`/experts/${e.id}`)}
              className="w-full rounded-2xl border-2 border-stone-200 bg-white p-4 text-left shadow-sm active:bg-stone-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">👨‍🌾</span>
                <span className="font-bold text-stone-900">{expertName(e, lang)}</span>
              </div>
              {expertSpec(e, lang) && (
                <div className="mt-1 text-sm font-semibold text-green-800">{expertSpec(e, lang)}</div>
              )}
              {e.organisation && <div className="text-sm text-stone-500">{e.organisation}</div>}
              {expertBio(e, lang) && (
                <p className="mt-1 line-clamp-2 text-sm text-stone-700">{expertBio(e, lang)}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </Screen>
  )
}
