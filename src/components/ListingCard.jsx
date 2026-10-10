import { useLang } from '../lib/i18n/LanguageProvider'
import { getCategorySafe } from '../lib/listings/registry'
import { EQUIPMENT_TAGS, LISTING_TYPE_META, optionLabels } from '../lib/listings/catalog'
import { CatIcon } from './CatIcon'
import SponsoredBadge from './SponsoredBadge'
import ContactActions from './ContactActions'
import { timeAgo } from '../lib/timeAgo'

// Compact listing summary used in Browse (grid) and My Listings. Shows the
// category pill, listing type, a "Vendor" badge for business listings, the key
// detail, location + distance, and time posted — all without tapping. Below the
// summary, Call + WhatsApp buttons (Batch1 item 4) contact the seller directly;
// they are hidden on the viewer's own listing. The summary area opens the listing;
// the contact buttons live outside that button so taps don't also open it.
export default function ListingCard({ listing, extras = {}, onClick, statusBadge }) {
  const { t, lang } = useLang()
  const typeMeta = LISTING_TYPE_META[listing.listing_type]
  const category = getCategorySafe(listing.category)
  // A legacy category must not turn a list into a blank page.
  if (!category || !typeMeta) return null
  const rows = category.summarize(listing, lang, extras).slice(0, 2)
  const isOffer = listing.listing_type === 'offer'
  const isVendor = listing.listing_source === 'vendor'
  const equipmentTags = listing.category === 'equipment' ? (listing.details?.equipment_tags || []) : []

  return (
    <div data-testid="listing-card" className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col p-3 text-left active:bg-stone-50"
      >
        <div className="mb-1 flex flex-wrap items-center gap-1">
          <CatIcon category={listing.category} className="text-lg leading-none" />
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isOffer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
            {typeMeta[lang]}
          </span>
          {isVendor && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">🏪 {t('vendor_badge')}</span>
          )}
          <SponsoredBadge sponsored={listing.is_sponsored} />
          {statusBadge}
          {typeof listing.distanceKm === 'number' && (
            <span className="ml-auto text-xs font-semibold text-stone-500">{listing.distanceKm.toFixed(0)} {t('km_away')}</span>
          )}
        </div>

        <div className="text-sm font-medium leading-snug text-stone-800">
          {rows.map((r, i) => (
            <span key={i}>
              {i > 0 && <span className="text-stone-300"> · </span>}
              {r.value}
            </span>
          ))}
        </div>

        {equipmentTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1" data-testid="equipment-tag-card">
            {equipmentTags.map((tag) => <span key={tag} className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">{optionLabels(EQUIPMENT_TAGS, [tag], lang)}</span>)}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1 pt-1 text-xs text-stone-500">
          <span className="truncate">📍 {listing.village_town || listing.pincode || ''}</span>
          {listing.created_at && <span className="shrink-0">{timeAgo(listing.created_at, t)}</span>}
        </div>
      </button>

      {/* Call + WhatsApp (hidden on your own listing). */}
      <div className="px-3 pb-3">
        <ContactActions listing={listing} size="card" />
      </div>
    </div>
  )
}
