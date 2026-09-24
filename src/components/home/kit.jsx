// Shared homepage-v4 UI kit (Direction B). Built once, used everywhere. Uses the
// design tokens from src/styles/tokens.css. Font sizes follow Phase 1b.
import { useNavigate } from 'react-router-dom'

// ---- Icons (inline SVG, never <img>) ----
export function WhatsAppIcon({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.522 5.836L.057 23.854a.5.5 0 00.609.61l6.249-1.676A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 01-4.953-1.354l-.355-.211-3.679.988.938-3.58-.231-.368A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  )
}
export function PhoneIcon({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
    </svg>
  )
}

// ---- Layout: full-bleed section, 12px gutter ----
export function Section({ children, bg, className = '', id }) {
  return (
    <section id={id} className={`w-full ${className}`} style={{ background: bg, padding: 'var(--ks-gutter)' }}>
      {children}
    </section>
  )
}

// ---- SectionHeader: H2 left + optional "सभी … →" link right ----
export function SectionHeader({ title, linkLabel, onLink }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[24px] font-bold leading-tight md:text-[28px]" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
      {linkLabel && (
        <button type="button" onClick={onLink} className="shrink-0 text-[14px] font-bold" style={{ color: 'var(--ks-green)', minHeight: 0 }}>{linkLabel} →</button>
      )}
    </div>
  )
}

// ---- Button: primary(green) / secondary(orange) / ghost(white+green border) ----
export function Button({ variant = 'primary', giant = false, icon, sublabel, children, onClick, href, target, className = '', ariaLabel }) {
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    borderRadius: giant ? 'var(--ks-radius-lg)' : 'var(--ks-radius)',
    fontWeight: giant ? 800 : 700, fontSize: giant ? '20px' : '17px',
    minHeight: giant ? '64px' : '48px', padding: giant ? '12px 18px' : '10px 18px',
    width: '100%', textDecoration: 'none', cursor: 'pointer', lineHeight: 1.15,
  }
  const variants = {
    primary: { background: 'var(--ks-green)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--ks-orange)', color: '#fff', border: 'none' },
    ghost: { background: '#fff', color: 'var(--ks-green)', border: '1.5px solid var(--ks-green)' },
  }
  const inner = (
    <span className="flex flex-col items-center">
      <span className="flex items-center gap-2">{icon}{children}</span>
      {sublabel && <span className="mt-0.5 text-[13px] font-semibold opacity-90">{sublabel}</span>}
    </span>
  )
  const style = { ...base, ...variants[variant] }
  if (href) return <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} onClick={onClick} aria-label={ariaLabel} style={style} className={className}>{inner}</a>
  return <button type="button" onClick={onClick} aria-label={ariaLabel} style={style} className={className}>{inner}</button>
}

// ---- PhotoTile: photo + flat dark overlay + white label ----
export function PhotoTile({ src, label, sublabel, onClick, height = 150 }) {
  return (
    <button type="button" onClick={onClick} className="relative w-full overflow-hidden text-left" style={{ height, borderRadius: 'var(--ks-radius)', minHeight: 0 }}>
      <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ background: 'var(--ks-green-dark)' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <span className="absolute inset-0" style={{ background: 'rgba(23,51,35,.38)' }} />
      <span className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="block text-[17px] font-800 font-bold leading-tight text-white drop-shadow" style={{ textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{label}</span>
        {sublabel && <span className="block text-[14px] font-semibold text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{sublabel}</span>}
      </span>
    </button>
  )
}

// ---- InfoTile: white card, caption + big value + one-line note in a colour ----
export function InfoTile({ caption, value, note, noteColor = 'var(--ks-ink-3)', onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className="flex flex-1 flex-col text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px', minHeight: 0 }}>
      <span className="text-[14px] font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{caption}</span>
      <span className="mt-0.5 text-[22px] font-800 font-extrabold leading-tight" style={{ color: 'var(--ks-ink)' }}>{value}</span>
      {note && <span className="mt-0.5 text-[14px] font-semibold" style={{ color: noteColor }}>{note}</span>}
    </Comp>
  )
}

// ---- CountChip: big number + label, white pill ----
export function CountChip({ n, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 flex-1 flex-col items-center justify-center" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px 6px', minHeight: 0 }}>
      <span className="text-[26px] font-extrabold leading-none" style={{ color: 'var(--ks-green)' }}>{n}</span>
      <span className="mt-1 text-center text-[14px] font-semibold leading-tight" style={{ color: 'var(--ks-ink-2)' }}>{label}</span>
    </button>
  )
}

// ---- HomeListingCard: photo + badge + title + price + place + WhatsApp/Call ----
export function HomeListingCard({ image, badge, badgeTone = 'offer', title, price, place, waHref, tel }) {
  const navigate = useNavigate()
  const badgeStyle = badgeTone === 'offer'
    ? { background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }
    : badgeTone === 'vendor'
      ? { background: 'var(--ks-vendor)', color: 'var(--ks-vendor-text)' }
      : { background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }
  return (
    <div className="flex flex-col overflow-hidden" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
      <div className="relative w-full" style={{ height: 130, background: 'var(--ks-green-dark)' }}>
        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        {badge && <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[14px] font-bold" style={badgeStyle}>{badge}</span>}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <div className="text-[16px] font-bold leading-tight" style={{ color: 'var(--ks-ink)' }}>{title}</div>
        {price && <div className="mt-0.5 text-[16px] font-extrabold" style={{ color: 'var(--ks-green)' }}>{price}</div>}
        {place && <div className="mt-0.5 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>📍 {place}</div>}
      </div>
      <div className="flex items-stretch gap-1.5 p-2 pt-0">
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} data-testid="card-whatsapp" aria-label="WhatsApp" className="flex flex-1 items-center justify-center gap-1.5 text-[15px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)', borderRadius: '10px', minHeight: '44px' }}>
          <WhatsAppIcon size={18} /> WhatsApp
        </a>
        <a href={tel ? `tel:${tel}` : undefined} onClick={(e) => { e.stopPropagation(); if (!tel) { e.preventDefault(); navigate('/signup') } }} aria-label="Call" className="flex items-center justify-center" style={{ width: 44, height: 44, minHeight: 44, background: 'var(--ks-green)', borderRadius: '10px', color: '#fff', flexShrink: 0 }}>
          <PhoneIcon size={18} />
        </a>
      </div>
    </div>
  )
}
