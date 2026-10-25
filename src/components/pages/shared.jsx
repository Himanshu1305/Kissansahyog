// Shared building blocks for the /mausam and /msp pages. Same tokens + kit as the
// v4 homepage. Charts are inline SVG with a screen-reader table fallback.
import { useState, useEffect, useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { WhatsAppIcon } from '../home/kit'
import { faqQ, faqA, subscribeAlert } from '../../lib/pages/pagesApi'
// Pure staleness classifier (unit-testable, no JSX) — re-exported so Msp.jsx's existing
// import site keeps working.
import { priceStaleness } from '../../lib/mandi/staleness'
import CollapsibleSection from '../CollapsibleSection'
export { priceStaleness }

// JSON-LD injector
export function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

// InfoTip — a tappable "ⓘ" that opens a short point-of-need explanation. Click to
// open (mobile-first — no hover), dismiss by tapping outside or the ✕. Anchors left
// or right depending on screen position so the popover never causes horizontal scroll.
export function InfoTip({ label, label_en }) {
  const { t, lang } = useLang()
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
      <button type="button" aria-label={t('infotip_more')} aria-expanded={open} onClick={toggle}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[13px] font-bold leading-none"
        style={{ background: 'var(--ks-blue-tint)', color: 'var(--ks-blue)', minHeight: 0 }}>ⓘ</button>
      {open && (
        <span role="tooltip" className="absolute z-50 mt-1 block rounded-lg p-3 text-left text-[13px] font-normal leading-snug shadow-lg"
          style={{ top: '100%', [side]: 0, width: 'min(240px, 78vw)', background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-ink-2)' }}>
          <button type="button" aria-label={t('infotip_close')} onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            className="absolute right-1 top-1 text-[14px] leading-none" style={{ color: 'var(--ks-ink-3)', minHeight: 0 }}>✕</button>
          <span className="block pr-4">{text}</span>
        </span>
      )}
    </span>
  )
}

// Phase 4c — one consistent, honest staleness rule for every mandi price on the site.
// The specific date is ALWAYS shown next to a non-today price (never hidden in a tooltip):
//   'today'     → plain price, no tag
//   'yesterday' → neutral "कल का भाव (dd/mm)" tag (exactly one day old)
//   'older'     → amber "पिछला भाव (dd/mm)" tag (more than one day old — honest elapsed time)
//   null        → no date (used with a null price → the "—" never-recorded treatment)
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

// Dated staleness tag. `kind` = 'yesterday' (neutral) | 'older' (amber). The date (dd/mm)
// is always rendered so a farmer sees exactly how old the price is.
// Batch 10F: `fmt` (optional) formats the date, e.g. "17 अक्टू" on /msp; without it dd/mm as before.
export function StaleTag({ date, kind = 'older', fmt }) {
  const { t } = useLang()
  const [, m, d] = String(date).split('-')
  const older = kind === 'older'
  const style = older
    ? { background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)', border: '1px solid var(--ks-orange)' }
    : { background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)', border: '1px solid var(--ks-border-strong)' }
  return (
    <span className="ml-1 inline-block whitespace-nowrap rounded px-1 py-0.5 align-middle text-[11px] font-bold" data-testid="stale-tag" style={style}>
      {t(older ? 'mandi_price_older' : 'mandi_price_yesterday')} ({fmt ? fmt(date) : `${d}/${m}`})
    </span>
  )
}

// One price cell used by every mandi table: plain (today) / dated "कल का भाव" or "पिछला भाव"
// tag (non-today) / "—" (never recorded, with a hover/tap tooltip). Keeps the whole site's
// price labelling identical and always date-visible for non-today prices.
export function PriceCell({ price, date, bold, fmt }) {
  const { t } = useLang()
  if (price == null) {
    return <span title={t('mandi_not_recorded')} data-testid="price-missing" style={{ color: 'var(--ks-ink-3)', cursor: 'help' }}>—</span>
  }
  const st = priceStaleness(date)
  return (
    <span>
      {bold ? <b>{rupee(price)}</b> : rupee(price)}
      {st === 'yesterday' && <StaleTag date={date} kind="yesterday" fmt={fmt} />}
      {st === 'older' && <StaleTag date={date} kind="older" fmt={fmt} />}
    </span>
  )
}

// PageExplainer — soft-green card, Hindi-first (EN via global toggle).
// Batch 10F: `collapsible` = { page, id, primary } turns it into a CollapsibleSection (/msp, /mausam);
// without it (every other page) it renders exactly as before.
const EXPLAINER_BOX = { background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }
export function PageExplainer({ title, lines, collapsible }) {
  if (collapsible) {
    return (
      <CollapsibleSection {...collapsible} title={title} h2Class="text-[18px] font-bold" style={EXPLAINER_BOX}>
        <div className="space-y-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </CollapsibleSection>
    )
  }
  return (
    <section style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
      <h2 className="text-[18px] font-bold" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      <div className="mt-1 space-y-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
        {lines.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </section>
  )
}

// LocationControl (Batch 7L-1) lives in components/location and reads the shared location
// from LocationProvider. Re-exported here so the pages that import it from this file keep working.
export { default as LocationControl } from '../location/LocationControl'

// Batch 10F: `collapsible` = { page, id, primary } wraps the whole FAQ in a CollapsibleSection.
export function FaqAccordion({ faqs, collapsible }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(null)
  if (!faqs?.length) return null
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: faqQ(f, lang), acceptedAnswer: { '@type': 'Answer', text: faqA(f, lang) } })) }
  const list = (
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
  )
  if (collapsible) {
    return (
      <CollapsibleSection {...collapsible} title={t('scheme_faqs')}>
        <JsonLd data={ld} />
        {list}
      </CollapsibleSection>
    )
  }
  return (
    <section>
      <h2 className="mb-2 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{t('scheme_faqs')}</h2>
      <JsonLd data={ld} />
      {list}
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
export function DailyUpdateSignup({ sourcePage, heading }) {
  const { t, lang } = useLang()
  const [phone, setPhone] = useState('')
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
      await subscribeAlert({ phone, pincode: '', crops, alertTypes: ['weather', 'price'], consentText: t('consent_sentence'), sourcePage })
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

// The /msp trend chart moved to ./TrendChart.jsx in Batch 10F (dates on the dots, labels, table).

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
