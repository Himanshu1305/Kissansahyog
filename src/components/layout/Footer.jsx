import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import WhatsAppJoin from '../WhatsAppJoin'
import Logo from '../Logo'
import WhatsAppChannelCard from '../WhatsAppChannelCard'

// Batch 12A: no channel link on the sign-in / sign-up forms, admin pages or the offline screen.
const NO_CHANNEL_LINK = /^\/(login|signup|admin|offline)(\/|$)/

// Shared site footer, mounted once globally (App) so every public page has it.
// Always links the Feedback & Grievance page (§0.3 / Phase 4) and shows hello@ for
// general contact.
export default function Footer() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const link = 'hover:underline'
  return (
    <footer className="ks-section mt-10" style={{ background: 'var(--ks-strip)' }}>
      <div className="ks-section-inner py-6 text-sm text-stone-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <Logo size="lg" decorative />
              <span className="text-base font-bold text-white">{t('app_name')}</span>
            </Link>
            <div className="mt-2 text-[14px]" style={{ color: '#B7CFBE' }}>{t('mission_income')} · {t('mission_rojgar')}</div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ color: '#B7CFBE' }}>
            <Link to="/bazaar" className={link}>{t('bazaar_nav')}</Link>
            <Link to="/about" className={link}>{t('nav_about_us')}</Link>
            <Link to="/how-to-use" className={link}>{t('nav_how_to_use')}</Link>
            <Link to="/guide" data-testid="footer-guide" className={link}>{t('guide_nav')}</Link>
            <Link to="/founder" className={link}>{t('footer_founder')}</Link>
            <Link to="/privacy" className={link}>{t('footer_privacy')}</Link>
            <Link to="/terms" className={link}>{t('footer_terms')}</Link>
            <Link to="/grievance" className={link}>{t('footer_grievance')}</Link>
            <Link to="/resources" className={link}>{t('resources_nav')}</Link>
            <Link to="/credits" className={link}>{t('footer_credits')}</Link>
            <a href={`mailto:${t('footer_general_email')}`} className={link}>{t('footer_general_email')}</a>
            {!NO_CHANNEL_LINK.test(pathname) && <WhatsAppChannelCard variant="link" />}
            <WhatsAppJoin variant="link" src="footer" className="!text-green-300" />
          </nav>
        </div>
        <div className="mt-5 border-t border-white/10 pt-3 text-[12px]" style={{ color: '#8FB29C' }}>
          {t('footer_copyright')}
          {/* The only place the footer names the company and its location. */}
          <div className="mt-1" data-testid="footer-company">{t('footer_credit_prefix')} <a href="https://usdvisionai.com" target="_blank" rel="noopener noreferrer" className={link}>USD Vision AI LLP</a>{t('footer_company_place')}</div>
          <div className="mt-1">{t('footer_weather_data_prefix')}<a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className={link}>Open-Meteo.com</a>{t('footer_data_sources_suffix')}</div>
        </div>
      </div>
    </footer>
  )
}
