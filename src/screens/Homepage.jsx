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
import { whatsappPlatformUrl, whatsappListingUrl } from '../lib/share/shareMessages'
import { fetchWeather, weatherInfo, wdayKey } from '../lib/weather/weatherApi'
import { getRainAlert } from '../lib/weather/rainAlert'
import { fetchMsp, MANDI_TO_MSP } from '../lib/msp/mspApi'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { strings } from '../lib/i18n/strings'
import { ENABLED_CATEGORIES, getCategory } from '../lib/listings/registry'
import { fetchRecentListings, fetchCrops, fetchEquipmentTypes } from '../lib/listings/listingsApi'
import { fetchExperts } from '../lib/experts/expertsApi'
import { fetchPublishedArticles, articleTitle } from '../lib/articles/articlesApi'
import { fetchFeaturedSawaal, fetchFeaturedYojana, sawaalQuestion, sawaalAnswer, yojanaName, yojanaBenefit, yojanaEligibility } from '../lib/community/communityApi'
import { expertName, expertSpec } from './Experts'
import { timeAgo } from '../lib/timeAgo'

// Live-listings filter (strip): All + listing categories + Experts, Land last.
const FILTERS = ['all', ...ENABLED_CATEGORIES.filter((c) => c !== 'land'), 'experts', 'land']
// Full-bleed content padding: 14px mobile, 40px desktop.
const PX = 'px-[14px] md:px-10'
// Static MSP fallback (2026-27) keyed by CACP crop_en so it matches MANDI_TO_MSP.
const MSP_ROWS = [
  { crop_en: 'Wheat', hiKey: 'hl_crop_wheat', msp: 2585 },
  { crop_en: 'Soyabean', hiKey: 'hl_crop_soybean', msp: 5708 },
  { crop_en: 'Gram', hiKey: 'hl_crop_gram', msp: 5875 },
  { crop_en: 'Masur (Lentil)', hiKey: 'hl_crop_lentil', msp: 7000 },
]
const fmtRs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
const mspPrice = (msp, cropEn, fallback) => {
  const row = (msp || []).find((m) => m.crop_en === cropEn)
  return row ? Number(row.msp_per_quintal) : fallback
}
const mandiPrice = (mandi, cropEn) => {
  const row = (mandi?.rows || []).find((r) => MANDI_TO_MSP[r.commodity_en] === cropEn && r.modal_price != null)
  return row ? Number(row.modal_price) : null
}

// Inline WhatsApp glyph — native SVG, never an <img>/background-image.
function WaIcon({ size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={style}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.522 5.836L.057 23.854a.5.5 0 00.609.61l6.249-1.676A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 01-4.953-1.354l-.355-.211-3.679.988.938-3.58-.231-.368A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  )
}

// Homepage V3 — full-bleed layout, 2-column hero, desktop grids.
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
  const [weather, setWeather] = useState(undefined)
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
        setListings(rows); setExperts(exp); setArticles(arts.slice(0, 2))
        setSawaal(saw); setSchemes(sch); setExtras({ crops, equipmentTypes })
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
  const stripItems = FILTERS.map((f) => ({ key: f, label: f === 'all' ? t('filter_all') : homeCat(f), icon: f === 'all' ? '🔍' : <CatIcon category={f} /> }))
  const alert = getRainAlert(weather?.forecast)
  const locationLabel = user?.village_town || user?.pincode || t('weather_near_you')

  function selectFilter(key) {
    setFilter(key)
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }

  return (
    <div className="min-h-screen bg-[var(--ks-bg)]">
      <NavBar />

      {/* 2 — Live mandi ticker */}
      <MandiTicker />

      {/* 3 — Hero (2-col desktop, stacked mobile) */}
      <section className="w-full pt-6 md:pt-10" style={{ background: 'var(--ks-primary)' }}>
        <div className={`grid gap-8 md:grid-cols-2 md:items-center md:gap-12 ${PX}`}>
          {/* Left column */}
          <div className="pb-6 md:pb-10">
            <span className="mb-4 inline-block rounded-[20px] px-[14px] py-1 text-[12px] font-extrabold" style={{ background: 'var(--ks-accent)', color: 'var(--ks-accent-dark)' }}>
              🌾 {t('hero_eyebrow')}
            </span>
            <h1 className="mb-3 text-[28px] font-black leading-[1.15] text-white md:text-[40px]">
              {t('hero_h1_l1')}<br />{t('hero_h1_l2')}
            </h1>
            <p className="mb-7 text-[15px] leading-[1.65]" style={{ color: '#a8d4b8' }}>
              {t('hero_subline1')}<br />{t('hero_subline2')}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => selectFilter('all')} className="rounded-[24px] px-6 py-3 text-[15px] font-extrabold" style={{ background: 'var(--ks-accent)', color: 'var(--ks-accent-dark)' }}>
                {t('hero_btn_browse')} →
              </button>
              <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="rounded-[24px] px-[22px] py-3 text-[15px] font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                + {t('hero_btn_new')}
              </button>
              <a href={whatsappPlatformUrl()} target="_blank" rel="noopener noreferrer" data-testid="hero-whatsapp" className="inline-flex items-center rounded-[24px] px-5 py-3 text-[15px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)' }}>
                <WaIcon size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{t('hero_btn_whatsapp')}
              </a>
            </div>
          </div>

          {/* Right column — 2x2 live info cards (desktop only) */}
          <div className="hidden grid-cols-2 gap-3 pb-10 md:grid">
            <HeroCard label={`🌤️ ${t('weather_title')}`} value={weather?.current_temp != null ? `${Math.round(weather.current_temp)}°` : '—'} sub={weather ? `${t(weatherInfo(weather.current_weathercode).key)} · ${locationLabel}` : t('weather_unavailable')} />
            <HeroCard label={`📋 MSP ${t('hl_crop_wheat')} 2026-27`} value={fmtRs(mspPrice(msp, 'Wheat', 2585))} sub={(() => { const mp = mandiPrice(mandi, 'Wheat'); if (mp == null) return '2026-27'; const above = mp >= mspPrice(msp, 'Wheat', 2585); return `${t('mandi_short')} ${fmtRs(mp)} · ${t(above ? 'msp_above_chip' : 'msp_below_chip')}` })()} />
            <HeroCard label={`🌧️ ${t('rain_label')}`} value={alert ? `${alert.days} ${t('rl_days')}` : t('weather_clear')} sub={alert ? `${t('rl_tomorrow')} ~${alert.perDay?.[0] ?? 0}${t('mm_unit')} · ${t('rl_dayafter')} ~${alert.perDay?.[1] ?? 0}${t('mm_unit')}` : t('rain_none_5day')} />
            <HeroCard label={`📊 ${t('stat_listings_label')}`} value="50+" sub={t('hero_listings_sub')} />
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex px-0 md:px-10" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { v: '50+', k: 'stat_listings_label' },
            { v: '9', k: 'stat_categories_label' },
            { v: t('stat_radius_value'), k: 'stat_radius_label' },
            { v: t('stat_free_value'), k: 'stat_free_label' },
            { v: t('stat_pilot_value'), k: 'stat_pilot_label' },
          ].map((s, idx) => (
            <div key={s.k} className="flex-1 py-3 text-center" style={{ borderRight: idx < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div className="text-[18px] font-extrabold" style={{ color: 'var(--ks-accent)' }}>{s.v}</div>
              <div className="text-[11px]" style={{ color: '#90c8a0' }}>{t(s.k)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Rain alert */}
      <RainAlert alert={alert} />

      {/* 5 — Category strip */}
      <div className={`w-full border-b border-[var(--ks-border)] bg-[var(--ks-bg-card)] py-1.5 ${PX}`}>
        <CategoryStrip items={stripItems} active={filter} onSelect={selectFilter} />
      </div>

      {/* 6 — Listings (3-col desktop, 2-col mobile) */}
      <section ref={listingsRef} className={`w-full scroll-mt-16 bg-[var(--ks-bg)] py-4 md:py-6 ${PX}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[20px] font-extrabold text-[var(--ks-text)]">{t('recent_listings_title')}</h2>
          <button type="button" onClick={() => navigate(isLoggedIn ? '/browse' : '/signup')} className="text-[13px] font-semibold text-[var(--ks-primary)]">{t('view_all')} →</button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-stone-500">{t('loading')}</p>
        ) : filter === 'experts' ? (
          <ExpertGrid experts={experts} lang={lang} navigate={navigate} t={t} isLoggedIn={isLoggedIn} />
        ) : (
          <>
            {shownListings.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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

      {/* 7 — Weather + MSP (2-col cards) */}
      <section className={`w-full border-y border-[var(--ks-border)] bg-[var(--ks-bg-card)] py-4 md:py-6 ${PX}`}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Weather */}
          <button type="button" onClick={() => navigate('/info#weather')} className="rounded-xl border p-[18px] text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ks-text-muted)' }}>🌤️ {t('weather_title')}</div>
            {weather === undefined ? (
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-stone-100" />
            ) : !weather ? (
              <div className="mt-1 text-[13px]" style={{ color: 'var(--ks-text-secondary)' }}>{t('weather_unavailable')}</div>
            ) : (
              <>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[32px] font-extrabold" style={{ color: 'var(--ks-primary)' }}>{weather.current_temp != null ? `${Math.round(weather.current_temp)}°` : '—'}</span>
                  <span className="text-[13px]" style={{ color: 'var(--ks-text-secondary)' }}>{weatherInfo(weather.current_weathercode).icon} {t(weatherInfo(weather.current_weathercode).key)}</span>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--ks-text-muted)' }}>📍 {locationLabel}</div>
                <div className="mt-3 flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(Array.isArray(weather.forecast) ? weather.forecast.slice(0, 5) : []).map((d, i) => {
                    const mm = Math.round(Number(d.precipitation_sum) || 0)
                    return (
                      <div key={i} className="shrink-0 text-center">
                        <div className="text-[10px] font-bold" style={{ color: 'var(--ks-text-muted)' }}>{t(wdayKey(d.date))}</div>
                        <div className="text-base" aria-hidden="true">{weatherInfo(d.weathercode).icon}</div>
                        <div className="text-[10px] font-semibold" style={{ color: mm > 0 ? '#3b82f6' : 'var(--ks-text-muted)' }}>{mm > 0 ? `${mm}${t('mm_unit')}` : '—'}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <div className="mt-2 text-[11px] font-bold" style={{ color: 'var(--ks-primary)' }}>{t('weather_5day')} →</div>
          </button>

          {/* MSP */}
          <button type="button" onClick={() => navigate('/info#msp')} className="rounded-xl border p-[18px] text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ks-text-muted)' }}>📋 MSP 2026-27</div>
            <div className="mt-1">
              {MSP_ROWS.map((r) => {
                const price = mspPrice(msp, r.crop_en, r.msp)
                const mp = mandiPrice(mandi, r.crop_en)
                const above = mp != null && mp >= price
                return (
                  <div key={r.crop_en} className="flex items-center gap-2 border-b py-1.5 last:border-b-0" style={{ borderColor: 'var(--ks-border-light)' }}>
                    <span className="flex-1 text-[13px]" style={{ color: 'var(--ks-text)' }}>{t(r.hiKey)}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--ks-primary)' }}>{fmtRs(price)}</span>
                    {mp != null && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={above ? { background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' } : { background: 'var(--ks-accent-muted)', color: 'var(--ks-accent-dark)' }}>
                        {above ? '↑' : '↓'} {t(above ? 'msp_above_chip' : 'msp_below_chip')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div data-testid="msp-caption" className="mt-1.5 text-[10px] italic" style={{ color: 'var(--ks-text-muted)' }}>{t('msp_caption')}</div>
            <div className="mt-1 text-[11px] font-bold" style={{ color: 'var(--ks-primary)' }}>{t('msp_full_list')} →</div>
          </button>
        </div>
      </section>

      {/* 8 — Government contacts (amber strip, 3-col desktop) */}
      <section className={`w-full py-5 ${PX}`} style={{ background: '#fffbf0', borderTop: '3px solid var(--ks-accent)', borderBottom: '3px solid var(--ks-accent)' }}>
        <h2 className="mb-3.5 text-[14px] font-extrabold" style={{ color: '#7c3800' }}>🏛️ {t('res_home_heading')}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: '🧪', titleKey: 'res_card_soil_title', phone: '1800-180-1551', hash: 'soil' },
            { icon: '🐄', titleKey: 'res_card_vet_title', phone: '1962', hash: 'veterinary' },
            { icon: '🏛️', titleKey: 'res_card_offices_title', phone: '07582-288228', hash: 'offices' },
          ].map((c) => (
            <button key={c.hash} type="button" onClick={() => navigate(`/resources#${c.hash}`)} className="rounded-[10px] border p-3.5 text-left" style={{ background: '#fff', borderColor: '#fde68a' }}>
              <div className="text-[22px]" aria-hidden="true">{c.icon}</div>
              <div className="mt-1.5 text-[13px] font-bold" style={{ color: 'var(--ks-text)' }}>{t(c.titleKey)}</div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--ks-primary)' }}>☎ {c.phone}</div>
              <div className="mt-1.5 text-[11px]" style={{ color: 'var(--ks-accent-dark)' }}>{t('res_full_details')} →</div>
            </button>
          ))}
        </div>
      </section>

      {/* 9 — Schemes (4-col desktop, 2-col mobile) */}
      <section className={`w-full bg-[var(--ks-bg)] py-4 md:py-6 ${PX}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[20px] font-extrabold text-[var(--ks-text)]">{t('info_yojana_heading')}</h2>
          <button type="button" onClick={() => navigate('/yojana')} className="text-[13px] font-semibold text-[var(--ks-primary)]">{t('schemes_all_link')} →</button>
        </div>
        {schemes.length === 0 ? (
          <button type="button" onClick={() => navigate('/yojana')} className="block w-full rounded-[12px] border border-dashed p-3 text-left text-[12px] font-semibold text-[var(--ks-primary)]" style={{ borderColor: 'var(--ks-primary-light)', background: 'var(--ks-primary-muted)' }}>
            {t('info_yojana_heading')} → {t('schemes_all_link')}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {schemes.map((s) => (
              <button key={s.id} type="button" onClick={() => navigate('/yojana')} className="flex flex-col rounded-[12px] border p-3.5 text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
                <span className="w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>{t(`ycat_${s.category}`)}</span>
                <span className="mt-1 text-[14px] font-bold leading-snug text-[var(--ks-text)]">{yojanaName(s, lang)}</span>
                <span className="mt-0.5 text-[12px] font-semibold text-[var(--ks-primary)]">{yojanaBenefit(s, lang)}</span>
                <span className="mt-0.5 line-clamp-2 text-[11px] leading-[1.4] text-[var(--ks-text-secondary)]">{yojanaEligibility(s, lang)}</span>
                <span className="mt-2 text-[11px] font-bold text-[var(--ks-primary)]">{t('yojana_howto_label')} →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 10 — Kisan Sawaal Q&A (green tint, 2-col desktop) */}
      <section className={`w-full py-4 md:py-6 ${PX}`} style={{ background: 'var(--ks-primary-muted)', borderTop: '1px solid #c8e6b0' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[20px] font-extrabold text-[var(--ks-text)]">❓ {t('qa_home_title')}</h2>
          <button type="button" onClick={() => navigate('/sawaal')} className="text-[13px] font-semibold text-[var(--ks-primary)]">{t('qa_all_link')} →</button>
        </div>
        {sawaal.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {sawaal.map((q) => <QACard key={q.id} q={q} t={t} lang={lang} />)}
          </div>
        )}
        {sawaal.length === 0 && (
          <p className="rounded-[12px] border border-dashed p-3 text-center text-[13px] font-semibold text-[var(--ks-primary)]" style={{ borderColor: 'var(--ks-primary-light)', background: 'var(--ks-bg-card)' }}>{t('qa_empty_msg')}</p>
        )}
        <button type="button" onClick={() => navigate('/sawaal')} className="mt-3.5 block w-full rounded-[24px] px-4 py-3 text-center text-[14px] font-bold text-white" style={{ background: 'var(--ks-primary)' }}>
          + {t('qa_ask_btn')}
        </button>
      </section>

      {/* 11 — Articles (2-col) */}
      {articles.length > 0 && (
        <section className={`w-full border-t border-[var(--ks-border)] bg-[var(--ks-bg-card)] py-4 md:py-6 ${PX}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="border-l-[3px] border-[var(--ks-accent)] pl-2.5 text-[20px] font-extrabold text-[var(--ks-text)]">{t('articles_home_title')}</h2>
            <button type="button" onClick={() => navigate('/articles')} className="text-[13px] font-semibold text-[var(--ks-primary)]">{t('articles_all_link')} →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="overflow-hidden rounded-[12px] border text-left" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" crossOrigin="anonymous" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-[90px] w-full object-cover" style={{ background: 'var(--ks-primary)' }} />
                ) : (
                  <div className="flex h-[90px] w-full items-center justify-center text-2xl" style={{ background: 'var(--ks-primary)' }}>{a.slug?.includes('carbon') ? '🌿' : '🌾'}</div>
                )}
                <div className="p-3">
                  <div className="text-[9px] font-bold uppercase tracking-[0.5px] text-[var(--ks-primary)]">{t('articles_nav')}</div>
                  <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[1.35] text-[var(--ks-text)]">{articleTitle(a, lang)}</div>
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

      {/* 13 — Footer (full bleed) */}
      <footer className={`flex w-full flex-wrap items-center justify-between gap-4 py-6 ${PX}`} style={{ background: '#111111' }}>
        <div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--ks-accent)' }}>🌾 {strings.app_name.hi}</div>
          <div className="text-[11px]" style={{ color: '#555' }}>{t('footer_company')}</div>
          <div className="mt-1 text-[10px]" style={{ color: '#444' }}>{t('footer_copyright')}</div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: '#666' }}>
            <button type="button" onClick={() => navigate('/privacy')}>{t('footer_privacy')}</button>
            <button type="button" onClick={() => navigate('/terms')}>{t('footer_terms')}</button>
            <button type="button" onClick={() => navigate('/resources')}>{t('resources_nav')}</button>
            <button type="button" onClick={() => navigate('/articles')}>{t('articles_nav')}</button>
            <a href="mailto:admin@kissansahyog.com">{t('footer_contact')}</a>
          </nav>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  )
}

// Hero right-column live info card.
function HeroCard({ label, value, sub }) {
  return (
    <div className="rounded-[12px] p-4" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.4px]" style={{ color: '#90c8a0' }}>{label}</div>
      <div className="mb-[3px] text-[24px] font-extrabold text-white">{value}</div>
      <div className="text-[12px]" style={{ color: '#a8d4b8' }}>{sub}</div>
    </div>
  )
}

// Featured Q&A card (Section 10).
function QACard({ q, t, lang }) {
  const [open, setOpen] = useState(false)
  const ans = sawaalAnswer(q, lang).replace(/\*\*/g, '')
  return (
    <div className="rounded-[12px] border p-3.5" style={{ background: 'var(--ks-bg-card)', borderColor: '#c8e6b0' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full text-left">
        <div className="mb-2 text-[14px] font-bold leading-[1.35]" style={{ color: 'var(--ks-text)' }}>{sawaalQuestion(q, lang)}</div>
        <div className={`text-[12px] leading-[1.6] ${open ? '' : 'line-clamp-3'}`} style={{ color: 'var(--ks-text-secondary)' }}>{ans}</div>
      </button>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--ks-text-muted)' }}>{q.asked_by_village ? `📍 ${q.asked_by_village}` : ''}</span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--ks-primary)' }}>{q.answered_by || 'Team Kisan Sahyog'}</span>
      </div>
    </div>
  )
}

// Listing card (Section 6) — body + footer with a view button and an inline-SVG WA button.
function PublicListingCard({ listing, lang, t, extras, navigate, isLoggedIn }) {
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 2)
  const place = [listing.village_town, listing.district].filter(Boolean).join(', ')
  const isOffer = listing.listing_type === 'offer'
  const isVendor = listing.listing_source === 'vendor'
  const badge = isOffer
    ? { background: 'var(--ks-primary-muted)', color: 'var(--ks-primary-dark)' }
    : { background: 'var(--ks-accent-muted)', color: 'var(--ks-accent-dark)' }
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
      <div className="flex-1 p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <CatIcon category={listing.category} className="text-base leading-none" />
          <span className="rounded-md px-[7px] py-0.5 text-[10px] font-bold" style={badge}>{isOffer ? t('home_offer') : t('home_requirement')}</span>
          {isVendor && <span className="rounded-md px-[7px] py-0.5 text-[10px] font-bold" style={{ background: '#fff7ed', color: '#7c2d12' }}>🏪 {t('vendor_badge')}</span>}
        </div>
        <div className="mb-1 text-[14px] font-bold leading-[1.3]" style={{ color: 'var(--ks-text)' }}>{rows[0]?.value}</div>
        {rows[1]?.value && <div className="mb-1 text-[13px] font-bold" style={{ color: 'var(--ks-primary)' }}>{rows[1].value}</div>}
        {place && <div className="flex items-center gap-[3px] text-[11px]" style={{ color: 'var(--ks-text-muted)' }}>📍 {place}</div>}
        <div className="mt-[3px] text-[10px]" style={{ color: '#bbb' }}>{timeAgo(listing.created_at, t)}</div>
      </div>
      <div className="flex items-center gap-1.5 border-t p-2" style={{ borderColor: 'var(--ks-border-light)' }}>
        {isLoggedIn ? (
          <button type="button" onClick={() => navigate(`/listing/${listing.id}`)} className="flex-1 rounded-lg px-2 py-2 text-[12px] font-semibold text-white" style={{ background: 'var(--ks-primary)' }}>{t('view_listing')} →</button>
        ) : (
          <button type="button" onClick={() => navigate('/signup')} className="flex-1 rounded-lg px-2 py-2 text-[12px] font-semibold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>🔒 {t('signup_to_contact')}</button>
        )}
        <a
          href={whatsappListingUrl(listing)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          data-testid="card-whatsapp"
          aria-label="Share on WhatsApp"
          className="flex shrink-0 items-center justify-center rounded-lg text-white"
          style={{ width: '34px', height: '34px', minHeight: '34px', background: 'var(--ks-whatsapp)' }}
        >
          <WaIcon size={16} />
        </a>
      </div>
    </div>
  )
}

function ExpertGrid({ experts, lang, navigate, t, isLoggedIn }) {
  if (!experts.length) return <p className="py-8 text-center text-stone-500">{t('experts_none')}</p>
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {experts.map((e) => (
        <div key={e.id} className="flex flex-col rounded-[12px] border p-3" style={{ background: 'var(--ks-bg-card)', borderColor: 'var(--ks-border)' }}>
          <div className="flex items-center gap-1"><span className="text-lg" aria-hidden="true">👨‍🌾</span><span className="text-[14px] font-bold" style={{ color: 'var(--ks-text)' }}>{expertName(e, lang)}</span></div>
          {expertSpec(e, lang) && <div className="mt-0.5 text-[12px] font-semibold" style={{ color: 'var(--ks-primary)' }}>{expertSpec(e, lang)}</div>}
          {e.organisation && <div className="text-[11px]" style={{ color: 'var(--ks-text-muted)' }}>{e.organisation}</div>}
          {isLoggedIn ? (
            <button type="button" onClick={() => navigate(`/experts/${e.id}`)} className="mt-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--ks-primary)' }}>{t('view_listing')} →</button>
          ) : (
            <button type="button" onClick={() => navigate('/signup')} className="mt-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>🔒 {t('signup_to_contact')}</button>
          )}
        </div>
      ))}
    </div>
  )
}
