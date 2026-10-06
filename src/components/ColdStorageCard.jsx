import { useLang } from '../lib/i18n/LanguageProvider'
import { parseDirectoryPhone, directionsUrl } from '../lib/coldStorage/coldStorageApi'
import ReportButton from './ReportButton'

// One directory entry card for the cold-storage finder (Batch 2 item B).
// Directory phones are PUBLIC (owner-approved) → Call / WhatsApp link straight to
// tel:/wa.me with no login. The claim flow was removed; a small "गलत जानकारी?
// बताएँ" link opens the existing ReportButton (target_type='cold_storage').
export default function ColdStorageCard({ entry }) {
  const { t } = useLang()
  const { mobile, tel } = parseDirectoryPhone(entry.phone)

  // Full address line: address, city, district, pincode (de-duplicated, trimmed).
  const addressParts = [entry.address, entry.city, entry.district, entry.pincode]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
  const seen = new Set()
  const fullAddress = addressParts.filter((p) => { const k = p.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).join(', ')

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-bold text-stone-900">{entry.name}</p>
        {entry.distanceKm != null && (
          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
            ~{entry.distanceKm < 1 ? '1' : Math.round(entry.distanceKm)} {t('unit_km')}
          </span>
        )}
      </div>

      {fullAddress && (
        <p className="mt-1 text-sm text-stone-600">
          <span className="font-semibold">{t('cs_address_label')}:</span> {fullAddress}
        </p>
      )}

      <div className="mt-2 space-y-1 text-sm text-stone-700">
        {entry.products && <p><span className="font-semibold">{t('cs_products_label')}:</span> {entry.products}</p>}
        {entry.capacity && <p><span className="font-semibold">{t('cs_capacity_label')}:</span> {entry.capacity}</p>}
        {entry.type && <p><span className="font-semibold">{t('cs_type_label')}:</span> {entry.type}</p>}
        {entry.space_available && (
          <p>
            <span className="font-semibold">{t('cs_space_label')}:</span> {entry.space_available}
            {entry.space_updated && <span className="text-stone-500"> ({entry.space_updated})</span>}
          </p>
        )}
      </div>

      {/* Contact + directions — directory phones are public, no login (§B). */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tel && (
          <a
            href={`tel:${tel}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white active:bg-green-800"
          >
            📞 {t('contact_call')}
          </a>
        )}
        {mobile && (
          <a
            href={`https://wa.me/91${mobile}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-green-700 bg-white px-4 py-2 text-sm font-bold text-green-700 active:bg-green-50"
          >
            💬 {t('contact_whatsapp')}
          </a>
        )}
        <a
          href={directionsUrl(entry)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 active:bg-stone-50"
        >
          🧭 {t('cs_directions')}
        </a>
      </div>

      {entry.is_old_list && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {t('cs_old_list_note')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2">
        <p className="text-xs text-stone-500">
          {t('cs_source_label')}
          {entry.source_name ? `: ${entry.source_name}` : ''}
          {entry.source_url && (
            <>
              {' '}
              <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
                {t('cs_source_link')}
              </a>
            </>
          )}
        </p>
        <ReportButton targetType="cold_storage" targetId={entry.id} label={t('cs_report_wrong')} />
      </div>
    </div>
  )
}
