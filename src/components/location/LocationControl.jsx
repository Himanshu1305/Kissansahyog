// Batch 7L-1 — the one location control (home, browse, /mausam, /msp, /fasal-salah, /kisan-mela).
// It reads and writes the shared location from LocationProvider; it holds no location of its own.
//
//   location set      → banner "Showing results for {place}. Change"
//   nothing set       → the pre-permission card (BEFORE any browser prompt): Share / Not now
//   refused / not now → an open text box "Type your village or town" with live suggestions
//   no match          → "Did you mean…?" with the closest spellings from the places list
//   still nothing     → picker: district (6) → town
// No pincode anywhere, and never a silent default place.
import { useMemo, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { useUserLocation } from '../../lib/location/LocationProvider'
import {
  DIVISION_DISTRICTS, placeName, districtName, exactPlace, suggestPlaces, closestPlaces,
  placesInDistrict, geocodeTyped,
} from '../../lib/location/places'

const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }
const primaryBtn = 'inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-[15px] font-bold text-white'
const ghostBtn = 'inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-[15px] font-bold'
const ghostStyle = { background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-green-dark)' }
const optionBtn = 'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[15px] font-semibold'
const optionStyle = { background: '#fff', border: '1px solid var(--ks-border-strong)', color: 'var(--ks-ink)' }

export default function LocationControl() {
  const { t, lang } = useLang()
  const { location, places, setLocation, shareDevice, declineShare, detecting, canAskDevice, declined } = useUserLocation()
  const [mode, setMode] = useState(null) // null | 'type' | 'mean' | 'picker'
  const [skipCard, setSkipCard] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState(null)
  const [district, setDistrict] = useState(null)
  const [lookup, setLookup] = useState(null) // null | 'busy' | 'none' | { lat, lng, label, detail }

  const suggestions = useMemo(() => suggestPlaces(query, places), [query, places])
  const closest = useMemo(() => {
    const seen = new Set()
    return [...suggestions, ...closestPlaces(query, places)].filter((p) => (seen.has(p.name_en + p.district) ? false : seen.add(p.name_en + p.district))).slice(0, 5)
  }, [query, places, suggestions])

  const showCard = !location && canAskDevice && !declined && !skipCard && mode == null
  const step = mode || (!location && !showCard ? 'type' : null)

  function reset() { setMode(null); setQuery(''); setNotice(null); setDistrict(null); setLookup(null) }
  function choose(p, source) {
    setLocation({ lat: p.lat, lng: p.lng, label: placeName(p, lang), source })
    reset()
  }

  async function share() {
    setNotice(null)
    const res = await shareDevice(lang)
    if (res === 'ok') { reset(); return }
    // Refused or unavailable: fall back to the saved place (the banner) or, with none, the text box.
    setSkipCard(true)
    setNotice(t(res === 'denied' ? 'loc_share_refused' : 'loc_share_unavailable'))
    setMode(location ? null : 'type')
  }

  function submitTyped(e) {
    e?.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    setLookup(null); setNotice(null)
    const hit = exactPlace(q, places)
    if (hit) { choose(hit, 'typed'); return }
    setMode(closest.length ? 'mean' : 'picker')
    if (!closest.length) setNotice(t('loc_no_match').replace('{q}', q))
  }

  async function runLookup() {
    setLookup('busy')
    const r = await geocodeTyped(query)
    if (r) { setLookup(r); return }
    setLookup('none'); setMode('picker'); setNotice(t('loc_no_match').replace('{q}', query.trim()))
  }

  const towns = district ? placesInDistrict(district, places, lang) : []

  return (
    <div data-testid="location-control" className="space-y-2">
      {/* Banner — a location is set. */}
      {location && (
        <p data-testid="location-banner" data-source={location.source} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold" style={{ color: 'var(--ks-ink-2)' }}>
          <span>📍 {t('loc_showing').replace('{place}', location.label || t('loc_your_location'))}</span>
          <button type="button" data-testid="location-change" onClick={() => (mode ? reset() : setMode('type'))} className="min-h-0 font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>
            {t(mode ? 'cancel' : 'loc_change_short')}
          </button>
        </p>
      )}

      {notice && <p data-testid="location-notice" className="text-[14px] font-semibold" style={{ color: 'var(--ks-orange-dark)' }}>{notice}</p>}
      {detecting && <p className="text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>{t('loc_detecting')}</p>}

      {/* Pre-permission card — shown BEFORE the browser's own prompt. */}
      {showCard && (
        <div data-testid="location-prompt" style={{ ...card, background: 'var(--ks-green-tint)', borderColor: 'var(--ks-green)' }}>
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink)' }}>📍 {t('loc_card_text')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" data-testid="location-share" disabled={detecting} onClick={share} className={`${primaryBtn} disabled:opacity-60`} style={{ background: 'var(--ks-green)' }}>{t('loc_share')}</button>
            <button type="button" data-testid="location-not-now" onClick={() => { declineShare(); setMode('type') }} className={ghostBtn} style={ghostStyle}>{t('loc_not_now')}</button>
          </div>
        </div>
      )}

      {/* Type a village or town — live suggestions from the places list. */}
      {step === 'type' && (
        <form data-testid="location-type" onSubmit={submitTyped} style={card}>
          <label htmlFor="ks-loc-input" className="block text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('loc_type_label')}</label>
          <div className="mt-2 flex gap-2">
            <input
              id="ks-loc-input" data-testid="location-input" type="text" autoComplete="off" enterKeyHint="search"
              value={query} onChange={(e) => { setQuery(e.target.value); setNotice(null) }}
              className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg px-3 text-[16px]" style={{ border: '1px solid var(--ks-border-strong)' }}
            />
            <button type="submit" data-testid="location-find" className={primaryBtn} style={{ background: 'var(--ks-green)' }}>{t('loc_find')}</button>
          </div>
          {suggestions.length > 0 && (
            <ul data-testid="location-suggestions" className="mt-2 space-y-1.5">
              {suggestions.map((p) => (
                <li key={`${p.name_en}-${p.district}`}>
                  <button type="button" onClick={() => choose(p, 'typed')} className={optionBtn} style={optionStyle}>
                    <span>{placeName(p, lang)}</span>
                    <span className="shrink-0 text-[13px] font-normal" style={{ color: 'var(--ks-ink-3)' }}>{districtName(p.district, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {canAskDevice && (
              <button type="button" data-testid="location-share-again" disabled={detecting} onClick={share} className="min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>📍 {t('loc_share')}</button>
            )}
            <button type="button" data-testid="location-open-picker" onClick={() => { setMode('picker'); setNotice(null) }} className="min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{t('loc_pick_from_list')}</button>
          </div>
        </form>
      )}

      {/* Did you mean…? — closest spellings; the map lookup runs only when asked. */}
      {step === 'mean' && (
        <div data-testid="location-did-you-mean" style={card}>
          <p className="text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('loc_did_you_mean')}</p>
          <ul className="mt-2 space-y-1.5">
            {closest.map((p) => (
              <li key={`${p.name_en}-${p.district}`}>
                <button type="button" onClick={() => choose(p, 'typed')} className={optionBtn} style={optionStyle}>
                  <span>{placeName(p, lang)}</span>
                  <span className="shrink-0 text-[13px] font-normal" style={{ color: 'var(--ks-ink-3)' }}>{districtName(p.district, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
          {lookup && typeof lookup === 'object' ? (
            <button type="button" data-testid="location-lookup-use" onClick={() => { setLocation({ lat: lookup.lat, lng: lookup.lng, label: lookup.label, source: 'typed' }); reset() }} className={`${optionBtn} mt-2`} style={{ ...optionStyle, borderColor: 'var(--ks-green)' }}>
              <span>{t('loc_lookup_use').replace('{place}', lookup.label)}</span>
              <span className="shrink-0 text-[13px] font-normal" style={{ color: 'var(--ks-ink-3)' }}>{lookup.detail}</span>
            </button>
          ) : (
            <button type="button" data-testid="location-lookup" disabled={lookup === 'busy'} onClick={runLookup} className="mt-2 min-h-[44px] text-left text-[14px] font-bold underline disabled:opacity-60" style={{ color: 'var(--ks-green-dark)' }}>
              {lookup === 'busy' ? t('loading') : t('loc_lookup').replace('{q}', query.trim())}
            </button>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4">
            <button type="button" data-testid="location-none" onClick={() => { setMode('picker'); setNotice(null) }} className="min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{t('loc_none_of_these')}</button>
            <button type="button" onClick={() => setMode('type')} className="min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-ink-3)' }}>{t('loc_type_again')}</button>
          </div>
        </div>
      )}

      {/* Picker — district, then town. */}
      {step === 'picker' && (
        <div data-testid="location-picker" style={card}>
          {!district ? (<>
            <p className="text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('loc_pick_district')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIVISION_DISTRICTS.map((d) => (
                <button key={d.en} type="button" data-testid={`location-district-${d.en}`} onClick={() => setDistrict(d.en)} className={`${ghostBtn} w-full`} style={ghostStyle}>{lang === 'hi' ? d.hi : d.en}</button>
              ))}
            </div>
          </>) : (<>
            <p className="text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('loc_pick_town').replace('{district}', districtName(district, lang))}</p>
            <div data-testid="location-towns" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {towns.map((p) => (
                <button key={p.name_en} type="button" onClick={() => choose(p, 'picked')} className={`${ghostBtn} w-full`} style={ghostStyle}>{placeName(p, lang)}</button>
              ))}
            </div>
            <button type="button" onClick={() => setDistrict(null)} className="mt-2 min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-ink-3)' }}>← {t('loc_pick_district')}</button>
          </>)}
          <div><button type="button" onClick={() => { setMode('type'); setDistrict(null); setNotice(null) }} className="min-h-[44px] text-[14px] font-bold underline" style={{ color: 'var(--ks-ink-3)' }}>{t('loc_type_again')}</button></div>
        </div>
      )}
    </div>
  )
}
