// /how-to-use — How to use the website (Batch 7C). Public, static, no data fetch.
// All copy is bilingual data in src/content/howToUse.js; the six diagrams are inline
// SVG (components/howto/Diagrams.jsx). Each diagram is a helper: the same facts are
// written out as a normal list right below it.
// Section order: what is here → without login → posting → find and contact →
// Kisan Sawaal → prices / cold storage / mela / schemes → phone + language → FAQ.
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import { StepFlowDiagram, ServicesDiagram, CompareDiagram } from '../components/howto/Diagrams'
import { howToUse as page, buildHowToUseJsonLd } from '../content/howToUse'

const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
const bodyClass = 'text-[17px] leading-[1.8]'
const linkClass = 'font-bold underline'
const green = { color: 'var(--ks-green-dark)' }
const SECTIONS = ['services', 'access', 'post', 'find', 'sawaal', 'info', 'phone', 'faq']

function SectionBlock({ id, title, intro, children }) {
  return (
    <section id={id} data-testid="howto-section" aria-labelledby={`${id}-h`} className="mt-10 scroll-mt-28">
      <h2 id={`${id}-h`} className="text-[22px] font-extrabold leading-snug md:text-[26px]" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      {intro && <p className={`mt-3 ${bodyClass}`} style={{ color: 'var(--ks-ink-2)' }}>{intro}</p>}
      {children}
    </section>
  )
}

// The written version of a diagram: a numbered list of steps.
function Steps({ items, label }) {
  return (
    <ol data-testid="howto-steps" aria-label={label} className={`mt-3 list-decimal space-y-2 pl-6 ${bodyClass}`} style={{ color: 'var(--ks-ink-2)' }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  )
}

function SubHeading({ children }) {
  return <h3 className="mt-6 text-[19px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{children}</h3>
}

function Note({ children, tone = 'soft' }) {
  const style = tone === 'warn'
    ? { background: 'var(--ks-saffron-tint)', borderLeft: '6px solid var(--ks-saffron)' }
    : { background: 'var(--ks-bg-soft)', borderLeft: '6px solid var(--ks-green)' }
  return <p className="mt-4 text-[16px] leading-relaxed" style={{ ...style, color: 'var(--ks-ink-2)', borderRadius: 'var(--ks-radius)', padding: '12px 14px' }}>{children}</p>
}

export default function HowToUse() {
  const { t, lang } = useLang()
  const { hash } = useLocation()
  const p = (v) => v?.[lang] ?? v?.hi ?? ''
  const flow = (d) => d.steps.map((s) => ({ icon: s.icon, lines: s.lines.map(p) }))

  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const { services, access, post, find, sawaal, info, phone, faq } = page

  return (
    <PageShell width="content" crumbs={[{ label: t('nav_how_to_use') }]}>
      <Seo
        title={p(page.seo.title)}
        description={p(page.seo.description)}
        path="/how-to-use"
        jsonLd={buildHowToUseJsonLd(page, lang)}
      />

      {/* Batch 10C: live demos at /guide — a prominent link card at the very top; the
          page's own content below is unchanged. */}
      <Link
        to="/guide"
        data-testid="entry-howto-guide"
        className="mb-4 flex min-h-[64px] items-center gap-3 rounded-xl border-2 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
        style={{ background: 'var(--ks-saffron-tint)', borderColor: 'var(--ks-saffron)' }}
      >
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--ks-accent)] text-[var(--ks-ink)]">
          <svg width="16" height="18" viewBox="0 0 9 10" focusable="false"><path d="M1 0.5L8.5 5L1 9.5Z" fill="currentColor" /></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[18px] font-extrabold leading-snug" style={{ color: 'var(--ks-ink)' }}>{t('guide_howto_link_title')}</span>
          <span className="block text-[15px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t('guide_howto_link_sub')}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-xl font-bold" style={{ color: 'var(--ks-orange-dark)' }}>›</span>
      </Link>

      <header style={{ ...card, background: 'var(--ks-bg-soft)', padding: 'clamp(16px, 4vw, 28px)' }}>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[36px]" style={{ color: 'var(--ks-ink)' }}>{p(page.h1)}</h1>
        <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(page.lead)}</p>
      </header>

      <nav aria-label={p(page.toc_label)} className="mt-5 p-4" style={card}>
        <p className="text-[15px] font-bold" style={{ color: 'var(--ks-ink-3)' }}>{p(page.toc_label)}</p>
        <ol className="mt-1 list-decimal pl-6 text-[16px] leading-relaxed">
          {SECTIONS.map((key) => (
            <li key={key}><a href={`#${page[key].id}`} className="inline-flex min-h-[40px] items-center font-semibold underline" style={green}>{p(page[key].title)}</a></li>
          ))}
        </ol>
      </nav>

      {/* a) what is here */}
      <SectionBlock id={services.id} title={p(services.title)} intro={p(services.intro)}>
        <ServicesDiagram title={p(services.diagram.title)} desc={p(services.diagram.desc)} hub={p(services.diagram.hub)} items={services.items.map((s) => ({ icon: s.icon, label: p(s.label) }))} />
        <ol data-testid="howto-steps" className="mt-3 grid list-none gap-2 sm:grid-cols-2">
          {services.items.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="block h-full p-3 hover:shadow-md" style={card}>
                <span className="block text-[17px] font-extrabold" style={green}>{p(s.label)} →</span>
                <span className="mt-0.5 block text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(s.text)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <Note>{p(services.more)}</Note>
      </SectionBlock>

      {/* b) without login */}
      <SectionBlock id={access.id} title={p(access.title)} intro={p(access.intro)}>
        <CompareDiagram
          title={p(access.diagram.title)} desc={p(access.diagram.desc)}
          openTitle={p(access.diagram.open_title)} openLines={access.diagram.open_lines.map(p)}
          loginTitle={p(access.diagram.login_title)} loginLines={access.diagram.login_lines.map(p)}
        />
        <SubHeading>{p(access.open_title)}</SubHeading>
        <Steps items={access.open.map(p)} label={p(access.open_title)} />
        <SubHeading>{p(access.login_title)}</SubHeading>
        <Steps items={access.needs_login.map(p)} label={p(access.login_title)} />
        <Note>{p(access.note)}</Note>
        <AuthLinks p={p} />
      </SectionBlock>

      {/* c) posting */}
      <SectionBlock id={post.id} title={p(post.title)} intro={p(post.intro)}>
        <StepFlowDiagram name="post" title={p(post.diagram.title)} desc={p(post.diagram.desc)} steps={flow(post.diagram)} />
        <Steps items={post.steps.map(p)} label={p(page.steps_label)} />
        <SubHeading>{p(post.after_title)}</SubHeading>
        <Steps items={post.after.map(p)} label={p(post.after_title)} />
        <AuthLinks p={p} />
      </SectionBlock>

      {/* d) find and contact */}
      <SectionBlock id={find.id} title={p(find.title)} intro={p(find.intro)}>
        <StepFlowDiagram name="find" title={p(find.diagram.title)} desc={p(find.diagram.desc)} steps={flow(find.diagram)} />
        <Steps items={find.steps.map(p)} label={p(page.steps_label)} />
        <SubHeading>{p(find.safety_title)}</SubHeading>
        <Note tone="warn">{p(find.safety)}</Note>
        <p className="mt-4"><Link to="/browse" className={linkClass} style={green}>{t('browse_title')} →</Link></p>
      </SectionBlock>

      {/* e) Kisan Sawaal */}
      <SectionBlock id={sawaal.id} title={p(sawaal.title)} intro={p(sawaal.intro)}>
        <StepFlowDiagram name="sawaal" title={p(sawaal.diagram.title)} desc={p(sawaal.diagram.desc)} steps={flow(sawaal.diagram)} />
        <Steps items={sawaal.steps.map(p)} label={p(page.steps_label)} />
        <p className="mt-4"><Link to="/sawaal" className={linkClass} style={green}>{t('sawaal_nav')} →</Link></p>
      </SectionBlock>

      {/* f) prices, cold storage, mela, schemes — one compact block each */}
      <SectionBlock id={info.id} title={p(info.title)}>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {info.blocks.map((b) => (
            <div key={b.to} className="p-4" style={card}>
              <h3 className="text-[18px] font-extrabold"><Link to={b.to} className="underline" style={green}>{p(b.title)} →</Link></h3>
              <ol data-testid="howto-steps" className="mt-2 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
                <li><span className="font-bold" style={{ color: 'var(--ks-ink)' }}>{p(info.where_label)}: </span>{p(b.where)}</li>
                <li><span className="font-bold" style={{ color: 'var(--ks-ink)' }}>{p(info.see_label)}: </span>{p(b.see)}</li>
              </ol>
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* g) phone + language */}
      <SectionBlock id={phone.id} title={p(phone.title)} intro={p(phone.intro)}>
        <StepFlowDiagram name="install" title={p(phone.diagram.title)} desc={p(phone.diagram.desc)} steps={flow(phone.diagram)} />
        <SubHeading>{p(phone.install_title)}</SubHeading>
        <Steps items={phone.install_steps.map(p)} label={p(phone.install_title)} />
        <Note>{p(phone.install_note)}</Note>
        <SubHeading>{p(phone.lang_title)}</SubHeading>
        <Steps items={phone.lang_steps.map(p)} label={p(phone.lang_title)} />
        <Note>{p(phone.lang_note)}</Note>
      </SectionBlock>

      {/* h) FAQ — always visible, so it is exactly what the FAQPage JSON-LD says */}
      <SectionBlock id={faq.id} title={p(faq.title)}>
        <dl className="mt-3 space-y-3" data-testid="howto-faq">
          {faq.items.map((f, i) => (
            <div key={i} className="p-4" style={card}>
              <dt className="text-[17px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{p(f.q)}</dt>
              <dd className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(f.a)}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-6 ${bodyClass}`} style={{ color: 'var(--ks-ink-2)' }}>
          {p(page.feedback.lead)}
          <Link to="/grievance" data-testid="howto-grievance" className={linkClass} style={green}>{t('footer_grievance')}</Link>
        </p>
      </SectionBlock>
    </PageShell>
  )
}

// "Register" / "Log in" — general words only; the screens themselves are being redesigned.
function AuthLinks({ p }) {
  return (
    <p className="mt-4 flex flex-wrap gap-2">
      <Link to="/signup" className="inline-flex min-h-[48px] items-center rounded-xl px-5 text-[16px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{p(page.register)}</Link>
      <Link to="/login" className="inline-flex min-h-[48px] items-center rounded-xl border-2 px-5 text-[16px] font-bold" style={{ borderColor: 'var(--ks-green)', color: 'var(--ks-green-dark)' }}>{p(page.login)}</Link>
    </p>
  )
}
