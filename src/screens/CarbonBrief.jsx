import { PageShell, Seo } from '../components/layout'
import { ContentPage } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { carbonBriefPage } from '../content/pages/carbon-brief.js'

// /carbon-credit/niti-sujhav — a short, printable (A4) policy brief for
// officials. Print CSS hides nav/header/footer; the Print button is .no-print.
// No hardcoded Devanagari — UI copy via t(); body in carbon-brief.js.
export default function CarbonBrief() {
  const { t, lang } = useLang()
  return (
    <PageShell width="content" crumbs={[{ label: t('carbon_nav') }]}>
      <Seo
        title={carbonBriefPage.title[lang].slice(0, 60)}
        description={carbonBriefPage.blocks[0].text[lang].slice(0, 155)}
        path="/carbon-credit/niti-sujhav"
        type="article"
      />
      <style>{`@media print { nav, header, footer, .no-print { display:none !important } @page { size: A4; margin: 15mm } }`}</style>

      <div className="no-print mb-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-bold text-white hover:bg-green-800"
        >
          {t('carbon_brief_print')}
        </button>
      </div>

      <ContentPage page={carbonBriefPage} />
    </PageShell>
  )
}
