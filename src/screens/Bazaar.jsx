// Batch 4 item D — /bazaar (hub) + /bazaar/:slug (per-category landing). Public,
// prerendered, indexable pages that send people into Browse and Post. Browsing itself
// (/browse, /listing/:id) stays noindex and outside the sitemap. One component handles
// both: with a :slug it renders the category landing; without, the hub.
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { ORIGIN } from '../components/layout/Seo'
import { useLang } from '../lib/i18n/LanguageProvider'
import { BAZAAR_CATS, BAZAAR_DEDICATED, bazaarCat } from '../content/pages/bazaar'

function Hub() {
  const { t, lang } = useLang()
  const L = (o) => o[lang] || o.hi
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
      { '@type': 'ListItem', position: 2, name: 'Bazaar', item: `${ORIGIN}/bazaar` },
    ],
  }
  const card = 'flex items-start gap-3 rounded-2xl border-2 border-stone-200 bg-white p-4 hover:border-green-500'
  return (
    <PageShell width="wide" crumbs={[{ label: t('bazaar_nav') }]}>
      <Seo title={t('bazaar_hub_title').slice(0, 60)} description={t('bazaar_hub_intro').slice(0, 155)} path="/bazaar" jsonLd={[breadcrumb]} />
      <h1 className="text-3xl font-bold text-stone-900">{t('bazaar_hub_h1')}</h1>
      {/* ks-allow-width: readable intro line above the full-width grid */}
      <p className="mt-2 max-w-3xl text-stone-700">{t('bazaar_hub_intro')}</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BAZAAR_CATS.map((c) => (
          <Link key={c.slug} to={`/bazaar/${c.slug}`} className={card} data-testid={`bazaar-card-${c.slug}`}>
            <span className="text-3xl" aria-hidden="true">{c.icon}</span>
            <span>
              <span className="block text-lg font-bold text-stone-900">{L(c).name}</span>
              <span className="mt-0.5 block text-sm text-stone-600">{L(c).intro}</span>
            </span>
          </Link>
        ))}
        {BAZAAR_DEDICATED.map((d) => (
          <Link key={d.to} to={d.to} className={card} data-testid={`bazaar-dedicated-${d.to.replace(/\//g, '')}`}>
            <span className="text-3xl" aria-hidden="true">{d.icon}</span>
            <span>
              <span className="block text-lg font-bold text-stone-900">{L(d).name}</span>
              <span className="mt-0.5 block text-sm text-stone-600">{L(d).line}</span>
            </span>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}

function Landing({ c }) {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const d = c[lang] || c.hi
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
      { '@type': 'ListItem', position: 2, name: 'Bazaar', item: `${ORIGIN}/bazaar` },
      { '@type': 'ListItem', position: 3, name: d.name, item: `${ORIGIN}/bazaar/${c.slug}` },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: d.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const steps = [t('bazaar_step_list'), t('bazaar_step_search'), t('bazaar_step_call')]
  const others = BAZAAR_CATS.filter((x) => x.slug !== c.slug)
  return (
    <PageShell width="wide" crumbs={[{ label: t('bazaar_nav'), to: '/bazaar' }, { label: d.name }]}>
      <Seo title={d.title.slice(0, 60)} description={d.intro.slice(0, 155)} path={`/bazaar/${c.slug}`} jsonLd={[breadcrumb, faqLd]} />

      <h1 className="text-3xl font-bold text-stone-900">{c.icon} {d.name}</h1>
      {/* ks-allow-width: readable intro + body column on the full-width page */}
      <p className="mt-2 max-w-3xl text-lg text-stone-700">{d.intro}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => navigate(`/browse?cat=${c.cat}`)} data-testid="bazaar-btn-search" className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-green-700 px-6 py-3 text-base font-bold text-white active:bg-green-800">🔍 {t('bazaar_btn_search')}</button>
        <button type="button" onClick={() => navigate(`/post?cat=${c.cat}&type=${c.type}`)} data-testid="bazaar-btn-post" className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border-2 border-green-700 px-6 py-3 text-base font-bold text-green-800 active:bg-green-50">➕ {t('bazaar_btn_post')}</button>
      </div>

      <section className="mt-7 max-w-3xl">
        <h2 className="text-xl font-bold text-stone-900">{t('bazaar_find_h')}</h2>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {d.find.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-stone-700"><span aria-hidden="true">✓</span><span>{item}</span></li>
          ))}
        </ul>
      </section>

      <section className="mt-7 max-w-3xl">
        <h2 className="text-xl font-bold text-stone-900">{t('bazaar_how_h')}</h2>
        <ol className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-stone-700"><span className="font-bold text-green-700">{i + 1}.</span><span>{s}</span></li>
          ))}
        </ol>
        <p className="mt-2 text-sm font-semibold text-stone-600">{t('bazaar_connect_note')}</p>
      </section>

      <section className="mt-7 max-w-3xl space-y-3 text-stone-700">
        {d.body.split('\n').map((p, i) => <p key={i} className="leading-relaxed">{p}</p>)}
      </section>

      <section className="mt-7 max-w-3xl">
        <h2 className="text-xl font-bold text-stone-900">{t('bazaar_faq_h')}</h2>
        <dl className="mt-2 space-y-3">
          {d.faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-3">
              <dt className="font-bold text-stone-900">{f.q}</dt>
              <dd className="mt-1 text-stone-700">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-7 max-w-3xl">
        <h2 className="text-xl font-bold text-stone-900">{t('bazaar_more_h')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {others.map((x) => (
            <Link key={x.slug} to={`/bazaar/${x.slug}`} className="rounded-full border-2 border-stone-300 bg-white px-4 py-1.5 text-sm font-bold text-stone-700 hover:border-green-500">{x.icon} {(x[lang] || x.hi).name}</Link>
          ))}
          <Link to="/bazaar" className="rounded-full border-2 border-green-700 bg-white px-4 py-1.5 text-sm font-bold text-green-800">{t('bazaar_all_cats')} →</Link>
        </div>
      </section>
    </PageShell>
  )
}

export default function Bazaar() {
  const { slug } = useParams()
  const c = slug ? bazaarCat(slug) : null
  if (slug && !c) return <Hub />   // unknown slug → fall back to the hub (never a blank page)
  return c ? <Landing c={c} /> : <Hub />
}
