import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { sortByDistance } from '../../lib/coldStorage/coldStorageApi'
import { useUserLocation } from '../../lib/location/LocationProvider'
import LocationControl from '../location/LocationControl'
import ColdStorageCard from '../ColdStorageCard'

// Common stored crops — shown only when some entry's `products` actually mentions one.
// Labels live in strings.js (cs_crop_<key>); `match` tests the free-text products field.
const CROPS = [
  { key: 'potato', match: /potato|aloo/i },
  { key: 'onion', match: /onion|pyaz/i },
  { key: 'garlic', match: /garlic|lahsun/i },
  { key: 'fruit', match: /fruit|apple|orange/i },
  { key: 'seed', match: /seed|beej/i },
]

// Batch 2 item B — the shared cold-storage finder: location (the shared location object,
// Batch 7L-1 — no pincode, no separate GPS call) + filters
// (district, crop, type), results sorted nearest-first, and a "list your cold
// storage" CTA. Listings come first; information sits below (rendered by the page).
export default function ColdStorageFinder({ entries, districts = [], lockedDistrict = null }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const { location, center } = useUserLocation()
  const centre = useMemo(() => (center ? { ...center, label: location?.label || '' } : null), [center, location])
  const [districtFilter, setDistrictFilter] = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const types = useMemo(() => [...new Set(entries.map((e) => e.type).filter(Boolean))].sort(), [entries])
  const crops = useMemo(
    () => CROPS.filter((c) => entries.some((e) => e.products && c.match.test(e.products))),
    [entries],
  )

  const filtered = useMemo(() => {
    let rows = entries.filter((e) => {
      if (!lockedDistrict && districtFilter && e.district !== districtFilter) return false
      if (typeFilter && e.type !== typeFilter) return false
      if (cropFilter) {
        const c = CROPS.find((x) => x.key === cropFilter)
        if (c && !(e.products && c.match.test(e.products))) return false
      }
      return true
    })
    rows = sortByDistance(rows, centre)
    if (!centre) rows = [...rows].sort((a, b) => (a.district || '').localeCompare(b.district || '') || (a.name || '').localeCompare(b.name || ''))
    return rows
  }, [entries, lockedDistrict, districtFilter, typeFilter, cropFilter, centre])

  const selCls = 'mt-1 min-h-[44px] rounded-lg border border-stone-300 bg-white p-2 text-sm'

  return (
    <section>
      {/* 1. Search + filters */}
      <div className="rounded-2xl border border-stone-200 bg-white p-3">
        <LocationControl />

        <div className="mt-3 flex flex-wrap gap-3">
          {!lockedDistrict && districts.length > 0 && (
            <label className="flex flex-col text-sm font-semibold text-stone-700">
              {t('cs_filter_district')}
              <select value={districtFilter} onChange={(ev) => setDistrictFilter(ev.target.value)} className={selCls}>
                <option value="">{t('cs_filter_all_districts')}</option>
                {districts.map((d) => <option key={d.slug} value={d.district}>{d.district} ({d.count})</option>)}
              </select>
            </label>
          )}
          {crops.length > 0 && (
            <label className="flex flex-col text-sm font-semibold text-stone-700">
              {t('cs_filter_crop')}
              <select value={cropFilter} onChange={(ev) => setCropFilter(ev.target.value)} className={selCls}>
                <option value="">{t('cs_filter_all_crops')}</option>
                {crops.map((c) => <option key={c.key} value={c.key}>{t('cs_crop_' + c.key)}</option>)}
              </select>
            </label>
          )}
          {types.length > 0 && (
            <label className="flex flex-col text-sm font-semibold text-stone-700">
              {t('cs_filter_type')}
              <select value={typeFilter} onChange={(ev) => setTypeFilter(ev.target.value)} className={selCls}>
                <option value="">{t('cs_filter_all_types')}</option>
                {types.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* 2. Results — nearest first when a location is set */}
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-stone-600">
          {centre?.label ? `${t('cs_near_from')}: ${centre.label}` : `${filtered.length} ${t('cs_entries_count')}`}
        </p>
        {centre && <p className="text-xs font-semibold text-green-700">{t('cs_sorted_by_distance')}</p>}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-lg bg-stone-100 px-4 py-6 text-center text-sm text-stone-600">{t('cs_no_entries')}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="cs-results">
          {filtered.map((e) => <ColdStorageCard key={e.id} entry={e} />)}
        </div>
      )}

      {/* 3. Post CTA — opens /post with the Warehouse category preselected */}
      <button
        type="button"
        onClick={() => navigate('/post?cat=warehouse&type=offer')}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-white active:bg-amber-600 sm:w-auto"
      >
        🏬 {t('cs_post_cta')}
      </button>
    </section>
  )
}
