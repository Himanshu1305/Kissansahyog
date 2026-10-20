import { useLang } from '../lib/i18n/LanguageProvider'
import { WHATSAPP_CHANNEL_URL, WHATSAPP_CHANNEL_NAME } from '../lib/social'

// Batch 12A — "join our WhatsApp channel": a plain link, no widget, no script, no tracking.
//   hero   — home page: title, one line, big button
//   inline — content pages / success screens: one compact row
//   link   — one text line for the footer
// The button is #0F7A5F (white text 5.4:1, WCAG AA), not the bright WhatsApp green.
const GREEN = '#0F7A5F'
const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F7A5F]'

function Bubble({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="shrink-0">
      <path d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 2.1 1 4 2.6 5.4L5.3 20l3.9-1.8c.9.3 1.8.4 2.8.4 4.7 0 8.5-3.4 8.5-7.6S16.7 3.5 12 3.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 9.5c.3 2.3 2.3 4.3 4.8 4.8l1.1-1.2-1.7-.9-.8.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.8-.9-1.7z" fill="currentColor" />
    </svg>
  )
}

export default function WhatsAppChannelCard({ variant = 'inline', textKey = 'wa_ch_line', className = '' }) {
  const { t } = useLang()
  const btn = t('wa_ch_btn')
  const a11y = { href: WHATSAPP_CHANNEL_URL, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${btn} — ${WHATSAPP_CHANNEL_NAME}` }

  if (variant === 'link') {
    return (
      <a {...a11y} data-testid="wa-channel-link" aria-label={`${t('wa_ch_link')} — ${WHATSAPP_CHANNEL_NAME}`} className={`inline-flex min-h-[48px] items-center gap-1.5 hover:underline ${ring} ${className}`}>
        <Bubble size={16} /> {t('wa_ch_link')}
      </a>
    )
  }

  if (variant === 'hero') {
    return (
      <section data-testid="wa-channel-card" data-variant="hero" aria-labelledby="wa-ch-h" className={`ks-section-inner ${className}`} style={{ paddingTop: 10 }}>
        <div className="rounded-xl border-2 p-3 md:max-w-xl" style={{ background: 'var(--ks-green-tint)', borderColor: GREEN }}>
          <p id="wa-ch-h" className="text-[17px] font-extrabold leading-snug" style={{ color: 'var(--ks-green-dark)' }}>{t('wa_ch_title')}</p>
          <p className="mt-1 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t(textKey)}</p>
          <a {...a11y} data-testid="wa-channel-btn" className={`mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-[17px] font-extrabold text-white ${ring}`} style={{ background: GREEN }}>
            <Bubble /> {btn}
          </a>
        </div>
      </section>
    )
  }

  return (
    <div data-testid="wa-channel-card" data-variant="inline" className={`my-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-3 ${className}`} style={{ background: 'var(--ks-green-tint)', borderColor: GREEN }}>
      <p className="min-w-0 flex-1 basis-48 text-[15px] font-bold leading-snug" style={{ color: 'var(--ks-green-dark)' }}>{t(textKey)}</p>
      <a {...a11y} data-testid="wa-channel-btn" className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg px-4 text-[16px] font-extrabold text-white ${ring}`} style={{ background: GREEN }}>
        <Bubble size={20} /> {btn}
      </a>
    </div>
  )
}
