import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { useLang } from '../lib/i18n/LanguageProvider'
import { CiteProvider, ContentBlocks, SourcesList, collectCiteIds } from '../components/content'
import RelatedBoxes from '../components/RelatedBoxes'
import WhatsAppShareButton from '../components/WhatsAppShareButton'
import { fetchSawaalBySlug, fetchRelatedSawaal, sawaalQuestion, sawaalAnswer } from '../lib/community/communityApi'

// Hindi-only Q&A page (§0.5). Renders structured answer_blocks when present,
// else falls back to the plain answer text. QAPage + (PageShell) BreadcrumbList.
export default function SawaalDetail() {
  const { slug } = useParams()
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState(null)
  const [related, setRelated] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetchSawaalBySlug(slug)
        if (!alive) return
        setRow(r)
        if (r) setRelated(await fetchRelatedSawaal({ crop: r.crop, category: r.category, excludeSlug: slug }))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [slug])

  const cropLabel = (c) => (c ? t(`kbcrop_${c}`) : '')
  const catLabel = (c) => (c ? t(`scat_${c}`) : '')

  const question = row ? sawaalQuestion(row, 'hi') : ''
  const answer = row ? sawaalAnswer(row, 'hi') : ''
  const blocks = Array.isArray(row?.answer_blocks) ? row.answer_blocks : null
  const orderedIds = useMemo(() => (blocks ? collectCiteIds(blocks) : []), [blocks])

  const jsonLd = useMemo(() => {
    if (!row) return []
    return [{
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer || question },
      },
    }]
  }, [row, question, answer])

  const crumbs = [{ label: t('sawaal_title'), to: '/sawaal' }]
  if (row?.crop) crumbs.push({ label: cropLabel(row.crop), to: `/fasal/${row.crop}/samasya` })
  crumbs.push({ label: question ? question.slice(0, 40) : slug })

  return (
    <PageShell width="content" crumbs={crumbs} ready={!loading}>
      <Seo
        title={(question || t('sawaal_title')).slice(0, 60)}
        description={(answer || question || '').slice(0, 155)}
        path={`/sawaal/${slug}`}
        type="article"
        hindiOnly
        jsonLd={jsonLd}
      />

      {!loading && !row ? (
        <div className="py-12 text-center">
          <p className="text-stone-600">{t('sawaal_no_match')}</p>
          <Link to="/sawaal" className="mt-3 inline-block font-bold text-green-700">{t('sawaal_all_q')} →</Link>
        </div>
      ) : row ? (
        <article className="content-page">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
            {row.crop && <Link to={`/fasal/${row.crop}/samasya`} className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">{cropLabel(row.crop)}</Link>}
            {row.category && <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-semibold text-green-800">{catLabel(row.category)}</span>}
          </div>
          <h1 className="mb-3 text-2xl font-bold text-stone-900 sm:text-3xl">{question}</h1>

          {/* AEO direct-answer box */}
          {answer && (
            <section aria-label={t('summary_heading')} className="my-4 rounded-2xl border border-green-200 bg-green-50 p-4">
              <h2 className="mb-1 text-base font-bold text-green-900">{t('summary_heading')}</h2>
              <p className="leading-relaxed text-stone-800">{answer}</p>
            </section>
          )}

          {blocks ? (
            <CiteProvider orderedIds={orderedIds}>
              <ContentBlocks blocks={blocks} />
              <SourcesList />
            </CiteProvider>
          ) : null}

          {/* When to contact KVK / agri office (§12.5) */}
          <section className="my-5 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="mb-1 font-bold text-stone-800">{t('sawaal_kvk_contact')}</h2>
            <p className="text-sm leading-relaxed text-stone-700">{t('sawaal_kvk_line')} <Link to="/resources" className="font-semibold text-green-700">{t('resources_nav')} →</Link></p>
          </section>

          <WhatsAppShareButton message={`${question} — ${answer} https://kissansahyog.com/sawaal/${slug}`} />

          {/* Related questions */}
          {related.length > 0 && (
            <section className="my-6">
              <h2 className="mb-2 text-xl font-bold text-stone-900">{t('sawaal_related_q')}</h2>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link to={`/sawaal/${r.slug}`} className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-green-50">
                      <span aria-hidden>❓</span><span>{sawaalQuestion(r, 'hi')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <RelatedBoxes page="sawaal" />
        </article>
      ) : null}
    </PageShell>
  )
}
