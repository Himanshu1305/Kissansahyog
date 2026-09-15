import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import { strings } from '../lib/i18n/strings'
import { CATEGORY_META } from '../lib/listings/catalog'
import { getCategory } from '../lib/listings/registry'
import { fetchRecentListings, fetchCrops, fetchEquipmentTypes } from '../lib/listings/listingsApi'
import { fetchExperts } from '../lib/experts/expertsApi'
import { expertName, expertSpec } from './Experts'
import { timeAgo } from '../lib/timeAgo'

// Homepage categories: the 5 listing categories + Experts.
const CARD_CATS = [
  { key: 'land', icon: CATEGORY_META.land.icon },
  { key: 'equipment', icon: CATEGORY_META.equipment.icon },
  { key: 'labor', icon: CATEGORY_META.labor.icon },
  { key: 'drone_didi', icon: CATEGORY_META.drone_didi.icon },
  { key: 'bhusa', icon: CATEGORY_META.bhusa.icon },
  { key: 'agri_inputs', icon: CATEGORY_META.agri_inputs.icon },
  { key: 'experts', icon: '👨‍🌾' },
]
const FILTERS = ['all', 'land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'experts']

// Public landing page shown at "/" to visitors with no session. Logged-in users
// are redirected to /home (see App PublicOnly), so this is the unauthenticated
// experience: hero, how-it-works, category cards, live anonymised listings,
// mission, footer. It never exposes poster names or phone numbers.
export default function Homepage() {
  const { t, lang } = useLang()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const listingsRef = useRef(null)

  const [listings, setListings] = useState([])
  const [experts, setExperts] = useState([])
  const [extras, setExtras] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [rows, exp, crops, equipmentTypes] = await Promise.all([
          fetchRecentListings(12),
          fetchExperts().catch(() => []),
          fetchCrops().catch(() => []),
          fetchEquipmentTypes().catch(() => []),
        ])
        if (!alive) return
        setListings(rows)
        setExperts(exp)
        setExtras({ crops, equipmentTypes })
      } catch {
        /* homepage stays usable even if the feed fails to load */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // A ?cat= link (from the nav or a category card on another page) selects that
  // filter and scrolls to the listings section.
  useEffect(() => {
    const cat = params.get('cat')
    if (cat && FILTERS.includes(cat)) {
      setFilter(cat)
      const id = setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      return () => clearTimeout(id)
    }
  }, [params])

  function scrollToListings() {
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function openCategory(key) {
    if (isLoggedIn) {
      navigate(key === 'experts' ? '/experts' : `/browse?cat=${key}`)
    } else {
      setFilter(key)
      scrollToListings()
    }
  }

  const homeCat = (key) => t(`home_cat_${key}`)
  const shownListings = filter === 'all' || filter === 'experts'
    ? listings
    : listings.filter((l) => l.category === filter)

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />

      {/* Section 1 — Hero */}
      <section
        className="border-b border-green-100 bg-gradient-to-b from-green-50 to-stone-50"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(21,128,61,0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(180,83,9,0.06), transparent 35%)' }}
      >
        <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
          <h1 className="text-3xl font-extrabold leading-tight text-green-900 sm:text-5xl">{t('hero_headline')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-700 sm:text-xl">{t('hero_sub')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={scrollToListings}
              className="rounded-xl border-2 border-green-700 bg-white px-6 py-3 text-lg font-bold text-green-800 active:bg-green-50"
            >
              {t('cta_browse')}
            </button>
            <button
              type="button"
              onClick={() => navigate(isLoggedIn ? '/post' : '/signup')}
              className="rounded-xl bg-green-700 px-6 py-3 text-lg font-bold text-white active:bg-green-800"
            >
              {isLoggedIn ? t('post_listing') : t('cta_join')}
            </button>
          </div>
        </div>
      </section>

      {/* Section 2 — How it works */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-stone-800">{t('how_title')}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: '📝', tk: 'how_1_title', bk: 'how_1_body' },
            { icon: '📍', tk: 'how_2_title', bk: 'how_2_body' },
            { icon: '📞', tk: 'how_3_title', bk: 'how_3_body' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border-2 border-stone-100 bg-white p-5 text-center">
              <div className="text-4xl" aria-hidden="true">{s.icon}</div>
              <h3 className="mt-2 text-lg font-bold text-green-800">{t(s.tk)}</h3>
              <p className="mt-1 text-stone-600">{t(s.bk)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Category cards */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-800">{t('categories_title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => openCategory(c.key)}
                className="flex items-start gap-3 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 text-left transition hover:border-green-600 hover:bg-green-50"
              >
                <span className="text-3xl" aria-hidden="true">{c.icon}</span>
                <span className="flex-1">
                  <span className="block font-bold text-stone-900">{homeCat(c.key)}</span>
                  <span className="mt-0.5 block text-sm text-stone-600">{t(`desc_${c.key}`)}</span>
                  <span className="mt-2 inline-block text-sm font-bold text-green-700">{t('card_browse')} →</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Live listings (anonymised) */}
      <section ref={listingsRef} className="mx-auto max-w-5xl scroll-mt-20 px-5 py-12">
        <h2 className="mb-4 text-center text-2xl font-bold text-stone-800">{t('listings_section_title')}</h2>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${
                filter === f ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {f === 'all' ? t('filter_all') : homeCat(f)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-10 text-center text-stone-500">{t('loading')}</p>
        ) : filter === 'experts' ? (
          <ExpertGrid experts={experts} lang={lang} navigate={navigate} t={t} isLoggedIn={isLoggedIn} />
        ) : (
          <>
            {shownListings.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shownListings.map((l) => (
                  <PublicListingCard key={l.id} listing={l} lang={lang} t={t} extras={extras} homeCat={homeCat} navigate={navigate} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
            {/* Empty / sparse states: show the encouragement when the feed is thin. */}
            {listings.length < 3 && (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-8 text-center">
                <p className="text-lg font-semibold text-green-900">{t('listings_empty')}</p>
                <button
                  type="button"
                  onClick={() => navigate(isLoggedIn ? '/post' : '/signup')}
                  className="mt-4 rounded-xl bg-green-700 px-6 py-3 font-bold text-white active:bg-green-800"
                >
                  {t('add_listing_cta')}
                </button>
              </div>
            )}
            {listings.length >= 3 && shownListings.length === 0 && (
              <p className="py-10 text-center text-stone-500">{t('no_listings')}</p>
            )}
          </>
        )}
      </section>

      {/* Section 5 — Mission */}
      <section className="bg-green-800 py-12 text-white">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-2xl font-bold">{t('mission_title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-green-50">{t('mission_body')}</p>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-900">
            <p className="flex gap-2 text-sm font-semibold leading-snug">
              <span aria-hidden="true">⚠️</span>
              <span>{t('mission_disclaimer')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 — Footer */}
      <footer className="border-t-2 border-stone-100 bg-white py-10">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🌾</span>
              <div>
                <div className="font-extrabold text-green-800">{strings.app_name.hi}</div>
                <div className="text-sm text-stone-500">{t('tagline')}</div>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-green-800">
              <button type="button" onClick={() => navigate('/articles')} className="underline">{t('articles_nav')}</button>
              <button type="button" onClick={() => navigate('/privacy')} className="underline">{t('footer_privacy')}</button>
              <button type="button" onClick={() => navigate('/terms')} className="underline">{t('footer_terms')}</button>
              <a href="mailto:usdvisionai@gmail.com" className="underline">{t('footer_contact')}</a>
            </nav>
            <LanguageToggle className="rounded-lg bg-green-700 px-1" />
          </div>
          <p className="mt-6 text-center text-sm text-stone-500">{t('footer_copyright')}</p>
        </div>
      </footer>
    </div>
  )
}

// A single anonymised listing card — category, type, location, key details,
// price (via the category summary), time posted, and a sign-up-to-contact chip.
// Poster name/phone are never present in this data.
function PublicListingCard({ listing, lang, t, extras, homeCat, navigate, isLoggedIn }) {
  const meta = CATEGORY_META[listing.category]
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 3)
  const place = [listing.village_town, listing.district].filter(Boolean).join(', ')
  const isOffer = listing.listing_type === 'offer'
  return (
    <div className="flex flex-col rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
        <span className="font-bold text-stone-900">{homeCat(listing.category)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isOffer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {isOffer ? t('home_offer') : t('home_requirement')}
        </span>
        <span className="ml-auto text-xs text-stone-400">{timeAgo(listing.created_at, t)}</span>
      </div>
      <div className="text-sm text-stone-700">
        {rows.map((r, i) => (
          <span key={i}>
            {i > 0 && <span className="text-stone-300"> · </span>}
            {r.value}
          </span>
        ))}
      </div>
      {place && <div className="mt-1 text-sm text-stone-500">📍 {place}</div>}
      {isLoggedIn ? (
        <button
          type="button"
          onClick={() => navigate(`/listing/${listing.id}`)}
          className="mt-3 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white active:bg-green-800"
        >
          {t('view_listing')} →
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="mt-3 rounded-lg border border-dashed border-green-400 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800"
        >
          🔒 {t('signup_to_contact')}
        </button>
      )}
    </div>
  )
}

// Experts filter view: curated experts are public data; contact still needs login.
function ExpertGrid({ experts, lang, navigate, t, isLoggedIn }) {
  if (!experts.length) return <p className="py-10 text-center text-stone-500">{t('experts_none')}</p>
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {experts.map((e) => (
        <div key={e.id} className="flex flex-col rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">👨‍🌾</span>
            <span className="font-bold text-stone-900">{expertName(e, lang)}</span>
          </div>
          {expertSpec(e, lang) && <div className="mt-1 text-sm font-semibold text-green-800">{expertSpec(e, lang)}</div>}
          {e.organisation && <div className="text-sm text-stone-500">{e.organisation}</div>}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => navigate(`/experts/${e.id}`)}
              className="mt-3 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white active:bg-green-800"
            >
              {t('view_listing')} →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="mt-3 rounded-lg border border-dashed border-green-400 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800"
            >
              🔒 {t('signup_to_contact')}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
