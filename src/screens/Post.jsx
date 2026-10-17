import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Field, Notice, Spinner, TextInput } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import ConsentChecklist, { CONSENT_ITEM_IDS } from '../components/ConsentChecklist'
import PhotoPicker from '../components/PhotoPicker'
import PromoBento from '../components/PromoBento'
import HelpModal, { HelpButton } from '../components/HelpModal'
import { CATEGORIES, CATEGORY_META, PHOTO_LIMITS, PROVIDER_CATS } from '../lib/listings/catalog'
import { CatIcon } from '../components/CatIcon'
import { getCategory, isEnabled } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { createListing, fetchResolvedVillages, findListingByRequest } from '../lib/listings/listingsApi'
import { drainGeocodeQueue } from '../lib/location/geocodeQueue'
import { getPostPosition } from '../lib/location/postPosition'
import { WIDE_ELIGIBLE_CATEGORIES } from '../lib/distance'
import WhatsAppJoin from '../components/WhatsAppJoin'
import { uploadPhotos } from '../lib/listings/photos'

// Post flow in 3 steps (Batch1 item 5), with a 1/3 step indicator. Back keeps all
// entered data.
//   1. What?      — category tiles (Land last) + देना/बेचना (offer) · चाहिए (requirement)
//   2. Details    — the category's fields + a small किसान/व्यापारी toggle
//   3. Confirm    — asset village (primary distance anchor) + phone check + the
//                   itemised consent checklist (one box per thing). Rules + "my
//                   information is correct" is asked ONCE, in the checklist; a separate
//                   declaration box appears only when there is something extra to
//                   declare (genuine provider / land ownership) — Batch 7D.
// Batch 9B: every Post form carries a random request id (re-used by every retry of that form, new
// after a success or a reset), so a Post whose reply was lost never creates a second listing; and a
// vendor listing / provider category asks "I agree" before the number may be shown.

const SLOW_MS = 20000

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export default function Post() {
  const { t, lang } = useLang()
  const { user, acceptListingConsents } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [step, setStep] = useState(1)           // 1 | 2 | 3
  const [listingType, setListingType] = useState(null)
  const [category, setCategory] = useState(null)
  const [source, setSource] = useState('farmer') // 'farmer' | 'vendor'
  const [details, setDetails] = useState(null)
  const [village, setVillage] = useState('')
  const [villages, setVillages] = useState([])
  const [wideVisibility, setWideVisibility] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [consents, setConsents] = useState({})
  const [photoFiles, setPhotoFiles] = useState([])
  const [coordinates, setCoordinates] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locStep, setLocStep] = useState(null)       // 'cached' | 'fresh' (Batch 9, 1D)
  const [locFallback, setLocFallback] = useState(false)
  const [mapUrl, setMapUrl] = useState('')
  const [extras, setExtras] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [created, setCreated] = useState(null)
  const [requestId, setRequestId] = useState(newRequestId)
  const [contactConsent, setContactConsent] = useState(false)
  const [slow, setSlow] = useState(false)
  const inFlight = useRef(false)   // set synchronously: a double tap cannot start a second Post
  const sentOnce = useRef(false)   // a create request with this requestId has been sent before

  // Preselect category + offer/requirement from ?cat=&type= (the cold-storage,
  // greenhouse and jugaad CTAs deep-link into the form). Runs once on mount.
  useEffect(() => {
    const c = params.get('cat')
    const ty = params.get('type')
    if (c && isEnabled(c)) setCategory(c)
    if (ty === 'offer' || ty === 'requirement') setListingType(ty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mod = category ? getCategory(category) : null
  const needsSelfDecl = mod ? mod.needsSelfDeclaration(listingType) : false
  const needsProviderDecl = listingType === 'offer' && PROVIDER_CATS.includes(category)
  const canWiden = WIDE_ELIGIBLE_CATEGORIES.includes(category)
  const photoLimit = PHOTO_LIMITS[category] || PHOTO_LIMITS.default
  const allConsentsAccepted = CONSENT_ITEM_IDS.every((id) => consents[id])
  // Vendor listings and provider OFFERS (the same offers that carry the provider declaration). A farmer
  // asking for a tractor is not a provider: farmer requirements stay exactly as before.
  const needsContactConsent = source === 'vendor' || needsProviderDecl
  const contactConsentOk = !needsContactConsent || contactConsent

  // The agreement belongs to this listing's kind: switching back to a farmer listing in a
  // non-provider category removes the box and its tick.
  useEffect(() => { if (!needsContactConsent) setContactConsent(false) }, [needsContactConsent])

  // When a category is chosen (or changed), (re)initialise its details + load its
  // extras. Re-selecting the SAME category does not fire this, so data survives Back.
  useEffect(() => {
    if (!category) return
    let alive = true
    setDetails(getCategory(category).initialDetails())
    setExtras(null)
    loadExtras(category).then((e) => alive && setExtras(e))
    fetchResolvedVillages().then((v) => alive && setVillages(v)).catch(() => {})
    return () => { alive = false }
  }, [category])

  // Step 3: an empty asset-village field starts with the profile's village (editable; typed
  // text is never overwritten; coordinates/geocoding untouched — the name is resolved on submit).
  useEffect(() => {
    if (step === 3 && !village && user?.village_town) setVillage(user.village_town)
  }, [step, user?.village_town]) // eslint-disable-line react-hooks/exhaustive-deps

  function back() {
    setError(null)
    if (created) return
    if (step === 3) setStep(2)
    else if (step === 2) setStep(1)
    else navigate('/home')
  }

  function goDetails() {
    setError(null)
    if (!category || !listingType) return
    setStep(2)
  }

  function goConfirm() {
    setError(null)
    const vErr = mod.validate(details, listingType, t, { lang, extras })
    if (vErr) { setError(vErr); return }
    setStep(3)
  }

  async function submit() {
    if (inFlight.current) return
    setError(null)
    const vname = String(category === 'transport' ? details?.from_location : village).trim()
    if (category === 'transport' && !String(details?.from_location || '').trim()) { setError(t('err_transport_from_required')); return }
    if (category === 'transport' && !String(details?.to_location || '').trim()) { setError(t('err_transport_to_required')); return }
    if (vname.length < 2) { setError(t('err_asset_village_required')); return }
    if (!declarationOk || !allConsentsAccepted) { setError(t('consent_required')); return }
    if (!contactConsentOk) { setError(t('contact_consent_required')); return }
    if (mapUrl && !isGoogleMapsUrl(mapUrl)) { setError(t('maps_link_invalid')); return }
    inFlight.current = true
    setBusy(true)
    setSlow(false)
    const rid = requestId
    let settled = false
    // An earlier Post of this same form may have reached the server although its reply was lost:
    // look before sending again, and go to that listing instead of creating a second one.
    const landOn = (found) => {
      if (settled) return
      settled = true
      navigate(`/listing/${found.id}`, { replace: true, state: { alreadySaved: true } })
    }
    const timer = setTimeout(() => {
      setSlow(true)
      findListingByRequest(user.id, rid).then((found) => found && landOn(found))
    }, SLOW_MS)
    try {
      if (sentOnce.current) {
        const found = await findListingByRequest(user.id, rid)
        if (found) { landOn(found); return }
      }
      const baseDetails = mod.finalizeDetails
        ? await mod.finalizeDetails(details, { actorId: user.id, user, listingType })
        : details
      // Upload completes before the RPC, so no listing can point at a failed photo. The request id
      // names the photo folder, so a retry re-uses the same files instead of uploading copies.
      const photo_urls = photoFiles.length ? await uploadPhotos(photoFiles, user.id, photoLimit, 'listings', rid) : (baseDetails.photo_urls || [])
      const finalDetails = { ...baseDetails, ...(needsProviderDecl ? { provider_declared: true } : {}), ...(photo_urls.length ? { photo_urls } : {}), ...(mapUrl ? { map_url: mapUrl.trim() } : {}) }
      await acceptListingConsents(consents)
      sentOnce.current = true
      const listing = await createListing({
        actorId: user.id,
        listingType,
        category,
        details: finalDetails,
        villageName: vname,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        selfDeclared: needsSelfDecl, // folded into the single confirm checkbox
        listingSource: source,
        wideVisibility: canWiden ? wideVisibility : false,
        rulesAgreed: !!consents.posting_rules, // the checklist's rules + accuracy item
        clientRequestId: rid,
        contactConsent: needsContactConsent && contactConsent,
      })
      if (settled) return
      settled = true
      if (listing?.geocoding_status === 'pending') drainGeocodeQueue().catch(() => {})
      setCreated(listing)
      setRequestId(newRequestId())
      sentOnce.current = false
    } catch (err) {
      // A category may word a server refusal itself (equipment specs, Batch 9C: same text as its form check).
      if (!settled) setError(mod.errorText?.(err, { details, listingType, lang, extras }) || t(err.i18nKey || 'err_unknown'))
    } finally {
      clearTimeout(timer)
      inFlight.current = false
      setBusy(false)
      setSlow(false)
    }
  }

  function resetAll() {
    setCreated(null); setStep(1); setListingType(null); setCategory(null)
    setSource('farmer'); setDetails(null); setVillage(''); setWideVisibility(false); setConfirmChecked(false); setConsents({}); setPhotoFiles([]); setCoordinates(null); setLocStep(null); setLocFallback(false); setMapUrl('')
    setContactConsent(false); setRequestId(newRequestId()); sentOnce.current = false
  }

  // Batch 9 (1D) — a position the phone already has (≤ 10 min), else a fresh low-accuracy fix
  // (≤ 20 s), else a clear message and the cursor in the village field (the manual path).
  async function useCurrentLocation() {
    if (locating) return
    setLocating(true); setLocFallback(false)
    try {
      const pos = await getPostPosition(navigator.geolocation)
      setCoordinates({ latitude: pos.latitude, longitude: pos.longitude })
      setLocStep(pos.step)
    } catch {
      setLocFallback(true)
      // Bring the village field into view (not focus: focusing opens its suggestion list, which
      // would cover the message). The message sits right under the button.
      document.getElementById(category === 'transport' ? 'f_transport_from' : 'f_asset_village')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } finally {
      setLocating(false)
    }
  }

  // Extra declaration, only where one applies. The rules + accuracy consent is NOT repeated here.
  const declarationKey = needsSelfDecl ? 'post_declare_owner' : needsProviderDecl ? 'post_declare_provider' : null
  const declarationOk = !declarationKey || confirmChecked

  const title = created ? t('post_success') : `${t('post_listing')} · ${step}/3`

  return (
    <Screen title={title} onBack={created ? undefined : back}>
      {error && <Notice tone="error">{error}</Notice>}

      {/* ---- Step 1: What? (category + offer/requirement) ---- */}
      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
      <div className="lg:col-span-2">
      {!created && step === 1 && (
        <div>
          {/* किसान / व्यापारी toggle (default किसान) — first question on the form (Batch 10A Task A).
              Same `source` state as before; switching it never resets other fields. */}
          <div className="mb-5" data-testid="post-source-block">
            <h2 className="mb-2 text-xl font-bold text-stone-800">{t('post_who_posting')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="post-source-farmer"
                aria-pressed={source === 'farmer'}
                onClick={() => setSource('farmer')}
                className={`flex min-h-[56px] items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-base font-bold ${source === 'farmer' ? 'border-[var(--ks-green)] bg-[var(--ks-green)] text-white' : 'border-stone-300 bg-white text-stone-800'}`}
              >
                👨‍🌾 {t('source_farmer')}
                {source === 'farmer' && <span aria-hidden="true">✓</span>}
              </button>
              <button
                type="button"
                data-testid="post-source-vendor"
                aria-pressed={source === 'vendor'}
                onClick={() => setSource('vendor')}
                className={`flex min-h-[56px] items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-base font-bold ${source === 'vendor' ? 'border-amber-700 bg-amber-700 text-white' : 'border-stone-300 bg-white text-stone-800'}`}
              >
                🏪 {t('source_vendor')}
                {source === 'vendor' && <span aria-hidden="true">✓</span>}
              </button>
            </div>
            {source === 'vendor' && (
              <div className="mt-2 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p>🏪 {t('vendor_note')}</p>
              </div>
            )}
          </div>

          <h2 className="mb-1 text-xl font-bold text-stone-800">{t('post_step_what')}</h2>
          {/* Small helper link to the posting steps on /how-to-use (Batch 7C). */}
          <p className="mb-3"><Link to="/how-to-use#listing-kaise-dalein" data-testid="post-how-to-use" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-green-800 underline">{t('post_howto_help')}</Link></p>
          <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3">
            {CATEGORIES.map((c) => {
              const enabled = isEnabled(c)
              const active = category === c
              return (
                <button
                  key={c}
                  type="button"
                  data-testid={`post-cat-${c}`}
                  aria-pressed={active}
                  disabled={!enabled}
                  onClick={() => enabled && setCategory(c)}
                  className={`flex min-h-[56px] items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-base font-bold ${
                    active ? 'border-[var(--ks-green)] bg-[var(--ks-green-tint)] text-[var(--ks-green-dark)]' : 'border-stone-200 bg-white text-stone-800'
                  } ${enabled ? '' : 'opacity-50'}`}
                >
                  <CatIcon category={c} /> <span className="flex-1">{CATEGORY_META[c][lang]}</span>
                  {active && <span aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>

          <h2 className="mb-3 text-xl font-bold text-stone-800">{t('post_q_type')}</h2>
          <div className="mb-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="post-type-offer"
              aria-pressed={listingType === 'offer'}
              onClick={() => setListingType('offer')}
              className={`min-h-[52px] rounded-xl border-2 px-3 py-2 text-base font-bold ${listingType === 'offer' ? 'border-[var(--ks-green)] bg-[var(--ks-green)] text-white' : 'border-stone-300 bg-white text-stone-800'}`}
            >
              🤝 {t('post_offer_toggle')}
            </button>
            <button
              type="button"
              data-testid="post-type-requirement"
              aria-pressed={listingType === 'requirement'}
              onClick={() => setListingType('requirement')}
              className={`min-h-[52px] rounded-xl border-2 px-3 py-2 text-base font-bold ${listingType === 'requirement' ? 'border-[var(--ks-saffron)] bg-[var(--ks-saffron)] text-white' : 'border-stone-300 bg-white text-stone-800'}`}
            >
              🔎 {t('post_req_toggle')}
            </button>
          </div>

          <BigButton data-testid="post-next" onClick={goDetails} disabled={!category || !listingType}>
            {t('continue')}
          </BigButton>
        </div>
      )}

      {/* ---- Step 2: Details ---- */}
      {!created && step === 2 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="flex items-center gap-1 text-lg font-bold text-stone-800">
              <CatIcon category={category} /> {CATEGORY_META[category][lang]}
            </h2>
            <HelpButton categoryKey={category} onOpen={() => setHelpOpen(true)} />
          </div>
          {helpOpen && <HelpModal categoryKey={category} onClose={() => setHelpOpen(false)} />}

          {!extras || !details ? (
            <Spinner />
          ) : (
            <>
              <mod.Fields details={details} setDetails={setDetails} extras={extras} listingType={listingType} user={user} error={error} />

              <PhotoPicker files={photoFiles} onChange={(files) => { setPhotoFiles(files); if (category === 'jugaad') setDetails((d) => ({ ...d, __photoFiles: files })) }} limit={photoLimit} className="my-3" />

              {mod.extraDisclaimerKey && <DisclaimerBanner which={mod.extraDisclaimerKey} className="my-4" />}

              <BigButton data-testid="post-next" onClick={goConfirm}>{t('continue')}</BigButton>
            </>
          )}
        </div>
      )}

      {/* ---- Step 3: Location + confirm ---- */}
      {!created && step === 3 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-stone-800">{t('post_step_location')}</h2>

          {/* Asset village — the primary distance anchor (autocomplete of known villages). */}
          <div className="mb-4 rounded-2xl border-2 border-green-700 bg-green-50 p-4">
            {category === 'transport' ? <div className="grid gap-2 md:grid-cols-2">
              <Field label={t('transport_from')} htmlFor="f_transport_from" required>
                <TextInput id="f_transport_from" list="known-villages" placeholder={t('village_ph')} value={details?.from_location || ''} onChange={(e) => setDetails((d) => ({ ...d, from_location: e.target.value }))} />
              </Field>
              <Field label={t('transport_to')} htmlFor="f_transport_to" required>
                <TextInput id="f_transport_to" list="known-villages" placeholder={t('village_ph')} value={details?.to_location || ''} onChange={(e) => setDetails((d) => ({ ...d, to_location: e.target.value }))} />
              </Field>
            </div> : <Field label={t('field_asset_village')} htmlFor="f_asset_village" required hint={t('asset_village_hint')}>
              <TextInput
                id="f_asset_village"
                list="known-villages"
                placeholder={t('village_ph')}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              />
            </Field>}
            <datalist id="known-villages">{villages.map((v) => <option key={v} value={v} />)}</datalist>
            <button type="button" data-testid="post-location-current" onClick={useCurrentLocation} disabled={locating} aria-busy={locating} className="mt-2 min-h-[44px] rounded-xl border-2 border-green-700 px-3 py-2 text-sm font-bold text-green-800 disabled:opacity-70">{locating ? t('post_location_finding') : t('location_current')}</button>
            {coordinates && <p data-testid="post-location-coords" data-step={locStep || undefined} className="mt-1 text-xs text-green-800">✓ {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</p>}
            {locFallback && !coordinates && <p role="status" data-testid="post-location-fallback" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[15px] font-semibold text-amber-900">{t('post_location_fallback')}</p>}
            <Field label={t('maps_link_label')} htmlFor="f_map_url">
              <TextInput id="f_map_url" type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} onBlur={() => mapUrl && !isGoogleMapsUrl(mapUrl) && setError(t('maps_link_invalid'))} placeholder="https://maps.google.com/..." />
            </Field>
          </div>

          {/* Phone check — buyers call this number (the poster's profile phone). */}
          <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-semibold text-stone-600">📞 {t('post_phone_check')}</p>
            {user?.phone ? (
              <p className="mt-1 text-lg font-bold text-stone-900">{user.phone}</p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-amber-700">{t('post_phone_missing')}</p>
            )}
          </div>

          {/* Wide-visibility opt-in (only the eligible categories). */}
          {canWiden && (
            <label className="my-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <input
                type="checkbox"
                checked={wideVisibility}
                onChange={(e) => setWideVisibility(e.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-amber-600"
                data-testid="wide-visibility-checkbox"
              />
              <span className="text-base text-stone-800">
                <span className="block font-semibold">{t(source === 'vendor' ? 'wide_visibility_label_vendor' : 'wide_visibility_label')}</span>
                <span className="mt-1 block text-sm text-stone-600">{t(source === 'vendor' ? 'wide_visibility_note_vendor' : 'wide_visibility_note')}</span>
              </span>
            </label>
          )}

          {/* Declaration box — only when there is something to declare beyond the checklist
              (provider / land ownership). Rules + accuracy live in the checklist below. */}
          {declarationKey && (
            <label className="my-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-green-700"
                data-testid="rules-agree-checkbox"
              />
              <span className="text-sm leading-relaxed text-stone-800">
                {t(declarationKey)}
                {/* Jugaad offers: the no-road-vehicle rule is one line inside this declaration (Batch 2 item D). */}
                {category === 'jugaad' && listingType === 'offer' && (
                  <span className="mt-1 block text-sm text-stone-600">{t('jugaad_not_road_vehicle')}</span>
                )}
              </span>
            </label>
          )}

          {/* Batch 9B — vendor listings and provider categories: the number may be shown, but only
              after the owner agrees on this listing (the same for every owner). */}
          {needsContactConsent && (
            <label data-testid="contact-consent-box" className="my-4 flex min-h-[56px] cursor-pointer items-start gap-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
              <input
                type="checkbox"
                checked={contactConsent}
                onChange={(e) => setContactConsent(e.target.checked)}
                className="mt-1 h-7 w-7 shrink-0 accent-amber-600"
                data-testid="contact-consent-checkbox"
              />
              <span className="min-w-0 text-base leading-relaxed text-stone-900">
                <span className="block">📞 {t('contact_consent_text')}</span>
                <span className="mt-1 block font-bold">{t('contact_consent_agree')}</span>
              </span>
            </label>
          )}

          <ConsentChecklist value={consents} onChange={setConsents} className="my-4" />

          {busy ? (
            <div data-testid="post-busy">
              <Spinner label={t('posting')} />
              {slow && <p role="status" data-testid="post-slow" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-[15px] font-semibold text-amber-900">{t('post_slow_network')}</p>}
            </div>
          ) : (
            <BigButton data-testid="post-submit" onClick={submit} disabled={!declarationOk || !allConsentsAccepted || !contactConsentOk}>
              {t('submit')}
            </BigButton>
          )}
        </div>
      )}

      {/* ---- Done ---- */}
      {created && (
        <div className="py-6 text-center">
          <div className="text-6xl">✅</div>
          <p className="mt-4 text-xl font-bold text-green-800">{t('post_success')}</p>
          {created?.wide_visibility && (
            <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800" data-testid="wide-badge">📍 {t('wide_badge')}</p>
          )}
          {created?.geocoding_status === 'pending' && (
            /* ks-allow-width: success-state note */
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" data-testid="pending-geocode-note">
              {t('listing_pending_geocode')}
            </p>
          )}
          {/* ks-allow-width: success-state box */}
          <div className="mt-4"><WhatsAppJoin variant="box" src="post_listing" /></div>
          <div className="mt-8 space-y-3">
            <BigButton onClick={() => navigate(`/listing/${created.id}`)}>{t('view_listing')}</BigButton>
            <BigButton variant="secondary" onClick={resetAll}>{t('post_another')}</BigButton>
            <BigButton variant="plain" onClick={() => navigate('/home')}>{t('back')}</BigButton>
          </div>
        </div>
      )}
      </div>
      {!created && <div className="mt-5 lg:sticky lg:top-24 lg:mt-0"><PromoBento page="post" /></div>}
      </div>
    </Screen>
  )
}

function isGoogleMapsUrl(value) {
  try {
    const url = new URL(String(value).trim())
    return url.protocol === 'https:' && (/^maps\.app\.goo\.gl$/i.test(url.hostname) || /^goo\.gl$/i.test(url.hostname) && url.pathname.startsWith('/maps/') || /^(www\.)?google\.com$/i.test(url.hostname) && url.pathname.startsWith('/maps/') || /^maps\.google\.com$/i.test(url.hostname))
  } catch { return false }
}
