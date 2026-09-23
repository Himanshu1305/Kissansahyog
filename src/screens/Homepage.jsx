import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import CategoryStrip from '../components/CategoryStrip'
import MandiTicker from '../components/MandiTicker'
import RainAlert from '../components/RainAlert'
import TrustCarousel from '../components/TrustCarousel'
import { CatIcon } from '../components/CatIcon'
import { generateListingMessage, generatePlatformMessage } from '../lib/share/shareMessages'
import { fetchWeather, weatherInfo, wdayKey } from '../lib/weather/weatherApi'
import { getRainAlert } from '../lib/weather/rainAlert'
import { fetchMsp, MANDI_TO_MSP } from '../lib/msp/mspApi'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { strings } from '../lib/i18n/strings'
import { CATEGORY_META } from '../lib/listings/catalog'
import { ENABLED_CATEGORIES, getCategory } from '../lib/listings/registry'
import { fetchRecentListings, fetchCrops, fetchEquipmentTypes } from '../lib/listings/listingsApi'
import { fetchExperts } from '../lib/experts/expertsApi'
import { fetchPublishedArticles, articleTitle } from '../lib/articles/articlesApi'
import { fetchFeaturedSawaal, fetchFeaturedYojana, sawaalQuestion, sawaalAnswer, yojanaName, yojanaBenefit, yojanaEligibility } from '../lib/community/communityApi'
import { expertName, expertSpec } from './Experts'
import { timeAgo } from '../lib/timeAgo'

// Live-listings filter (strip): All + listing categories + Experts, Land last.
const FILTERS = ['all', ...ENABLED_CATEGORIES.filter((c) => c !== 'land'), 'experts', 'land']

const HERO_IMG = 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=1200'
const HERO_OVERLAY = 'linear-gradient(135deg, rgba(8,32,16,0.88) 0%, rgba(8,32,16,0.55) 100%)'
// Static MSP fallback (2026-27) keyed by CACP crop_en so it matches MANDI_TO_MSP.
const MSP_ROWS = [
  { crop_en: 'Wheat', hiKey: 'hl_crop_wheat', msp: 2585 },
  { crop_en: 'Soyabean', hiKey: 'hl_crop_soybean', msp: 5708 },
  { crop_en: 'Gram', hiKey: 'hl_crop_gram', msp: 5875 },
  { crop_en: 'Masur (Lentil)', hiKey: 'hl_crop_lentil', msp: 7000 },
]
const fmtRs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

// Compact, information-dense public landing page (Homepage v2).
export default function Homepage() {
  const { t, lang } = useLang()
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const listingsRef = useRef(null)

  const [listings, setListings] = useState([])
  const [experts, setExperts] = useState([])
  const [articles, setArticles] = useState([])
  const [sawaal, setSawaal] = useState([])
  const [schemes, setSchemes] = useState([])
  const [extras, setExtras] = useState({})
  const [weather, setWeather] = useState(undefined) // undefined=loading, null=unavailable
  const [msp, setMsp] = useState([])
  const [mandi, setMandi] = useState({ rows: [], day: 'none' })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [rows, exp, arts, crops, equipmentTypes, saw, sch] = await Promise.all([
          fetchRecentListings(12),
          fetchExperts().catch(() => []),
          fetchPublishedArticles().catch(() => []),
          fetchCrops().catch(() => []),
          fetchEquipmentTypes().catch(() => []),
          fetchFeaturedSawaal(2).catch(() => []),
          fetchFeaturedYojana(4).catch(() => []),
        ])
        if (!alive) return
        setListings(rows)
        setExperts(exp)
        setArticles(arts.slice(0, 2))
        setSawaal(saw)
        setSchemes(sch)
        setExtras({ crops, equipmentTypes })
      } catch { /* stays usable if the feed fails */ } finally {
        if (alive) setLoading(false)
      }
    })()
    fetchWeather().then((w) => alive && setWeather(w)).catch(() => alive && setWeather(null))
    fetchMsp().then((m) => alive && setMsp(m)).catch(() => alive && setMsp([]))
    fetchMandiPrices().then((m) => alive && setMandi(m)).catch(() => {})
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

  const waHero = `https://wa.me/?text=${encodeURIComponent(generatePlatformMessage(lang))}`
  const locationLabel = user?.village_town || user?.pincode || t('weather_near_you')

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />

      {/* 1 — Live mandi ticker: the very first thing below the nav */}
      <MandiTicker />

      {/* 2 — Full-bleed hero */}
      <section className="relative h-[240px] w-full overflow-hidden sm:h-[300px]">
        <div className="absolute inset-0 bg-[#0f3d1f]" />
        <img src={HERO_IMG} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover opacity-45" style={{ objectPosition: 'center' }} />
        <div className="absolute inset-0" style={{ background: HERO_OVERLAY }} />
        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col justify-center px-[14px] pb-12 sm:px-6">
          <div className="inline-flex w-fit items-center gap-1 rounded-[20px] border px-[10px] py-[3px] text-[10px]" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.18)', color: '#b8dfc4' }}>
            🌾 {t('hero_eyebrow')}
          </div>
          <h1 className="mt-2 text-xl font-extrabold leading-tight text-white sm:text-3xl">
            {t('hero_h1_l1')}<br />{t('hero_h1_l2')}
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-green-50/90 sm:text-sm">
            {t('hero_subline1')}<br /><span className="font-semibold text-[#b8dfc4]">{t('hero_subline2')}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => selectFilter('all')} className="rounded-lg px-3 py-2 text-xs font-bold text-white sm:text-sm" style={{ background: '#3da85f' }}>
              {t('hero_btn_browse')} →
            </button>
            <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-xs font-bold text-white sm:text-sm">
              + {t('hero_btn_new')}
            </button>
            <a href={waHero} target="_blank" rel="noopener noreferrer" data-testid="hero-whatsapp" className="rounded-lg px-3 py-2 text-xs font-bold text-white sm:text-sm" style={{ background: '#25D366' }}>
              📲 {t('hero_btn_whatsapp')}
            </a>
          </div>
        </div>
        {/* Stats bar pinned to the bottom of the hero */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex" style={{ background: 'rgba(8,32,16,0.75)' }}>
          {[
            { v: '50+', k: 'stat_listings_label' },
            { v: '9', k: 'stat_categories_label' },
            { v: t('stat_radius_value'), k: 'stat_radius_label' },
            { v: t('stat_free_value'), k: 'stat_free_label' },
          ].map((s, i) => (
            <div key={s.k} className={`flex-1 py-1.5 text-center ${i > 0 ? 'border-l' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-sm font-extrabold" style={{ color: '#4caf70' }}>{s.v}</div>
              <div className="text-[9px] font-semibold" style={{ color: '#90c8a0' }}>{t(s.k)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Trust carousel */}
      <TrustCarousel />

      {/* 4 — Rich rain alert (blue; only when rain forecast in next 48h) */}
      <RainAlert alert={getRainAlert(weather?.forecast)} />

      {/* 5 — Weather + MSP info strip */}
      <WeatherMspStrip weather={weather} msp={msp} mandi={mandi} t={t} lang={lang} navigate={navigate} locationLabel={locationLabel} />

      {/* 6 — Category strip */}
      <div className="w-full px-[14px] pt-2 sm:px-6">
        <CategoryStrip items={stripItems} active={filter} onSelect={selectFilter} />
      </div>

      {/* 7 — Live listings */}
      <section ref={listingsRef} className="mx-auto max-w-5xl scroll-mt-16 px-[14px] py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-800">{t('recent_listings_title')}</h2>
          <button type="button" onClick={() => navigate(isLoggedIn ? '/browse' : '/signup')} className="text-xs font-bold text-green-700">{t('view_all')} →</button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-stone-500">{t('loading')}</p>
        ) : filter === 'experts' ? (
          <ExpertGrid experts={experts} lang={lang} navigate={navigate} t={t} isLoggedIn={isLoggedIn} />
        ) : (
          <>
            {shownListings.length > 0 && (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {shownListings.map((l) => (
                  <PublicListingCard key={l.id} listing={l} lang={lang} t={t} extras={extras} navigate={navigate} isLoggedIn={isLoggedIn} />
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

      {/* 8 — Government contacts (amber horizontal scroll strip) */}
      <section className="w-full border-y-2 px-[14px] py-3 sm:px-6" style={{ borderColor: '#e8a800', background: '#fffbf0' }}>
        <h2 className="mb-2 text-base font-bold text-stone-800">{t('res_home_heading')}</h2>
        <div className="-mx-[14px] flex gap-2 overflow-x-auto px-[14px] sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { icon: '🧪', titleKey: 'res_card_soil_title', info: 'res_card_soil_1', hash: 'soil' },
            { icon: '🐄', titleKey: 'res_card_vet_title', info: 'res_card_vet_1', hash: 'veterinary' },
            { icon: '🏛️', titleKey: 'res_card_offices_title', info: 'res_card_offices_1', hash: 'offices' },
          ].map((c) => (
            <button key={c.hash} type="button" onClick={() => navigate(`/resources#${c.hash}`)} className="w-52 shrink-0 rounded-xl border border-amber-200 bg-white p-3 text-left active:bg-amber-50">
              <div className="flex items-center gap-2"><span className="text-xl" aria-hidden="true">{c.icon}</span><span className="font-bold text-stone-900">{t(c.titleKey)}</span></div>
              <div className="mt-1 text-xs text-stone-600">{t(c.info)}</div>
              <div className="mt-1 text-xs font-bold text-amber-700">{t('res_full_details')} →</div>
            </button>
          ))}
        </div>
      </section>

      {/* 9 — Government schemes (Sarkari Yojana) */}
      <section className="mx-auto max-w-5xl px-[14px] py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-800">{t('info_yojana_heading')}</h2>
          <button type="button" onClick={() => navigate('/yojana')} className="text-xs font-bold text-green-700">{t('schemes_all_link')} →</button>
        </div>
        {schemes.length === 0 ? (
          <button type="button" onClick={() => navigate('/yojana')} className="block w-full rounded-xl border border-dashed border-green-300 bg-green-50 p-3 text-left text-sm font-semibold text-green-900">
            {t('info_yojana_heading')} → {t('schemes_all_link')}
          </button>
        ) : (
          <div className="-mx-[14px] flex gap-2 overflow-x-auto px-[14px] sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {schemes.map((s) => (
              <button key={s.id} type="button" onClick={() => navigate('/yojana')} className="flex w-[148px] shrink-0 flex-col rounded-xl border border-green-200 bg-white p-2.5 text-left active:bg-green-50">
                <span className="w-fit rounded-full bg-green-100 px-1.5 py-0.5 text-[8.5px] font-bold text-green-800">{t(`ycat_${s.category}`)}</span>
                <span className="mt-1 text-[11px] font-bold leading-snug text-stone-900">{yojanaName(s, lang)}</span>
                <span className="mt-0.5 text-[10px] font-bold text-green-700">{yojanaBenefit(s, lang)}</span>
                <span className="mt-0.5 line-clamp-2 text-[9px] text-stone-500">{yojanaEligibility(s, lang)}</span>
                <span className="mt-1 text-[9px] font-bold text-green-700">{t('yojana_howto_label')} →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 10 — Kisan Sawaal featured Q&A */}
      <QAStrip sawaal={sawaal} t={t} lang={lang} navigate={navigate} />

      {/* 11 — Articles (2-card row) */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-5xl px-[14px] py-3 sm:px-6">
          <h2 className="mb-2 text-base font-bold text-stone-800">{t('articles_title')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left active:bg-stone-50">
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-[68px] w-full bg-[#2d6a3f] object-cover" />
                ) : (
                  <div className="flex h-[68px] w-full items-center justify-center bg-[#2d6a3f] text-2xl">📰</div>
                )}
                <div className="p-2.5">
                  <div className="text-[8.5px] font-bold uppercase tracking-wide text-green-700">{t('articles_nav')}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10.5px] font-bold text-stone-900">{articleTitle(a, lang)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 12 — Mission bar */}
      <div className="flex w-full items-center justify-center gap-6 px-[14px] py-2.5 sm:px-6" style={{ background: '#0f3d1f' }}>
        {[t('mission_income'), t('mission_rojgar')].map((m, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: '#90c8a0' }}>
            <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: '#4caf70' }} aria-hidden="true" />
            {i === 0 ? '🌾' : '💼'} {m}
          </span>
        ))}
      </div>

      {/* Mission / disclaimer */}
      <section className="bg-green-800 py-5 text-white">
        <div className="mx-auto max-w-3xl px-[14px] text-center sm:px-6">
          <h2 className="text-lg font-bold">{t('mission_title')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-green-50">{t('mission_body')}</p>
          <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-amber-900">
            <p className="flex gap-2 text-xs font-semibold leading-snug"><span aria-hidden="true">⚠️</span><span>{t('mission_disclaimer')}</span></p>
          </div>
        </div>
      </section>

      {/* 13 — Footer */}
      <footer className="border-t border-stone-100 bg-white py-4">
        <div className="mx-auto max-w-5xl px-[14px] sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🌾</span>
              <div>
                <div className="font-extrabold text-green-800">{strings.app_name.hi}</div>
                <div className="text-xs text-stone-500">{t('footer_company')}</div>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-green-800">
              <button type="button" onClick={() => navigate('/privacy')} className="underline">{t('footer_privacy')}</button>
              <button type="button" onClick={() => navigate('/terms')} className="underline">{t('footer_terms')}</button>
              <button type="button" onClick={() => navigate('/resources')} className="underline">{t('resources_nav')}</button>
              <button type="button" onClick={() => navigate('/articles')} className="underline">{t('articles_nav')}</button>
              <a href="mailto:admin@kissansahyog.com" className="underline">{t('footer_contact')}</a>
            </nav>
            <LanguageToggle className="rounded-lg bg-green-700 px-1" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">{t('footer_copyright')}</p>
        </div>
      </footer>
    </div>
  )
}

// Phase 6 — Weather (left) + MSP (right) info strip. Weather location is dynamic.
function WeatherMspStrip({ weather, msp, mandi, t, lang, navigate, locationLabel }) {
  const forecast = Array.isArray(weather?.forecast) ? weather.forecast.slice(0, 5) : []
  const cur = weather ? weatherInfo(weather.current_weathercode) : null
  // Live MSP by crop_en (fallback to the static 2026-27 values).
  const mspFor = (cropEn, fallback) => {
    const row = (msp || []).find((m) => m.crop_en === cropEn)
    return row ? Number(row.msp_per_quintal) : fallback
  }
  // Mandi modal price for a CACP crop (via MANDI_TO_MSP), if present.
  const mandiFor = (cropEn) => {
    const row = (mandi.rows || []).find((r) => MANDI_TO_MSP[r.commodity_en] === cropEn && r.modal_price != null)
    return row ? Number(row.modal_price) : null
  }

  return (
    <div className="flex w-full border-b bg-white" style={{ borderColor: '#e8e8e4' }}>
      {/* Left — Weather */}
      <button type="button" onClick={() => navigate('/info#weather')} className="flex-1 border-r px-[14px] py-2 text-left" style={{ borderColor: '#e8e8e4' }}>
        <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#888' }}>🌤️ {t('weather_title')}</div>
        {weather === undefined ? (
          <div className="mt-1 h-4 w-20 animate-pulse rounded bg-stone-100" />
        ) : !weather ? (
          <div className="mt-1 text-[10.5px] text-stone-500">{t('weather_unavailable')}</div>
        ) : (
          <>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold" style={{ color: '#1a5c2e' }}>{weather.current_temp != null ? `${Math.round(weather.current_temp)}°` : '—'}</span>
              <span className="text-[10.5px]" style={{ color: '#444' }}>{cur.icon} {t(cur.key)}</span>
            </div>
            <div className="text-[9px]" style={{ color: '#888' }}>📍 {locationLabel}</div>
            <div className="mt-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {forecast.map((d, i) => {
                const info = weatherInfo(d.weathercode)
                const mm = Math.round(Number(d.precipitation_sum) || 0)
                return (
                  <div key={i} className="shrink-0 text-center">
                    <div className="text-[8.5px] font-bold text-stone-600">{t(wdayKey(d.date))}</div>
                    <div className="text-sm" aria-hidden="true">{info.icon}</div>
                    <div className={`text-[8.5px] font-semibold ${mm > 0 ? 'text-sky-600' : 'text-stone-400'}`}>{mm > 0 ? `${mm}${t('mm_unit')}` : '—'}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div className="mt-1 text-[9.5px] font-bold text-green-700">{t('weather_5day')} →</div>
      </button>

      {/* Right — MSP */}
      <button type="button" onClick={() => navigate('/info#msp')} className="flex-1 px-[14px] py-2 text-left">
        <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#888' }}>📋 MSP 2026-27</div>
        <div className="mt-0.5">
          {MSP_ROWS.map((r) => {
            const price = mspFor(r.crop_en, r.msp)
            const mp = mandiFor(r.crop_en)
            const above = mp != null && mp >= price
            return (
              <div key={r.crop_en} className="flex items-center gap-1.5 text-[10.5px]">
                <span className="w-12 shrink-0 text-stone-700">{t(r.hiKey)}</span>
                <span className="font-bold text-stone-900">{fmtRs(price)}</span>
                {mp != null && (
                  <span className={`rounded px-1 py-0.5 text-[8.5px] font-bold ${above ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {above ? '↑' : '↓'} {t(above ? 'msp_above_chip' : 'msp_below_chip')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {/* CRITICAL: caption BELOW the prices, small italic grey */}
        <div data-testid="msp-caption" className="mt-[5px] text-[8.5px] italic" style={{ color: '#aaa' }}>{t('msp_caption')}</div>
        <div className="mt-1 text-[9.5px] font-bold text-green-700">{t('msp_full_list')} →</div>
      </button>
    </div>
  )
}

// Kisan Sawaal featured Q&A strip (Phase 11).
function QAStrip({ sawaal, t, lang, navigate }) {
  const [open, setOpen] = useState(null)
  return (
    <section className="mx-auto max-w-5xl px-[14px] py-3 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-stone-800">❓ {t('qa_home_title')}</h2>
        <button type="button" onClick={() => navigate('/sawaal')} className="text-xs font-bold text-green-700">{t('qa_all_link')} →</button>
      </div>
      {sawaal.length === 0 ? (
        <p className="mb-2 rounded-xl border border-dashed border-green-300 bg-green-50 p-3 text-center text-sm font-semibold text-green-900">{t('qa_empty_msg')}</p>
      ) : (
        <div className="space-y-2">
          {sawaal.map((q) => {
            const isOpen = open === q.id
            const ans = sawaalAnswer(q, lang).replace(/\*\*/g, '')
            return (
              <div key={q.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} className="block w-full text-left">
                  <div className="text-[11.5px] font-bold leading-snug text-stone-900">{sawaalQuestion(q, lang)}</div>
                  <div className={`mt-1 text-[10.5px] leading-relaxed text-[#444] ${isOpen ? '' : 'line-clamp-2'}`}>{ans}</div>
                </button>
                <div className="mt-1 text-[8.5px] text-stone-500">{q.asked_by_village ? `📍 ${q.asked_by_village} · ` : ''}{q.answered_by || 'Team Kisan Sahyog'}</div>
              </div>
            )
          })}
        </div>
      )}
      <button type="button" onClick={() => navigate('/sawaal')} className="mt-2 block w-full rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-bold text-white active:bg-green-800">
        + {t('qa_ask_btn')}
      </button>
    </section>
  )
}

// Compact anonymised listing card (2-col) with a WhatsApp share button.
function PublicListingCard({ listing, lang, t, extras, navigate, isLoggedIn }) {
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 2)
  const place = [listing.village_town, listing.district].filter(Boolean).join(', ')
  const isOffer = listing.listing_type === 'offer'
  const isVendor = listing.listing_source === 'vendor'
  const shareUrl = `${window.location.origin}/listing/${listing.id}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(generateListingMessage(listing, shareUrl, lang))}`
  return (
    <div className="relative flex flex-col rounded-xl border border-stone-200 bg-white p-3">
      {/* WhatsApp share — small circular button, top-right */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        data-testid="card-whatsapp"
        aria-label="WhatsApp"
        className="absolute right-[7px] top-[7px] grid h-5 w-5 place-items-center rounded-full text-[10px] text-white"
        style={{ background: '#25D366' }}
      >
        <span aria-hidden="true">📲</span>
      </a>
      <div className="mb-1 flex flex-wrap items-center gap-1 pr-6">
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
