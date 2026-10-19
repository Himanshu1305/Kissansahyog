// Homepage v4 (Direction B · Balanced) — photograph-first, edge-to-edge, built
// entirely from the shared kit (src/components/home/kit.jsx) on the tokens in
// src/styles/tokens.css. Section order follows HOMEPAGE_V4_BUILD_PROMPT Phase 4.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import LanguageToggle from '../components/LanguageToggle'
import MandiTicker from '../components/MandiTicker'
import { Section, SectionHeader, Button, PhotoTile, InfoTile, CountChip, HomeListingCard } from '../components/home/kit'
import { fetchWeatherCell, requestGridCell } from '../lib/weather/weatherApiV2'
import { getRainAlert } from '../lib/weather/rainAlert'
import { fetchMsp } from '../lib/msp/mspApi'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { getTodayForFarmer } from '../lib/today/forFarmer'
import { strings } from '../lib/i18n/strings'
import { getCategorySafe } from '../lib/listings/registry'
import { fetchHomeFeed, fetchCrops, fetchEquipmentTypes } from '../lib/listings/listingsApi'
import { fetchNearbyCounts, NEARBY_CATEGORIES } from '../lib/listings/nearbyCounts'
import { useUserLocation } from '../lib/location/LocationProvider'
import { LocationControl } from '../components/pages/shared'
import { fetchPublishedArticles, articleTitle } from '../lib/articles/articlesApi'
import { fetchFeaturedSawaal, sawaalQuestion, sawaalAnswer } from '../lib/community/communityApi'
import { whatsappListingUrl } from '../lib/share/shareMessages'
import { incrementContactClick } from '../lib/listings/listingsApi'
import WhatsAppJoin from '../components/WhatsAppJoin'
import AvailabilityNudge from '../components/AvailabilityNudge'
import PwaInstallBanner from '../components/PwaInstallBanner'
import { fetchFeaturedVideos, videoTitle, videoWatchUrl, videoThumb } from '../lib/videos/videosApi'
import { fetchPestReports } from '../lib/pest/pestApi'
import { fetchUpcomingMelas } from '../lib/mela/melaApi'
import { melaDateLabel, melaPlace } from '../lib/mela/melaFormat'
import { melaStatus } from '../lib/mela/melaStatus'
import SearchBar from '../components/SearchBar'
import { founder } from '../content/founder'
import OfflineStamp from '../components/OfflineStamp'

const IMG = (f) => `/images/home/${f}`

// Category tiles (Phase 4 §5) — image + label/sublabel + browse target.
const CATEGORY_TILES = [
  { img: 'cat-rotavator.jpg', labelKey: 'cat_machines_label', subKey: 'cat_machines_sub', to: 'equipment' },
  { img: 'cat-tanker.jpg', labelKey: 'cat_tanker_label', subKey: 'cat_tanker_sub', to: 'equipment', etype: 'water_tanker' },
  { img: 'cat-labour.jpg', labelKey: 'cat_labour_label', subKey: 'cat_labour_sub', to: 'labor' },
  { img: 'cat-drone.jpg', labelKey: 'cat_drone_label', subKey: 'cat_drone_sub', to: 'drone_didi' },
  { img: 'cat-straw.jpg', labelKey: 'cat_straw_label', subKey: 'cat_straw_sub', to: 'bhusa' },
  { img: 'cat-seeds.jpg', labelKey: 'cat_inputs_label', subKey: 'cat_inputs_sub', to: 'agri_inputs' },
  { img: 'cat-building-materials.jpg', labelKey: 'cat_building_materials_label', subKey: 'cat_building_materials_sub', to: 'building_materials' },
  { img: 'cat-godown.jpg', labelKey: 'cat_godown_label', subKey: 'cat_godown_sub', to: 'warehouse' },
  { img: 'cat-cold-storage.jpg', labelKey: 'cs_tile_label', subKey: 'cs_tile_sub', path: '/cold-storage' },
  { img: 'cat-greenhouse.jpg', labelKey: 'gh_tile_label', subKey: 'gh_tile_sub', path: '/greenhouse' },
  { img: 'cat-carbon.jpg', labelKey: 'carbon_tile_label', subKey: 'carbon_tile_sub', path: '/carbon-credit' },
  { img: 'cat-jugaad.jpg', labelKey: 'jugaad_tile_label', subKey: 'jugaad_tile_sub', path: '/jugaad' },
  { img: 'cat-transport.jpg', labelKey: 'cat_transport_label', subKey: 'cat_transport_sub', to: 'transport' },
  { img: 'cat-expert.jpg', labelKey: 'cat_expert_label', subKey: 'cat_expert_sub', to: 'experts' },
  { img: 'cat-land.jpg', labelKey: 'cat_land_label', subKey: 'cat_land_sub', to: 'land' },
]

// What the open-to-all strip names. Each is a public route in App.jsx (no <Protected>).
const OPEN_LINKS = [
  { to: '/msp', labelKey: 'home_open_mandi' },
  { to: '/yojana', labelKey: 'home_open_schemes' },
  { to: '/sawaal', labelKey: 'home_open_sawaal' },
  { to: '/cold-storage', labelKey: 'home_open_cold' },
  { to: '/kisan-mela', labelKey: 'home_open_mela' },
]

// Listing category → fallback card photo (used when a listing has none of its own).
const LIST_IMG = {
  equipment: 'list-tractor.jpg', labor: 'list-workers.jpg', drone_didi: 'list-drone.jpg',
  bhusa: 'list-straw.jpg', agri_inputs: 'cat-seeds.jpg', building_materials: 'cat-building-materials.jpg', warehouse: 'list-godown.jpg', land: 'list-land.jpg',
  transport: 'cat-transport.jpg', greenhouse: 'cat-greenhouse.jpg', jugaad: 'cat-jugaad.jpg',
}
// Equipment sub-type (equipment_types.id) → a more specific photo, so a harvester
// or thresher listing does not fall back to the generic tractor photo.
const EQUIP_TYPE_IMG = { 3: 'list-thresher.jpg', 4: 'list-harvester.jpg', water_tanker: 'cat-tanker.jpg' }
const listingPhoto = (l) => {
  const d = l.details || {}
  const cand = d.photo_urls || d.photos || d.images || d.image_urls
  if (Array.isArray(cand) && cand.length && typeof cand[0] === 'string') return cand[0]
  if (typeof d.photo_url === 'string') return d.photo_url
  if (l.category === 'equipment') {
    const et = Number(d.equipment_type_id)
    if (EQUIP_TYPE_IMG[et]) return IMG(EQUIP_TYPE_IMG[et])
  }
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
  // Batch 7L-1 — the one shared location ({ lat, lng, label, source }); null until the visitor sets one.
  const { location, center } = useUserLocation()
  const [counts, setCounts] = useState(null)
  const [videos, setVideos] = useState([])
  const [pestReports, setPestReports] = useState([])
  // null = still loading; [] = none in MP + neighbouring states → the whole section is hidden (10E 5.1).
  const [melas, setMelas] = useState(null)

  // Static data (once).
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [arts, crops, equipmentTypes, saw, vids, pest] = await Promise.all([
        fetchPublishedArticles().catch(() => []),
        fetchCrops().catch(() => []),
        fetchEquipmentTypes().catch(() => []),
        fetchFeaturedSawaal(3).catch(() => []),
        fetchFeaturedVideos(3).catch(() => []),
        fetchPestReports(14, 2).catch(() => []),
      ])
      if (!alive) return
      setArticles(arts.slice(0, 2)); setExtras({ crops, equipmentTypes }); setSawaal(saw)
      setVideos(vids); setPestReports(pest)
    })()
    fetchMsp().then((m) => alive && setMsp(m)).catch(() => alive && setMsp([]))
    fetchMandiPrices().then((m) => alive && setMandi(m)).catch(() => {})
    fetchUpcomingMelas(3, { region: true }).then((m) => alive && setMelas(m)).catch(() => alive && setMelas([]))
    return () => { alive = false }
  }, [])

  // Location-dependent data (weather cell + counts + nearby feed). Re-runs on change.
  // With no location there is no weather and no counts — the prompt card is shown instead —
  // and the listings block shows the newest listings, labelled as such (not "near you").
  const lat = center?.latitude ?? null, lng = center?.longitude ?? null
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (lat == null || lng == null) {
        setCounts(null); setWeather(null)
        const feed = await fetchHomeFeed({ center: null, limit: 8 }).catch(() => [])
        if (alive) setListings(feed)
        return
      }
      const c0 = { latitude: lat, longitude: lng }
      requestGridCell(lat, lng)
      const [c, feed, w] = await Promise.all([
        fetchNearbyCounts(c0, 30).catch(() => null),
        fetchHomeFeed({ center: c0, limit: 8 }).catch(() => []),
        fetchWeatherCell(lat, lng).catch(() => null),
      ])
      if (!alive) return
      setCounts(c); setListings(feed); setWeather(w)
    })()
    return () => { alive = false }
  }, [lat, lng])

  const alert = getRainAlert(weather?.forecast)
  const todayBase = getTodayForFarmer({ weather, mandi, msp, alert, t })
  // No location → say so in the weather tile instead of "unavailable" (never a default place's weather).
  const today = location ? todayBase : { ...todayBase, weatherLine: t('loc_set_for_weather'), rainLine: t('loc_share') }

  // Pest banner: top qualifying crop+symptom group (framed as recently asked).
  const pest = (pestReports && pestReports[0]) || null

  // Batch1 item 3A: browsing is public — category tiles open /browse for everyone.
  const goBrowse = (cat, etype) => navigate(cat ? `/browse?cat=${cat}${etype ? `&etype=${etype}` : ''}` : '/browse')
  const tileClick = (to, etype) => (to === 'experts' ? navigate(isLoggedIn ? '/experts' : '/signup') : goBrowse(to, etype))
  // Batch 10E: category tiles are real links — the same destinations tileClick/goBrowse navigate to.
  const tileHref = (c) => (c.path ? c.path : c.to === 'experts' ? (isLoggedIn ? '/experts' : '/signup') : `/browse?cat=${c.to}${c.etype ? `&etype=${c.etype}` : ''}`)

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      {/* Phase 7 — slim install banner below nav, above hero (self-hides in standalone). */}
      <PwaInstallBanner />
      <MandiTicker />
      <OfflineStamp resources={['mandi_prices']} hideUnderBanner className="px-[var(--ks-gutter)] pt-1" />

      {/* Greeting for logged-in users (§0.3): "सीताराम 🙏, {name}". */}
      {isLoggedIn && (
        <div style={{ padding: '10px var(--ks-gutter) 0' }}>
          <p className="text-[16px] font-semibold" style={{ color: 'var(--ks-ink)' }}>
            {t('greeting_sitaram')} 🙏{user?.full_name ? `, ${user.full_name}` : ''}
          </p>
        </div>
      )}

      {/* WhatsApp join banner — hidden until admin sets whatsapp_channel_url (§13.2). */}
      <WhatsAppJoin variant="banner" src="home" />

      {/* Seasonal water-tanker box — prominent March–June (summer). */}
      {(() => { const m = new Date().getMonth(); return m >= 2 && m <= 5 })() && (
        <button
          type="button"
          onClick={() => goBrowse('equipment', 'water_tanker')}
          className="block w-full text-left"
          style={{ background: 'var(--ks-blue-tint)', borderTop: '2px solid var(--ks-blue)', borderBottom: '2px solid var(--ks-blue)', padding: '10px var(--ks-gutter)' }}
        >
          <span className="block text-[15px] font-bold" style={{ color: 'var(--ks-blue)' }}>🚰 {t('tanker_season_title')}</span>
          <span className="block text-[14px] font-semibold" style={{ color: 'var(--ks-green-dark)' }}>{t('tanker_season_cta')} →</span>
        </button>
      )}

      {/* Open-to-all strip (Batch 7D): everything named here is a public route — no login.
          Carries the link to /how-to-use (this replaces the separate 7C strip). */}
      <section data-testid="home-open-strip" aria-labelledby="home-open-h" className="w-full" style={{ background: 'var(--ks-green-tint)', borderBottom: '1px solid var(--ks-border)', padding: '10px var(--ks-gutter)' }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="home-open-h" className="text-[16px] font-extrabold leading-snug md:text-[17px]" style={{ color: 'var(--ks-green-dark)' }}>{t('home_open_title')}</h2>
          <ul className="flex flex-wrap gap-1.5">
            {OPEN_LINKS.map((o) => (
              <li key={o.to}>
                <Link to={o.to} className="inline-flex min-h-[40px] items-center rounded-full bg-white px-3 text-[14px] font-bold" style={{ color: 'var(--ks-green-dark)', border: '1px solid var(--ks-green)' }}>{t(o.labelKey)}</Link>
              </li>
            ))}
          </ul>
          <Link to="/how-to-use" data-testid="home-how-to-use" className="inline-flex min-h-[40px] items-center text-[14px] font-bold underline md:ml-auto" style={{ color: 'var(--ks-green-dark)' }}>{t('nav_how_to_use')} →</Link>
        </div>
      </section>

      {/* Batch 10C: "first time?" card to the live demos at /guide. A plain link (no
          heading) so the page outline stays exactly as it was. */}
      <div style={{ padding: '10px var(--ks-gutter) 0' }}>
        <Link
          to="/guide"
          data-testid="entry-home-guide"
          className="flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)] md:max-w-xl"
          style={{ background: 'var(--ks-saffron-tint)', borderColor: 'var(--ks-saffron)' }}
        >
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ks-accent)] text-[var(--ks-ink)]">
            <svg width="14" height="16" viewBox="0 0 9 10" focusable="false"><path d="M1 0.5L8.5 5L1 9.5Z" fill="currentColor" /></svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-extrabold leading-snug" style={{ color: 'var(--ks-ink)' }}>{t('guide_home_card_title')}</span>
            <span className="block text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t('guide_home_card_sub')}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-xl font-bold" style={{ color: 'var(--ks-orange-dark)' }}>›</span>
        </Link>
      </div>

      {/* 3 — Hero: आज किसान के लिए (Batch 10F: static, see HomeHero) */}
      <HomeHero
        showFreeReg={!isLoggedIn}
        t={t} today={today}
        onNeed={() => navigate('/browse')}
        onHave={() => navigate(isLoggedIn ? '/post' : '/signup')}
        onForecast={() => (location ? navigate('/mausam') : document.getElementById('home-location')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))}
        onMsp={() => navigate('/msp')}
      />

      <Section bg="var(--ks-bg-soft)">
        <h2 className="text-[22px] font-extrabold md:text-[26px]" style={{ color: 'var(--ks-ink)' }}>{t('home_search_title')}</h2>
        <p className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('home_search_subtitle')}</p>
        <div className="mt-3"><SearchBar variant="hero" /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['home_search_chip_mandi', 'home_search_chip_scheme', 'home_search_chip_machine', 'home_search_chip_place'].map((key) => <button key={key} type="button" onClick={() => navigate(`/search?q=${encodeURIComponent(t(key))}`)} className="rounded-full border border-[var(--ks-border-strong)] bg-white px-3 py-1.5 text-sm font-bold text-[var(--ks-green-dark)]">{t(key)}</button>)}
        </div>
      </Section>

      {/* Pest/disease "recently reported" banner (Phase 6) — only when a group qualifies */}
      {pest && (
        <button type="button" onClick={() => navigate('/sawaal')} className="block w-full text-left" style={{ background: 'var(--ks-saffron-tint)', borderTop: '2px solid var(--ks-saffron)', borderBottom: '2px solid var(--ks-saffron)', padding: '10px var(--ks-gutter)' }}>
          <span className="block text-[15px] font-bold" style={{ color: 'var(--ks-orange-dark)' }}>
            ⚠️ {t('pest_banner_prefix')} — {t('pest_banner_area')} {t(`pest_crop_${pest.crop}`)} {t('pest_banner_on')} {pest.report_count} {t(`pest_sym_${pest.symptom_tag}`)} {t('pest_banner_reports')}
          </span>
          <span className="block text-[14px] font-semibold" style={{ color: 'var(--ks-green-dark)' }}>{t('pest_banner_cta')}</span>
        </button>
      )}

      {/* Phase 3d — owner engagement nudge (self-hides when not logged in / none qualify). */}
      {isLoggedIn && (
        <div style={{ padding: '10px var(--ks-gutter) 0' }}>
          <AvailabilityNudge />
        </div>
      )}

      {/* 4 — आपके आसपास (counts, 30km) */}
      <Section bg="var(--ks-bg-soft)">
        <h2 className="mb-2 text-[24px] font-bold leading-tight md:text-[28px]" style={{ color: 'var(--ks-ink)' }}>
          {t('near_title')} <span className="text-[16px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>({t('near_km')})</span>
        </h2>
        <div id="home-location" className="mb-3"><LocationControl /></div>
        {/* Counts only once a location is set — until then the prompt card above stands in for them. */}
        {location && (
          <div data-testid="home-nearby-counts" className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {NEARBY_CATEGORIES.map((c) => (
              <CountChip key={c} n={counts ? counts[c] ?? 0 : '…'} label={t(`near_cat_${c}`)} onClick={() => tileClick(c === 'bhusa' ? 'bhusa' : c === 'warehouse' ? 'warehouse' : c)} />
            ))}
          </div>
        )}
      </Section>

      {/* 5 — कृषि बाज़ार की श्रेणियाँ */}
      <Section>
        <SectionHeader title={t('cats_title')} />
        {/* No blank cell at any width: 2 columns (an odd last tile spans the row), 3, then 5. */}
        <div data-testid="home-cat-grid" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1">
          {CATEGORY_TILES.map((c) => (
            <PhotoTile key={c.labelKey} src={IMG(c.img)} label={t(c.labelKey)} sublabel={t(c.subKey)} height={150} to={tileHref(c)} />
          ))}
        </div>
      </Section>

      {/* 6 — आपके आसपास की ताज़ा लिस्टिंग */}
      <Section>
        <SectionHeader title={t(location ? 'listings_near_title' : 'listings_latest_title')} linkLabel={t('view_all')} onLink={() => goBrowse()} />
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {listings.filter((l) => getCategorySafe(l.category)).map((l) => {
              const rows = getCategorySafe(l.category).summarize(l, lang, extras).slice(0, 2)
              const isOffer = l.listing_type === 'offer'
              const isVendor = l.listing_source === 'vendor'
              const place = [l.village_town || l.district, l.distanceKm != null ? `${Math.round(l.distanceKm)} ${t('unit_km')}` : null].filter(Boolean).join(' · ')
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
                  onWhatsApp={() => incrementContactClick(l.id)}
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
        <SectionHeader title={t('videos_title')} linkLabel={t('view_all')} onLink={() => navigate('/videos')} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {videos.map((v) => (
            <a key={v.id} href={videoWatchUrl(v)} target="_blank" rel="noopener noreferrer" className="flex flex-col overflow-hidden" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
              <div className="relative w-full" style={{ height: 160, background: 'var(--ks-green-dark)' }}>
                <img src={videoThumb(v)} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.55)' }} aria-hidden="true">
                    <span className="ml-1 border-y-[9px] border-l-[15px] border-y-transparent border-l-white" />
                  </span>
                </span>
                {v.duration && <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[13px] font-bold text-white" style={{ background: 'rgba(0,0,0,.7)' }}>{v.duration}</span>}
              </div>
              <div className="p-3">
                <div className="text-[16px] font-bold leading-tight" style={{ color: 'var(--ks-ink)' }}>{videoTitle(v, lang)}</div>
                <div className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>▶ {t('video_watch')} · {v.channel_name}</div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* 8 — किसान सवाल */}
      <Section>
        <SectionHeader title={t('qa_home_title')} linkLabel={t('qa_all_link')} onLink={() => navigate('/sawaal')} />
        {sawaal.length > 0 && (
          <div className="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sawaal.map((q) => {
              const answer = sawaalAnswer(q, lang)
              return (
                <button key={q.id} type="button" onClick={() => navigate('/sawaal')} className="flex h-full flex-col text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                  <span className="line-clamp-2 block text-[16px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}><span className="mr-1 text-sm" aria-hidden="true">💬</span>{sawaalQuestion(q, lang)}</span>
                  {answer && <span className="mt-2 line-clamp-3 block text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{answer}</span>}
                  <span className="mt-auto pt-3 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('qa_read_answer')}</span>
                </button>
              )
            })}
          </div>
        )}
        <div className="mt-3">
          <Button variant="primary" onClick={() => navigate('/sawaal?ask=1&photo=1')}>📷 {t('qa_photo_ask')}</Button>
        </div>
      </Section>

      {/* Kisan Mela teaser (Batch 10E 5.1): only Madhya Pradesh + neighbouring states (UP, Maharashtra,
          Chhattisgarh, Gujarat, Rajasthan), MP first. Nothing qualifying (or still loading) → no section;
          every Mela stays on /kisan-mela. */}
      {melas?.length > 0 && (
        <Section>
          <SectionHeader title={t('mela_home_title')} linkLabel={t('mela_home_all')} onLink={() => navigate('/kisan-mela')} />
          <div className="grid gap-3 md:grid-cols-3">
            {melas.map((m) => (
              <button key={m.id} type="button" data-testid="home-mela-card" onClick={() => navigate('/kisan-mela')} className="flex flex-col text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                <span className="text-[15px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>🌾 {lang === 'hi' ? m.name_hi : (m.name_en || m.name_hi)}</span>
                {melaStatus(m) === 'ongoing' && <span className="mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--ks-orange-tint)', color: 'var(--ks-orange-dark)' }}>{t('mela_ongoing')}</span>}
                <span className="mt-1 text-[13px] font-semibold" style={{ color: m.is_date_confirmed ? 'var(--ks-green)' : 'var(--ks-orange-dark)' }}>
                  📅 {melaDateLabel(m, lang, { expectedLabel: t('mela_expected_prefix'), tbdLabel: '' })}
                </span>
                <span className="mt-0.5 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>📍 {melaPlace(m)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 9 — सरकारी मदद */}
      <Section bg="var(--ks-bg-warm)">
        <SectionHeader title={t('govt_title')} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { titleKey: 'govt_yojana_title', subKey: 'govt_yojana_sub', to: '/yojana', icon: '🌾' },
            { titleKey: 'govt_numbers_title', subKey: 'govt_numbers_sub', to: '/resources', icon: '☎️' },
            { titleKey: 'govt_msp_title', subKey: 'govt_msp_sub', to: '/msp', icon: '📋' },
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
        {/* Founder band: portrait (or initials avatar — never a stock face) → /founder. */}
        <div data-testid="home-founder-band" className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '16px' }}>
          {founder.portrait.src ? (
            <img src={founder.portrait.src} alt={founder.portrait.alt[lang] ?? founder.portrait.alt.hi} width={founder.portrait.width} height={founder.portrait.height} loading="lazy" className="h-24 w-24 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[24px] font-extrabold text-white md:h-24 md:w-24 md:text-[28px]" style={{ background: 'var(--ks-green-dark)' }} aria-hidden="true">{t('founder_initials')}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-extrabold leading-snug md:text-[22px]" style={{ color: 'var(--ks-ink)' }}>{t('founder_name')}</p>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{t('founder_role')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {['founder_badge_service', 'founder_badge_medal', 'founder_badge_guinness'].map((k) => (
                <li key={k} className="rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t(k)}</li>
              ))}
            </ul>
            <p className="mt-3 text-[20px] font-extrabold tracking-wide md:text-[24px]" style={{ color: 'var(--ks-green)' }}>“{t('founder_quote')}”</p>
          </div>
          <Link to="/founder" data-testid="home-founder-link" className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl px-5 text-[16px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>
            {t('founder_read_full')} →
          </Link>
        </div>
      </Section>

      {/* 11 — लेख */}
      {articles.length > 0 && (
        <Section bg="var(--ks-bg-soft)">
          <SectionHeader title={t('articles_home_title')} linkLabel={t('view_all')} onLink={() => navigate('/articles')} />
          <div className="grid grid-cols-2 gap-3">
            {articles.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/articles/${a.slug}`)} className="flex items-center gap-3 overflow-hidden text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
                {/* Green-bg wrapper so a broken/dead cover URL falls back to a solid
                    --ks-green block (never a black box) instead of empty space. */}
                <span className="flex h-[72px] w-[96px] shrink-0 items-center justify-center overflow-hidden text-2xl" style={{ background: 'var(--ks-green)' }} aria-hidden="true">
                  {a.cover_image_url
                    ? <img src={a.cover_image_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-full w-full object-cover" />
                    : '🌾'}
                </span>
                <span className="min-w-0 flex-1 py-2 pr-2 text-[15px] font-semibold leading-snug" style={{ color: 'var(--ks-ink)' }}>{articleTitle(a, lang)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Footer is the shared global <Footer/> (mounted once in App). */}
    </div>
  )
}

// Hero (Batch 10F). Static, mobile first, rendered once at every size: no timer, no animation,
// no lazy chunk (founder: the 10D persona tabs / phone example duplicated the demos, and homepage
// animation is deferred). Order on phones: eyebrow chip (+ free-registration badge), the one <h1>,
// the sub-line, the two big buttons, the demo button, then the three real info tiles (weather,
// price, advice; same data and links as before, the price tile hidden when there is no price).
// From 1024 px: two columns, the tiles stacked on the right.
function HomeHero({ t, today, onNeed, onHave, onForecast, onMsp, showFreeReg }) {
  return (
    <section data-testid="home-hero" className="w-full" style={{ background: 'var(--ks-bg)' }}>
      <div className="ks-section-inner grid grid-cols-1 gap-4 pb-4 pt-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:pb-6 lg:pt-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="inline-block rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }}>
              🌾 {t('tf_eyebrow')}
            </span>
            {/* The free-registration badge (Batch 7D), logged-out visitors only. */}
            {showFreeReg && <HeroBadge t={t} />}
          </div>
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.15] md:text-[38px] lg:text-[44px]" style={{ color: 'var(--ks-ink)' }}>{t('tf_title')}</h1>
          <p className="mt-1 text-[16px] leading-snug md:text-[18px]" style={{ color: 'var(--ks-ink-2)' }}>{t('tf_subline')}</p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="primary" giant icon={<SearchGlyph />} sublabel={t('cta_need_sub')} onClick={onNeed}>{t('cta_need')}</Button>
            <Button variant="secondary" giant icon={<PlusGlyph />} sublabel={t('cta_have_sub')} onClick={onHave}>{t('cta_have')}</Button>
          </div>
          {/* Next to the post-listing button: posting needs an account. */}
          {showFreeReg && (
            <p data-testid="post-free-registration" className="mt-2 text-right text-[14px] font-bold" style={{ color: 'var(--ks-orange-dark)' }}>✓ {t('free_registration')}</p>
          )}
          {/* The one demo button: same destination as the 10D hero's demo button (/guide). */}
          <Link
            to="/guide"
            data-testid="home-hero-demo"
            className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 px-4 text-[17px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)] sm:w-auto sm:justify-start"
            style={{ background: 'var(--ks-card)', color: 'var(--ks-green-dark)', borderColor: 'var(--ks-green)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            {t('home_hero_demo')}
          </Link>
        </div>

        <div data-testid="home-hero-cards" className="flex min-w-0 flex-col gap-3 sm:flex-row lg:flex-col">
          <InfoTile caption={t('tf_weather_cap')} value={today.weatherLine} note={`${today.rainLine} · ${t('home_forecast_link')} →`} noteColor="var(--ks-blue)" onClick={onForecast} />
          {/* Price tile only when there is a price to show (it used to render an empty "—"). */}
          {today.priceLine && (
            <InfoTile
              caption={t('tf_price_cap')}
              value={today.priceLine.split(' · ')[0]}
              note={`${today.priceLine.split(' · ').slice(1).join(' · ')} · ${t('home_msp_link')} →`}
              noteColor={today.priceTone === 'above' ? 'var(--ks-green)' : today.priceTone === 'below' ? 'var(--ks-orange-dark)' : 'var(--ks-ink-3)'}
              onClick={onMsp}
            />
          )}
          <InfoTile caption={t('tf_advice_cap')} value={today.advice} />
        </div>
      </div>
    </section>
  )
}

// The one deliberate promotion (Batch 7D) — shown to visitors who are not logged in.
function HeroBadge({ t }) {
  return (
    <span data-testid="hero-free-registration" className="ml-2 mt-1 inline-block rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)', border: '1px solid var(--ks-green)' }}>
      ✓ {t('free_registration')}
    </span>
  )
}

function SearchGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>)
}
function PlusGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>)
}
