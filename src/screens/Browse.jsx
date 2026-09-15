import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import ListingCard from '../components/ListingCard'
import CategoryStrip from '../components/CategoryStrip'
import { CatIcon } from '../components/CatIcon'
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

  const [searchParams] = useSearchParams()
  // Deep-link support: /browse?cat=land selects that tab (from the global nav).
  const initialCat = ENABLED_CATEGORIES.includes(searchParams.get('cat'))
    ? searchParams.get('cat')
    : ENABLED_CATEGORIES[0]
  const [category, setCategory] = useState(initialCat)
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

  const chip = (active) =>
    `rounded-full px-3 py-1 text-sm font-semibold border ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  // Land shows full-width single-column cards (more detail); the rest use a
  // 2-column mobile grid so more results are visible at once.
  const gridClass = category === 'land' ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3'

  return (
    <Screen title={t('browse_title')} onBack={() => navigate('/home')} right={<LanguageToggle />}>
      {/* Horizontal scrollable category strip (compact chips, one row). */}
      <div className="mb-2">
        <CategoryStrip
          items={ENABLED_CATEGORIES.map((c) => ({ key: c, icon: <CatIcon category={c} />, label: CATEGORY_META[c][lang] }))}
          active={category}
          onSelect={setCategory}
        />
      </div>

      {/* Offer / Requirement filter + sort — one compact row. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button className={chip(typeFilter === null)} onClick={() => setTypeFilter(null)}>{t('filter_all')}</button>
        <button className={chip(typeFilter === 'offer')} onClick={() => setTypeFilter('offer')}>{LISTING_TYPE_META.offer[lang]}</button>
        <button className={chip(typeFilter === 'requirement')} onClick={() => setTypeFilter('requirement')}>{LISTING_TYPE_META.requirement[lang]}</button>
        <span className="mx-1 h-4 w-px bg-stone-200" />
        <button className={chip(sort === 'nearest')} onClick={() => setSort('nearest')}>{t('sort_nearest')}</button>
        <button className={chip(sort === 'newest')} onClick={() => setSort('newest')}>{t('sort_newest')}</button>
      </div>

      {/* Bhusa/Parali → link to the residue-burning article. */}
      {category === 'bhusa' && (
        <button
          type="button"
          onClick={() => navigate('/articles/parali-pollution-kisaan-ki-majboori')}
          className="mb-2 block w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-left text-sm font-semibold text-amber-900"
        >
          📖 {t('read_about_this')} →
        </button>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <Spinner />
      ) : listings.length === 0 && fallback.length === 0 ? (
        <p className="py-12 text-center text-stone-500">{t('no_listings')}</p>
      ) : (
        <>
          <div className={gridClass}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} extras={extras} onClick={() => navigate(`/listing/${l.id}`)} />
            ))}
          </div>

          {/* Soft radius fallback: a compact divider, then the 30–50 km ring. */}
          {listings.length < MIN_PRIMARY_RESULTS && fallback.length > 0 && (
            <div data-testid="fallback-section">
              <div className="my-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-stone-200" />
                <span className="text-xs font-semibold text-stone-500">{t('radius_fallback')}</span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className={gridClass}>
                {fallback.map((l) => (
                  <ListingCard key={l.id} listing={l} extras={extras} onClick={() => navigate(`/listing/${l.id}`)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Screen>
  )
}
