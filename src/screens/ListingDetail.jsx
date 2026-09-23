import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import LanguageToggle from '../components/LanguageToggle'
import { CatIcon } from '../components/CatIcon'
import WhatsAppShareButton from '../components/WhatsAppShareButton'
import { generateListingMessage } from '../lib/share/shareMessages'
import { getCategory } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { fetchListingById, getListingContact } from '../lib/listings/listingsApi'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { haversineKm } from '../lib/distance'

export default function ListingDetail() {
  const { id } = useParams()
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [listing, setListing] = useState(null)
  const [extras, setExtras] = useState({})
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState(null)
  const [revealBusy, setRevealBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const row = await fetchListingById(id)
        if (!alive) return
        setListing(row)
        if (row) setExtras(await loadExtras(row.category))
      } catch (err) {
        if (alive) setError(t(err.i18nKey || 'err_unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, t])

  async function reveal() {
    setError(null)
    setRevealBusy(true)
    try {
      setContact(await getListingContact(id))
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setRevealBusy(false)
    }
  }

  if (loading) return <Screen title={t('detail_title')} onBack={() => navigate(-1)}><Spinner /></Screen>
  if (!listing)
    return (
      <Screen title={t('detail_title')} onBack={() => navigate(-1)}>
        <p className="py-12 text-center text-stone-500">{t('listing_not_found')}</p>
      </Screen>
    )

  const meta = CATEGORY_META[listing.category]
  const typeMeta = LISTING_TYPE_META[listing.listing_type]
  const mod = getCategory(listing.category)
  const rows = mod.summarize(listing, lang, extras)
  const badges = mod.detailBadges ? mod.detailBadges(listing, lang) : []
  const photos = listing.details?.photo_urls || []
  const distance =
    user?.latitude != null && listing.latitude != null
      ? haversineKm(user.latitude, user.longitude, listing.latitude, listing.longitude)
      : null

  return (
    <Screen title={t('detail_title')} onBack={() => navigate(-1)} right={<LanguageToggle />}>
      <div className="mb-4 flex items-center gap-2">
        <CatIcon category={listing.category} className="text-4xl" />
        <div>
          <h2 className="text-xl font-bold text-stone-900">{meta[lang]}</h2>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
              listing.listing_type === 'offer'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {typeMeta[lang]}
          </span>
          {listing.listing_source === 'vendor' && (
            <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">🏪 {t('vendor_badge')}</span>
          )}
        </div>
        {distance != null && (
          <span className="ml-auto text-sm font-semibold text-stone-500">
            {distance.toFixed(1)} {t('km_away')}
          </span>
        )}
      </div>

      {/* Category-specific prominent badges (e.g. Drone Didi govt scheme + services). */}
      {badges.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {badges.map((bdg, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                bdg.tone === 'gov' ? 'bg-green-700 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {bdg.text}
            </span>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" loading="lazy" className="h-40 w-40 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <dl className="mb-4 divide-y divide-stone-100 rounded-2xl border-2 border-stone-200 bg-white">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-stone-500">{r.label}</dt>
            <dd className="text-right font-semibold text-stone-900">{r.value}</dd>
          </div>
        ))}
        {(listing.village_town || listing.pincode) && (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-stone-500">📍</dt>
            <dd className="text-right font-semibold text-stone-900">
              {listing.village_town || listing.pincode}
            </dd>
          </div>
        )}
      </dl>

      {error && <Notice tone="error">{error}</Notice>}

      {/* WhatsApp share — prominent, below the disclaimer, above the Call button. */}
      <WhatsAppShareButton
        message={generateListingMessage(listing, `${window.location.origin}/listing/${listing.id}`, lang)}
        className="mb-3"
      />

      {/* Phone reveal — short caution banner sits directly above the Call button. */}
      <DisclaimerBanner which="phoneReveal" className="mb-3" />

      {!contact ? (
        revealBusy ? (
          <Spinner />
        ) : (
          <BigButton onClick={reveal}>📞 {t('show_number')}</BigButton>
        )
      ) : (
        <div>
          <p className="mb-2 text-center text-lg font-bold text-stone-900">
            {contact.full_name} · {contact.phone}
          </p>
          <a href={`tel:${contact.phone}`} className="block">
            <BigButton>📞 {t('call_now')} — {contact.phone}</BigButton>
          </a>
        </div>
      )}
    </Screen>
  )
}
