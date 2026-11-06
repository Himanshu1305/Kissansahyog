// Batch 19-B - the /pashupalan hub view: decision guide up top, benefit strip, scheme cards (whole card is the link),
// Sagar block, news timeline, safety, FAQ. Layout only; text comes from content/pashupalan/hub.js and guide.js.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import { buildPashuJsonLd } from '../../lib/pashupalan/seo'
import { readMinutes } from '../../content/pashupalan/walk'
import { NOTE, UI, STATUS, RELATED_LABELS } from '../../content/pashupalan/common'
import { GUIDE, pickGuide } from '../../content/pashupalan/guide'
import { card, h2c, body, pick, Hero, Tiles, Section, Timeline, Callout, Faq, Sources, Related, Channel, ShareWa, Chip } from './parts'

const ink = { color: 'var(--ks-ink)' }
const ink2 = { color: 'var(--ks-ink-2)' }
const STRIP = { amber: '#E0A93B', blue: '#6FA2D6', green: 'var(--ks-green)', grey: '#AEB6BA' }

function Guide({ lang }) {
  const [sel, setSel] = useState(null)
  const res = sel ? pickGuide(sel) : null
  return (
    <section id="guide" aria-labelledby="h-guide" className="pk-in p-4 md:p-6" style={{ ...card, borderColor: 'var(--ks-green)', borderWidth: 2, background: 'var(--ks-green-tint)' }}>
      <h2 id="h-guide" className={h2c} style={ink}>{pick(UI.guideTitle, lang)}</h2>
      <p className="mt-1 text-[17px]" style={ink2}>{pick(UI.guideHint, lang)}</p>
      <div role="radiogroup" aria-labelledby="h-guide" className="mt-3 grid gap-2.5 md:grid-cols-2">
        {GUIDE.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={sel === g.id} data-testid={`guide-${g.id}`} onClick={() => setSel(g.id)}
            className="pk-link min-h-[56px] px-4 py-3 text-left text-[17px] font-bold"
            style={{ borderRadius: 'var(--ks-radius-lg)', border: `2px solid ${sel === g.id ? 'var(--ks-green-dark)' : 'var(--ks-border)'}`, background: sel === g.id ? '#fff' : '#ffffffcc', color: 'var(--ks-ink)' }}>
            {pick(g.label, lang)}
          </button>
        ))}
      </div>
      <div aria-live="polite" data-testid="guide-result" className="mt-3">
        {res && (
          <div className="p-4" style={{ ...card, borderColor: 'var(--ks-green)', borderWidth: 2 }}>
            <p className={body} style={ink2}>{pick(res.why, lang)}</p>
            <Link to={`/pashupalan/${res.primary}`} data-testid="guide-go" className="pk-link mt-3 flex min-h-[52px] items-center justify-center rounded-lg px-4 text-[17px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>
              {pick(UI.guideGo, lang)}: {pick(RELATED_LABELS[`/pashupalan/${res.primary}`], lang)}
            </Link>
            {res.also.length > 0 && (
              <p className="mt-3 text-[16px] font-bold" style={ink}>{pick(UI.guideAlso, lang)}:{' '}
                {res.also.map((a, i) => <span key={a}>{i > 0 && ' · '}<Link to={`/pashupalan/${a}`} className="pk-link inline-flex min-h-[44px] items-center underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(RELATED_LABELS[`/pashupalan/${a}`], lang)}</Link></span>)}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function Why({ why, lang }) {
  return (
    <div className="space-y-3">
      <Tiles tiles={why.tiles} lang={lang} title={why.h} id="why" />
      <p className={body} style={ink2}>{pick(why.intro, lang)}</p>
      <Link to="/pashupalan/pashupalan-se-kamai" data-testid="pashu-income-link" className="pk-link flex min-h-[52px] items-center justify-between rounded-lg px-4 text-[17px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>
        <span>{pick(UI.incomePage, lang)}</span><span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

function Cards({ page, lang }) {
  return (
    <section id="schemes" aria-labelledby="h-schemes" className="pk-in">
      <h2 id="h-schemes" className={h2c} style={ink}>{pick(UI.seeAll, lang)}</h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="pashu-cards">
        {page.schemes.map((r) => (
          <li key={r.slug} className="relative flex flex-col overflow-hidden" style={card}>
            <span aria-hidden="true" className="block h-2" style={{ background: STRIP[STATUS[r.status].tone] }} />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-[21px] font-extrabold leading-snug">
                <Link to={`/pashupalan/${r.slug}`} data-testid="pashu-scheme-link" className="pk-link inline-block min-h-[44px] py-2 after:absolute after:inset-0 after:content-['']" style={ink}>{pick(r.name, lang)}</Link>
              </h3>
              <div><Chip status={r.status} lang={lang} /></div>
              <p className="text-[16px]" style={ink2}><b>{pick(UI.cardWho, lang)}:</b> {pick(r.who, lang)}</p>
              <p className="rounded-lg p-2.5 text-[16px] font-semibold" style={{ background: 'var(--ks-bg-soft)', color: 'var(--ks-ink)' }}><b>{pick(UI.keyFact, lang)}:</b> {pick(r.key, lang)}</p>
              <span aria-hidden="true" className="mt-auto flex min-h-[52px] items-center justify-center rounded-lg px-4 text-[17px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>{pick(UI.openCard, lang)} →</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PashuHub({ page }) {
  const { lang } = useLang()
  const crumbs = [{ label: UI.home }]
  const list = (id, blk, tint) => <Section section={{ id, kind: 'ul', h: blk.h, items: blk.items }} lang={lang} tint={tint} />
  return (
    <PageShell width="wide" crumbs={crumbs}>
      <Seo title={pick(page.seo.title, lang)} description={pick(page.seo.description, lang)} path={page.path} jsonLd={buildPashuJsonLd(page, lang)} />
      <div className="pashu w-full space-y-6">
        <Hero page={page} lang={lang} readMin={readMinutes(page)} status={null}>
          <ShareWa page={page} lang={lang} />
        </Hero>
        <section aria-label="intro" className="space-y-2">
          {page.intro.map((it, i) => <p key={i} className={body} style={ink2}>{pick(it, lang)}</p>)}
        </section>
        <Guide lang={lang} />
        <Cards page={page} lang={lang} />
        <Why why={page.why} lang={lang} />
        <Section section={{ id: 'sagar', kind: 'p', h: page.sagar.h, items: page.sagar.items }} lang={lang} tint />
        <Timeline timeline={page.news} lang={lang} />
        {list('howto', page.howto)}
        {list('checklist', page.checklist, true)}
        {list('where', page.where)}
        {list('notfound', page.notFound, true)}
        <Callout kind="amber" blk={page.safety} lang={lang} />
        <Faq page={page} lang={lang} />
        <p data-testid="pashu-note" className="p-4 text-[16px] font-semibold leading-relaxed" style={{ ...card, borderColor: 'var(--ks-green)' }}>{pick(NOTE, lang)}</p>
        <Channel lang={lang} />
        <Sources page={page} lang={lang} />
        <Related page={page} lang={lang} />
      </div>
    </PageShell>
  )
}
