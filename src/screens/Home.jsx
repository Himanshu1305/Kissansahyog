import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { BigButton } from '../components/ui'
import WhatsAppJoin from '../components/WhatsAppJoin'
import { PageShell } from '../components/layout'

// Logged-in dashboard: global nav (so the logo links back to the public homepage)
// + greeting + primary actions.
export default function Home() {
  const { t } = useLang()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <PageShell width="wide">
      <main>
        <p className="mb-1 text-lg text-stone-600">
          {t('greeting_sitaram')} 🙏{user?.full_name ? <>, <span className="font-bold text-stone-900">{user.full_name}</span></> : null}
        </p>
        {user?.village_town && <p className="mb-6 text-stone-500">{user.village_town}</p>}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
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

        <WhatsAppJoin variant="box" src="home_dashboard" />
      </main>
    </PageShell>
  )
}
