import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { jugaadPage } from '../content/pages/jugaad.js'

// /jugaad/jankari (Batch 2 item D) — the jugaad information + legal guide, moved
// unchanged from the old /jugaad hub. /jugaad is now the marketplace. Prerendered,
// in the sitemap, SEO + JSON-LD from the page's blocks.
export default function JugaadJankari() {
  const { t, lang } = useLang()
  return (
    <PageShell
      width="content"
      crumbs={[{ label: t('jugaad_nav'), to: '/jugaad' }, { label: t('jugaad_guide_crumb') }]}
    >
      <Seo
        title={jugaadPage.title[lang].slice(0, 60)}
        description={jugaadPage.blocks[0].text[lang].slice(0, 155)}
        path="/jugaad/jankari" image="/og/jugaad.png"
        type="article"
        jsonLd={buildContentJsonLd(jugaadPage.blocks, lang)}
      />

      <ContentPage page={jugaadPage} />
    </PageShell>
  )
}
