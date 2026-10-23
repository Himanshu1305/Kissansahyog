// /fasal-salah/kam-pani — "कम पानी में कौन-सी फसल" (Batch 15B). Static, sourced advice (src/content/kamPani.js) plus
// today's Sagar-mandi price, the 5-year harvest-time average (Batch 15A table) and the MSP of 2027-28.
// All five sections are in the DOM at once (anchor chips only scroll). Prices load after first paint; if they fail the
// static content still shows. Never predicts a price, never gives a dose or a seed rate.
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import BackButton from '../components/BackButton'
import Seo from '../components/layout/Seo'
import { PageShell } from '../components/layout'
import { marketLabel } from '../lib/mandi/marketNames'
import { fetchAllCropData } from '../lib/kamPani/data'
import { recommendForWater, waterTitle, incomeLines, gapPercent, sowingBanner, rainBanner } from '../lib/kamPani/logic'
import {
  KP_CROPS, MSP_2027_28, SOURCES, WATER_NOTE, GOV_CARDS, GOV_NOTE, LATE_CARDS, WET_CARDS, WET_NOTE, SAVE_CARDS,
  IRRIGATION, PAGE, LABELS, GRAM_UPSIDE_Q, LAST_CHECKED,
} from '../content/kamPani'

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
const TONE = { g: 'var(--ks-green)', a: 'var(--ks-orange-dark)', r: '#57534e' }
const H2 = 'text-[20px] font-bold'
const SCROLL_MARGIN = { scrollMarginTop: '84px' }


const useL = () => { const { lang } = useLang(); return (o) => (o && (o[lang] || o.hi)) || '' }

function ReviewTag({ reviewed }) {
  const { t } = useLang()
  if (reviewed) return null
  return <span data-testid="kp-under-review" className="ml-1 inline-block rounded px-2 py-0.5 text-[12px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)', border: '1px solid var(--ks-saffron)' }}>{t('under_review')}</span>
}
function Src({ ids }) {
  const L = useL()
  return (
    <span className="mt-1 block text-[12.5px]" style={{ color: 'var(--ks-ink-3)' }}>
      {(ids || []).map((id, i) => <span key={id}>{i ? '; ' : ''}{L(SOURCES[id])}</span>)}
    </span>
  )
}
function Stats({ stats }) {
  const L = useL()
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {stats.map((s, i) => (
        <div key={i} className="rounded-lg px-1 py-2 text-center" style={{ background: 'var(--ks-bg-soft)' }}>
          <b className="block text-[19px]" style={{ color: s.tone === 'g' ? 'var(--ks-green-dark)' : '#991b1b' }}>{s.v}</b>
          <span className="block text-[12px] leading-tight" style={{ color: 'var(--ks-ink-3)' }}>{L(s.label)}</span>
        </div>
      ))}
    </div>
  )
}

// A native <details> card. The farm-pond card opens itself when the URL hash points at it.
function Card({ card }) {
  const L = useL()
  const { hash } = useLocation()
  const wantOpen = !!card.anchor && hash === `#${card.anchor}`
  const [open, setOpen] = useState(!!card.open || wantOpen)
  useEffect(() => { if (wantOpen) setOpen(true) }, [wantOpen])
  return (
    <details id={card.anchor} open={open} onToggle={(e) => setOpen(e.currentTarget.open)} data-testid={`kp-card-${card.id}`} className="mb-2.5 rounded-xl" style={{ ...SCROLL_MARGIN, background: 'var(--ks-card)', border: '1px solid var(--ks-border)' }}>
      <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 px-3 py-2.5 text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>
        <span>{L(card.title)}<ReviewTag reviewed={card.reviewed} /></span>
      </summary>
      <div className="px-3.5 pb-3 text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>
        <ul className="my-1.5 list-disc space-y-1 pl-5">{card.lines.map((ln, i) => <li key={i}>{L(ln)}</li>)}</ul>
        {card.pending && <p className="mt-2 rounded-lg px-2.5 py-2 text-[14px]" style={{ background: 'var(--ks-saffron-tint)', border: '1px dashed var(--ks-saffron)', color: 'var(--ks-orange-dark)' }}>{L(card.pending)}</p>}
        {card.link && <Link to={card.link.to} data-testid="kp-farm-pond-link" className="mt-2 inline-flex min-h-[44px] items-center text-[15px] font-bold underline" style={{ color: 'var(--ks-blue)' }}>{L(card.link.text)}</Link>}
        <Src ids={card.sources} />
      </div>
    </details>
  )
}

function Bar({ label, value, max, color }) {
  return (
    <div className="my-1 grid items-center gap-2 text-[13px]" style={{ gridTemplateColumns: '92px 1fr', color: 'var(--ks-ink-3)' }}>
      <span>{label}</span>
      <div className="h-[22px] rounded-md" style={{ background: 'var(--ks-bg-soft)' }}>
        <div className="flex h-[22px] items-center whitespace-nowrap rounded-md pl-1.5 text-[12.5px] font-bold text-white" style={{ width: `${Math.max(8, Math.round((value / max) * 100))}%`, background: color }}>{rs(value)}</div>
      </div>
    </div>
  )
}

function CropCard({ c, data, loading }) {
  const L = useL()
  const { t } = useLang()
  const pricesOn = !!data
  const d = pricesOn ? data[c.id] : null
  const msp = MSP_2027_28[c.id]
  const today = d?.today?.price ?? null
  const avg5 = d?.avg5 ?? null
  const max = Math.max(msp, today || 0, avg5 || 0) * 1.12
  const gap = today != null ? today - msp : null
  const inc = incomeLines({ cropId: c.id, avg5, today })
  const missing = (label, text, testid) => (
    <div className="my-1 grid gap-2 text-[13px]" style={{ gridTemplateColumns: '92px 1fr', color: 'var(--ks-ink-3)' }}><span>{label}</span><span data-testid={testid}>{text}</span></div>
  )
  return (
    <article id={`kp-crop-${c.id}`} data-testid={`kp-crop-${c.id}`} className="mb-2.5 rounded-xl p-3" style={{ ...SCROLL_MARGIN, background: c.id === 'gram' ? 'var(--ks-green-tint)' : 'var(--ks-card)', border: c.id === 'gram' ? '2px solid var(--ks-green)' : '1px solid var(--ks-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{L(c.name)}<ReviewTag reviewed={c.reviewed} /></h3>
        <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-bold text-white" style={{ background: TONE[c.tone] }}>{L(c.verdict)}</span>
      </div>
      <div className="my-2 flex flex-wrap gap-1.5 text-[13px]">
        <span className="rounded-lg px-2 py-0.5" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)' }}>{L(LABELS.water)}: {L(c.water)}<ReviewTag reviewed={c.water.reviewed !== false} /></span>
        <span className="rounded-lg px-2 py-0.5" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)' }}>{L(LABELS.days)}: {L(c.days)}{c.days.star ? ' *' : ''}<ReviewTag reviewed={c.days.reviewed} /></span>
      </div>
      <p className="text-[14px]"><b>{L(LABELS.sowing)}:</b> {L(c.sowing)}</p>

      {loading && <p className="mt-2 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{L(LABELS.loading)}</p>}
      {!loading && (
        <div className="mt-2">
          <Bar label={L(LABELS.mspRow)} value={msp} max={max} color="#78716c" />
          {pricesOn && (today != null
            ? <Bar label={L(LABELS.todayRow)} value={today} max={max} color="var(--ks-green)" />
            : missing(L(LABELS.todayRow), c.id === 'barley' ? L(LABELS.noData) : L(LABELS.noToday), `kp-notoday-${c.id}`))}
          {pricesOn && (avg5 != null
            ? <Bar label={L(LABELS.avgRow)} value={avg5} max={max} color="#1d4ed8" />
            : missing(L(LABELS.avgRow), L(LABELS.noData), `kp-noavg-${c.id}`))}
          {pricesOn && avg5 != null && <p className="text-[12.5px]" style={{ color: 'var(--ks-ink-3)' }}>{L(LABELS.avgNote)}</p>}
          {gap != null && (
            <p className="mt-1 text-[13.5px]">{L(LABELS.gap)}: <b style={{ color: gap >= 0 ? 'var(--ks-green-dark)' : '#991b1b' }}>{gap >= 0 ? '+' : '−'}{rs(Math.abs(gap))} {L(LABELS.perQ)}</b></p>
          )}
          {pricesOn && d.top.length > 0 && (
            <p className="mt-1 text-[13.5px]">{L(LABELS.topMandis)}: {d.top.map((m) => `${marketLabel(m.market, null, t)} ${rs(m.price)}`).join(', ')}</p>
          )}
        </div>
      )}

      {inc.yieldQ != null ? (
        <div className="my-2 rounded-lg px-2.5 py-1.5 text-[13.5px]" style={{ background: 'var(--ks-card)', border: '1px dashed var(--ks-green)' }}>
          <b>{L(LABELS.money)}</b><br />
          {L(LABELS.yieldIs)} {inc.yieldQ} {L(LABELS.quintal)} (CRIDA 2013)
          {inc.atAvg != null && <><br />• {L(LABELS.atAvg)}: <b>{rs(inc.atAvg)}</b> ({L(LABELS.atAvgSafe)})</>}
          {inc.atToday != null && <><br />• {L(LABELS.atToday)}: <b>{rs(inc.atToday)}</b></>}
          {inc.upside && <><br />• {L(LABELS.upside)} ({GRAM_UPSIDE_Q.min} {L(LABELS.to)} {GRAM_UPSIDE_Q.max} {L(LABELS.quintal)}, {L(LABELS.upsideNote)}): <b>{rs(inc.upside.lo)} {L(LABELS.to)} {rs(inc.upside.hi)}</b></>}
          <br /><span className="text-[12.5px]" style={{ color: 'var(--ks-ink-3)' }}>{L(PAGE.estimate)}</span>
        </div>
      ) : (
        <p className="my-2 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{L(LABELS.noYield)}</p>
      )}

      {c.vars && <p className="my-2 rounded-lg px-2.5 py-1.5 text-[13px]" style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)' }}><b>{L(LABELS.vars)}:</b> {L(c.vars)}<ReviewTag reviewed={c.vars.reviewed} /></p>}
      <p className="text-[14px]">{L(c.why)}</p>
      <p className="mt-1 text-[13.5px]" style={{ color: 'var(--ks-ink-3)' }}>{L(c.note)}</p>
      <Src ids={c.sources} />
    </article>
  )
}

export default function KamPani() {
  const { t, lang } = useLang()
  const { hash } = useLocation()
  const L = useL()
  const [water, setWater] = useState(0)
  const [data, setData] = useState(undefined) // undefined = loading, null = failed, object = per-crop
  const now = new Date()
  const sow = sowingBanner(now)
  const rain = rainBanner(now)

  useEffect(() => {
    let alive = true
    fetchAllCropData().then((d) => { if (alive) setData(d) }).catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [])

  // A #hash (jump chip, the farm-pond link) scrolls to its target once the page is there.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0)
  }, [hash])

  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: L(PAGE.h1), description: L(PAGE.seoDesc), inLanguage: lang === 'en' ? 'en-IN' : 'hi-IN', dateModified: LAST_CHECKED, mainEntityOfPage: 'https://kissansahyog.com/fasal-salah/kam-pani' }
  const loading = data === undefined
  const pricesOn = !!data

  const tableRows = useMemo(() => KP_CROPS.map((c) => {
    const d = data ? data[c.id] : null
    return { c, avg5: d?.avg5 ?? null, today: d?.today?.price ?? null, byYear: d?.byYear || [] }
  }), [data])
  const years = [2021, 2022, 2023, 2024, 2025]

  return (
    <PageShell width="wide" ready={data !== undefined}>
      <Seo title={L(PAGE.seoTitle).slice(0, 70)} description={L(PAGE.seoDesc).slice(0, 155)} path="/fasal-salah/kam-pani" type="article" jsonLd={[articleLd]} />
      <div className="w-full space-y-5">
        <BackButton fallback="/fasal-salah" />
        <div>
          <h1 className="text-[24px] font-extrabold leading-snug md:text-[30px]" style={{ color: 'var(--ks-ink)' }}>{L(PAGE.h1)}</h1>
          <p className="mt-1 text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{L(PAGE.intro)}</p>
        </div>

        <nav aria-label={L(PAGE.h1)} className="flex gap-2 overflow-x-auto pb-1" data-testid="kp-chips">
          {PAGE.chips.map((c) => (
            <a key={c.id} href={`#${c.id}`} data-testid={`kp-chip-${c.id}`} className="flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 text-[14px] font-semibold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)', border: '1px solid var(--ks-green)' }}>{L(c)}</a>
          ))}
        </nav>

        {/* 1. safe crops */}
        <section id="surakshit-fasal" style={SCROLL_MARGIN} data-testid="kp-sec-safe">
          <h2 className={H2} style={{ color: 'var(--ks-ink)' }}>{L(PAGE.sections.safe)}</h2>
          {sow && (
            <div data-testid="kp-banner-sowing" className="mt-2 rounded-lg px-3 py-2.5 text-[14.5px]" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
              <b>{L(sow.title)}</b> {L(sow.text)}<Src ids={sow.sources} />
            </div>
          )}
          {rain && (
            <div data-testid="kp-banner-rain" className="mt-2 rounded-lg px-3 py-2.5 text-[14.5px]" style={{ background: 'var(--ks-saffron-tint)', border: '1px solid var(--ks-saffron)', color: 'var(--ks-orange-dark)' }}>
              <b>{L(rain.title)}</b> {L(rain.text)}<br />{L(rain.more)}
              <Stats stats={rain.stats} />
              <Src ids={rain.sources} />
            </div>
          )}

          <h3 className="mt-4 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{L(IRRIGATION.title)}</h3>
          <Stats stats={IRRIGATION.stats} />
          <p className="mt-1.5 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{L(IRRIGATION.text)}</p>
          <Src ids={IRRIGATION.sources} />

          <h3 className="mt-4 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{L(PAGE.waterAsk)}</h3>
          <div className="my-2 grid grid-cols-2 gap-2" data-testid="kp-water">
            {PAGE.waterBtn.map((b) => (
              <button key={b.w} type="button" onClick={() => setWater(b.w)} aria-pressed={water === b.w} data-testid={`kp-water-${b.w}`} className="min-h-[52px] rounded-xl px-2 py-1.5 text-[14px] font-semibold" style={{ border: `2px solid ${water === b.w ? 'var(--ks-green)' : 'var(--ks-border)'}`, background: water === b.w ? 'var(--ks-green-tint)' : 'var(--ks-card)', color: water === b.w ? 'var(--ks-green-dark)' : 'var(--ks-ink)' }}>
                {L(b)}{b.subHi && <small className="block text-[12px] font-normal">{lang === 'en' ? b.subEn : b.subHi}</small>}
              </button>
            ))}
          </div>
          <div data-testid="kp-water-box">
            <p className="rounded-lg px-3 py-2 text-[14.5px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)', border: '1px solid var(--ks-green)' }}>{L(waterTitle(water))}</p>
            {recommendForWater(water).map((r, i) => (
              <div key={`${water}-${i}`} data-testid={r.keep ? 'kp-rec-keep' : 'kp-rec-avoid'} className="my-1.5 rounded-r-lg px-3 py-2 text-[14.5px]" style={{ borderLeft: `4px solid ${r.keep ? 'var(--ks-green)' : '#991b1b'}`, border: '1px solid var(--ks-border)', borderLeftWidth: 4, borderLeftColor: r.keep ? 'var(--ks-green)' : '#991b1b', background: 'var(--ks-card)' }}>
                <b>{r.keep ? (lang === 'en' ? 'Sow: ' : 'बोएँ: ') : (lang === 'en' ? 'Avoid: ' : 'न बोएँ / सावधान: ')}{L(r.crop)}</b> — {L(r.text)}<ReviewTag reviewed={r.reviewed} />
              </div>
            ))}
            <p className="mt-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{L(WATER_NOTE)}</p>
          </div>

          <h3 className="mt-5 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{L(PAGE.cropsH)}</h3>
          <p className="mb-2 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{L(PAGE.cropsSub)}</p>
          {KP_CROPS.map((c) => <CropCard key={c.id} c={c} data={data} loading={loading} />)}

          {pricesOn && (
            <>
              <h3 className="mt-5 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{L(PAGE.tableH)}</h3>
              <p className="mb-1 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{L(PAGE.tableSub)}</p>
              <div className="overflow-x-auto" data-testid="kp-table-wrap">
                <table className="w-full text-[13.5px]" data-testid="kp-table">
                  <thead><tr style={{ color: 'var(--ks-ink-3)' }}>{[LABELS.colCrop, LABELS.colAvg, LABELS.colToday, LABELS.colGap, LABELS.mspRow].map((h, i) => <th key={i} className="border-b p-1.5 text-left text-[12.5px]" style={{ borderColor: 'var(--ks-border)' }}>{L(h)}</th>)}</tr></thead>
                  <tbody>
                    {tableRows.map(({ c, avg5, today }) => {
                      const g = gapPercent(today, avg5)
                      return (
                        <tr key={c.id}>
                          <td className="border-b p-1.5 font-bold" style={{ borderColor: 'var(--ks-border)' }}>{L(c.name)}</td>
                          <td className="border-b p-1.5" style={{ borderColor: 'var(--ks-border)' }}>{avg5 != null ? rs(avg5) : '—'}</td>
                          <td className="border-b p-1.5" style={{ borderColor: 'var(--ks-border)' }}>{today != null ? rs(today) : L(LABELS.noData)}</td>
                          <td className="border-b p-1.5 font-bold" style={{ borderColor: 'var(--ks-border)', color: g == null ? 'inherit' : g >= 0 ? 'var(--ks-green-dark)' : '#991b1b' }}>{g == null ? '—' : `${g >= 0 ? '+' : '−'}${Math.abs(g)}%`}</td>
                          <td className="border-b p-1.5" style={{ borderColor: 'var(--ks-border)' }}>{rs(MSP_2027_28[c.id])}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 rounded-lg px-3 py-2 text-[14px]" style={{ background: 'var(--ks-saffron-tint)', border: '1px solid var(--ks-saffron)', color: 'var(--ks-orange-dark)' }}>{L(PAGE.howRead)}</p>

              <details className="mt-3 rounded-xl" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)' }} data-testid="kp-years">
                <summary className="flex min-h-[48px] cursor-pointer items-center px-3 text-[15px] font-bold">{L(PAGE.yearH)}</summary>
                <div className="px-3 pb-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead><tr style={{ color: 'var(--ks-ink-3)' }}><th className="p-1.5 text-left">{L(LABELS.colCrop)}</th>{years.map((y) => <th key={y} className="p-1.5 text-left">{y}</th>)}</tr></thead>
                      <tbody>
                        {tableRows.map(({ c, byYear }) => (
                          <tr key={c.id}>
                            <td className="border-t p-1.5 font-bold" style={{ borderColor: 'var(--ks-border)' }}>{L(c.name)}</td>
                            {years.map((y) => { const v = byYear.find((b) => b.year === y); return <td key={y} className="border-t p-1.5" style={{ borderColor: 'var(--ks-border)' }}>{v ? rs(v.price) : '—'}</td> })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ks-ink-3)' }}>{L(PAGE.attribution)}. {L(PAGE.yearNote)}</p>
                </div>
              </details>
            </>
          )}
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--ks-ink-3)' }}>{L(LABELS.mspNote)} {L(SOURCES.msp)}.</p>
        </section>

        {/* 2. government support */}
        <section id="sarkari-sahara" style={SCROLL_MARGIN} data-testid="kp-sec-gov">
          <h2 className={H2} style={{ color: 'var(--ks-ink)' }}>{L(PAGE.sections.gov)}</h2>
          <p className="my-2 rounded-lg px-3 py-2 text-[14px]" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>{L(GOV_NOTE)}</p>
          {GOV_CARDS.map((c) => <Card key={c.id} card={c} />)}
        </section>

        {/* 3. late rain / drought */}
        <section id="barish-der-se" style={SCROLL_MARGIN} data-testid="kp-sec-late">
          <h2 className={H2} style={{ color: 'var(--ks-ink)' }}>{L(PAGE.sections.late)}</h2>
          <div className="mt-2">{LATE_CARDS.map((c) => <Card key={c.id} card={c} />)}</div>
        </section>

        {/* 4. heavy rain */}
        <section id="barish-zyada" style={SCROLL_MARGIN} data-testid="kp-sec-wet">
          <h2 className={H2} style={{ color: 'var(--ks-ink)' }}>{L(PAGE.sections.wet)}</h2>
          <p className="my-2 rounded-lg px-3 py-2 text-[14.5px]" style={{ background: 'var(--ks-saffron-tint)', border: '1px solid var(--ks-saffron)', color: 'var(--ks-orange-dark)' }}><b>{L(WET_NOTE)}</b></p>
          {WET_CARDS.map((c) => <Card key={c.id} card={c} />)}
        </section>

        {/* 5. saving water */}
        <section id="pani-bachana" style={SCROLL_MARGIN} data-testid="kp-sec-save">
          <h2 className={H2} style={{ color: 'var(--ks-ink)' }}>{L(PAGE.sections.save)}</h2>
          <div className="mt-2">{SAVE_CARDS.map((c) => <Card key={c.id} card={c} />)}</div>
        </section>

        {/* footer */}
        <footer className="border-t pt-3 text-[13.5px]" style={{ borderColor: 'var(--ks-border)', color: 'var(--ks-ink-3)' }} data-testid="kp-footer">
          <details>
            <summary className="flex min-h-[44px] cursor-pointer items-center font-bold" style={{ color: 'var(--ks-ink-2)' }}>{L(LABELS.sourcesH)}</summary>
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(SOURCES).map(([id, s]) => (
                <li key={id}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline" style={{ color: 'var(--ks-blue)' }}>{L(s)}</a> : L(s)}</li>
              ))}
            </ul>
          </details>
          <p className="mt-2">{L(PAGE.starNote)}</p>
          <p className="mt-1"><b>{L(LABELS.lastChecked)}</b></p>
          <div className="mt-3 rounded-lg px-3 py-2.5 text-[14px]" style={{ background: 'var(--ks-saffron-tint)', border: '1px solid var(--ks-saffron)', color: 'var(--ks-orange-dark)' }}>
            <b>{L(PAGE.ask)}</b>. {t('res_card_offices_1')}
          </div>
          <p className="mt-2">{L(PAGE.attribution)}</p>
          <Link to="/msp" data-testid="kp-btn-msp" className="mt-3 flex min-h-[48px] items-center justify-center rounded-xl text-[15px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{L(LABELS.seeToday)}</Link>
          <Link to="/bazaar" data-testid="kp-btn-bazaar" className="mt-2 flex min-h-[48px] items-center justify-center rounded-xl text-[15px] font-bold" style={{ background: 'var(--ks-card)', border: '2px solid var(--ks-green)', color: 'var(--ks-green-dark)' }}>{L(LABELS.seeBazaar)}</Link>
        </footer>
      </div>
    </PageShell>
  )
}
