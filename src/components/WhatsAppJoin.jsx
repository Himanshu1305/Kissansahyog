import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useWhatsAppChannel } from '../lib/whatsapp/whatsappApi'
import WhatsAppQR from './WhatsAppQR'

// Gated WhatsApp-join surfaces. ALL render null until an admin sets
// whatsapp_channel_url in site_settings (§13.2). The link always points at
// /join?src=<src> so the click is attributed + logged before redirecting.
//   variant: 'banner' (homepage), 'box' (contextual), 'link' (nav/footer)
export default function WhatsAppJoin({ variant = 'box', src = 'unknown', className = '' }) {
  const { t } = useLang()
  const url = useWhatsAppChannel()
  if (!url) return null
  const to = `/join?src=${encodeURIComponent(src)}`

  if (variant === 'link') {
    return (
      <Link to={to} className={`inline-flex items-center gap-1.5 font-semibold text-green-700 hover:underline ${className}`}>
        <span aria-hidden>🟢</span> {t('wa_join_nav')}
      </Link>
    )
  }

  if (variant === 'banner') {
    return (
      <section className={`w-full ${className}`} style={{ background: 'var(--ks-green-tint)', borderTop: '2px solid var(--ks-green)', borderBottom: '2px solid var(--ks-green)', padding: '14px var(--ks-gutter)' }}>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[16px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>🟢 {t('wa_join_title')}</p>
            <p className="text-[14px] font-semibold text-stone-700">{t('wa_join_sub')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block"><WhatsAppQR value={url} size={96} /></div>
            <Link to={to} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800">{t('wa_join_cta')} →</Link>
          </div>
        </div>
      </section>
    )
  }

  // 'box'
  return (
    <div className={`my-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block"><WhatsAppQR value={url} size={72} /></span>
        <p className="text-sm font-bold text-green-900">🟢 {t('wa_join_box')}</p>
      </div>
      <Link to={to} className="shrink-0 rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white hover:bg-green-800">{t('wa_join_cta')}</Link>
    </div>
  )
}
