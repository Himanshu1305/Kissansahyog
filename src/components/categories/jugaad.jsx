// Jugaad / Rural Innovations category module (Phase 9; simplified in Batch 2 item D).
// details JSONB shape:
//   offer: { offer_type, innovation_name, what_does, crop_activity, demo_video,
//     price, tested, village, not_road_vehicle, provider_declared, photo_urls[] }
//   requirement: { innovation_name, problem, village }
// Simpler form: photo (>=1), name, what-it-does, type and price are the essentials;
// crop/work, demo video and tested are optional. "units made" and the testing-body
// name were dropped from the form (old values still display). The road-vehicle rule
// is now one line inside the Post declaration checkbox (not a separate field here);
// not_road_vehicle is set true on submit. Server + client validation agree.
import { useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field } from '../ui'
import { OptionSelect, TextField, TextAreaField } from './fields'
import { JUGAAD_OFFER_TYPE, JUGAAD_TESTED, optionLabel } from '../../lib/listings/catalog'
import { MAX_PHOTOS, uploadPhotos } from '../../lib/listings/photos'

export function initialDetails() {
  return {
    offer_type: '', innovation_name: '', what_does: '', crop_activity: '',
    demo_video: '', price: '', tested: '', village: '',
    problem: '', // requirement only
    photo_urls: [], __photoFiles: [],
  }
}

export function needsSelfDeclaration() {
  return false
}

export const locationLabelKey = 'field_gh_pincode'
export const locationPlaceholderKey = 'ph_gh_pincode'

export function validate(details, listingType, t) {
  if (listingType === 'requirement') {
    if (!String(details.innovation_name || '').trim()) return t('err_jugaad_name_required')
    return null
  }
  // offer
  if (!details.offer_type) return t('err_jugaad_offer_type_required')
  if (!String(details.innovation_name || '').trim()) return t('err_jugaad_name_required')
  if (!String(details.what_does || '').trim()) return t('err_jugaad_what_required')
  // Price/rent is the seller's own; optional only for "विकास में" (work in progress).
  if (details.offer_type !== 'wip_help' && !String(details.price || '').trim()) return t('err_jugaad_price_required')
  const photoCount = (details.__photoFiles || []).length + (details.photo_urls || []).length
  if (photoCount < 1) return t('err_jugaad_photo_required')
  return null
}

export function Fields({ details, setDetails, listingType }) {
  const { t } = useLang()
  const fileRef = useRef(null)
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  const files = details.__photoFiles || []

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []).slice(0, MAX_PHOTOS)
    setDetails((d) => ({ ...d, __photoFiles: picked }))
  }

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
      {/* Photo — at least one is required for an offer. */}
      <Field label={t('field_photos')} hint={t('jugaad_photos_help')} required>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
          data-testid="jugaad-photos"
          className="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-4 file:py-2 file:text-white"
        />
        {files.length > 0 && (
          <div className="mt-2 flex gap-2">
            {files.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
          </div>
        )}
      </Field>

      <TextField name="innovation_name" label={t('field_jugaad_name')} value={details.innovation_name} onChange={set('innovation_name')} placeholder={t('ph_jugaad_name')} required />
      <TextAreaField name="what_does" label={t('field_jugaad_what')} value={details.what_does} onChange={set('what_does')} placeholder={t('ph_jugaad_what')} required />
      <OptionSelect name="offer_type" label={t('field_jugaad_offer_type')} list={JUGAAD_OFFER_TYPE} value={details.offer_type} onChange={set('offer_type')} required />
      <TextField name="price" label={t('field_jugaad_price')} value={details.price} onChange={set('price')} required={details.offer_type !== 'wip_help'} />
      <TextField name="crop_activity" label={t('field_jugaad_crop')} value={details.crop_activity} onChange={set('crop_activity')} />
      <TextField name="demo_video" label={t('field_jugaad_video')} value={details.demo_video} onChange={set('demo_video')} placeholder={t('ph_jugaad_video')} />
      <OptionSelect name="tested" label={t('field_jugaad_tested')} list={JUGAAD_TESTED} value={details.tested} onChange={set('tested')} />
    </>
  )
}

export async function finalizeDetails(details, { actorId, listingType } = {}) {
  if (listingType === 'requirement') {
    return { innovation_name: details.innovation_name, problem: details.problem || '', village: details.village || '' }
  }
  const files = details.__photoFiles || []
  let photo_urls = details.photo_urls || []
  if (files.length) photo_urls = await uploadPhotos(files, actorId)
  return {
    offer_type: details.offer_type,
    innovation_name: details.innovation_name,
    what_does: details.what_does || '',
    crop_activity: details.crop_activity || '',
    demo_video: details.demo_video || '',
    price: details.price || '',
    tested: details.tested || '',
    village: details.village || '',
    photo_urls,
    // Road-going vehicles are not accepted; the farmer agrees to this in the single
    // Post declaration checkbox, so the server flag is set here (RPC requires it).
    not_road_vehicle: 'true',
  }
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const L = (k) => LABELS[k][lang]
  const rows = []
  if (d.innovation_name) rows.push({ label: L('name'), value: String(d.innovation_name) })
  if (listing.listing_type === 'offer' && d.offer_type) rows.push({ label: L('offer'), value: optionLabel(JUGAAD_OFFER_TYPE, d.offer_type, lang) })
  // what-it-does (new field) with a fallback to the legacy how_helps on older rows.
  const whatDoes = d.what_does || d.how_helps
  if (whatDoes) rows.push({ label: L('what'), value: String(whatDoes) })
  if (d.tested) rows.push({ label: L('tested'), value: optionLabel(JUGAAD_TESTED, d.tested, lang) })
  if (d.price) rows.push({ label: L('price'), value: String(d.price) })
  // Keep showing legacy values from older listings (removed from the form, not the data).
  if (d.units_made) rows.push({ label: L('units'), value: String(d.units_made) })
  if (d.testing_body) rows.push({ label: L('testing_body'), value: String(d.testing_body) })
  return rows
}

const LABELS = {
  name: { hi: 'नवाचार', en: 'Innovation' },
  offer: { hi: 'प्रकार', en: 'Type' },
  what: { hi: 'क्या करता है', en: 'What it does' },
  tested: { hi: 'परीक्षण', en: 'Tested' },
  price: { hi: 'दाम', en: 'Price' },
  units: { hi: 'बनाए', en: 'Units made' },
  testing_body: { hi: 'परीक्षण संस्था', en: 'Testing body' },
}
