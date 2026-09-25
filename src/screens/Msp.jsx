// /msp and /msp/:crop — today's mandi price vs MSP, trend, wait-vs-sell calculator,
// e-Uparjan/Bhavantar routes, per-crop pages. Never predicts prices.
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Spinner } from '../components/ui'
import { CROPS, cropBySlug, cropName, defaultCropSlug } from '../content/crops'
import { fetchMandiForCrop, fetchMandiHistory, fetchMandiMonthly, fetchMandiSnapshot } from '../lib/mandi/mandiApi'
import { fetchMsp } from '../lib/msp/mspApi'
import { fetchHomeFeed } from '../lib/listings/listingsApi'
import { fetchPageFaqs, fetchProcurement, fetchSiteSetting } from '../lib/pages/pagesApi'
import { PageExplainer, FaqAccordion, ShareWhatsApp, DailyUpdateSignup, TrendChart, MonthBars, JsonLd, ReviewTag } from '../components/pages/shared'

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
const MONTHS_HI = ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस']
const firstNum = (s) => { const m = String(s || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null }

export default function Msp() {
  const { crop: cropParam } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const slug = cropBySlug(cropParam) ? cropParam : defaultCropSlug()
  const crop = cropBySlug(slug)

  const [today, setToday] = useState(undefined) // { rows, date }
  const [mspRow, setMspRow] = useState(null)
  const [history, setHistory] = useState([])
  const [monthly, setMonthly] = useState([])
  const [faqs, setFaqs] = useState([])
  const [procurement, setProcurement] = useState([])
  const [storageRate, setStorageRate] = useState({ rate: 15, fromListings: false })
  const [trendDays, setTrendDays] = useState(30)
  const [qty, setQty] = useState(50)
  const [months, setMonths] = useState(3)
  const [reviewed, setReviewed] = useState(true)
  const [snapshot, setSnapshot] = useState(null)
  const [mspAll, setMspAll] = useState([])

  useEffect(() => {
    fetchPageFaqs('msp').then(setFaqs).catch(() => {})
    fetchProcurement().then(setProcurement).catch(() => {})
    fetchSiteSetting('mausam_msp_content_reviewed').then((v) => setReviewed(v === true)).catch(() => {})
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
    fetchMandiMonthly(crop.mandi_en).then((r) => alive && setMonthly(r)).catch(() => {})
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    let alive = true
    fetchMandiHistory(crop.mandi_en, trendDays).then((r) => alive && setHistory(r)).catch(() => {})
    return () => { alive = false }
  }, [slug, trendDays])

  const msp = mspRow ? Number(mspRow.msp_per_quintal) : null
  const medianToday = useMemo(() => {
    const p = (today?.rows || []).map((r) => Number(r.modal_price)).filter(Boolean).sort((a, b) => a - b)
    return p.length ? p[Math.floor(p.length / 2)] : null
  }, [today])

  const trendSentence = useMemo(() => {
    if (history.length < 2) return null
    const diff = history[history.length - 1].price - history[0].price
    const key = diff >= 0 ? 'msp_trend_up' : 'msp_trend_down'
    return t(key).replace('{n}', rs(Math.abs(diff))).replace('{d}', trendDays)
  }, [history, trendDays, t])

  // wait-vs-sell maths. diff = today's price − MSP (positive = above MSP).
  const diff = msp && medianToday != null ? medianToday - msp : null
  const belowMsp = diff != null && diff < 0
  const storageCost = storageRate.rate * months
  const totalShortfall = diff != null ? Math.abs(diff) * qty : null

  // past years by month (only if >= 12 distinct months)
  const monthBars = useMemo(() => {
    if (!monthly.length) return null
    const byMonth = {}
    for (const r of monthly) { const m = new Date(r.date).getMonth(); (byMonth[m] ||= []).push(r.price) }
    const distinct = Object.keys(byMonth).length
    if (distinct < 12) return null
    return Array.from({ length: 12 }, (_, m) => ({ label: MONTHS_HI[m], avg: byMonth[m] ? Math.round(byMonth[m].reduce((a, b) => a + b, 0) / byMonth[m].length) : 0 }))
  }, [monthly])

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
    if (medianToday == null) return ''
    const d = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long' })
    const rows = (today?.rows || []).slice(0, 2).map((r) => `${r.market} ${rs(r.modal_price)}`).join(' · ')
    const mspLine = msp ? `MSP ${rs(msp)} (${medianToday >= msp ? t('msp_above_short') : t('msp_below_short')} ${rs(Math.abs(msp - medianToday))})` : ''
    const trend = trendSentence ? `\n${trendSentence}` : ''
    return `🌾 ${cropName(crop, lang)} ${t('nav_mandi')} — ${d}\n${rows}\n${mspLine}${trend}\n${t('daily_see')}: kissansahyog.com/msp/${slug}`
  }, [medianToday, today, msp, trendSentence, crop, lang, slug, t])

  const datasetLd = { '@context': 'https://schema.org', '@type': 'Dataset', name: `${cropName(crop, 'en')} mandi prices — Sagar, MP`, description: `Daily modal mandi price for ${cropName(crop, 'en')} in Sagar district vs MSP.`, temporalCoverage: history.length ? `${history[0].date}/${history[history.length - 1].date}` : undefined, url: 'https://kissansahyog.com/msp/' + slug, creator: { '@type': 'Organization', name: 'Agmarknet / data.gov.in' } }
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: `${cropName(crop, lang)} ${t('nav_mandi')} — ${t('msp_sagar')}`, ...(today?.date ? { dateModified: today.date } : {}) }

  const H2 = ({ children }) => <h2 className="mb-2 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{children}</h2>

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <JsonLd data={articleLd} /><JsonLd data={datasetLd} />
      <div className="w-full space-y-5" style={{ padding: '16px var(--ks-gutter)', maxWidth: 960, margin: '0 auto' }}>
        <h1 className="text-[26px] font-extrabold md:text-[32px]" style={{ color: 'var(--ks-ink)' }}>{cropName(crop, lang)} {t('msp_h1')}</h1>

        {/* 1. explainer */}
        <PageExplainer title={t('page_explainer_title')} lines={[t('msp_explain_1'), t('msp_explain_2'), t('msp_explain_3'), t('msp_explain_4')]} />

        {/* 3a. all-crops snapshot table */}
        {snapshotRows && (
          <section>
            <H2>{t('msp_snapshot_h')}</H2>
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
              <table className="w-full text-[14px]">
                <thead><tr style={{ background: 'var(--ks-bg-soft)' }}><th className="p-2 text-left">{t('col_crop')}</th><th className="p-2 text-right">{t('col_modal')}</th><th className="p-2 text-right">MSP</th><th className="p-2 text-right"> </th></tr></thead>
                <tbody>
                  {snapshotRows.map(({ c, price, date, msp: m }) => { const above = m != null && price != null && price >= m; return (
                    <tr key={c.slug} onClick={() => navigate(`/msp/${c.slug}`)} className="cursor-pointer" style={{ borderTop: '1px solid var(--ks-border)', background: c.slug === slug ? 'var(--ks-bg-soft)' : undefined }}>
                      <td className="p-2 font-semibold" style={{ color: 'var(--ks-green)' }}>{cropName(c, lang)}</td>
                      <td className="p-2 text-right font-bold" style={{ color: 'var(--ks-ink)' }}>{price != null ? rs(price) : '—'}{date && date !== latestDate && <span className="ml-1 text-[11px]" style={{ color: 'var(--ks-ink-3)' }}>({date.slice(5)})</span>}</td>
                      <td className="p-2 text-right" style={{ color: 'var(--ks-ink-3)' }}>{m != null ? rs(m) : '—'}</td>
                      <td className="p-2 text-right">{m != null && price != null ? <span className="rounded px-1.5 py-0.5 text-[12px] font-bold" style={{ background: above ? 'var(--ks-green-tint)' : 'var(--ks-saffron-tint)', color: above ? 'var(--ks-green-dark)' : 'var(--ks-orange-dark)' }}>{above ? t('msp_above_short') : t('msp_below_short')}</span> : ''}</td>
                    </tr>) })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 2. crop selector */}
        <div className="flex flex-wrap gap-2">
          {CROPS.map((c) => (
            <button key={c.slug} type="button" onClick={() => navigate(`/msp/${c.slug}`)} className="rounded-full border px-3 py-1.5 text-[14px] font-bold"
              style={c.slug === slug ? { background: 'var(--ks-green)', color: '#fff', borderColor: 'var(--ks-green)' } : { background: '#fff', color: 'var(--ks-ink-2)', borderColor: 'var(--ks-border-strong)' }}>
              {cropName(c, lang)}
            </button>
          ))}
        </div>

        {/* 3. today's prices vs MSP */}
        <section>
          <H2>{t('msp_today_h')} {today?.date && <span className="text-[14px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>({t('msp_last_price')}: {today.date})</span>}</H2>
          {today === undefined ? <Spinner /> : !today.rows.length ? (
            <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>
          ) : (
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
              <table className="w-full text-[14px]">
                <thead><tr style={{ background: 'var(--ks-bg-soft)' }}><th className="p-2 text-left">{t('col_mandi')}</th><th className="p-2 text-right">{t('col_modal')}</th>{crop.msp_en && <th className="p-2 text-right">MSP {t('col_diff')}</th>}</tr></thead>
                <tbody>
                  {[...today.rows].sort((a, b) => Number(b.modal_price) - Number(a.modal_price)).map((r, i) => { const above = msp != null && Number(r.modal_price) >= msp; const d = msp != null ? Number(r.modal_price) - msp : null; return (
                    <tr key={i} style={{ borderTop: '1px solid var(--ks-border)' }}>
                      <td className="p-2 font-semibold" style={{ color: 'var(--ks-ink)' }}>{r.market}{r.arrivals_tonnes ? <span className="ml-1 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>· {r.arrivals_tonnes}{t('tonnes')}</span> : null}</td>
                      <td className="p-2 text-right font-extrabold" style={{ color: 'var(--ks-ink)' }}>{rs(r.modal_price)}</td>
                      {crop.msp_en && <td className="p-2 text-right"><span className="rounded px-1.5 py-0.5 text-[13px] font-bold" style={{ background: above ? 'var(--ks-green-tint)' : 'var(--ks-saffron-tint)', color: above ? 'var(--ks-green-dark)' : 'var(--ks-orange-dark)' }}>{d >= 0 ? '+' : ''}{rs(d)} · {above ? t('msp_above') : t('msp_below')}</span></td>}
                    </tr>) })}
                </tbody>
              </table>
            </div>
          )}
          {today && today.rows.length === 1 && <p className="mt-2 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_one_mandi').replace('{m}', today.rows[0].market)}</p>}
          {!crop.msp_en && <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_no_msp_crop')}</p>}
          {crop.msp_en && msp && <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>MSP {new Date().getFullYear()}: {rs(msp)}/{t('qtl')}</p>}
        </section>

        {/* 4. trend chart */}
        {crop.msp_en && (
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <H2>{t('msp_trend_h')}</H2>
              <div className="flex gap-1">{[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setTrendDays(d)} className="rounded px-2 py-1 text-[13px] font-bold" style={trendDays === d ? { background: 'var(--ks-green)', color: '#fff' } : { background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)' }}>{d}{t('days_short')}</button>)}</div>
            </div>
            {/* takeaway ABOVE the chart (3e) */}
            {trendSentence && <p className="mb-2 text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{trendSentence}</p>}
            <TrendChart series={history} mspValue={msp} ariaLabel={`${cropName(crop, lang)} ${t('msp_trend_h')}`} />
            {/* summary block BELOW with clearance so nothing overlaps the axis labels (3b) */}
            <div className="mt-4 space-y-1">
              {trendSentence && <p className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{trendSentence}</p>}
              {history.length > 0 && history.length < trendDays && (
                <p className="text-[13px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{t('msp_only_ndays').replace('{n}', history.length)}</p>
              )}
              {history.length > 0 && <p className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('data_from')} {history[0].date}</p>}
            </div>
          </section>
        )}

        {/* 5. wait-vs-sell calculator */}
        {crop.msp_en && (
          <section style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
            <H2>{t('msp_calc_h')}</H2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_calc_qty')}</span>
                <input inputMode="numeric" value={qty} onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} /></label>
              <label className="block"><span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('msp_calc_months')}</span>
                <input inputMode="numeric" value={months} onChange={(e) => setMonths(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} /></label>
            </div>
            {/* step-by-step labelled arithmetic (3f) */}
            {diff != null ? (
              <div className="mt-3 space-y-2 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
                <div>{t('msp_calc_shortfall')}: <b>{rs(Math.max(msp, medianToday))} − {rs(Math.min(msp, medianToday))} = {rs(Math.abs(diff))}/{t('qtl')} {belowMsp ? t('msp_below_short') : t('msp_above_short')}</b></div>
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
          </section>
        )}

        {/* 6. procurement centres */}
        <section>
          <H2>{t('msp_procurement_h')}<ReviewTag reviewed={reviewed} /></H2>
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
        </section>

        {/* 7. sold below MSP routes */}
        <section>
          <H2>{t('msp_below_h')}<ReviewTag reviewed={reviewed} /></H2>
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
        </section>

        {/* 8. past years */}
        {monthBars && (
          <section>
            <H2>{t('msp_pastyears_h')}</H2>
            <MonthBars months={monthBars} ariaLabel={t('msp_pastyears_h')} />
          </section>
        )}

        {/* 10. share */}
        <section><ShareWhatsApp text={shareText} /></section>

        {/* 11. signup */}
        <DailyUpdateSignup sourcePage="msp" pincode={resolvePincodeSafe()} heading={t('msp_signup_h')} />

        {/* 9. FAQ */}
        <FaqAccordion faqs={faqs} />
      </div>
    </div>
  )
}

function resolvePincodeSafe() {
  try { const v = localStorage.getItem('ks_pincode'); return v && /^\d{6}$/.test(v) ? v : '470117' } catch { return '470117' }
}
