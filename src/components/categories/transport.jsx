// Transport / logistics category module. A transporter lists themselves at their own
// location — exactly like Equipment or Labour. A farmer finds a nearby transporter via
// the standard 30km/50km radius and calls/WhatsApps to negotiate the actual route + price.
// There is NO origin/destination route modeling; the listing just starts the conversation.
// details JSONB shape:
//   { vehicle_type, capacity, rate_basis, rate_amount }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, TextField } from './fields'
import { VEHICLE_TYPE, TRANSPORT_RATE_BASIS, optionLabel } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    vehicle_type: '', // required: tractor_trolley | pickup | truck | tempo | other
    capacity: '', // optional free text (e.g. "5 टन" / "50 क्विंटल")
    rate_basis: '', // required: per_km | per_trip | negotiable
    rate_amount: '', // optional free text (e.g. "₹25/किमी")
  }
}

// No ownership claim — no self-declaration (same as equipment/labour).
export function needsSelfDeclaration() {
  return false
}

// Asset-location village: where the transporter is based, not a route.
export const locationLabelKey = 'field_transport_pincode'
export const locationPlaceholderKey = 'ph_transport_pincode'

export function validate(details, listingType, t) {
  if (!details.vehicle_type) return t('err_vehicle_type_required')
  if (!details.rate_basis) return t('err_transport_rate_basis_required')
  return null
}

export function Fields({ details, setDetails }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  return (
    <>
      <OptionSelect
        name="vehicle_type"
        label={t('field_vehicle_type')}
        list={VEHICLE_TYPE}
        value={details.vehicle_type}
        onChange={set('vehicle_type')}
        required
      />
      <TextField
        name="capacity"
        label={t('field_transport_capacity')}
        value={details.capacity}
        onChange={set('capacity')}
        placeholder={t('ph_transport_capacity')}
        hint={t('optional')}
      />
      <OptionSelect
        name="rate_basis"
        label={t('field_transport_rate_basis')}
        list={TRANSPORT_RATE_BASIS}
        value={details.rate_basis}
        onChange={set('rate_basis')}
        required
      />
      <TextField
        name="rate_amount"
        label={t('field_transport_rate_amount')}
        value={details.rate_amount}
        onChange={set('rate_amount')}
        placeholder={t('ph_transport_rate')}
        hint={t('optional')}
      />
    </>
  )
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (key) => LABELS[key][lang]
  const rows = []
  if (d.vehicle_type) rows.push({ label: L('vehicle'), value: optionLabel(VEHICLE_TYPE, d.vehicle_type, lang) })
  if (d.capacity && String(d.capacity).trim()) rows.push({ label: L('capacity'), value: String(d.capacity).trim() })
  if (d.rate_basis || (d.rate_amount && String(d.rate_amount).trim())) {
    const parts = []
    if (d.rate_basis) parts.push(optionLabel(TRANSPORT_RATE_BASIS, d.rate_basis, lang))
    if (d.rate_amount && String(d.rate_amount).trim()) parts.push(String(d.rate_amount).trim())
    rows.push({ label: L('rate'), value: parts.join(' · ') })
  }
  return rows
}

const LABELS = {
  vehicle: { hi: 'वाहन', en: 'Vehicle' },
  capacity: { hi: 'क्षमता', en: 'Capacity' },
  rate: { hi: 'दर', en: 'Rate' },
}
