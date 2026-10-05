import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { grievancePage } from '../content/pages/grievance.js'

// /grievance — Grievance Officer page (Phase 4). Bilingual content page +
// breadcrumbs + Seo (self-rendered per D6). Linked from the global footer.
export default function Grievance() {
  const { t, lang } = useLang()
  const jsonLd = buildContentJsonLd(grievancePage.blocks, lang)
  const crumbs = [{ label: t('footer_grievance') }]
  return (
    <PageShell width="content" crumbs={crumbs}>
      <Seo
        title={grievancePage.title[lang].slice(0, 60)}
        description={grievancePage.blocks[0].text[lang].slice(0, 155)}
        path="/grievance"
        type="article"
        jsonLd={jsonLd}
      />
      <ContentPage page={grievancePage} />
    </PageShell>
  )
}
