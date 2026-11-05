// Batch 19-B - shared building blocks for the Pashupalan hub and detail pages. Layout only: every word comes from
// the content modules (src/content/pashupalan/*) or common.js. No Hindi text may appear in this file.
import { Link } from 'react-router-dom'
import { Art } from './art'
import './pashu.css'
import WhatsAppChannelCard from '../../components/WhatsAppChannelCard'
import { STATUS, UI, RELATED_LABELS, ASOF_DATE_LABEL } from '../../content/pashupalan/common'
import { LINKS, LINK_TOKEN, PAGE_TOKEN } from '../../content/pashupalan/links'
import { faqList } from '../../lib/pashupalan/seo'

export const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
export const h2c = 'text-[24px] font-extrabold leading-snug md:text-[28px]'
export const body = 'text-[17px] leading-relaxed'
const ink = { color: 'var(--ks-ink)' }
const ink2 = { color: 'var(--ks-ink-2)' }
const TONE = {
  amber: { bg: '#FFF3D6', fg: '#7A4B00', bd: '#E0A93B' },
  blue: { bg: '#E3EEFB', fg: '#17406F', bd: '#6FA2D6' },
  green: { bg: 'var(--ks-green-tint)', fg: 'var(--ks-green-dark)', bd: 'var(--ks-green)' },
  grey: { bg: '#EEF0F1', fg: '#3C4448', bd: '#AEB6BA' },
}
export const pick = (v, lang) => (v ? (v[lang] ?? v.hi) : '')
export const fmtDate = (iso, lang) => {
  const loc = lang === 'en' ? 'en-IN' : 'hi-IN'
  if (/^\d{4}-\d{2}$/.test(iso)) return new Date(iso + '-01T00:00:00').toLocaleDateString(loc, { month: 'long', year: 'numeric' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date(iso + 'T00:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })
}

const Out = () => <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="ml-1 inline shrink-0"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

// An official website mentioned in the text: a real, safe external link.
export function Ext({ id, lang }) {
  const l = LINKS[id]
  if (!l) return null
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" data-testid="pashu-ext" data-link-id={id} className="pk-link inline-flex min-h-[44px] items-center font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>
      {l.label[lang]}<Out /><span className="sr-only">{pick(UI.newTab, lang)}</span>
    </a>
  )
}

// Text with {{link:id}} (external) and {{page:route}} (internal) tokens turned into links.
export function Txt({ text, lang }) {
  const parts = String(text).split(/(\{\{(?:link|page):[a-z0-9\-/]+\}\})/g)
  return parts.map((s, i) => {
    const lm = s.match(new RegExp(LINK_TOKEN.source))
    if (lm) return <Ext key={i} id={lm[1]} lang={lang} />
    const pm = s.match(new RegExp(PAGE_TOKEN.source))
    if (pm) {
      const to = '/' + pm[1]
      return <Link key={i} to={to} data-testid="pashu-inline" className="pk-link inline-flex min-h-[44px] items-center font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(RELATED_LABELS[to], lang)}</Link>
    }
    return s
  })
}

export function StatusBadge({ status, asOf, lang }) {
  const st = STATUS[status]
  const tone = TONE[st.tone]
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="pashu-status">
      <span className="inline-flex min-h-[36px] items-center rounded-full px-3 text-[15px] font-bold" style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="mr-1.5 shrink-0"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        {pick(UI.statusLabel, lang)}: {pick(st, lang)}
      </span>
      {asOf && <span className="text-[15px]" style={ink2}>{pick(ASOF_DATE_LABEL, lang)}: <time dateTime={asOf}>{fmtDate(asOf, lang)}</time></span>}
    </div>
  )
}

export function Chip({ status, lang }) {
  const tone = TONE[STATUS[status].tone]
  return <span className="inline-flex min-h-[32px] items-center rounded-full px-3 text-[14px] font-bold" style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}>{pick(STATUS[status], lang)}</span>
}

export function ShareWa({ page, lang }) {
  const text = `${pick(UI.shareText, lang)}${pick(page.h1, lang)} https://kissansahyog.com${page.path}`
  return (
    <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" data-testid="pashu-share"
      className="pk-link inline-flex min-h-[48px] items-center gap-2 rounded-lg px-4 text-[16px] font-extrabold text-white" style={{ background: '#1E7F4F' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8.5 8.8c.3 3 2.7 5.4 5.7 5.7l1.3-1.4-2-1-.8.7a4 4 0 0 1-2.1-2.1l.7-.8-1-2Z" fill="currentColor" /></svg>
      {pick(UI.shareWa, lang)}
    </a>
  )
}

export function Hero({ page, lang, readMin, status, children }) {
  return (
    <header className="pk-hero pk-in overflow-hidden" style={{ borderRadius: 'var(--ks-radius-lg)', border: '1px solid var(--ks-border)' }}>
      <div className="grid items-center gap-4 p-5 md:grid-cols-[1fr_260px] md:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[15px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>
            <span>{pick(UI.byline, lang)}</span><span aria-hidden="true">·</span><span>{pick(UI.readMin, lang).replace('{n}', readMin)}</span>
          </div>
          <h1 className="mt-2 text-[30px] font-extrabold leading-tight md:text-[40px]" style={ink}>{pick(page.h1, lang)}</h1>
          <p className="mt-2 text-[19px] font-bold leading-snug" style={{ color: 'var(--ks-green-dark)' }}>{pick(page.hook, lang)}</p>
          {status && <div className="mt-3">{status}</div>}
          <p data-testid="pashu-answer" className={`mt-3 ${body} font-semibold`} style={ink}>{pick(page.answer, lang)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
        </div>
        <Art name={page.art} className="mx-auto w-full max-w-[260px] md:max-w-none" />
      </div>
    </header>
  )
}

const SarIcon = ({ k }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    {k === 0 && <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></>}
    {k === 1 && <><circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3.5 19c.5-3.5 3-5 5.5-5s5 1.5 5.5 5M16 7.5a3 3 0 0 1 0 5.5M18 18.5c-.2-2-1-3.3-2.4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
    {k === 2 && <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>}
  </svg>
)

export function Sar({ page, lang }) {
  const labels = [UI.sarWhat, UI.sarWho, UI.sarStatus]
  return (
    <section aria-labelledby="h-sar" className="pk-in">
      <h2 id="h-sar" className={h2c} style={ink}>{pick(UI.summary, lang)}</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {page.sar.map((s, i) => (
          <li key={i} className="p-4" style={{ ...card, borderTop: '5px solid var(--ks-green)' }}>
            <p className="flex items-center gap-2 text-[16px] font-extrabold" style={{ color: 'var(--ks-green-dark)' }}><SarIcon k={i} />{pick(labels[i], lang)}</p>
            <p className={`mt-2 ${body}`} style={ink2}><Txt text={pick(s, lang)} lang={lang} /></p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Tiles({ tiles, lang, title = UI.bigNumbers, id = 'tiles' }) {
  return (
    <section aria-labelledby={`h-${id}`} className="pk-in">
      <h2 id={`h-${id}`} className={h2c} style={ink}>{pick(title, lang)}</h2>
      <ul className={`mt-3 grid gap-3 ${tiles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {tiles.map((t, i) => (
          <li key={i} className="flex flex-col p-4" style={{ background: 'var(--ks-green-tint)', border: '1px solid var(--ks-green)', borderRadius: 'var(--ks-radius-lg)' }}>
            <p className="text-[26px] font-extrabold leading-tight" style={{ color: 'var(--ks-green-dark)' }}>{pick(t.v, lang)}</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug" style={ink}>{pick(t.l, lang)}</p>
            <p className="mt-auto pt-2 text-[14px]" style={ink2}>{pick(t.src, lang)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DirectLinks({ page, lang }) {
  const links = (page.links || []).filter((l) => LINKS[l.id])
  return (
    <section aria-labelledby="h-links" className="pk-in p-4 md:p-5" style={{ ...card, borderColor: 'var(--ks-green)', borderWidth: 2 }} data-testid="pashu-links">
      <h2 id="h-links" className={h2c} style={ink}>{pick(UI.directLinks, lang)}</h2>
      {links.length > 0 && <p className="mt-1 text-[16px]" style={ink2}>{pick(UI.directLinksHint, lang)}</p>}
      {page.noLink && (
        <div className="mt-3 flex gap-3 p-3" style={{ background: TONE.amber.bg, border: `1px solid ${TONE.amber.bd}`, borderRadius: 'var(--ks-radius-lg)' }} data-testid="pashu-nolink">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: TONE.amber.fg }}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <div><p className="text-[17px] font-extrabold" style={{ color: TONE.amber.fg }}>{pick(UI.noLink, lang)}</p><p className="text-[16px]" style={ink2}>{pick(UI.noLinkHint, lang)}</p></div>
        </div>
      )}
      {links.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.id}>
              <a href={LINKS[l.id].url} target="_blank" rel="noopener noreferrer" data-testid="pashu-direct" data-link-id={l.id}
                className="pk-link flex min-h-[52px] flex-col justify-center rounded-lg px-4 py-2 text-white" style={{ background: 'var(--ks-green-dark)' }}>
                <span className="flex items-center justify-between gap-2 text-[17px] font-extrabold">{pick(l.btn, lang)}<Out /><span className="sr-only">{pick(UI.newTab, lang)}</span></span>
                <span className="text-[14px] opacity-90">{LINKS[l.id].label[lang]}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const Tick = ({ ok }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0">
    <circle cx="12" cy="12" r="10" fill={ok ? 'var(--ks-green)' : '#B7791F'} />
    {ok ? <path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.8M12 16.6v.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />}
  </svg>
)

// Two side-by-side panels (stacked on phones): what is known / what is not.
export function Panels({ yes, no, lang, yesTitle, noTitle, id, heading }) {
  const side = (blk, ok, title) => (
    <div className="p-4 md:p-5" style={{ ...card, background: ok ? 'var(--ks-green-tint)' : '#FFF8E8', borderColor: ok ? 'var(--ks-green)' : TONE.amber.bd }}>
      <h3 className="text-[21px] font-extrabold" style={ink}>{pick(title, lang)}</h3>
      {blk.h && blk.h !== title && <p className="mt-0.5 text-[15px] font-bold" style={ink2}>{pick(blk.h, lang)}</p>}
      <ul className="mt-3 space-y-3">
        {blk.items.map((it, i) => <li key={i} className={`flex gap-2.5 ${body}`} style={ink2}><Tick ok={ok} /><span><Txt text={pick(it, lang)} lang={lang} /></span></li>)}
      </ul>
    </div>
  )
  return (
    <section aria-label={id} className="pk-in" data-testid={`pashu-${id}`}>
      {heading && <h2 className={`${h2c} mb-3`} style={ink}>{pick(heading, lang)}</h2>}
      <div className="grid gap-3 md:grid-cols-2">{side(yes, true, yesTitle)}{side(no, false, noTitle)}</div>
    </section>
  )
}

export function Steps({ steps, lang }) {
  return (
    <section id="steps" aria-labelledby="h-steps" className="pk-in">
      <h2 id="h-steps" className={h2c} style={ink}>{pick(steps.h, lang)}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-2" data-testid="pashu-steps">
        {steps.items.map((it, i) => (
          <li key={i} className="flex gap-3 p-4" style={card}>
            <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>{i + 1}</span>
            <p className={body} style={ink2}><span className="sr-only">{pick(UI.step, lang)} {i + 1}: </span><Txt text={pick(it, lang)} lang={lang} /></p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Wait({ wait, lang }) {
  return (
    <section id="wait" aria-labelledby="h-wait" className="pk-in space-y-3" data-testid="pashu-wait">
      <h2 id="h-wait" className={h2c} style={ink}>{pick(wait.h, lang)}</h2>
      <div className="flex gap-3 p-4 md:p-5" style={{ background: '#FFF8E8', border: `2px dashed ${TONE.amber.bd}`, borderRadius: 'var(--ks-radius-lg)' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0" style={{ color: TONE.amber.fg }}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        <div>
          <p className="text-[20px] font-extrabold" style={{ color: TONE.amber.fg }}>{pick(UI.waitTitle, lang)}</p>
          <p className={`mt-1 ${body}`} style={ink2}>{pick(wait.card, lang)}</p>
        </div>
      </div>
      <div className="p-4 md:p-5" style={card}>
        <h3 className="text-[20px] font-extrabold" style={ink}>{pick(wait.prep.h, lang)}</h3>
        <ul className="mt-2 space-y-2.5">
          {wait.prep.items.map((it, i) => <li key={i} className={`flex gap-2.5 ${body}`} style={ink2}><Tick ok /><span><Txt text={pick(it, lang)} lang={lang} /></span></li>)}
        </ul>
      </div>
    </section>
  )
}

export function Timeline({ timeline, lang }) {
  return (
    <section id="timeline" aria-labelledby="h-timeline" className="pk-in" data-testid="pashu-timeline">
      <h2 id="h-timeline" className={h2c} style={ink}>{pick(timeline.h, lang)}</h2>
      <ol className="mt-3 border-l-4 pl-5" style={{ borderColor: 'var(--ks-green)' }}>
        {timeline.items.map((it, i) => (
          <li key={i} className="relative pb-5 last:pb-0">
            <span aria-hidden="true" className="absolute -left-[31px] top-1 h-4 w-4 rounded-full" style={{ background: 'var(--ks-green-dark)', border: '3px solid var(--ks-bg-soft)' }} />
            <p className="text-[17px] font-extrabold" style={{ color: 'var(--ks-green-dark)' }}>{pick(it.d, lang)}</p>
            <p className={body} style={ink2}><Txt text={pick(it, lang)} lang={lang} /></p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Section({ section, lang, tint }) {
  const items = section.items
  return (
    <section id={section.id} aria-labelledby={`h-${section.id}`} className="pk-in p-4 md:p-6" style={{ ...card, background: tint ? 'var(--ks-bg-soft)' : 'var(--ks-card)' }}>
      <h2 id={`h-${section.id}`} className={h2c} style={ink}>{pick(section.h, lang)}</h2>
      {section.kind === 'ul' ? (
        <ul className="mt-3 space-y-3">{items.map((it, i) => <li key={i} className={`flex gap-2.5 ${body}`} style={ink2}><Tick ok /><span><Txt text={pick(it, lang)} lang={lang} /></span></li>)}</ul>
      ) : (
        <div className="mt-3 space-y-3">{items.map((it, i) => <p key={i} className={body} style={ink2}><Txt text={pick(it, lang)} lang={lang} /></p>)}</div>
      )}
    </section>
  )
}

export function Callout({ kind, blk, lang }) {
  const t = kind === 'amber' ? TONE.amber : TONE.green
  return (
    <aside className="pk-in flex gap-3 p-4 md:p-5" data-testid={`pashu-${kind === 'amber' ? 'caution' : 'tip'}`} style={{ background: t.bg, border: `2px solid ${t.bd}`, borderRadius: 'var(--ks-radius-lg)' }}>
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: t.fg }}>
        {kind === 'amber' ? <path d="M12 3 2.5 20h19L12 3Zm0 6.5v5M12 17v.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div>
        <p className="text-[18px] font-extrabold" style={{ color: t.fg }}>{pick(kind === 'amber' ? UI.caution : UI.tip, lang)}: {pick(blk.h, lang)}</p>
        {blk.items.map((it, i) => <p key={i} className={`mt-1 ${body}`} style={ink}><Txt text={pick(it, lang)} lang={lang} /></p>)}
      </div>
    </aside>
  )
}

export function Faq({ page, lang }) {
  const faq = faqList(page, lang)
  if (!faq.length) return null
  return (
    <section id="faq" aria-labelledby="h-faq" className="pk-in p-4 md:p-6" style={card}>
      <h2 id="h-faq" className={h2c} style={ink}>{pick(UI.faqTitle, lang)}</h2>
      <div className="mt-2 divide-y" style={{ borderColor: 'var(--ks-border)' }}>
        {faq.map((f, i) => (
          <details key={i} className="pk-faq py-1" open={i < 2}>
            <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2 text-[18px] font-bold" style={ink}>
              <span>{f.q}</span><span aria-hidden="true" className="pk-plus shrink-0 text-[24px]" style={{ color: 'var(--ks-green-dark)' }}>+</span>
            </summary>
            <p className={`pb-3 ${body}`} style={ink2}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Income({ page, lang }) {
  const blk = page.income
  const isIncomePage = page.slug === 'pashupalan-se-kamai'
  return (
    <section id="income" aria-labelledby="h-income" className="pk-in p-4 md:p-6" style={{ background: 'var(--ks-green-tint)', border: '2px solid var(--ks-green)', borderRadius: 'var(--ks-radius-lg)' }} data-testid="pashu-income">
      <h2 id="h-income" className={h2c} style={ink}>{pick(blk.h, lang)}</h2>
      <div className="mt-3 space-y-3">{blk.items.map((it, i) => <p key={i} className={body} style={ink}><Txt text={pick(it, lang)} lang={lang} /></p>)}</div>
      {!isIncomePage && (
        <Link to="/pashupalan/pashupalan-se-kamai" data-testid="pashu-income-link" className="pk-link mt-4 flex min-h-[52px] items-center justify-between rounded-lg px-4 text-[17px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>
          <span>{pick(UI.incomePage, lang)}</span><span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  )
}

export function Sources({ page, lang }) {
  return (
    <section id="sources" aria-labelledby="h-sources" className="pk-in p-4 md:p-5" style={card}>
      <h2 id="h-sources" className={h2c} style={ink}>{pick(UI.bySource, lang)}</h2>
      <p className="mt-1 text-[15px]" style={ink2}>{pick(UI.sourcesIntro, lang)}</p>
      <ul className="mt-2 space-y-2">
        {page.sources.map((s) => (
          <li key={s.url} className="text-[15px] leading-snug">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="pk-link inline-flex min-h-[44px] items-center break-all font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(s.title, lang)}<Out /><span className="sr-only">{pick(UI.newTab, lang)}</span></a>
            <span className="block" style={ink2}>{pick(UI.typeLabel[s.type], lang)} · {fmtDate(s.date, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Related({ page, lang }) {
  return (
    <section id="more" aria-labelledby="h-more">
      <h2 id="h-more" className={h2c} style={ink}>{pick(UI.more, lang)}</h2>
      <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {page.related.map((to) => (
          <li key={to}>
            <Link to={to} data-testid="pashu-related" className="pk-link flex min-h-[56px] items-center justify-between gap-2 px-4 py-3 text-[17px] font-bold" style={{ ...card, color: 'var(--ks-green-dark)' }}>
              <span>{pick(RELATED_LABELS[to], lang)}</span><span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Channel({ lang }) {
  return (
    <section aria-label="channel" className="space-y-2">
      <p className="text-[16px]" style={ink2}>{pick(UI.channelHint, lang)}</p>
      <WhatsAppChannelCard variant="inline" />
      <Link to="/sawaal" className="pk-link inline-flex min-h-[48px] items-center rounded-lg px-4 text-[16px] font-extrabold" style={{ border: '2px solid var(--ks-green-dark)', color: 'var(--ks-green-dark)' }}>{pick(UI.askBtn, lang)}</Link>
    </section>
  )
}
