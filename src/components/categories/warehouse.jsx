// Warehouse & Storage category module. Shape by listing_type, pruned in
// finalizeDetails. asset_pincode is the listing's row pincode (warehouse / farm
// location); everything else lives in details.
//   offer:       { warehouse_type, capacity_quintals, rate, available_from|null, facilities[], address, contact_name }
//   requirement: { crop_type, quantity_quintals, duration, preferred_type }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, MultiChips, TextField, NumberField, DateField } from './fields'
import { WAREHOUSE_TYPE, WAREHOUSE_FACILITY, CS_FACILITY_TYPE, CS_RATE_UNIT, YES_NO, optionLabel, optionLabels } from '../../lib/listings/catalog'

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

      {/* Cold-storage specific fields (Phase 6) — shown only for शीत भंडार / Cold Storage. All optional. */}
      {details.warehouse_type === 'cold' && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
          <p className="mb-2 text-sm font-bold text-sky-900">{t('cs_fields_heading')}</p>
          <OptionSelect name="cs_facility_type" label={t('field_cs_facility_type')} list={CS_FACILITY_TYPE} value={details.cs_facility_type} onChange={set('cs_facility_type')} />
          <TextField name="temp_range" label={t('field_cs_temp')} value={details.temp_range} onChange={set('temp_range')} placeholder={t('ph_cs_temp')} />
          <TextField name="crops_accepted" label={t('field_cs_crops')} value={details.crops_accepted} onChange={set('crops_accepted')} placeholder={t('ph_cs_crops')} />
          <TextField name="space_available" label={t('field_cs_space')} value={details.space_available} onChange={set('space_available')} placeholder={t('ph_cs_space')} />
          <DateField name="space_updated" label={t('field_cs_space_updated')} value={details.space_updated} onChange={set('space_updated')} />
          <OptionSelect name="rate_unit" label={t('field_cs_rate_unit')} list={CS_RATE_UNIT} value={details.rate_unit} onChange={set('rate_unit')} />
          <TextField name="loading_charges" label={t('field_cs_loading')} value={details.loading_charges} onChange={set('loading_charges')} />
          <DateField name="season_from" label={t('field_cs_season_from')} value={details.season_from} onChange={set('season_from')} />
          <DateField name="season_to" label={t('field_cs_season_to')} value={details.season_to} onChange={set('season_to')} />
          <OptionSelect name="power_backup" label={t('field_cs_power')} list={YES_NO} value={details.power_backup} onChange={set('power_backup')} />
          <OptionSelect name="insurance" label={t('field_cs_insurance')} list={YES_NO} value={details.insurance} onChange={set('insurance')} />
          <TextField name="wdra_reg" label={t('field_cs_wdra')} value={details.wdra_reg} onChange={set('wdra_reg')} hint={t('optional')} />
          <OptionSelect name="pledge_loan" label={t('field_cs_pledge')} list={YES_NO} value={details.pledge_loan} onChange={set('pledge_loan')} />
          {details.pledge_loan === 'yes' && (
            <TextField name="pledge_bank" label={t('field_cs_pledge_bank')} value={details.pledge_bank} onChange={set('pledge_bank')} />
          )}
        </div>
      )}
    </>
  )
}

// Cold-storage detail keys carried through finalizeDetails for cold offers.
const CS_KEYS = ['cs_facility_type', 'temp_range', 'crops_accepted', 'space_available', 'space_updated', 'rate_unit', 'loading_charges', 'season_from', 'season_to', 'power_backup', 'insurance', 'wdra_reg', 'pledge_loan', 'pledge_bank']

export function finalizeDetails(details, { listingType } = {}) {
  if (listingType === 'requirement') {
    return {
      crop_type: details.crop_type, quantity_quintals: Number(details.quantity_quintals) || 0,
      duration: details.duration, preferred_type: details.preferred_type || '',
    }
  }
  const base = {
    warehouse_type: details.warehouse_type, capacity_quintals: Number(details.capacity_quintals) || 0,
    rate: details.rate, available_from: details.available_from || null,
    facilities: Array.isArray(details.facilities) ? details.facilities : [],
    address: details.address, contact_name: details.contact_name || '',
  }
  if (details.warehouse_type === 'cold') {
    for (const k of CS_KEYS) if (details[k] != null && details[k] !== '') base[k] = details[k]
  }
  return base
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (listing.listing_type === 'offer') {
    if (d.warehouse_type) rows.push({ label: L('type'), value: optionLabel(WAREHOUSE_TYPE, d.warehouse_type, lang) })
    if (d.capacity_quintals) rows.push({ label: L('capacity'), value: `${d.capacity_quintals} ${QUINTAL[lang]}` })
    if (d.rate) rows.push({ label: L('rate'), value: String(d.rate) })
    if (d.space_available) rows.push({ label: L('space'), value: String(d.space_available) })
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
  space: { hi: 'खाली जगह', en: 'Space available' },
  crop: { hi: 'फसल', en: 'Crop' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  duration: { hi: 'अवधि', en: 'Duration' },
}
