// Batch 7L-2 — the typed-place picker of the location flow, as a FORM FIELD.
// Same places list and the same matching as LocationControl (live suggestions while typing,
// closest spellings for "Did you mean…?", then district → town), but it hands the chosen
// place to the form instead of changing the visitor's shared location. No pincode.
//   value    = { label, lat, lng, district } | null   (the TOWN from the list — never a device position)
//   onChange = (value | null) => void
import { useMemo, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { useUserLocation } from '../../lib/location/LocationProvider'
import { DIVISION_DISTRICTS, placeName, districtName, exactPlace, suggestPlaces, closestPlaces, placesInDistrict } from '../../lib/location/places'

const optionBtn = 'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white px-3 text-left text-[15px] font-semibold text-stone-900'
const linkBtn = 'min-h-[44px] text-[14px] font-bold text-green-800 underline'
const gridBtn = 'inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-2 text-[15px] font-bold text-green-900'

export default function PlaceField({ id = 'place', value, onChange, error }) {
  const { t, lang } = useLang()
  const { places } = useUserLocation()
  const [query, setQuery] = useState('')
  const [picker, setPicker] = useState(false)
  const [district, setDistrict] = useState(null)
  const [tried, setTried] = useState(false) // pressed Find / Enter with no exact match

  const suggestions = useMemo(() => suggestPlaces(query, places), [query, places])
  const closest = useMemo(() => (suggestions.length ? [] : closestPlaces(query, places)), [query, places, suggestions])
  const towns = district ? placesInDistrict(district, places, lang) : []

  function choose(p) {
    onChange({ label: placeName(p, lang), lat: p.lat, lng: p.lng, district: p.district })
    setQuery(''); setPicker(false); setDistrict(null); setTried(false)
  }
  function find() {
    const hit = exactPlace(query, places)
    if (hit) { choose(hit); return }
    setTried(true)
    if (!suggestions.length && !closest.length) setPicker(true)
  }

  if (value) {
    return (
      <div data-testid="place-field" className="mb-2">
        <span className="mb-0.5 block text-base font-semibold text-stone-800">{t('village_town')} <span className="text-red-600">*</span></span>
        <p data-testid="place-chosen" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-green-600 bg-green-50 px-4 py-3 text-lg font-semibold text-stone-900">
          <span>📍 {value.label}{value.district ? `, ${districtName(value.district, lang)}` : ''}</span>
          <button type="button" data-testid="place-change" onClick={() => onChange(null)} className="text-[15px] font-bold text-green-800 underline">{t('loc_change_short')}</button>
        </p>
      </div>
    )
  }

  return (
    <div data-testid="place-field" className="mb-2">
      <label htmlFor={id} className="mb-0.5 block text-base font-semibold text-stone-800">{t('village_town')} <span className="text-red-600">*</span></label>
      {!picker && (
        <>
          <div className="flex gap-2">
            <input
              id={id} data-testid="place-input" type="text" autoComplete="off" enterKeyHint="search" value={query}
              onChange={(e) => { setQuery(e.target.value); setTried(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find() } }}
              placeholder={t('village_ph')}
              className="w-full min-w-0 flex-1 rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-green-600"
            />
            <button type="button" data-testid="place-find" onClick={find} className="inline-flex min-h-[44px] items-center rounded-xl bg-green-700 px-4 text-[15px] font-bold text-white">{t('loc_find')}</button>
          </div>
          {suggestions.length > 0 && (
            <ul data-testid="place-suggestions" className="mt-2 space-y-1.5">
              {suggestions.map((p) => (
                <li key={`${p.name_en}-${p.district}`}>
                  <button type="button" onClick={() => choose(p)} className={optionBtn}>
                    <span>{placeName(p, lang)}</span>
                    <span className="shrink-0 text-[13px] font-normal text-stone-500">{districtName(p.district, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tried && closest.length > 0 && (
            <div data-testid="place-did-you-mean" className="mt-2">
              <p className="text-[15px] font-bold text-stone-800">{t('loc_did_you_mean')}</p>
              <ul className="mt-1 space-y-1.5">
                {closest.map((p) => (
                  <li key={`${p.name_en}-${p.district}`}>
                    <button type="button" onClick={() => choose(p)} className={optionBtn}>
                      <span>{placeName(p, lang)}</span>
                      <span className="shrink-0 text-[13px] font-normal text-stone-500">{districtName(p.district, lang)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" data-testid="place-open-picker" onClick={() => setPicker(true)} className={linkBtn}>{t('loc_pick_from_list')}</button>
        </>
      )}
      {picker && (
        <div data-testid="place-picker" className="rounded-xl border-2 border-stone-200 bg-white p-3">
          {!district ? (<>
            <p className="text-[15px] font-bold text-stone-800">{t('loc_pick_district')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIVISION_DISTRICTS.map((d) => (
                <button key={d.en} type="button" data-testid={`place-district-${d.en}`} onClick={() => setDistrict(d.en)} className={gridBtn}>{lang === 'hi' ? d.hi : d.en}</button>
              ))}
            </div>
          </>) : (<>
            <p className="text-[15px] font-bold text-stone-800">{t('loc_pick_town').replace('{district}', districtName(district, lang))}</p>
            <div data-testid="place-towns" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {towns.map((p) => (
                <button key={p.name_en} type="button" onClick={() => choose(p)} className={gridBtn}>{placeName(p, lang)}</button>
              ))}
            </div>
            <button type="button" onClick={() => setDistrict(null)} className="mt-1 min-h-[44px] text-[14px] font-bold text-stone-500 underline">← {t('loc_pick_district')}</button>
          </>)}
          <div><button type="button" onClick={() => { setPicker(false); setDistrict(null) }} className="min-h-[44px] text-[14px] font-bold text-stone-500 underline">{t('loc_type_again')}</button></div>
        </div>
      )}
      {!error && <p className="mt-0.5 text-sm text-stone-500">{t('place_field_hint')}</p>}
      {error && <p data-testid="place-error" className="mt-0.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
