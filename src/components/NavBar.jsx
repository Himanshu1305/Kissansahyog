import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { strings } from '../lib/i18n/strings'
import LanguageToggle from './LanguageToggle'
import SearchBar from './SearchBar'
import Logo from './Logo'
import { useNativeBack } from '../lib/useNativeBack'

// Fixed brand wordmark (always the Hindi mark + Latin subtitle), sourced from the
// strings table so no Devanagari literal lives in a component.
const BRAND_HI = strings.app_name.hi

// बाज़ार dropdown — the marketplace categories. Drone Didi points at its richer
// dedicated page; the rest route to the filtered browse view (or homepage ?cat=).
const CATEGORIES = [
  { key: 'equipment', labelKey: 'home_cat_equipment' },
  { key: 'water_tanker', labelKey: 'home_cat_water_tanker', browseQuery: 'cat=equipment&etype=water_tanker' },
  { key: 'labor', labelKey: 'home_cat_labor' },
  { key: 'drone_didi', labelKey: 'home_cat_drone_didi', path: '/drone-didi' },
  { key: 'bhusa', labelKey: 'home_cat_bhusa' },
  { key: 'agri_inputs', labelKey: 'home_cat_agri_inputs' },
  { key: 'building_materials', labelKey: 'home_cat_building_materials' },
  { key: 'warehouse', labelKey: 'home_cat_warehouse' },
  { key: 'cold_storage', labelKey: 'cs_hub_nav', path: '/cold-storage' },
  { key: 'greenhouse', labelKey: 'home_cat_greenhouse', path: '/greenhouse' },
  { key: 'jugaad', labelKey: 'home_cat_jugaad', path: '/jugaad' },
  { key: 'transport', labelKey: 'home_cat_transport' },
  { key: 'experts', labelKey: 'home_cat_experts' },
  { key: 'land', labelKey: 'home_cat_land' },
  { key: 'fasal', labelKey: 'nav_fasal', path: '/fasal-salah' },
]

// सरकारी योजनाएं dropdown — two government levels.
const SCHEMES_MENU = [
  { labelKey: 'scheme_central_group', path: '/yojana/central' },
  { labelKey: 'scheme_mp_group', path: '/yojana/mp' },
]

// उपयोगी संपर्क (Resources) dropdown — the contacts directory + the Kisan Mela calendar.
const RESOURCES_MENU = [
  { labelKey: 'nav_resources_dir', path: '/resources' },
  { labelKey: 'nav_mela', path: '/kisan-mela' },
]

// हमारे बारे में (About) dropdown — the About page and the founder page. The founder
// is reachable only from here (and the footer), not as its own top-level link.
const ABOUT_MENU = [
  { labelKey: 'nav_about_us', path: '/about' },
  { labelKey: 'footer_founder', path: '/founder' },
]
const inAbout = (pathname) => pathname.startsWith('/about') || pathname.startsWith('/founder')

// और / More dropdown — shown only from lg up to xl (1024–1279px), where the full
// row does not fit. It holds the items that are hidden from the row at that width.
const MORE_MENU = [
  { labelKey: 'nav_agroforestry', path: '/agro-forestry' },
  { labelKey: 'nav_videos', path: '/videos' },
  { labelKey: 'nav_how_to_use', path: '/how-to-use' },
  ...ABOUT_MENU,
]
const inMore = (pathname) => MORE_MENU.some((c) => pathname.startsWith(c.path))

// Direct top-level links. Agro Forestry is its own top-level item (not under बाज़ार).
const NAV_LINKS = [
  { labelKey: 'nav_mandi', path: '/msp' },
  { labelKey: 'nav_weather', path: '/mausam' },
  { labelKey: 'nav_agroforestry', path: '/agro-forestry' },
  { labelKey: 'sawaal_nav', path: '/sawaal' },
  { labelKey: 'nav_videos', path: '/videos' },
]

// Global, sticky navigation bar for the public-facing pages (homepage, privacy,
// terms). Authenticated feature screens keep their own compact Screen header.
export default function NavBar() {
  const { t } = useLang()
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false) // user dropdown
  const [bz, setBz] = useState(false)     // बाज़ार dropdown (desktop, click-to-open)
  const [sch, setSch] = useState(false)   // सरकारी योजनाएं dropdown (desktop, click-to-open)
  const [res, setRes] = useState(false)   // उपयोगी संपर्क dropdown (desktop, click-to-open)
  const bzRef = useRef(null)
  const schRef = useRef(null)
  const [ab, setAb] = useState(false)     // हमारे बारे में dropdown (desktop, click-to-open)
  const [abM, setAbM] = useState(false)   // हमारे बारे में section inside the mobile menu
  const resRef = useRef(null)
  const abRef = useRef(null)
  const [more, setMore] = useState(false) // और / More dropdown (desktop, 1024–1279px)
  const moreRef = useRef(null)
  useNativeBack(open, () => setOpen(false)) // Android back closes the mobile menu first

  // Click-outside closes the desktop dropdowns (they are click-to-open, not hover).
  useEffect(() => {
    if (!bz && !sch && !res && !ab && !more) return
    const onDoc = (e) => {
      if (ab && abRef.current && !abRef.current.contains(e.target)) setAb(false)
      if (more && moreRef.current && !moreRef.current.contains(e.target)) setMore(false)
      if (bz && bzRef.current && !bzRef.current.contains(e.target)) setBz(false)
      if (sch && schRef.current && !schRef.current.contains(e.target)) setSch(false)
      if (res && resRef.current && !resRef.current.contains(e.target)) setRes(false)
    }
    // Escape closes the About / More menu and hands focus back to its button.
    const onKey = (e) => {
      if (e.key !== 'Escape' || (!ab && !more)) return
      const ref = ab ? abRef : moreRef
      setAb(false); setMore(false)
      ref.current?.querySelector('button')?.focus()
    }
    // pointerdown covers mouse and touch alike.
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [bz, sch, res, ab, more])

  // Any route change (link, back/forward) closes the About / More menus and the mobile menu.
  useEffect(() => {
    setAb(false); setMore(false); setAbM(false); setOpen(false)
  }, [location.pathname])

  // Navigate to a marketplace category. Drone Didi → its dedicated page; Experts →
  // its screen (or signup); others → filtered browse (or homepage ?cat= for anon).
  function goCategory(c) {
    setOpen(false); setBz(false)
    if (c.path) { navigate(c.path); return }
    if (c.key === 'experts') { navigate(isLoggedIn ? '/experts' : '/signup'); return }
    // Batch1 item 3A: browsing is public, so बाज़ार categories open /browse for everyone.
    if (c.browseQuery) { navigate(`/browse?${c.browseQuery}`); return }
    navigate(`/browse?cat=${c.key}`)
  }
  function goPath(p) { setOpen(false); setSch(false); setRes(false); setBz(false); navigate(p) }

  // Logo always links to the public homepage, for authenticated and anonymous
  // users alike (they can still reach the dashboard via the nav / My Listings).
  function goHome() {
    setOpen(false)
    navigate('/')
  }

  const catBtn = (active) =>
    `whitespace-nowrap rounded-lg px-2 py-2 text-[12px] font-bold 2xl:px-3 ${
      active ? 'bg-[var(--ks-primary)] text-white' : 'text-[var(--ks-text-secondary)] hover:bg-[var(--ks-primary-muted)]'
    }`

  // Desktop row items: tighter than the mobile-menu buttons so the whole nav fits on
  // the one header row. `wide` items leave the row below xl and move into और / More.
  const navBtn = (active, wide = false) =>
    `${wide ? 'hidden xl:inline-flex' : 'inline-flex'} items-center whitespace-nowrap rounded-lg px-1 py-2 text-[12px] font-bold min-[1440px]:px-2 min-[1440px]:text-[13px] min-[1680px]:px-3 ${
      active ? 'bg-[var(--ks-primary)] text-white' : 'text-[var(--ks-text-secondary)] hover:bg-[var(--ks-primary-muted)]'
    }`
  const closeMenus = () => { setBz(false); setSch(false); setRes(false); setAb(false); setMore(false) }

  return (
    <header className="ks-safe-sticky sticky top-0 z-30 border-b border-[var(--ks-border-light)] bg-white shadow-sm">
      <div className="flex w-full items-center gap-2 px-3 py-1.5">
        {/* Brand */}
        <button type="button" onClick={goHome} data-testid="nav-brand" className="flex min-w-0 shrink items-center gap-2 text-left lg:shrink-0">
          <Logo decorative />
          <span className="min-w-0 leading-tight" data-testid="nav-site-name">
            <span className="block truncate text-[15px] font-extrabold text-[var(--ks-primary)]">{BRAND_HI}</span>
            <span className="block truncate text-[10px] font-semibold text-[var(--ks-text-muted)]">Kissan Sahyog</span>
          </span>
        </button>

        {/* Primary nav — from lg up it sits in the same row as the logo and the right
            cluster (one header row, never wraps): बाज़ार▾ · मंडी भाव · मौसम · योजनाएं▾ · … · हमारे बारे में▾.
            1024–1279px shows six items + और▾; from 1280px all ten are in the row. */}
        <nav data-testid="nav-desktop" className="mx-auto hidden min-w-0 max-w-[1040px] flex-1 flex-nowrap items-center justify-evenly gap-0.5 lg:flex">
          {/* बाज़ार dropdown (click-to-open) */}
          <div className="relative" ref={bzRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={bz} className={navBtn(bz)} onClick={() => { const v = !bz; closeMenus(); setBz(v) }}>
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
          <button type="button" className={navBtn(location.pathname.startsWith('/msp'))} onClick={() => goPath('/msp')}>{t('nav_mandi')}</button>
          <button type="button" className={navBtn(location.pathname.startsWith('/mausam'))} onClick={() => goPath('/mausam')}>{t('nav_weather')}</button>
          {/* सरकारी योजनाएं dropdown (click-to-open) */}
          <div className="relative" ref={schRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={sch} className={navBtn(location.pathname.startsWith('/yojana'))} onClick={() => { const v = !sch; closeMenus(); setSch(v) }}>
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
          <button type="button" className={navBtn(location.pathname.startsWith('/agro-forestry'), true)} onClick={() => goPath('/agro-forestry')}>{t('nav_agroforestry')}</button>
          <button type="button" className={navBtn(location.pathname.startsWith('/sawaal'))} onClick={() => goPath('/sawaal')}>{t('sawaal_nav')}</button>
          <button type="button" className={navBtn(location.pathname.startsWith('/videos'), true)} onClick={() => goPath('/videos')}>{t('nav_videos')}</button>
          {/* उपयोगी संपर्क dropdown — contacts directory + Kisan Mela */}
          <div className="relative" ref={resRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={res} className={navBtn(location.pathname.startsWith('/resources') || location.pathname.startsWith('/kisan-mela'))} onClick={() => { const v = !res; closeMenus(); setRes(v) }}>
              {t('resources_nav')} ▾
            </button>
            {res && (
              <div role="menu" className="absolute left-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
                {RESOURCES_MENU.map((c) => (
                  <button key={c.path} type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-green-50" onClick={() => goPath(c.path)}>
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* कैसे इस्तेमाल करें — its own visible item, right before the About menu. */}
          <Link to="/how-to-use" data-testid="nav-how-to-use" aria-current={location.pathname === '/how-to-use' ? 'page' : undefined} className={navBtn(location.pathname === '/how-to-use', true)}>
            {t('nav_how_to_use')}
          </Link>
          {/* हमारे बारे में dropdown — About Us + Founder. Real links, kept in the DOM
              (hidden when closed) so they are crawlable and reachable by keyboard. */}
          <div className="relative hidden xl:block" ref={abRef} data-testid="nav-about">
            <button type="button" aria-haspopup="true" aria-expanded={ab} aria-controls="nav-about-menu" className={navBtn(ab || inAbout(location.pathname))} onClick={() => { const v = !ab; closeMenus(); setAb(v) }}>
              {t('nav_about')} ▾
            </button>
            <div id="nav-about-menu" hidden={!ab} className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
              {ABOUT_MENU.map((c) => (
                <Link key={c.path} to={c.path} onClick={() => setAb(false)} aria-current={location.pathname === c.path ? 'page' : undefined} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-green-50 focus-visible:bg-green-50">
                  {t(c.labelKey)}
                </Link>
              ))}
            </div>
          </div>
          {/* और / More — only at 1024–1279px. Real links, kept in the DOM (hidden when
              closed) so they are reachable by keyboard; closes on outside click and Esc. */}
          <div className="relative xl:hidden" ref={moreRef} data-testid="nav-more">
            <button type="button" aria-haspopup="true" aria-expanded={more} aria-controls="nav-more-menu" className={navBtn(more || inMore(location.pathname))} onClick={() => { const v = !more; closeMenus(); setMore(v) }}>
              {t('nav_more')} ▾
            </button>
            <div id="nav-more-menu" hidden={!more} className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border-2 border-stone-100 bg-white py-1 shadow-lg">
              {MORE_MENU.map((c) => (
                <Link key={c.path} to={c.path} onClick={() => setMore(false)} aria-current={location.pathname === c.path ? 'page' : undefined} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-green-50 focus-visible:bg-green-50">
                  {t(c.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {location.pathname !== '/' && <SearchBar />}
          <LanguageToggle />
          {/* Admin quick-link — visible directly in the nav for is_admin users only
              (server still gates /admin). Hidden entirely for everyone else. */}
          {isLoggedIn && user?.is_admin && (
            <button
              type="button"
              data-testid="nav-admin-link"
              onClick={() => navigate('/admin')}
              aria-label={t('nav_admin')}
              className={`hidden items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-[12px] font-bold sm:inline-flex lg:px-2 2xl:px-3 ${
                location.pathname.startsWith('/admin') ? 'border-[var(--ks-primary)] bg-[var(--ks-primary)] text-white' : 'border-[var(--ks-primary)] text-[var(--ks-primary)] hover:bg-[var(--ks-primary-muted)]'
              }`}
            >
              ⚙️ <span className="lg:hidden 2xl:inline">{t('nav_admin')}</span>
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
                <span className="hidden max-w-[8rem] truncate text-sm font-bold text-stone-700 sm:block lg:hidden 2xl:block">
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
              {/* On mobile the bottom tab bar carries Login; hide these here to keep
                  the narrow top bar from overflowing (Batch1 items 2 + 3). */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hidden whitespace-nowrap rounded-lg border-2 border-[var(--ks-primary)] px-3 py-1.5 text-sm font-bold text-[var(--ks-primary)] md:inline-block lg:px-2 lg:text-[13px] min-[1440px]:px-3 min-[1440px]:text-sm"
              >
                {t('nav_login')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="hidden whitespace-nowrap rounded-lg bg-[var(--ks-primary)] px-3 py-1.5 text-sm font-bold text-white md:inline-block lg:px-2 lg:text-[13px] min-[1440px]:px-3 min-[1440px]:text-sm"
              >
                {t('nav_signup')}
              </button>
            </>
          )}
          {/* Hamburger — below lg, where the desktop nav is not shown */}
          <button
            type="button"
            aria-label={t('nav_menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            data-testid="nav-hamburger"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-2xl text-green-800 lg:hidden"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>


      {/* Mobile collapsible menu — dropdowns expand inline */}
      {open && (
        <nav className="border-t border-stone-100 px-4 py-3 lg:hidden">
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
          {/* उपयोगी संपर्क group */}
          <div className="mt-3 border-t border-stone-100 pt-3">
            <div className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">{t('resources_nav')}</div>
            <div className="grid grid-cols-2 gap-2">
              {RESOURCES_MENU.map((c) => (
                <button key={c.path} type="button" className={catBtn(location.pathname.startsWith(c.path))} onClick={() => goPath(c.path)}>
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
          {/* कैसे इस्तेमाल करें — always visible, above the About section */}
          <div className="mt-3 border-t border-stone-100 pt-3">
            <Link to="/how-to-use" data-testid="nav-how-to-use-mobile" onClick={() => setOpen(false)} aria-current={location.pathname === '/how-to-use' ? 'page' : undefined} className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 text-[14px] font-bold ${location.pathname === '/how-to-use' ? 'bg-[var(--ks-primary)] text-white' : 'text-[var(--ks-text-secondary)] hover:bg-[var(--ks-primary-muted)]'}`}>
              <span>{t('nav_how_to_use')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          {/* हमारे बारे में — expandable section */}
          <div className="mt-3 border-t border-stone-100 pt-3" data-testid="nav-about-mobile">
            <button type="button" aria-expanded={abM} aria-controls="nav-about-mobile-menu" onClick={() => setAbM((v) => !v)} className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 text-left text-[14px] font-bold text-[var(--ks-text-secondary)] hover:bg-[var(--ks-primary-muted)]">
              <span>{t('nav_about')}</span>
              <span aria-hidden="true">{abM ? '▴' : '▾'}</span>
            </button>
            <div id="nav-about-mobile-menu" hidden={!abM} className="mt-1 grid grid-cols-2 gap-2">
              {ABOUT_MENU.map((c) => (
                <Link key={c.path} to={c.path} onClick={() => { setOpen(false); setAbM(false) }} aria-current={location.pathname === c.path ? 'page' : undefined} className={`${catBtn(location.pathname === c.path)} flex min-h-[44px] items-center`}>
                  {t(c.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
