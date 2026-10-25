// /founder — about the founder (Batch 6G). Public, static, no data fetch.
// All long copy is bilingual data in src/content/founder.js; short labels come from
// strings.js. Section order: hero → at a glance → roots (+ education stepper) →
// service timeline → innovations & awards → resolve → three promises → blessings →
// FAQ → (optional video) → closing band.
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo, ORIGIN } from '../components/layout'
import { WhatsAppIcon } from '../components/home/kit'
import { useWhatsAppChannel } from '../lib/whatsapp/whatsappApi'
import { founder, buildFounderJsonLd } from '../content/founder'

const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
const h2Class = 'text-[26px] font-extrabold leading-snug md:text-[34px]'
const bodyClass = 'text-[17px] leading-[1.8] md:text-[18px]'

function SectionBlock({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="mt-10 md:mt-14">
      <h2 id={id} className={h2Class} style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Para({ children }) {
  return <p className={`ks-measure mt-4 first:mt-0 ${bodyClass}`} style={{ color: 'var(--ks-ink-2)' }}>{children}</p>
}

// Large pull-quote block (mission lines, principles).
function PullQuote({ children, quoted = false }) {
  return (
    <p
      className="text-[22px] font-extrabold leading-snug md:text-[28px]"
      style={{ color: 'var(--ks-green-dark)', background: 'var(--ks-green-tint)', borderLeft: '6px solid var(--ks-green)', borderRadius: 'var(--ks-radius)', padding: '16px 18px' }}
    >
      {quoted ? <>“{children}”</> : children}
    </p>
  )
}

// Optional photo: renders nothing until the owner sets `src` in the data file.
function SlotImage({ slot, lang, className = '' }) {
  if (!slot?.src) return null
  return (
    <img
      src={slot.src}
      alt={slot.alt?.[lang] ?? slot.alt?.hi ?? ''}
      width={slot.width}
      height={slot.height}
      loading="lazy"
      className={`h-auto w-full object-cover ${className}`}
    />
  )
}

export default function Founder() {
  const { t, lang } = useLang()
  const waChannel = useWhatsAppChannel()
  const p = (v) => v?.[lang] ?? v?.hi ?? ''
  const pageUrl = `${ORIGIN}/founder`
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`${p(founder.seo.title)} ${pageUrl}`)}`
  const videoId = founder.video.youtube_id

  return (
    <PageShell width="wide" crumbs={[{ label: t('footer_founder') }]}>
      <Seo
        title={p(founder.seo.title)}
        description={p(founder.seo.description)}
        path="/founder"
        image="/og/founder.png"
        type="profile"
        jsonLd={buildFounderJsonLd(founder, lang)}
      />

      {/* 1 — Hero */}
      <header className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10" style={{ ...card, background: 'var(--ks-bg-soft)', padding: 'clamp(18px, 4vw, 40px)' }}>
        <div className="order-2 md:order-1">
          <p className="text-[20px] font-bold md:text-[22px]" style={{ color: 'var(--ks-orange-dark)' }}>{p(founder.hero_greeting)}</p>
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.25] md:text-[46px]" style={{ color: 'var(--ks-ink)' }}>{p(founder.hero_title)}</h1>
          <p className="mt-4 text-[22px] font-extrabold md:text-[26px]" style={{ color: 'var(--ks-green-dark)' }}>{p(founder.name)}</p>
          <p className="mt-1 text-[16px] font-semibold leading-relaxed md:text-[17px]" style={{ color: 'var(--ks-ink-2)' }}>{p(founder.role)}</p>
          <p className="mt-5 text-[30px] font-extrabold leading-none tracking-wide md:text-[44px]" style={{ color: 'var(--ks-green)' }}>{p(founder.motto)}</p>
        </div>
        <div className="order-1 flex justify-center md:order-2">
          {founder.portrait.src ? (
            <img
              src={founder.portrait.src}
              alt={p(founder.portrait.alt)}
              width={founder.portrait.width}
              height={founder.portrait.height}
              className="h-auto w-56 object-cover md:w-72"
              style={{ borderRadius: 'var(--ks-radius-lg)', border: '4px solid var(--ks-card)', boxShadow: 'var(--ks-card-shadow)' }}
            />
          ) : (
            <span
              role="img"
              aria-label={p(founder.name)}
              data-testid="founder-initials"
              className="flex h-40 w-40 items-center justify-center rounded-full text-[44px] font-extrabold text-white md:h-56 md:w-56 md:text-[60px]"
              style={{ background: 'var(--ks-green-dark)', border: '6px solid var(--ks-green-tint)' }}
            >
              {t('founder_initials')}
            </span>
          )}
        </div>
      </header>

      {/* 2 — At a glance */}
      <SectionBlock id="founder-glance" title={t('founder_glance_title')}>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {founder.glance.map((g, i) => (
            <li key={i} className="text-[15px] font-semibold leading-snug md:text-[16px]" style={{ ...card, borderRadius: 'var(--ks-radius)', borderTop: '4px solid var(--ks-green)', padding: '12px', color: 'var(--ks-ink)' }}>
              {p(g)}
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* 3 — Roots + education stepper */}
      <SectionBlock id="founder-roots" title={p(founder.roots_heading)}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <Para>{p(founder.roots_p1)}</Para>
            <Para>{p(founder.roots_p2)}</Para>
            <SlotImage slot={founder.parents_image} lang={lang} className="mt-4 rounded-xl" />
            <Para>{p(founder.roots_p3)}</Para>
            <Para>{p(founder.roots_p4)}</Para>
            <div className="ks-measure mt-4 grid gap-3">
              <PullQuote>{t('hero_h1_l1')}</PullQuote>
              <PullQuote>{t('hero_h1_l2')}</PullQuote>
            </div>
            <Para>{p(founder.roots_p5)}</Para>
          </div>
          <aside className="h-fit" style={{ ...card, padding: '18px' }}>
            <h3 className="text-[19px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('founder_education_title')}</h3>
            <ol className="mt-4">
              {founder.education_timeline.map((s, i) => (
                <li key={i} className="relative pb-5 pl-8 last:pb-0">
                  {i < founder.education_timeline.length - 1 && (
                    <span aria-hidden="true" className="absolute bottom-0 left-[11px] top-6 w-0.5" style={{ background: 'var(--ks-border-strong)' }} />
                  )}
                  <span aria-hidden="true" className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{i + 1}</span>
                  <span className="block text-[16px] font-semibold leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{p(s)}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </SectionBlock>

      {/* 4 — Service + timeline (horizontal on desktop, vertical on phone) */}
      <SectionBlock id="founder-service" title={p(founder.service_heading)}>
        <Para>{p(founder.service_p)}</Para>
        <ol className="mt-6 grid gap-0 md:grid-cols-4">
          {founder.service_timeline.map((s, i) => (
            <li key={i} className="relative border-l-2 pb-5 pl-6 last:pb-0 md:border-l-0 md:border-t-2 md:pb-0 md:pl-0 md:pr-4 md:pt-5" style={{ borderColor: 'var(--ks-green)' }}>
              <span aria-hidden="true" className="absolute -left-[9px] top-0 h-4 w-4 rounded-full md:-top-[9px] md:left-0" style={{ background: 'var(--ks-green)', border: '3px solid var(--ks-bg)' }} />
              {s.when && <span className="block text-[20px] font-extrabold leading-none" style={{ color: 'var(--ks-green-dark)' }}>{s.when}</span>}
              <span className="mt-1 block text-[16px] font-semibold leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{p(s.label)}</span>
            </li>
          ))}
        </ol>
      </SectionBlock>

      {/* 5 — Innovations and awards */}
      <SectionBlock id="founder-innovations" title={p(founder.innovations_heading)}>
        <div className="grid gap-3 md:grid-cols-2">
          {founder.innovations.map((it, i) => (
            <article key={i} className="overflow-hidden" style={card}>
              <SlotImage slot={it} lang={lang} />
              <div style={{ padding: '16px' }}>
                <h3 className="text-[20px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>{p(it.place)}</h3>
                <p className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(it.text)}</p>
              </div>
            </article>
          ))}
        </div>
        <h3 className="mt-6 text-[21px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('founder_awards_title')}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {founder.awards.map((a, i) => (
            <article key={i} style={{ ...card, background: 'var(--ks-bg-warm)', padding: '16px' }}>
              <p className="text-[15px] font-bold" style={{ color: 'var(--ks-orange-dark)' }}>{a.year}</p>
              <h4 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{p(a.title)}</h4>
              <p className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(a.text)}</p>
              {a.proof_src && (
                <a href={a.proof_src} target="_blank" rel="noopener noreferrer" aria-label={`${t('founder_view_certificate')}: ${p(a.proof_alt)}`} className="mt-2 inline-flex min-h-[44px] items-center text-[16px] font-bold underline" style={{ color: 'var(--ks-green)' }}>
                  {t('founder_view_certificate')}
                </a>
              )}
            </article>
          ))}
        </div>
        <Para>{p(founder.after_service)}</Para>
      </SectionBlock>

      {/* 6 — Resolve */}
      <SectionBlock id="founder-resolve" title={p(founder.resolve_heading)}>
        <Para>{p(founder.resolve_p)}</Para>
        <div className="ks-measure mt-4 grid gap-3">
          {founder.principles.map((q, i) => <PullQuote key={i} quoted>{p(q)}</PullQuote>)}
        </div>
      </SectionBlock>

      {/* 7 — Three promises */}
      <SectionBlock id="founder-promises" title={p(founder.promises_heading)}>
        <ol className="grid gap-3 md:grid-cols-3">
          {founder.promises.map((pr, i) => (
            <li key={i} style={{ ...card, padding: '18px' }}>
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-extrabold text-white" style={{ background: 'var(--ks-green)' }}>{i + 1}</span>
              <h3 className="mt-3 text-[20px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{p(pr.title)}</h3>
              <p className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(pr.text)}</p>
            </li>
          ))}
        </ol>
      </SectionBlock>

      {/* 8 — Blessings (plain names; no icons, links or photos) */}
      <SectionBlock id="founder-blessings" title={p(founder.blessings_heading)}>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2" style={{ ...card, background: 'var(--ks-bg-soft)', padding: 'clamp(16px, 3vw, 28px)' }}>
          {founder.family.map((g, i) => (
            <div key={i}>
              <h3 className="text-[14px] font-bold uppercase tracking-wide" style={{ color: 'var(--ks-ink-3)' }}>{p(g.label)}</h3>
              <ul className="mt-2 space-y-1.5">
                {g.members.map((m, j) => (
                  <li key={j} className="text-[18px] font-semibold leading-snug" style={{ color: 'var(--ks-ink)' }}>{p(m)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Para>{p(founder.blessings_close)}</Para>
      </SectionBlock>

      {/* FAQ — visible text; FAQPage JSON-LD is emitted from the same data via <Seo/>. */}
      <SectionBlock id="founder-faq" title={t('scheme_faqs')}>
        <dl className="ks-measure grid gap-3">
          {founder.faqs.map((f, i) => (
            <div key={i} style={{ ...card, borderRadius: 'var(--ks-radius)', padding: '14px' }}>
              <dt className="text-[18px] font-bold" style={{ color: 'var(--ks-ink)' }}>{p(f.q)}</dt>
              <dd className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{p(f.a)}</dd>
            </div>
          ))}
        </dl>
      </SectionBlock>

      {/* 10 — Optional video. Same pattern as /videos: a card that opens YouTube (no
          iframe, no autoplay), so the CSP needs no frame/img allowance. */}
      {videoId && (
        <SectionBlock id="founder-video" title={p(founder.video.title)}>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ks-measure flex min-h-[200px] flex-col items-center justify-center gap-3 text-[18px] font-bold text-white"
            style={{ background: 'var(--ks-green-dark)', borderRadius: 'var(--ks-radius-lg)' }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.45)' }} aria-hidden="true">
              <span className="ml-1 border-y-[10px] border-l-[17px] border-y-transparent border-l-white" />
            </span>
            {t('founder_watch_video')}
          </a>
        </SectionBlock>
      )}

      {/* 9 — Closing band. Full-bleed without horizontal scroll: the box-shadow paints
          the band out to the viewport edges and clip-path trims it vertically. */}
      <section
        aria-label={p(founder.motto)}
        className="mt-12 py-10 text-center md:mt-16 md:py-16"
        style={{ background: 'var(--ks-green-dark)', boxShadow: '0 0 0 100vmax var(--ks-green-dark)', clipPath: 'inset(0 -100vmax)' }}
      >
        <p className="text-[38px] font-extrabold leading-tight tracking-wide text-white md:text-[84px]">{p(founder.motto)}</p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link to={founder.cta_ask.to} className="inline-flex min-h-[52px] items-center justify-center rounded-xl px-6 text-[18px] font-bold" style={{ background: 'var(--ks-card)', color: 'var(--ks-green-dark)' }}>
            {p(founder.cta_ask.label)}
          </Link>
          {waChannel && (
            <Link to={founder.cta_join.to} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-6 text-[18px] font-bold" style={{ background: 'var(--ks-whatsapp)', color: 'var(--ks-ink)' }}>
              <WhatsAppIcon size={20} color="currentColor" /> {p(founder.cta_join.label)}
            </Link>
          )}
        </div>
        <a href={shareHref} target="_blank" rel="noopener noreferrer" data-testid="founder-share" className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold text-white underline">
          <WhatsAppIcon size={18} /> {t('founder_share_page')}
        </a>
      </section>
    </PageShell>
  )
}
