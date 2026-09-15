import { CATEGORY_META } from '../lib/listings/catalog'

// Category glyph. Drone Didi uses a multi-rotor (quadcopter) drone SVG — NOT a
// helicopter — drawn in currentColor so it inherits the surrounding text colour
// and font-size (h/w = 1em). Every other category renders its emoji.
export function CatIcon({ category, className = '' }) {
  if (category === 'drone_didi') {
    return (
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        className={`inline-block h-[1em] w-[1em] align-[-0.125em] ${className}`}
      >
        <circle cx="5" cy="5" r="3" /><circle cx="19" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" />
        <path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      </svg>
    )
  }
  const emoji = category === 'experts' ? '👨‍🌾' : CATEGORY_META[category]?.icon || ''
  return <span className={className} aria-hidden="true">{emoji}</span>
}
