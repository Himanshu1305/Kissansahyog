import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { BigButton } from '../components/ui'

// First-launch screen: pick language (Hindi default, big obvious choice), then
// go to signup or login.
export default function Welcome() {
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()

  const langBtn = (code, label) =>
    `flex-1 rounded-xl border-2 px-4 py-4 text-lg font-bold ${
      lang === code
        ? 'border-green-700 bg-green-700 text-white'
        : 'border-stone-300 bg-white text-stone-800'
    }`

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start text-sm font-semibold text-green-800 underline"
        >
          ‹ {t('back_to_home')}
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-6xl" aria-hidden="true">
            🌾
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-green-800">{t('app_name')}</h1>
          <p className="mt-6 max-w-sm text-stone-600">{t('welcome_intro')}</p>
        </div>

        <div className="mt-8">
          <p className="mb-2 text-center text-base font-semibold text-stone-700">
            {t('choose_language')}
          </p>
          <div className="mb-6 flex gap-3">
            <button type="button" className={langBtn('hi')} onClick={() => setLang('hi')}>
              हिंदी
            </button>
            <button type="button" className={langBtn('en')} onClick={() => setLang('en')}>
              English
            </button>
          </div>

          <div className="space-y-3">
            <BigButton onClick={() => navigate('/signup')}>{t('new_user')}</BigButton>
            <BigButton variant="secondary" onClick={() => navigate('/login')}>
              {t('returning_user')}
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  )
}
