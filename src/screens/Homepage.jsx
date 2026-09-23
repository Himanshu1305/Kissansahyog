import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import CategoryStrip from '../components/CategoryStrip'
import MandiTicker from '../components/MandiTicker'
import WeatherWidget from '../components/WeatherWidget'
import { CatIcon } from '../components/CatIcon'
import { fetchWeather } from '../lib/weather/weatherApi'
import { strings } from '../lib/i18n/strings'
import { CATEGORY_META } from '../lib/listings/catalog'
import { ENABLED_CATEGORIES } from '../lib/listings/registry'
import { getCategory } from '../lib/listings/registry'
import { fetchRecentListings, fetchCrops, fetchEquipmentTypes } from '../lib/listings/listingsApi'
import { fetchExperts } from '../lib/experts/expertsApi'
import { fetchPublishedArticles, articleTitle } from '../lib/articles/articlesApi'
import { expertName, expertSpec } from './Experts'
import { timeAgo } from '../lib/timeAgo'

// Live-listings filter options (strip): All + listing categories + Experts, with
// Land intentionally last (Experts sits before it, per the nav order).
const FILTERS = ['all', ...ENABLED_CATEGORIES.filter((c) => c !== 'land'), 'experts', 'land']

// Compact, information-dense public landing page.
export default function Homepage() {
  const { t, lang } = useLang()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const listingsRef = useRef(null)
  const aboutRef = useRef(null)

  const [listings, setListings] = useState([])
  const [experts, setExperts] = useState([])
  const [articles, setArticles] = useState([])
  const [extras, setExtras] = useState({})
  const [weather, setWeather] = useState(undefined) // undefined=loading, null=unavailable
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [rows, exp, arts, crops, equipmentTypes] = await Promise.all([
          fetchRecentListings(12),
          fetchExperts().catch(() => []),
          fetchPublishedArticles().catch(() => []),
          fetchCrops().catch(() => []),
          fetchEquipmentTypes().catch(() => []),
        ])
        if (!alive) return
        setListings(rows)
        setExperts(exp)
        setArticles(arts.slice(0, 2))
        setExtras({ crops, equipmentTypes })
      } catch { /* stays usable if the feed fails */ } finally {
        if (alive) setLoading(false)
      }
    })()
    fetchWeather().then((w) => alive && setWeather(w)).catch(() => alive && setWeather(null))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cat = params.get('cat')
    if (cat && FILTERS.includes(cat)) {
      setFilter(cat)
      const id = setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      return () => clearTimeout(id)
    }
  }, [params])

  const homeCat = (key) => t(`home_cat_${key}`)
  const shownListings = filter === 'all' || filter === 'experts' ? listings : listings.filter((l) => l.category === filter)
  const stripItems = FILTERS.map((f) => ({
    key: f,
    label: f === 'all' ? t('filter_all') : homeCat(f),
    icon: f === 'all' ? '🔍' : <CatIcon category={f} />,
  }))

  function selectFilter(key) {
    setFilter(key)
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />

      {/* 1 — Compact hero */}
      <section className="border-b border-green-100 bg-gradient-to-b from-green-50 to-stone-50">
        <div className="mx-auto max-w-4xl px-3 py-4 text-center sm:py-6">
          <h1 className="text-xl font-extrabold leading-tight text-green-900 sm:text-3xl">{t('hero_headline')}</h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-sm text-stone-700 sm:text-base">{t('hero_sub')}</p>
          <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2">
            <button type="button" onClick={() => selectFilter('all')} className="rounded-lg border-2 border-green-700 bg-white px-3 py-2 text-sm font-bold text-green-800 active:bg-green-50">{t('cta_browse')}</button>
            <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white active:bg-green-800">{isLoggedIn ? t('post_listing') : t('cta_join')}</button>
          </div>
        </div>
      </section>

      {/* Live mandi price ticker (immediately below hero, above the strip). */}
      <MandiTicker />

      {/* Weather + MSP highlight (2-col) */}
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 px-2 pt-2">
        <WeatherWidget data={weather} loading={weather === undefined} compact onForecast={() => navigate('/info#weather')} />
        <button type="button" onClick={() => navigate('/info#msp')} className="flex flex-col rounded-xl border border-green-200 bg-green-50 p-3 text-left active:bg-green-100">
          <span className="text-sm font-bold text-green-900">{t('msp_home_title')}</span>
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-stone-700">
            <span>{t('hl_crop_wheat')} <b>₹2,585</b></span>
            <span>{t('hl_crop_soybean')} <b>₹5,708</b></span>
            <span>{t('hl_crop_gram')} <b>₹5,875</b></span>
            <span>{t('hl_crop_lentil')} <b>₹7,000</b></span>
          </div>
          <span className="mt-2 text-xs font-bold text-green-700">{t('msp_full_list')} →</span>
        </button>
      </div>
      <p className="mx-auto max-w-5xl px-3 pt-1 text-[11px] text-stone-500">{t('msp_home_note')}</p>

      {/* Rainfall alert (only when rain is forecast in next 48h) */}
      {weather?.rain_alert_48h && (
        <div className="mt-2 bg-amber-400 px-3 py-1.5 text-center text-sm font-bold text-amber-950">
          🌧️ {t('rain_alert')}
        </div>
      )}

      {/* 2 — Category strip */}
      <div className="mx-auto max-w-5xl px-2 pt-2">
        <CategoryStrip items={stripItems} active={filter} onSelect={selectFilter} />
      </div>

      {/* 3 — Live listings (2-col) */}
      <section ref={listingsRef} className="mx-auto max-w-5xl scroll-mt-16 px-2 py-3">
        <h2 className="mb-2 text-base font-bold text-stone-800">{t('listings_section_title')}</h2>
        {loading ? (
          <p className="py-8 text-center text-stone-500">{t('loading')}</p>
        ) : filter === 'experts' ? (
          <ExpertGrid experts={experts} lang={lang} navigate={navigate} t={t} isLoggedIn={isLoggedIn} />
        ) : (
          <>
            {shownListings.length > 0 && (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {shownListings.map((l) => (
                  <PublicListingCard key={l.id} listing={l} lang={lang} t={t} extras={extras} homeCat={homeCat} navigate={navigate} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
            {listings.length < 3 && (
              <div className="mt-3 rounded-xl border border-dashed border-green-300 bg-green-50 p-4 text-center">
                <p className="font-semibold text-green-900">{t('listings_empty')}</p>
                <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white active:bg-green-800">{t('add_listing_cta')}</button>
              </div>
            )}
            {listings.length >= 3 && shownListings.length === 0 && (
              <p className="py-8 text-center text-stone-500">{t('no_listings')}</p>
            )}
          </>
        )}
      </section>

      {/* 4 — Mission strip (both objectives) → scrolls to About */}
      <button
        type="button"
        onClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })}
        className="flex w-full items-center justify-center gap-4 bg-green-800 px-3 py-2.5 text-sm font-bold text-white"
      >
        <span>🌾 {t('mission_income')}</span>
        <span className="text-green-400">|</span>
        <span>💼 {t('mission_rojgar')}</span>
      </button>

      {/* 5 — Government contacts (compact horizontal-scroll row) */}
      <section className="mx-auto max-w-5xl px-2 py-3">
        <h2 className="mb-2 text-base font-bold text-stone-800">{t('res_home_heading')}</h2>
        <div className="-mx-2 flex gap-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { icon: '🧪', titleKey: 'res_card_soil_title', info: 'res_card_soil_1', hash: 'soil' },
            { icon: '🐄', titleKey: 'res_card_vet_title', info: 'res_card_vet_1', hash: 'veterinary' },
            { icon: '🏛️', titleKey: 'res_card_offices_title', info: 'res_card_offices_1', hash: 'offices' },
          ].map((c) => (
            <button key={c.hash} type="button" onClick={() => navigate(`/resources#${c.hash}`)} className="w-52 shrink-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left active:bg-amber-100">
              <div className="flex items-center gap-2"><span className="text-xl" aria-hidden="true">{c.icon}</span><span className="font-bold text-stone-900">{t(c.titleKey)}</span></div>
              <div className="mt-1 text-xs text-stone-600">{t(c.info)}</div>
              <div className="mt-1 text-xs font-bold text-amber-700">{t('res_full_details')} →</div>
            </button>
          ))}
        </div>
      </section>

      {/* 6 — Articles (compact 2-card row) */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-5xl px-2 py-3">
          <h2 className="mb-2 text-base font-bold text-stone-800">{t('articles_title')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="rounded-xl border border-stone-200 bg-white p-3 text-left active:bg-stone-50">
                <div className="text-2xl" aria-hidden="true">📰</div>
                <div className="mt-1 line-clamp-2 text-sm font-bold text-stone-900">{articleTitle(a, lang)}</div>
                <div className="mt-1 text-xs font-bold text-green-700">{t('read_more')} →</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* About / mission (target of the mission strip) */}
      <section ref={aboutRef} className="scroll-mt-16 bg-green-800 py-6 text-white">
        <div className="mx-auto max-w-3xl px-3 text-center">
          <h2 className="text-lg font-bold">{t('mission_title')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-green-50">{t('mission_body')}</p>
          <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-amber-900">
            <p className="flex gap-2 text-xs font-semibold leading-snug"><span aria-hidden="true">⚠️</span><span>{t('mission_disclaimer')}</span></p>
          </div>
        </div>
      </section>

      {/* 7 — Footer (reduced padding) */}
      <footer className="border-t border-stone-100 bg-white py-4">
        <div className="mx-auto max-w-5xl px-3">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🌾</span>
              <div>
                <div className="font-extrabold text-green-800">{strings.app_name.hi}</div>
                <div className="text-xs text-stone-500">{t('tagline')}</div>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-green-800">
              <button type="button" onClick={() => navigate('/articles')} className="underline">{t('articles_nav')}</button>
              <button type="button" onClick={() => navigate('/resources')} className="underline">{t('resources_nav')}</button>
              <button type="button" onClick={() => navigate('/privacy')} className="underline">{t('footer_privacy')}</button>
              <button type="button" onClick={() => navigate('/terms')} className="underline">{t('footer_terms')}</button>
              <a href="mailto:usdvisionai@gmail.com" className="underline">{t('footer_contact')}</a>
            </nav>
            <LanguageToggle className="rounded-lg bg-green-700 px-1" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">{t('footer_copyright')}</p>
        </div>
      </footer>
    </div>
  )
}

// Compact anonymised listing card (2-col). Poster name/phone never present here.
function PublicListingCard({ listing, lang, t, extras, homeCat, navigate, isLoggedIn }) {
  const meta = CATEGORY_META[listing.category]
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 2)
  const place = [listing.village_town, listing.district].filter(Boolean).join(', ')
  const isOffer = listing.listing_type === 'offer'
  const isVendor = listing.listing_source === 'vendor'
  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <CatIcon category={listing.category} className="text-lg leading-none" />
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isOffer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{isOffer ? t('home_offer') : t('home_requirement')}</span>
        {isVendor && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">🏪 {t('vendor_badge')}</span>}
        <span className="ml-auto text-[11px] text-stone-400">{timeAgo(listing.created_at, t)}</span>
      </div>
      <div className="text-sm font-medium leading-snug text-stone-800">
        {rows.map((r, i) => (<span key={i}>{i > 0 && <span className="text-stone-300"> · </span>}{r.value}</span>))}
      </div>
      {place && <div className="mt-1 truncate text-xs text-stone-500">📍 {place}</div>}
      {isLoggedIn ? (
        <button type="button" onClick={() => navigate(`/listing/${listing.id}`)} className="mt-2 rounded-lg bg-green-700 px-2 py-1.5 text-xs font-semibold text-white active:bg-green-800">{t('view_listing')} →</button>
      ) : (
        <button type="button" onClick={() => navigate('/signup')} className="mt-2 rounded-lg border border-dashed border-green-400 bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-800">🔒 {t('signup_to_contact')}</button>
      )}
    </div>
  )
}

function ExpertGrid({ experts, lang, navigate, t, isLoggedIn }) {
  if (!experts.length) return <p className="py-8 text-center text-stone-500">{t('experts_none')}</p>
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {experts.map((e) => (
        <div key={e.id} className="flex flex-col rounded-xl border border-stone-200 bg-white p-3">
          <div className="flex items-center gap-1"><span className="text-lg" aria-hidden="true">👨‍🌾</span><span className="text-sm font-bold text-stone-900">{expertName(e, lang)}</span></div>
          {expertSpec(e, lang) && <div className="mt-0.5 text-xs font-semibold text-green-800">{expertSpec(e, lang)}</div>}
          {e.organisation && <div className="text-xs text-stone-500">{e.organisation}</div>}
          {isLoggedIn ? (
            <button type="button" onClick={() => navigate(`/experts/${e.id}`)} className="mt-2 rounded-lg bg-green-700 px-2 py-1.5 text-xs font-semibold text-white active:bg-green-800">{t('view_listing')} →</button>
          ) : (
            <button type="button" onClick={() => navigate('/signup')} className="mt-2 rounded-lg border border-dashed border-green-400 bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-800">🔒 {t('signup_to_contact')}</button>
          )}
        </div>
      ))}
    </div>
  )
}
