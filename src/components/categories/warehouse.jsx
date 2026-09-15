// Warehouse & Storage category module. Shape by listing_type, pruned in
// finalizeDetails. asset_pincode is the listing's row pincode (warehouse / farm
// location); everything else lives in details.
//   offer:       { warehouse_type, capacity_quintals, rate, available_from|null, facilities[], address, contact_name }
//   requirement: { crop_type, quantity_quintals, duration, preferred_type }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, MultiChips, TextField, NumberField, DateField } from './fields'
import { WAREHOUSE_TYPE, WAREHOUSE_FACILITY, optionLabel, optionLabels } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    // offer
    warehouse_type: '', capacity_quintals: null, rate: '', available_from: null,
    facilities: [], address: '', contact_name: '',
    // requirement
    crop_type: '', quantity_quintals: null, duration: '', preferred_type: '',
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_warehouse_pincode'
export const locationPlaceholderKey = 'ph_warehouse_pincode'

export function validate(details, listingType, t) {
  if (listingType === 'offer') {
    if (!details.warehouse_type) return t('err_warehouse_type_required')
    if (!details.capacity_quintals || details.capacity_quintals <= 0) return t('err_capacity_required')
    if (!String(details.rate || '').trim()) return t('err_warehouse_rate_required')
    if (!String(details.address || '').trim()) return t('err_warehouse_address_required')
  } else {
    if (!String(details.crop_type || '').trim()) return t('err_crop_type_required')
    if (!details.quantity_quintals || details.quantity_quintals <= 0) return t('err_quantity_quintals_required')
    if (!String(details.duration || '').trim()) return t('err_duration_required')
  }
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  if (listingType === 'requirement') {
    return (
      <>
        <TextField name="crop_type" label={t('field_crop_type')} value={details.crop_type} onChange={set('crop_type')} placeholder={t('ph_wh_crop')} required />
        <NumberField name="quantity_quintals" label={t('field_quantity_quintals')} value={details.quantity_quintals} onChange={set('quantity_quintals')} min={1} placeholder={t('ph_wh_quantity')} required />
        <TextField name="duration" label={t('field_duration')} value={details.duration} onChange={set('duration')} placeholder={t('ph_wh_duration')} required />
        <OptionSelect name="preferred_type" label={t('field_preferred_type')} list={WAREHOUSE_TYPE} value={details.preferred_type} onChange={set('preferred_type')} />
      </>
    )
  }
  return (
    <>
      <OptionSelect name="warehouse_type" label={t('field_warehouse_type')} list={WAREHOUSE_TYPE} value={details.warehouse_type} onChange={set('warehouse_type')} required />
      <NumberField name="capacity_quintals" label={t('field_capacity')} value={details.capacity_quintals} onChange={set('capacity_quintals')} min={1} placeholder={t('ph_wh_capacity')} required />
      <TextField name="rate" label={t('field_rate')} value={details.rate} onChange={set('rate')} placeholder={t('ph_wh_rate')} required />
      <DateField name="available_from" label={t('field_from_date')} value={details.available_from} onChange={set('available_from')} />
      <MultiChips label={t('field_facilities')} list={WAREHOUSE_FACILITY} values={details.facilities} onChange={set('facilities')} />
      <TextField name="address" label={t('field_wh_address')} value={details.address} onChange={set('address')} placeholder={t('ph_wh_address')} required />
      <TextField name="contact_name" label={t('field_contact_name')} value={details.contact_name} onChange={set('contact_name')} hint={t('optional')} />
    </>
  )
}

export function finalizeDetails(details, { listingType } = {}) {
  if (listingType === 'requirement') {
    return {
      crop_type: details.crop_type, quantity_quintals: Number(details.quantity_quintals) || 0,
      duration: details.duration, preferred_type: details.preferred_type || '',
    }
  }
  return {
    warehouse_type: details.warehouse_type, capacity_quintals: Number(details.capacity_quintals) || 0,
    rate: details.rate, available_from: details.available_from || null,
    facilities: Array.isArray(details.facilities) ? details.facilities : [],
    address: details.address, contact_name: details.contact_name || '',
  }
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (listing.listing_type === 'offer') {
    if (d.warehouse_type) rows.push({ label: L('type'), value: optionLabel(WAREHOUSE_TYPE, d.warehouse_type, lang) })
    if (d.capacity_quintals) rows.push({ label: L('capacity'), value: `${d.capacity_quintals} ${QUINTAL[lang]}` })
    if (d.rate) rows.push({ label: L('rate'), value: String(d.rate) })
    if (d.facilities?.length) rows.push({ label: L('facilities'), value: optionLabels(WAREHOUSE_FACILITY, d.facilities, lang) })
    if (d.available_from) rows.push({ label: L('available'), value: String(d.available_from) })
    if (d.address) rows.push({ label: L('address'), value: String(d.address) })
    if (d.contact_name) rows.push({ label: L('contact'), value: String(d.contact_name) })
  } else {
    if (d.crop_type) rows.push({ label: L('crop'), value: String(d.crop_type) })
    if (d.quantity_quintals) rows.push({ label: L('quantity'), value: `${d.quantity_quintals} ${QUINTAL[lang]}` })
    if (d.duration) rows.push({ label: L('duration'), value: String(d.duration) })
    if (d.preferred_type) rows.push({ label: L('type'), value: optionLabel(WAREHOUSE_TYPE, d.preferred_type, lang) })
  }
  return rows
}

const QUINTAL = { hi: 'क्विंटल', en: 'quintal' }
const LABELS = {
  type: { hi: 'प्रकार', en: 'Type' },
  capacity: { hi: 'क्षमता', en: 'Capacity' },
  rate: { hi: 'दर', en: 'Rate' },
  facilities: { hi: 'सुविधाएं', en: 'Facilities' },
  available: { hi: 'उपलब्ध', en: 'Available' },
  address: { hi: 'पता', en: 'Address' },
  contact: { hi: 'संपर्क', en: 'Contact' },
  crop: { hi: 'फसल', en: 'Crop' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  duration: { hi: 'अवधि', en: 'Duration' },
}
