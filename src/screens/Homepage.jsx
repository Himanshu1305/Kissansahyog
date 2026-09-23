import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import CategoryStrip from '../components/CategoryStrip'
import MandiTicker from '../components/MandiTicker'
import RainAlert from '../components/RainAlert'
import { CatIcon } from '../components/CatIcon'
import { generatePlatformMessage, whatsappListingUrl } from '../lib/share/shareMessages'
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
    <div className="min-h-screen bg-[var(--ks-bg)]">
      <NavBar />

      {/* 1 — Live mandi ticker: the very first thing below the nav */}
      <MandiTicker />

      {/* 2 — Hero (solid forest green, no image) */}
      <section className="relative h-[260px] w-full overflow-hidden sm:h-[320px]" style={{ background: '#2d5a1b' }}>
        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col justify-center px-[14px] pb-14 sm:px-6">
          <div className="inline-flex w-fit items-center gap-1 rounded-[20px] px-3 py-1 text-[12px] font-extrabold" style={{ background: 'var(--ks-accent)', color: 'var(--ks-accent-dark)' }}>
            🌾 {t('hero_eyebrow')}
          </div>
          <h1 className="mt-2 mb-2 text-[28px] font-black leading-[1.2] text-white sm:text-[36px]">
            {t('hero_h1_l1')}<br />{t('hero_h1_l2')}
          </h1>
          <p className="text-[14px] leading-[1.6] text-[#c8e6b0]">
            {t('hero_subline1')}<br /><span className="font-semibold">{t('hero_subline2')}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => selectFilter('all')} className="rounded-[24px] px-5 py-2.5 text-[14px] font-extrabold" style={{ background: 'var(--ks-accent)', color: 'var(--ks-accent-dark)' }}>
              {t('hero_btn_browse')} →
            </button>
            <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="rounded-[24px] px-[18px] py-2.5 text-[14px] font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
              + {t('hero_btn_new')}
            </button>
            <a href={waHero} target="_blank" rel="noopener noreferrer" data-testid="hero-whatsapp" className="rounded-[24px] px-4 py-2.5 text-[14px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)' }}>
              📲 {t('hero_btn_whatsapp')}
            </a>
          </div>
        </div>
        {/* Stats bar pinned to the bottom of the hero */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex" style={{ background: 'rgba(20,40,12,0.80)' }}>
          {[
            { v: '50+', k: 'stat_listings_label' },
            { v: '9', k: 'stat_categories_label' },
            { v: t('stat_radius_value'), k: 'stat_radius_label' },
            { v: t('stat_free_value'), k: 'stat_free_label' },
          ].map((s, idx) => (
            <div key={s.k} className="flex-1 p-2 text-center" style={{ borderRight: idx < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
              <div className="text-[18px] font-extrabold" style={{ color: 'var(--ks-accent)' }}>{s.v}</div>
              <div className="text-[11px] font-semibold" style={{ color: '#a0c890' }}>{t(s.k)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Rich rain alert (blue; only when rain forecast in next 48h) */}
      <RainAlert alert={getRainAlert(weather?.forecast)} />

      {/* 5 — Weather + MSP info strip */}
      <WeatherMspStrip weather={weather} msp={msp} mandi={mandi} t={t} lang={lang} navigate={navigate} locationLabel={locationLabel} />

      {/* 6 — Category strip */}
      <div className="w-full border-b border-[var(--ks-border)] bg-[var(--ks-bg-card)] px-[14px] py-1.5 sm:px-6">
        <CategoryStrip items={stripItems} active={filter} onSelect={selectFilter} />
      </div>

      {/* 7 — Live listings (cards truly edge-to-edge; heading padded) */}
      <section ref={listingsRef} className="w-full scroll-mt-16 py-3">
        <div className="mb-2 flex items-center justify-between px-[14px] sm:px-6">
          <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[16px] font-extrabold text-[var(--ks-text)]">{t('recent_listings_title')}</h2>
          <button type="button" onClick={() => navigate(isLoggedIn ? '/browse' : '/signup')} className="text-[11px] font-bold text-[var(--ks-primary)]">{t('view_all')} →</button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-stone-500">{t('loading')}</p>
        ) : filter === 'experts' ? (
          <div className="px-[14px] sm:px-6">
            <ExpertGrid experts={experts} lang={lang} navigate={navigate} t={t} isLoggedIn={isLoggedIn} />
          </div>
        ) : (
          <>
            {shownListings.length > 0 && (
              <div className="m-0 grid w-full grid-cols-2 gap-1.5 p-0">
                {shownListings.map((l) => (
                  <PublicListingCard key={l.id} listing={l} lang={lang} t={t} extras={extras} navigate={navigate} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
            {listings.length < 3 && (
              <div className="mx-[14px] mt-3 rounded-xl border border-dashed border-green-300 bg-green-50 p-4 text-center sm:mx-6">
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

      {/* 8 — Government contacts (saffron-bordered horizontal scroll strip) */}
      <section className="w-full px-[14px] py-3 sm:px-6" style={{ background: '#fffbf0', borderTop: '3px solid var(--ks-accent)', borderBottom: '3px solid var(--ks-accent)' }}>
        <h2 className="mb-2 text-[13px] font-extrabold text-[var(--ks-accent-dark)]">{t('res_home_heading')}</h2>
        <div className="-mx-[14px] flex gap-2 overflow-x-auto px-[14px] sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { icon: '🧪', titleKey: 'res_card_soil_title', info: 'res_card_soil_1', hash: 'soil' },
            { icon: '🐄', titleKey: 'res_card_vet_title', info: 'res_card_vet_1', hash: 'veterinary' },
            { icon: '🏛️', titleKey: 'res_card_offices_title', info: 'res_card_offices_1', hash: 'offices' },
          ].map((c) => (
            <button key={c.hash} type="button" onClick={() => navigate(`/resources#${c.hash}`)} className="w-52 shrink-0 rounded-[10px] border p-3 text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-accent-muted)' }}>
              <div className="flex items-center gap-2"><span className="text-xl" aria-hidden="true">{c.icon}</span><span className="text-[13px] font-bold text-[var(--ks-text)]">{t(c.titleKey)}</span></div>
              <div className="mt-1 text-[11px] text-[var(--ks-text-secondary)]">{t(c.info)}</div>
              <div className="mt-1 text-[11px] font-bold text-[var(--ks-accent-dark)]">{t('res_full_details')} →</div>
            </button>
          ))}
        </div>
      </section>

      {/* 9 — Government schemes (Sarkari Yojana) */}
      <section className="w-full bg-[var(--ks-bg-card)] px-[14px] py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[16px] font-extrabold text-[var(--ks-text)]">{t('info_yojana_heading')}</h2>
          <button type="button" onClick={() => navigate('/yojana')} className="text-[11px] font-bold text-[var(--ks-primary)]">{t('schemes_all_link')} →</button>
        </div>
        {schemes.length === 0 ? (
          <button type="button" onClick={() => navigate('/yojana')} className="block w-full rounded-[10px] border border-dashed p-3 text-left text-[12px] font-semibold text-[var(--ks-primary)]" style={{ borderColor: 'var(--ks-primary-light)', background: 'var(--ks-primary-muted)' }}>
            {t('info_yojana_heading')} → {t('schemes_all_link')}
          </button>
        ) : (
          <div className="-mx-[14px] flex gap-2 overflow-x-auto px-[14px] sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {schemes.map((s) => (
              <button key={s.id} type="button" onClick={() => navigate('/yojana')} className="flex w-[148px] shrink-0 flex-col rounded-[10px] border p-2.5 text-left" style={{ background: 'var(--ks-bg-section)', borderColor: 'var(--ks-border)' }}>
                <span className="w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>{t(`ycat_${s.category}`)}</span>
                <span className="mt-1 text-[13px] font-bold leading-snug text-[var(--ks-text)]">{yojanaName(s, lang)}</span>
                <span className="mt-0.5 text-[12px] font-semibold text-[var(--ks-primary)]">{yojanaBenefit(s, lang)}</span>
                <span className="mt-0.5 line-clamp-2 text-[11px] text-[var(--ks-text-secondary)]">{yojanaEligibility(s, lang)}</span>
                <span className="mt-1 text-[11px] font-bold text-[var(--ks-primary)]">{t('yojana_howto_label')} →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 10 — Kisan Sawaal featured Q&A */}
      <QAStrip sawaal={sawaal} t={t} lang={lang} navigate={navigate} />

      {/* 11 — Articles (2-card row) */}
      {articles.length > 0 && (
        <section className="w-full bg-[var(--ks-bg-card)] px-[14px] py-3 sm:px-6">
          <h2 className="mb-2 border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[16px] font-extrabold text-[var(--ks-text)]">{t('articles_title')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="overflow-hidden rounded-xl border text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" crossOrigin="anonymous" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.background = 'var(--ks-primary)' }} className="h-[72px] w-full object-cover" style={{ background: 'var(--ks-primary)' }} />
                ) : (
                  <div className="flex h-[72px] w-full items-center justify-center text-2xl" style={{ background: 'var(--ks-primary)' }}>📰</div>
                )}
                <div className="p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ks-primary)]">{t('articles_nav')}</div>
                  <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-[1.35] text-[var(--ks-text)]">{articleTitle(a, lang)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 12 — Mission bar */}
      <div className="flex w-full items-center justify-center gap-6 px-4 py-3.5" style={{ background: 'var(--ks-primary-dark)' }}>
        {[t('mission_income'), t('mission_rojgar')].map((m, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#90c8a0' }}>
            <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: 'var(--ks-accent)' }} aria-hidden="true" />
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
      <footer className="py-5" style={{ background: '#111111' }}>
        <div className="mx-auto max-w-5xl px-[14px] sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🌾</span>
              <div>
                <div className="font-extrabold" style={{ color: 'var(--ks-accent)' }}>{strings.app_name.hi}</div>
                <div className="text-xs" style={{ color: '#666' }}>{t('footer_company')}</div>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold" style={{ color: '#888' }}>
              <button type="button" onClick={() => navigate('/privacy')} className="underline">{t('footer_privacy')}</button>
              <button type="button" onClick={() => navigate('/terms')} className="underline">{t('footer_terms')}</button>
              <button type="button" onClick={() => navigate('/resources')} className="underline">{t('resources_nav')}</button>
              <button type="button" onClick={() => navigate('/articles')} className="underline">{t('articles_nav')}</button>
              <a href="mailto:admin@kissansahyog.com" className="underline">{t('footer_contact')}</a>
            </nav>
            <LanguageToggle />
          </div>
          <p className="mt-3 text-center text-xs" style={{ color: '#444' }}>{t('footer_copyright')}</p>
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
    <div className="flex w-full border-b" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
      {/* Left — Weather */}
      <button type="button" onClick={() => navigate('/info#weather')} className="flex-1 border-r px-[14px] py-2 text-left" style={{ borderColor: 'var(--ks-border)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ks-text-muted)' }}>🌤️ {t('weather_title')}</div>
        {weather === undefined ? (
          <div className="mt-1 h-4 w-20 animate-pulse rounded bg-stone-100" />
        ) : !weather ? (
          <div className="mt-1 text-[12px]" style={{ color: 'var(--ks-text-secondary)' }}>{t('weather_unavailable')}</div>
        ) : (
          <>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-extrabold" style={{ color: 'var(--ks-primary)' }}>{weather.current_temp != null ? `${Math.round(weather.current_temp)}°` : '—'}</span>
              <span className="text-[12px]" style={{ color: 'var(--ks-text-secondary)' }}>{cur.icon} {t(cur.key)}</span>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--ks-text-muted)' }}>📍 {locationLabel}</div>
            <div className="mt-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {forecast.map((d, i) => {
                const info = weatherInfo(d.weathercode)
                const mm = Math.round(Number(d.precipitation_sum) || 0)
                return (
                  <div key={i} className="shrink-0 text-center">
                    <div className="text-[10px] font-bold" style={{ color: 'var(--ks-text-muted)' }}>{t(wdayKey(d.date))}</div>
                    <div className="text-sm" aria-hidden="true">{info.icon}</div>
                    <div className="text-[10px] font-semibold" style={{ color: mm > 0 ? '#3b82f6' : 'var(--ks-text-muted)' }}>{mm > 0 ? `${mm}${t('mm_unit')}` : '—'}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div className="mt-1 text-[10px] font-bold" style={{ color: 'var(--ks-primary)' }}>{t('weather_5day')} →</div>
      </button>

      {/* Right — MSP */}
      <button type="button" onClick={() => navigate('/info#msp')} className="flex-1 px-[14px] py-2 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ks-text-muted)' }}>📋 MSP 2026-27</div>
        <div className="mt-0.5">
          {MSP_ROWS.map((r) => {
            const price = mspFor(r.crop_en, r.msp)
            const mp = mandiFor(r.crop_en)
            const above = mp != null && mp >= price
            return (
              <div key={r.crop_en} className="flex items-center gap-1.5">
                <span className="w-12 shrink-0 text-[12px]" style={{ color: 'var(--ks-text)' }}>{t(r.hiKey)}</span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--ks-primary)' }}>{fmtRs(price)}</span>
                {mp != null && (
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold"
                    style={above ? { background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' } : { background: 'var(--ks-accent-muted)', color: 'var(--ks-accent-dark)' }}
                  >
                    {above ? '↑' : '↓'} {t(above ? 'msp_above_chip' : 'msp_below_chip')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {/* CRITICAL: caption BELOW the prices, italic grey, margin-top 6px */}
        <div data-testid="msp-caption" className="text-[10px] italic" style={{ color: 'var(--ks-text-muted)', marginTop: '6px' }}>{t('msp_caption')}</div>
        <div className="mt-1 text-[10px] font-bold" style={{ color: 'var(--ks-primary)' }}>{t('msp_full_list')} →</div>
      </button>
    </div>
  )
}

// Kisan Sawaal featured Q&A strip (Phase 11).
function QAStrip({ sawaal, t, lang, navigate }) {
  const [open, setOpen] = useState(null)
  return (
    <section className="w-full px-[14px] py-3 sm:px-6" style={{ background: 'var(--ks-primary-muted)', borderTop: '1px solid #c8e6b0' }}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[16px] font-extrabold text-[var(--ks-text)]">❓ {t('qa_home_title')}</h2>
        <button type="button" onClick={() => navigate('/sawaal')} className="text-[11px] font-bold text-[var(--ks-primary)]">{t('qa_all_link')} →</button>
      </div>
      {sawaal.length === 0 ? (
        <p className="mb-2 rounded-[10px] border border-dashed p-3 text-center text-[13px] font-semibold text-[var(--ks-primary)]" style={{ borderColor: 'var(--ks-primary-light)', background: 'var(--ks-bg-card)' }}>{t('qa_empty_msg')}</p>
      ) : (
        <div className="space-y-2">
          {sawaal.map((q) => {
            const isOpen = open === q.id
            const ans = sawaalAnswer(q, lang).replace(/\*\*/g, '')
            return (
              <div key={q.id} className="rounded-[10px] border p-3" style={{ background: 'var(--ks-bg-card)', borderColor: '#c8e6b0' }}>
                <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} className="block w-full text-left">
                  <div className="text-[14px] font-bold leading-snug" style={{ color: 'var(--ks-text)' }}>{sawaalQuestion(q, lang)}</div>
                  <div className={`mt-1 text-[12px] leading-[1.55] ${isOpen ? '' : 'line-clamp-2'}`} style={{ color: 'var(--ks-text-secondary)' }}>{ans}</div>
                </button>
                <div className="mt-1 text-[10px]" style={{ color: 'var(--ks-text-muted)' }}>{q.asked_by_village ? `📍 ${q.asked_by_village} · ` : ''}<span className="font-bold" style={{ color: 'var(--ks-primary)' }}>{q.answered_by || 'Team Kisan Sahyog'}</span></div>
              </div>
            )
          })}
        </div>
      )}
      <button type="button" onClick={() => navigate('/sawaal')} className="mt-2 block w-full rounded-[24px] px-4 py-2.5 text-center text-[13px] font-bold text-white" style={{ background: 'var(--ks-primary)' }}>
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
  const badge = isOffer
    ? { background: 'var(--ks-offer)', color: 'var(--ks-offer-text)' }
    : { background: 'var(--ks-requirement)', color: 'var(--ks-requirement-text)' }
  return (
    <div className="relative flex flex-col rounded-xl border p-2.5" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
      {/* WhatsApp share — circular button, top-right */}
      <a
        href={whatsappListingUrl(listing)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        data-testid="card-whatsapp"
        aria-label="Share on WhatsApp"
        style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', minHeight: '28px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', textDecoration: 'none', zIndex: 10 }}
      >
        📲
      </a>
      <div className="mb-1 flex flex-wrap items-center gap-1 pr-8">
        <CatIcon category={listing.category} className="text-lg leading-none" />
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={badge}>{isOffer ? t('home_offer') : t('home_requirement')}</span>
        {isVendor && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--ks-vendor)', color: 'var(--ks-vendor-text)' }}>🏪 {t('vendor_badge')}</span>}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--ks-text-muted)' }}>{timeAgo(listing.created_at, t)}</span>
      </div>
      <div className="text-[13px] font-bold leading-snug" style={{ color: 'var(--ks-text)' }}>
        {rows.map((r, i) => (<span key={i}>{i > 0 && <span style={{ color: 'var(--ks-border)' }}> · </span>}{r.value}</span>))}
      </div>
      {place && <div className="mt-1 truncate text-[11px]" style={{ color: 'var(--ks-text-muted)' }}>📍 {place}</div>}
      {isLoggedIn ? (
        <button type="button" onClick={() => navigate(`/listing/${listing.id}`)} className="mt-2 w-full rounded-lg px-2 py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--ks-primary)' }}>{t('view_listing')} →</button>
      ) : (
        <button type="button" onClick={() => navigate('/signup')} className="mt-2 w-full rounded-lg border border-dashed px-2 py-1.5 text-[12px] font-semibold" style={{ borderColor: 'var(--ks-primary-light)', background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>🔒 {t('signup_to_contact')}</button>
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
