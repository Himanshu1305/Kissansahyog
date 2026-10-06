import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'

// Fixed mobile bottom tab bar (below md). Desktop keeps the top NavBar only, so
// this is hidden at md+. Rendered once globally in App so every route has it.
// The centre "पोस्ट करें" tab is raised + highlighted. Logged-out users get a
// Login tab, and the Post tab routes through login with a return path to /post.
export default function BottomTabBar() {
  const { t } = useLang()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = isLoggedIn
    ? [
        { key: 'home', icon: '🏠', labelKey: 'nav_home', to: '/', match: (p) => p === '/' },
        { key: 'browse', icon: '🔍', labelKey: 'browse', to: '/browse', match: (p) => p.startsWith('/browse') },
        { key: 'post', icon: '＋', labelKey: 'tab_post', to: '/post', match: (p) => p.startsWith('/post'), center: true },
        { key: 'my', icon: '📋', labelKey: 'my_listings', to: '/my', match: (p) => p.startsWith('/my') },
        { key: 'profile', icon: '👤', labelKey: 'tab_profile', to: '/profile', match: (p) => p.startsWith('/profile') },
      ]
    : [
        { key: 'home', icon: '🏠', labelKey: 'nav_home', to: '/', match: (p) => p === '/' },
        { key: 'browse', icon: '🔍', labelKey: 'browse', to: '/browse', match: (p) => p.startsWith('/browse') },
        { key: 'post', icon: '＋', labelKey: 'tab_post', to: '/login?next=/post', match: () => false, center: true },
        { key: 'login', icon: '🔑', labelKey: 'nav_login', to: '/login', match: (p) => p.startsWith('/login') },
      ]

  return (
    <nav
      aria-label={t('tab_bar_label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ks-border)] bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[640px] items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          if (tab.center) {
            return (
              <li key={tab.key} className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => navigate(tab.to)}
                  className="-mt-3 flex min-h-[44px] flex-col items-center gap-0.5 px-2"
                  aria-label={t(tab.labelKey)}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--ks-green)] text-2xl leading-none text-white shadow-md">
                    {tab.icon}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--ks-green)]">{t(tab.labelKey)}</span>
                </button>
              </li>
            )
          }
          return (
            <li key={tab.key} className="flex flex-1">
              <button
                type="button"
                onClick={() => navigate(tab.to)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold ${
                  active ? 'text-[var(--ks-green)]' : 'text-[var(--ks-ink-3)]'
                }`}
              >
                <span className="text-xl leading-none" aria-hidden="true">{tab.icon}</span>
                <span className="truncate">{t(tab.labelKey)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
