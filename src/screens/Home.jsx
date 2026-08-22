import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'

// Logged-in landing: greeting + three large primary actions.
export default function Home() {
  const { t } = useLang()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <Screen title={t('app_name')} right={<LanguageToggle />}>
      <p className="mb-1 text-lg text-stone-600">
        {t('home_greeting')}, <span className="font-bold text-stone-900">{user?.full_name}</span> 🙏
      </p>
      {user?.village_town && <p className="mb-6 text-stone-500">{user.village_town}</p>}

      <div className="mt-4 space-y-3">
        <BigButton onClick={() => navigate('/browse')}>🔍 {t('browse')}</BigButton>
        <BigButton onClick={() => navigate('/post')}>➕ {t('post_listing')}</BigButton>
        <BigButton variant="secondary" onClick={() => navigate('/my')}>
          📋 {t('my_listings')}
        </BigButton>
      </div>

      <button
        type="button"
        onClick={() => {
          logout()
          navigate('/', { replace: true })
        }}
        className="mt-10 block w-full text-center text-base font-semibold text-stone-500 underline"
      >
        {t('logout')}
      </button>
    </Screen>
  )
}
