import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import WhatsAppJoin from '../WhatsAppJoin'

// Shared site footer, mounted once globally (App) so every public page has it.
// Always links the Grievance Officer page (§0.3 / Phase 4) and shows hello@ for
// general contact.
export default function Footer() {
  const { t } = useLang()
  const link = 'hover:underline'
  return (
    <footer className="ks-section mt-10" style={{ background: 'var(--ks-strip)' }}>
      <div className="ks-section-inner py-6 text-sm text-stone-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-base font-bold text-white">🌾 {t('app_name')}</div>
            <div className="mt-1 text-[14px]" style={{ color: '#B7CFBE' }}>{t('mission_income')} · {t('mission_rojgar')}</div>
            <div className="mt-1 text-[13px]" style={{ color: '#8FB29C' }}>{t('footer_company')}</div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ color: '#B7CFBE' }}>
            <Link to="/bazaar" className={link}>{t('bazaar_nav')}</Link>
            <Link to="/privacy" className={link}>{t('footer_privacy')}</Link>
            <Link to="/terms" className={link}>{t('footer_terms')}</Link>
            <Link to="/grievance" className={link}>{t('footer_grievance')}</Link>
            <Link to="/resources" className={link}>{t('resources_nav')}</Link>
            <Link to="/credits" className={link}>{t('footer_credits')}</Link>
            <a href={`mailto:${t('footer_general_email')}`} className={link}>{t('footer_general_email')}</a>
            <WhatsAppJoin variant="link" src="footer" className="!text-green-300" />
          </nav>
        </div>
        <div className="mt-5 border-t border-white/10 pt-3 text-[12px]" style={{ color: '#8FB29C' }}>
          {t('footer_copyright')}
          <div className="mt-1">{t('footer_credit_prefix')} <a href="https://usdvisionai.com" target="_blank" rel="noopener noreferrer" className={link}>USD Vision AI LLP</a></div>
          <div className="mt-1">{t('footer_weather_data_prefix')}<a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className={link}>Open-Meteo.com</a>{t('footer_data_sources_suffix')}</div>
        </div>
      </div>
    </footer>
  )
}
