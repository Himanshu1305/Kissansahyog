import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner } from '../components/ui'
import { fetchArticleBySlug, articleTitle, articleContent } from '../lib/articles/articlesApi'

// Public article detail. Renders plain-text/markdown-ish content as paragraphs.
export default function ArticleDetail() {
  const { slug } = useParams()
  const { t, lang } = useLang()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const a = await fetchArticleBySlug(slug)
        if (alive) setArticle(a)
      } catch (e) {
        if (alive) setError(t(e.i18nKey || 'err_unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [slug, t])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard unavailable */ }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : '')
  const paragraphs = article ? articleContent(article, lang).split(/\n\s*\n/).filter((p) => p.trim()) : []
  // The Parali article relates to the Bhusa-Parali marketplace.
  const relatesToBhusa = article?.slug?.includes('parali')

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <button type="button" onClick={() => navigate('/articles')} className="mb-4 text-sm font-semibold text-green-800 underline">
          ‹ {t('back_to_articles')}
        </button>

        {loading ? (
          <Spinner />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : !article ? (
          <p className="py-12 text-center text-stone-500">{t('article_not_found')}</p>
        ) : (
          <article>
            <h1 className="text-2xl font-extrabold leading-snug text-stone-900 sm:text-3xl">{articleTitle(article, lang)}</h1>
            <p className="mt-2 text-sm text-stone-500">{t('article_by')} {article.author_name} · {fmtDate(article.published_at)}</p>

            <div className="mt-6 space-y-4 text-lg leading-relaxed text-stone-800">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>

            {relatesToBhusa && (
              <button
                type="button"
                onClick={() => navigate(isLoggedIn ? '/browse?cat=bhusa' : '/?cat=bhusa')}
                className="mt-8 block w-full rounded-xl bg-green-700 px-5 py-3 text-center font-bold text-white active:bg-green-800"
              >
                🌾 {t('related_bhusa_cta')} →
              </button>
            )}

            <div className="mt-8 border-t border-stone-200 pt-5">
              <p className="mb-2 text-sm font-semibold text-stone-600">{t('share_article')}</p>
              <button type="button" onClick={copyLink} className="rounded-lg border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800">
                🔗 {copied ? t('link_copied') : t('copy_link')}
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}
