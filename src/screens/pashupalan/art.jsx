// Batch 19-B - original flat illustrations (inline SVG, made for this site; no stock art, no known characters).
// Each is decorative: aria-hidden, under 6 kB. Colours are fixed warm tones that pass on the pale hero background.
const G = '#2f7d4a'; const GD = '#1f5a34'; const CREAM = '#fff6e3'; const SUN = '#f4b942'; const BROWN = '#8a5a2b'; const SOIL = '#c98f4f'; const SKY = '#dff0e4'

const Frame = ({ children, className }) => (
  <svg viewBox="0 0 160 120" role="presentation" aria-hidden="true" focusable="false" className={className}>
    <rect width="160" height="120" rx="18" fill={SKY} />
    <circle cx="128" cy="26" r="13" fill={SUN} />
    <path d="M0 96 Q40 84 80 94 T160 90 V120 H0Z" fill="#9fcf9b" />
    <path d="M0 106 Q50 98 100 106 T160 104 V120 H0Z" fill={G} />
    {children}
  </svg>
)

const CowBody = ({ x = 0, y = 0, s = 1, fill = CREAM, spot = BROWN }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="68" cy="72" rx="34" ry="19" fill={fill} stroke={GD} strokeWidth="2" />
    <ellipse cx="58" cy="68" rx="9" ry="6" fill={spot} />
    <ellipse cx="80" cy="77" rx="7" ry="5" fill={spot} />
    <rect x="42" y="84" width="7" height="19" rx="3" fill={fill} stroke={GD} strokeWidth="2" />
    <rect x="58" y="86" width="7" height="17" rx="3" fill={fill} stroke={GD} strokeWidth="2" />
    <rect x="76" y="86" width="7" height="17" rx="3" fill={fill} stroke={GD} strokeWidth="2" />
    <rect x="90" y="84" width="7" height="19" rx="3" fill={fill} stroke={GD} strokeWidth="2" />
    <path d="M100 66 Q112 62 111 78" fill="none" stroke={GD} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M36 62 Q26 52 24 62 Q22 74 34 76Z" fill={fill} stroke={GD} strokeWidth="2" />
    <ellipse cx="23" cy="66" rx="9" ry="10" fill={fill} stroke={GD} strokeWidth="2" />
    <ellipse cx="19" cy="70" rx="5" ry="4" fill="#f2b7a6" />
    <circle cx="21" cy="62" r="1.8" fill={GD} />
    <path d="M17 54 Q13 46 19 47 M29 54 Q33 46 27 47" fill="none" stroke={BROWN} strokeWidth="3" strokeLinecap="round" />
  </g>
)

const ART = {
  cow: (p) => (<Frame {...p}><CowBody x="14" y="-2" /><path d="M24 100 q4 -8 8 0 M124 98 q4 -8 8 0" stroke={GD} strokeWidth="2" fill="none" /></Frame>),
  calf: (p) => (<Frame {...p}><CowBody x="6" y="4" s="0.78" /><CowBody x="64" y="14" s="0.55" fill="#f7dcb4" spot="#b97b3d" /></Frame>),
  hub: (p) => (<Frame {...p}><CowBody x="0" y="2" s="0.8" /><g transform="translate(88 40)"><path d="M16 56 V22" stroke={GD} strokeWidth="3" /><path d="M16 36 q-14 -2 -14 -16 q14 0 14 16z M16 30 q14 -2 14 -16 q-14 0 -14 16z" fill={G} /><circle cx="46" cy="52" r="9" fill={SUN} stroke={BROWN} strokeWidth="2" /><path d="M42 52 h8 M46 48 v8" stroke={BROWN} strokeWidth="2" /></g></Frame>),
  milkcan: (p) => (<Frame {...p}><g transform="translate(46 22)"><path d="M18 8 h36 l4 12 H14z" fill="#d7dde2" stroke={GD} strokeWidth="2" /><rect x="12" y="20" width="48" height="52" rx="8" fill="#eef2f4" stroke={GD} strokeWidth="2" /><rect x="12" y="34" width="48" height="8" fill={G} /><path d="M60 30 q16 4 12 22" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" /><path d="M24 4 q12 -8 24 0" fill="none" stroke={GD} strokeWidth="2.4" /></g><ellipse cx="116" cy="90" rx="14" ry="5" fill={CREAM} stroke={GD} strokeWidth="2" /></Frame>),
  fodder: (p) => (<Frame {...p}><g transform="translate(26 36)"><path d="M10 64 q4 -34 -2 -48 M26 64 q-2 -36 6 -52 M42 64 q2 -26 -6 -40 M58 64 q-4 -28 4 -44" stroke={G} strokeWidth="4" strokeLinecap="round" fill="none" /><path d="M8 16 l-6 -8 M32 12 l6 -9 M36 24 l-8 -6 M62 20 l6 -8" stroke={GD} strokeWidth="3" strokeLinecap="round" /></g><g transform="translate(92 56)"><rect x="0" y="14" width="46" height="28" rx="6" fill={SOIL} stroke={BROWN} strokeWidth="2" /><path d="M6 20 h34 M6 28 h34 M6 36 h34" stroke={BROWN} strokeWidth="2" /></g></Frame>),
  rupee: (p) => (<Frame {...p}><g transform="translate(44 18)"><circle cx="36" cy="44" r="32" fill={SUN} stroke={BROWN} strokeWidth="3" /><path d="M22 28 h28 M22 38 h28 M26 28 q22 0 22 12 q0 10 -22 10 l24 18" fill="none" stroke={BROWN} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></g><path d="M118 92 q10 -22 22 -26 q-2 20 -22 26z M118 92 q-14 -14 -22 -12 q6 14 22 12z" fill={G} /></Frame>),
  gaushala: (p) => (<Frame {...p}><g transform="translate(34 34)"><path d="M0 26 L46 0 L92 26" fill="#c45a3a" stroke={GD} strokeWidth="2.4" strokeLinejoin="round" /><rect x="8" y="26" width="76" height="44" fill={CREAM} stroke={GD} strokeWidth="2.4" /><rect x="34" y="40" width="24" height="30" fill={BROWN} /><rect x="14" y="36" width="14" height="14" fill="#cfe7f4" stroke={GD} strokeWidth="1.6" /><rect x="64" y="36" width="14" height="14" fill="#cfe7f4" stroke={GD} strokeWidth="1.6" /></g><path d="M20 98 h120" stroke={BROWN} strokeWidth="3" /></Frame>),
}

export function Art({ name, className = '' }) {
  const C = ART[name] || ART.cow
  return <C className={className} />
}
