import { useLang } from '../../lib/i18n/LanguageProvider'
import { CiteProvider, collectCiteIds, pick } from './citeContext.jsx'
import ContentBlocks from './ContentBlocks.jsx'
import SourcesList from './SourcesList.jsx'
import LastUpdated from './LastUpdated.jsx'

// Renders a structured content page (src/content/pages/<slug>.js):
//   { slug, title:{hi,en}, h1:{hi,en}, updated, checked?, blocks:[...] }
// Wraps the blocks in a CiteProvider so <Cite/> and <SourcesList/> share the
// same per-page numbering. Seo + PageShell are applied by the screen (Phase 2).
export default function ContentPage({ page }) {
  const { lang } = useLang()
  const orderedIds = collectCiteIds(page.blocks)
  return (
    <CiteProvider orderedIds={orderedIds}>
      <article className="content-page">
        <h1 className="mb-2 text-3xl font-bold text-stone-900">{pick(page.h1 ?? page.title, lang)}</h1>
        {page.updated && <LastUpdated date={page.updated} checked={page.checked} className="mb-4" />}
        <ContentBlocks blocks={page.blocks} />
        <SourcesList />
      </article>
    </CiteProvider>
  )
}
