import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import ListingCard from '../components/ListingCard'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { ENABLED_CATEGORIES } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { fetchNearby } from '../lib/listings/listingsApi'
import { MIN_PRIMARY_RESULTS } from '../lib/distance'

// Browse nearby active listings. Category tabs · Offer/Requirement filter ·
// nearest/newest sort · 30 km radius (computed in fetchNearby).
export default function Browse() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [category, setCategory] = useState(ENABLED_CATEGORIES[0])
  const [typeFilter, setTypeFilter] = useState(null) // null | 'offer' | 'requirement'
  const [sort, setSort] = useState('nearest')
  const [extras, setExtras] = useState({})
  const [listings, setListings] = useState([])
  const [fallback, setFallback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ex, res] = await Promise.all([
        loadExtras(category),
        fetchNearby({
          category,
          listingType: typeFilter,
          center: { latitude: user.latitude, longitude: user.longitude },
          sort,
        }),
      ])
      setExtras(ex)
      setListings(res.primary)
      setFallback(res.fallback)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setLoading(false)
    }
  }, [category, typeFilter, sort, user, t])

  useEffect(() => {
    load()
  }, [load])

  const tabClass = (c) =>
    `flex-1 rounded-xl px-2 py-3 text-base font-bold ${
      category === c ? 'bg-green-700 text-white' : 'bg-white text-stone-700 border-2 border-stone-200'
    }`
  const chip = (active) =>
    `rounded-full px-4 py-2 text-sm font-semibold border-2 ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`

  return (
    <Screen title={t('browse_title')} onBack={() => navigate('/home')} right={<LanguageToggle />}>
      {/* Category tabs */}
      <div className="mb-3 flex gap-2">
        {ENABLED_CATEGORIES.map((c) => (
          <button key={c} data-testid={`tab-${c}`} className={tabClass(c)} onClick={() => setCategory(c)}>
            {CATEGORY_META[c].icon} {CATEGORY_META[c][lang]}
          </button>
        ))}
      </div>

      {/* Offer / Requirement filter */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button className={chip(typeFilter === null)} onClick={() => setTypeFilter(null)}>
          {t('filter_all')}
        </button>
        <button className={chip(typeFilter === 'offer')} onClick={() => setTypeFilter('offer')}>
          {LISTING_TYPE_META.offer[lang]}
        </button>
        <button
          className={chip(typeFilter === 'requirement')}
          onClick={() => setTypeFilter('requirement')}
        >
          {LISTING_TYPE_META.requirement[lang]}
        </button>
      </div>

      {/* Sort */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">📍 {t('within_30km')}</p>
        <div className="flex gap-2">
          <button className={chip(sort === 'nearest')} onClick={() => setSort('nearest')}>
            {t('sort_nearest')}
          </button>
          <button className={chip(sort === 'newest')} onClick={() => setSort('newest')}>
            {t('sort_newest')}
          </button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <Spinner />
      ) : listings.length === 0 && fallback.length === 0 ? (
        <p className="py-12 text-center text-stone-500">{t('no_listings')}</p>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              extras={extras}
              onClick={() => navigate(`/listing/${l.id}`)}
            />
          ))}

          {/* Soft radius fallback: only surfaced when primary (<=30km) results
              are sparse, so a low-density pilot area isn't a blank screen. */}
          {listings.length < MIN_PRIMARY_RESULTS && fallback.length > 0 && (
            <div className="pt-2" data-testid="fallback-section">
              <div className="mb-2 mt-4 flex items-center gap-2">
                <span className="h-px flex-1 bg-stone-200" />
                <span className="text-sm font-semibold text-stone-500">{t('radius_fallback')}</span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="space-y-3">
                {fallback.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    extras={extras}
                    onClick={() => navigate(`/listing/${l.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Screen>
  )
}
