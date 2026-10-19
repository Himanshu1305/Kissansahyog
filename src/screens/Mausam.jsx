// /mausam — location-keyed weather with action windows, season rainfall, glossary.
// Above-the-fold renders from one weather_cache_v2 read (no browser Open-Meteo).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell } from '../components/layout'
import RelatedBoxes from '../components/RelatedBoxes'
import WhatsAppJoin from '../components/WhatsAppJoin'
import { Spinner } from '../components/ui'
import { weatherInfo } from '../lib/weather/weatherApi'
import { fetchWeatherCell, requestGridCell } from '../lib/weather/weatherApiV2'
import { actionWindows, imdClass, nextRain, STATUS_COLOR } from '../lib/weather/weatherRules'
import { useUserLocation } from '../lib/location/LocationProvider'
import { fetchPageFaqs } from '../lib/pages/pagesApi'
import { PageExplainer, LocationControl, FaqAccordion, ShareWhatsApp, DailyUpdateSignup, TwoBar, JsonLd, InfoTip } from '../components/pages/shared'
import OfflineStamp from '../components/OfflineStamp'
import OfflineNotice from '../components/OfflineNotice'
import { useOfflineInfo } from '../lib/offline/useOffline'
import CollapsibleSection from '../components/CollapsibleSection'

const IMD_URL = 'https://mausam.imd.gov.in'
const STATUS_LABEL = { ok: 'aw_ok', caution: 'aw_caution', stop: 'aw_stop' }
const dayHi = (dateStr, t) => t(`wday_${new Date(dateStr).getDay()}`)
const hourLabel = (iso) => { const d = new Date(iso); return `${d.getHours()}:00` }
// Batch 8B — the resources behind the forecast (for the app's offline stamp / notice).
const WX_RES = ['weather_cache_v2', 'api.open-meteo.com']

export default function Mausam() {
  const { t } = useLang()
  const navigate = useNavigate()
  // Batch 7L-1 — weather is for the shared location only; with none set the prompt card shows instead.
  const { location } = useUserLocation()
  const place = location?.label || ''
  const wxOffline = useOfflineInfo(WX_RES)
  const [wx, setWx] = useState(undefined)
  const [faqs, setFaqs] = useState([])
  // Batch 10F: the prerender waits for the FAQ list (it was sometimes snapshotted before the list had
  // loaded, so /mausam's FAQ and its FAQPage JSON-LD went missing from the HTML). Visitors see no change.
  const [faqsDone, setFaqsDone] = useState(false)

  useEffect(() => {
    fetchPageFaqs('mausam').then(setFaqs).catch(() => {}).finally(() => setFaqsDone(true))
  }, [])

  const lat = location?.lat ?? null, lon = location?.lng ?? null
  useEffect(() => {
    let alive = true
    if (lat == null || lon == null) { setWx(null); return }
    setWx(undefined)
    ;(async () => {
      requestGridCell(lat, lon)
      const cell = await fetchWeatherCell(lat, lon).catch(() => null)
      if (alive) setWx(cell)
    })()
    return () => { alive = false }
  }, [lat, lon])

  const windows = useMemo(() => (wx ? actionWindows(wx.hourly, wx.daily) : null), [wx])

  const today = wx?.daily?.[0]
  const info = wx ? weatherInfo(wx.current_weathercode) : null
  const rain = wx ? nextRain(wx.hourly) : null
  const imd = today ? imdClass(today.precip_mm) : null

  // Live WhatsApp share text (< 300 chars)
  const shareText = useMemo(() => {
    if (!wx || !windows) return ''
    const d = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long' })
    const rainLine = rain ? `${t('mausam_rain_in')} ${rain.inHours}${t('hours_short')} ~${rain.mm}${t('mm_unit')}` : t('tf_rain_none')
    return `📍 ${place} ${t('nav_weather')} — ${d}\n🌤 ${Math.round(wx.current_temp)}°, ${t(info.key)} · ${rainLine}\n✅ ${t('aw_spray')}: ${t(STATUS_LABEL[windows.spray.status])} · ${t('aw_harvest')}: ${t(STATUS_LABEL[windows.harvest.status])}\n${t('daily_see')}: kissansahyog.com/mausam`
  }, [wx, windows, rain, info, place, t])

  const metaDesc = t('mausam_explain_1') + ' ' + t('mausam_explain_2')
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: `${place} ${t('nav_weather')}`.trim(), description: metaDesc, ...(wx?.fetched_at ? { dateModified: wx.fetched_at } : {}) }

  return (
    <PageShell width="wide" ready={faqsDone}>
      <JsonLd data={articleLd} />
      <div className="w-full space-y-5">
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{place || t('loc_your_location')} {t('mausam_h1_b')}</h1>

        {/* 1. PageExplainer */}
        {/* Batch 10F: sections with a heading are CollapsibleSections (page 'mausam'). The first three
            (explainer, action windows, 48 h) and the 7-day table always start open; the rest start
            collapsed on phones (docs/review/batch10f/evidence/collapsible-defaults.md). */}
        <PageExplainer title={t('page_explainer_title')} lines={[t('mausam_explain_1'), t('mausam_explain_2'), t('mausam_explain_3'), t('mausam_explain_4')]} collapsible={{ page: 'mausam', id: 'explainer', primary: true }} />

        {/* 2. LocationControl */}
        <LocationControl />

        {!location ? null : wx === undefined ? <Spinner /> : !wx ? (
          // App only: offline with no usable saved forecast → say so, with "try again"; a saved
          // forecast older than the policy allows is not shown, only its age.
          wxOffline.tooOld ? <OfflineNotice ageMs={wxOffline.ageMs} /> : wxOffline.failed ? <OfflineNotice /> : (
            <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('weather_unavailable')}</p>
          )
        ) : (<>
          <OfflineStamp resources={WX_RES} />
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
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[14px] font-bold" style={{ background: '#fff', border: `2px solid ${imd.color}`, color: imd.color }}>
                  ● {t(`imd_${imd.level}`)}
                  <InfoTip label={t('imd_tip')} />
                </span>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('imd_badge_desc')}</p>
                <a href={IMD_URL} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-[14px] font-bold" style={{ color: 'var(--ks-blue)' }}>{t('imd_official_cta')} →</a>
              </div>
            )}
          </section>

          {/* 4. ActionWindows */}
          <CollapsibleSection page="mausam" id="actions" primary title={<>{t('mausam_actions_h')}<InfoTip label={t('verdict_tip')} /></>}>
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
          </CollapsibleSection>

          {/* 5. 48h hourly strip */}
          <CollapsibleSection page="mausam" id="hours48" primary h2Class="text-[20px] font-bold" title={<>{t('mausam_48h')}<InfoTip label={t('rainprob_tip')} /></>}>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {wx.hourly.filter((_, i) => i % 3 === 0).map((h, i) => (
                <div key={i} className="flex shrink-0 flex-col items-center rounded-lg px-3 py-2 text-center" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', minWidth: 64 }}>
                  <span className="text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>{hourLabel(h.time)}</span>
                  <span className="text-[18px]">{Math.round(h.temp)}°</span>
                  <span className="text-[12px]" style={{ color: 'var(--ks-blue)' }}>{Math.round((h.precip_mm || 0) * 10) / 10}{t('mm_unit')}</span>
                  {h.precip_prob != null && <span className="text-[11px]" style={{ color: 'var(--ks-blue)' }}>💧{h.precip_prob}%</span>}
                  <span className="text-[11px]" style={{ color: 'var(--ks-ink-3)' }}>🌬{Math.round(h.wind_kmh)}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 6. 7-day table */}
          <CollapsibleSection page="mausam" id="week7" primary h2Class="text-[20px] font-bold" title={t('mausam_7day')}>
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
          </CollapsibleSection>

          {/* 7. crop-advice teaser (full content moved to /fasal-salah) */}
          <button type="button" onClick={() => navigate('/fasal-salah')} className="flex w-full items-center justify-between gap-3 text-left" style={{ background: 'var(--ks-green-tint)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <span>
              <span className="block text-[17px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>🌱 {t('teaser_crops_q')}</span>
              <span className="block text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('teaser_crops_sub')}</span>
            </span>
            <span className="shrink-0 text-[15px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('teaser_crops_cta')} →</span>
          </button>

          {/* 8. season rainfall */}
          {wx.season_rain && (
            <CollapsibleSection page="mausam" id="season" h2Class="text-[20px] font-bold" title={t('mausam_season_rain')} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
              <TwoBar aLabel={t('mausam_todate')} aValue={wx.season_rain.to_date_mm} bLabel={t('mausam_normal')} bValue={wx.season_rain.normal_mm} unit={t('mm_unit')} />
              {wx.season_rain.normal_mm != null && (
                <p className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>
                  {(() => { const diff = Math.round(((wx.season_rain.to_date_mm - wx.season_rain.normal_mm) / (wx.season_rain.normal_mm || 1)) * 100); return diff >= 0 ? `${t('mausam_rain_above').replace('{n}', Math.abs(diff))}` : `${t('mausam_rain_below').replace('{n}', Math.abs(diff))}` })()}
                </p>
              )}
              <p className="mt-2 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>{t('src_season')}</p>
            </CollapsibleSection>
          )}

          {/* 9. 16-day outlook */}
          <CollapsibleSection page="mausam" id="days16" h2Class="text-[20px] font-bold" title={<>{t('mausam_16day')} <span className="text-[14px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>({t('mausam_not_sure')})</span></>}>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {wx.daily.map((d) => (
                <div key={d.date} className="flex shrink-0 flex-col items-center rounded px-2 py-1 text-center" style={{ background: 'var(--ks-bg-soft)', minWidth: 46 }}>
                  <span className="text-[10px]" style={{ color: 'var(--ks-ink-3)' }}>{new Date(d.date).getDate()}</span>
                  <span aria-hidden="true">{weatherInfo(d.weathercode).icon}</span>
                  <span className="text-[10px]" style={{ color: 'var(--ks-blue)' }}>{Math.round(d.precip_mm)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>{t('src_16day')}</p>
          </CollapsibleSection>

          {/* 10. glossary */}
          <CollapsibleSection page="mausam" id="glossary" h2Class="text-[20px] font-bold" title={t('mausam_glossary_h')} style={{ background: 'var(--ks-bg-soft)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <ul className="ml-5 list-disc space-y-1 text-[14px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
              <li>{t('gloss_mm')}</li><li>{t('gloss_yellow')}</li><li>{t('gloss_orange')}</li><li>{t('gloss_red')}</li><li>{t('gloss_derived')}</li><li>{t('gloss_trust')}</li>
            </ul>
          </CollapsibleSection>

          {/* 12. Share */}
          <section><ShareWhatsApp text={shareText} /></section>

          {/* 13. Signup */}
          <DailyUpdateSignup sourcePage="mausam" heading={t('mausam_signup_h')} />
        </>)}

        {/* 11. FAQ */}
        <FaqAccordion faqs={faqs} collapsible={{ page: 'mausam', id: 'faq' }} />

        <WhatsAppJoin variant="box" src="mausam" />
        <RelatedBoxes page="mausam" />
      </div>
    </PageShell>
  )
}
