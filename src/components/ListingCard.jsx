import { useLang } from '../lib/i18n/LanguageProvider'
import { getCategory } from '../lib/listings/registry'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { timeAgo } from '../lib/timeAgo'

// Compact listing summary used in Browse (2-col grid) and My Listings. Shows the
// category pill, listing type, a "Vendor" badge for business listings, the key
// detail, location + distance, and time posted — all without tapping.
export default function ListingCard({ listing, extras = {}, onClick, statusBadge }) {
  const { t, lang } = useLang()
  const meta = CATEGORY_META[listing.category]
  const typeMeta = LISTING_TYPE_META[listing.listing_type]
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 2)
  const isOffer = listing.listing_type === 'offer'
  const isVendor = listing.listing_source === 'vendor'

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="listing-card"
      className="flex h-full w-full flex-col rounded-xl border border-stone-200 bg-white p-3 text-left active:bg-stone-50"
    >
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="text-lg leading-none" aria-hidden="true">{meta.icon}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isOffer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {typeMeta[lang]}
        </span>
        {isVendor && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">🏪 {t('vendor_badge')}</span>
        )}
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

      <div className="mt-auto flex items-center justify-between gap-1 pt-1 text-xs text-stone-500">
        <span className="truncate">📍 {listing.village_town || listing.pincode || ''}</span>
        {listing.created_at && <span className="shrink-0">{timeAgo(listing.created_at, t)}</span>}
      </div>
    </button>
  )
}
