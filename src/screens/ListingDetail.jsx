import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Notice, Spinner } from '../components/ui'
import { Seo } from '../components/layout'
import { CatIcon } from '../components/CatIcon'
import { goBack } from '../components/BackButton'
import WhatsAppShareButton from '../components/WhatsAppShareButton'
import ContactActions from '../components/ContactActions'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import ReportButton from '../components/ReportButton'
import SponsoredBadge from '../components/SponsoredBadge'
import RelatedBoxes from '../components/RelatedBoxes'
import DisclaimerBanner from '../components/DisclaimerBanner'
import { generateListingMessage } from '../lib/share/shareMessages'
import { getCategory } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { fetchListingById, incrementContactClick, incrementListingView, getMyListings } from '../lib/listings/listingsApi'
import OwnerListingActions, { ownerStatus, Toast } from '../components/listing/OwnerListingActions'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { haversineKm } from '../lib/distance'
import { publicOrigin } from '../lib/native'
import OfflineStamp from '../components/OfflineStamp'
import OfflineNotice from '../components/OfflineNotice'
import { useOfflineInfo } from '../lib/offline/useOffline'

export default function ListingDetail() {
  const { id } = useParams()
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Screen's back arrow: real history when in-app, else fall back to browse (direct/shared link).
  const onBack = () => goBack(navigate, location, '/browse')

  const [listing, setListing] = useState(null)
  const [extras, setExtras] = useState({})
  const [loading, setLoading] = useState(true)
  const listOffline = useOfflineInfo(['listings'])
  const [error, setError] = useState(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  // Batch 10G: the seller's own view (status, admin-disable reason) and the toast after an action.
  const [mine, setMine] = useState(null)
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let row = await fetchListingById(id)
        if (!alive) return
        // Batch 10G: the public read shows only active listings. The seller's own disabled (or
        // otherwise hidden) listing comes from get_my_listings, so the seller can still see and manage it.
        let own = null
        if (user?.id && (!row || row.user_id === user.id)) {
          own = (await getMyListings(user.id).catch(() => [])).find((x) => x.id === id) || null
          if (!alive) return
          if (own && !row) row = { ...own, user_id: user.id }
        }
        setMine(own)
        setListing(row)
        if (row) { setExtras(await loadExtras(row.category)); if (!own) incrementListingView(row.id) }
      } catch (err) {
        if (alive) setError(t(err.i18nKey || 'err_unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, t, user?.id])

  if (loading) return <Screen title={t('detail_title')} onBack={onBack}><Spinner /></Screen>
  if (!listing)
    return (
      <Screen title={t('detail_title')} onBack={onBack}>
        {listOffline.failed ? <OfflineNotice ageMs={listOffline.tooOld ? listOffline.ageMs : null} className="my-6" /> : <p className="py-12 text-center text-stone-500">{t('listing_not_found')}</p>}
      </Screen>
    )

  const meta = CATEGORY_META[listing.category]
  const typeMeta = LISTING_TYPE_META[listing.listing_type]
  const mod = getCategory(listing.category)
  const rows = mod.summarize(listing, lang, extras)
  const badges = mod.detailBadges ? mod.detailBadges(listing, lang) : []
  const detailNote = mod.detailNote ? mod.detailNote(listing, lang) : null
  const photos = listing.details?.photo_urls || []
  const distance =
    user?.latitude != null && listing.latitude != null
      ? haversineKm(user.latitude, user.longitude, listing.latitude, listing.longitude)
      : null

  return (
    <Screen title={t('detail_title')} onBack={onBack}>
      {/* Listings are noindex for now (SEO for listings is a later batch). */}
      <Seo noindex path={`/listing/${listing.id}`} />
      <OfflineStamp resources={['listings']} className="mb-2" />
      {/* Batch 9B — a Post whose reply was lost: the retry found this listing instead of adding a copy. */}
      {location.state?.alreadySaved && <Notice tone="success"><span data-testid="already-saved">{t('post_already_saved')}</span></Notice>}
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
          <SponsoredBadge sponsored={listing.is_sponsored} className="ml-1 align-middle" />
          {listing.wide_visibility && (
            <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800" data-testid="wide-badge">📍 {t('wide_badge')}</span>
          )}
        </div>
        {distance != null && (
          <span className="ml-auto text-sm font-semibold text-stone-500">
            {distance.toFixed(1)} {t('km_away')}
          </span>
        )}
      </div>

      {/* Call + WhatsApp — the primary action, right under the title (Batch1 item 4).
          Hidden on your own listing; sends logged-out users to login and back. */}
      <ContactActions listing={listing} size="detail" className="mb-4" />

      {/* Batch 10G — the seller's own listing: status + disable / enable + permanent delete. */}
      {mine && (
        <section data-testid="owner-panel" className="mb-4 rounded-2xl border-2 border-stone-200 bg-white px-4 py-3">
          {(() => {
            const st = ownerStatus({ ...mine, status: listing.status })
            const key = { active: 'badge_active', disabled: 'badge_disabled', admin_disabled: 'badge_admin_disabled', closed: 'badge_found', expired: 'badge_expired', removed: 'status_removed' }[st]
            const tone = st === 'active' ? 'bg-blue-100 text-blue-800' : st === 'admin_disabled' ? 'bg-red-100 text-red-800' : 'bg-stone-200 text-stone-700'
            return <span data-testid="owner-status" data-status={st} className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{t(key)}</span>
          })()}
          <OwnerListingActions
            listing={{ ...mine, status: listing.status }}
            actorId={user.id}
            onError={(m) => { setError(m); setToast(m) }}
            onChanged={(kind, row) => {
              if (kind === 'deleted') { navigate('/my', { replace: true, state: { toast: 'listing_deleted_toast' } }); return }
              setListing((l) => ({ ...l, status: row?.status ?? l.status }))
              setMine((m) => ({ ...m, status: row?.status ?? m.status }))
              setToast(t(kind === 'disabled' ? 'listing_disabled_toast' : 'listing_enabled_toast'))
            }}
          />
        </section>
      )}

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
        <div className="mb-4">
          <img src={photos[photoIndex]} alt={`${meta[lang]} ${photoIndex + 1}`} loading="lazy" className="h-64 w-full rounded-2xl object-cover" />
          {photos.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto">{photos.map((url, i) => <button type="button" key={url} onClick={() => setPhotoIndex(i)} aria-label={`${meta[lang]} ${i + 1}`} className={`shrink-0 rounded-lg ${i === photoIndex ? 'ring-2 ring-green-700' : ''}`}><img src={url} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" /></button>)}</div>}
        </div>
      )}

      {/* Batch 9C — equipment specs are what the seller typed; nobody checked them. */}
      {detailNote && <p data-testid="spec-seller-note" className="mb-1 text-sm font-semibold text-stone-600">ℹ️ {detailNote}</p>}
      <dl className="mb-4 divide-y divide-stone-100 rounded-2xl border-2 border-stone-200 bg-white">
        {rows.map((r, i) => (
          <div key={i} data-spec={r.spec || undefined} className="flex justify-between gap-4 px-4 py-3">
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

      {/* Batch 10E (3B) — the owner's optional extra information: plain text (React escapes it; links are
          NOT made clickable), the owner's line breaks kept. */}
      {typeof listing.details?.extra_info === 'string' && listing.details.extra_info.trim() && (
        <section data-testid="listing-extra-info" className="mb-4 rounded-2xl border-2 border-stone-200 bg-white px-4 py-3">
          <h3 className="mb-1 text-sm font-semibold text-stone-500">{t('extra_info_title')}</h3>
          <p className="whitespace-pre-line break-words text-base text-stone-900">{listing.details.extra_info}</p>
        </section>
      )}

      <MapLink listing={listing} t={t} />

      {mod.extraDisclaimerKey && <DisclaimerBanner which={mod.extraDisclaimerKey} className="mb-4" />}

      {/* Equipment offers: owner-maintained availability calendar (Phase 7a). */}
      {listing.category === 'equipment' && listing.listing_type === 'offer' && (
        <div className="mb-4">
          <AvailabilityCalendar listingId={listing.id} isOwner={!!user && user.id === listing.user_id} actorId={user?.id} />
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {/* Share — now a smaller secondary action (Batch1 item 4; the phone contact
          actions moved to the top under the title). */}
      {/* ks-allow-width: compact share button width */}
      <WhatsAppShareButton
        label={t('contact_share')}
        message={generateListingMessage(listing, `${publicOrigin()}/listing/${listing.id}`, lang)}
        className="mb-3 !bg-white !text-[var(--ks-green)] border-2 border-[var(--ks-green)] !py-1.5 text-sm"
        onClick={() => { if (!user || user.id !== listing.user_id) incrementContactClick(listing.id) }}
      />

      {/* Report / complaint (§Phase 4) */}
      <div className="mt-5 flex justify-center">
        <ReportButton targetType="listing" targetId={listing.id} listingId={listing.id} />
      </div>

      <RelatedBoxes page="listing" />
      <Toast message={toast} onDone={clearToast} />
    </Screen>
  )
}

function MapLink({ listing, t }) {
  const details = listing.details || {}
  const query = listing.latitude != null && listing.longitude != null
    ? `${listing.latitude},${listing.longitude}`
    : (listing.village_name || listing.village_town || details.from_location || '')
  const href = details.map_url || (query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null)
  if (!href) return null
  return <a href={href} target="_blank" rel="noopener noreferrer" className="mb-4 inline-flex min-h-[44px] items-center rounded-xl border-2 border-green-700 px-4 py-2 font-bold text-green-800">{t('maps_open')}</a>
}
