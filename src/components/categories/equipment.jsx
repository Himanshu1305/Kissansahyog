// Equipment category module. details JSONB shape:
//   { equipment_type_id, rental_basis, rate_amount, available_now, available_from|null, available_to|null }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, LookupSelect, SegmentedChoice, DateField, TextField } from './fields'
import { RENTAL_BASIS, optionLabel } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    equipment_type_id: null,
    rental_basis: '',
    rate_amount: '', // v1.1: required (was absent in v1)
    available_now: true,
    available_from: null,
    available_to: null,
  }
}

export function needsSelfDeclaration() {
  return false
}

// Asset-location pincode: where the equipment actually is, not the poster's home.
export const locationLabelKey = 'field_equipment_pincode'
export const locationPlaceholderKey = 'ph_equipment_pincode'

export function validate(details, listingType, t) {
  if (!details.equipment_type_id) return t('err_equipment_type_required')
  // v1.1: rental basis + rate amount are required together.
  if (!details.rental_basis) return t('err_rental_basis_required')
  if (!String(details.rate_amount || '').trim()) return t('err_equipment_rate_required')
  if (!details.available_now && details.available_from && details.available_to) {
    if (details.available_from > details.available_to) return t('err_invalid_date_range')
  }
  return null
}

export function Fields({ details, setDetails, extras }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  return (
    <>
      <LookupSelect
        name="equipment_type_id"
        label={t('field_equipment_type')}
        rows={extras.equipmentTypes || []}
        value={details.equipment_type_id}
        onChange={set('equipment_type_id')}
        required
      />
      <OptionSelect
        name="rental_basis"
        label={t('field_rental_basis')}
        list={RENTAL_BASIS}
        value={details.rental_basis}
        onChange={set('rental_basis')}
        required
      />
      <TextField
        name="rate_amount"
        label={t('field_equipment_rate')}
        value={details.rate_amount}
        onChange={set('rate_amount')}
        placeholder={t('ph_equipment_rate')}
        required
      />
      <SegmentedChoice
        label={t('field_availability')}
        value={details.available_now ? 'now' : 'dates'}
        onChange={(v) => setDetails((d) => ({ ...d, available_now: v === 'now' }))}
        options={[
          { value: 'now', label: t('avail_now') },
          { value: 'dates', label: t('avail_dates') },
        ]}
      />
      {!details.available_now && (
        <>
          <DateField name="available_from" label={t('field_from_date')} value={details.available_from} onChange={set('available_from')} hint={t('ph_equipment_available')} />
          <DateField name="available_to" label={t('field_to_date')} value={details.available_to} onChange={set('available_to')} />
        </>
      )}
    </>
  )
}

export function summarize(listing, lang, extras) {
  const d = listing.details || {}
  const rows = []
  const type = (extras.equipmentTypes || []).find((e) => e.id === d.equipment_type_id)
  if (type) rows.push({ label: LABELS.type[lang], value: lang === 'hi' ? type.name_hi : type.name_en })
  if (d.rental_basis || (d.rate_amount && String(d.rate_amount).trim())) {
    const parts = []
    if (d.rental_basis) parts.push(optionLabel(RENTAL_BASIS, d.rental_basis, lang))
    if (d.rate_amount && String(d.rate_amount).trim()) parts.push(String(d.rate_amount).trim())
    rows.push({ label: LABELS.rate[lang], value: parts.join(' · ') })
  }
  rows.push({
    label: LABELS.availability[lang],
    value: d.available_now
      ? AVAIL_NOW[lang]
      : [d.available_from, d.available_to].filter(Boolean).join(' → ') || AVAIL_NOW[lang],
  })
  return rows
}

const LABELS = {
  type: { hi: 'मशीन का प्रकार', en: 'Equipment type' },
  rate: { hi: 'किराया', en: 'Rental rate' },
  availability: { hi: 'उपलब्धता', en: 'Availability' },
}
const AVAIL_NOW = { hi: 'अभी उपलब्ध', en: 'Available now' }
