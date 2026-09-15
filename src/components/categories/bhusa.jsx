// Bhusa / Parali category module (agricultural residue marketplace).
// details JSONB shape:
//   { residue_type, quantity, pickup_arrangement, buyer_type_preference,
//     asking_price, available_from|null }
// Location (pincode/lat/long) lives on the listing row, from the residue's own
// pincode (asset-location rule, Phase 1) — never the poster's home.
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, TextField, DateField } from './fields'
import {
  RESIDUE_TYPE, PICKUP_ARRANGEMENT, BUYER_TYPE_PREFERENCE, optionLabel,
} from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    residue_type: '',
    quantity: '',
    pickup_arrangement: '',
    buyer_type_preference: '',
    asking_price: '',
    available_from: null,
  }
}

// No ownership claim is made for a farm byproduct — no self-declaration.
export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_bhusa_pincode'
// Environmental disclaimer shown on the form (in addition to the standard one).
export const extraDisclaimerKey = 'bhusa'

export function validate(details, listingType, t) {
  if (!details.residue_type) return t('err_residue_type_required')
  if (!String(details.quantity || '').trim()) return t('err_quantity_required')
  if (!details.pickup_arrangement) return t('err_pickup_required')
  if (!details.buyer_type_preference) return t('err_buyer_type_required')
  if (!String(details.asking_price || '').trim()) return t('err_asking_price_required')
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  // For a Requirement, buyer_type_preference is the buyer's OWN type.
  const buyerLabel = listingType === 'requirement' ? t('field_buyer_type_self') : t('field_buyer_type')
  return (
    <>
      <OptionSelect
        name="residue_type"
        label={t('field_residue_type')}
        list={RESIDUE_TYPE}
        value={details.residue_type}
        onChange={set('residue_type')}
        required
      />
      <TextField
        name="quantity"
        label={t('field_quantity')}
        value={details.quantity}
        onChange={set('quantity')}
        placeholder={t('quantity_ph')}
        required
      />
      <OptionSelect
        name="pickup_arrangement"
        label={t('field_pickup')}
        list={PICKUP_ARRANGEMENT}
        value={details.pickup_arrangement}
        onChange={set('pickup_arrangement')}
        required
      />
      <OptionSelect
        name="buyer_type_preference"
        label={buyerLabel}
        list={BUYER_TYPE_PREFERENCE}
        value={details.buyer_type_preference}
        onChange={set('buyer_type_preference')}
        required
      />
      <TextField
        name="asking_price"
        label={t('field_asking_price')}
        value={details.asking_price}
        onChange={set('asking_price')}
        placeholder={t('asking_price_ph')}
        required
      />
      <DateField
        name="available_from"
        label={t('field_available_from')}
        value={details.available_from}
        onChange={set('available_from')}
      />
    </>
  )
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (key) => LABELS[key][lang]
  const rows = []
  if (d.residue_type) rows.push({ label: L('residue'), value: optionLabel(RESIDUE_TYPE, d.residue_type, lang) })
  if (d.quantity) rows.push({ label: L('quantity'), value: String(d.quantity) })
  if (d.asking_price) rows.push({ label: L('price'), value: String(d.asking_price) })
  if (d.pickup_arrangement)
    rows.push({ label: L('pickup'), value: optionLabel(PICKUP_ARRANGEMENT, d.pickup_arrangement, lang) })
  if (d.buyer_type_preference)
    rows.push({ label: L('buyer'), value: optionLabel(BUYER_TYPE_PREFERENCE, d.buyer_type_preference, lang) })
  if (d.available_from) rows.push({ label: L('available'), value: String(d.available_from) })
  return rows
}

const LABELS = {
  residue: { hi: 'प्रकार', en: 'Type' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  price: { hi: 'दाम', en: 'Price' },
  pickup: { hi: 'उठाव', en: 'Pickup' },
  buyer: { hi: 'खरीदार', en: 'Buyer' },
  available: { hi: 'उपलब्ध', en: 'Available' },
}
