// Agro Forestry & Horticulture hub — /agro-forestry. Public, no login.
// Sections (Phase 2d): PageExplainer → hero → "आपके क्षेत्र में" (South Sagar FDA) →
// government schemes (2 cards) → article link → WhatsApp share → FAQ (FAQPage JSON-LD).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import BackButton from '../components/BackButton'
import { PageExplainer, FaqAccordion, ShareWhatsApp } from '../components/pages/shared'
import { fetchYojanaBySlug, yojanaName, yojanaBenefit, yojanaDesc } from '../lib/community/communityApi'
import { fetchArticleBySlug } from '../lib/articles/articlesApi'
import { AGRO_FAQS as FAQS, AGRO_KEYPOINTS } from '../content/agroforestry'

const SCHEME_SLUGS = ['fal-podharopan-yojana', 'aushadhi-sugandhit-fasal-vistar']
const ARTICLE_SLUG = 'intercropping-madhya-pradesh'

export default function AgroForestry() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [schemes, setSchemes] = useState([])
  const [article, setArticle] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all(SCHEME_SLUGS.map((s) => fetchYojanaBySlug(s).catch(() => null)))
      .then((rows) => alive && setSchemes(rows.filter(Boolean)))
    fetchArticleBySlug(ARTICLE_SLUG).then((a) => alive && setArticle(a)).catch(() => {})
    return () => { alive = false }
  }, [])

  const articleSummary = article ? (lang === 'hi' ? article.summary_hi : article.summary_en) : ''

  const shareText = `${t('agro_share_text')} ${typeof window !== 'undefined' ? window.location.href : ''}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <div className="w-full space-y-5" style={{ padding: '16px var(--ks-gutter)', maxWidth: 1000 }}>
        <BackButton fallback="/" />
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]" style={{ color: 'var(--ks-ink)' }}>{t('agro_title')}</h1>

        {/* 1 — Page explainer */}
        <PageExplainer title={t('agro_explain_title')} lines={[t('agro_explain_1'), t('agro_explain_2')]} />

        {/* 2 — Hero band */}
        <section className="overflow-hidden" style={{ borderRadius: 'var(--ks-radius-lg)', border: '1px solid var(--ks-border)', background: 'var(--ks-card)' }}>
          <img
            src="/images/agroforestry/agroforestry-turmeric.jpg"
            alt={t('agro_hero_h')}
            loading="lazy"
            className="h-52 w-full object-cover sm:h-64"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div style={{ padding: '14px' }}>
            <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_hero_h')}</h2>
            <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('agro_hero_body')}</p>
          </div>
        </section>

        {/* 3 — Your area (South Sagar FDA) — expanded with more sourced FDA-role detail */}
        <section style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_region_h')}</h2>
          <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('agro_region_body')}</p>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('agro_region_body2')}</p>
        </section>

        {/* 4 — Government schemes */}
        <section>
          <h2 className="mb-3 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{t('agro_schemes_h')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {schemes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/yojana/${r.slug}`)}
                className="flex flex-col text-left"
                style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}
              >
                <span className="w-fit rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t('ycat_horticulture')}</span>
                <span className="mt-1.5 text-[17px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{yojanaName(r, lang)}</span>
                <span className="mt-1 line-clamp-3 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{yojanaBenefit(r, lang) || yojanaDesc(r, lang)}</span>
                <span className="mt-2 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('scheme_view')} →</span>
              </button>
            ))}
          </div>
        </section>

        {/* 5 — Embedded article excerpt (teaser summary + 2 key points) → full article.
               Kept short on purpose so it does not duplicate the article at length (SEO). */}
        <section style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_excerpt_h')}</h2>
          {articleSummary && (
            <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{articleSummary}</p>
          )}
          <ul className="mt-2 space-y-1.5">
            {AGRO_KEYPOINTS.map((k, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
                <span style={{ color: 'var(--ks-green)' }}>✔</span><span>{k[lang]}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate(`/articles/${ARTICLE_SLUG}`)}
            data-testid="agro-article-link"
            className="mt-3 inline-block text-left text-[16px] font-bold"
            style={{ color: 'var(--ks-green)' }}
          >
            📖 {t('agro_read_full')} →
          </button>
        </section>

        {/* Link to the greenhouse / carbon hubs (Phase 7/8). */}
        <section className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/greenhouse')} className="rounded-xl border-2 px-4 py-2 text-[15px] font-bold" style={{ borderColor: 'var(--ks-green)', color: 'var(--ks-green)' }}>
            🏡 {t('home_cat_greenhouse')} →
          </button>
          <button type="button" onClick={() => navigate('/carbon-credit')} className="rounded-xl border-2 px-4 py-2 text-[15px] font-bold" style={{ borderColor: 'var(--ks-green)', color: 'var(--ks-green)' }}>
            🌱 {t('carbon_nav')} →
          </button>
        </section>

        {/* 6 — WhatsApp share */}
        <ShareWhatsApp text={shareText} />

        {/* 7 — FAQ + FAQPage JSON-LD */}
        <FaqAccordion faqs={FAQS} />
      </div>
    </div>
  )
}
