import { useLang } from '../../lib/i18n/LanguageProvider'
import { pick } from './citeContext.jsx'
import Cite from './Cite.jsx'
import Calc from './Calc.jsx'
import PastExampleNote from './PastExampleNote.jsx'

// Slug an id for heading anchors (ascii fallback if a hi string sneaks in).
function anchorId(block, i) {
  if (block.id) return block.id
  return `s-${i}`
}

function Heading({ block, i, lang }) {
  const L = Math.min(Math.max(block.level || 2, 2), 4)
  const Tag = `h${L}`
  const cls =
    L === 2
      ? 'mt-8 mb-3 text-2xl font-bold text-stone-900'
      : L === 3
        ? 'mt-6 mb-2 text-xl font-bold text-stone-800'
        : 'mt-4 mb-2 text-lg font-semibold text-stone-800'
  return (
    <Tag id={anchorId(block, i)} className={`scroll-mt-20 ${cls}`}>
      {pick(block.text, lang)}
    </Tag>
  )
}

function Paragraph({ block, lang }) {
  return (
    <p className="my-3 leading-relaxed text-stone-700 break-words">
      {pick(block.text, lang)}
      <Cite ids={block.cites} />
      {block.pastExample && <> <PastExampleNote /></>}
    </p>
  )
}

function List({ block, lang }) {
  const Tag = block.ordered ? 'ol' : 'ul'
  return (
    <Tag className={`my-3 space-y-1.5 pl-6 text-stone-700 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
      {block.items.map((it, i) => (
        <li key={i} className="leading-relaxed break-words">
          {pick(it.text ?? it, lang)}
          <Cite ids={it.cites} />
        </li>
      ))}
    </Tag>
  )
}

function Table({ block, lang }) {
  return (
    <figure className="my-5 overflow-x-auto">
      {block.caption && (
        <figcaption className="mb-2 text-sm font-semibold text-stone-700">{pick(block.caption, lang)}</figcaption>
      )}
      <table className="w-full border-collapse text-sm">
        {block.head && (
          <thead>
            <tr className="bg-stone-100 text-left">
              {block.head.map((h, i) => (
                <th key={i} className="border border-stone-200 px-3 py-2 font-semibold text-stone-800">
                  {pick(h, lang)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className={r % 2 ? 'bg-white' : 'bg-stone-50/50'}>
              {row.map((cell, c) => (
                <td key={c} className="border border-stone-200 px-3 py-2 align-top text-stone-700">
                  {pick(cell.text ?? cell, lang)}
                  <Cite ids={cell.cites} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Fact({ block, lang }) {
  return (
    <blockquote className="my-5 border-l-4 border-green-500 bg-green-50/50 px-4 py-3 text-lg font-semibold text-stone-800 break-words">
      {pick(block.text, lang)}
      <Cite ids={block.cites} />
      {block.pastExample && <> <PastExampleNote /></>}
    </blockquote>
  )
}

function Summary({ block, lang, t }) {
  return (
    <section aria-label={t('summary_heading')} className="my-5 rounded-2xl border border-green-200 bg-green-50 p-4">
      <h2 className="mb-2 text-base font-bold text-green-900">{t('summary_heading')}</h2>
      <p className="leading-relaxed text-stone-800 break-words">
        {pick(block.text, lang)}
        <Cite ids={block.cites} />
      </p>
    </section>
  )
}

function Checklist({ block, lang }) {
  return (
    <div className="my-5 rounded-xl border border-stone-200 bg-white p-4">
      {block.title && <h3 className="mb-2 font-bold text-stone-800">{pick(block.title, lang)}</h3>}
      <ul className="space-y-2">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2 leading-relaxed text-stone-700">
            <span aria-hidden className="mt-0.5 text-green-600">✓</span>
            <span className="break-words min-w-0">{pick(it.text ?? it, lang)}<Cite ids={it.cites} /></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Faq({ block, lang, t }) {
  return (
    <section aria-labelledby="faq-h" className="my-6">
      <h2 id="faq-h" className="mb-3 text-2xl font-bold text-stone-900">{t('faq_heading')}</h2>
      <div className="space-y-2">
        {block.faqs.map((f, i) => (
          <details key={i} className="rounded-xl border border-stone-200 bg-white p-3">
            <summary className="cursor-pointer font-semibold text-stone-800">{pick(f.q, lang)}</summary>
            <div className="mt-2 leading-relaxed text-stone-700 break-words">
              {pick(f.a, lang)}
              <Cite ids={f.cites} />
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

function Cta({ block, lang }) {
  const Inner = (
    <>
      <span className="font-semibold">{pick(block.text, lang)}</span>
      {block.label && <span className="ml-2 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">{pick(block.label, lang)}</span>}
    </>
  )
  return (
    <div className="my-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 px-4 py-3">
      {block.href ? (
        <a href={block.href} className="flex flex-1 flex-wrap items-center justify-between gap-2">{Inner}</a>
      ) : (
        Inner
      )}
    </div>
  )
}

export default function ContentBlocks({ blocks = [] }) {
  const { t, lang } = useLang()
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': return <Heading key={i} block={block} i={i} lang={lang} />
          case 'paragraph': return <Paragraph key={i} block={block} lang={lang} />
          case 'list': return <List key={i} block={block} lang={lang} />
          case 'table': return <Table key={i} block={block} lang={lang} />
          case 'fact': return <Fact key={i} block={block} lang={lang} />
          case 'calc': return <Calc key={i} {...block} />
          case 'summary': return <Summary key={i} block={block} lang={lang} t={t} />
          case 'checklist': return <Checklist key={i} block={block} lang={lang} />
          case 'faq': return <Faq key={i} block={block} lang={lang} t={t} />
          case 'cta': return <Cta key={i} block={block} lang={lang} />
          default: return null
        }
      })}
    </>
  )
}

// Build JSON-LD (FAQPage + HowTo) from the same block data, in the given lang.
export function buildContentJsonLd(blocks = [], lang = 'hi') {
  const out = []
  const faqBlock = blocks.find((b) => b.type === 'faq')
  if (faqBlock && faqBlock.faqs?.length) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqBlock.faqs.map((f) => ({
        '@type': 'Question',
        name: pick(f.q, lang),
        acceptedAnswer: { '@type': 'Answer', text: pick(f.a, lang) },
      })),
    })
  }
  const howto = blocks.find((b) => b.type === 'list' && b.howto)
  if (howto) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: pick(howto.howtoName || { hi: '', en: '' }, lang),
      step: howto.items.map((it, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: pick(it.text ?? it, lang),
      })),
    })
  }
  return out
}
