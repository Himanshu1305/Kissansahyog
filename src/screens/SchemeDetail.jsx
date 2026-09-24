// Individual government scheme page — /yojana/:slug. Public, no login. Structure
// follows myScheme.gov.in: H1 → direct-answer summary → Benefits → Eligibility →
// Apply → Documents → FAQs (accordion + FAQPage JSON-LD) → Sources → WhatsApp share.
// Also emits Article JSON-LD. All copy via i18n field pickers.
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Spinner } from '../components/ui'
import { WhatsAppIcon } from '../components/home/kit'
import {
  fetchYojanaBySlug, yojanaName, yojanaMinistry, yojanaDesc, yojanaBenefit,
  yojanaEligibility, yojanaHowTo, yojanaDocs, faqQ, faqA,
} from '../lib/community/communityApi'

const lines = (s) => String(s || '').split(/\n|·|;|,(?=\s*[०-९0-9])/).map((x) => x.trim()).filter(Boolean)
const stripNum = (s) => s.replace(/^\s*\d+[.)]\s*/, '')

export default function SchemeDetail() {
  const { slug } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [row, setRow] = useState(undefined)

  useEffect(() => {
    let alive = true
    setRow(undefined)
    fetchYojanaBySlug(slug).then((r) => alive && setRow(r || null)).catch(() => alive && setRow(null))
    return () => { alive = false }
  }, [slug])

  if (row === undefined) return (<div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}><NavBar /><Spinner /></div>)
  if (row === null) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
        <NavBar />
        <div style={{ padding: '24px var(--ks-gutter)' }}>
          <p className="text-[18px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('scheme_not_found')}</p>
          <button type="button" onClick={() => navigate('/yojana')} className="mt-3 rounded-lg px-4 py-2 text-[15px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>← {t('yojana_all')}</button>
        </div>
      </div>
    )
  }

  const name = yojanaName(row, lang)
  const summary = yojanaDesc(row, lang)
  const faqs = Array.isArray(row.faqs) ? row.faqs : []
  const howSteps = lines(yojanaHowTo(row, lang)).map(stripNum)
  const docs = lines(yojanaDocs(row, lang))
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${name}\n${summary}\n${shareUrl}`)}`

  // JSON-LD — FAQPage (text matches the rendered accordion exactly) + Article.
  const faqLd = faqs.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: faqQ(f, lang), acceptedAnswer: { '@type': 'Answer', text: faqA(f, lang) } })),
  } : null
  const articleLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: name,
    ...(row.created_at ? { datePublished: row.created_at } : {}),
    ...(row.updated_at ? { dateModified: row.updated_at } : {}),
    ...(summary ? { description: summary } : {}),
  }

  const H2 = ({ children }) => <h2 className="mt-6 mb-2 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{children}</h2>

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <article className="w-full" style={{ padding: '20px var(--ks-gutter)', maxWidth: 900 }}>
        <span className="inline-block rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>
          {row.government_level === 'state' ? t('scheme_mp_group') : t('scheme_central_group')}
        </span>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight md:text-[34px]" style={{ color: 'var(--ks-ink)' }}>{name}</h1>
        <p className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{yojanaName(row, 'en')} · {yojanaMinistry(row, lang)}</p>

        {summary && <p className="mt-3 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)', background: 'var(--ks-bg-warm)', padding: '12px', borderRadius: 'var(--ks-radius)' }}>{summary}</p>}

        {yojanaBenefit(row, lang) && (<><H2>{t('scheme_benefits')}</H2><p className="text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{yojanaBenefit(row, lang)}</p></>)}

        {yojanaEligibility(row, lang) && (<><H2>{t('scheme_eligibility_q')}</H2><p className="text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{yojanaEligibility(row, lang)}</p></>)}

        {howSteps.length > 0 && (<><H2>{t('scheme_how')}</H2><ol className="ml-5 list-decimal space-y-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{howSteps.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}

        {docs.length > 0 && (<><H2>{t('scheme_docs')}</H2><ul className="ml-5 list-disc space-y-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{docs.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}

        {faqs.length > 0 && (
          <><H2>{t('scheme_faqs')}</H2>
            <div className="space-y-2">
              {faqs.map((f, i) => <FaqItem key={i} q={faqQ(f, lang)} a={faqA(f, lang)} />)}
            </div>
          </>
        )}

        <H2>{t('scheme_sources')}</H2>
        <div className="text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>
          {row.source_url && <div><a href={row.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ks-green)', fontWeight: 700 }}>{row.source_url}</a></div>}
          {row.official_website && <div className="mt-1">{t('scheme_official_site')}: <a href={row.official_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ks-green)' }}>{row.official_website}</a></div>}
          {row.helpline && <div className="mt-1">{t('scheme_helpline')}: <a href={`tel:${row.helpline}`} style={{ color: 'var(--ks-green)' }}>{row.helpline}</a></div>}
          {row.last_verified_date && <div className="mt-1" style={{ color: 'var(--ks-ink-3)' }}>{t('scheme_verified')}: {row.last_verified_date}</div>}
        </div>

        <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-[16px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)' }}>
          <WhatsAppIcon size={20} /> {t('scheme_share')}
        </a>
      </article>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <span className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{q}</span>
        <span className="shrink-0 text-[18px]" style={{ color: 'var(--ks-green)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <p className="px-3 pb-3 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{a}</p>}
    </div>
  )
}
