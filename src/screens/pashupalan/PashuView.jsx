// Batch 19 - shared view for the Pashupalan hub and detail pages. All Hindi/English text comes from the
// per-page content module (src/content/pashupalan/*); this file holds layout only.
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import WhatsAppChannelCard from '../../components/WhatsAppChannelCard'
import { buildPashuJsonLd, faqList } from '../../lib/pashupalan/seo'
import { STATUS, NOTE, UI, RELATED_LABELS, ASOF_DATE_LABEL } from '../../content/pashupalan/common'

export const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
export const h2c = 'text-[22px] font-extrabold leading-snug md:text-[26px]'
const TONE = {
  amber: { bg: '#FFF3D6', fg: '#7A4B00', bd: '#E0A93B' },
  blue: { bg: '#E3EEFB', fg: '#17406F', bd: '#6FA2D6' },
  green: { bg: 'var(--ks-green-tint)', fg: 'var(--ks-green-dark)', bd: 'var(--ks-green)' },
  grey: { bg: '#EEF0F1', fg: '#3C4448', bd: '#AEB6BA' },
}
export const pick = (v, lang) => (v ? (v[lang] ?? v.hi) : '')
export const fmtDate = (iso, lang) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })
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
      <span className="text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(ASOF_DATE_LABEL, lang)}: <time dateTime={asOf}>{fmtDate(asOf, lang)}</time></span>
    </div>
  )
}

export function Block({ section, lang }) {
  const items = section.items
  return (
    <section id={section.id} aria-labelledby={`h-${section.id}`} className="p-4 md:p-5" style={card}>
      <h2 id={`h-${section.id}`} className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(section.h, lang)}</h2>
      {section.kind === 'p' && (
        <div className="mt-2 space-y-3">{items.map((it, i) => <p key={i} className="text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{pick(it, lang)}</p>)}</div>
      )}
      {section.kind === 'ul' && (
        <ul className="mt-2 list-disc space-y-2.5 pl-5">{items.map((it, i) => <li key={i} className="text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{pick(it, lang)}</li>)}</ul>
      )}
      {section.kind === 'ol' && (
        <ol className="mt-2 space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
              <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>{i + 1}</span>
              <span>{pick(it, lang)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function Faq({ page, lang }) {
  const faq = faqList(page, lang)
  if (!faq.length) return null
  return (
    <section id="faq" aria-labelledby="h-faq" className="p-4 md:p-5" style={card}>
      <h2 id="h-faq" className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(UI.faqTitle, lang)}</h2>
      <div className="mt-2 divide-y" style={{ borderColor: 'var(--ks-border)' }}>
        {faq.map((f, i) => (
          <details key={i} className="group py-1" open>
            <summary className="flex min-h-[48px] cursor-pointer items-center py-2 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{f.q}</summary>
            <p className="pb-3 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Sources({ page, lang }) {
  return (
    <section id="sources" aria-labelledby="h-sources" className="p-4 md:p-5" style={card}>
      <h2 id="h-sources" className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(UI.bySource, lang)}</h2>
      <p className="mt-1 text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(UI.sourcesIntro, lang)}</p>
      <ul className="mt-2 space-y-2">
        {page.sources.map((s) => (
          <li key={s.url} className="text-[15px] leading-snug">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center break-all font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{pick(s.title, lang)}</a>
            <span className="block" style={{ color: 'var(--ks-ink-2)' }}>{pick(UI.typeLabel[s.type], lang)} · {fmtDate(s.date, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Related({ page, lang }) {
  return (
    <section id="more" aria-labelledby="h-more">
      <h2 id="h-more" className={h2c} style={{ color: 'var(--ks-ink)' }}>{pick(UI.more, lang)}</h2>
      <ul className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {page.related.map((to) => (
          <li key={to}>
            <Link to={to} data-testid="pashu-related" className="flex min-h-[56px] items-center justify-between gap-2 px-4 py-3 text-[16px] font-bold" style={{ ...card, color: 'var(--ks-green-dark)' }}>
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
      <p className="text-[16px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(UI.channelHint, lang)}</p>
      <WhatsAppChannelCard variant="inline" />
      <Link to="/sawaal" className="inline-flex min-h-[48px] items-center rounded-lg px-4 text-[16px] font-extrabold" style={{ border: '2px solid var(--ks-green-dark)', color: 'var(--ks-green-dark)' }}>{pick(UI.askBtn, lang)}</Link>
    </section>
  )
}

export function Header({ page, lang, status }) {
  return (
    <header className="p-4 md:p-6" style={{ ...card, background: 'var(--ks-bg-soft)' }}>
      <h1 className="text-[28px] font-extrabold leading-tight md:text-[36px]" style={{ color: 'var(--ks-ink)' }}>{pick(page.h1, lang)}</h1>
      <div className="mt-3">{status}</div>
      <p data-testid="pashu-answer" className="mt-3 text-[18px] font-semibold leading-relaxed" style={{ color: 'var(--ks-ink)' }}>{pick(page.answer, lang)}</p>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{pick(UI.byline, lang)} · {pick(UI.updated, lang)}: <time dateTime={page.asOf}>{fmtDate(page.asOf, lang)}</time></p>
    </header>
  )
}

export function PashuDetail({ page }) {
  const { lang } = useLang()
  const crumbs = [{ label: UI.home, to: '/pashupalan' }, { label: page.h1 }]
  return (
    <PageShell width="wide" crumbs={crumbs}>
      <Seo title={pick(page.seo.title, lang)} description={pick(page.seo.description, lang)} path={page.path} type="article" jsonLd={buildPashuJsonLd(page, lang)} />
      <div className="w-full space-y-5">
        <Header page={page} lang={lang} status={<StatusBadge status={page.status} asOf={page.asOf} lang={lang} />} />
        {page.sections.map((s) => <Block key={s.id} section={s} lang={lang} />)}
        <p data-testid="pashu-note" className="p-4 text-[16px] font-semibold leading-relaxed" style={{ ...card, borderColor: 'var(--ks-green)' }}>{pick(NOTE, lang)}</p>
        <Channel lang={lang} />
        <Faq page={page} lang={lang} />
        <Sources page={page} lang={lang} />
        <Related page={page} lang={lang} />
      </div>
    </PageShell>
  )
}

