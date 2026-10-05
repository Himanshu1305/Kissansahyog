// Jugaad / Rural Innovations category module (Phase 9). details JSONB shape:
//   offer: { offer_type, innovation_name, problem, crop_activity, how_helps,
//     demo_video, price, units_made, tested, testing_body, maker_name, village,
//     not_road_vehicle, provider_declared }
//   requirement: { innovation_name, problem, village }
// Road-going vehicles are NOT accepted (server + client validation + message).
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, TextField, TextAreaField } from './fields'
import { JUGAAD_OFFER_TYPE, JUGAAD_TESTED, optionLabel } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    offer_type: '', innovation_name: '', problem: '', crop_activity: '', how_helps: '',
    demo_video: '', price: '', units_made: '', tested: '', testing_body: '',
    maker_name: '', village: '', not_road_vehicle: false,
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_gh_pincode'
export const locationPlaceholderKey = 'ph_gh_pincode'

export function validate(details, listingType, t) {
  if (listingType === 'offer') {
    if (!details.offer_type) return t('err_jugaad_offer_type_required')
    if (!String(details.innovation_name || '').trim()) return t('err_jugaad_name_required')
    if (details.not_road_vehicle !== true) return t('err_road_vehicle_not_allowed')
  } else {
    if (!String(details.innovation_name || '').trim()) return t('err_jugaad_name_required')
  }
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))

  if (listingType === 'requirement') {
    return (
      <>
        <TextField name="innovation_name" label={t('field_jugaad_name')} value={details.innovation_name} onChange={set('innovation_name')} placeholder={t('ph_jugaad_name')} required />
        <TextAreaField name="problem" label={t('field_jugaad_problem')} value={details.problem} onChange={set('problem')} />
        <TextField name="village" label={t('field_jugaad_village')} value={details.village} onChange={set('village')} />
      </>
    )
  }
  return (
    <>
      <OptionSelect name="offer_type" label={t('field_jugaad_offer_type')} list={JUGAAD_OFFER_TYPE} value={details.offer_type} onChange={set('offer_type')} required />
      <TextField name="innovation_name" label={t('field_jugaad_name')} value={details.innovation_name} onChange={set('innovation_name')} placeholder={t('ph_jugaad_name')} required />
      <TextAreaField name="problem" label={t('field_jugaad_problem')} value={details.problem} onChange={set('problem')} />
      <TextField name="crop_activity" label={t('field_jugaad_crop')} value={details.crop_activity} onChange={set('crop_activity')} />
      <TextAreaField name="how_helps" label={t('field_jugaad_help')} value={details.how_helps} onChange={set('how_helps')} />
      <TextField name="demo_video" label={t('field_jugaad_video')} value={details.demo_video} onChange={set('demo_video')} placeholder={t('ph_jugaad_video')} />
      <TextField name="price" label={t('field_jugaad_price')} value={details.price} onChange={set('price')} />
      <TextField name="units_made" label={t('field_jugaad_units')} value={details.units_made} onChange={set('units_made')} />
      <OptionSelect name="tested" label={t('field_jugaad_tested')} list={JUGAAD_TESTED} value={details.tested} onChange={set('tested')} />
      {details.tested === 'tested' && (
        <TextField name="testing_body" label={t('field_jugaad_testing_body')} value={details.testing_body} onChange={set('testing_body')} />
      )}
      <TextField name="maker_name" label={t('field_jugaad_maker')} value={details.maker_name} onChange={set('maker_name')} />
      <TextField name="village" label={t('field_jugaad_village')} value={details.village} onChange={set('village')} />

      {/* Road-going vehicles are NOT accepted (Phase 9). Required confirmation. */}
      <label className="my-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
        <input type="checkbox" checked={details.not_road_vehicle === true} onChange={(e) => set('not_road_vehicle')(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-green-700" data-testid="jugaad-not-road-vehicle" />
        <span className="text-sm text-stone-800">{t('jugaad_not_road_vehicle')}</span>
      </label>
    </>
  )
}

export function finalizeDetails(details, { listingType } = {}) {
  if (listingType === 'requirement') {
    return { innovation_name: details.innovation_name, problem: details.problem || '', village: details.village || '' }
  }
  const out = {
    offer_type: details.offer_type, innovation_name: details.innovation_name,
    problem: details.problem || '', crop_activity: details.crop_activity || '', how_helps: details.how_helps || '',
    demo_video: details.demo_video || '', price: details.price || '', units_made: details.units_made || '',
    tested: details.tested || '', maker_name: details.maker_name || '', village: details.village || '',
    not_road_vehicle: details.not_road_vehicle === true ? 'true' : 'false',
  }
  if (details.tested === 'tested' && details.testing_body) out.testing_body = details.testing_body
  return out
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (d.innovation_name) rows.push({ label: L('name'), value: String(d.innovation_name) })
  if (listing.listing_type === 'offer' && d.offer_type) rows.push({ label: L('offer'), value: optionLabel(JUGAAD_OFFER_TYPE, d.offer_type, lang) })
  if (d.tested) rows.push({ label: L('tested'), value: optionLabel(JUGAAD_TESTED, d.tested, lang) })
  if (d.price) rows.push({ label: L('price'), value: String(d.price) })
  return rows
}

const LABELS = {
  name: { hi: 'नवाचार', en: 'Innovation' },
  offer: { hi: 'प्रकार', en: 'Type' },
  tested: { hi: 'परीक्षण', en: 'Tested' },
  price: { hi: 'दाम', en: 'Price' },
}
