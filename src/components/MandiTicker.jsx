import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'
import { cropByMandi } from '../content/crops'

// Raw market name → i18n key for its Hindi mandi label (fallback: raw name).
const MARKET_KEY = {
  Khurai: 'mandi_mkt_khurai', Sagar: 'mandi_mkt_sagar', Rehli: 'mandi_mkt_rehli',
  Banda: 'mandi_mkt_banda', Deori: 'mandi_mkt_deori', Malthone: 'mandi_mkt_malthone',
}
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')

// Live scrolling mandi-price ticker. Fixed 38px height reserved up-front to avoid
// layout shift. Shows today's prices; falls back to yesterday's (amber badge);
// else "coming soon". CSS-only scroll (see index.css), paused on hover/tap.
export default function MandiTicker() {
  const { t } = useLang()
  const [state, setState] = useState({ loading: true, rows: [], day: 'none' })

  useEffect(() => {
    let alive = true
    fetchMandiPrices()
      .then((r) => alive && setState({ loading: false, rows: r.rows, day: r.day }))
      .catch(() => alive && setState({ loading: false, rows: [], day: 'none' }))
    return () => { alive = false }
  }, [])

  const marketHi = (m) => (MARKET_KEY[m] ? t(MARKET_KEY[m]) : m)
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
      <span>{marketHi(r.market)}</span>
      <span className="px-2 text-[var(--ks-primary-light)]">|</span>
    </>)
    return slug
      ? <a key={`${r.commodity_en}-${r.market}-${i}`} href={`/msp/${slug}`} className="whitespace-nowrap px-4 text-[#c8e6b0]">{inner}</a>
      : <span key={`${r.commodity_en}-${r.market}-${i}`} className="whitespace-nowrap px-4 text-[#c8e6b0]">{inner}</span>
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
        {state.day === 'yesterday' && (
          <span className="w-fit rounded-full bg-[var(--ks-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ks-accent-dark)]">{t('mandi_yesterday')}</span>
        )}
      </div>

      {/* Scrolling prices / states */}
      <div className="relative flex-1 overflow-hidden">
        {state.loading ? (
          <div className="ticker-shimmer h-full w-full" />
        ) : state.rows.length === 0 ? (
          <div className="flex h-full items-center px-4 text-[14px] text-[#c8e6b0]">{t('mandi_soon')}</div>
        ) : (
          <div className="ticker-content h-full items-center text-[14px]">
            {/* content duplicated once for a seamless -50% loop */}
            {state.rows.map(item)}
            {state.rows.map((r, i) => item(r, i + state.rows.length))}
          </div>
        )}
      </div>
    </div>
  )
}
