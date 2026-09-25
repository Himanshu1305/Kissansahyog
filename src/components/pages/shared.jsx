// Shared building blocks for the /mausam and /msp pages. Same tokens + kit as the
// v4 homepage. Charts are inline SVG with a screen-reader table fallback.
import { useState, useEffect, useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { WhatsAppIcon } from '../home/kit'
import { faqQ, faqA, subscribeAlert } from '../../lib/pages/pagesApi'

// JSON-LD injector
export function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

// InfoTip — a tappable "ⓘ" that opens a short point-of-need explanation. Click to
// open (mobile-first — no hover), dismiss by tapping outside or the ✕. Anchors left
// or right depending on screen position so the popover never causes horizontal scroll.
export function InfoTip({ label, label_en }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState('left')
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc) }
  }, [open])
  const text = lang === 'en' ? (label_en || label) : label
  const toggle = (e) => {
    e.preventDefault(); e.stopPropagation()
    const r = ref.current?.getBoundingClientRect()
    if (r) setSide(r.left > window.innerWidth * 0.5 ? 'right' : 'left')
    setOpen((v) => !v)
  }
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button type="button" aria-label={lang === 'en' ? 'More info' : 'जानकारी'} aria-expanded={open} onClick={toggle}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[13px] font-bold leading-none"
        style={{ background: 'var(--ks-blue-tint)', color: 'var(--ks-blue)', minHeight: 0 }}>ⓘ</button>
      {open && (
        <span role="tooltip" className="absolute z-50 mt-1 block rounded-lg p-3 text-left text-[13px] font-normal leading-snug shadow-lg"
          style={{ top: '100%', [side]: 0, width: 'min(240px, 78vw)', background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-ink-2)' }}>
          <button type="button" aria-label={lang === 'en' ? 'Close' : 'बंद करें'} onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            className="absolute right-1 top-1 text-[14px] leading-none" style={{ color: 'var(--ks-ink-3)', minHeight: 0 }}>✕</button>
          <span className="block pr-4">{text}</span>
        </span>
      )}
    </span>
  )
}

// "समीक्षाधीन" tag shown on act-on-able content until Shri A.K. Dixit reviews it.
export function ReviewTag({ reviewed }) {
  const { t } = useLang()
  if (reviewed) return null
  return <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[12px] font-bold align-middle" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }}>{t('under_review')}</span>
}

// PageExplainer — soft-green card, Hindi-first (EN via global toggle).
export function PageExplainer({ title, lines }) {
  return (
    <section style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
      <h2 className="text-[18px] font-bold" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      <div className="mt-1 space-y-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
        {lines.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </section>
  )
}

// LocationControl — shows the active pincode + a "बदलें" prompt.
export function LocationControl({ pincode, place, onChange }) {
  const { t } = useLang()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>📍 {place || t('pincode_label')}: {pincode}</span>
      <button type="button" onClick={onChange} className="rounded-full px-3 py-1.5 text-[14px] font-bold" style={{ background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-green)' }}>{t('pincode_change')}</button>
    </div>
  )
}

export function FaqAccordion({ faqs }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(null)
  if (!faqs?.length) return null
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: faqQ(f, lang), acceptedAnswer: { '@type': 'Answer', text: faqA(f, lang) } })) }
  return (
    <section>
      <h2 className="mb-2 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{t('scheme_faqs')}</h2>
      <JsonLd data={ld} />
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <div key={f.id || i} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-2 p-3 text-left">
              <span className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{faqQ(f, lang)}</span>
              <span className="shrink-0 text-[18px]" style={{ color: 'var(--ks-green)' }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="px-3 pb-3 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{faqA(f, lang)}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ShareWhatsApp — opens wa.me with pre-filled live text.
export function ShareWhatsApp({ text }) {
  const { t } = useLang()
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-share-text={text} className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-[16px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)' }}>
      <WhatsAppIcon size={20} /> {t('scheme_share')}
    </a>
  )
}

// DailyUpdateSignup — capture only (writes alert_subscriptions; sends nothing).
const CROP_CHIPS = ['gehun', 'soyabean', 'chana', 'masoor', 'sarson', 'dhan', 'makka', 'moong', 'urad', 'lahsun']
export function DailyUpdateSignup({ sourcePage, pincode, heading }) {
  const { t, lang } = useLang()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState(pincode || '')
  const [crops, setCrops] = useState([])
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const toggle = (c) => setCrops((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  async function submit() {
    setErr(null)
    if (!/^[6-9][0-9]{9}$/.test(phone)) { setErr(t('signup_bad_phone')); return }
    if (!consent) { setErr(t('signup_need_consent')); return }
    setBusy(true)
    try {
      await subscribeAlert({ phone, pincode: pin, crops, alertTypes: ['weather', 'price'], consentText: t('consent_sentence'), sourcePage })
      setOk(true)
    } catch (e) { setErr(t(e?.message === 'invalid_phone' ? 'signup_bad_phone' : 'err_unknown')) } finally { setBusy(false) }
  }

  if (ok) return <section style={{ background: 'var(--ks-green-tint)', borderRadius: 'var(--ks-radius-lg)', padding: '16px' }}><p className="text-[16px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>{t('signup_thanks')}</p></section>

  return (
    <section style={{ background: 'var(--ks-bg-warm)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '16px' }}>
      <h2 className="text-[18px] font-bold" style={{ color: 'var(--ks-ink)' }}>{heading}</h2>
      {err && <p className="mt-2 text-[14px] font-bold" style={{ color: '#B4231F' }}>{err}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('signup_phone')}</span>
          <input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="9876543210" className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('pincode_label')}</span>
          <input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border px-3 py-2 text-[16px]" style={{ borderColor: 'var(--ks-border-strong)' }} />
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>{t('signup_crops')}</span>
        <div className="flex flex-wrap gap-2">
          {CROP_CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)} className="rounded-full border px-3 py-1.5 text-[14px] font-bold"
              style={crops.includes(c) ? { background: 'var(--ks-green)', color: '#fff', borderColor: 'var(--ks-green)' } : { background: '#fff', color: 'var(--ks-ink-2)', borderColor: 'var(--ks-border-strong)' }}>
              {t(`crop_${c}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-3 flex items-start gap-2 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-green-700" />
        <span>{t('consent_sentence')}</span>
      </label>
      <button type="button" disabled={busy} onClick={submit} className="mt-3 rounded-lg px-5 py-3 text-[16px] font-bold text-white disabled:opacity-60" style={{ background: 'var(--ks-green)' }}>{t('submit')}</button>
    </section>
  )
}

// ---- Inline SVG charts (no library) + screen-reader table fallback ----------

// Line chart of a price series with an optional MSP reference line. Renders per-day
// dot markers (native title tooltip) and shades the band between the price line and
// the MSP line green (above MSP) / amber (below MSP) via clip rects.
export function TrendChart({ series, mspValue, ariaLabel }) {
  const { t } = useLang()
  if (!series?.length) return <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('no_data')}</p>
  const W = 640, H = 200, PL = 44, PR = 14, PT = 14, PB = 24
  const prices = series.map((d) => d.price)
  const vals = mspValue ? [...prices, mspValue] : prices
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => PL + (i / Math.max(1, series.length - 1)) * (W - PL - PR)
  const y = (v) => PT + (1 - (v - min) / span) * (H - PT - PB)
  const pts = series.map((d, i) => [x(i), y(d.price)])
  const path = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const mspY = mspValue ? y(mspValue) : null
  const uid = `tc${series.length}_${Math.round(mspValue || 0)}`
  const band = mspY != null
    ? `${pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')} ${x(series.length - 1).toFixed(1)},${mspY.toFixed(1)} ${x(0).toFixed(1)},${mspY.toFixed(1)}`
    : null
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} style={{ maxWidth: '100%' }}>
        {mspY != null && (
          <defs>
            <clipPath id={`${uid}-a`}><rect x={PL} y={PT} width={W - PL - PR} height={Math.max(0, mspY - PT)} /></clipPath>
            <clipPath id={`${uid}-b`}><rect x={PL} y={mspY} width={W - PL - PR} height={Math.max(0, (H - PB) - mspY)} /></clipPath>
          </defs>
        )}
        {band && (<>
          <polygon points={band} fill="var(--ks-green-tint)" clipPath={`url(#${uid}-a)`} />
          <polygon points={band} fill="var(--ks-saffron-tint)" clipPath={`url(#${uid}-b)`} />
        </>)}
        <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--ks-border-strong)" />
        <text x={PL} y={y(max) - 3} fontSize="11" fill="var(--ks-ink-3)">₹{Math.round(max)}</text>
        <text x={PL} y={y(min) + 11} fontSize="11" fill="var(--ks-ink-3)">₹{Math.round(min)}</text>
        {mspY != null && (<>
          <line x1={PL} y1={mspY} x2={W - PR} y2={mspY} stroke="var(--ks-orange)" strokeDasharray="5 4" />
          <text x={W - PR} y={mspY - 3} fontSize="11" fill="var(--ks-orange-dark)" textAnchor="end">MSP ₹{Math.round(mspValue)}</text>
        </>)}
        <path d={path} fill="none" stroke="var(--ks-green)" strokeWidth="2.5" />
        {pts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="3.5" fill="var(--ks-green-dark)">
            <title>{series[i].date}: ₹{series[i].price}</title>
          </circle>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead><tr><th>{t('col_date')}</th><th>₹</th></tr></thead>
        <tbody>{series.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.price}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

// Horizontal two-bar comparison (season rainfall to-date vs normal).
export function TwoBar({ aLabel, aValue, bLabel, bValue, unit }) {
  const max = Math.max(aValue || 0, bValue || 0, 1)
  const Row = (label, value, color) => (
    <div className="mb-2">
      <div className="flex justify-between text-[14px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}><span>{label}</span><span>{value != null ? `${value} ${unit}` : '—'}</span></div>
      <div className="mt-1 h-4 w-full overflow-hidden rounded" style={{ background: 'var(--ks-bg-soft)' }}>
        <div className="h-full rounded" style={{ width: `${((value || 0) / max) * 100}%`, background: color }} />
      </div>
    </div>
  )
  return <div>{Row(aLabel, aValue, 'var(--ks-green)')}{Row(bLabel, bValue, 'var(--ks-saffron)')}</div>
}

// Monthly average bar chart (past years by month).
export function MonthBars({ months, ariaLabel }) {
  const { t } = useLang()
  const max = Math.max(1, ...months.map((m) => m.avg || 0))
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 140 }} role="img" aria-label={ariaLabel}>
        {months.map((m) => (
          <div key={m.label} className="flex flex-1 flex-col items-center justify-end">
            <div className="w-full rounded-t" style={{ height: `${((m.avg || 0) / max) * 110}px`, background: 'var(--ks-green)' }} title={`${m.label}: ₹${m.avg}`} />
            <span className="mt-1 text-[10px]" style={{ color: 'var(--ks-ink-3)' }}>{m.label}</span>
          </div>
        ))}
      </div>
      <table className="sr-only"><caption>{ariaLabel}</caption><tbody>{months.map((m) => <tr key={m.label}><td>{m.label}</td><td>{m.avg}</td></tr>)}</tbody></table>
    </div>
  )
}
