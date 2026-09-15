// Reusable, low-literacy-friendly form controls shared by every category's
// field set. Single-choice = big dropdown; multi-choice = large tappable chips.
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field, Select, TextInput } from '../ui'

// Stable control id. Prefer an explicit, language-independent `name` (e.g.
// "crop_id"); fall back to a slug of the label. Deriving ids from a LOCALIZED
// label would make them change when the UI language switches — always pass name.
const slug = (s) => 'f_' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const fieldId = (name, label) => (name ? `f_${name}` : slug(label))

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

// Labelled free-text input.
export function TextField({ name, label, value, onChange, required, error, hint, placeholder }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <TextInput id={id} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
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

// Native date input, labelled.
export function DateField({ name, label, value, onChange, required, error, min, max }) {
  const id = fieldId(name, label)
  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
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
