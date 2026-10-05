import NavBar from '../NavBar'
import { Section, ContentColumn } from './primitives.jsx'
import Breadcrumbs from './Breadcrumbs.jsx'
import { PrerenderReady } from './Seo.jsx'

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
  width = 'content',
  crumbs,
  ready = true,
  mainClassName = '',
}) {
  const Wrap = width === 'wide' ? Section : ContentColumn
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <NavBar />
      <main className={`flex-1 py-5 ${mainClassName}`}>
        <Wrap>
          {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-4" />}
          {children}
        </Wrap>
      </main>
      <PrerenderReady when={ready} />
    </div>
  )
}
