// /about — About Us (Batch 7A). Public, static, no data fetch. All long copy is
// bilingual data in src/content/about.js; short labels come from strings.js.
// Section order: intro → what it is → why → what you can do → starting in Sagar →
// ownership and operation → what farmers say (only when there is something approved) →
// contact → founder card.
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import Logo from '../components/Logo'
import { about, buildAboutJsonLd } from '../content/about'
import { fetchPublicFeedback } from '../lib/feedback/feedbackApi'

const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
const bodyClass = 'text-[17px] leading-[1.8]'
const linkClass = 'font-bold underline'

function SectionBlock({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-8 scroll-mt-24">
      <h2 id={`${id}-h`} className="text-[22px] font-extrabold leading-snug md:text-[26px]" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Para({ children }) {
  return <p className={`mt-3 first:mt-0 ${bodyClass}`} style={{ color: 'var(--ks-ink-2)' }}>{children}</p>
}

// "What farmers say" (Batch 7B): suggestions sent through /grievance that the
// person allowed to be shown AND an admin approved. Anonymous — message text and its
// type only. Renders nothing at all until there is at least one, so there is never a
// placeholder or an empty heading (also the case before migration 0055 is applied).
function FarmerVoices() {
  const { t } = useLang()
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    fetchPublicFeedback(12).then((r) => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [])

  if (rows.length === 0) return null
  return (
    <SectionBlock id="kisanon-ki-rai" title={t('about_voices_title')}>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="about-voices">
        {rows.map((r, i) => (
          <li key={i} className="p-4" style={card}>
            <span className="inline-block rounded-full px-2 py-0.5 text-[13px] font-bold" style={{ color: 'var(--ks-green-dark)', background: 'var(--ks-green-tint)' }}>{t(`fb_type_${r.kind}`)}</span>
            <p lang={r.lang || undefined} className="mt-2 whitespace-pre-line text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{r.message}</p>
          </li>
        ))}
      </ul>
    </SectionBlock>
  )
}

export default function About() {
  const { t, lang } = useLang()
  const { hash } = useLocation()
  const p = (v) => v?.[lang] ?? v?.hi ?? ''

  // Scroll to a section when the page is opened with a #hash.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <PageShell width="content" crumbs={[{ label: t('nav_about_us') }]}>
      <Seo
        title={p(about.seo.title)}
        description={p(about.seo.description)}
        path="/about"
        jsonLd={buildAboutJsonLd(about, lang)}
      />

      <header className="flex items-center gap-4" style={{ ...card, background: 'var(--ks-bg-soft)', padding: 'clamp(16px, 4vw, 28px)' }}>
        <Logo size="xl" decorative />
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-tight md:text-[36px]" style={{ color: 'var(--ks-ink)' }}>{p(about.h1)}</h1>
          <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(about.lead)}</p>
        </div>
      </header>

      <SectionBlock id={about.what.id} title={p(about.what.title)}>
        {about.what.paras.map((para, i) => <Para key={i}>{p(para)}</Para>)}
      </SectionBlock>

      <SectionBlock id={about.why.id} title={p(about.why.title)}>
        {about.why.paras.map((para, i) => <Para key={i}>{p(para)}</Para>)}
        <p className="mt-4 text-[15px] font-bold" style={{ color: 'var(--ks-ink-3)' }}>{p(about.why.goals_label)}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {['mission_income', 'mission_rojgar'].map((key) => (
            <li key={key} className="text-[18px] font-extrabold" style={{ color: 'var(--ks-green-dark)', background: 'var(--ks-green-tint)', borderLeft: '6px solid var(--ks-green)', borderRadius: 'var(--ks-radius)', padding: '12px 14px' }}>
              {t(key)}
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock id={about.can_do.id} title={p(about.can_do.title)}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {about.can_do.items.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="block h-full p-4 hover:shadow-md" style={card}>
                <span className="block text-[18px] font-extrabold" style={{ color: 'var(--ks-green-dark)' }}>{p(item.title)} →</span>
                <span className="mt-1 block text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(item.text)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className={`mt-4 ${bodyClass}`}>
          <Link to="/how-to-use" data-testid="about-how-to-use" className={linkClass} style={{ color: 'var(--ks-green-dark)' }}>{p(about.can_do.how_to_use)} →</Link>
        </p>
      </SectionBlock>

      <SectionBlock id={about.sagar.id} title={p(about.sagar.title)}>
        {about.sagar.paras.map((para, i) => <Para key={i}>{p(para)}</Para>)}
      </SectionBlock>

      <SectionBlock id={about.who.id} title={p(about.who.title)}>
        <Para>{p(about.who.text)}</Para>
      </SectionBlock>

      <FarmerVoices />

      <SectionBlock id={about.contact.id} title={p(about.contact.title)}>
        <Para>
          {p(about.contact.email_lead)}
          <a href={`mailto:${about.contact.email}`} className={linkClass} style={{ color: 'var(--ks-green-dark)' }}>{about.contact.email}</a>
        </Para>
        <Para>
          {p(about.contact.feedback_lead)}
          <Link to="/grievance" className={linkClass} style={{ color: 'var(--ks-green-dark)' }}>{t('footer_grievance')}</Link>
        </Para>
      </SectionBlock>

      <SectionBlock id={about.founder_card.id} title={p(about.founder_card.title)}>
        <Link to="/founder" data-testid="about-founder-card" className="flex items-center gap-4 p-4 hover:shadow-md" style={card}>
          <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[18px] font-extrabold text-white" style={{ background: 'var(--ks-green)' }}>{t('founder_initials')}</span>
          <span className="min-w-0">
            <span className="block text-[19px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{t('founder_name')}</span>
            <span className="mt-0.5 block text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{t('founder_role')}</span>
            <span className="mt-1 block text-[15px] font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{t('founder_read_full')} →</span>
          </span>
        </Link>
      </SectionBlock>
    </PageShell>
  )
}
