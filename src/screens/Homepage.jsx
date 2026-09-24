// Homepage v4 (Direction B · Balanced) — photograph-first, edge-to-edge, built
// entirely from the shared kit (src/components/home/kit.jsx) on the tokens in
// src/styles/tokens.css. Section order follows HOMEPAGE_V4_BUILD_PROMPT Phase 4.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import MandiTicker from '../components/MandiTicker'
import { Section, SectionHeader, Button, PhotoTile, InfoTile, CountChip, HomeListingCard } from '../components/home/kit'
import { fetchWeather } from '../lib/weather/weatherApi'
import { getRainAlert } from '../lib/weather/rainAlert'
import { fetchMsp } from '../lib/msp/mspApi'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { getTodayForFarmer } from '../lib/today/forFarmer'
import { strings } from '../lib/i18n/strings'
import { getCategory } from '../lib/listings/registry'
import { fetchHomeFeed, fetchCrops, fetchEquipmentTypes, fetchPincode } from '../lib/listings/listingsApi'
import { fetchNearbyCounts, resolvePincode, savePincode, NEARBY_CATEGORIES } from '../lib/listings/nearbyCounts'
import { fetchPublishedArticles, articleTitle } from '../lib/articles/articlesApi'
import { fetchFeaturedSawaal, sawaalQuestion, sawaalAnswer } from '../lib/community/communityApi'
import { whatsappListingUrl } from '../lib/share/shareMessages'
import { VIDEOS, videoTitle, videoWatchUrl } from '../content/videos'

const IMG = (f) => `/images/home/${f}`

// Category tiles (Phase 4 §5) — image + label/sublabel + browse target.
const CATEGORY_TILES = [
  { img: 'cat-machines.jpg', labelKey: 'cat_machines_label', subKey: 'cat_machines_sub', to: 'equipment' },
  { img: 'cat-labour.jpg', labelKey: 'cat_labour_label', subKey: 'cat_labour_sub', to: 'labor' },
  { img: 'cat-drone.jpg', labelKey: 'cat_drone_label', subKey: 'cat_drone_sub', to: 'drone_didi' },
  { img: 'cat-straw.jpg', labelKey: 'cat_straw_label', subKey: 'cat_straw_sub', to: 'bhusa' },
  { img: 'cat-inputs.jpg', labelKey: 'cat_inputs_label', subKey: 'cat_inputs_sub', to: 'agri_inputs' },
  { img: 'cat-godown.jpg', labelKey: 'cat_godown_label', subKey: 'cat_godown_sub', to: 'warehouse' },
  { img: 'cat-expert.jpg', labelKey: 'cat_expert_label', subKey: 'cat_expert_sub', to: 'experts' },
  { img: 'cat-land.jpg', labelKey: 'cat_land_label', subKey: 'cat_land_sub', to: 'land' },
]

// Listing category → fallback card photo (used when a listing has none of its own).
const LIST_IMG = {
  equipment: 'list-tractor.jpg', labor: 'list-workers.jpg', drone_didi: 'list-drone.jpg',
  bhusa: 'list-straw.jpg', agri_inputs: 'list-shop.jpg', warehouse: 'list-godown.jpg', land: 'list-land.jpg',
}
const listingPhoto = (l) => {
  const d = l.details || {}
  const cand = d.photo_urls || d.photos || d.images || d.image_urls
  if (Array.isArray(cand) && cand.length && typeof cand[0] === 'string') return cand[0]
  if (typeof d.photo_url === 'string') return d.photo_url
  return IMG(LIST_IMG[l.category] || 'list-harvester.jpg')
}

export default function Homepage() {
  const { t, lang } = useLang()
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [listings, setListings] = useState([])
  const [articles, setArticles] = useState([])
  const [sawaal, setSawaal] = useState([])
  const [extras, setExtras] = useState({})
  const [weather, setWeather] = useState(undefined)
  const [msp, setMsp] = useState([])
  const [mandi, setMandi] = useState({ rows: [], day: 'none' })
  const [pincode, setPincode] = useState(() => resolvePincode(user?.pincode))
  const [counts, setCounts] = useState(null)

  // Static data (once).
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [arts, crops, equipmentTypes, saw] = await Promise.all([
        fetchPublishedArticles().catch(() => []),
        fetchCrops().catch(() => []),
        fetchEquipmentTypes().catch(() => []),
        fetchFeaturedSawaal(2).catch(() => []),
      ])
      if (!alive) return
      setArticles(arts.slice(0, 2)); setExtras({ crops, equipmentTypes }); setSawaal(saw)
    })()
    fetchWeather().then((w) => alive && setWeather(w)).catch(() => alive && setWeather(null))
    fetchMsp().then((m) => alive && setMsp(m)).catch(() => alive && setMsp([]))
    fetchMandiPrices().then((m) => alive && setMandi(m)).catch(() => {})
    return () => { alive = false }
  }, [])

  // Pincode-dependent data (counts + nearby feed). Re-runs when pincode changes.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const center = await fetchPincode(pincode).catch(() => null)
      const [c, feed] = await Promise.all([
        fetchNearbyCounts(pincode, 30).catch(() => null),
        fetchHomeFeed({ center: center ? { latitude: center.latitude, longitude: center.longitude } : null, limit: 8 }).catch(() => []),
      ])
      if (!alive) return
      setCounts(c); setListings(feed)
    })()
    return () => { alive = false }
  }, [pincode])

  const alert = getRainAlert(weather?.forecast)
  const today = getTodayForFarmer({ weather, mandi, msp, alert, t })

  function changePincode() {
    const next = window.prompt(t('pincode_prompt'), pincode)
    if (next && /^\d{6}$/.test(next.trim())) {
      const v = next.trim()
      savePincode(v); setPincode(v)
    }
  }
  const goBrowse = (cat) => navigate(isLoggedIn ? (cat ? `/browse?cat=${cat}` : '/browse') : '/signup')
  const tileClick = (to) => (to === 'experts' ? navigate(isLoggedIn ? '/experts' : '/signup') : goBrowse(to))

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <MandiTicker />

      {/* 3 — Hero: आज किसान के लिए */}
      <HeroContent
        t={t} today={today} weather={weather}
        onNeed={() => navigate(isLoggedIn ? '/browse' : '/signup')}
        onHave={() => navigate(isLoggedIn ? '/post' : '/signup')}
      />

      {/* 4 — आपके आसपास (counts, 30km) */}
      <Section bg="var(--ks-bg-soft)">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[24px] font-bold leading-tight md:text-[28px]" style={{ color: 'var(--ks-ink)' }}>
            {t('near_title')} <span className="text-[16px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>({t('near_km')})</span>
          </h2>
          <button type="button" onClick={changePincode} className="shrink-0 rounded-full px-3 py-1.5 text-[14px] font-bold" style={{ background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-green)' }}>
            📍 {t('pincode_change')} · {pincode}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {NEARBY_CATEGORIES.map((c) => (
            <CountChip key={c} n={counts ? counts[c] ?? 0 : '…'} label={t(`near_cat_${c}`)} onClick={() => tileClick(c === 'bhusa' ? 'bhusa' : c === 'warehouse' ? 'warehouse' : c)} />
          ))}
        </div>
      </Section>

      {/* 5 — कृषि बाज़ार की श्रेणियाँ */}
      <Section>
        <SectionHeader title={t('cats_title')} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATEGORY_TILES.map((c) => (
            <PhotoTile key={c.img} src={IMG(c.img)} label={t(c.labelKey)} sublabel={t(c.subKey)} height={150} onClick={() => tileClick(c.to)} />
          ))}
        </div>
      </Section>

      {/* 6 — आपके आसपास की ताज़ा लिस्टिंग */}
      <Section>
        <SectionHeader title={t('listings_near_title')} linkLabel={t('view_all')} onLink={() => goBrowse()} />
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {listings.map((l) => {
              const rows = getCategory(l.category).summarize(l, lang, extras).slice(0, 2)
              const isOffer = l.listing_type === 'offer'
              const isVendor = l.listing_source === 'vendor'
              const place = [l.village_town || l.district, l.distanceKm != null ? `${Math.round(l.distanceKm)} किमी` : null].filter(Boolean).join(' · ')
              return (
                <HomeListingCard
                  key={l.id}
                  image={listingPhoto(l)}
                  badge={isVendor ? t('vendor_badge') : isOffer ? t('home_offer') : t('home_requirement')}
                  badgeTone={isVendor ? 'vendor' : isOffer ? 'offer' : 'requirement'}
                  title={rows[0]?.value || t(`home_cat_${l.category}`)}
                  price={rows[1]?.value}
                  place={place}
                  waHref={whatsappListingUrl(l)}
                  tel={null}
                />
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-center" style={{ borderColor: 'var(--ks-green)', background: 'var(--ks-green-tint)' }}>
            <p className="font-semibold" style={{ color: 'var(--ks-green-dark)' }}>{t('listings_empty')}</p>
            <button type="button" onClick={() => navigate(isLoggedIn ? '/post' : '/signup')} className="mt-3 rounded-lg px-4 py-2 text-[15px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{t('add_listing_cta')}</button>
          </div>
        )}
      </Section>

      {/* 7 — आज की 2 मिनट की वीडियो सलाह */}
      <Section bg="var(--ks-bg-soft)">
        <SectionHeader title={t('videos_title')} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {VIDEOS.map((v) => (
            <a key={v.youtubeId} href={videoWatchUrl(v)} target="_blank" rel="noopener noreferrer" className="flex flex-col overflow-hidden" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
              <div className="relative w-full" style={{ height: 160, background: 'var(--ks-green-dark)' }}>
                <img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.55)' }} aria-hidden="true">
                    <span className="ml-1 border-y-[9px] border-l-[15px] border-y-transparent border-l-white" />
                  </span>
                </span>
                <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[13px] font-bold text-white" style={{ background: 'rgba(0,0,0,.7)' }}>{v.duration}</span>
              </div>
              <div className="p-3">
                <div className="text-[16px] font-bold leading-tight" style={{ color: 'var(--ks-ink)' }}>{videoTitle(v, lang)}</div>
                <div className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>▶ {t('video_watch')} · {v.source}</div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* 8 — किसान सवाल */}
      <Section>
        <SectionHeader title={t('qa_home_title')} linkLabel={t('qa_all_link')} onLink={() => navigate('/sawaal')} />
        {sawaal.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {sawaal.map((q) => {
              const answered = !!sawaalAnswer(q, lang)
              return (
                <button key={q.id} type="button" onClick={() => navigate('/sawaal')} className="flex items-start gap-3 text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                  {q.photo_url
                    ? <img src={q.photo_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ background: 'var(--ks-green-tint)' }} aria-hidden="true">❓</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{sawaalQuestion(q, lang)}</span>
                    <span className="mt-1 block text-[14px] font-semibold" style={{ color: answered ? 'var(--ks-green)' : 'var(--ks-ink-3)' }}>{answered ? 1 : 0} {t('qa_answers_word')}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <div className="mt-3">
          <Button variant="primary" onClick={() => navigate('/sawaal?ask=1&photo=1')}>📷 {t('qa_photo_ask')}</Button>
        </div>
      </Section>

      {/* 9 — सरकारी मदद */}
      <Section bg="var(--ks-bg-warm)">
        <SectionHeader title={t('govt_title')} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { titleKey: 'govt_yojana_title', subKey: 'govt_yojana_sub', to: '/yojana', icon: '🌾' },
            { titleKey: 'govt_numbers_title', subKey: 'govt_numbers_sub', to: '/resources', icon: '☎️' },
            { titleKey: 'govt_msp_title', subKey: 'govt_msp_sub', to: '/info#msp', icon: '📋' },
          ].map((c) => (
            <button key={c.titleKey} type="button" onClick={() => navigate(c.to)} className="text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
              <div className="text-[22px]" aria-hidden="true">{c.icon}</div>
              <div className="mt-1 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t(c.titleKey)}</div>
              <div className="mt-1 text-[14px] font-semibold leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t(c.subKey)}</div>
              <div className="mt-2 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('view_all')} →</div>
            </button>
          ))}
        </div>
      </Section>

      {/* 10 — भरोसेमंद लोग (trust row; official PIB/MP photos omitted — unverifiable) */}
      <Section>
        <SectionHeader title={t('trust_title')} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {/* TODO: founder photo — not available; render initials avatar (no stock face). */}
          <div className="flex flex-col" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold text-white" style={{ background: 'var(--ks-green)' }} aria-hidden="true">अ.दी.</span>
              <span>
                <span className="block text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('founder_name')}</span>
                <span className="block text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('founder_role')}</span>
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>“{t('founder_quote')}”</p>
          </div>
        </div>
      </Section>

      {/* 11 — लेख */}
      {articles.length > 0 && (
        <Section bg="var(--ks-bg-soft)">
          <SectionHeader title={t('articles_home_title')} linkLabel={t('view_all')} onLink={() => navigate('/articles')} />
          <div className="grid grid-cols-2 gap-3">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="flex items-center gap-3 overflow-hidden text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
                {a.cover_image_url
                  ? <img src={a.cover_image_url} alt="" crossOrigin="anonymous" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-[72px] w-[96px] shrink-0 object-cover" style={{ background: 'var(--ks-green)' }} />
                  : <span className="flex h-[72px] w-[96px] shrink-0 items-center justify-center text-2xl" style={{ background: 'var(--ks-green-tint)' }} aria-hidden="true">🌾</span>}
                <span className="min-w-0 flex-1 py-2 pr-2 text-[15px] font-semibold leading-snug" style={{ color: 'var(--ks-ink)' }}>{articleTitle(a, lang)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 12 — Footer */}
      <footer className="w-full" style={{ background: 'var(--ks-strip)', padding: '20px var(--ks-gutter)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[17px] font-bold" style={{ color: '#fff' }}>🌾 {strings.app_name.hi}</div>
            <div className="mt-1 text-[14px]" style={{ color: '#B7CFBE' }}>{t('mission_income')} · {t('mission_rojgar')}</div>
            <div className="mt-1 text-[13px]" style={{ color: '#8FB29C' }}>{t('footer_company')}</div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-[14px]" style={{ color: '#B7CFBE' }}>
            <button type="button" onClick={() => navigate('/credits')}>{t('footer_credits')}</button>
            <button type="button" onClick={() => navigate('/privacy')}>{t('footer_privacy')}</button>
            <button type="button" onClick={() => navigate('/terms')}>{t('footer_terms')}</button>
            <button type="button" onClick={() => navigate('/resources')}>{t('resources_nav')}</button>
            <a href="mailto:admin@kissansahyog.com">{t('footer_contact')}</a>
            <LanguageToggle />
          </nav>
        </div>
      </footer>
    </div>
  )
}

// Hero content — shared between the desktop background-photo layout and the mobile
// banner+cream layout.
function HeroInner({ t, today, onNeed, onHave }) {
  return (
    <div className="w-full md:max-w-[58%]">
      <span className="inline-block rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }}>
        🌾 {t('tf_eyebrow')}
      </span>
      <h1 className="mt-3 text-[32px] font-extrabold leading-[1.1] md:text-[50px]" style={{ color: 'var(--ks-ink)' }}>{t('tf_title')}</h1>
      <p className="mt-2 text-[15px] md:text-[18px]" style={{ color: 'var(--ks-ink-2)' }}>{t('tf_subline')}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <InfoTile caption={t('tf_weather_cap')} value={today.weatherLine} note={today.rainLine} noteColor="var(--ks-blue)" />
        <InfoTile
          caption={t('tf_price_cap')}
          value={today.priceLine ? today.priceLine.split(' · ')[0] : '—'}
          note={today.priceLine ? today.priceLine.split(' · ').slice(1).join(' · ') : t('govt_msp_title')}
          noteColor={today.priceTone === 'above' ? 'var(--ks-green)' : today.priceTone === 'below' ? 'var(--ks-orange-dark)' : 'var(--ks-ink-3)'}
        />
        <InfoTile caption={t('tf_advice_cap')} value={today.advice} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button variant="primary" giant icon={<SearchGlyph />} sublabel={t('cta_need_sub')} onClick={onNeed}>{t('cta_need')}</Button>
        <Button variant="secondary" giant icon={<PlusGlyph />} sublabel={t('cta_have_sub')} onClick={onHave}>{t('cta_have')}</Button>
      </div>
    </div>
  )
}

function HeroContent({ t, today, onNeed, onHave }) {
  const inner = <HeroInner t={t} today={today} onNeed={onNeed} onHave={onHave} />
  return (
    <section className="w-full">
      {/* Desktop: farmer photo as background, text on a cream gradient on the left */}
      <div
        className="hidden w-full items-center md:flex"
        style={{
          minHeight: 460,
          padding: 'var(--ks-gutter)',
          backgroundImage: 'linear-gradient(90deg, rgba(251,250,245,.96) 0%, rgba(251,250,245,.85) 45%, rgba(251,250,245,.15) 100%), url(/images/home/hero-farmer.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
        }}
      >
        {inner}
      </div>
      {/* Mobile: photo banner on top, content below on cream */}
      <div className="md:hidden">
        <img src="/images/home/hero-farmer.jpg" alt="" className="h-[200px] w-full object-cover" style={{ objectPosition: 'right center' }} />
        <div style={{ background: 'var(--ks-bg)', padding: 'var(--ks-gutter)' }}>{inner}</div>
      </div>
    </section>
  )
}

function SearchGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>)
}
function PlusGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>)
}
