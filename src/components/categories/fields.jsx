// Reusable, low-literacy-friendly form controls shared by every category's
// field set. Single-choice = big dropdown; multi-choice = large tappable chips.
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field, Select, TextInput } from '../ui'
import { todayIst, addDays } from '../../lib/listings/listingDates'
import { EXTRA_INFO_MAX } from '../../lib/listings/extraInfo'

// Stable control id. Prefer an explicit, language-independent `name` (e.g.
// "crop_id"); fall back to a slug of the label. Deriving ids from a LOCALIZED
// label would make them change when the UI language switches — always pass name.
const slug = (s) => 'f_' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const fieldId = (name, label) => (name ? `f_${name}` : slug(label))

// Two short, related fields side by side (Batch 10A). One column on narrow phones (< 400 px),
// two columns from 400 px. Each child is a <Field> (label / control / hint-or-error); from 400 px
// the children share the row's tracks via subgrid, so a label that wraps to two lines does not
// push only its own control down — both controls start on the same line. min-w-0 lets a long
// dropdown option shrink instead of widening the page. Without subgrid support the fields still
// align at the top (items-start). Vertical spacing comes from Field's own margin (gap-y-0), so
// the stacked layout looks exactly like the one-per-row form.
export function FieldRow({ children }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-3 gap-y-0 min-[400px]:grid-cols-2 *:min-w-0 min-[400px]:*:row-span-3 min-[400px]:*:grid min-[400px]:*:grid-rows-subgrid min-[400px]:*:content-start">
      {children}
    </div>
  )
}

// Labelled single-select dropdown backed by a catalog option list.
export function OptionSelect({ name, label, list, value, onChange, required, error, hint, includeEmpty = true, emptyLabel }) {
  const { t, lang } = useLang()
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        {includeEmpty && <option value="">{emptyLabel ?? t('select_placeholder')}</option>}
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o[lang]}
          </option>
        ))}
      </Select>
    </Field>
  )
}

// Multi-select as a row of toggleable chips (used for land `arrangement`).
export function MultiChips({ label, list, values, onChange, required, error }) {
  const { lang } = useLang()
  const selected = Array.isArray(values) ? values : []
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  return (
    <Field label={label} required={required} error={error}>
      <div className="flex flex-wrap gap-2">
        {list.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              aria-pressed={on}
              className={`rounded-full border-2 px-4 py-2 text-base font-semibold ${
                on
                  ? 'border-green-700 bg-green-700 text-white'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {o[lang]}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

// Single-choice segmented chips (e.g. "Available now" vs "Specific dates").
export function SegmentedChoice({ label, options, value, onChange, required }) {
  return (
    <Field label={label} required={required}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className={`rounded-full border-2 px-4 py-2 text-base font-semibold ${
                on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

// Labelled number input (integer, with a minimum).
export function NumberField({ name, label, value, onChange, required, error, hint, min = 1, placeholder }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <TextInput
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </Field>
  )
}

// Labelled free-text input. Pass inputMode="decimal" (+ optional min/step) for a
// numeric entry like acreage or a rate — keeps the low-literacy numeric keypad on mobile.
export function TextField({ name, label, value, onChange, required, error, hint, placeholder, inputMode, type, min, step }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <TextInput id={id} value={value ?? ''} placeholder={placeholder} inputMode={inputMode} type={type} min={min} step={step} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

// Labelled multi-line text input (e.g. a vendor's "what we sell" description).
export function TextAreaField({ name, label, value, onChange, required, error, hint, placeholder, rows = 3 }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-green-600"
      />
    </Field>
  )
}

// Native date input, labelled. (Date inputs can't show a text placeholder, so
// guidance is passed via `hint`, rendered below the field.)
export function DateField({ name, label, value, onChange, required, error, hint, min, max }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <TextInput
        id={id}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </Field>
  )
}

// Select backed by DB lookup rows ({id, name_hi, name_en}); respects language.
export function LookupSelect({ name, label, rows, value, onChange, required, error, emptyLabel }) {
  const { t, lang } = useLang()
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
      <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{emptyLabel ?? t('select_placeholder')}</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {lang === 'hi' ? r.name_hi : r.name_en}
          </option>
        ))}
      </Select>
    </Field>
  )
}


// Batch 10E (3C) — the ONE date block of every time-sensitive post form (equipment incl. water tanker,
// land, labor, drone didi; offer and requirement). Writes details.available_from / available_to.
// Start is mandatory (checked in Post.jsx with checkListingDates); quick buttons आज / कल / परसों set it
// with one tap, "तारीख़ चुनें" opens the phone's own date picker. End is optional; an offer can say
// "जब तक चाहें" (no end date). "Today" is the IST day (todayIst), not the UTC one.
const chipClass = (on) => `inline-flex min-h-[44px] items-center justify-center rounded-full border-2 px-3 py-1.5 text-base font-semibold ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-800'}`

export function DateBlock({ details, setDetails, listingType, errorField, error }) {
  const { t } = useLang()
  const today = todayIst()
  const isOffer = listingType !== 'requirement'
  const from = details.available_from || ''
  const to = details.available_to || ''
  const setKey = (k) => (v) => setDetails((d) => ({ ...d, [k]: v || null }))
  const openPicker = () => {
    const el = document.getElementById('f_available_from')
    if (!el) return
    el.focus()
    try { el.showPicker?.() } catch { /* some browsers allow showPicker only on a direct tap */ }
  }
  const quick = [['date_today', 0], ['date_tomorrow', 1], ['date_day_after', 2]]
  return (
    <div data-testid="post-dates" className="my-3 rounded-xl border-2 border-green-200 bg-green-50 p-3">
      <Field label={t(isOffer ? 'field_available_from' : 'date_from_req')} htmlFor="f_available_from" required error={errorField === 'available_from' ? error : undefined}>
        <div className="mb-2 flex flex-wrap gap-2">
          {quick.map(([key, n]) => {
            const v = addDays(today, n)
            return <button key={key} type="button" data-testid={`date-quick-${n}`} aria-pressed={from === v} onClick={() => setKey('available_from')(v)} className={chipClass(from === v)}>{t(key)}</button>
          })}
          <button type="button" data-testid="date-quick-pick" onClick={openPicker} className={chipClass(false)}>📅 {t('date_pick')}</button>
        </div>
        <TextInput id="f_available_from" type="date" min={today} value={from} onChange={(e) => setKey('available_from')(e.target.value)} aria-invalid={errorField === 'available_from' || undefined} />
      </Field>
      <Field label={t('date_to_optional')} htmlFor="f_available_to" error={errorField === 'available_to' ? error : undefined}>
        {isOffer && (
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" data-testid="date-open-ended" aria-pressed={!to} onClick={() => setKey('available_to')(null)} className={chipClass(!to)}>{t('date_open_ended')}</button>
          </div>
        )}
        <TextInput id="f_available_to" type="date" min={from || today} value={to} onChange={(e) => setKey('available_to')(e.target.value)} aria-invalid={errorField === 'available_to' || undefined} />
      </Field>
    </div>
  )
}

// Batch 10E (3B) — the ONE optional "अतिरिक्त जानकारी" box of every post form (all categories).
// Multi-line, at most 300 characters with a live counter; phone numbers are refused by Post.jsx
// (extraInfoError). The text lives in details.extra_info while the form is open.
export function ExtraInfoField({ value, onChange, error }) {
  const { t } = useLang()
  const len = String(value || '').length
  return (
    <Field label={t('extra_info_label')} htmlFor="f_extra_info" error={error}>
      <textarea
        id="f_extra_info"
        data-testid="extra-info"
        rows={3}
        maxLength={EXTRA_INFO_MAX}
        value={value || ''}
        placeholder={t('extra_info_ph')}
        aria-describedby="f_extra_info_help"
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-green-600"
      />
      <div id="f_extra_info_help" className="mt-0.5 flex items-start justify-between gap-3 text-sm text-stone-600">
        <span>📵 {t('extra_info_help')}</span>
        <span data-testid="extra-info-count" aria-live="polite" className={`shrink-0 tabular-nums ${len >= EXTRA_INFO_MAX ? 'font-bold text-red-700' : ''}`}>{len}/{EXTRA_INFO_MAX}</span>
      </div>
    </Field>
  )
}
