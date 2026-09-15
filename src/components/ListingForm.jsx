import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { getCategory } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { createListing, fetchPincode } from '../lib/listings/listingsApi'
import { isValidPincode } from '../lib/auth/authService'
import { BigButton, Field, Notice, Spinner, TextInput } from './ui'
import DisclaimerBanner from './DisclaimerBanner'
import HelpModal, { HelpButton } from './HelpModal'
import { CatIcon } from './CatIcon'
import { CATEGORY_META } from '../lib/listings/catalog'

// Category-agnostic listing form. Delegates the field set + validation +
// details finalization to the category module from the registry.
//
// ASSET LOCATION (v1.1): every listing must carry the pincode of the thing being
// offered/sought — the LAND / EQUIPMENT / TEAM / GOODS location — which is asked
// explicitly here and NOT defaulted from the poster's profile. Distance matching
// uses these coordinates, so a landowner in Hyderabad listing land in Sagar is
// found near Sagar, not near Hyderabad. The create_listing RPC re-derives the
// coordinates from this pincode server-side (authoritative).
export default function ListingForm({ listingType, category, onCreated }) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const mod = getCategory(category)

  const [extras, setExtras] = useState(null)
  const [details, setDetails] = useState(() => mod.initialDetails())
  const [pincode, setPincode] = useState('') // asset location — intentionally blank
  const [selfDeclared, setSelfDeclared] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const needsSelfDecl = mod.needsSelfDeclaration(listingType)
  const locationLabelKey = mod.locationLabelKey || 'field_asset_pincode'
  const locationPlaceholderKey = mod.locationPlaceholderKey || 'pincode_ph'

  useEffect(() => {
    let alive = true
    loadExtras(category).then((e) => alive && setExtras(e))
    return () => {
      alive = false
    }
  }, [category])

  async function submit() {
    setError(null)
    const vErr = mod.validate(details, listingType, t)
    if (vErr) {
      setError(vErr)
      return
    }
    // Asset-location pincode: required, well-formed, and known to us.
    const pin = String(pincode).trim()
    if (!pin) {
      setError(t('err_asset_pincode_required'))
      return
    }
    if (!isValidPincode(pin)) {
      setError(t('err_invalid_pincode'))
      return
    }
    if (needsSelfDecl && !selfDeclared) {
      setError(t('err_self_declaration_required'))
      return
    }
    setBusy(true)
    try {
      const pinRow = await fetchPincode(pin)
      if (!pinRow) {
        setError(t('err_pincode_not_found'))
        setBusy(false)
        return
      }
      const finalDetails = mod.finalizeDetails
        ? await mod.finalizeDetails(details, { actorId: user.id, user, listingType })
        : details
      const listing = await createListing({
        actorId: user.id,
        listingType,
        category,
        details: finalDetails,
        // Asset location — the listing's own coordinates, from its own pincode.
        latitude: pinRow.latitude,
        longitude: pinRow.longitude,
        pincode: pin,
        selfDeclared: needsSelfDecl ? selfDeclared : false,
      })
      onCreated(listing)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setBusy(false)
    }
  }

  if (!extras) return <Spinner />

  return (
    <div>
      {/* Category heading + help '?' (help moved here from the browse strip). */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex items-center gap-1 text-lg font-bold text-stone-800">
          <CatIcon category={category} /> {CATEGORY_META[category][lang]}
        </h2>
        <HelpButton categoryKey={category} onOpen={() => setHelpOpen(true)} />
      </div>
      {helpOpen && <HelpModal categoryKey={category} onClose={() => setHelpOpen(false)} />}

      {error && <Notice tone="error">{error}</Notice>}

      <mod.Fields details={details} setDetails={setDetails} extras={extras} listingType={listingType} user={user} />

      {/* Category-specific advisory (e.g. Bhusa/Parali environmental note). */}
      {mod.extraDisclaimerKey && <DisclaimerBanner which={mod.extraDisclaimerKey} className="my-4" />}

      {/* Asset location — prominent, required, and explicitly NOT the home pincode. */}
      <div className="my-5 rounded-2xl border-2 border-green-700 bg-green-50 p-4">
        <Field label={t(locationLabelKey)} htmlFor="f_asset_pincode" required hint={t('asset_pincode_hint')}>
          <TextInput
            id="f_asset_pincode"
            inputMode="numeric"
            maxLength={6}
            placeholder={t(locationPlaceholderKey)}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
      </div>

      {needsSelfDecl && (
        <label className="my-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
          <input
            type="checkbox"
            checked={selfDeclared}
            onChange={(e) => setSelfDeclared(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 accent-green-700"
          />
          <span className="text-base font-medium text-stone-800">{t('self_declaration_land')}</span>
        </label>
      )}

      <DisclaimerBanner which="listingForm" className="my-5" />

      {busy ? (
        <Spinner label={t('posting')} />
      ) : (
        <BigButton onClick={submit} disabled={needsSelfDecl && !selfDeclared}>
          {t('submit')}
        </BigButton>
      )}
    </div>
  )
}
