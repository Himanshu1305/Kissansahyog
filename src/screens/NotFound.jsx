import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'

// Real 404 (replaces the old catch-all <Navigate to="/">, which was a soft-404).
// noindex, links to key hubs.
export default function NotFound() {
  const { t } = useLang()
  const links = [
    { to: '/', label: t('nf_home') },
    { to: '/msp', label: t('nf_mandi') },
    { to: '/mausam', label: t('nf_weather') },
    { to: '/sawaal', label: t('nf_sawaal') },
    { to: '/cold-storage', label: t('home_cat_warehouse') },
    { to: '/greenhouse', label: t('nav_greenhouse') },
  ]
  return (
    <PageShell width="content">
      <Seo title={`${t('nf_title')} — Kissan Sahyog`} description={t('nf_body')} path="/404" noindex />
      <div className="py-10 text-center">
        <div className="text-6xl font-black text-green-700">404</div>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">{t('nf_h1')}</h1>
        {/* ks-allow-width: centred 404 message + link grid, not a page-level clamp */}
        <p className="mt-2 text-stone-600">{t('nf_body')}</p>
        {/* ks-allow-width */}
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="block rounded-xl border border-stone-200 bg-white px-4 py-3 font-semibold text-green-700 hover:bg-green-50">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  )
}
