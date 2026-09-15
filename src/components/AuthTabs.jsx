import { useLang } from '../lib/i18n/LanguageProvider'

// Phone | Email selector shown at the top of the signup and login screens.
export default function AuthTabs({ mode, onChange }) {
  const { t } = useLang()
  const tab = (active) =>
    `flex-1 rounded-xl px-3 py-3 text-base font-bold ${
      active ? 'bg-green-700 text-white' : 'bg-white text-stone-700 border-2 border-stone-200'
    }`
  return (
    <div className="mb-5 flex gap-2" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'phone'} className={tab(mode === 'phone')} onClick={() => onChange('phone')}>
        {t('tab_phone')}
      </button>
      <button type="button" role="tab" aria-selected={mode === 'email'} className={tab(mode === 'email')} onClick={() => onChange('email')}>
        {t('tab_email')}
      </button>
    </div>
  )
}
