import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { greenhousePage } from '../content/pages/greenhouse.js'
import GreenhouseCalculators from '../components/GreenhouseCalculators'
import RelatedBoxes from '../components/RelatedBoxes'

// /greenhouse/subsidy (Batch 2 item C) — the greenhouse subsidy + farming guide.
// The authored content + cost/subsidy calculators moved here unchanged from the old
// /greenhouse hub; /greenhouse is now the marketplace. Prerendered, in the sitemap,
// FAQPage JSON-LD via buildContentJsonLd (the page's FAQ block).
export default function GreenhouseSubsidy() {
  const { t, lang } = useLang()
  return (
    <PageShell
      width="content"
      crumbs={[{ label: t('nav_greenhouse'), to: '/greenhouse' }, { label: t('gh_guide_crumb') }]}
    >
      <Seo
        title={greenhousePage.title[lang].slice(0, 60)}
        description={greenhousePage.blocks[0].text[lang].slice(0, 155)}
        path="/greenhouse/subsidy" image="/og/greenhouse.png"
        type="article"
        jsonLd={buildContentJsonLd(greenhousePage.blocks, lang)}
      />

      <ContentPage page={greenhousePage} />
      <GreenhouseCalculators />
      <RelatedBoxes page="greenhouse" />
    </PageShell>
  )
}
