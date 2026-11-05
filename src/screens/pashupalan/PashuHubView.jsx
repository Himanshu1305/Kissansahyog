// Batch 19 - the /pashupalan hub view (comparison table -> stacked cards on phones, decision guide).
// Loaded only with the hub route; the guide data lives in content/pashupalan/guide.js.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import { buildPashuJsonLd } from '../../lib/pashupalan/seo'
import { NOTE, UI, RELATED_LABELS } from '../../content/pashupalan/common'
import { GUIDE, pickGuide } from '../../content/pashupalan/guide'
import { StatusBadge, Block, Faq, Sources, Related, Channel, Header, card, h2c, pick } from './PashuView'

function Guide({ lang }) {
  const [sel, setSel] = useState(null)
  const res = sel ? pickGuide(sel) : null
  return (
    <section id="guide" aria-labelledby="h-guide" className="p-4 md:p-5" style={card}>
      <h2 id="h-guide" className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(UI.guideTitle, lang)}</h2>
      <p className="mt-1 text-[16px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(UI.guideHint, lang)}</p>
      <div role="radiogroup" aria-labelledby="h-guide" className="mt-3 grid gap-2.5 md:grid-cols-2">
        {GUIDE.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={sel === g.id} data-testid={`guide-${g.id}`} onClick={() => setSel(g.id)}
            className="min-h-[56px] px-4 py-3 text-left text-[17px] font-bold"
            style={{ borderRadius: 'var(--ks-radius-lg)', border: `2px solid ${sel === g.id ? 'var(--ks-green-dark)' : 'var(--ks-border)'}`, background: sel === g.id ? 'var(--ks-green-tint)' : '#fff', color: 'var(--ks-ink)' }}>
            {pick(g.label, lang)}
          </button>
        ))}
      </div>
      <div aria-live="polite" data-testid="guide-result" className="mt-3">
        {res && (
          <div className="p-4" style={{ ...card, borderColor: 'var(--ks-green)', borderWidth: 2 }}>
            <p className="text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{pick(res.why, lang)}</p>
            <Link to={`/pashupalan/${res.primary}`} data-testid="guide-go" className="mt-3 flex min-h-[52px] items-center justify-center rounded-lg px-4 text-[17px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>
              {pick(UI.guideGo, lang)}: {pick(RELATED_LABELS[`/pashupalan/${res.primary}`], lang)}
            </Link>
            {res.also.length > 0 && (
              <p className="mt-3 text-[15px] font-bold" style={{ color: 'var(--ks-ink)' }}>{pick(UI.guideAlso, lang)}:{' '}
                {res.also.map((a, i) => <span key={a}>{i > 0 && ' · '}<Link to={`/pashupalan/${a}`} className="inline-block min-h-[44px] py-2 underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(RELATED_LABELS[`/pashupalan/${a}`], lang)}</Link></span>)}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function Table({ page, lang }) {
  return (
    <section id="table" aria-labelledby="h-table" className="p-4 md:p-5" style={card}>
      <h2 id="h-table" className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(page.tableTitle, lang)}</h2>
      {/* Phones: stacked cards. From md up: a real table. */}
      <ul className="mt-3 space-y-3 md:hidden" data-testid="pashu-cards">
        {page.table.map((r) => (
          <li key={r.slug} className="p-3" style={{ ...card, background: '#fff' }}>
            <p className="text-[18px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{pick(r.name, lang)}</p>
            <div className="mt-1"><StatusBadge status={r.status} asOf={r.asOf} lang={lang} /></div>
            <p className="mt-2 text-[16px]" style={{ color: 'var(--ks-ink-2)' }}><b>{pick(UI.tableWho, lang)}:</b> {pick(r.who, lang)}</p>
            <p className="mt-1 text-[16px]" style={{ color: 'var(--ks-ink-2)' }}><b>{pick(UI.tableGet, lang)}:</b> {pick(r.get, lang)}</p>
            <Link to={`/pashupalan/${r.slug}`} className="mt-2 flex min-h-[48px] items-center justify-center rounded-lg px-4 text-[16px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>{pick(UI.open, lang)} →</Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[16px]" data-testid="pashu-table">
          <thead>
            <tr style={{ background: 'var(--ks-green-tint)' }}>
              {['tableScheme', 'tableWho', 'tableGet', 'tableStatus', 'tablePage'].map((k) => <th key={k} scope="col" className="border p-3 font-extrabold" style={{ borderColor: 'var(--ks-border)', color: 'var(--ks-ink)' }}>{pick(UI[k], lang)}</th>)}
            </tr>
          </thead>
          <tbody>
            {page.table.map((r) => (
              <tr key={r.slug}>
                <th scope="row" className="border p-3 align-top font-bold" style={{ borderColor: 'var(--ks-border)', color: 'var(--ks-ink)' }}>{pick(r.name, lang)}</th>
                <td className="border p-3 align-top" style={{ borderColor: 'var(--ks-border)', color: 'var(--ks-ink-2)' }}>{pick(r.who, lang)}</td>
                <td className="border p-3 align-top" style={{ borderColor: 'var(--ks-border)', color: 'var(--ks-ink-2)' }}>{pick(r.get, lang)}</td>
                <td className="border p-3 align-top" style={{ borderColor: 'var(--ks-border)' }}><StatusBadge status={r.status} asOf={r.asOf} lang={lang} /></td>
                <td className="border p-3 align-top" style={{ borderColor: 'var(--ks-border)' }}><Link to={`/pashupalan/${r.slug}`} className="inline-flex min-h-[48px] items-center font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(UI.open, lang)}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ListBlock({ id, block, lang, kind = 'ul' }) {
  return <Block lang={lang} section={{ id, kind, h: block.h, items: block.items }} />
}

export function PashuHub({ page }) {
  const { lang } = useLang()
  const crumbs = [{ label: UI.home }]
  return (
    <PageShell width="wide" crumbs={crumbs}>
      <Seo title={pick(page.seo.title, lang)} description={pick(page.seo.description, lang)} path={page.path} jsonLd={buildPashuJsonLd(page, lang)} />
      <div className="w-full space-y-5">
        <Header page={page} lang={lang} status={null} />
        <section aria-label="intro" className="space-y-3 p-4 md:p-5" style={card}>
          {page.intro.map((it, i) => <p key={i} className="text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{pick(it, lang)}</p>)}
        </section>
        <Table page={page} lang={lang} />
        <Guide lang={lang} />
        <ListBlock id="howto" block={page.howto} lang={lang} />
        <ListBlock id="checklist" block={page.checklist} lang={lang} />
        <ListBlock id="news" block={page.news} lang={lang} />
        <ListBlock id="where" block={page.where} lang={lang} />
        <ListBlock id="notfound" block={page.notFound} lang={lang} />
        <ListBlock id="safety" block={page.safety} lang={lang} />
        <p data-testid="pashu-note" className="p-4 text-[16px] font-semibold leading-relaxed" style={{ ...card, borderColor: 'var(--ks-green)' }}>{pick(NOTE, lang)}</p>
        <Channel lang={lang} />
        <Faq page={page} lang={lang} />
        <Sources page={page} lang={lang} />
        <Related page={page} lang={lang} />
      </div>
    </PageShell>
  )
}
