import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { BigButton } from '../components/ui'
import NavBar from '../components/NavBar'

// Logged-in dashboard: global nav (so the logo links back to the public homepage)
// + greeting + primary actions.
export default function Home() {
  const { t } = useLang()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto w-full max-w-xl px-4 py-6">
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
          <BigButton variant="secondary" onClick={() => navigate('/experts')}>
            👨‍🌾 {t('experts_nav')}
          </BigButton>
          <BigButton variant="secondary" onClick={() => navigate('/profile')}>
            👤 {t('my_profile')}
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
      </main>
    </div>
  )
}
