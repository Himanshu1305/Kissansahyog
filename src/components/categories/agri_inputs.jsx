// Agri-Inputs category module (seeds / fertilizer / pesticide). Two sub-types on
// one form, chosen at the start:
//   farmer_surplus — a farmer selling extra inputs
//   vendor         — a shop/supplier listing what they sell
// details JSONB is pruned to the chosen sub-type's keys in finalizeDetails so no
// cross-shape leakage reaches the DB.
//   farmer_surplus: { subtype, input_type, item_name, quantity, asking_price, material_address, condition }
//   vendor:         { subtype, business_name, input_types, items_description, price_range, shop_address, contact_phone }
// Location (pincode/lat/long) is the material/shop pincode on the listing row.
import { useEffect } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Notice } from '../ui'
import { OptionSelect, MultiChips, SegmentedChoice, TextField, TextAreaField } from './fields'
import { AGRI_SUBTYPE, INPUT_TYPE, INPUT_CONDITION, optionLabel, optionLabels } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    subtype: 'farmer_surplus',
    // farmer_surplus
    input_type: '', item_name: '', quantity: '', asking_price: '', material_address: '', condition: '',
    // vendor
    business_name: '', input_types: [], items_description: '', price_range: '', shop_address: '', contact_phone: '',
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_agri_pincode'
export const locationPlaceholderKey = 'ph_agri_pincode'

const conditionRequired = (inputType) => inputType === 'seeds' || inputType === 'fertilizer'

export function validate(details, listingType, t) {
  if (details.subtype === 'vendor') {
    if (!String(details.business_name || '').trim()) return t('err_business_name_required')
    if (!Array.isArray(details.input_types) || details.input_types.length === 0) return t('err_input_types_required')
    if (!String(details.items_description || '').trim()) return t('err_items_description_required')
    if (!String(details.shop_address || '').trim()) return t('err_shop_address_required')
    return null
  }
  // farmer_surplus
  if (!details.input_type) return t('err_input_type_required')
  if (!String(details.item_name || '').trim()) return t('err_item_name_required')
  if (!String(details.quantity || '').trim()) return t('err_quantity_required')
  if (!String(details.asking_price || '').trim()) return t('err_asking_price_required')
  if (!String(details.material_address || '').trim()) return t('err_material_address_required')
  if (conditionRequired(details.input_type) && !details.condition) return t('err_condition_required')
  return null
}

export function Fields({ details, setDetails, listingType, user }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  // Vendor contact phone pre-fills from the profile, but stays editable.
  useEffect(() => {
    if (details.subtype === 'vendor' && !details.contact_phone && user?.phone) {
      setDetails((d) => ({ ...d, contact_phone: user.phone }))
    }
  }, [details.subtype, details.contact_phone, user, setDetails])

  return (
    <>
      <SegmentedChoice
        label={t('field_agri_subtype')}
        value={details.subtype}
        onChange={(v) => setDetails((d) => ({ ...d, subtype: v }))}
        options={AGRI_SUBTYPE.map((s) => ({ value: s.value, label: t(`agri_subtype_${s.value}`) }))}
      />

      {details.subtype === 'vendor' ? (
        <>
          <TextField name="business_name" label={t('field_business_name')} value={details.business_name} onChange={set('business_name')} placeholder={t('ph_agri_business')} required />
          <MultiChips label={t('field_input_types')} list={INPUT_TYPE} values={details.input_types} onChange={set('input_types')} required />
          <TextAreaField name="items_description" label={t('field_items_description')} value={details.items_description} onChange={set('items_description')} placeholder={t('ph_agri_items')} required />
          <TextField name="price_range" label={t('field_price_range')} value={details.price_range} onChange={set('price_range')} hint={t('optional')} placeholder={t('ph_agri_price_range')} />
          <TextField name="shop_address" label={t('field_shop_address')} value={details.shop_address} onChange={set('shop_address')} placeholder={t('ph_agri_shop_address')} required />
          <TextField name="contact_phone" label={t('field_contact_phone')} value={details.contact_phone} onChange={set('contact_phone')} />
          <Notice tone="info">{t('agri_vendor_future_charges')}</Notice>
        </>
      ) : (
        <>
          <OptionSelect name="input_type" label={t('field_input_type')} list={INPUT_TYPE} value={details.input_type} onChange={set('input_type')} required />
          <TextField name="item_name" label={t('field_item_name')} value={details.item_name} onChange={set('item_name')} placeholder={t('ph_agri_item')} required />
          <TextField name="quantity" label={t('field_quantity')} value={details.quantity} onChange={set('quantity')} placeholder={t('ph_agri_quantity')} required />
          <TextField name="asking_price" label={t('field_asking_price')} value={details.asking_price} onChange={set('asking_price')} placeholder={t('ph_agri_price')} required />
          <TextField name="material_address" label={t('field_material_address')} value={details.material_address} onChange={set('material_address')} placeholder={t('ph_agri_material_address')} required />
          {conditionRequired(details.input_type) && (
            <OptionSelect name="condition" label={t('field_condition')} list={INPUT_CONDITION} value={details.condition} onChange={set('condition')} required />
          )}
        </>
      )}
    </>
  )
}

// Prune to the chosen sub-type's exact key set (no cross-shape leakage in JSONB).
export function finalizeDetails(details, { user } = {}) {
  if (details.subtype === 'vendor') {
    return {
      subtype: 'vendor',
      business_name: details.business_name,
      input_types: Array.isArray(details.input_types) ? details.input_types : [],
      items_description: details.items_description,
      price_range: details.price_range || '',
      shop_address: details.shop_address,
      contact_phone: details.contact_phone || user?.phone || '',
    }
  }
  return {
    subtype: 'farmer_surplus',
    input_type: details.input_type,
    item_name: details.item_name,
    quantity: details.quantity,
    asking_price: details.asking_price,
    material_address: details.material_address,
    condition: details.condition || '',
  }
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (key) => LABELS[key][lang]
  const rows = []
  if (d.subtype === 'vendor') {
    if (d.business_name) rows.push({ label: L('business'), value: String(d.business_name) })
    if (d.input_types?.length) rows.push({ label: L('inputs'), value: optionLabels(INPUT_TYPE, d.input_types, lang) })
    if (d.items_description) rows.push({ label: L('items'), value: String(d.items_description) })
    if (d.price_range) rows.push({ label: L('price_range'), value: String(d.price_range) })
  } else {
    if (d.input_type) rows.push({ label: L('inputs'), value: optionLabel(INPUT_TYPE, d.input_type, lang) })
    if (d.item_name) rows.push({ label: L('item'), value: String(d.item_name) })
    if (d.quantity) rows.push({ label: L('quantity'), value: String(d.quantity) })
    if (d.asking_price) rows.push({ label: L('price'), value: String(d.asking_price) })
    if (d.condition) rows.push({ label: L('condition'), value: optionLabel(INPUT_CONDITION, d.condition, lang) })
  }
  return rows
}

const LABELS = {
  business: { hi: 'दुकान', en: 'Shop' },
  inputs: { hi: 'सामग्री', en: 'Inputs' },
  items: { hi: 'क्या बेचते हैं', en: 'Sells' },
  price_range: { hi: 'दाम', en: 'Price range' },
  item: { hi: 'नाम', en: 'Item' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  price: { hi: 'दाम', en: 'Price' },
  condition: { hi: 'स्थिति', en: 'Condition' },
}
