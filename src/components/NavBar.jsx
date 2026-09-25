import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { strings } from '../lib/i18n/strings'
import LanguageToggle from './LanguageToggle'

// Fixed brand wordmark (always the Hindi mark + Latin subtitle), sourced from the
// strings table so no Devanagari literal lives in a component.
const BRAND_HI = strings.app_name.hi

// बाज़ार dropdown — the marketplace categories. Drone Didi points at its richer
// dedicated page; the rest route to the filtered browse view (or homepage ?cat=).
const CATEGORIES = [
  { key: 'equipment', labelKey: 'home_cat_equipment' },
  { key: 'labor', labelKey: 'home_cat_labor' },
  { key: 'drone_didi', labelKey: 'home_cat_drone_didi', path: '/drone-didi' },
  { key: 'bhusa', labelKey: 'home_cat_bhusa' },
  { key: 'agri_inputs', labelKey: 'home_cat_agri_inputs' },
  { key: 'warehouse', labelKey: 'home_cat_warehouse' },
  { key: 'experts', labelKey: 'home_cat_experts' },
  { key: 'land', labelKey: 'home_cat_land' },
  { key: 'fasal', labelKey: 'nav_fasal', path: '/fasal-salah' },
]

// सरकारी योजनाएं dropdown — two government levels.
const SCHEMES_MENU = [
  { labelKey: 'scheme_central_group', path: '/yojana/central' },
  { labelKey: 'scheme_mp_group', path: '/yojana/mp' },
]

// Direct top-level links (order per spec: मंडी भाव · मौसम · किसान सवाल · वीडियो · संपर्क).
const NAV_LINKS = [
  { labelKey: 'nav_mandi', path: '/msp' },
  { labelKey: 'nav_weather', path: '/mausam' },
  { labelKey: 'sawaal_nav', path: '/sawaal' },
  { labelKey: 'nav_videos', path: '/videos' },
  { labelKey: 'resources_nav', path: '/resources' },
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
  const [bz, setBz] = useState(false)     // बाज़ार dropdown (desktop, click-to-open)
  const [sch, setSch] = useState(false)   // सरकारी योजनाएं dropdown (desktop, click-to-open)
  const bzRef = useRef(null)
  const schRef = useRef(null)

  // Click-outside closes the desktop dropdowns (they are click-to-open, not hover).
  useEffect(() => {
    if (!bz && !sch) return
    const onDoc = (e) => {
      if (bz && bzRef.current && !bzRef.current.contains(e.target)) setBz(false)
      if (sch && schRef.current && !schRef.current.contains(e.target)) setSch(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [bz, sch])

  // Navigate to a marketplace category. Drone Didi → its dedicated page; Experts →
  // its screen (or signup); others → filtered browse (or homepage ?cat= for anon).
  function goCategory(c) {
    setOpen(false); setBz(false)
    if (c.path) { navigate(c.path); return }
    if (c.key === 'experts') { navigate(isLoggedIn ? '/experts' : '/signup'); return }
    navigate(isLoggedIn ? `/browse?cat=${c.key}` : `/?cat=${c.key}`)
  }
  function goPath(p) { setOpen(false); setSch(false); navigate(p) }

  // Logo always links to the public homepage, for authenticated and anonymous
  // users alike (they can still reach the dashboard via the nav / My Listings).
  function goHome() {
    setOpen(false)
    navigate('/')
  }

  const catBtn = (active) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-bold ${
      active ? 'bg-[var(--ks-primary)] text-white' : 'text-[var(--ks-text-secondary)] hover:bg-[var(--ks-primary-muted)]'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--ks-border-light)] bg-white shadow-sm">
      <div className="flex w-full items-center gap-2 px-3 py-1.5">
        {/* Brand */}
        <button type="button" onClick={goHome} className="flex items-center gap-2 text-left">
          <span className="text-[28px] leading-none" aria-hidden="true">🌾</span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold text-[var(--ks-primary)]">{BRAND_HI}</span>
            <span className="block text-[10px] font-semibold text-[var(--ks-text-muted)]">Kisan Sahyog</span>
          </span>
        </button>

        {/* Primary nav — centre on desktop: बाज़ार▾ · मंडी भाव · मौसम · योजनाएं▾ · सवाल · वीडियो · संपर्क */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {/* बाज़ार dropdown (click-to-open) */}
          <div className="relative" ref={bzRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={bz} className={catBtn(bz)} onClick={() => { setSch(false); setBz((v) => !v) }}>
              {t('nav_bazaar')} ▾
            </button>
            {bz && (
              <div role="menu" className="absolute left-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
                {CATEGORIES.map((c) => (
                  <button key={c.key} type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => goCategory(c)}>
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={catBtn(location.pathname.startsWith('/msp'))} onClick={() => goPath('/msp')}>{t('nav_mandi')}</button>
          <button type="button" className={catBtn(location.pathname.startsWith('/mausam'))} onClick={() => goPath('/mausam')}>{t('nav_weather')}</button>
          {/* सरकारी योजनाएं dropdown (click-to-open) */}
          <div className="relative" ref={schRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={sch} className={catBtn(location.pathname.startsWith('/yojana'))} onClick={() => { setBz(false); setSch((v) => !v) }}>
              {t('nav_schemes')} ▾
            </button>
            {sch && (
              <div role="menu" className="absolute left-0 z-40 mt-1 w-64 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
                {SCHEMES_MENU.map((c) => (
                  <button key={c.path} type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => goPath(c.path)}>
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={catBtn(location.pathname.startsWith('/sawaal'))} onClick={() => goPath('/sawaal')}>{t('sawaal_nav')}</button>
          <button type="button" className={catBtn(location.pathname.startsWith('/videos'))} onClick={() => goPath('/videos')}>{t('nav_videos')}</button>
          <button type="button" className={catBtn(location.pathname.startsWith('/resources'))} onClick={() => goPath('/resources')}>{t('resources_nav')}</button>
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          {/* Admin quick-link — visible directly in the nav for is_admin users only
              (server still gates /admin). Hidden entirely for everyone else. */}
          {isLoggedIn && user?.is_admin && (
            <button
              type="button"
              data-testid="nav-admin-link"
              onClick={() => navigate('/admin')}
              className={`hidden items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-[12px] font-bold sm:inline-flex ${
                location.pathname.startsWith('/admin') ? 'border-[var(--ks-primary)] bg-[var(--ks-primary)] text-white' : 'border-[var(--ks-primary)] text-[var(--ks-primary)] hover:bg-[var(--ks-primary-muted)]'
              }`}
            >
              ⚙️ {t('nav_admin')}
            </button>
          )}
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
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ks-primary)] text-sm font-bold text-white">
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
                  {/* Admin — only rendered for is_admin users (server still gates /admin). */}
                  {user?.is_admin && (
                    <button type="button" role="menuitem" data-testid="nav-admin" className="block w-full px-4 py-3 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => { setMenu(false); navigate('/admin') }}>
                      ⚙️ {t('nav_admin')}
                    </button>
                  )}
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
                className="rounded-lg border-2 border-[var(--ks-primary)] px-3 py-1.5 text-sm font-bold text-[var(--ks-primary)]"
              >
                {t('nav_login')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-[var(--ks-primary)] px-3 py-1.5 text-sm font-bold text-white"
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

      {/* Mobile collapsible menu — dropdowns expand inline */}
      {open && (
        <nav className="border-t border-stone-100 px-4 py-3 md:hidden">
          {/* बाज़ार group */}
          <div className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">{t('nav_bazaar')}</div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={catBtn(false)} onClick={() => goCategory(c)}>
                {t(c.labelKey)}
              </button>
            ))}
          </div>
          {/* सरकारी योजनाएं group */}
          <div className="mt-3 border-t border-stone-100 pt-3">
            <div className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">{t('nav_schemes')}</div>
            <div className="grid grid-cols-2 gap-2">
              {SCHEMES_MENU.map((c) => (
                <button key={c.path} type="button" className={catBtn(false)} onClick={() => goPath(c.path)}>
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>
          {/* Direct links */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
            {NAV_LINKS.map((c) => (
              <button key={c.path} type="button" className={catBtn(location.pathname.startsWith(c.path.split('#')[0]) && c.path !== '/info#weather')} onClick={() => goPath(c.path)}>
                {t(c.labelKey)}
              </button>
            ))}
            {isLoggedIn && (
              <button type="button" className={catBtn(false)} onClick={() => { setOpen(false); navigate('/my') }}>{t('my_listings')}</button>
            )}
            {isLoggedIn && user?.is_admin && (
              <button type="button" data-testid="nav-admin-mobile" className={catBtn(location.pathname.startsWith('/admin'))} onClick={() => { setOpen(false); navigate('/admin') }}>⚙️ {t('nav_admin')}</button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
