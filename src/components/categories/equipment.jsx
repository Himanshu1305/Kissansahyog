// Equipment category module. details JSONB shape:
//   { equipment_type_id, rental_basis, rate_amount, available_now, available_from|null, available_to|null }
// Water-tanker sub-type (Phase 5) adds, when is_tanker:
//   { is_tanker, capacity_litres, tanker_vehicle, water_use, water_source,
//     rate_per_trip, rate_per_1000l, service_radius_km, available_months[] }
// Batch 9C spec fields (offers; every type in EQUIPMENT_SPECS, catalog.js — not Trolley / Water tanker):
//   { spec_version: 1, brand, brand_other?, model, year, power_hp?, spec_*…, output_per_hour?, output_unit?,
//     output_unit_other? }; requirements may carry an optional { min_hp }. Older rows have none of these
//   keys and render exactly as before.
import { useEffect } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, LookupSelect, SegmentedChoice, DateField, TextField, NumberField, MultiChips, FieldRow } from './fields'
import {
  RENTAL_BASIS, TANKER_VEHICLE, TANKER_WATER_USE, TANKER_WATER_SOURCE, MONTH_OPTIONS, EQUIPMENT_TAGS, optionLabel, optionLabels,
  TRACTOR_BRANDS, OUTPUT_UNITS, SPEC_FIELDS, SPEC_KEYS, SPEC_VERSION, SPEC_SELLER_NOTE,
  equipmentSpecFor, equipmentSpecFields, checkEquipmentSpec, equipmentSpecMessage, asciiDigits,
} from '../../lib/listings/catalog'
import { fetchEquipmentTypes } from '../../lib/listings/listingsApi'

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

// English name of the chosen type (the spec table is keyed by it, like the tanker code above).
function typeNameOf(types, id) {
  return (types || []).find((e) => e.id === id)?.name_en ?? null
}

// Asset-location pincode: where the equipment actually is, not the poster's home.
export const locationLabelKey = 'field_equipment_pincode'
export const locationPlaceholderKey = 'ph_equipment_pincode'

export function validate(details, listingType, t, ctx = {}) {
  if (!details.equipment_type_id) return t('err_equipment_type_required')
  if (details.is_tanker) {
    // Water tanker: capacity in litres is required; rates are the seller's own (optional).
    if (!(Number(details.capacity_litres) > 0)) return t('err_tanker_capacity_required')
  } else {
    // Batch 9C: brand / model / year / HP / type-specific fields (offers), min HP (requirements).
    const typeName = typeNameOf(ctx.extras?.equipmentTypes, details.equipment_type_id)
    const specErr = checkEquipmentSpec(details, typeName, listingType)
    if (specErr) return equipmentSpecMessage(specErr, typeName, ctx.lang || 'hi')
    // Batch1 item 5 — essentials only: the rate is required for an OFFER (what you
    // charge), optional for a requirement; rental basis is optional either way.
    if (listingType === 'offer' && !String(details.rate_amount || '').trim()) return t('err_equipment_rate_required')
  }
  if (!details.available_now && details.available_from && details.available_to) {
    if (details.available_from > details.available_to) return t('err_invalid_date_range')
  }
  return null
}

// The server refuses an offer without its specs (migration 0063: "equipment_spec_invalid:<field>:<reason>").
// Show the same message the form would have shown.
export function errorText(err, { details, lang, extras } = {}) {
  if (err?.code !== 'equipment_spec_invalid' || !err.field) return null
  const typeName = typeNameOf(extras?.equipmentTypes, details?.equipment_type_id)
  return equipmentSpecMessage({ field: err.field, reason: err.reason || 'required' }, typeName, lang || 'hi')
}

// Only the keys of the chosen type / listing type are saved; numbers are saved as numbers.
export function cleanSpecDetails(details, typeName, listingType) {
  const d = { ...details }
  for (const k of SPEC_KEYS) delete d[k]
  const spec = equipmentSpecFor(typeName)
  const num = (v) => Number(asciiDigits(v))
  const filled = (v) => asciiDigits(v) !== ''
  if (listingType === 'offer') {
    d.spec_version = SPEC_VERSION
    if (!spec) return d
    for (const f of equipmentSpecFields(typeName)) {
      if (!filled(details[f.key])) continue
      d[f.key] = f.kind === 'text' ? String(details[f.key]).trim() : num(details[f.key])
      if (f.dropdown && details.brand === 'other' && String(details.brand_other || '').trim()) d.brand_other = String(details.brand_other).trim()
    }
    if (filled(details.output_per_hour)) {
      d.output_per_hour = num(details.output_per_hour)
      d.output_unit = details.output_unit || spec.unit
      if (d.output_unit === 'other' && String(details.output_unit_other || '').trim()) d.output_unit_other = String(details.output_unit_other).trim()
    }
  } else if (spec?.power && filled(details.min_hp)) {
    d.min_hp = num(details.min_hp)
  }
  return d
}

export async function finalizeDetails(details, { listingType }) {
  const types = await fetchEquipmentTypes().catch(() => [])
  return cleanSpecDetails(details, typeNameOf(types, details.equipment_type_id), listingType)
}

export function Fields({ details, setDetails, extras, listingType, error }) {
  const { t, lang } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  const tankerId = tankerTypeId(extras)
  const types = extras.equipmentTypes || []
  const typeName = typeNameOf(types, details.equipment_type_id)
  const spec = details.is_tanker ? null : equipmentSpecFor(typeName)

  // Selecting the type also flags the tanker sub-type so validate()/the Post form can
  // branch without re-reading the lookup rows, and pre-selects that type's output unit.
  const onType = (id) => setDetails((d) => {
    const next = { ...d, equipment_type_id: id, is_tanker: id != null && id === tankerId }
    const sp = equipmentSpecFor(typeNameOf(types, id))
    if (sp) next.output_unit = sp.unit
    return next
  })

  // The form's error belongs to one spec field: show it under that field and bring it into view.
  const specErr = error && spec ? checkEquipmentSpec(details, typeName, listingType) : null
  const errField = specErr && equipmentSpecMessage(specErr, typeName, lang) === error ? specErr.field : null
  const fe = (key) => (errField === key ? error : undefined)
  useEffect(() => {
    if (errField) document.getElementById(`f_${errField}`)?.scrollIntoView({ block: 'center' })
  }, [errField, error])

  const numberProps = (kind) => (kind === 'text' ? {} : { inputMode: 'decimal' })
  const optional = (label) => `${label} ${t('optional')}`

  // One spec field from the type's own definitions (equipmentSpecFields: per-type labels, hints, kinds).
  const specList = spec ? equipmentSpecFields(typeName) : []
  const specDefs = Object.fromEntries(specList.map((f) => [f.key, f]))
  const specExtras = specList.filter((f) => !['brand', 'model', 'year', 'power_hp'].includes(f.key))
  const specField = (f) => (f.dropdown ? (
    <OptionSelect key={f.key} name="brand" label={f.label[lang]} list={TRACTOR_BRANDS} value={details.brand} onChange={set('brand')} required error={fe('brand')} />
  ) : (
    <TextField
      key={f.key}
      name={f.key}
      label={f.label[lang]}
      value={details[f.key]}
      onChange={set(f.key)}
      required
      error={fe(f.key)}
      hint={f.hint?.[lang]}
      {...numberProps(f.kind)}
    />
  ))

  return (
    <>
      <LookupSelect
        name="equipment_type_id"
        label={t('field_equipment_type')}
        rows={types}
        value={details.equipment_type_id}
        onChange={onType}
        required
      />

      {spec && listingType === 'offer' && (
        <div data-testid="equipment-specs" className="my-3 rounded-xl border-2 border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-sm font-semibold text-stone-600">🔧 {t('spec_section_title')}</p>
          {/* Batch 10A: Brand | Model and Year | HP share a row; extras one per row; Output | Unit share a row. */}
          <FieldRow>
            {specField(specDefs.brand)}
            {specField(specDefs.model)}
          </FieldRow>
          {specDefs.brand.dropdown && details.brand === 'other' && (
            <TextField name="brand_other" label={SPEC_FIELDS.brand_other.label[lang]} value={details.brand_other} onChange={set('brand_other')} required error={fe('brand_other')} />
          )}
          {specDefs.power_hp ? (
            <FieldRow>
              {specField(specDefs.year)}
              {specField(specDefs.power_hp)}
            </FieldRow>
          ) : specField(specDefs.year)}
          {specExtras.map((f) => specField(f))}
          <FieldRow>
            <TextField name="output_per_hour" label={optional(SPEC_FIELDS.output_per_hour.label[lang])} value={details.output_per_hour} onChange={set('output_per_hour')} error={fe('output_per_hour')} inputMode="decimal" />
            <OptionSelect name="output_unit" label={SPEC_FIELDS.output_unit.label[lang]} list={OUTPUT_UNITS} value={details.output_unit || spec.unit} onChange={(v) => set('output_unit')(v || spec.unit)} includeEmpty={false} />
          </FieldRow>
          {(details.output_unit || spec.unit) === 'other' && (
            <TextField name="output_unit_other" label={SPEC_FIELDS.output_unit_other.label[lang]} value={details.output_unit_other} onChange={set('output_unit_other')} error={fe('output_unit_other')} />
          )}
        </div>
      )}

      {spec?.power && listingType === 'requirement' && (
        <TextField name="min_hp" label={optional(SPEC_FIELDS.min_hp.label[lang])} value={details.min_hp} onChange={set('min_hp')} error={fe('min_hp')} inputMode="decimal" />
      )}

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
          <FieldRow>
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
          </FieldRow>
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

// --- display (Batch 9C) ---
const fmtNum = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(v ?? '').trim())
const has = (v) => v != null && String(v).trim() !== ''

function brandText(d, lang) {
  if (!has(d.brand)) return ''
  if (d.brand === 'other') return String(d.brand_other || '').trim()
  return optionLabel(TRACTOR_BRANDS, d.brand, lang)
}
function outputText(d, lang) {
  if (!has(d.output_per_hour)) return ''
  const unit = d.output_unit === 'other' ? String(d.output_unit_other || '').trim() : optionLabel(OUTPUT_UNITS, d.output_unit, lang)
  return `${fmtNum(d.output_per_hour)}${unit ? ` ${unit}` : ''}`
}

// One comparable line for a listing card, e.g. "Massey Ferguson 245 · 2022 · 45 HP · 1.5 acre/hour".
// Requirements: "न्यूनतम 40 HP". Old listings without specs: null (the card is unchanged).
export function specLine(listing, lang) {
  const d = listing?.details || {}
  if (listing?.listing_type === 'requirement') return has(d.min_hp) ? `${lang === 'en' ? 'Minimum' : 'न्यूनतम'} ${fmtNum(d.min_hp)} HP` : null
  const name = [brandText(d, lang), String(d.model ?? '').trim()].filter(Boolean).join(' ')
  const parts = [name, has(d.year) ? String(d.year) : '', has(d.power_hp) ? `${fmtNum(d.power_hp)} HP` : '', outputText(d, lang)].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

// Spec rows for the detail page (only the keys the listing has, in the type's form order).
function specRows(d, lang, typeName) {
  const rows = []
  const label = (key) => {
    const own = equipmentSpecFields(typeName).find((f) => f.key === key)
    return (own || SPEC_FIELDS[key]).label[lang]
  }
  const keys = typeName && equipmentSpecFor(typeName)
    ? equipmentSpecFields(typeName).map((f) => f.key)
    : ['brand', 'model', 'year', 'power_hp', ...Object.keys(SPEC_FIELDS).filter((k) => k.startsWith('spec_'))]
  for (const key of keys) {
    if (!has(d[key])) continue
    const value = key === 'brand' ? brandText(d, lang) : key === 'power_hp' ? `${fmtNum(d[key])} HP` : key === 'year' ? String(d.year) : fmtNum(d[key])
    if (value) rows.push({ label: label(key), value, spec: key })
  }
  const out = outputText(d, lang)
  if (out) rows.push({ label: SPEC_FIELDS.output_per_hour.label[lang], value: out, spec: 'output_per_hour' })
  if (has(d.min_hp)) rows.push({ label: SPEC_FIELDS.min_hp.label[lang], value: `${fmtNum(d.min_hp)} HP`, spec: 'min_hp' })
  return rows
}

// The detail page's "given by the seller" note — only on listings that carry specs.
export function detailNote(listing, lang) {
  const d = listing?.details || {}
  const any = ['brand', 'model', 'year', 'power_hp', 'output_per_hour', 'min_hp'].some((k) => has(d[k])) || Object.keys(d).some((k) => k.startsWith('spec_') && k !== 'spec_version' && has(d[k]))
  return any ? SPEC_SELLER_NOTE[lang] || SPEC_SELLER_NOTE.hi : null
}

// The first two rows (type, rate) stay what cards have always shown; spec rows follow.
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
  if (!d.is_tanker) rows.push(...specRows(d, lang, type?.name_en ?? null))
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
