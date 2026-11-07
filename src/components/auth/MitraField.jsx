import { useEffect, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field, Select } from '../ui'
import { listActiveMitras } from '../../lib/mitra/mitraApi'
import { mitraLabel } from '../../lib/mitra/mitraRules'

// Batch 20 - ONE optional dropdown on the sign-up form: "Who helped you join? (Kissan Mitra)".
//   * first option "None" (the default), then the active Mitras as "name - area";
//   * loaded when the form opens (cached for the visit); while loading, and when the list is empty or the call
//     fails, the field is NOT shown at all - registration is never blocked or slowed by it;
//   * the chosen id is kept only in the form's state and travels in the registration payload (never in the URL,
//     localStorage or analytics). value '' = None.
export default function MitraField({ value, onChange }) {
  const { t } = useLang()
  const [list, setList] = useState(null)
  useEffect(() => {
    let alive = true
    listActiveMitras().then((l) => { if (alive) setList(l) }, () => { if (alive) setList([]) })
    return () => { alive = false }
  }, [])
  if (!list || list.length === 0) return null
  return (
    <div data-testid="mitra-field">
      <Field label={t('mitra_field_label')} htmlFor="mitra_id">
        <Select id="mitra_id" data-testid="mitra-select" value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[48px] !text-[17px]">
          <option value="">{t('mitra_none')}</option>
          {list.map((m) => <option key={m.id} value={m.id}>{mitraLabel(m)}</option>)}
        </Select>
      </Field>
    </div>
  )
}
