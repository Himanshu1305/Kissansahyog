import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'

// /contact — general contact (hello@). Grievances go to /grievance.
export default function Contact() {
  const { t, lang } = useLang()
  const crumbs = [{ label: { hi: 'संपर्क', en: 'Contact' } }]
  return (
    <PageShell width="content" crumbs={crumbs}>
      <Seo
        title={lang === 'en' ? 'Contact — Kissan Sahyog' : 'संपर्क — किसान सहयोग'}
        description={lang === 'en' ? 'Contact Kissan Sahyog at hello@kissansahyog.com. For complaints, see the Grievance Officer page.' : 'किसान सहयोग से hello@kissansahyog.com पर संपर्क करें। शिकायत के लिए शिकायत अधिकारी पेज देखें।'}
        path="/contact"
      />
      <h1 className="mb-3 text-3xl font-bold text-stone-900">{lang === 'en' ? 'Contact us' : 'हमसे संपर्क करें'}</h1>
      <p className="my-3 leading-relaxed text-stone-700">
        {lang === 'en'
          ? 'For general questions, email us at '
          : 'सामान्य सवालों के लिए हमें ईमेल करें: '}
        <a href="mailto:hello@kissansahyog.com" className="font-semibold text-green-800 underline">hello@kissansahyog.com</a>
      </p>
      <p className="my-3 leading-relaxed text-stone-700">
        {lang === 'en'
          ? 'For complaints about a listing, seller or information, please use the '
          : 'किसी लिस्टिंग, विक्रेता या जानकारी की शिकायत के लिए कृपया '}
        <Link to="/grievance" className="font-semibold text-green-800 underline">{t('footer_grievance')}</Link>
        {lang === 'en' ? ' page (grievance@kissansahyog.com).' : ' पेज देखें (grievance@kissansahyog.com)।'}
      </p>
    </PageShell>
  )
}
