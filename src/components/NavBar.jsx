import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { strings } from '../lib/i18n/strings'
import LanguageToggle from './LanguageToggle'

// Fixed brand wordmark (always the Hindi mark + Latin subtitle), sourced from the
// strings table so no Devanagari literal lives in a component.
const BRAND_HI = strings.app_name.hi

// Category items shown in the nav. For a logged-in user they route to the
// authenticated browse tab (Experts to its own screen); for a visitor they point
// at the public homepage's live-listings section, filtered via ?cat=.
const NAV_CATS = [
  { key: 'land', labelKey: 'home_cat_land' },
  { key: 'equipment', labelKey: 'home_cat_equipment' },
  { key: 'labor', labelKey: 'home_cat_labor' },
  { key: 'drone_didi', labelKey: 'home_cat_drone_didi' },
  { key: 'bhusa', labelKey: 'home_cat_bhusa' },
  { key: 'agri_inputs', labelKey: 'home_cat_agri_inputs' },
  { key: 'experts', labelKey: 'home_cat_experts' },
  { key: 'articles', labelKey: 'articles_nav' },
  { key: 'resources', labelKey: 'resources_nav' },
]

// Global, sticky navigation bar for the public-facing pages (homepage, privacy,
// terms). Authenticated feature screens keep their own compact Screen header.
export default function NavBar() {
  const { t } = useLang()
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false) // user dropdown

  // Which nav item (if any) is currently active, for highlighting.
  const activeCat =
    location.pathname.startsWith('/resources') ? 'resources'
      : location.pathname.startsWith('/articles') ? 'articles'
        : location.pathname.startsWith('/experts') ? 'experts'
          : params.get('cat') || null

  function goCategory(key) {
    setOpen(false)
    if (key === 'resources') { navigate('/resources'); return } // public page for all
    if (key === 'articles') { navigate('/articles'); return } // public page for all
    if (isLoggedIn) {
      navigate(key === 'experts' ? '/experts' : `/browse?cat=${key}`)
    } else {
      navigate(`/?cat=${key}`)
    }
  }

  // Logo always links to the public homepage, for authenticated and anonymous
  // users alike (they can still reach the dashboard via the nav / My Listings).
  function goHome() {
    setOpen(false)
    navigate('/')
  }

  const catBtn = (active) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${
      active ? 'bg-green-700 text-white' : 'text-stone-700 hover:bg-green-50'
    }`

  return (
    <header className="sticky top-0 z-30 border-b-2 border-stone-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        {/* Brand */}
        <button type="button" onClick={goHome} className="flex items-center gap-2 text-left">
          <span className="text-2xl" aria-hidden="true">🌾</span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold text-green-800">{BRAND_HI}</span>
            <span className="block text-[11px] font-semibold text-stone-500">Kisan Sahyog</span>
          </span>
        </button>

        {/* Category links — centre on desktop */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV_CATS.map((c) => (
            <button key={c.key} type="button" className={catBtn(activeCat === c.key)} onClick={() => goCategory(c.key)}>
              {t(c.labelKey)}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LanguageToggle className="rounded-lg bg-green-700 px-1" />
          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2"
                title={user?.full_name || user?.phone || user?.email}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-sm font-bold text-white">
                  {(user?.full_name || user?.phone || user?.email || '?').trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm font-bold text-stone-700 sm:block">
                  {user?.full_name}
                </span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
                  <button type="button" role="menuitem" className="block w-full px-4 py-3 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => { setMenu(false); navigate('/profile') }}>
                    👤 {t('my_profile')}
                  </button>
                  <button type="button" role="menuitem" className="block w-full px-4 py-3 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => { setMenu(false); navigate('/my') }}>
                    📋 {t('my_listings')}
                  </button>
                  <button type="button" role="menuitem" className="block w-full border-t border-stone-100 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); logout(); navigate('/', { replace: true }) }}>
                    🚪 {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-lg border-2 border-green-700 px-3 py-1.5 text-sm font-bold text-green-800"
              >
                {t('nav_login')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white active:bg-green-800"
              >
                {t('nav_signup')}
              </button>
            </>
          )}
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={t('nav_menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-2xl text-green-800 md:hidden"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile collapsible category links */}
      {open && (
        <nav className="grid grid-cols-2 gap-2 border-t border-stone-100 px-4 py-3 md:hidden">
          {NAV_CATS.map((c) => (
            <button key={c.key} type="button" className={catBtn(activeCat === c.key)} onClick={() => goCategory(c.key)}>
              {t(c.labelKey)}
            </button>
          ))}
          {isLoggedIn && (
            <button type="button" className={catBtn(false)} onClick={() => { setOpen(false); navigate('/my') }}>
              {t('my_listings')}
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
