// Batch 10F — the /msp price trend chart (7 / 30 / 90 days). Inline SVG drawn at the real pixel width
// (geometry: src/lib/mandi/chartLayout.js), so dates and prices stay readable on a 320 px phone.
//   - Always-visible labels (date + price) on the first, last, highest and lowest point; in the
//     7-day view on every dot (every second when they do not fit). Nothing overlaps.
//   - Every dot is reachable: mouse hover, tap or press-and-drag along the chart (a vertical guide and
//     the tooltip follow the NEAREST dot to the finger), and the keyboard (← → Home End).
//     Tooltip: "17 अक्टू · ₹2,526" + "N मंडी".
//   - A collapsible "सारणी देखें" table below lists every plotted date and price (closed by default).
// The series is the corrected stable-basket series (src/lib/mandi/basket.js): days with too few
// mandis are not plotted (the line bridges them); nothing is made up.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { layoutChart, textWidth, LABEL_METRICS as M } from '../../lib/mandi/chartLayout'
import { formatDay, formatDateFull } from '../../lib/mandi/mspWindow'
import CollapsibleSection from '../CollapsibleSection'

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
// Before the first measurement (prerender, no JS) the chart is drawn for 640 px and scaled to fit.
const FIRST_W = 640

export default function TrendChart({ series, mspValue, days, cropLabel, few, rangeLabel }) {
  const { t, lang } = useLang()
  const boxRef = useRef(null)
  const [w, setW] = useState(null)
  const [active, setActive] = useState(null)
  const dragging = useRef(false)

  const hasData = !!series?.length
  // Measured once the chart box exists (it does not while there is no data yet).
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => { const cw = Math.round(el.clientWidth); if (cw > 0) setW(cw) }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasData])

  const fmtDay = useCallback((iso) => formatDay(iso, lang), [lang])
  const L = useMemo(() => layoutChart({ series, mspValue, width: w || FIRST_W, days, fmtDay }), [series, mspValue, w, days, fmtDay])
  // A new window or crop: forget the dot the visitor was looking at.
  useLayoutEffect(() => { setActive(null) }, [series])

  const mandis = (n) => (n === 1 ? t('msp_chart_mandi_one') : t('msp_chart_mandis').replace('{n}', n))
  const tipText = (p) => `${fmtDay(p.date)} · ${rupee(p.price)}`

  const nearest = (clientX) => {
    const el = boxRef.current
    if (!el || !L.points.length) return null
    const r = el.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * L.W
    let best = 0
    for (let i = 1; i < L.points.length; i++) if (Math.abs(L.points[i].x - x) < Math.abs(L.points[best].x - x)) best = i
    return best
  }
  const onPointerDown = (e) => {
    dragging.current = true
    if (e.pointerType !== 'mouse') { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ } }
    setActive(nearest(e.clientX))
  }
  const onPointerMove = (e) => {
    if (e.pointerType === 'mouse' || dragging.current) setActive(nearest(e.clientX))
  }
  const onPointerUp = () => { dragging.current = false }
  const onPointerLeave = (e) => { if (e.pointerType === 'mouse') setActive(null) }
  const onKeyDown = (e) => {
    const n = L.points.length
    if (!n) return
    let next = null
    if (e.key === 'ArrowRight') next = active == null ? 0 : Math.min(n - 1, active + 1)
    else if (e.key === 'ArrowLeft') next = active == null ? n - 1 : Math.max(0, active - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else if (e.key === 'Escape') { setActive(null); return }
    if (next == null) return
    e.preventDefault()
    setActive(next)
  }

  if (!series?.length) return <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>

  const { W, H, plot, points } = L
  const first = points[0]
  const last = points[points.length - 1]
  const hi = points[L.iHi]
  const lo = points[L.iLo]
  const summary = t('msp_chart_aria')
    .replace('{crop}', cropLabel)
    .replace('{range}', rangeLabel || '')
    .replace('{first}', tipText(first))
    .replace('{last}', tipText(last))
    .replace('{high}', tipText(hi))
    .replace('{low}', tipText(lo))
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const mspY = L.msp ? L.msp.y : null
  const uid = `tc${days}_${points.length}`
  const band = mspY != null ? `${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${last.x.toFixed(1)},${mspY.toFixed(1)} ${first.x.toFixed(1)},${mspY.toFixed(1)}` : null
  const act = active != null ? points[active] : null
  const scale = w ? 1 : null // before measuring, the SVG scales; positions of HTML overlays are skipped

  // Tooltip box (HTML, so the text is crisp): above the dot, or below when there is no room.
  let tip = null
  if (act && scale) {
    const line1 = tipText(act)
    const line2 = act.n ? mandis(act.n) : ''
    const tw = Math.max(textWidth(line1, 14), textWidth(line2, 12)) + 20
    const left = Math.min(Math.max(act.x - tw / 2, 0), W - tw)
    const above = act.y - 58 >= 0
    tip = { line1, line2, left, top: above ? act.y - 58 : act.y + 12, tw }
  }

  return (
    <div data-trend-chart data-days={days}>
      {few && <p data-trend-few className="mb-1 inline-block rounded px-2 py-0.5 text-[13px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)', border: '1px solid var(--ks-orange)' }}>{t('msp_chart_few')}</p>}
      <p id={`${uid}-help`} className="mb-1 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('msp_chart_help')}</p>
      <div
        ref={boxRef}
        className="ks-tc-box relative w-full"
        style={{ height: H, touchAction: 'pan-y', cursor: 'crosshair' }}
        tabIndex={0}
        role="group"
        aria-label={summary}
        aria-describedby={`${uid}-help`}
        data-trend-box
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMinYMin meet" aria-hidden="true" focusable="false" style={{ display: 'block', overflow: 'visible' }}>
          {mspY != null && (
            <defs>
              <clipPath id={`${uid}-a`}><rect x={plot.x0} y={0} width={plot.x1 - plot.x0} height={Math.max(0, mspY)} /></clipPath>
              <clipPath id={`${uid}-b`}><rect x={plot.x0} y={mspY} width={plot.x1 - plot.x0} height={Math.max(0, plot.y1 - mspY)} /></clipPath>
            </defs>
          )}
          {band && (<>
            <polygon points={band} fill="var(--ks-green-tint)" clipPath={`url(#${uid}-a)`} />
            <polygon points={band} fill="var(--ks-saffron-tint)" clipPath={`url(#${uid}-b)`} />
          </>)}
          {L.yTicks.map((yt) => (
            <g key={yt.value}>
              <line x1={plot.x0} y1={yt.y} x2={plot.x1} y2={yt.y} stroke="var(--ks-border)" strokeDasharray="2 4" />
              <text x={plot.x0 - 6} y={yt.y + 4} fontSize={M.TICK_FONT} textAnchor="end" fill="var(--ks-ink-3)">{yt.text}</text>
            </g>
          ))}
          <line x1={plot.x0} y1={plot.y1} x2={plot.x1} y2={plot.y1} stroke="var(--ks-border-strong)" />
          {L.ticks.map((tk) => (
            <g key={tk.iso} data-trend-tick={tk.iso}>
              <line x1={tk.x} y1={plot.y1} x2={tk.x} y2={plot.y1 + 4} stroke="var(--ks-border-strong)" />
              <text x={tk.tx} y={H - 8} fontSize={M.TICK_FONT} textAnchor="middle" fill="var(--ks-ink-3)">{tk.text}</text>
            </g>
          ))}
          {L.msp && (<>
            <line x1={plot.x0} y1={mspY} x2={plot.x1} y2={mspY} stroke="var(--ks-orange)" strokeDasharray="5 4" />
            <text x={plot.x1} y={L.msp.ty} fontSize={M.TICK_FONT} fill="var(--ks-orange-dark)" textAnchor="end" fontWeight="700">{L.msp.text}</text>
          </>)}
          <path d={path} fill="none" stroke="var(--ks-green)" strokeWidth="2.5" strokeLinejoin="round" />
          {act && <line x1={act.x} y1={plot.y0 - 6} x2={act.x} y2={plot.y1} stroke="var(--ks-ink-2)" strokeWidth="1.5" strokeDasharray="3 3" data-trend-guide />}
          {points.map((p) => (
            <circle key={p.date} cx={p.x} cy={p.y} r={active === p.i ? 6 : 3.5} fill={active === p.i ? 'var(--ks-saffron)' : 'var(--ks-green-dark)'} stroke={active === p.i ? 'var(--ks-ink)' : 'none'} strokeWidth="1.5" data-trend-dot={p.date} data-price={p.price} />
          ))}
          {L.labels.map((lb) => {
            const b = lb.box
            const cx = b.x + b.w / 2
            const edgeY = b.y > lb.py ? b.y : b.y + b.h
            return (
              <g key={lb.i} data-trend-label={lb.i} data-roles={lb.roles.join(' ')} data-date={points[lb.i].date} data-price={points[lb.i].price}>
                <line x1={lb.px} y1={lb.py} x2={Math.min(Math.max(lb.px, b.x + 4), b.x + b.w - 4)} y2={edgeY} stroke="var(--ks-ink-3)" strokeWidth="1" />
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="5" fill="var(--ks-card)" fillOpacity=".92" stroke={lb.roles.includes('high') ? 'var(--ks-green)' : lb.roles.includes('low') ? 'var(--ks-orange)' : 'var(--ks-border-strong)'} />
                <text x={cx} y={b.y + M.DATE_FONT + 1} fontSize={M.DATE_FONT} textAnchor="middle" fill="var(--ks-ink-2)">{lb.date}</text>
                <text x={cx} y={b.y + M.DATE_FONT + M.LINE_GAP + M.LABEL_FONT + 1} fontSize={M.LABEL_FONT} fontWeight="800" textAnchor="middle" fill="var(--ks-ink)">{lb.price}</text>
              </g>
            )
          })}
        </svg>
        {tip && (
          <div data-trend-tooltip data-date={act.date} data-price={act.price} className="pointer-events-none absolute z-10 rounded-lg px-2.5 py-1.5 text-center shadow-lg" style={{ left: tip.left, top: tip.top, width: tip.tw, background: 'var(--ks-ink)', color: '#fff' }}>
            <span className="block whitespace-nowrap text-[14px] font-extrabold leading-tight">{tip.line1}</span>
            {tip.line2 && <span className="block whitespace-nowrap text-[12px] font-semibold leading-tight" style={{ opacity: 0.85 }}>{tip.line2}</span>}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{act ? `${tipText(act)}${act.n ? `, ${mandis(act.n)}` : ''}` : ''}</p>

      <div className="mt-2">
        <CollapsibleSection page="msp" id="trend-table" as="h3" closedByDefault h2Class="text-[16px] font-bold" title={t('msp_chart_table')}>
          <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--ks-border)' }}>
            <table className="w-full text-[14px]" data-trend-table>
              <caption className="sr-only">{summary}</caption>
              <thead><tr style={{ background: 'var(--ks-bg-soft)' }}><th className="p-2 text-left">{t('col_date')}</th><th className="p-2 text-right">{t('col_modal')}</th><th className="p-2 text-right">{t('msp_chart_col_mandis')}</th></tr></thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.date} data-trend-row={p.date} style={{ borderTop: '1px solid var(--ks-border)' }}>
                    <td className="p-2">{formatDateFull(p.date, lang)}</td>
                    <td className="p-2 text-right font-bold">{rupee(p.price)}</td>
                    <td className="p-2 text-right" style={{ color: 'var(--ks-ink-3)' }}>{p.n ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
