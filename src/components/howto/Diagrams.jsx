// Inline SVG diagrams for /how-to-use (Batch 7C). No images, no libraries.
//
// Every diagram is drawn on a 320-unit-wide, top-to-bottom canvas, so the same
// drawing fits a 320px phone without horizontal scroll: the page column there is
// ~288px, and the 16-unit labels come out at ~14.4px. On wider screens the figure is
// capped (max-w) so it never balloons. All labels are real <text> in the page font
// (inherited), passed in as props — no Devanagari literal lives in this file.
// Each <svg> is one image for assistive tech: role="img" + <title> + <desc>; the
// same facts are repeated as a normal list under the diagram by the page.
import { useId } from 'react'

const W = 320
const INK = 'var(--ks-ink)'
const GREEN = 'var(--ks-green)'
const GREEN_DARK = 'var(--ks-green-dark)'
const GREEN_TINT = 'var(--ks-green-tint)'
const ORANGE_DARK = 'var(--ks-orange-dark)'
const ORANGE_TINT = 'var(--ks-orange-tint)'
const BORDER = 'var(--ks-border-strong)'
const CARD = 'var(--ks-card)'
const LABEL = 16 // label size in canvas units (≥ 14px on a 320px phone)

// Icons: basic strokes on a 24 × 24 box.
const ICONS = {
  search: <><circle cx="10" cy="10" r="6" /><path d="M15 15l6 6" /></>,
  phone: <path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-3h5L16 7" /></>,
  pin: <><path d="M12 21s-6-6.2-6-11a6 6 0 1 1 12 0c0 4.8-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8" /><path d="M12 17v.2" /></>,
  book: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 13h6" /></>,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  list: <path d="M9 7h10M9 12h10M9 17h10M5 7v.2M5 12v.2M5 17v.2" />,
  tag: <><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8" cy="8" r="1.2" /></>,
  chart: <path d="M4 4v16h16M7 15l4-4 3 3 5-6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></>,
  building: <path d="M3 10l9-6 9 6zM6 20V10M10 20V10M14 20V10M18 20V10M4 20h16" />,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8l6 4-6 4z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>,
  shield: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  'phone-app': <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
}

function Icon({ name, x, y, color = GREEN_DARK, size = 24 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`} style={{ fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      {ICONS[name] || ICONS.check}
    </g>
  )
}

function Label({ x, y, children, color = INK, weight = 700, anchor = 'start', size = LABEL }) {
  return <text x={x} y={y} textAnchor={anchor} style={{ fill: color, fontSize: size, fontWeight: weight }}>{children}</text>
}

// Shared frame: figure + accessible <svg>.
function Frame({ name, height, title, desc, children }) {
  const id = useId()
  return (
    <figure data-testid={`howto-diagram-${name}`} className="mx-auto my-4 w-full max-w-[420px]">
      <svg role="img" aria-labelledby={`${id}-t ${id}-d`} viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: 'block', height: 'auto', fontFamily: 'inherit' }}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{desc}</desc>
        {children}
      </svg>
    </figure>
  )
}

// Numbered top-to-bottom flow. steps: [{ icon, lines: [string, string?] }].
export function StepFlowDiagram({ name, title, desc, steps }) {
  const ROW = 64
  const GAP = 20
  const height = 4 + steps.length * ROW + (steps.length - 1) * GAP + 4
  return (
    <Frame name={name} height={height} title={title} desc={desc}>
      {steps.map((step, i) => {
        const y = 4 + i * (ROW + GAP)
        const cy = y + ROW / 2
        const last = i === steps.length - 1
        return (
          <g key={i}>
            <rect x="2" y={y} width={W - 4} height={ROW} rx="14" style={{ fill: last ? GREEN_TINT : CARD, stroke: last ? GREEN : BORDER, strokeWidth: 1.5 }} />
            <circle cx="34" cy={cy} r="17" style={{ fill: GREEN }} />
            <Label x={34} y={cy + 6} color="#fff" anchor="middle" size={17}>{i + 1}</Label>
            {step.lines.length === 1
              ? <Label x={62} y={cy + 6}>{step.lines[0]}</Label>
              : <>
                  <Label x={62} y={cy - 5}>{step.lines[0]}</Label>
                  <Label x={62} y={cy + 18} weight={500} color="var(--ks-ink-2)">{step.lines[1]}</Label>
                </>}
            <Icon name={step.icon} x={W - 40} y={cy - 12} />
            {!last && <path d={`M34 ${y + ROW + 3}v${GAP - 8}m-5 -5l5 5 5 -5`} style={{ fill: 'none', stroke: GREEN, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />}
          </g>
        )
      })}
    </Frame>
  )
}

// Services map: a hub on top, a trunk down the middle, two tiles per row.
export function ServicesDiagram({ title, desc, hub, items }) {
  const TILE_W = 150
  const TILE_H = 78
  const GAP = 12
  const TOP = 64
  const rows = Math.ceil(items.length / 2)
  const height = TOP + rows * TILE_H + (rows - 1) * GAP + 4
  const lastCy = TOP + (rows - 1) * (TILE_H + GAP) + TILE_H / 2
  return (
    <Frame name="services" height={height} title={title} desc={desc}>
      <path d={`M${W / 2} 48V${lastCy}`} style={{ stroke: GREEN, strokeWidth: 2 }} />
      <rect x="62" y="4" width={W - 124} height="44" rx="22" style={{ fill: GREEN }} />
      <Label x={W / 2} y={32} color="#fff" anchor="middle" size={17}>{hub}</Label>
      {items.map((item, i) => {
        const left = i % 2 === 0
        const x = left ? 2 : W - 2 - TILE_W
        const y = TOP + Math.floor(i / 2) * (TILE_H + GAP)
        const cx = x + TILE_W / 2
        return (
          <g key={i}>
            <path d={`M${W / 2} ${y + TILE_H / 2}H${left ? x + TILE_W : x}`} style={{ stroke: GREEN, strokeWidth: 2 }} />
            <rect x={x} y={y} width={TILE_W} height={TILE_H} rx="14" style={{ fill: CARD, stroke: BORDER, strokeWidth: 1.5 }} />
            <circle cx={cx} cy={y + 26} r="18" style={{ fill: GREEN_TINT }} />
            <Icon name={item.icon} x={cx - 12} y={y + 14} />
            <Label x={cx} y={y + 66} anchor="middle">{item.label}</Label>
          </g>
        )
      })}
    </Frame>
  )
}

// Two stacked panels: open to everyone / after login.
export function CompareDiagram({ title, desc, openTitle, openLines, loginTitle, loginLines }) {
  const HEAD = 44
  const LINE = 34
  const panelH = (n) => HEAD + n * LINE + 12
  const y2 = 2 + panelH(openLines.length) + 16
  const height = y2 + panelH(loginLines.length) + 2
  const panel = (y, head, lines, icon, strong, tint) => (
    <g>
      <rect x="2" y={y} width={W - 4} height={panelH(lines.length)} rx="14" style={{ fill: tint, stroke: strong, strokeWidth: 1.5 }} />
      <path d={`M2 ${y + HEAD}V${y + 14}a14 14 0 0 1 14-14H${W - 16}a14 14 0 0 1 14 14V${y + HEAD}z`} style={{ fill: strong }} />
      <Icon name={icon} x={14} y={y + 10} color="#fff" />
      <Label x={48} y={y + 28} color="#fff" size={17}>{head}</Label>
      {lines.map((line, i) => (
        <g key={i}>
          <Icon name="check" x={14} y={y + HEAD + 8 + i * LINE} color={strong} size={22} />
          <Label x={46} y={y + HEAD + 26 + i * LINE} weight={600}>{line}</Label>
        </g>
      ))}
    </g>
  )
  return (
    <Frame name="access" height={height} title={title} desc={desc}>
      {panel(2, openTitle, openLines, 'eye', GREEN, GREEN_TINT)}
      {panel(y2, loginTitle, loginLines, 'lock', ORANGE_DARK, ORANGE_TINT)}
    </Frame>
  )
}
