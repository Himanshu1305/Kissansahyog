import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchMandiPrices } from '../lib/mandi/mandiApi'

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
  const item = (r, i) => (
    <span key={`${r.commodity_en}-${r.market}-${i}`} className="whitespace-nowrap px-4">
      <span className="font-bold">{r.commodity_hi}</span>{' '}
      <span>₹{fmt(r.modal_price)}/{t('mandi_qtl')}</span>
      <span className="text-green-300"> · </span>
      <span>{marketHi(r.market)}</span>
      <span className="px-2 text-green-500">|</span>
    </span>
  )

  return (
    <div
      className="flex h-[38px] items-stretch overflow-hidden bg-[#1a4731] text-white"
      role="marquee"
      aria-label="Today's mandi prices"
      aria-live="off"
    >
      {/* Fixed, non-scrolling label */}
      <div className="flex w-[140px] shrink-0 flex-col justify-center gap-0.5 border-r border-green-900/60 bg-[#143a28] px-2 text-xs font-bold leading-none">
        <span className="truncate">📊 {t('mandi_title')}</span>
        {state.day === 'yesterday' && (
          <span className="w-fit rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">{t('mandi_yesterday')}</span>
        )}
      </div>

      {/* Scrolling prices / states */}
      <div className="relative flex-1 overflow-hidden">
        {state.loading ? (
          <div className="ticker-shimmer h-full w-full" />
        ) : state.rows.length === 0 ? (
          <div className="flex h-full items-center px-4 text-sm text-green-100">{t('mandi_soon')}</div>
        ) : (
          <div className="ticker-content h-full items-center text-sm">
            {/* content duplicated once for a seamless -50% loop */}
            {state.rows.map(item)}
            {state.rows.map((r, i) => item(r, i + state.rows.length))}
          </div>
        )}
      </div>
    </div>
  )
}
