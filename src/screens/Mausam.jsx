// /mausam — location-keyed weather with action windows, season rainfall, glossary.
// Above-the-fold renders from one weather_cache_v2 read (no browser Open-Meteo).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Spinner } from '../components/ui'
import { weatherInfo } from '../lib/weather/weatherApi'
import { fetchWeatherCell, requestGridCell } from '../lib/weather/weatherApiV2'
import { actionWindows, imdClass, nextRain, STATUS_COLOR } from '../lib/weather/weatherRules'
import { fetchPincode } from '../lib/listings/listingsApi'
import { resolvePincode, savePincode, DEFAULT_PINCODE } from '../lib/listings/nearbyCounts'
import { fetchPageFaqs, fetchSiteSetting } from '../lib/pages/pagesApi'
import { CROPS, currentSeason, cropName } from '../content/crops'
import { PageExplainer, LocationControl, FaqAccordion, ShareWhatsApp, DailyUpdateSignup, TwoBar, ReviewTag, JsonLd } from '../components/pages/shared'

const IMD_URL = 'https://mausam.imd.gov.in'
const STATUS_LABEL = { ok: 'aw_ok', caution: 'aw_caution', stop: 'aw_stop' }
const dayHi = (dateStr, t) => t(`wday_${new Date(dateStr).getDay()}`)
const hourLabel = (iso) => { const d = new Date(iso); return `${d.getHours()}:00` }

export default function Mausam() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pincode, setPincode] = useState(() => resolvePincode(user?.pincode))
  const [place, setPlace] = useState('')
  const [wx, setWx] = useState(undefined)
  const [faqs, setFaqs] = useState([])
  const [reviewed, setReviewed] = useState(true)

  useEffect(() => {
    fetchPageFaqs('mausam').then(setFaqs).catch(() => {})
    fetchSiteSetting('mausam_msp_content_reviewed').then((v) => setReviewed(v === true)).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setWx(undefined)
    ;(async () => {
      const p = await fetchPincode(pincode).catch(() => null)
      const lat = p?.latitude ?? 24.045, lon = p?.longitude ?? 78.33
      if (p?.village_town && alive) setPlace(p.village_town)
      requestGridCell(Number(lat), Number(lon))
      const cell = await fetchWeatherCell(Number(lat), Number(lon)).catch(() => null)
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

  const loc = place || t('pincode_label') + ' ' + pincode
  const today = wx?.daily?.[0]
  const info = wx ? weatherInfo(wx.current_weathercode) : null
  const rain = wx ? nextRain(wx.hourly) : null
  const imd = today ? imdClass(today.precip_mm) : null

  // Live WhatsApp share text (< 300 chars)
  const shareText = useMemo(() => {
    if (!wx || !windows) return ''
    const d = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long' })
    const rainLine = rain ? `${t('mausam_rain_in')} ${rain.inHours}${t('hours_short')} ~${rain.mm}${t('mm_unit')}` : t('tf_rain_none')
    return `📍 ${place || pincode} ${t('nav_weather')} — ${d}\n🌤 ${Math.round(wx.current_temp)}°, ${t(info.key)} · ${rainLine}\n✅ ${t('aw_spray')}: ${t(STATUS_LABEL[windows.spray.status])} · ${t('aw_harvest')}: ${t(STATUS_LABEL[windows.harvest.status])}\n${t('daily_see')}: kissansahyog.com/mausam`
  }, [wx, windows, rain, info, place, pincode, t])

  const metaDesc = t('mausam_explain_1') + ' ' + t('mausam_explain_2')
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: `${place || pincode} ${t('nav_weather')}`, description: metaDesc, ...(wx?.fetched_at ? { dateModified: wx.fetched_at } : {}) }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <JsonLd data={articleLd} />
      <div className="w-full space-y-5" style={{ padding: '16px var(--ks-gutter)', maxWidth: 960, margin: '0 auto' }}>
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{t('mausam_h1_a')} {place || pincode} {t('mausam_h1_b')}</h1>

        {/* 1. PageExplainer */}
        <PageExplainer title={t('page_explainer_title')} lines={[t('mausam_explain_1'), t('mausam_explain_2'), t('mausam_explain_3'), t('mausam_explain_4')]} />

        {/* 2. LocationControl */}
        <LocationControl pincode={pincode} place={place} onChange={changePincode} />

        {wx === undefined ? <Spinner /> : !wx ? (
          <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('weather_unavailable')}</p>
        ) : (<>
          {/* 3. TodayCard */}
          <section style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '16px' }}>
            <div className="flex items-center gap-4">
              <span className="text-[46px] leading-none" aria-hidden="true">{info.icon}</span>
              <div>
                <div className="text-[34px] font-extrabold leading-none" style={{ color: 'var(--ks-ink)' }}>{Math.round(wx.current_temp)}°</div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t(info.key)}</div>
              </div>
              <div className="ml-auto text-right text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>
                <div>💧 {Math.round(wx.current_humidity)}%</div>
                <div>🌬 {Math.round(wx.current_wind)} {t('kmh')}</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg px-3 py-2 text-[15px] font-semibold" style={{ background: 'var(--ks-blue-tint)', color: 'var(--ks-blue)' }}>
              {rain ? `${t('mausam_rain_next')}: ${rain.inHours === 0 ? t('mausam_rain_now') : `${rain.inHours} ${t('hours_short')} ${t('mausam_rain_after')}`} ~${rain.mm} ${t('mm_unit')}` : t('mausam_no_rain_48')}
            </div>
            {imd && (
              <a href={IMD_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-bold" style={{ background: '#fff', border: `2px solid ${imd.color}`, color: imd.color }}>
                ● {t(`imd_${imd.level}`)} — {t('imd_not_official')} →
              </a>
            )}
          </section>

          {/* 4. ActionWindows */}
          <section>
            <h2 className="mb-2 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{t('mausam_actions_h')}<ReviewTag reviewed={reviewed} /></h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[['spray', 'aw_spray', '💦'], ['irrigation', 'aw_irrigation', '🚰'], ['harvest', 'aw_harvest', '🌾'], ['sowing', 'aw_sowing', '🌱']].map(([k, label, icon]) => {
                const w = windows[k]; const col = STATUS_COLOR[w.status]
                return (
                  <div key={k} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                    <div className="text-[22px]" aria-hidden="true">{icon}</div>
                    <div className="mt-1 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t(label)}</div>
                    <div className="mt-1 inline-block rounded-full px-2 py-0.5 text-[14px] font-bold" style={{ background: col.bg, color: col.fg }}>{t(STATUS_LABEL[w.status])}</div>
                    <div className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--ks-ink-3)' }}>{t(w.reasonKey)}</div>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('mausam_rules_by')}</p>
          </section>

          {/* 5. 48h hourly strip */}
          <section>
            <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_48h')}</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {wx.hourly.filter((_, i) => i % 3 === 0).map((h, i) => (
                <div key={i} className="flex shrink-0 flex-col items-center rounded-lg px-3 py-2 text-center" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', minWidth: 64 }}>
                  <span className="text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>{hourLabel(h.time)}</span>
                  <span className="text-[18px]" aria-hidden="true">{weatherInfo(0).icon && ''}{Math.round(h.temp)}°</span>
                  <span className="text-[12px]" style={{ color: 'var(--ks-blue)' }}>{Math.round((h.precip_mm || 0) * 10) / 10}{t('mm_unit')}</span>
                  <span className="text-[11px]" style={{ color: 'var(--ks-ink-3)' }}>🌬{Math.round(h.wind_kmh)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6. 7-day table */}
          <section>
            <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_7day')}</h2>
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
              <table className="w-full text-[14px]">
                <thead><tr style={{ background: 'var(--ks-bg-soft)' }}>
                  <th className="p-2 text-left">{t('col_day')}</th><th className="p-2"> </th><th className="p-2 text-right">{t('col_maxmin')}</th><th className="p-2 text-right">{t('col_rain')}</th><th className="p-2 text-right">🌬</th>
                </tr></thead>
                <tbody>
                  {wx.daily.slice(0, 7).map((d) => { const ii = weatherInfo(d.weathercode); const bad = d.precip_mm >= 64.5; return (
                    <tr key={d.date} style={{ borderTop: '1px solid var(--ks-border)' }}>
                      <td className="p-2 font-semibold" style={{ color: 'var(--ks-ink)' }}>{dayHi(d.date, t)}</td>
                      <td className="p-2 text-center" aria-hidden="true">{ii.icon}{bad && <span title={t('imd_yellow')}> ⚠️</span>}</td>
                      <td className="p-2 text-right">{Math.round(d.tmax)}° / {Math.round(d.tmin)}°</td>
                      <td className="p-2 text-right" style={{ color: 'var(--ks-blue)' }}>{Math.round(d.precip_mm)}{t('mm_unit')} · {d.precip_prob ?? 0}%</td>
                      <td className="p-2 text-right">{Math.round(d.wind_max)}</td>
                    </tr>) })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. per-crop advice */}
          <section>
            <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_crops_h')}<ReviewTag reviewed={reviewed} /></h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seasonCrops.map((c) => (
                <div key={c.slug} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                  <div className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{cropName(c, lang)}</div>
                  <p className="mt-1 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t(`cropadv_${c.slug}`)}</p>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>🌾 {t('aw_harvest')}: {t(STATUS_LABEL[windows.harvest.status])} · 💦 {t('aw_spray')}: {t(STATUS_LABEL[windows.spray.status])}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. season rainfall */}
          {wx.season_rain && (
            <section style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
              <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_season_rain')}</h2>
              <TwoBar aLabel={t('mausam_todate')} aValue={wx.season_rain.to_date_mm} bLabel={t('mausam_normal')} bValue={wx.season_rain.normal_mm} unit={t('mm_unit')} />
              {wx.season_rain.normal_mm != null && (
                <p className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>
                  {(() => { const diff = Math.round(((wx.season_rain.to_date_mm - wx.season_rain.normal_mm) / (wx.season_rain.normal_mm || 1)) * 100); return diff >= 0 ? `${t('mausam_rain_above').replace('{n}', Math.abs(diff))}` : `${t('mausam_rain_below').replace('{n}', Math.abs(diff))}` })()}
                </p>
              )}
            </section>
          )}

          {/* 9. 16-day outlook */}
          <section>
            <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_16day')} <span className="text-[14px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>({t('mausam_not_sure')})</span></h2>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {wx.daily.map((d) => (
                <div key={d.date} className="flex shrink-0 flex-col items-center rounded px-2 py-1 text-center" style={{ background: 'var(--ks-bg-soft)', minWidth: 46 }}>
                  <span className="text-[10px]" style={{ color: 'var(--ks-ink-3)' }}>{new Date(d.date).getDate()}</span>
                  <span aria-hidden="true">{weatherInfo(d.weathercode).icon}</span>
                  <span className="text-[10px]" style={{ color: 'var(--ks-blue)' }}>{Math.round(d.precip_mm)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 10. glossary */}
          <section style={{ background: 'var(--ks-bg-soft)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <h2 className="mb-2 text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('mausam_glossary_h')}</h2>
            <ul className="ml-5 list-disc space-y-1 text-[14px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
              <li>{t('gloss_mm')}</li><li>{t('gloss_yellow')}</li><li>{t('gloss_orange')}</li><li>{t('gloss_red')}</li><li>{t('gloss_derived')}</li><li>{t('gloss_trust')}</li>
            </ul>
          </section>

          {/* 12. Share */}
          <section><ShareWhatsApp text={shareText} /></section>

          {/* 13. Signup */}
          <DailyUpdateSignup sourcePage="mausam" pincode={pincode} heading={t('mausam_signup_h')} />
        </>)}

        {/* 11. FAQ */}
        <FaqAccordion faqs={faqs} />
      </div>
    </div>
  )
}
