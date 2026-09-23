import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner } from '../components/ui'
import { fetchPublishedArticles, articleTitle, articleSummary } from '../lib/articles/articlesApi'

// A stable colour for the placeholder cover when an article has no image.
const COVERS = ['bg-green-700', 'bg-amber-600', 'bg-emerald-700', 'bg-lime-700', 'bg-teal-700']
const coverFor = (slug) => COVERS[[...String(slug)].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length]

// Public article listing page.
export default function Articles() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    fetchPublishedArticles()
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(t(e.i18nKey || 'err_unknown')))
    return () => { alive = false }
  }, [t])

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : '')

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="mb-6 text-2xl font-bold text-stone-900">{t('articles_title')}</h1>
        {error && <Notice tone="error">{error}</Notice>}
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-stone-500">{t('articles_empty')}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <button
                key={a.id}
                type="button"
                data-testid="article-card"
                onClick={() => navigate(`/articles/${a.slug}`)}
                className="flex flex-col overflow-hidden rounded-2xl border-2 border-stone-200 bg-white text-left shadow-sm active:bg-stone-50"
              >
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" crossOrigin="anonymous" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-36 w-full bg-[var(--ks-primary)] object-cover" />
                ) : (
                  <div className={`flex h-36 w-full items-center justify-center ${coverFor(a.slug)}`}>
                    <span className="text-5xl" aria-hidden="true">📰</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-bold text-stone-900">{articleTitle(a, lang)}</h2>
                  {articleSummary(a, lang) && <p className="mt-1 line-clamp-3 text-sm text-stone-600">{articleSummary(a, lang)}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                    <span>{a.author_name}</span>
                    <span>{fmtDate(a.published_at)}</span>
                  </div>
                  <span className="mt-2 text-sm font-bold text-green-700">{t('read_more')} →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
