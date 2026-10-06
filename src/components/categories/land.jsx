// Land category module: form fields, validation, detail summary.
// Shape of details JSONB (see PROJECT_CONTEXT.md):
//   { size_acres, arrangement[], water_source, crop_id|null, season, price_type,
//     price_amount, contact_phone?, photo_urls[] }
// size_acres is a plain positive number of acres (no upper cap) — replaced the old
// size_range buckets so a farmer can list exactly e.g. 50 acres.
import { useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field } from '../ui'
import { OptionSelect, MultiChips, LookupSelect, TextField } from './fields'
import { ARRANGEMENT, WATER_SOURCE, SEASON, PRICE_TYPE, optionLabel, optionLabels } from '../../lib/listings/catalog'
import { MAX_PHOTOS } from '../../lib/listings/photos'
import { uploadPhotos } from '../../lib/listings/photos'

export const MIN_ACRES = 0.1

export function initialDetails() {
  return {
    size_acres: '', // plain positive number of acres, min 0.1, no upper limit
    arrangement: [],
    water_source: '',
    crop_id: null,
    season: '',
    price_type: '', // required: fixed | sharecropping | negotiable
    price_amount: '', // ₹/acre for 'fixed' (ठेका); % split for 'sharecropping' (बटाई)
    contact_phone: '', // optional per-listing override; blank → poster's profile phone
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
export const locationPlaceholderKey = 'ph_land_pincode'

// Returns a localized error string, or null.
export function validate(details, listingType, t) {
  const acres = parseFloat(details.size_acres)
  if (!(acres >= MIN_ACRES)) return t('err_size_acres')
  // Batch1 item 5 — essentials only: price type is required for an OFFER, optional
  // for a requirement.
  if (listingType === 'offer' && !details.price_type) return t('err_price_type_required')
  if (details.contact_phone && !/^[0-9]{10}$/.test(String(details.contact_phone).trim())) return t('err_contact_phone')
  return null
}

export function Fields({ details, setDetails, extras, listingType }) {
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
      <TextField
        name="size_acres"
        label={t('field_size_acres')}
        value={details.size_acres}
        onChange={set('size_acres')}
        placeholder={t('ph_size_acres')}
        hint={t('hint_size_acres')}
        inputMode="decimal"
        min={MIN_ACRES}
        step="0.1"
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
        required={listingType === 'offer'}
      />
      {details.price_type === 'fixed' && (
        <TextField
          name="price_amount"
          label={t('field_rate_per_acre')}
          value={details.price_amount}
          onChange={set('price_amount')}
          placeholder={t('ph_price_fixed')}
          inputMode="decimal"
        />
      )}
      {details.price_type === 'sharecropping' && (
        <TextField
          name="price_amount"
          label={t('field_price_amount')}
          value={details.price_amount}
          onChange={set('price_amount')}
          placeholder={t('ph_price_sharecropping')}
        />
      )}

      <TextField
        name="contact_phone"
        label={t('field_contact_phone')}
        value={details.contact_phone}
        onChange={set('contact_phone')}
        placeholder={t('ph_contact_phone')}
        hint={t('hint_contact_phone')}
        inputMode="numeric"
      />

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
  // Optional per-listing contact: keep only a real 10-digit override; blank falls back to profile phone.
  clean.contact_phone = String(clean.contact_phone || '').trim()
  if (!clean.contact_phone) delete clean.contact_phone
  return { ...clean, photo_urls }
}

// Rows for the detail view (only fields that have values).
export function summarize(listing, lang, extras) {
  const d = listing.details || {}
  const L = (key) => LABELS[key][lang]
  const rows = []
  if (d.size_acres != null && String(d.size_acres).trim() !== '') {
    const n = Number(d.size_acres)
    const acres = Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : String(n)) : String(d.size_acres)
    rows.push({ label: L('size'), value: `${acres} ${lang === 'hi' ? 'एकड़' : 'acres'}` })
  }
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
    const rawAmt = String(d.price_amount || '').trim()
    let amt = ''
    if (rawAmt) {
      if (d.price_type === 'fixed') amt = ` · ₹${rawAmt}${lang === 'hi' ? '/एकड़' : '/acre'}`
      else if (d.price_type === 'sharecropping') amt = ` · ${rawAmt}`
    }
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
