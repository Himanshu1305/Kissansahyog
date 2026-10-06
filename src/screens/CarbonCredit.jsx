import { Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { carbonCreditPage } from '../content/pages/carbon-credit.js'
import RelatedBoxes from '../components/RelatedBoxes'
import CarbonPoll from '../components/CarbonPoll'
import CarbonSuggestions from '../components/CarbonSuggestions'
import WhatsAppShareButton from '../components/WhatsAppShareButton'

// /carbon-credit — authored carbon-credit explainer + MP policy analysis
// (ContentPage), plus a link to the printable policy brief, a WhatsApp share,
// a device-local poll and a suggestions box. No hardcoded Devanagari here — all
// UI copy via t(); the article body lives in src/content/pages/carbon-credit.js.
export default function CarbonCredit() {
  const { t, lang } = useLang()
  return (
    <PageShell width="content" crumbs={[{ label: t('carbon_nav') }]}>
      <Seo
        title={carbonCreditPage.title[lang].slice(0, 60)}
        description={carbonCreditPage.blocks[0].text[lang].slice(0, 155)}
        path="/carbon-credit" image="/og/carbon-credit.png"
        type="article"
        jsonLd={buildContentJsonLd(carbonCreditPage.blocks, lang)}
      />

      <ContentPage page={carbonCreditPage} />

      <div className="my-6">
        <Link
          to="/carbon-credit/niti-sujhav"
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-bold text-white hover:bg-green-800"
        >
          {t('carbon_brief_cta')}
        </Link>
      </div>

      <WhatsAppShareButton message={`${t('carbon_share')} https://kissansahyog.com/carbon-credit`} />

      <CarbonPoll />
      <CarbonSuggestions />

      <RelatedBoxes page="carbon" />
    </PageShell>
  )
}
