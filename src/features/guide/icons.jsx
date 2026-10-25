// Inline SVG icons for the guide (no image files). All decorative (aria-hidden).
const P = { 'aria-hidden': true, focusable: 'false' }

export const Sprout = (props) => (
  <svg viewBox="0 0 32 32" {...P} {...props}>
    <path d="M16 29V14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M16 17C8 17 5.5 11 5.5 6.5 13 6.5 16 11 16 17Z" fill="currentColor" />
    <path d="M16 14C16 8.5 19 4 26.5 4 26.5 9.5 23 14 16 14Z" fill="currentColor" />
  </svg>
)
export const PlayIcon = () => <svg className="ksg-ic" viewBox="0 0 24 24" {...P}><path d="M7 4.5v15l13-7.5z" /></svg>
export const PauseIcon = () => <svg className="ksg-ic" viewBox="0 0 24 24" {...P}><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z" /></svg>
export const RedoIcon = () => <svg className="ksg-ic" viewBox="0 0 24 24" {...P}><path d="M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z" /></svg>
export const SpeakerIcon = () => (
  <svg className="ksg-ic" viewBox="0 0 24 24" {...P}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// Hub card pictures (static: only the hero scene loops).
export function CardIcon({ id }) {
  if (id === 'register') return (
    <svg viewBox="0 0 52 52" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...P}>
      <circle cx="26" cy="17" r="8" stroke="var(--ks-green)" />
      <path d="M10 44c1-9 8-14 16-14s15 5 16 14" stroke="var(--ks-green)" />
      <path d="M18 40l6 6 11-12" stroke="var(--ks-saffron)" />
    </svg>
  )
  if (id === 'post') return (
    <svg viewBox="0 0 52 52" fill="none" {...P}>
      <path d="M26 46V22" stroke="var(--ks-green)" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 28C16 28 12 21 12 14c9 0 14 6 14 14Z" fill="var(--ks-green)" />
      <path d="M26 24c0-8 4-13 14-13 0 8-5 13-14 13Z" fill="var(--ks-saffron)" />
    </svg>
  )
  if (id === 'find') return (
    <svg viewBox="0 0 52 52" fill="none" {...P}>
      <rect x="8" y="8" width="26" height="36" rx="6" stroke="var(--ks-green)" strokeWidth="3.5" />
      <path d="M14 18h14M14 25h14M14 32h8" stroke="var(--ks-green)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="34" cy="31" r="8" fill="var(--ks-saffron-tint)" stroke="var(--ks-saffron)" strokeWidth="4" />
      <path d="M40 37l7 7" stroke="var(--ks-saffron)" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
  return (
    <svg viewBox="0 0 52 52" fill="none" {...P}>
      <circle cx="26" cy="26" r="9" fill="var(--ks-saffron)" />
      <path d="M26 6v6M26 40v6M6 26h6M40 26h6M12 12l4 4M36 36l4 4M40 12l-4 4M16 36l-4 4" stroke="var(--ks-saffron)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
