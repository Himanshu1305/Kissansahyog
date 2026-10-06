// /fasal-salah — per-crop advice that DOES something (Batch 2 item E). Crop cards are
// buttons; tapping one opens an in-page crop panel (choice recorded: a panel, not a
// /fasal-salah/<crop> route — no new prerendered pages, the data is location-dependent)
// with: today's call (spray/irrigate/harvest from actionWindows + the weather cell),
// this season's work (existing cropadv_<slug> text only), common problems (links to the
// crop's Q&A), and nearby help (Browse + Drone Didi + equipment + KVK Sagar).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import BackButton from '../components/BackButton'
import { fetchWeatherCell } from '../lib/weather/weatherApiV2'
import { actionWindows, STATUS_COLOR } from '../lib/weather/weatherRules'
import { fetchPincode } from '../lib/listings/listingsApi'
import { fetchRelatedSawaal, sawaalQuestion } from '../lib/community/communityApi'
import { initialLocation, DEFAULT_COORDS } from '../lib/location/locationStore'
import { CROPS, currentSeason, cropName } from '../content/crops'
import { PageExplainer, LocationControl, JsonLd } from '../components/pages/shared'
import { PageShell } from '../components/layout'

const STATUS_LABEL = { ok: 'aw_ok', caution: 'aw_caution', stop: 'aw_stop' }
const SEASON_LABEL = { kharif: 'season_kharif', rabi: 'season_rabi' }
// Map a crop (content/crops) to the kisan_sawaal `crop` value (lowercase English name).
const kbCrop = (c) => String(c.en || '').toLowerCase()

export default function FasalSalah() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loc, setLoc] = useState(() => initialLocation(user?.pincode))
  const [wx, setWx] = useState(null)
  const [selected, setSelected] = useState(null) // crop slug
  const [relatedQ, setRelatedQ] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      let lat = loc.rawCoords?.latitude, lon = loc.rawCoords?.longitude
      if (lat == null || lon == null) {
        const p = loc.matchedVillage?.pincode ? await fetchPincode(loc.matchedVillage.pincode).catch(() => null) : null
        lat = p?.latitude ?? DEFAULT_COORDS.latitude
        lon = p?.longitude ?? DEFAULT_COORDS.longitude
      }
      const cell = await fetchWeatherCell(Number(lat), Number(lon)).catch(() => null)
      if (alive) setWx(cell)
    })()
    return () => { alive = false }
  }, [loc])

  const windows = useMemo(() => (wx ? actionWindows(wx.hourly, wx.daily) : null), [wx])
  const season = currentSeason()
  const seasonCrops = CROPS.filter((c) => c.season === season && c.slug !== 'lahsun')
  const otherCrops = CROPS.filter((c) => c.season !== season && c.slug !== 'lahsun')
  const selectedCrop = selected ? CROPS.find((c) => c.slug === selected) : null
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: t('fasal_h1'), description: t('fasal_intro_1') }

  // Load the crop's top-5 Q&As when a crop is opened.
  useEffect(() => {
    if (!selectedCrop) { setRelatedQ([]); return }
    let alive = true
    fetchRelatedSawaal({ crop: kbCrop(selectedCrop), limit: 5 }).then((r) => { if (alive) setRelatedQ(r || []) }).catch(() => { if (alive) setRelatedQ([]) })
    return () => { alive = false }
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCrop(slug) {
    setSelected(slug)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const CropButton = (c, withVerdict) => (
    <button
      key={c.slug}
      type="button"
      onClick={() => openCrop(c.slug)}
      data-testid={`fasal-crop-${c.slug}`}
      className="text-left"
      style={{ background: selected === c.slug ? 'var(--ks-green-tint)' : 'var(--ks-card)', border: `1px solid ${selected === c.slug ? 'var(--ks-green)' : 'var(--ks-border)'}`, borderRadius: 'var(--ks-radius)', padding: '12px' }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{cropName(c, lang)}</div>
        <span className="text-[13px] font-bold" style={{ color: 'var(--ks-green)' }}>→</span>
      </div>
      <p className="mt-1 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t(`cropadv_${c.slug}`)}</p>
      {withVerdict && windows && (
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>🌾 {t('aw_harvest')}: {t(STATUS_LABEL[windows.harvest.status])} · 💦 {t('aw_spray')}: {t(STATUS_LABEL[windows.spray.status])}</p>
      )}
    </button>
  )

  const Verdict = ({ icon, labelKey, w }) => {
    const col = STATUS_COLOR[w.status]
    return (
      <div className="flex items-start gap-2">
        <span className="text-[20px]" aria-hidden="true">{icon}</span>
        <div>
          <span className="inline-block rounded-full px-2 py-0.5 text-[13px] font-bold" style={{ background: col.bg, color: col.fg }}>{t(labelKey)}: {t(STATUS_LABEL[w.status])}</span>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t(w.reasonKey)}</p>
        </div>
      </div>
    )
  }

  const CropPanel = () => {
    const c = selectedCrop
    const hasProblems = relatedQ.length > 0
    return (
      <section data-testid="fasal-crop-panel" style={{ background: 'var(--ks-card)', border: '2px solid var(--ks-green)', borderRadius: 'var(--ks-radius-lg)', padding: '16px' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{cropName(c, lang)}</h2>
          <button type="button" onClick={() => setSelected(null)} className="text-[14px] font-bold" style={{ color: 'var(--ks-ink-3)' }}>✕ {t('fasal_close')}</button>
        </div>

        {/* 1. Today's call */}
        <div className="mt-3">
          <h3 className="mb-1.5 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>📅 {t('fasal_today_call')}</h3>
          {windows ? (
            <div className="space-y-2">
              <Verdict icon="💦" labelKey="aw_spray" w={windows.spray} />
              <Verdict icon="🚰" labelKey="aw_irrigation" w={windows.irrigation} />
              <Verdict icon="🌾" labelKey="aw_harvest" w={windows.harvest} />
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('fasal_no_weather')}</p>
          )}
        </div>

        {/* 2. This season's work */}
        <div className="mt-4">
          <h3 className="mb-1.5 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>🌱 {t('fasal_season_work')}</h3>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t(`cropadv_${c.slug}`)}</p>
        </div>

        {/* 3. Common problems — hidden if the crop has no Q&A */}
        {hasProblems && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>❓ {t('fasal_problems_h')}</h3>
            <ul className="space-y-1.5">
              {relatedQ.map((q) => (
                <li key={q.slug}>
                  <Link to={`/sawaal/${q.slug}`} className="text-[14px] font-semibold" style={{ color: 'var(--ks-green)' }}>• {sawaalQuestion(q, lang)}</Link>
                </li>
              ))}
            </ul>
            <Link to={`/fasal/${kbCrop(c)}/samasya`} className="mt-1.5 inline-block text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('fasal_problems_all')} →</Link>
          </div>
        )}

        {/* 4. Nearby help */}
        <div className="mt-4">
          <h3 className="mb-1.5 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>📍 {t('fasal_nearby_h')}</h3>
          <div className="flex flex-col gap-1.5">
            <Link to="/browse?cat=agri_inputs" className="text-[14px] font-semibold" style={{ color: 'var(--ks-green)' }}>🧪 {t('fasal_nearby_inputs')} →</Link>
            <Link to="/browse?cat=drone_didi" className="text-[14px] font-semibold" style={{ color: 'var(--ks-green)' }}>🚁 {t('fasal_nearby_drone')} →</Link>
            <Link to="/browse?cat=equipment" className="text-[14px] font-semibold" style={{ color: 'var(--ks-green)' }}>🚜 {t('fasal_nearby_equip')} →</Link>
            <Link to="/resources" className="text-[14px] font-semibold" style={{ color: 'var(--ks-green)' }}>🏢 {t('fasal_nearby_kvk')} →</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <PageShell width="wide">
      <JsonLd data={articleLd} />
      <div className="w-full space-y-5">
        <BackButton fallback="/mausam" />
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{t('fasal_h1')}</h1>
        <PageExplainer title={t('page_explainer_title')} lines={[t('fasal_intro_1'), t('fasal_intro_2')]} />
        <LocationControl value={loc} onChange={setLoc} showOutOfArea={false} />

        <button type="button" onClick={() => navigate('/mausam')} className="inline-block text-[15px] font-bold" style={{ color: 'var(--ks-green)' }}>🌤 {t('fasal_see_mausam')} →</button>

        {selectedCrop ? <CropPanel /> : (
          <p className="rounded-lg px-3 py-2 text-[14px] font-semibold" style={{ background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)' }}>{t('fasal_tap_hint')}</p>
        )}

        <section>
          <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('fasal_season_h')} — {t(SEASON_LABEL[season])}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{seasonCrops.map((c) => CropButton(c, true))}</div>
        </section>

        <section>
          <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('fasal_all_h')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{otherCrops.map((c) => CropButton(c, false))}</div>
        </section>
      </div>
    </PageShell>
  )
}
