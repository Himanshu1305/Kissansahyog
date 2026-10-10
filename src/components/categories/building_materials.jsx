// Building-materials category. Details stay in listings.details JSONB:
// { material_type, brand_or_grade, quantity, unit, rate_amount,
//   delivery_available, pickup_location }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, TextField } from './fields'
import { BUILDING_MATERIAL_TYPE, BUILDING_MATERIAL_UNIT, YES_NO, optionLabel } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    material_type: '',
    brand_or_grade: '',
    quantity: '',
    unit: '',
    rate_amount: '',
    delivery_available: '',
    pickup_location: '',
  }
}

export function needsSelfDeclaration() { return false }

// The same bilingual responsibility line appears on the form and detail page.
export const extraDisclaimerKey = 'building_materials'

export function validate(details, listingType, t) {
  if (!details.material_type) return t('err_building_material_type_required')
  if (!String(details.quantity || '').trim()) return t('err_building_quantity_required')
  if (!details.unit) return t('err_building_unit_required')
  if (listingType === 'offer' && !String(details.rate_amount || '').trim()) return t('err_building_rate_required')
  if (!details.delivery_available) return t('err_building_delivery_required')
  if (!String(details.pickup_location || '').trim()) return t('err_building_pickup_required')
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (key) => (value) => setDetails((d) => ({ ...d, [key]: value }))
  return (
    <>
      <OptionSelect name="material_type" label={t('field_building_material_type')} list={BUILDING_MATERIAL_TYPE} value={details.material_type} onChange={set('material_type')} required />
      <TextField name="brand_or_grade" label={t('field_building_brand_grade')} value={details.brand_or_grade} onChange={set('brand_or_grade')} placeholder={t('ph_building_brand_grade')} />
      <TextField name="quantity" label={t('field_building_quantity')} value={details.quantity} onChange={set('quantity')} placeholder={t('ph_building_quantity')} required />
      <OptionSelect name="unit" label={t('field_building_unit')} list={BUILDING_MATERIAL_UNIT} value={details.unit} onChange={set('unit')} required />
      <TextField name="rate_amount" label={t('field_building_rate')} value={details.rate_amount} onChange={set('rate_amount')} placeholder={t('ph_building_rate')} required={listingType === 'offer'} />
      <OptionSelect name="delivery_available" label={t('field_building_delivery')} list={YES_NO} value={details.delivery_available} onChange={set('delivery_available')} required />
      <TextField name="pickup_location" label={t('field_building_pickup')} value={details.pickup_location} onChange={set('pickup_location')} placeholder={t('ph_building_pickup')} required />
    </>
  )
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const rows = []
  if (d.material_type) rows.push({ label: LABELS.material[lang], value: optionLabel(BUILDING_MATERIAL_TYPE, d.material_type, lang) })
  if (d.quantity || d.unit) rows.push({ label: LABELS.quantity[lang], value: [d.quantity, optionLabel(BUILDING_MATERIAL_UNIT, d.unit, lang)].filter(Boolean).join(' ') })
  if (d.brand_or_grade) rows.push({ label: LABELS.brand[lang], value: d.brand_or_grade })
  if (d.rate_amount) rows.push({ label: LABELS.rate[lang], value: d.rate_amount })
  if (d.delivery_available) rows.push({ label: LABELS.delivery[lang], value: optionLabel(YES_NO, d.delivery_available, lang) })
  if (d.pickup_location) rows.push({ label: LABELS.pickup[lang], value: d.pickup_location })
  return rows
}

const LABELS = {
  material: { hi: 'सामग्री', en: 'Material' },
  brand: { hi: 'ब्रांड या ग्रेड', en: 'Brand or grade' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  rate: { hi: 'विक्रेता की दर', en: 'Seller’s rate' },
  delivery: { hi: 'डिलीवरी', en: 'Delivery available' },
  pickup: { hi: 'लेने की जगह', en: 'Pickup location' },
}
