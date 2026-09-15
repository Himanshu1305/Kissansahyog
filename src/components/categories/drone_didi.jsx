// Drone Didi category module — women-operated drone spraying service (Govt scheme).
// Two shapes by listing_type (offer = operator; requirement = farmer needing spray),
// pruned in finalizeDetails so the DB JSONB stays clean. asset_pincode is the
// listing's row pincode (asset-location rule); asset_village lives in details.
//   offer:       { operator_name, drone_type, service_type[], rate_per_acre, min_acres,
//                  available_from|null, available_to|null, coverage_area,
//                  government_scheme, crops_covered, asset_village }
//   requirement: { crop_type, acreage, service_needed, preferred_date|null, asset_village }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, MultiChips, TextField, DateField } from './fields'
import { DRONE_TYPE, DRONE_SERVICE, optionLabel, optionLabels } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    // offer
    operator_name: '', drone_type: '', service_type: [], rate_per_acre: '', min_acres: '',
    available_from: null, available_to: null, coverage_area: '', government_scheme: true,
    crops_covered: '', asset_village: '',
    // requirement
    crop_type: '', acreage: '', service_needed: '', preferred_date: null,
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_drone_pincode'
export const locationPlaceholderKey = 'ph_drone_pincode'

export function validate(details, listingType, t) {
  if (listingType === 'offer') {
    if (!String(details.operator_name || '').trim()) return t('err_operator_name_required')
    if (!details.drone_type) return t('err_drone_type_required')
    if (!Array.isArray(details.service_type) || details.service_type.length === 0) return t('err_service_type_required')
    if (!String(details.rate_per_acre || '').trim()) return t('err_rate_per_acre_required')
    if (!String(details.asset_village || '').trim()) return t('err_asset_village_required')
  } else {
    if (!String(details.crop_type || '').trim()) return t('err_crop_type_required')
    if (!String(details.acreage || '').trim()) return t('err_acreage_required')
    if (!details.service_needed) return t('err_service_needed_required')
    if (!String(details.asset_village || '').trim()) return t('err_asset_village_required')
  }
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  if (listingType === 'requirement') {
    return (
      <>
        <TextField name="crop_type" label={t('field_crop_type')} value={details.crop_type} onChange={set('crop_type')} placeholder={t('ph_drone_crop_type')} required />
        <TextField name="acreage" label={t('field_acreage')} value={details.acreage} onChange={set('acreage')} placeholder={t('ph_drone_acreage')} required />
        <OptionSelect name="service_needed" label={t('field_service_needed')} list={DRONE_SERVICE} value={details.service_needed} onChange={set('service_needed')} required />
        <DateField name="preferred_date" label={t('field_preferred_date')} value={details.preferred_date} onChange={set('preferred_date')} />
        <TextField name="asset_village" label={t('field_asset_village')} value={details.asset_village} onChange={set('asset_village')} required />
      </>
    )
  }

  return (
    <>
      <TextField name="operator_name" label={t('field_operator_name')} value={details.operator_name} onChange={set('operator_name')} placeholder={t('ph_operator_name')} required />
      <OptionSelect name="drone_type" label={t('field_drone_type')} list={DRONE_TYPE} value={details.drone_type} onChange={set('drone_type')} required />
      <MultiChips label={t('field_service_type')} list={DRONE_SERVICE} values={details.service_type} onChange={set('service_type')} required />
      <TextField name="rate_per_acre" label={t('field_rate_per_acre')} value={details.rate_per_acre} onChange={set('rate_per_acre')} placeholder={t('ph_rate_per_acre')} required />
      <TextField name="min_acres" label={t('field_min_acres')} value={details.min_acres} onChange={set('min_acres')} hint={t('optional')} />
      <DateField name="available_from" label={t('field_from_date')} value={details.available_from} onChange={set('available_from')} />
      <DateField name="available_to" label={t('field_to_date')} value={details.available_to} onChange={set('available_to')} />
      <TextField name="coverage_area" label={t('field_coverage_area')} value={details.coverage_area} onChange={set('coverage_area')} hint={t('optional')} placeholder={t('ph_coverage_area')} />
      <TextField name="crops_covered" label={t('field_crops_covered')} value={details.crops_covered} onChange={set('crops_covered')} hint={t('optional')} />
      <TextField name="asset_village" label={t('field_asset_village')} value={details.asset_village} onChange={set('asset_village')} required />
      <label className="my-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-green-300 bg-green-50 p-4">
        <input type="checkbox" checked={!!details.government_scheme} onChange={(e) => setDetails((d) => ({ ...d, government_scheme: e.target.checked }))} className="mt-1 h-6 w-6 shrink-0 accent-green-700" />
        <span className="text-base font-medium text-stone-800">{t('drone_govt_label')}</span>
      </label>
    </>
  )
}

// Prune to the listing-type's exact key set.
export function finalizeDetails(details, { listingType } = {}) {
  if (listingType === 'requirement') {
    return {
      crop_type: details.crop_type, acreage: details.acreage,
      service_needed: details.service_needed, preferred_date: details.preferred_date || null,
      asset_village: details.asset_village,
    }
  }
  return {
    operator_name: details.operator_name, drone_type: details.drone_type,
    service_type: Array.isArray(details.service_type) ? details.service_type : [],
    rate_per_acre: details.rate_per_acre, min_acres: details.min_acres || '',
    available_from: details.available_from || null, available_to: details.available_to || null,
    coverage_area: details.coverage_area || '', government_scheme: !!details.government_scheme,
    crops_covered: details.crops_covered || '', asset_village: details.asset_village,
  }
}

// Prominent pills on the detail view: govt-scheme badge + service tags.
export function detailBadges(listing, lang) {
  const d = listing.details || {}
  const badges = []
  if (listing.listing_type === 'offer' && d.government_scheme) {
    badges.push({ text: (lang === 'hi' ? 'सरकारी ड्रोन दीदी योजना ✓' : 'Government Drone Didi Scheme ✓'), tone: 'gov' })
  }
  const services = listing.listing_type === 'offer' ? (d.service_type || []) : (d.service_needed ? [d.service_needed] : [])
  for (const s of services) badges.push({ text: optionLabel(DRONE_SERVICE, s, lang), tone: 'service' })
  return badges
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (listing.listing_type === 'offer') {
    if (d.rate_per_acre) rows.push({ label: L('rate'), value: String(d.rate_per_acre) })
    if (d.operator_name) rows.push({ label: L('operator'), value: String(d.operator_name) })
    if (d.drone_type) rows.push({ label: L('drone'), value: optionLabel(DRONE_TYPE, d.drone_type, lang) })
    if (d.service_type?.length) rows.push({ label: L('services'), value: optionLabels(DRONE_SERVICE, d.service_type, lang) })
    if (d.coverage_area) rows.push({ label: L('coverage'), value: String(d.coverage_area) })
    if (d.min_acres) rows.push({ label: L('min'), value: String(d.min_acres) })
    if (d.crops_covered) rows.push({ label: L('crops'), value: String(d.crops_covered) })
    if (d.available_from || d.available_to) rows.push({ label: L('dates'), value: [d.available_from, d.available_to].filter(Boolean).join(' → ') })
    if (d.asset_village) rows.push({ label: L('village'), value: String(d.asset_village) })
  } else {
    if (d.crop_type) rows.push({ label: L('crop'), value: String(d.crop_type) })
    if (d.acreage) rows.push({ label: L('acreage'), value: String(d.acreage) })
    if (d.service_needed) rows.push({ label: L('services'), value: optionLabel(DRONE_SERVICE, d.service_needed, lang) })
    if (d.preferred_date) rows.push({ label: L('preferred'), value: String(d.preferred_date) })
    if (d.asset_village) rows.push({ label: L('village'), value: String(d.asset_village) })
  }
  return rows
}

const LABELS = {
  rate: { hi: 'दर (प्रति एकड़)', en: 'Rate (per acre)' },
  operator: { hi: 'ऑपरेटर', en: 'Operator' },
  drone: { hi: 'ड्रोन', en: 'Drone' },
  services: { hi: 'सेवाएं', en: 'Services' },
  coverage: { hi: 'क्षेत्र', en: 'Coverage' },
  min: { hi: 'न्यूनतम एकड़', en: 'Min acres' },
  crops: { hi: 'फसलें', en: 'Crops' },
  dates: { hi: 'उपलब्धता', en: 'Availability' },
  village: { hi: 'गाँव/कस्बा', en: 'Village/town' },
  crop: { hi: 'फसल', en: 'Crop' },
  acreage: { hi: 'रकबा', en: 'Acreage' },
  preferred: { hi: 'पसंदीदा तारीख़', en: 'Preferred date' },
}
