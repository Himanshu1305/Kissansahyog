// Greenhouse / polyhouse category module (Phase 7). details JSONB shape:
//   offer (vendor): { vendor_subtype, structure_types[], pipe_gauge, film_micron,
//     warranty_years, price_range_per_sqm, districts_served, mp_agro_year, provider_declared }
//   requirement (farmer): { area_sqm, structure_type, crop, budget, village }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, MultiChips, TextField, NumberField } from './fields'
import { GH_VENDOR_SUBTYPE, GH_STRUCTURE, optionLabel, optionLabels } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    // offer (vendor)
    vendor_subtype: '', structure_types: [], pipe_gauge: '', film_micron: '',
    warranty_years: '', price_range_per_sqm: '', districts_served: '', mp_agro_year: '',
    // requirement (farmer)
    area_sqm: '', structure_type: '', crop: '', budget: '', village: '',
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_gh_pincode'
export const locationPlaceholderKey = 'ph_gh_pincode'

export function validate(details, listingType, t) {
  if (listingType === 'offer') {
    if (!details.vendor_subtype) return t('err_gh_vendor_subtype_required')
  } else {
    if (!details.structure_type) return t('err_gh_structure_required')
    if (!String(details.area_sqm || '').trim()) return t('err_gh_area_required')
  }
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  if (listingType === 'requirement') {
    return (
      <>
        <NumberField name="area_sqm" label={t('field_gh_area')} value={details.area_sqm} onChange={set('area_sqm')} min={1} placeholder={t('ph_gh_area')} required />
        <OptionSelect name="structure_type" label={t('field_gh_structure')} list={GH_STRUCTURE} value={details.structure_type} onChange={set('structure_type')} required />
        <TextField name="crop" label={t('field_gh_crop')} value={details.crop} onChange={set('crop')} placeholder={t('ph_gh_crop')} />
        <TextField name="budget" label={t('field_gh_budget')} value={details.budget} onChange={set('budget')} placeholder={t('ph_gh_budget')} />
        <TextField name="village" label={t('field_gh_village')} value={details.village} onChange={set('village')} />
      </>
    )
  }
  return (
    <>
      <OptionSelect name="vendor_subtype" label={t('field_gh_vendor_subtype')} list={GH_VENDOR_SUBTYPE} value={details.vendor_subtype} onChange={set('vendor_subtype')} required />
      <MultiChips label={t('field_gh_structures')} list={GH_STRUCTURE} values={details.structure_types || []} onChange={set('structure_types')} />
      <TextField name="pipe_gauge" label={t('field_gh_pipe')} value={details.pipe_gauge} onChange={set('pipe_gauge')} placeholder={t('ph_gh_pipe')} />
      <TextField name="film_micron" label={t('field_gh_film')} value={details.film_micron} onChange={set('film_micron')} placeholder={t('ph_gh_film')} />
      <TextField name="warranty_years" label={t('field_gh_warranty')} value={details.warranty_years} onChange={set('warranty_years')} />
      <TextField name="price_range_per_sqm" label={t('field_gh_price')} value={details.price_range_per_sqm} onChange={set('price_range_per_sqm')} placeholder={t('ph_gh_price')} />
      <TextField name="districts_served" label={t('field_gh_districts')} value={details.districts_served} onChange={set('districts_served')} placeholder={t('ph_gh_districts')} />
      <TextField name="mp_agro_year" label={t('field_gh_mpagro')} value={details.mp_agro_year} onChange={set('mp_agro_year')} hint={t('field_gh_mpagro_hint')} />
    </>
  )
}

export function finalizeDetails(details, { listingType } = {}) {
  if (listingType === 'requirement') {
    return { area_sqm: details.area_sqm, structure_type: details.structure_type, crop: details.crop || '', budget: details.budget || '', village: details.village || '' }
  }
  return {
    vendor_subtype: details.vendor_subtype,
    structure_types: Array.isArray(details.structure_types) ? details.structure_types : [],
    pipe_gauge: details.pipe_gauge || '', film_micron: details.film_micron || '',
    warranty_years: details.warranty_years || '', price_range_per_sqm: details.price_range_per_sqm || '',
    districts_served: details.districts_served || '', mp_agro_year: details.mp_agro_year || '',
  }
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (listing.listing_type === 'offer') {
    if (d.vendor_subtype) rows.push({ label: L('subtype'), value: optionLabel(GH_VENDOR_SUBTYPE, d.vendor_subtype, lang) })
    if (d.structure_types?.length) rows.push({ label: L('structures'), value: optionLabels(GH_STRUCTURE, d.structure_types, lang) })
    if (d.price_range_per_sqm) rows.push({ label: L('price'), value: String(d.price_range_per_sqm) })
    if (d.districts_served) rows.push({ label: L('districts'), value: String(d.districts_served) })
  } else {
    if (d.area_sqm) rows.push({ label: L('area'), value: `${d.area_sqm} m²` })
    if (d.structure_type) rows.push({ label: L('structure'), value: optionLabel(GH_STRUCTURE, d.structure_type, lang) })
    if (d.crop) rows.push({ label: L('crop'), value: String(d.crop) })
    if (d.budget) rows.push({ label: L('budget'), value: String(d.budget) })
  }
  return rows
}

const LABELS = {
  subtype: { hi: 'सेवा', en: 'Service' },
  structures: { hi: 'ढांचे', en: 'Structures' },
  structure: { hi: 'ढांचा', en: 'Structure' },
  price: { hi: 'दर (प्रति m²)', en: 'Rate (per m²)' },
  districts: { hi: 'सेवा ज़िले', en: 'Districts served' },
  area: { hi: 'क्षेत्रफल', en: 'Area' },
  crop: { hi: 'फसल', en: 'Crop' },
  budget: { hi: 'बजट', en: 'Budget' },
}
