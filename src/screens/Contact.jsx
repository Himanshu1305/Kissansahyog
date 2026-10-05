import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'

// /contact — general contact (hello@). Grievances go to /grievance.
export default function Contact() {
  const { t } = useLang()
  const crumbs = [{ label: t('contact_crumb') }]
  return (
    <PageShell width="content" crumbs={crumbs}>
      <Seo title={t('contact_title')} description={t('contact_desc')} path="/contact" />
      <h1 className="mb-3 text-3xl font-bold text-stone-900">{t('contact_h1')}</h1>
      <p className="my-3 leading-relaxed text-stone-700">
        {t('contact_general_lead')}
        <a href="mailto:hello@kissansahyog.com" className="font-semibold text-green-800 underline">hello@kissansahyog.com</a>
      </p>
      <p className="my-3 leading-relaxed text-stone-700">
        {t('contact_grievance_lead')}
        <Link to="/grievance" className="font-semibold text-green-800 underline">{t('footer_grievance')}</Link>
        {t('contact_grievance_tail')}
      </p>
    </PageShell>
  )
}
