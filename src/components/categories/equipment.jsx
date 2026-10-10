// Equipment category module. details JSONB shape:
//   { equipment_type_id, rental_basis, rate_amount, available_now, available_from|null, available_to|null }
// Water-tanker sub-type (Phase 5) adds, when is_tanker:
//   { is_tanker, capacity_litres, tanker_vehicle, water_use, water_source,
//     rate_per_trip, rate_per_1000l, service_radius_km, available_months[] }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, LookupSelect, SegmentedChoice, DateField, TextField, NumberField, MultiChips } from './fields'
import { RENTAL_BASIS, TANKER_VEHICLE, TANKER_WATER_USE, TANKER_WATER_SOURCE, MONTH_OPTIONS, EQUIPMENT_TAGS, optionLabel, optionLabels } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    equipment_type_id: null,
    is_tanker: false,
    rental_basis: '',
    rate_amount: '', // v1.1: required (was absent in v1)
    available_now: true,
    available_from: null,
    available_to: null,
    equipment_tags: [],
  }
}

export function needsSelfDeclaration() {
  return false
}

// The id of the "Water tanker" equipment type (resolved from the loaded lookup rows).
function tankerTypeId(extras) {
  return (extras?.equipmentTypes || []).find((e) => e.name_en === 'Water tanker')?.id ?? null
}

// Asset-location pincode: where the equipment actually is, not the poster's home.
export const locationLabelKey = 'field_equipment_pincode'
export const locationPlaceholderKey = 'ph_equipment_pincode'

export function validate(details, listingType, t) {
  if (!details.equipment_type_id) return t('err_equipment_type_required')
  if (details.is_tanker) {
    // Water tanker: capacity in litres is required; rates are the seller's own (optional).
    if (!(Number(details.capacity_litres) > 0)) return t('err_tanker_capacity_required')
  } else {
    // Batch1 item 5 — essentials only: the rate is required for an OFFER (what you
    // charge), optional for a requirement; rental basis is optional either way.
    if (listingType === 'offer' && !String(details.rate_amount || '').trim()) return t('err_equipment_rate_required')
  }
  if (!details.available_now && details.available_from && details.available_to) {
    if (details.available_from > details.available_to) return t('err_invalid_date_range')
  }
  return null
}

export function Fields({ details, setDetails, extras, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  const tankerId = tankerTypeId(extras)

  // Selecting the type also flags the tanker sub-type so validate()/the Post form can
  // branch without re-reading the lookup rows.
  const onType = (id) => setDetails((d) => ({ ...d, equipment_type_id: id, is_tanker: id != null && id === tankerId }))

  return (
    <>
      <LookupSelect
        name="equipment_type_id"
        label={t('field_equipment_type')}
        rows={extras.equipmentTypes || []}
        value={details.equipment_type_id}
        onChange={onType}
        required
      />

      <MultiChips label={t('field_equipment_tags')} list={EQUIPMENT_TAGS} values={details.equipment_tags || []} onChange={set('equipment_tags')} />

      {details.is_tanker ? (
        <>
          <NumberField name="capacity_litres" label={t('field_tanker_capacity')} value={details.capacity_litres} onChange={set('capacity_litres')} min={1} required placeholder={t('ph_tanker_capacity')} />
          <OptionSelect name="tanker_vehicle" label={t('field_tanker_vehicle')} list={TANKER_VEHICLE} value={details.tanker_vehicle} onChange={set('tanker_vehicle')} />
          <OptionSelect name="water_use" label={t('field_tanker_use')} list={TANKER_WATER_USE} value={details.water_use} onChange={set('water_use')} />
          <OptionSelect name="water_source" label={t('field_tanker_source')} list={TANKER_WATER_SOURCE} value={details.water_source} onChange={set('water_source')} />
          <TextField name="rate_per_trip" label={t('field_tanker_rate_trip')} value={details.rate_per_trip} onChange={set('rate_per_trip')} placeholder={t('ph_tanker_rate_trip')} />
          <TextField name="rate_per_1000l" label={t('field_tanker_rate_1000l')} value={details.rate_per_1000l} onChange={set('rate_per_1000l')} placeholder={t('ph_tanker_rate_1000l')} />
          <NumberField name="service_radius_km" label={t('field_tanker_radius')} value={details.service_radius_km} onChange={set('service_radius_km')} min={1} />
          <MultiChips label={t('field_tanker_months')} list={MONTH_OPTIONS} values={details.available_months || []} onChange={set('available_months')} />
        </>
      ) : (
        <>
          <OptionSelect
            name="rental_basis"
            label={t('field_rental_basis')}
            list={RENTAL_BASIS}
            value={details.rental_basis}
            onChange={set('rental_basis')}
          />
          <TextField
            name="rate_amount"
            label={t('field_equipment_rate')}
            value={details.rate_amount}
            onChange={set('rate_amount')}
            placeholder={t('ph_equipment_rate')}
            required={listingType === 'offer'}
          />
        </>
      )}

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

  if (d.is_tanker) {
    if (Number(d.capacity_litres) > 0) rows.push({ label: LABELS.capacity[lang], value: `${Number(d.capacity_litres).toLocaleString('en-IN')} ${lang === 'hi' ? 'लीटर' : 'L'}` })
    const rateParts = [d.rate_per_trip, d.rate_per_1000l].map((x) => String(x || '').trim()).filter(Boolean)
    if (rateParts.length) rows.push({ label: LABELS.rate[lang], value: rateParts.join(' · ') })
  } else if (d.rental_basis || (d.rate_amount && String(d.rate_amount).trim())) {
    const parts = []
    if (d.rental_basis) parts.push(optionLabel(RENTAL_BASIS, d.rental_basis, lang))
    if (d.rate_amount && String(d.rate_amount).trim()) parts.push(String(d.rate_amount).trim())
    rows.push({ label: LABELS.rate[lang], value: parts.join(' · ') })
  }
  if (Array.isArray(d.equipment_tags) && d.equipment_tags.length) rows.push({ label: LABELS.tags[lang], value: optionLabels(EQUIPMENT_TAGS, d.equipment_tags, lang) })
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
  capacity: { hi: 'क्षमता', en: 'Capacity' },
  availability: { hi: 'उपलब्धता', en: 'Availability' },
  tags: { hi: 'यंत्र के टैग', en: 'Equipment tags' },
}
const AVAIL_NOW = { hi: 'अभी उपलब्ध', en: 'Available now' }
