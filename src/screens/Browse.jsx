import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Notice, Spinner } from '../components/ui'
import { Seo } from '../components/layout'
import LanguageToggle from '../components/LanguageToggle'
import ListingCard from '../components/ListingCard'
import { LocationControl } from '../components/pages/shared'
import { CatIcon } from '../components/CatIcon'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { ENABLED_CATEGORIES } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { fetchNearby, fetchTopViewed, fetchPincode } from '../lib/listings/listingsApi'
import { initialLocation, DEFAULT_COORDS, DEFAULT_PINCODE } from '../lib/location/locationStore'

// Browse nearby active listings. Public — no login needed to look (Batch1 item 3A);
// the phone number stays behind login (reveal flow in ListingCard/ListingDetail).
// All 10 category chips wrap (no hidden horizontal scroll). Location comes from the
// shared LocationControl for logged-out visitors; logged-in users seed from profile.
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
  // Equipment sub-type deep-link (Phase 5): /browse?cat=equipment&etype=water_tanker.
  const etype = searchParams.get('etype')
  const [typeFilter, setTypeFilter] = useState(null) // null | 'offer' | 'requirement'
  const [sort, setSort] = useState('nearest')
  const [extras, setExtras] = useState({})
  const [listings, setListings] = useState([])
  const [fallback, setFallback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [topViewed, setTopViewed] = useState([])
  // Location works without a profile: seed from the profile pincode when logged in,
  // else the Sagar default; the LocationControl lets anyone pick GPS/pincode/village.
  const [loc, setLoc] = useState(() => initialLocation(user?.pincode))

  // Most-viewed teasers, filtered to the selected category (Batch1 item 3).
  useEffect(() => {
    let alive = true
    fetchTopViewed({ limit: 4, category }).then((v) => alive && setTopViewed(v)).catch(() => {})
    return () => { alive = false }
  }, [category])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Resolve the search centre: precise GPS coords when present, else the
      // selected pincode's coordinates, else the Sagar default.
      let lat = loc.rawCoords?.latitude
      let lon = loc.rawCoords?.longitude
      if (lat == null || lon == null) {
        const p = await fetchPincode(loc.matchedVillage?.pincode || DEFAULT_PINCODE)
        lat = p?.latitude ?? DEFAULT_COORDS.latitude
        lon = p?.longitude ?? DEFAULT_COORDS.longitude
      }
      const [ex, res] = await Promise.all([
        loadExtras(category),
        fetchNearby({
          category,
          listingType: typeFilter,
          center: { latitude: lat, longitude: lon },
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
  }, [category, typeFilter, sort, loc, t])

  useEffect(() => {
    load()
  }, [load])

  const chip = (active) =>
    `rounded-full px-3 py-1 text-sm font-semibold border ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  const catChip = (active) =>
    `flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
      active ? 'border-[var(--ks-green)] bg-[var(--ks-green)] text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  // Land shows full-width single-column cards on mobile (more detail); the rest use a
  // responsive grid: 2 (mobile) · 3 (tablet) · 4 (desktop).
  const gridClass = category === 'land' ? 'grid grid-cols-1 gap-2 md:grid-cols-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4'

  // Optional equipment sub-type filter (water tanker): keep only tanker listings.
  const tankerId = (extras.equipmentTypes || []).find((e) => e.name_en === 'Water tanker')?.id ?? null
  const matchesEtype = (l) => etype !== 'water_tanker' ? true : (l.details?.is_tanker === true || l.details?.equipment_type_id === tankerId)
  const shownListings = listings.filter(matchesEtype)
  const shownFallback = fallback.filter(matchesEtype)

  return (
    <Screen title={t('browse_title')} onBack={() => navigate(user ? '/home' : '/')} right={<LanguageToggle />} width="wide">
      {/* Browse + listings are noindex for now (SEO for listings is a later batch). */}
      <Seo noindex path="/browse" />
      {/* Category chips — all 10 wrap into rows (no hidden horizontal scroll). */}
      <div className="mb-3 flex flex-wrap gap-2" data-testid="browse-cats">
        {ENABLED_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`chip-${c}`}
            aria-pressed={category === c}
            className={catChip(category === c)}
            onClick={() => setCategory(c)}
          >
            <CatIcon category={c} /> {CATEGORY_META[c][lang]}
          </button>
        ))}
      </div>

      {/* Location (GPS / pincode / village) — works without a profile. */}
      <div className="mb-3">
        <LocationControl value={loc} onChange={setLoc} showOutOfArea={false} />
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

      {/* Drone Didi → govt-scheme banner (with the scheme badge + learn-more). */}
      {category === 'drone_didi' && (
        <div className="mb-2 flex min-h-[80px] items-center gap-3 rounded-xl bg-gradient-to-r from-sky-700 to-indigo-600 px-3 py-2 text-white">
          <CatIcon category="drone_didi" className="shrink-0 text-4xl" />
          <div className="flex-1">
            <p className="text-sm font-semibold leading-snug">{t('drone_banner_text')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">{t('drone_scheme_badge')}</span>
              <button type="button" onClick={() => navigate('/resources')} className="text-[11px] font-bold underline">{t('learn_more')} →</button>
            </div>
          </div>
        </div>
      )}

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

      {/* सबसे ज़्यादा देखा गया (Phase 11 discovery box) — current category only, hidden when empty. */}
      {topViewed.length > 0 && (
        <section className="mb-3" aria-label={t('most_viewed_heading')}>
          <h2 className="mb-1.5 text-sm font-bold text-stone-900">{t('most_viewed_heading')}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {topViewed.map((l) => (
              <ListingCard key={l.id} listing={l} extras={extras} onClick={() => navigate(`/listing/${l.id}`)} />
            ))}
          </div>
        </section>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <Spinner />
      ) : shownListings.length === 0 && shownFallback.length === 0 ? (
        <p className="py-12 text-center text-stone-500">{t('no_listings')}</p>
      ) : (
        <>
          <div className={gridClass}>
            {shownListings.map((l) => (
              <ListingCard key={l.id} listing={l} extras={extras} onClick={() => navigate(`/listing/${l.id}`)} />
            ))}
          </div>

          {/* Soft radius fallback: the 30–50 km ring, returned by fetchNearby ONLY when
              there are zero results within 30 km (Phase 0b). */}
          {shownFallback.length > 0 && (
            <div data-testid="fallback-section">
              <div className="my-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-stone-200" />
                <span className="text-xs font-semibold text-stone-500">{t('radius_fallback')}</span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className={gridClass}>
                {shownFallback.map((l) => (
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
