// Batch 19-B - the detail-page layout shared by the six scheme pages and the income page. Layout only: all
// copy comes from the page's own content module (passed in as `page`), so it ships in that route's chunk.
import { lazy, Suspense } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import { buildPashuJsonLd } from '../../lib/pashupalan/seo'
import { readMinutes } from '../../content/pashupalan/walk'
import { NOTE, UI } from '../../content/pashupalan/common'
import {
  card, pick, StatusBadge, Hero, Sar, Tiles, DirectLinks, Panels, Steps, Wait, Timeline, Section, Callout, Faq, Income, Sources, Related, Channel, ShareWa,
} from './parts'

const MilkCalc = lazy(() => import('./MilkCalc'))

export { card, pick, StatusBadge }

export function PashuDetail({ page }) {
  const { lang } = useLang()
  const crumbs = [{ label: UI.home, to: '/pashupalan' }, { label: page.h1 }]
  return (
    <PageShell width="wide" crumbs={crumbs}>
      <Seo title={pick(page.seo.title, lang)} description={pick(page.seo.description, lang)} path={page.path} type="article" jsonLd={buildPashuJsonLd(page, lang)} />
      <div className="pashu w-full space-y-6">
        <Hero page={page} lang={lang} readMin={readMinutes(page)} status={<StatusBadge status={page.status} asOf={page.asOf} lang={lang} />}>
          <ShareWa page={page} lang={lang} />
        </Hero>
        <Sar page={page} lang={lang} />
        <Tiles tiles={page.tiles} lang={lang} />
        <DirectLinks page={page} lang={lang} />
        <Panels id="know" yes={page.know.yes} no={page.know.no} lang={lang} yesTitle={UI.knownTitle} noTitle={UI.unknownTitle} />
        {page.steps && <Steps steps={page.steps} lang={lang} />}
        {page.wait && <Wait wait={page.wait} lang={lang} />}
        {page.calc && (
          <Suspense fallback={<div className="p-4" style={card} aria-busy="true" />}>
            <MilkCalc calc={page.calc} lang={lang} />
          </Suspense>
        )}
        {page.timeline && <Timeline timeline={page.timeline} lang={lang} />}
        {page.sections.map((s, i) => <Section key={s.id} section={s} lang={lang} tint={i % 2 === 1} />)}
        {page.who && <Panels id="who" yes={page.who.yes} no={page.who.no} lang={lang} yesTitle={page.who.yes.h} noTitle={page.who.no.h} heading={page.who.h} />}
        <Callout kind="amber" blk={page.caution} lang={lang} />
        {page.tip && <Callout kind="green" blk={page.tip} lang={lang} />}
        <Faq page={page} lang={lang} />
        <Income page={page} lang={lang} />
        <p data-testid="pashu-note" className="p-4 text-[16px] font-semibold leading-relaxed" style={{ ...card, borderColor: 'var(--ks-green)' }}>{pick(NOTE, lang)}</p>
        <Channel lang={lang} />
        <Sources page={page} lang={lang} />
        <Related page={page} lang={lang} />
      </div>
    </PageShell>
  )
}
