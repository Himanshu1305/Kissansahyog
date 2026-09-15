// Land category module: form fields, validation, detail summary.
// Shape of details JSONB (see PROJECT_CONTEXT.md):
//   { size_range, arrangement[], water_source, crop_id|null, season, photo_urls[] }
import { useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field } from '../ui'
import { OptionSelect, MultiChips, LookupSelect, TextField } from './fields'
import { SIZE_RANGE, ARRANGEMENT, WATER_SOURCE, SEASON, PRICE_TYPE, optionLabel, optionLabels } from '../../lib/listings/catalog'
import { MAX_PHOTOS } from '../../lib/listings/photos'
import { uploadPhotos } from '../../lib/listings/photos'

export function initialDetails() {
  return {
    size_range: '',
    arrangement: [],
    water_source: '',
    crop_id: null,
    season: '',
    price_type: '', // required: fixed | sharecropping | negotiable
    price_amount: '', // only meaningful when price_type === 'fixed'
    photo_urls: [],
    __photoFiles: [], // transient: File[] pending upload, stripped before save
  }
}

// Only land OFFERS require the self-declaration.
export function needsSelfDeclaration(listingType) {
  return listingType === 'offer'
}

// Label for the required asset-location pincode field (rendered by ListingForm).
// Land is explicit and prominent: this is the LAND's pincode, not the poster's.
export const locationLabelKey = 'field_land_pincode'

// Returns a localized error string, or null.
export function validate(details, listingType, t) {
  if (!details.size_range) return t('field_size') + ' — ' + t('required_field')
  if (!details.price_type) return t('err_price_type_required')
  return null
}

export function Fields({ details, setDetails, extras }) {
  const { t } = useLang()
  const fileRef = useRef(null)
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  const files = details.__photoFiles || []

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []).slice(0, MAX_PHOTOS)
    setDetails((d) => ({ ...d, __photoFiles: picked }))
  }

  return (
    <>
      <OptionSelect
        name="size_range"
        label={t('field_size')}
        list={SIZE_RANGE}
        value={details.size_range}
        onChange={set('size_range')}
        required
      />
      <MultiChips
        label={t('field_arrangement')}
        list={ARRANGEMENT}
        values={details.arrangement}
        onChange={set('arrangement')}
      />
      <OptionSelect
        name="water_source"
        label={t('field_water')}
        list={WATER_SOURCE}
        value={details.water_source}
        onChange={set('water_source')}
      />
      <LookupSelect
        name="crop_id"
        label={t('field_crop')}
        rows={extras.crops || []}
        value={details.crop_id}
        onChange={set('crop_id')}
        emptyLabel={t('crop_any')}
      />
      <OptionSelect
        name="season"
        label={t('field_season')}
        list={SEASON}
        value={details.season}
        onChange={set('season')}
      />
      <OptionSelect
        name="price_type"
        label={t('field_price_type')}
        list={PRICE_TYPE}
        value={details.price_type}
        onChange={set('price_type')}
        required
      />
      {details.price_type === 'fixed' && (
        <TextField
          name="price_amount"
          label={t('field_price_amount')}
          value={details.price_amount}
          onChange={set('price_amount')}
          placeholder={t('price_amount_ph')}
        />
      )}

      <Field label={t('field_photos')} hint={t('photos_help')}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
          className="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-4 file:py-2 file:text-white"
        />
        {files.length > 0 && (
          <div className="mt-2 flex gap-2">
            {files.map((f, i) => (
              <img
                key={i}
                src={URL.createObjectURL(f)}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </Field>
    </>
  )
}

// Upload any pending photos, then return the clean details for saving.
export async function finalizeDetails(details, { actorId }) {
  const files = details.__photoFiles || []
  let photo_urls = details.photo_urls || []
  if (files.length) photo_urls = await uploadPhotos(files, actorId)
  const clean = { ...details }
  delete clean.__photoFiles
  return { ...clean, photo_urls }
}

// Rows for the detail view (only fields that have values).
export function summarize(listing, lang, extras) {
  const d = listing.details || {}
  const L = (key) => LABELS[key][lang]
  const rows = []
  if (d.size_range) rows.push({ label: L('size'), value: optionLabel(SIZE_RANGE, d.size_range, lang) })
  if (d.arrangement?.length)
    rows.push({ label: L('arrangement'), value: optionLabels(ARRANGEMENT, d.arrangement, lang) })
  if (d.water_source) rows.push({ label: L('water'), value: optionLabel(WATER_SOURCE, d.water_source, lang) })
  if (d.crop_id != null) {
    const crop = (extras.crops || []).find((c) => c.id === d.crop_id)
    if (crop) rows.push({ label: L('crop'), value: lang === 'hi' ? crop.name_hi : crop.name_en })
  }
  if (d.season) rows.push({ label: L('season'), value: optionLabel(SEASON, d.season, lang) })
  if (d.price_type) {
    const base = optionLabel(PRICE_TYPE, d.price_type, lang)
    const amt = d.price_type === 'fixed' && String(d.price_amount || '').trim()
      ? ` · ${String(d.price_amount).trim()}`
      : ''
    rows.push({ label: L('price'), value: base + amt })
  }
  return rows
}

const LABELS = {
  size: { hi: 'ज़मीन का आकार', en: 'Land size' },
  arrangement: { hi: 'व्यवस्था', en: 'Arrangement' },
  water: { hi: 'पानी का स्रोत', en: 'Water source' },
  crop: { hi: 'फसल', en: 'Crop' },
  season: { hi: 'मौसम', en: 'Season' },
  price: { hi: 'दर / कीमत', en: 'Rate / Price' },
}
