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
  { key: 'bhusa', labelKey: 'home_cat_bhusa' },
  { key: 'agri_inputs', labelKey: 'home_cat_agri_inputs' },
  { key: 'experts', labelKey: 'home_cat_experts' },
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

  // Which category (if any) is currently active, for highlighting.
  const activeCat =
    location.pathname.startsWith('/experts') ? 'experts' : params.get('cat') || null

  function goCategory(key) {
    setOpen(false)
    if (isLoggedIn) {
      navigate(key === 'experts' ? '/experts' : `/browse?cat=${key}`)
    } else {
      navigate(`/?cat=${key}`)
    }
  }

  function goHome() {
    setOpen(false)
    navigate(isLoggedIn ? '/home' : '/')
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
            <>
              <button
                type="button"
                onClick={() => navigate('/my')}
                className="hidden rounded-lg border-2 border-green-700 px-3 py-1.5 text-sm font-bold text-green-800 sm:block"
              >
                {t('my_listings')}
              </button>
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-sm font-bold text-white"
                title={user?.full_name || user?.phone}
              >
                {(user?.full_name || user?.phone || '?').trim().charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => { logout(); navigate('/', { replace: true }) }}
                className="text-sm font-semibold text-stone-500 underline"
              >
                {t('logout')}
              </button>
            </>
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
