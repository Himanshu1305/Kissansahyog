import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Field, Notice, Spinner, TextInput } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import ConsentChecklist, { CONSENT_ITEM_IDS } from '../components/ConsentChecklist'
import PhotoPicker from '../components/PhotoPicker'
import PromoBento from '../components/PromoBento'
import HelpModal, { HelpButton } from '../components/HelpModal'
import { CATEGORIES, CATEGORY_META, PHOTO_LIMITS } from '../lib/listings/catalog'
import { CatIcon } from '../components/CatIcon'
import { getCategory, isEnabled } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { createListing, fetchResolvedVillages } from '../lib/listings/listingsApi'
import { drainGeocodeQueue } from '../lib/location/geocodeQueue'
import { WIDE_ELIGIBLE_CATEGORIES } from '../lib/distance'
import WhatsAppJoin from '../components/WhatsAppJoin'
import { uploadPhotos } from '../lib/listings/photos'

// Post flow in 3 steps (Batch1 item 5), with a 1/3 step indicator. Back keeps all
// entered data.
//   1. What?      — category tiles (Land last) + देना/बेचना (offer) · चाहिए (requirement)
//   2. Details    — the category's fields + a small किसान/व्यापारी toggle
//   3. Confirm    — asset village (primary distance anchor) + phone check + ONE
//                   checkbox that covers the rules agreement and, for offer provider
//                   categories, the provider declaration (and land ownership).
const PROVIDER_CATS = ['equipment', 'warehouse', 'greenhouse', 'jugaad']

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
  const [mapUrl, setMapUrl] = useState('')
  const [extras, setExtras] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [created, setCreated] = useState(null)

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
    const vErr = mod.validate(details, listingType, t)
    if (vErr) { setError(vErr); return }
    setStep(3)
  }

  async function submit() {
    setError(null)
    const vname = String(category === 'transport' ? details?.from_location : village).trim()
    if (category === 'transport' && !String(details?.from_location || '').trim()) { setError(t('err_transport_from_required')); return }
    if (category === 'transport' && !String(details?.to_location || '').trim()) { setError(t('err_transport_to_required')); return }
    if (vname.length < 2) { setError(t('err_asset_village_required')); return }
    if (!confirmChecked || !allConsentsAccepted) { setError(t('consent_required')); return }
    if (mapUrl && !isGoogleMapsUrl(mapUrl)) { setError(t('maps_link_invalid')); return }
    setBusy(true)
    try {
      const baseDetails = mod.finalizeDetails
        ? await mod.finalizeDetails(details, { actorId: user.id, user, listingType })
        : details
      // Upload completes before the RPC, so no listing can point at a failed photo.
      const photo_urls = photoFiles.length ? await uploadPhotos(photoFiles, user.id, photoLimit) : (baseDetails.photo_urls || [])
      const finalDetails = { ...baseDetails, ...(needsProviderDecl ? { provider_declared: true } : {}), ...(photo_urls.length ? { photo_urls } : {}), ...(mapUrl ? { map_url: mapUrl.trim() } : {}) }
      await acceptListingConsents(consents)
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
        rulesAgreed: confirmChecked,
      })
      if (listing?.geocoding_status === 'pending') drainGeocodeQueue().catch(() => {})
      setCreated(listing)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setBusy(false)
    }
  }

  function resetAll() {
    setCreated(null); setStep(1); setListingType(null); setCategory(null)
    setSource('farmer'); setDetails(null); setVillage(''); setWideVisibility(false); setConfirmChecked(false); setConsents({}); setPhotoFiles([]); setCoordinates(null); setMapUrl('')
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError(t('location_unavailable')); return }
    navigator.geolocation.getCurrentPosition(
      (position) => setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setError(t('location_unavailable')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  const confirmLabelKey = needsSelfDecl ? 'post_confirm_owner' : needsProviderDecl ? 'post_confirm_provider' : 'post_confirm_simple'

  const title = created ? t('post_success') : `${t('post_listing')} · ${step}/3`

  return (
    <Screen title={title} onBack={created ? undefined : back}>
      {error && <Notice tone="error">{error}</Notice>}

      {/* ---- Step 1: What? (category + offer/requirement) ---- */}
      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
      <div className="lg:col-span-2">
      {!created && step === 1 && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-stone-800">{t('post_step_what')}</h2>
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
              <mod.Fields details={details} setDetails={setDetails} extras={extras} listingType={listingType} user={user} />

              <PhotoPicker files={photoFiles} onChange={(files) => { setPhotoFiles(files); if (category === 'jugaad') setDetails((d) => ({ ...d, __photoFiles: files })) }} limit={photoLimit} className="my-3" />

              {mod.extraDisclaimerKey && <DisclaimerBanner which={mod.extraDisclaimerKey} className="my-4" />}

              {/* किसान / व्यापारी toggle (default किसान). */}
              <div className="my-4">
                <p className="mb-1.5 text-sm font-semibold text-stone-600">{t('post_who_posting')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="post-source-farmer"
                    aria-pressed={source === 'farmer'}
                    onClick={() => setSource('farmer')}
                    className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-bold ${source === 'farmer' ? 'border-[var(--ks-green)] bg-[var(--ks-green-tint)] text-[var(--ks-green-dark)]' : 'border-stone-300 bg-white text-stone-700'}`}
                  >
                    👨‍🌾 {t('source_farmer')}
                  </button>
                  <button
                    type="button"
                    data-testid="post-source-vendor"
                    aria-pressed={source === 'vendor'}
                    onClick={() => setSource('vendor')}
                    className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-bold ${source === 'vendor' ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-stone-300 bg-white text-stone-700'}`}
                  >
                    🏪 {t('source_vendor')}
                  </button>
                </div>
                {source === 'vendor' && (
                  <div className="mt-2 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p>🏪 {t('vendor_note')}</p>
                  </div>
                )}
              </div>

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
            <button type="button" onClick={useCurrentLocation} className="mt-2 min-h-[44px] rounded-xl border-2 border-green-700 px-3 py-2 text-sm font-bold text-green-800">{t('location_current')}</button>
            {coordinates && <p className="mt-1 text-xs text-green-800">✓ {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</p>}
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

          {/* ONE checkbox: rules agreement + (offer) provider/ownership declaration. */}
          <label className="my-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-green-700"
              data-testid="rules-agree-checkbox"
            />
            <span className="text-sm leading-relaxed text-stone-800">
              {t(confirmLabelKey)}{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-green-800 underline">
                {t('terms_title')}
              </a>
              {/* Jugaad offers: the no-road-vehicle rule is one line inside this declaration (Batch 2 item D). */}
              {category === 'jugaad' && listingType === 'offer' && (
                <span className="mt-1 block text-sm text-stone-600">{t('jugaad_not_road_vehicle')}</span>
              )}
            </span>
          </label>

          <ConsentChecklist value={consents} onChange={setConsents} className="my-4" />

          {busy ? (
            <Spinner label={t('posting')} />
          ) : (
            <BigButton data-testid="post-submit" onClick={submit} disabled={!confirmChecked || !allConsentsAccepted}>
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
            <p className="mx-auto mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800" data-testid="wide-badge">📍 {t('wide_badge')}</p>
          )}
          {created?.geocoding_status === 'pending' && (
            /* ks-allow-width: success-state note */
            <p className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" data-testid="pending-geocode-note">
              {t('listing_pending_geocode')}
            </p>
          )}
          {/* ks-allow-width: success-state box */}
          <div className="mx-auto mt-4 max-w-sm"><WhatsAppJoin variant="box" src="post_listing" /></div>
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
