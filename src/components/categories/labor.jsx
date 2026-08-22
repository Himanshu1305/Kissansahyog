// Labor category module (posted by a contractor/group leader for a team).
// details JSONB shape:
//   { worker_count, work_type, available_from|null, available_to|null, rate_basis|null, rate_amount }
import { useLang } from '../../lib/i18n/LanguageProvider'
import { OptionSelect, NumberField, TextField, DateField } from './fields'
import { WORK_TYPE, RATE_BASIS, optionLabel } from '../../lib/listings/catalog'

export function initialDetails() {
  return {
    worker_count: null,
    work_type: '',
    available_from: null,
    available_to: null,
    rate_basis: '',
    rate_amount: '',
  }
}

export function needsSelfDeclaration() {
  return false
}

export function validate(details, listingType, t) {
  if (!details.worker_count || details.worker_count <= 0) return t('err_invalid_worker_count')
  if (details.available_from && details.available_to && details.available_from > details.available_to) {
    return t('err_invalid_date_range')
  }
  return null
}

export function Fields({ details, setDetails }) {
  const { t } = useLang()
  const set = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }))
  return (
    <>
      <NumberField
        label={t('field_worker_count')}
        value={details.worker_count}
        onChange={set('worker_count')}
        min={1}
        required
      />
      <OptionSelect
        label={t('field_work_type')}
        list={WORK_TYPE}
        value={details.work_type}
        onChange={set('work_type')}
      />
      <DateField label={t('field_from_date')} value={details.available_from} onChange={set('available_from')} />
      <DateField label={t('field_to_date')} value={details.available_to} onChange={set('available_to')} />
      <OptionSelect
        label={t('field_rate_basis')}
        list={RATE_BASIS}
        value={details.rate_basis}
        onChange={set('rate_basis')}
      />
      <TextField
        label={t('field_rate_amount')}
        value={details.rate_amount}
        onChange={set('rate_amount')}
        hint={t('optional')}
        placeholder={t('rate_amount_ph')}
      />
    </>
  )
}

export function summarize(listing, lang) {
  const d = listing.details || {}
  const rows = []
  if (d.worker_count != null)
    rows.push({ label: LABELS.workers[lang], value: `${d.worker_count} ${WORKERS_UNIT[lang]}` })
  if (d.work_type) rows.push({ label: LABELS.work[lang], value: optionLabel(WORK_TYPE, d.work_type, lang) })
  if (d.available_from || d.available_to)
    rows.push({ label: LABELS.dates[lang], value: [d.available_from, d.available_to].filter(Boolean).join(' → ') })
  // Rate: combine basis + amount; omit entirely if both blank (no "undefined").
  const rateParts = []
  if (d.rate_basis) rateParts.push(optionLabel(RATE_BASIS, d.rate_basis, lang))
  if (d.rate_amount && String(d.rate_amount).trim()) rateParts.push(String(d.rate_amount).trim())
  if (rateParts.length) rows.push({ label: LABELS.rate[lang], value: rateParts.join(' · ') })
  return rows
}

const LABELS = {
  workers: { hi: 'मज़दूर', en: 'Workers' },
  work: { hi: 'काम', en: 'Work' },
  dates: { hi: 'तारीख़ें', en: 'Dates' },
  rate: { hi: 'दर', en: 'Rate' },
}
const WORKERS_UNIT = { hi: 'मज़दूर', en: 'workers' }
