import { useEffect, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { Field, Select } from '../ui'
import { listActiveMitras } from '../../lib/mitra/mitraApi'
import { mitraLabel } from '../../lib/mitra/mitraRules'

// Batch 20 - ONE optional dropdown "Kissan Mitra". Batch 22: it moved from the sign-up form to the LAST step of the
// "offer a service" form (Post.jsx), for a person's first offer only: "Did a Kissan Mitra help you offer this? (optional)".
//   * first option "None" (the default), then the active Mitras as "name - area";
//   * loaded when the form opens (cached for the visit); while loading, and when the list is empty or the call
//     fails, the field is NOT shown at all - posting is never blocked or slowed by it;
//   * the chosen id is kept only in the form's state and stays in the form until the listing is created (never in the URL,
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
      <Field label={t('mitra_offer_label')} htmlFor="mitra_id">
        <Select id="mitra_id" data-testid="mitra-select" value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[48px] !text-[17px]">
          <option value="">{t('mitra_none')}</option>
          {list.map((m) => <option key={m.id} value={m.id}>{mitraLabel(m)}</option>)}
        </Select>
      </Field>
    </div>
  )
}
