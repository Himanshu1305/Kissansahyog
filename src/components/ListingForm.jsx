import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { getCategory } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { createListing } from '../lib/listings/listingsApi'
import { BigButton, Notice, Spinner } from './ui'
import DisclaimerBanner from './DisclaimerBanner'

// Category-agnostic listing form. Delegates the field set + validation +
// details finalization to the category module from the registry.
export default function ListingForm({ listingType, category, onCreated }) {
  const { t } = useLang()
  const { user } = useAuth()
  const mod = getCategory(category)

  const [extras, setExtras] = useState(null)
  const [details, setDetails] = useState(() => mod.initialDetails())
  const [selfDeclared, setSelfDeclared] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const needsSelfDecl = mod.needsSelfDeclaration(listingType)

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
    if (needsSelfDecl && !selfDeclared) {
      setError(t('err_self_declaration_required'))
      return
    }
    setBusy(true)
    try {
      const finalDetails = mod.finalizeDetails
        ? await mod.finalizeDetails(details, { actorId: user.id })
        : details
      const listing = await createListing({
        actorId: user.id,
        listingType,
        category,
        details: finalDetails,
        // location defaults to the poster's profile coords server-side
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
      {error && <Notice tone="error">{error}</Notice>}

      <mod.Fields details={details} setDetails={setDetails} extras={extras} />

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
