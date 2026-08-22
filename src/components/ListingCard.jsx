import { useLang } from '../lib/i18n/LanguageProvider'
import { getCategory } from '../lib/listings/registry'
import { CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'

// Compact listing summary used in Browse and My Listings. `extras` supplies
// lookup rows (crops/equipment types) for the summary. Optional `statusBadge`
// (My Listings) shows closed/expired state.
export default function ListingCard({ listing, extras = {}, onClick, statusBadge }) {
  const { t, lang } = useLang()
  const meta = CATEGORY_META[listing.category]
  const typeMeta = LISTING_TYPE_META[listing.listing_type]
  const rows = getCategory(listing.category).summarize(listing, lang, extras).slice(0, 3)

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="listing-card"
      className="w-full rounded-2xl border-2 border-stone-200 bg-white p-4 text-left shadow-sm active:bg-stone-50"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="font-bold text-stone-900">{meta[lang]}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            listing.listing_type === 'offer'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {typeMeta[lang]}
        </span>
        {statusBadge}
        {typeof listing.distanceKm === 'number' && (
          <span className="ml-auto text-sm font-semibold text-stone-500">
            {listing.distanceKm.toFixed(1)} {t('km_away')}
          </span>
        )}
      </div>

      <div className="text-sm text-stone-700">
        {rows.map((r, i) => (
          <span key={i}>
            {i > 0 && <span className="text-stone-300"> · </span>}
            {r.value}
          </span>
        ))}
      </div>

      {(listing.pincode || listing.village_town) && (
        <div className="mt-1 text-sm text-stone-500">📍 {listing.village_town || listing.pincode}</div>
      )}
    </button>
  )
}
