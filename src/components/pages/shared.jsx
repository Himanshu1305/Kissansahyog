// Shared building blocks for the /mausam and /msp pages. Same tokens + kit as the
// v4 homepage. Charts are inline SVG with a screen-reader table fallback.
import { useState, useEffect, useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { WhatsAppIcon } from '../home/kit'
import { faqQ, faqA, subscribeAlert } from '../../lib/pages/pagesApi'
import {
  fetchAllPincodes, nearestPincode, savePincode, getRecentLocations, addRecentLocation,
  isGeoPromptDismissed, dismissGeoPrompt, geolocationSupported, SERVICE_AREA_KM, recentKey,
  reverseGeocode, fetchIpCity,
} from '../../lib/location/locationStore'

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

// Phase 4c — one consistent, honest staleness rule for every mandi price on the site.
// The specific date is ALWAYS shown next to a non-today price (never hidden in a tooltip):
//   'today'     → plain price, no tag
//   'yesterday' → neutral "कल का भाव (dd/mm)" tag (exactly one day old)
//   'older'     → amber "पिछला भाव (dd/mm)" tag (more than one day old — honest elapsed time)
//   null        → no date (used with a null price → the "—" never-recorded treatment)
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
export function priceStaleness(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.floor((today - d) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return 'older'
}

// Dated staleness tag. `kind` = 'yesterday' (neutral) | 'older' (amber). The date (dd/mm)
// is always rendered so a farmer sees exactly how old the price is.
export function StaleTag({ date, kind = 'older' }) {
  const { t } = useLang()
  const [, m, d] = String(date).split('-')
  const older = kind === 'older'
  const style = older
    ? { background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)', border: '1px solid var(--ks-orange)' }
    : { background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)', border: '1px solid var(--ks-border-strong)' }
  return (
    <span className="ml-1 inline-block whitespace-nowrap rounded px-1 py-0.5 align-middle text-[11px] font-bold" data-testid="stale-tag" style={style}>
      {t(older ? 'mandi_price_older' : 'mandi_price_yesterday')} ({d}/{m})
    </span>
  )
}

// One price cell used by every mandi table: plain (today) / dated "कल का भाव" or "पिछला भाव"
// tag (non-today) / "—" (never recorded, with a hover/tap tooltip). Keeps the whole site's
// price labelling identical and always date-visible for non-today prices.
export function PriceCell({ price, date, bold }) {
  const { t } = useLang()
  if (price == null) {
    return <span title={t('mandi_not_recorded')} data-testid="price-missing" style={{ color: 'var(--ks-ink-3)', cursor: 'help' }}>—</span>
  }
  const st = priceStaleness(date)
  return (
    <span>
      {bold ? <b>{rupee(price)}</b> : rupee(price)}
      {st === 'yesterday' && <StaleTag date={date} kind="yesterday" />}
      {st === 'older' && <StaleTag date={date} kind="older" />}
    </span>
  )
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

// LocationControl (0027 split) — one shared control used on the homepage, /mausam, /msp
// and /fasal-salah. It produces a split location so WEATHER works for any coordinate on
// Earth while VILLAGE-ANCHORED features stay gated to the seeded MP pilot area:
//   value: {
//     rawCoords: { latitude, longitude } | null,          // weather — global, ungated
//     matchedVillage: { pincode, village_town, distanceKm } | null,  // village features; null if >100km
//     label, source,
//   }
//   onChange: (nextValue) => void
export function LocationControl({ value, onChange, showOutOfArea = true }) {
  const { t } = useLang()
  const [pincodes, setPincodes] = useState([])
  const [manualOpen, setManualOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState([])
  const [outOfArea, setOutOfArea] = useState(null) // { latitude, longitude, pincode, village_town, distanceKm } | null
  const [debug, setDebug] = useState(null) // dev-only: raw lat/lng + accuracy + timestamp + resolved name — ?debug=1
  const [ipSuggest, setIpSuggest] = useState(null) // Phase 2 — { city, latitude, longitude } | null (Cloudflare IP guess)
  const geoOk = geolocationSupported()
  const debugOn = typeof window !== 'undefined' && /(?:\?|&)debug=1(?:&|$)/.test(window.location.search)
  const [showPrompt, setShowPrompt] = useState(!isGeoPromptDismissed())

  useEffect(() => {
    fetchAllPincodes().then(setPincodes).catch(() => {})
    setRecent(getRecentLocations())
    // Phase 2 — before the user has chosen, fetch a silent Cloudflare IP-based city as a
    // soft, non-committal pre-fill (no permission prompt). Absent/edge → cleanly ignored.
    if (!isGeoPromptDismissed()) {
      fetchIpCity().then((g) => { if (g?.city) setIpSuggest(g) }).catch(() => {})
    }
  }, [])

  function commit(loc) {
    // Persist the pincode only for an in-area village match (village-anchored features).
    if (/^\d{6}$/.test(String(loc.matchedVillage?.pincode || ''))) savePincode(loc.matchedVillage.pincode)
    setRecent(addRecentLocation(loc))
    onChange(loc)
  }

  function detect() {
    setError(null); setDetecting(true); setOutOfArea(null); setIpSuggest(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const near = nearestPincode(latitude, longitude, pincodes)
        const inArea = !!near && near.distanceKm <= SERVICE_AREA_KM
        // Resolve a DISPLAY name (never raw coordinates):
        //  - in-area → matchedVillage's own name (1a-ii: keep one name per place across the app)
        //  - far     → reverse-geocode the precise coords (works anywhere on Earth)
        //  - geocode fails → nearest village + "लगभग … के पास" if < 50km, else a generic label
        let placeName = inArea ? near.village_town : null
        if (!inArea) {
          const geo = await reverseGeocode(latitude, longitude)
          placeName = geo
            || (near && near.distanceKm < 50 ? t('loc_near_approx').replace('{v}', near.village_town) : t('loc_your_location'))
        }
        if (debugOn) {
          // 1e/4a — surface the RAW fix (real-device verification) AND the resolved place name.
          setDebug({
            lat: latitude, lng: longitude, accuracy: Math.round(accuracy),
            ts: new Date(pos.timestamp || Date.now()).toISOString(),
            nearest: near ? `${near.village_town} (${Math.round(near.distanceKm)}km)` : 'none',
            resolved: placeName,
          })
        }
        setDetecting(false); setShowPrompt(false); dismissGeoPrompt()
        // ALWAYS commit rawCoords — weather works anywhere on Earth. matchedVillage is set
        // only when the nearest seeded village is within the service area; beyond that it is
        // null and the informational out-of-area notice appears (weather still updates).
        commit({
          rawCoords: { latitude, longitude, placeName: inArea ? null : placeName },
          matchedVillage: inArea ? { pincode: near.pincode, village_town: near.village_town, distanceKm: near.distanceKm } : null,
          label: placeName,
          source: inArea ? 'gps' : 'gps_far',
        })
        // Weather-only pages (/mausam, /fasal-salah) pass showOutOfArea=false: they have no
        // village-anchored features, so a far location just shows its weather with no notice.
        if (inArea || !showOutOfArea) { setOutOfArea(null); if (inArea) setManualOpen(false) }
        else { setOutOfArea(near ? { latitude, longitude, ...near } : { latitude, longitude }); setManualOpen(true) }
      },
      () => {
        setError(t('loc_denied_hint')); setDetecting(false); setShowPrompt(false)
        setManualOpen(true); dismissGeoPrompt()
      },
      // Force a FRESH, high-accuracy fix (no stale OS/browser cache — Phase 1b).
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function applyPincode(pin) {
    const p = String(pin || '').trim()
    if (!/^\d{6}$/.test(p)) { setError(t('err_invalid_pincode')); return }
    const row = pincodes.find((r) => r.pincode === p)
    // A manual pincode is a deliberate in-area choice: it sets BOTH rawCoords (from the
    // pincode's coordinates, for weather) and matchedVillage (for village features).
    commit({
      rawCoords: row?.latitude != null ? { latitude: Number(row.latitude), longitude: Number(row.longitude), placeName: row?.village_town || null } : null,
      matchedVillage: { pincode: p, village_town: row?.village_town || p, distanceKm: 0 },
      label: row?.village_town || p,
      source: 'pincode',
    })
    setPinInput(''); setManualOpen(false); setError(null); setOutOfArea(null); setIpSuggest(null)
    setShowPrompt(false); dismissGeoPrompt() // a pincode is a deliberate choice → close the first-visit prompt
  }

  // Phase 2c — the user accepts the Cloudflare IP-based city guess (approximate). It sets
  // rawCoords (from the IP lat/lng, for weather) + a matchedVillage if that guess happens to
  // fall inside the pilot service area, and uses the IP city as the display name.
  function confirmIp() {
    const s = ipSuggest
    if (!s?.city) return
    const lat = s.latitude, lng = s.longitude
    const near = (lat != null && lng != null) ? nearestPincode(lat, lng, pincodes) : null
    const inArea = !!near && near.distanceKm <= SERVICE_AREA_KM
    commit({
      rawCoords: (lat != null && lng != null) ? { latitude: Number(lat), longitude: Number(lng), placeName: s.city } : null,
      matchedVillage: inArea ? { pincode: near.pincode, village_town: near.village_town, distanceKm: near.distanceKm } : null,
      label: s.city,
      source: 'ip',
    })
    setIpSuggest(null); setShowPrompt(false); setManualOpen(false); setOutOfArea(null); dismissGeoPrompt()
  }

  const chip = 'rounded-full px-3 py-1 text-[13px] font-semibold'
  return (
    <div data-testid="location-control" className="space-y-2">
      {/* Auto-detect prompt — dismissible; not shown once answered/dismissed. Three ordered
          choices: GPS (precise) → Cloudflare IP city (approximate, if resolved) → pincode. */}
      {showPrompt && (
        <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--ks-green-tint)', border: '1px solid var(--ks-green)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold" style={{ color: 'var(--ks-green-dark)' }}>📍 {t('loc_detect_q')} <span className="font-normal" style={{ color: 'var(--ks-ink-3)' }}>({t('loc_precise')})</span></span>
            {geoOk && <button type="button" data-testid="gps-detect" onClick={detect} className={`${chip} text-white`} style={{ background: 'var(--ks-green)' }}>{t('loc_yes')}</button>}
            <button type="button" aria-label="✕" onClick={() => { setShowPrompt(false); dismissGeoPrompt() }} className="ml-auto text-[16px]" style={{ color: 'var(--ks-ink-3)' }}>✕</button>
          </div>
          {ipSuggest?.city && (
            <div className="flex flex-wrap items-center gap-2" data-testid="ip-suggest">
              <span className="text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('loc_ip_maybe').replace('{city}', ipSuggest.city)}</span>
              <button type="button" onClick={confirmIp} className={chip} style={{ background: '#fff', border: '1px solid var(--ks-green)', color: 'var(--ks-green-dark)' }}>{t('loc_ip_confirm')}</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{t('loc_or_pincode')}</span>
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder={t('loc_enter_pincode')}
              value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') applyPincode(pinInput) }}
              className="rounded-lg px-3 py-2 text-[16px]" style={{ border: '1px solid var(--ks-border-strong)', width: 130 }}
              data-testid="pincode-input"
            />
            <button type="button" onClick={() => applyPincode(pinInput)} className={`${chip} text-white`} style={{ background: 'var(--ks-green)' }}>{t('loc_apply')}</button>
          </div>
        </div>
      )}

      {/* Current place + a "change" toggle that reveals the manual controls. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span data-testid="location-label" className="text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>📍 {value.label || t('pincode_label')}{value.matchedVillage?.pincode ? `: ${value.matchedVillage.pincode}` : ''}</span>
        <button type="button" onClick={() => setManualOpen((o) => !o)} className="rounded-full px-3 py-1.5 text-[14px] font-bold" style={{ background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-green)' }}>{t('loc_change')}</button>
      </div>

      {detecting && <p className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('loc_detecting')}</p>}
      {error && <p className="text-[14px]" style={{ color: 'var(--ks-orange-dark)' }}>{error}</p>}

      {/* Out-of-service-area notice (Phase 1c): the nearest seeded village is > 100 km away.
          Weather ALREADY works for the raw location (committed above); this notice is about
          the VILLAGE-anchored features (listings/counts/mandi ranking) only, with an explicit
          opt-in to use the nearest far village for those. */}
      {showOutOfArea && outOfArea && (
        <div data-testid="out-of-area" className="space-y-2 rounded-xl p-3" style={{ background: 'var(--ks-saffron-tint)', border: '1px solid var(--ks-orange)' }}>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>
            {t('loc_out_of_area')}{outOfArea.village_town ? ` — ${t('loc_nearest_available')}: ${outOfArea.village_town} (~${Math.round(outOfArea.distanceKm)} ${t('km_short')})` : ''}
          </p>
          {outOfArea.village_town && (
            <button
              type="button"
              onClick={() => commit({ rawCoords: { latitude: outOfArea.latitude, longitude: outOfArea.longitude }, matchedVillage: { pincode: outOfArea.pincode, village_town: outOfArea.village_town, distanceKm: outOfArea.distanceKm }, label: outOfArea.village_town, source: 'gps_far_optin' })}
              className="rounded-lg px-3 py-2 text-[14px] font-bold text-white" style={{ background: 'var(--ks-orange)' }}
            >
              {t('loc_use_far_anyway').replace('{v}', outOfArea.village_town)}
            </button>
          )}
        </div>
      )}

      {debugOn && debug && (
        <pre data-testid="geo-debug" className="overflow-x-auto rounded-lg p-2 text-[11px]" style={{ background: '#111', color: '#9f9' }}>
          {`raw lat,lng: ${debug.lat}, ${debug.lng}\naccuracy: ±${debug.accuracy} m\ntimestamp: ${debug.ts}\nnearest seeded village: ${debug.nearest}\nresolved place name: ${debug.resolved}`}
        </pre>
      )}

      {/* Manual controls — always reachable, even after a GPS grant (the pincode also lives in
          the first-visit prompt above; guard against rendering two inputs at once). */}
      {manualOpen && !showPrompt && (
        <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder={t('loc_enter_pincode')}
              value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') applyPincode(pinInput) }}
              className="rounded-lg px-3 py-2 text-[16px]" style={{ border: '1px solid var(--ks-border-strong)', width: 140 }}
              data-testid="pincode-input"
            />
            <button type="button" onClick={() => applyPincode(pinInput)} className="rounded-lg px-3 py-2 text-[14px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{t('loc_apply')}</button>
            {geoOk && (
              <button type="button" onClick={detect} className="rounded-lg px-3 py-2 text-[14px] font-bold" style={{ background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-green)' }}>📍 {t('loc_current')}</button>
            )}
          </div>
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('loc_recent')}</span>
              {recent.map((r) => (
                <button key={recentKey(r)} type="button" onClick={() => { commit({ rawCoords: r.rawCoords || null, matchedVillage: r.matchedVillage || null, label: r.label, source: 'recent' }); setOutOfArea(null); setManualOpen(false) }} className={chip} style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{r.label}</button>
              ))}
            </div>
          )}
        </div>
      )}
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
