// Batch 17F - simple drawn icons for the install steps (inline SVG, no image files).
// Each is 44x44, decorative (the step text next to it says the same thing in words).
const common = { width: 44, height: 44, viewBox: '0 0 44 44', 'aria-hidden': 'true', focusable: 'false' }
const frame = { fill: 'var(--ks-bg-soft)', stroke: 'var(--ks-border)', strokeWidth: 1.5 }
const ink = { stroke: 'var(--ks-green-dark)', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
const dot = { fill: 'var(--ks-green-dark)' }

function Frame({ children }) {
  return (
    <svg {...common}>
      <rect x="1" y="1" width="42" height="42" rx="10" {...frame} />
      {children}
    </svg>
  )
}

const ICONS = {
  // three dots in a column: the browser menu
  dots: () => (<Frame><circle cx="22" cy="12" r="3.2" {...dot} /><circle cx="22" cy="22" r="3.2" {...dot} /><circle cx="22" cy="32" r="3.2" {...dot} /></Frame>),
  // a phone with an arrow going in: "Install app"
  install: () => (<Frame><rect x="13" y="7" width="18" height="30" rx="3.5" {...ink} /><path d="M22 14v11m0 0-4-4m4 4 4-4" {...ink} /><path d="M18 31h8" {...ink} /></Frame>),
  // a tick in a circle: confirm
  confirm: () => (<Frame><circle cx="22" cy="22" r="11" {...ink} /><path d="m17 22.5 3.8 3.8L27.5 18" {...ink} /></Frame>),
  // iPhone share: a square with an arrow up
  share: () => (<Frame><path d="M15 21h-2.5a1.5 1.5 0 0 0-1.5 1.5v11a1.5 1.5 0 0 0 1.5 1.5h19a1.5 1.5 0 0 0 1.5-1.5v-11a1.5 1.5 0 0 0-1.5-1.5H29" {...ink} /><path d="M22 26V9m0 0-5 5m5-5 5 5" {...ink} /></Frame>),
  // a square with a plus: Add to Home Screen
  addhome: () => (<Frame><rect x="9" y="9" width="26" height="26" rx="5" {...ink} /><path d="M22 15v14M15 22h14" {...ink} /></Frame>),
  // a pill with the word "Add"
  add: () => (<Frame><rect x="7" y="14" width="30" height="16" rx="8" fill="var(--ks-green-dark)" /><path d="m15 22.2 3 3 5.5-6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /><rect x="27" y="20.2" width="6" height="3.6" rx="1.8" fill="#fff" /></Frame>),
  // a compass: open in the browser
  browser: () => (<Frame><circle cx="22" cy="22" r="12" {...ink} /><path d="m27.5 16.5-3 8-8 3 3-8z" {...ink} /></Frame>),
}

export default function InstallIcon({ name }) {
  const Icon = ICONS[name] || ICONS.confirm
  return <Icon />
}

// The big green tick of the "installed" message.
export function BigTick() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r="34" fill="var(--ks-green)" />
      <path d="m21 37 10 10 21-22" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
