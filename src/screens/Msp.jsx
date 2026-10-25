// /msp and /msp/:crop — today's mandi price vs MSP, trend, wait-vs-sell calculator,
// e-Uparjan/Bhavantar routes, per-crop pages. Never predicts prices.
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import RelatedBoxes from '../components/RelatedBoxes'
import WhatsAppJoin from '../components/WhatsAppJoin'
import BackButton from '../components/BackButton'
import { Spinner } from '../components/ui'
import { CROPS, cropBySlug, cropName, defaultCropSlug } from '../content/crops'
import { MONTHS_HI, MONTHS_SHORT_EN, MONTHS_FULL_HI, MONTHS_FULL_EN } from '../content/months'
import { fetchMandiForCrop, fetchMandiHistoryRows, fetchMandiSnapshot, fetchMandiMarkets, fetchMandiForMarket, fetchMandiMarketsWithDistrict, fetchMandiForMarkets } from '../lib/mandi/mandiApi'
import { marketDistanceKm } from '../content/mandiCoords'
import { windowInfo, windowStart, formatDay, formatDateFull } from '../lib/mandi/mspWindow'
import { basketSeries } from '../lib/mandi/basket'
import { fetchMonthlyHistory, monthOfYearAverages, harvestAverage, harvestByYear, gapVsAverage, latestMonth } from '../lib/mandi/history10y'
import { fetchMsp } from '../lib/msp/mspApi'
import { fetchHomeFeed } from '../lib/listings/listingsApi'
import { useUserLocation } from '../lib/location/LocationProvider'
import { fetchPageFaqs, fetchProcurement, fetchSiteSetting } from '../lib/pages/pagesApi'
import { PageExplainer, LocationControl, FaqAccordion, ShareWhatsApp, DailyUpdateSignup, MonthBars, JsonLd, PriceCell, StaleTag, priceStaleness, InfoTip } from '../components/pages/shared'
import TrendChart from '../components/pages/TrendChart'
import LastPriceBadge from '../components/pages/LastPriceBadge'
import Seo from '../components/layout/Seo'
import { PageShell } from '../components/layout'
import OfflineStamp from '../components/OfflineStamp'
import OfflineNotice from '../components/OfflineNotice'
import CollapsibleSection from '../components/CollapsibleSection'
import { useOfflineInfo } from '../lib/offline/useOffline'
import WhatsAppChannelCard from '../components/WhatsAppChannelCard'

// Batch 8B — resources behind the price table (app offline stamp / notice).
const MANDI_RES = ['mandi_prices', 'msp_prices']
// Batch 15B: the rabi crops that /fasal-salah/kam-pani covers (gram, lentil, mustard, wheat; barley has no /msp page).
const KAM_PANI_CROPS = ['chana', 'masoor', 'sarson', 'gehun']
const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
const firstNum = (s) => { const m = String(s || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null }

export default function Msp() {
  const { crop: cropParam } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const slug = cropBySlug(cropParam) ? cropParam : defaultCropSlug()
  const crop = cropBySlug(slug)

  // Batch 7L-1 — nearest-mandi ranking uses the shared location object. No location → no
  // centre → the tables fall back to price order (distance is a label here, never a filter).
  const { center } = useUserLocation()
  // Phase 3b — free mandi search (deliberately NOT geofenced).
  const [markets, setMarkets] = useState([])
  const [mandiQuery, setMandiQuery] = useState('')
  const [mandiPick, setMandiPick] = useState(null) // { market, modal_price, price_date }
  const [mandiSearching, setMandiSearching] = useState(false)

  // Phase 2 (0026) — फसल अनुसार / मंडी तुलना view toggle + comparison state.
  const [view, setView] = useState('crop') // 'crop' | 'compare'
  const [marketsDist, setMarketsDist] = useState([]) // [{market, district}]
  const [selectedMandis, setSelectedMandis] = useState([]) // up to 3 market names
  const [compareData, setCompareData] = useState({}) // `${commodity_en}||${market}` → {modal_price, price_date}
  const [pickWarn, setPickWarn] = useState(false)

  const [today, setToday] = useState(undefined) // { rows, date }
  const mandiOffline = useOfflineInfo(MANDI_RES)
  const [mspRow, setMspRow] = useState(null)
  const [trend90, setTrend90] = useState(null) // { rows (90 days, one per mandi and day), scope } — 7/30 are slices of it
  const [hist, setHist] = useState({ rows: [], scope: null }) // Batch 15A: 10 years of monthly Modal prices (mandi_monthly_history)
  const [faqs, setFaqs] = useState([])
  const [procurement, setProcurement] = useState([])
  const [storageRate, setStorageRate] = useState({ rate: 15, fromListings: false })
  const [trendDays, setTrendDays] = useState(30)
  const [qty, setQty] = useState(50)
  const [months, setMonths] = useState(3)
  const [snapshot, setSnapshot] = useState(null)
  const [mspAll, setMspAll] = useState([])

  useEffect(() => {
    fetchPageFaqs('msp').then(setFaqs).catch(() => {})
    fetchProcurement().then(setProcurement).catch(() => {})
    fetchMandiSnapshot().then(setSnapshot).catch(() => setSnapshot({}))
    fetchMsp().then((rows) => setMspAll(rows || [])).catch(() => {})
    // storage rate from active warehouse listings (median), fallback ₹15/qtl/month
    fetchHomeFeed({ category: 'warehouse', limit: 40 }).then((rows) => {
      const rates = (rows || []).map((r) => firstNum(r.details?.rate_amount || r.details?.rate || r.details?.price)).filter((n) => n && n > 0 && n < 500)
      if (rates.length) { rates.sort((a, b) => a - b); setStorageRate({ rate: rates[Math.floor(rates.length / 2)], fromListings: true }) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setToday(undefined)
    fetchMandiForCrop(crop.mandi_en).then((r) => alive && setToday(r)).catch(() => alive && setToday({ rows: [], date: null }))
    fetchMsp().then((rows) => { if (alive) setMspRow((rows || []).find((m) => m.crop_en === crop.msp_en) || null) }).catch(() => {})
    setHist({ rows: [], scope: null })
    fetchMonthlyHistory(crop.mandi_en).then((r) => alive && setHist(r)).catch(() => {})
    return () => { alive = false }
  }, [slug])

  // Batch 10E — one 90-day read per crop; the 7- and 30-day tabs are slices of it, so every
  // tab can show the real date range it covers before it is opened.
  // Batch 10F — the read keeps one row per mandi and day; each window gets its own stable-basket
  // series (src/lib/mandi/basket.js), so a day when only a few mandis reported can no longer fake a
  // rise or a fall. The chart, the trend sentence, the calculator and the WhatsApp text all use it.
  useEffect(() => {
    let alive = true
    setTrend90(null)
    fetchMandiHistoryRows(crop.mandi_en, 90).then((r) => alive && setTrend90(r)).catch(() => alive && setTrend90({ rows: [], scope: 'division' }))
    return () => { alive = false }
  }, [slug])
  const trendWins = useMemo(() => {
    if (!trend90) return null
    const out = {}
    for (const d of [7, 30, 90]) {
      const from = windowStart(d)
      const b = basketSeries(trend90.rows.filter((r) => r.price_date >= from))
      out[d] = { ...windowInfo(b.series, d, lang), few: b.few, skipped: b.skipped.length }
    }
    return out
  }, [trend90, lang])
  const win = trendWins ? trendWins[trendDays] : null
  const history = win ? win.series : []

  // Mandi-name list for the search box (Phase 3b) — from DISTINCT market.
  useEffect(() => { fetchMandiMarkets().then(setMarkets).catch(() => setMarkets([])) }, [])
  // Markets + district for the comparison picker (Phase 2, 0026).
  useEffect(() => { fetchMandiMarketsWithDistrict().then(setMarketsDist).catch(() => setMarketsDist([])) }, [])

  // Auto-nearest default (up to 3) when nothing is picked — reuses distance ranking.
  const autoNearest = useMemo(() => {
    if (!center || !marketsDist.length) return []
    return [...marketsDist]
      .map((m) => ({ ...m, km: marketDistanceKm(center, m.market, m.district) }))
      .filter((m) => m.km != null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5)
      .map((m) => m.market)
  }, [center, marketsDist])

  // What the comparison table actually shows: the user's selection, else auto-nearest.
  const effectiveMandis = selectedMandis.length ? selectedMandis : autoNearest

  // Load the latest price per (commodity, market) for the shown mandis.
  useEffect(() => {
    let alive = true
    if (view !== 'compare' || !effectiveMandis.length) { setCompareData({}); return }
    fetchMandiForMarkets(effectiveMandis).then((m) => alive && setCompareData(m)).catch(() => alive && setCompareData({}))
    return () => { alive = false }
  }, [view, effectiveMandis.join('|')])

  function toggleMandi(market) {
    setPickWarn(false)
    setSelectedMandis((prev) => {
      if (prev.includes(market)) return prev.filter((m) => m !== market)
      if (prev.length >= 5) { setPickWarn(true); return prev } // block the 6th (Phase 3a, cap 5)
      return [...prev, market]
    })
  }

  // Clear a previous search result when the crop changes.
  useEffect(() => { setMandiPick(null); setMandiQuery('') }, [slug])

  // Fuzzy candidates for the mandi search box (partial, case-insensitive).
  const mandiMatches = useMemo(() => {
    const q = mandiQuery.trim().toLowerCase()
    if (!q) return []
    return markets.filter((m) => m.toLowerCase().includes(q)).slice(0, 6)
  }, [markets, mandiQuery])

  async function pickMandi(market) {
    setMandiQuery(market); setMandiSearching(true)
    try {
      const row = await fetchMandiForMarket(crop.mandi_en, market)
      setMandiPick(row ? { ...row, notFound: false } : { market, notFound: true })
    } catch { setMandiPick({ market, notFound: true }) } finally { setMandiSearching(false) }
  }

  // Phase 3a — today's rows ranked by real distance from the farmer, nearest first.
  const rankedToday = useMemo(() => {
    const rows = (today?.rows || []).map((r) => ({ ...r, distanceKm: marketDistanceKm(center, r.market, r.district) }))
    return rows.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return Number(b.modal_price) - Number(a.modal_price)
      if (a.distanceKm == null) return 1
      if (b.distanceKm == null) return -1
      return a.distanceKm - b.distanceKm
    })
  }, [today, center])

  const msp = mspRow ? Number(mspRow.msp_per_quintal) : null
  const medianToday = useMemo(() => {
    const p = (today?.rows || []).map((r) => Number(r.modal_price)).filter(Boolean).sort((a, b) => a - b)
    return p.length ? p[Math.floor(p.length / 2)] : null
  }, [today])

  // Batch 10F — the calculator and the WhatsApp text use the same corrected series as the chart: its
  // latest point (date + number of mandis shown), falling back to today's plain median only when
  // there is no series at all.
  const latestPoint = history.length ? history[history.length - 1] : null
  const calcPrice = latestPoint ? latestPoint.price : medianToday

  const trendSentence = useMemo(() => {
    if (history.length < 2) return null
    const diff = history[history.length - 1].price - history[0].price
    const key = diff >= 0 ? 'msp_trend_up' : 'msp_trend_down'
    return t(key).replace('{n}', rs(Math.abs(diff))).replace('{d}', trendDays).replace('{range}', win.range)
  }, [history, win, trendDays, t])

  // wait-vs-sell maths. diff = the latest corrected price − MSP (positive = above MSP).
  const diff = msp && calcPrice != null ? calcPrice - msp : null
  const belowMsp = diff != null && diff < 0
  const storageCost = storageRate.rate * months
  const totalShortfall = diff != null ? Math.abs(diff) * qty : null

  // Batch 15A: past years by month = the average Modal price of each calendar month over the last 5 years (a month
  // with data in fewer than 3 of the 5 years is left out). Hidden when the history table has nothing (e.g. production
  // before its data is loaded): the page then looks exactly as it did before.
  const monthBars = useMemo(() => {
    if (!hist.rows.length) return null
    const avgs = monthOfYearAverages(hist.rows)
    if (!avgs.some((v) => v != null)) return null
    const names = lang === 'hi' ? MONTHS_HI : MONTHS_SHORT_EN
    const full = lang === 'hi' ? MONTHS_FULL_HI : MONTHS_FULL_EN
    const have = avgs.map((v, i) => ({ v, i })).filter((x) => x.v != null).sort((x, y) => x.v - y.v)
    const lo = have[0], hi = have[have.length - 1]
    return {
      bars: avgs.map((v, i) => ({ label: names[i], avg: v ?? 0 })),
      high: { m: full[hi.i], p: rs(hi.v) }, low: { m: full[lo.i], p: rs(lo.v) },
      until: latestMonth(hist.rows),
    }
  }, [hist, lang])
  const untilLabel = (ym) => (ym ? `${(lang === 'hi' ? MONTHS_FULL_HI : MONTHS_FULL_EN)[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : '')

  // Batch 15A: "5-year average vs today" = the average Modal price of the crop's harvest months over the last 5 years,
  // the yearly values, and today's price (the same corrected price the calculator uses) against that average.
  const harvest = useMemo(() => {
    const hm = crop.harvest_months
    if (!hist.rows.length || !hm) return null
    const avg = harvestAverage(hist.rows, hm)
    if (!avg) return null
    const full = lang === 'hi' ? MONTHS_FULL_HI : MONTHS_FULL_EN
    const monthsLabel = hm.length > 1 ? `${full[hm[0] - 1]}–${full[hm[hm.length - 1] - 1]}` : full[hm[0] - 1]
    return { ...avg, byYear: harvestByYear(hist.rows, hm), monthsLabel }
  }, [hist, crop, lang])
  const harvestGap = harvest ? gapVsAverage(calcPrice, harvest.avg) : null
  const scopeLabel = hist.scope === 'mp' ? t('msp_py_scope_mp') : t('msp_py_scope_division')

  // Newest price date among the compared mandis (badge of the mandi-compare view).
  const compareLatest = useMemo(() => { const ds = Object.values(compareData || {}).map((r) => r.price_date).filter(Boolean); return ds.length ? ds.sort().slice(-1)[0] : null }, [compareData])

  // all-crops snapshot (3a): latest price + MSP verdict per crop, today's data first.
  const latestDate = useMemo(() => { const ds = Object.values(snapshot || {}).map((r) => r.price_date); return ds.length ? ds.sort().slice(-1)[0] : null }, [snapshot])
  const snapshotRows = useMemo(() => {
    if (!snapshot) return null
    return CROPS.map((c) => {
      const s = snapshot[c.mandi_en]
      const mrow = c.msp_en ? mspAll.find((m) => m.crop_en === c.msp_en) : null
      return { c, price: s ? Number(s.modal_price) : null, date: s?.price_date || null, msp: mrow ? Number(mrow.msp_per_quintal) : null, hasToday: !!s && s.price_date === latestDate }
    }).sort((a, b) => (b.hasToday ? 1 : 0) - (a.hasToday ? 1 : 0))
  }, [snapshot, mspAll, latestDate])

  const shareText = useMemo(() => {
    if (calcPrice == null) return ''
    // Batch 10F: the date of the prices (not today's date), and MSP compared with the corrected price.
    const d = today?.date ? formatDateFull(today.date, lang) : ''
    const rows = (today?.rows || []).slice(0, 2).map((r) => `${r.market} ${rs(r.modal_price)}`).join(' · ')
    const mspLine = msp ? `MSP ${rs(msp)} (${calcPrice >= msp ? t('msp_above_short') : t('msp_below_short')} ${rs(Math.abs(msp - calcPrice))})` : ''
    const trend = trendSentence ? `\n${trendSentence}` : ''
    return `🌾 ${cropName(crop, lang)} ${t('nav_mandi')} — ${d}\n${rows}\n${mspLine}${trend}\n${t('daily_see')}: kissansahyog.com/msp/${slug}`
  }, [calcPrice, today, msp, trendSentence, crop, lang, slug, t])

  const datasetLd = { '@context': 'https://schema.org', '@type': 'Dataset', name: `${cropName(crop, 'en')} mandi prices — Sagar Division, MP`, description: `Daily modal mandi price for ${cropName(crop, 'en')} in Sagar Division (Sagar Sambhag) vs MSP.`, temporalCoverage: history.length ? `${history[0].date}/${history[history.length - 1].date}` : undefined, url: 'https://kissansahyog.com/msp/' + slug, creator: { '@type': 'Organization', name: 'Agmarknet / data.gov.in' } }
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: `${cropName(crop, lang)} ${t('nav_mandi')} — ${t('msp_sagar')}`, ...(today?.date ? { dateModified: today.date } : {}) }

  return (
    <PageShell width="wide" ready={today !== undefined}>
      <Seo
        title={(cropParam ? t('msp_seo_crop_title').replace('{crop}', cropName(crop, lang)) : t('msp_seo_hub_title')).slice(0, 70)}
        description={(cropParam ? t('msp_seo_crop_desc').replace('{crop}', cropName(crop, lang)) : t('msp_seo_hub_desc')).slice(0, 155)}
        path={cropParam ? `/msp/${slug}` : '/msp'}
        type="article"
        jsonLd={[articleLd, datasetLd]}
      />
      <div className="w-full space-y-5">
        {/* A per-crop page (/msp/:crop) falls back to the MSP hub; the hub falls back home. */}
        <BackButton fallback={cropParam ? '/msp' : '/'} />
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{cropName(crop, lang)} {t('msp_h1')}</h1>

        {/* 1. explainer — Batch 10F: every section below is a CollapsibleSection (page 'msp'). The first
            three (explainer, all crops, today's prices = the main data table) always start open; the
            rest start collapsed on phones (docs/review/batch10f/evidence/collapsible-defaults.md). */}
        <PageExplainer title={t('page_explainer_title')} lines={[t('msp_explain_1'), t('msp_explain_2'), t('msp_explain_3'), t('msp_explain_4')]} collapsible={{ page: 'msp', id: 'explainer', primary: true }} />

        {/* Shared location control (drives the nearby-mandi distance ranking below). */}
        <LocationControl />

        {/* 3a. all-crops snapshot table */}
        {snapshotRows && (
          <CollapsibleSection page="msp" id="snapshot" primary title={t('msp_snapshot_h')} after={<LastPriceBadge date={latestDate} testId="snapshot-price-badge" />}>
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
              <table className="w-full text-[14px]">
                <thead><tr style={{ background: 'var(--ks-bg-soft)' }}><th className="p-2 text-left">{t('col_crop')}</th><th className="p-2 text-right">{t('col_modal')}</th><th className="p-2 text-right">MSP</th><th className="p-2 text-right"> </th></tr></thead>
                <tbody>
                  {snapshotRows.map(({ c, price, date, msp: m }) => { const above = m != null && price != null && price >= m; return (
                    <tr key={c.slug} onClick={() => navigate(`/msp/${c.slug}`)} className="cursor-pointer" style={{ borderTop: '1px solid var(--ks-border)', background: c.slug === slug ? 'var(--ks-bg-soft)' : undefined }}>
                      <td className="p-2 font-semibold" style={{ color: 'var(--ks-green)' }}>{cropName(c, lang)}</td>
                      <td className="p-2 text-right font-bold" style={{ color: 'var(--ks-ink)' }}><PriceCell price={price} date={date} bold fmt={(iso) => formatDay(iso, lang)} /></td>
                      <td className="p-2 text-right" style={{ color: 'var(--ks-ink-3)' }}>{m != null ? rs(m) : '—'}</td>
                      <td className="p-2 text-right">{m != null && price != null ? <span className="rounded px-1.5 py-0.5 text-[12px] font-bold" style={{ background: above ? 'var(--ks-green-tint)' : 'var(--ks-saffron-tint)', color: above ? 'var(--ks-green-dark)' : 'var(--ks-orange-dark)' }}>{above ? t('msp_above_short') : t('msp_below_short')}</span> : ''}</td>
                    </tr>) })}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* View toggle (0026 Phase 2): फसल अनुसार / मंडी तुलना */}
        <div className="flex gap-2" role="tablist">
          {[['crop', 'msp_view_crop'], ['compare', 'msp_view_compare']].map(([v, k]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} data-testid={`view-${v}`} onClick={() => setView(v)}
              className="rounded-lg px-4 py-2 text-[15px] font-bold"
              style={view === v ? { background: 'var(--ks-green)', color: '#fff' } : { background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)', border: '1px solid var(--ks-border)' }}>
              {t(k)}
            </button>
          ))}
        </div>

        {/* 2. crop selector (crop-first view only) */}
        {view === 'crop' && (
        <div className="flex flex-wrap gap-2">
          {CROPS.map((c) => (
            <button key={c.slug} type="button" onClick={() => navigate(`/msp/${c.slug}`)} className="rounded-full border px-3 py-1.5 text-[14px] font-bold"
              style={c.slug === slug ? { background: 'var(--ks-green)', color: '#fff', borderColor: 'var(--ks-green)' } : { background: '#fff', color: 'var(--ks-ink-2)', borderColor: 'var(--ks-border-strong)' }}>
              {cropName(c, lang)}
            </button>
          ))}
        </div>
        )}

        {/* मंडी तुलना — up to 3 mandis compared across all commodities (0026 Phase 2) */}
        {view === 'compare' && (
          <CollapsibleSection page="msp" id="compare" primary title={t('msp_view_compare')} after={<LastPriceBadge date={compareLatest} testId="compare-price-badge" />}>
          <MandiCompare
            t={t} lang={lang} rs={rs}
            marketsDist={marketsDist} selectedMandis={selectedMandis} toggleMandi={toggleMandi}
            effectiveMandis={effectiveMandis} compareData={compareData} mspAll={mspAll}
            snapshot={snapshot} pickWarn={pickWarn} usingAuto={!selectedMandis.length}
          />
          </CollapsibleSection>
        )}

        {/* 3. today's prices vs MSP — ranked by real distance (Phase 3a) */}
        {view === 'crop' && (
        <CollapsibleSection page="msp" id="today" primary title={t('msp_today_h')} after={<LastPriceBadge date={today?.date} />}>

          {/* Phase 3b — free mandi search (distance-unrestricted). */}
          <div className="mb-3">
            <label className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('mandi_search_label')}</label>
            <input type="search" value={mandiQuery} onChange={(e) => { setMandiQuery(e.target.value); setMandiPick(null) }}
              placeholder={t('mandi_search_ph')} data-testid="mandi-search"
              className="w-full rounded-lg px-3 py-2 text-[16px]" style={{ border: '1px solid var(--ks-border-strong)' }} />
            {mandiMatches.length > 0 && !mandiPick && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {mandiMatches.map((m) => (
                  <button key={m} type="button" onClick={() => pickMandi(m)} className="rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{m}</button>
                ))}
              </div>
            )}
            {mandiSearching && <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>…</p>}
            {mandiPick && (
              <div className="mt-2 rounded-lg p-3" data-testid="mandi-search-result" style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)' }}>
                {mandiPick.notFound ? (
                  <p className="text-[14px]" style={{ color: 'var(--ks-orange-dark)' }}>{t('mandi_search_none')}</p>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{mandiPick.market}</span>
                    <span className="text-[15px] font-extrabold" style={{ color: 'var(--ks-green-dark)' }}><PriceCell price={mandiPick.modal_price} date={mandiPick.price_date} bold fmt={(iso) => formatDay(iso, lang)} /></span>
                  </div>
                )}
                {!mandiPick.notFound && <p className="mt-0.5 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>{t('mandi_last_price_on')}: {formatDateFull(mandiPick.price_date, lang)}</p>}
              </div>
            )}
          </div>

          <OfflineStamp resources={MANDI_RES} className="mb-2" />
          {today === undefined ? <Spinner /> : !today.rows.length ? (
            mandiOffline.failed ? <OfflineNotice ageMs={mandiOffline.tooOld ? mandiOffline.ageMs : null} /> : (
              <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>
            )
          ) : (
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
              <table className="w-full text-[14px]">
                <thead><tr style={{ background: 'var(--ks-bg-soft)' }}><th className="p-2 text-left">{t('col_mandi')}</th><th className="p-2 text-right">{t('col_distance')}</th><th className="p-2 text-right">{t('col_modal')}</th>{crop.msp_en && <th className="p-2 text-right">MSP {t('col_diff')}</th>}</tr></thead>
                <tbody>
                  {rankedToday.map((r, i) => { const above = msp != null && Number(r.modal_price) >= msp; const d = msp != null ? Number(r.modal_price) - msp : null; return (
                    <tr key={i} style={{ borderTop: '1px solid var(--ks-border)' }}>
                      <td className="p-2 font-semibold" style={{ color: 'var(--ks-ink)' }}>{r.market}{r.arrivals_tonnes ? <span className="ml-1 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>· {r.arrivals_tonnes}{t('tonnes')}</span> : null}</td>
                      <td className="p-2 text-right text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{r.distanceKm != null ? `${Math.round(r.distanceKm)} ${t('km_short')}` : '—'}</td>
                      <td className="p-2 text-right font-extrabold" style={{ color: 'var(--ks-ink)' }}><PriceCell price={r.modal_price} date={r.price_date || today.date} bold fmt={(iso) => formatDay(iso, lang)} /></td>
                      {crop.msp_en && <td className="p-2 text-right"><span className="rounded px-1.5 py-0.5 text-[13px] font-bold" style={{ background: above ? 'var(--ks-green-tint)' : 'var(--ks-saffron-tint)', color: above ? 'var(--ks-green-dark)' : 'var(--ks-orange-dark)' }}>{d >= 0 ? '+' : ''}{rs(d)} · {above ? t('msp_above') : t('msp_below')}</span></td>}
                    </tr>) })}
                </tbody>
              </table>
            </div>
          )}
          {today && today.rows.length === 1 && <p className="mt-2 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_one_mandi').replace('{m}', today.rows[0].market)}</p>}
          {!crop.msp_en && <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_no_msp_crop')}</p>}
          {crop.msp_en && msp && <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>MSP {new Date().getFullYear()}: {rs(msp)}/{t('qtl')}</p>}
          {KAM_PANI_CROPS.includes(slug) && <Link to="/fasal-salah/kam-pani" data-testid="msp-kam-pani-link" className="mt-1 inline-flex min-h-[44px] items-center text-[15px] font-bold underline" style={{ color: 'var(--ks-green)' }}>{t('kp_msp_link')} →</Link>}
        </CollapsibleSection>
        )}

        {/* 4. trend chart */}
        {view === 'crop' && crop.msp_en && (
          <CollapsibleSection page="msp" id="trend" testId="msp-trend" title={t('msp_trend_h')}>
            {/* Batch 10E — two-part tabs: "30 दिन" + the real date range of the prices in that window. */}
            <div className="mb-3 grid grid-cols-3 gap-1.5 sm:max-w-[480px]" role="group" aria-label={t('msp_trend_h')}>{[7, 30, 90].map((d) => { const w = trendWins?.[d]; const on = trendDays === d; return (
              <button key={d} type="button" data-trend-tab={d} aria-pressed={on} onClick={() => setTrendDays(d)} className="flex min-h-[44px] min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1 text-center leading-tight" style={on ? { background: 'var(--ks-green)', color: '#fff' } : { background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)' }}>
                <span className="text-[14px] font-bold">{t('msp_tab_days').replace('{d}', d)}</span>
                <span data-trend-range className="text-[12px] font-semibold" style={{ opacity: 0.9 }}>{w ? (w.n ? w.range : t('msp_tab_nodata')) : ' '}</span>
              </button>) })}</div>
            {/* takeaway ABOVE the chart (3e) */}
            {trendSentence && <p className="mb-2 text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{trendSentence}</p>}
            <TrendChart series={history} mspValue={msp} days={trendDays} cropLabel={`${cropName(crop, lang)} ${t('msp_trend_h')}`} rangeLabel={win?.range} few={!!win?.few} />
            {/* summary block BELOW with clearance so nothing overlaps the axis labels (3b) */}
            <div className="mt-4 space-y-1">
              {trendSentence && <p className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{trendSentence}</p>}
              {win && win.n > 0 && win.thin && (
                <p data-trend-note className="text-[13px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_only_ndays').replace('{n}', win.n)}</p>
              )}
              {win && win.skipped > 0 && <p data-trend-skipped className="text-[13px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_trend_skipped').replace('{n}', win.skipped)}</p>}
              {win && win.startsLate && <p data-trend-since className="text-[13px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_data_since').replace('{date}', formatDay(win.first, lang))}</p>}
              {trend90?.scope === 'all' && history.length > 0 && <p className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_trend_scope_all')}</p>}
              {history.length > 0 && <p className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('data_from')} {formatDateFull(history[0].date, lang)}</p>}
            </div>
          </CollapsibleSection>
        )}

        {/* 4b. Batch 15A: 5-year average vs today (past prices only; never a forecast) */}
        {view === 'crop' && harvest && (
          <CollapsibleSection page="msp" id="avg5" testId="msp-avg5" title={t('msp_avg_h')}>
            <div data-testid="msp-avg5-body" className="space-y-3">
              <p className="text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_avg_harvest_line').replace('{months}', harvest.monthsLabel)}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-3" style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)' }}>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_avg_label')}</div>
                  <div data-testid="msp-avg5-avg" className="text-[24px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{rs(harvest.avg)}</div>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)' }}>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{latestPoint ? t('msp_avg_today_on').replace('{date}', formatDay(latestPoint.date, lang)) : t('msp_avg_today')}</div>
                  <div data-testid="msp-avg5-today" className="text-[24px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{calcPrice != null ? rs(calcPrice) : '—'}</div>
                </div>
              </div>
              {calcPrice == null && <p className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_avg_today_none')}</p>}
              {harvestGap != null && (
                <p data-testid="msp-avg5-gap" className="text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>
                  {harvestGap > 0 ? t('msp_avg_gap_up').replace('{p}', harvestGap) : harvestGap < 0 ? t('msp_avg_gap_down').replace('{p}', Math.abs(harvestGap)) : t('msp_avg_gap_same')}
                </p>
              )}
              <div>
                <div className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_avg_by_year')}</div>
                <ul data-testid="msp-avg5-years" className="flex flex-wrap gap-1.5">
                  {harvest.byYear.map((y) => (
                    <li key={y.year} className="rounded-lg px-2.5 py-1.5 text-[14px]" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', color: 'var(--ks-ink)' }}>
                      <span style={{ color: 'var(--ks-ink-3)' }}>{y.year}</span> <b>{rs(y.price)}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <p data-testid="msp-avg5-note" className="text-[14px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_avg_note')}</p>
              <p className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_modal_def')}</p>
              <p className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{scopeLabel} · {t('msp_py_until').replace('{month}', untilLabel(latestMonth(hist.rows)))}. {t('msp_py_source')}</p>
            </div>
          </CollapsibleSection>
        )}

        {/* 5. wait-vs-sell calculator */}
        {view === 'crop' && crop.msp_en && (
          <CollapsibleSection page="msp" id="calc" title={t('msp_calc_h')} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_calc_qty')}</span>
                <input inputMode="numeric" value={qty} onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} /></label>
              <label className="block"><span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_calc_months')}</span>
                <input inputMode="numeric" value={months} onChange={(e) => setMonths(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} /></label>
            </div>
            {/* step-by-step labelled arithmetic (3f) */}
            {diff != null ? (
              <div className="mt-3 space-y-2 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
                {latestPoint && <div data-calc-price-from className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_calc_price_from').replace('{price}', rs(latestPoint.price)).replace('{date}', formatDay(latestPoint.date, lang)).replace('{n}', latestPoint.n ?? '—')}</div>}
                <div>{t('msp_calc_shortfall')}: <b>{rs(Math.max(msp, calcPrice))} − {rs(Math.min(msp, calcPrice))} = {rs(Math.abs(diff))}/{t('qtl')} {belowMsp ? t('msp_below_short') : t('msp_above_short')}</b></div>
                <div>{t('msp_calc_total')}: <b>{rs(Math.abs(diff))} × {qty} {t('qtl')} = {rs(totalShortfall)}</b></div>
                <div>{t('msp_calc_storage')}: <b>{rs(storageRate.rate)}/{t('qtl')}/{t('month_short')} × {months} {t('month_short')} = {rs(storageCost)}/{t('qtl')}</b>{!storageRate.fromListings && <span className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}> ({t('msp_calc_est')})</span>}</div>
                {belowMsp
                  ? <div>{t('msp_calc_breakeven')}: <b>{rs(Math.abs(diff))} + {rs(storageCost)} = {rs(Math.abs(diff) + storageCost)}/{t('qtl')}</b></div>
                  : <div>{t('msp_calc_above_note')} <b>{rs(storageCost)}/{t('qtl')}</b></div>}
              </div>
            ) : <p className="mt-3 text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>}
            <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_calc_trend_note').replace('{d}', trendDays)}</p>
            <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_calc_disclaimer')}</p>
            <button type="button" onClick={() => navigate('/browse?cat=warehouse')} className="mt-2 rounded-lg px-4 py-2 text-[14px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t('msp_calc_godown')} →</button>
          </CollapsibleSection>
        )}

        {/* 6. procurement centres */}
        <CollapsibleSection page="msp" id="procurement" title={t('msp_procurement_h')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {procurement.map((p) => (
              <div key={p.id} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
                <div className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{p.name_hi}</div>
                {p.notes_hi && <p className="mt-1 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{p.notes_hi}</p>}
                <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_dates')}: {p.registration_open || t('msp_dates_soon')}</p>
                {p.portal_url && <a href={p.portal_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{p.portal_url.replace('https://', '')} →</a>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_euparjan_steps')}</p>
        </CollapsibleSection>

        {/* 7. sold below MSP routes */}
        <CollapsibleSection page="msp" id="below" title={t('msp_below_h')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => navigate('/yojana/bhavantar')} className="text-left" style={{ background: 'var(--ks-green-tint)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
              <div className="text-[16px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>{t('msp_bhavantar_t')}</div>
              <p className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_bhavantar_d')}</p>
              <span className="mt-1 inline-block text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('scheme_view')} →</span>
            </button>
            <button type="button" onClick={() => navigate('/yojana/pm-aasha')} className="text-left" style={{ background: 'var(--ks-green-tint)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
              <div className="text-[16px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>PM-AASHA</div>
              <p className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_aasha_d')}</p>
              <span className="mt-1 inline-block text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('scheme_view')} →</span>
            </button>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_complaint')}</p>
        </CollapsibleSection>

        {/* 8. past years */}
        {monthBars && (
          <CollapsibleSection page="msp" id="pastyears" title={t('msp_pastyears_h')}>
            <div data-testid="msp-pastyears-body">
              <MonthBars months={monthBars.bars} ariaLabel={t('msp_pastyears_h')} />
              <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>
                {t('msp_py_high_low').replace('{hi_m}', monthBars.high.m).replace('{hi_p}', monthBars.high.p).replace('{lo_m}', monthBars.low.m).replace('{lo_p}', monthBars.low.p)}
              </p>
              <p className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_modal_def')}</p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{scopeLabel} · {t('msp_py_until').replace('{month}', untilLabel(monthBars.until))}. {t('msp_py_source')}</p>
              {hist.scope === 'mp' && <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_py_scope_mp_note')}</p>}
            </div>
          </CollapsibleSection>
        )}

        {/* 10. share */}
        <section><ShareWhatsApp text={shareText} /></section>

        {/* 11. signup */}
        <DailyUpdateSignup sourcePage="msp" heading={t('msp_signup_h')} />

        {/* 9. FAQ */}
        <FaqAccordion faqs={faqs} collapsible={{ page: 'msp', id: 'faq' }} />

        <WhatsAppJoin variant="box" src="msp" />
        <WhatsAppChannelCard variant="inline" textKey="wa_ch_line_prices" />
        <RelatedBoxes page="msp" />
      </div>
    </PageShell>
  )
}

// मंडी तुलना (0027) — compare up to 5 mandis across every commodity. Rows = commodities,
// columns = the shown mandis + MSP; best price per row highlighted green when 2+ mandis are
// shown. An empty cell whose commodity is priced at ANOTHER mandi shows a "निकटतम भाव" hint
// (2b) instead of a bare dash; commodities absent everywhere get an honest note (2c).
// Table-only horizontal scroll; commodity column is sticky.
function MandiCompare({ t, lang, rs, marketsDist, selectedMandis, toggleMandi, effectiveMandis, compareData, mspAll, snapshot, pickWarn, usingAuto }) {
  const mspFor = (c) => { const m = c.msp_en ? mspAll.find((x) => x.crop_en === c.msp_en) : null; return m ? Number(m.msp_per_quintal) : null }
  const cell = (c, market) => compareData[`${c.mandi_en}||${market}`] || null
  const ddmm = (d) => (d ? formatDay(d, lang) : '')
  // Best price for a commodity ANYWHERE (across all mandis), for the cross-mandi hint.
  const bestElsewhere = (c) => snapshot?.[c.mandi_en] || null
  const snapshotReady = snapshot && Object.keys(snapshot).length > 0
  // Commodities not reported by ANY mandi (genuinely absent) — honest note (2c).
  const absent = snapshotReady ? CROPS.filter((c) => !snapshot[c.mandi_en]) : []
  const stickyBg = 'var(--ks-card)'
  return (
    <section className="space-y-3" data-testid="mandi-compare">
      {/* Mandi picker (max 5). */}
      <div>
        <p className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_compare_pick')}</p>
        <div className="flex flex-wrap gap-1.5">
          {marketsDist.map(({ market }) => {
            const on = selectedMandis.includes(market)
            return (
              <button key={market} type="button" onClick={() => toggleMandi(market)} data-testid="compare-chip"
                className="rounded-full px-3 py-1 text-[13px] font-semibold"
                style={on ? { background: 'var(--ks-green)', color: '#fff' } : { background: '#fff', color: 'var(--ks-ink-2)', border: '1px solid var(--ks-border-strong)' }}>
                {on ? '✓ ' : ''}{market}
              </button>
            )
          })}
        </div>
        {pickWarn && <p className="mt-1 text-[13px] font-semibold" data-testid="compare-max-warn" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_compare_max')}</p>}
        {usingAuto && effectiveMandis.length > 0 && <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_compare_auto')}</p>}
      </div>

      {/* Comparison table — table-only horizontal scroll, sticky commodity column. */}
      {effectiveMandis.length === 0 ? (
        <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
          <table className="text-[13px]" style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--ks-bg-soft)' }}>
                <th className="sticky left-0 z-10 p-2 text-left" style={{ background: 'var(--ks-bg-soft)', minWidth: 84 }}>{t('col_crop')}</th>
                {effectiveMandis.map((m) => <th key={m} className="p-2 text-right align-bottom" style={{ minWidth: 82 }}>{m}</th>)}
                <th className="p-2 text-right" style={{ minWidth: 60 }}>MSP</th>
              </tr>
            </thead>
            <tbody>
              {CROPS.map((c) => {
                const prices = effectiveMandis.map((m) => { const cel = cell(c, m); return cel ? cel.modal_price : null })
                const maxP = effectiveMandis.length >= 2 ? Math.max(...prices.filter((p) => p != null), -Infinity) : -Infinity
                const alt = bestElsewhere(c)
                return (
                  <tr key={c.slug} style={{ borderTop: '1px solid var(--ks-border)' }}>
                    <td className="sticky left-0 z-10 p-2 font-semibold" style={{ background: stickyBg, color: 'var(--ks-green)', minWidth: 84 }}>{cropName(c, lang)}</td>
                    {effectiveMandis.map((m) => {
                      const cel = cell(c, m)
                      const best = cel && cel.modal_price === maxP && maxP > -Infinity
                      return (
                        <td key={m} className="p-2 text-right font-bold" data-testid={best ? 'compare-best' : undefined}
                          style={{ color: 'var(--ks-ink)', background: best ? 'var(--ks-green-tint)' : undefined }}>
                          {cel
                            ? <PriceCell price={cel.modal_price} date={cel.price_date} fmt={(iso) => formatDay(iso, lang)} />
                            : alt
                              ? <span data-testid="cross-mandi-hint" style={{ color: 'var(--ks-ink-3)', fontWeight: 400 }}>—<InfoTip label={`${t('mandi_hint_elsewhere')} ${alt.market} ${rs(alt.modal_price)} (${ddmm(alt.price_date)})`} label_en={`${t('mandi_hint_elsewhere')} ${alt.market} ${rs(alt.modal_price)} (${ddmm(alt.price_date)})`} /></span>
                              : <PriceCell price={null} />}
                        </td>
                      )
                    })}
                    <td className="p-2 text-right" style={{ color: 'var(--ks-ink-3)' }}>{mspFor(c) != null ? rs(mspFor(c)) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Honest data-availability note (2c) — commodities absent from every mandi. */}
      {absent.length > 0 && (
        <p className="text-[13px]" data-testid="absent-note" style={{ color: 'var(--ks-ink-3)' }}>
          {t('mandi_absent_note').replace('{crops}', absent.map((c) => cropName(c, lang)).join(', '))}
        </p>
      )}
    </section>
  )
}
