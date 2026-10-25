import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { priceStaleness, ddmm } from '../lib/mandi/staleness'
import { cropByMandi } from '../content/crops'
import { useOfflineInfo } from '../lib/offline/useOffline'
import { marketLabel } from '../lib/mandi/marketNames'
import { tickerRows, tickerDuration } from '../lib/mandi/tickerRows'

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')

// Live scrolling mandi-price ticker. Fixed 38px height reserved up-front to avoid
// layout shift. Shows today's prices; falls back to yesterday's (amber badge);
// else "coming soon". CSS-only scroll (see index.css), paused on hover/tap.
export default function MandiTicker() {
  const { t } = useLang()
  const [state, setState] = useState({ loading: true, rows: [], day: 'none', date: null })
  const offline = useOfflineInfo(['mandi_prices'])

  useEffect(() => {
    let alive = true
    fetchMandiPrices()
      .then((r) => alive && setState({ loading: false, rows: r.rows, day: r.day, date: r.date }))
      .catch(() => alive && setState({ loading: false, rows: [], day: 'none', date: null }))
    return () => { alive = false }
  }, [])

  // Batch 12C: one row per crop (max 12), a Hindi mandi name for every market, a steady scroll speed.
  const list = tickerRows(state.rows)
  const marketHi = (r) => marketLabel(r.market, r.district, t)
  // Scroll only when the list is wider than the strip (about 35 px per second, at least 40 s).
  const viewRef = useRef(null)
  const setRef = useRef(null)
  const [fit, setFit] = useState({ scroll: false, seconds: 60 })
  useLayoutEffect(() => {
    const view = viewRef.current; const set = setRef.current
    if (!view || !set) return undefined
    const measure = () => {
      const w = set.offsetWidth; const scroll = w > view.clientWidth; const seconds = tickerDuration(w * 2)
      setFit((p) => (p.scroll === scroll && p.seconds === seconds ? p : { scroll, seconds }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure); ro.observe(view); ro.observe(set)
    return () => ro.disconnect()
  }, [list.length, state.loading])
  // Honest, dated label for a non-today ticker (Phase 4c). The staleness is classified by the
  // SAME local-time priceStaleness() used by the MSP page's PriceCell, so the ticker and the
  // MSP tables never disagree about whether a given date is "today" vs "कल का भाव" (the ticker
  // used to compare against a UTC day-boundary, which drifted from the MSP's local one).
  const st = state.date ? priceStaleness(state.date) : null
  const dateBadge = (st === 'yesterday' || st === 'older')
    ? `${t(st === 'yesterday' ? 'mandi_price_yesterday' : 'mandi_price_older')} (${ddmm(state.date)})`
    : null
  const item = (r, i) => {
    const slug = cropByMandi(r.commodity_en)?.slug
    const inner = (<>
      <span className="font-bold text-white">{r.commodity_hi}</span>{' '}
      <span>₹{fmt(r.modal_price)}/{t('mandi_qtl')}</span>
      {r.delta != null && r.delta !== 0 && (
        <span className="font-bold" style={{ color: r.delta > 0 ? '#FBE9B6' : '#F5B7B7' }}>
          {' '}{r.delta > 0 ? '↑' : '↓'}{fmt(Math.abs(r.delta))}
        </span>
      )}
      <span className="text-[var(--ks-primary-light)]"> · </span>
      <span>{marketHi(r)}</span>
      <span className="px-2 text-[var(--ks-primary-light)]">|</span>
    </>)
    // min-h-0 opts these ticker links out of the global 44px tap-target min-height, which
    // would otherwise make each <a> taller than the 38px strip and clip the text (Phase 4).
    return slug
      ? <a key={`${r.commodity_en}-${r.market}-${i}`} href={`/msp/${slug}`} className="flex min-h-0 items-center whitespace-nowrap px-4 text-[#c8e6b0]">{inner}</a>
      : <span key={`${r.commodity_en}-${r.market}-${i}`} className="flex min-h-0 items-center whitespace-nowrap px-4 text-[#c8e6b0]">{inner}</span>
  }

  return (
    <div
      className="flex h-[38px] w-full items-stretch overflow-hidden bg-[var(--ks-primary-dark)] text-white"
      role="marquee"
      aria-label="Today's mandi prices"
      aria-live="off"
    >
      {/* Fixed, non-scrolling label */}
      <div className="flex w-[140px] shrink-0 flex-col justify-center gap-0.5 border-r border-black/20 bg-[var(--ks-primary)] px-2 text-[13px] font-bold leading-none text-[var(--ks-accent-muted)]">
        <span className="truncate">📊 {t('mandi_title')}</span>
        {dateBadge && (
          <span className="w-fit whitespace-nowrap rounded-full bg-[var(--ks-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ks-accent-dark)]" data-testid="ticker-stale-badge">{dateBadge}</span>
        )}
      </div>

      {/* Scrolling prices / states */}
      <div ref={viewRef} className="ticker-view relative flex-1 overflow-hidden">
        {state.loading ? (
          <div className="ticker-shimmer h-full w-full" />
        ) : list.length === 0 ? (
          <div className="flex h-full items-center px-4 text-[14px] text-[#c8e6b0]" data-testid={offline.failed ? 'ticker-offline' : undefined}>{t(offline.failed ? 'offline_no_data' : 'mandi_soon')}</div>
        ) : (
          <div className={`ticker-content h-full items-center text-[14px]${fit.scroll ? ' is-scrolling' : ''}`} style={{ '--ticker-duration': `${fit.seconds}s` }}>
            <div ref={setRef} className="flex h-full items-center">{list.map(item)}</div>
            {/* second copy only while scrolling, for a seamless -50% loop */}
            {fit.scroll && <div className="ticker-dup flex h-full items-center" aria-hidden="true">{list.map((r, i) => item(r, i + list.length))}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
