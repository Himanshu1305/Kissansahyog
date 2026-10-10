import { Link } from 'react-router-dom'
import { disclaimers } from '../lib/i18n/disclaimers'
import { useLang } from '../lib/i18n/LanguageProvider'

export const CONSENT_ITEM_IDS = disclaimers.listingConsents.map((item) => item.id)

export default function ConsentChecklist({ value = {}, onChange, className = '' }) {
  const { t } = useLang()
  return (
    <fieldset className={`rounded-2xl border-2 border-stone-300 bg-white p-4 ${className}`}>
      <legend className="px-1 text-base font-bold text-stone-900">{t('consent_title')}</legend>
      <div className="space-y-3">
        {disclaimers.listingConsents.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-stone-50">
            <input type="checkbox" checked={!!value[item.id]} onChange={(event) => onChange?.({ ...value, [item.id]: event.target.checked })} className="mt-1 h-6 w-6 shrink-0 accent-green-700" />
            <span className="text-sm leading-relaxed text-stone-800"><span className="block font-medium">{item.hi}</span><span className="mt-0.5 block text-stone-600">{item.en}</span>{item.terms && <Link to="/terms" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-green-800 underline">{t('terms_title')}</Link>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
