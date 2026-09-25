// /fasal-salah — per-crop, per-season advice moved off /mausam. Same rule-based
// generation (weatherRules.js action windows for the viewer's cell) + static crop
// advice. Cross-links back to /mausam.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { fetchWeatherCell } from '../lib/weather/weatherApiV2'
import { actionWindows } from '../lib/weather/weatherRules'
import { fetchPincode } from '../lib/listings/listingsApi'
import { resolvePincode, savePincode } from '../lib/listings/nearbyCounts'
import { fetchSiteSetting } from '../lib/pages/pagesApi'
import { CROPS, currentSeason, cropName } from '../content/crops'
import { PageExplainer, LocationControl, ReviewTag, JsonLd } from '../components/pages/shared'

const STATUS_LABEL = { ok: 'aw_ok', caution: 'aw_caution', stop: 'aw_stop' }
const SEASON_LABEL = { kharif: 'season_kharif', rabi: 'season_rabi' }

export default function FasalSalah() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pincode, setPincode] = useState(() => resolvePincode(user?.pincode))
  const [place, setPlace] = useState('')
  const [wx, setWx] = useState(null)
  const [reviewed, setReviewed] = useState(true)

  useEffect(() => { fetchSiteSetting('mausam_msp_content_reviewed').then((v) => setReviewed(v === true)).catch(() => {}) }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const p = await fetchPincode(pincode).catch(() => null)
      if (p?.village_town && alive) setPlace(p.village_town)
      const cell = await fetchWeatherCell(Number(p?.latitude ?? 24.045), Number(p?.longitude ?? 78.33)).catch(() => null)
      if (alive) setWx(cell)
    })()
    return () => { alive = false }
  }, [pincode])

  function changePincode() {
    const next = window.prompt(t('pincode_prompt'), pincode)
    if (next && /^\d{6}$/.test(next.trim())) { const v = next.trim(); savePincode(v); setPincode(v); setPlace('') }
  }

  const windows = useMemo(() => (wx ? actionWindows(wx.hourly, wx.daily) : null), [wx])
  const season = currentSeason()
  const seasonCrops = CROPS.filter((c) => c.season === season && c.slug !== 'lahsun')
  const otherCrops = CROPS.filter((c) => c.season !== season && c.slug !== 'lahsun')
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: t('fasal_h1'), description: t('fasal_intro_1') }

  const Card = (c, withVerdict) => (
    <div key={c.slug} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
      <div className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{cropName(c, lang)}</div>
      <p className="mt-1 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t(`cropadv_${c.slug}`)}</p>
      {withVerdict && windows && (
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>🌾 {t('aw_harvest')}: {t(STATUS_LABEL[windows.harvest.status])} · 💦 {t('aw_spray')}: {t(STATUS_LABEL[windows.spray.status])}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <JsonLd data={articleLd} />
      <div className="w-full space-y-5" style={{ padding: '16px var(--ks-gutter)', maxWidth: 960, margin: '0 auto' }}>
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{t('fasal_h1')}</h1>
        <PageExplainer title={t('page_explainer_title')} lines={[t('fasal_intro_1'), t('fasal_intro_2')]} />
        <LocationControl pincode={pincode} place={place} onChange={changePincode} />

        {/* cross-link back to /mausam */}
        <button type="button" onClick={() => navigate('/mausam')} className="inline-block text-[15px] font-bold" style={{ color: 'var(--ks-green)' }}>🌤 {t('fasal_see_mausam')} →</button>

        <section>
          <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('fasal_season_h')} — {t(SEASON_LABEL[season])}<ReviewTag reviewed={reviewed} /></h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{seasonCrops.map((c) => Card(c, true))}</div>
        </section>

        <section>
          <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('fasal_all_h')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{otherCrops.map((c) => Card(c, false))}</div>
        </section>
      </div>
    </div>
  )
}
