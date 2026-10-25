import NavBar from '../NavBar'
import { Section, ContentColumn } from './primitives.jsx'
import Breadcrumbs from './Breadcrumbs.jsx'
import { PrerenderReady } from './Seo.jsx'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'

// V2 central page shell: NavBar + main. The site Footer and sitewide JSON-LD are
// mounted once globally in App (so every route — PageShell or legacy — has them;
// see V2_DECISIONS D4). Use `width="content"` for prose/forms (~70ch) or
// `width="wide"` for grids/directories.
//
//   <PageShell width="content" crumbs={[{label:…, to:…}]} ready={!loading}>
//     <Seo … />
//     …page…
//   </PageShell>
export default function PageShell({
  children,
  width = 'wide',
  crumbs,
  ready = true,
  mainClassName = '',
  readingAside = true,
}) {
  const { t } = useLang()
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <NavBar />
      <main className={`flex-1 py-[var(--ks-section-space)] ${mainClassName}`}>
        <Section as="div">
          {width === 'content' ? <div className="ks-reading-layout">
            <ContentColumn>
              {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-4" />}
              {children}
            </ContentColumn>
            {readingAside && (
              <aside className="hidden h-fit rounded-xl border border-[var(--ks-border)] bg-white p-4 lg:sticky lg:top-24 lg:block">
                <h2 className="text-base font-bold text-[var(--ks-ink)]">{t('reading_related_title')}</h2>
                <nav className="mt-2 space-y-2 text-sm font-semibold">
                  <Link to="/sawaal" className="block text-[var(--ks-green)] hover:underline">{t('reading_related_sawaal')}</Link>
                  <Link to="/yojana" className="block text-[var(--ks-green)] hover:underline">{t('reading_related_yojana')}</Link>
                  <Link to="/resources" className="block text-[var(--ks-green)] hover:underline">{t('reading_related_resources')}</Link>
                </nav>
              </aside>
            )}
          </div> : <>
            {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-4" />}
            {children}
          </>}
        </Section>
      </main>
      <PrerenderReady when={ready} />
    </div>
  )
}
