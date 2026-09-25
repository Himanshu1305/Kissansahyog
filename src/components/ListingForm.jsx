import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { getCategory } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { createListing, fetchResolvedVillages } from '../lib/listings/listingsApi'
import { drainGeocodeQueue } from '../lib/location/geocodeQueue'
import { WIDE_ELIGIBLE_CATEGORIES } from '../lib/distance'
import { BigButton, Field, Notice, Spinner, TextInput } from './ui'
import DisclaimerBanner from './DisclaimerBanner'
import HelpModal, { HelpButton } from './HelpModal'
import { CatIcon } from './CatIcon'
import { CATEGORY_META } from '../lib/listings/catalog'

// Category-agnostic listing form. Delegates the field set + validation +
// details finalization to the category module from the registry.
//
// ASSET LOCATION (0027): every listing carries the VILLAGE NAME of the thing being
// offered/sought — the platform's primary distance anchor (village-level forward
// geocoding, cached in village_coordinates). A known village resolves instantly; a
// brand-new name saves the listing immediately with geocoding_status='pending' and is
// filled in within seconds by the background geocode worker (non-blocking, 2e). Pincode
// is no longer asked here — it survives only as LocationControl's manual viewer fallback.
export default function ListingForm({ listingType, category, listingSource = 'farmer', onCreated }) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const mod = getCategory(category)

  const [extras, setExtras] = useState(null)
  const [details, setDetails] = useState(() => mod.initialDetails())
  const [village, setVillage] = useState('') // asset village — intentionally blank
  const [villages, setVillages] = useState([]) // autocomplete: previously-resolved names
  const [selfDeclared, setSelfDeclared] = useState(false)
  // Phase 1 — wide-visibility opt-in, offered ONLY for Bhoosa/Parali + Seeds & Inputs.
  const canWiden = WIDE_ELIGIBLE_CATEGORIES.includes(category)
  const [wideVisibility, setWideVisibility] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const needsSelfDecl = mod.needsSelfDeclaration(listingType)

  useEffect(() => {
    let alive = true
    loadExtras(category).then((e) => alive && setExtras(e))
    fetchResolvedVillages().then((v) => alive && setVillages(v)).catch(() => {})
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
    const vname = String(village).trim()
    if (vname.length < 2) {
      setError(t('err_asset_village_required'))
      return
    }
    if (needsSelfDecl && !selfDeclared) {
      setError(t('err_self_declaration_required'))
      return
    }
    setBusy(true)
    try {
      const finalDetails = mod.finalizeDetails
        ? await mod.finalizeDetails(details, { actorId: user.id, user, listingType })
        : details
      const listing = await createListing({
        actorId: user.id,
        listingType,
        category,
        details: finalDetails,
        villageName: vname, // primary distance anchor (village-geocoded, cached)
        selfDeclared: needsSelfDecl ? selfDeclared : false,
        listingSource,
        wideVisibility: canWiden ? wideVisibility : false,
      })
      // New (uncached) village → resolve its coordinates in the background (2e). Fire-and-
      // forget: the listing is already saved; this fills its coords within seconds.
      if (listing?.geocoding_status === 'pending') drainGeocodeQueue().catch(() => {})
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

      {/* Asset location — the VILLAGE NAME (primary distance anchor), with autocomplete for
          previously-resolved villages; a new name is geocoded in the background after save. */}
      <div className="my-5 rounded-2xl border-2 border-green-700 bg-green-50 p-4">
        <Field label={t('field_asset_village')} htmlFor="f_asset_village" required hint={t('asset_village_hint')}>
          <TextInput
            id="f_asset_village"
            list="known-villages"
            placeholder={t('village_ph')}
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
          <datalist id="known-villages">
            {villages.map((v) => <option key={v} value={v} />)}
          </datalist>
        </Field>
      </div>

      {/* Phase 1 — wide-visibility opt-in (Bhoosa/Parali + Seeds & Inputs only),
          default unchecked. No other category renders this. */}
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
            <span className="block font-semibold">{t('wide_visibility_label')}</span>
            <span className="mt-1 block text-sm text-stone-600">{t('wide_visibility_note')}</span>
          </span>
        </label>
      )}

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
