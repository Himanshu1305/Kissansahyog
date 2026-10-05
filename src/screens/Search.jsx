import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import { searchAll, logSearchMiss, POPULAR_SEARCHES } from '../lib/search/searchApi'
import VoiceSearchButton from '../components/VoiceSearchButton'
import { CATEGORY_META } from '../lib/listings/catalog'
import { initialLocation } from '../lib/location/locationStore'
import { haversineKm } from '../lib/distance'

// Phase 10 — site-wide search results (route /search, noindex). Reads ?q=, runs
// searchAll(), groups results by type. For live listings with coordinates and a
// saved user location, shows the distance. No hardcoded Devanagari — copy via t().

// Order groups so the most actionable content surfaces first.
const GROUP_ORDER = ['listing', 'msp', 'cold_storage', 'scheme', 'article', 'video', 'sawaal', 'mela', 'resource', 'expert', 'hub']

export default function Search() {
  const { t, lang } = useLang()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''

  const [input, setInput] = useState(q)
  const [result, setResult] = useState({ groups: {}, total: 0 })
  const [loading, setLoading] = useState(false)

  // Saved location for listing distances (guarded — may have no coords).
  const [coords] = useState(() => {
    try {
      const loc = initialLocation()
      return loc?.rawCoords || null
    } catch { return null }
  })

  useEffect(() => { setInput(q) }, [q])

  useEffect(() => {
    let alive = true
    if (!q.trim()) { setResult({ groups: {}, total: 0 }); return }
    setLoading(true)
    searchAll(q).then((res) => {
      if (!alive) return
      setResult(res)
      setLoading(false)
      if (res.total === 0) logSearchMiss(q)
    }).catch(() => { if (alive) { setResult({ groups: {}, total: 0 }); setLoading(false) } })
    return () => { alive = false }
  }, [q])

  const submit = (e) => {
    e?.preventDefault?.()
    const query = input.trim()
    if (query) setParams({ q: query })
  }
  const setQuery = (text) => {
    const query = String(text || '').trim()
    if (query) { setInput(query); setParams({ q: query }) }
  }

  const title = (item) => (lang === 'hi' ? item.title_hi : item.title_en) || item.title_en || item.title_hi || ''
  const subtitle = (item) => (lang === 'hi' ? item.subtitle_hi : item.subtitle_en) || item.subtitle_en || item.subtitle_hi || ''

  const distanceFor = (item) => {
    if (!coords || item.latitude == null || item.longitude == null) return null
    const km = haversineKm(coords.latitude, coords.longitude, Number(item.latitude), Number(item.longitude))
    if (!Number.isFinite(km)) return null
    return `${Math.round(km)} km`
  }

  const orderedTypes = GROUP_ORDER.filter((tp) => result.groups[tp]?.length)

  return (
    <PageShell width="content">
      <Seo title={t('search_title')} description={t('search_title')} path="/search" noindex />

      {/* Search input */}
      <form onSubmit={submit} className="flex items-center gap-2 py-4">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('search_placeholder')}
          aria-label={t('search_placeholder')}
          className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-green-500"
        />
        <VoiceSearchButton onTranscript={(txt) => setInput(txt)} />
        <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white">
          🔍
        </button>
      </form>

      {/* Empty query: prompt + popular chips */}
      {!q.trim() && (
        <div className="py-4">
          <p className="text-stone-600">{t('search_empty_prompt')}</p>
          <p className="mt-4 text-sm font-semibold text-stone-500">{t('search_popular')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-green-700 hover:bg-green-50"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results header */}
      {q.trim() && !loading && (
        <p className="pb-2 text-sm text-stone-500">
          {t('search_results_for')} “{q}” · {result.total}
        </p>
      )}

      {/* Results grouped by type */}
      {q.trim() && orderedTypes.map((type) => (
        <section key={type} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            {t(`search_group_${type}`)} · {result.groups[type].length}
          </h2>
          <ul className="space-y-2">
            {result.groups[type].map((item, i) => {
              const dist = type === 'listing' ? distanceFor(item) : null
              return (
                <li key={`${item.url}-${i}`}>
                  <Link
                    to={item.url}
                    className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:bg-green-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stone-900">{title(item)}</span>
                      {dist && <span className="shrink-0 text-xs text-stone-500">{dist}</span>}
                    </div>
                    {subtitle(item) && (
                      <div className="mt-0.5 line-clamp-2 text-sm text-stone-500">{subtitle(item)}</div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {/* No results: nearby category chips + post-a-need CTA */}
      {q.trim() && !loading && result.total === 0 && (
        <div className="py-4">
          <p className="text-stone-700">{t('search_no_results')}</p>
          <p className="mt-6 text-sm font-semibold text-stone-500">{t('search_nearby_cats')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(CATEGORY_META).map(([cat, meta]) => (
              <Link
                key={cat}
                to={`/browse?cat=${encodeURIComponent(cat)}`}
                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-green-700 hover:bg-green-50"
              >
                {meta.icon} {lang === 'hi' ? meta.hi : meta.en}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/post')}
            className="mt-6 rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white"
          >
            {t('search_post_need')}
          </button>
        </div>
      )}
    </PageShell>
  )
}
