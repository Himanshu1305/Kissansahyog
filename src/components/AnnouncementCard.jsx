import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { textOf, safeLink, safeImage, STYLE_COLORS } from '../lib/announcements/announcements'

// Batch 14A - one announcement card (used on the home page and in the admin preview). No animation, no script.
// Text is dark ink on a light tint (contrast above 4.5:1). The close button is a 48 px target.
export default function AnnouncementCard({ a, onClose, preview = false }) {
  const { lang, t } = useLang()
  const c = STYLE_COLORS[a.style] || STYLE_COLORS.info
  const title = textOf(a, 'title', lang)
  const body = textOf(a, 'body', lang)
  const small = textOf(a, 'small', lang)
  const label = textOf(a, 'link_label', lang) || t('adm_card_more')
  const img = safeImage(a.image_url)
  const link = safeLink(a.link_url)
  const external = link && !link.startsWith('/')
  const linkClass = 'mt-1 inline-flex min-h-[48px] items-center text-[15px] font-bold underline'
  return (
    <div data-testid="announcement-card" data-announcement={a.id || 'preview'} className="mx-auto flex w-full max-w-[720px] items-start gap-3 rounded-xl border-2 py-2 pl-2 pr-0 md:gap-4 md:py-3 md:pl-3" style={{ background: c.bg, borderColor: c.border }}>
      {img && (
        <img src={img} width="56" height="56" alt={textOf(a, 'image_alt', lang)} className="h-14 w-14 shrink-0 rounded-xl object-cover md:h-[88px] md:w-[88px]" />
      )}
      <div className="min-w-0 flex-1 py-1">
        <p className="text-[15px] font-extrabold leading-[1.25] md:text-[18px]" style={{ color: 'var(--ks-ink)' }}>{title}</p>
        {body && <p className="mt-0.5 text-[14px] leading-[1.3] md:text-[16px]" style={{ color: 'var(--ks-ink-2)' }}>{body}</p>}
        {small && <p className="mt-1 text-[13px] font-semibold md:text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{small}</p>}
        {link && (external
          ? <a href={link} target="_blank" rel="noopener noreferrer" data-testid="announcement-link" className={linkClass} style={{ color: 'var(--ks-green-dark)' }}>{label}</a>
          : <Link to={link} data-testid="announcement-link" className={linkClass} style={{ color: 'var(--ks-green-dark)' }}>{label}</Link>)}
      </div>
      {onClose && a.dismissible !== false && !preview && (
        <button type="button" data-testid="announcement-close" onClick={onClose} aria-label={t('adm_card_close')}
          className="grid h-12 w-12 shrink-0 place-items-center self-start rounded-full text-[22px] font-bold leading-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ks-green-dark)]" style={{ color: 'var(--ks-ink)' }}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  )
}
