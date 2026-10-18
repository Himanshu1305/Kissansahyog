// Field scene: turning sun, swaying wheat, a tractor crossing slowly. Inline SVG, CSS motion only.
// Shared since Batch 10D by:
//   - the /guide hub (10C)            <FieldScene />                  variant "hub"  (800 x 150)
//   - the homepage "Morning Field" band <FieldScene variant="wide" …/> (1200 x 190, clouds, 2 hills, 2 wheat rows)
// Both pause when off-screen or when the tab is hidden (useLoopActive) and are still on
// prefers-reduced-motion / save-data. data-motion = on | paused | static (tests).
// The hub keeps its 10C markup and behaviour exactly. The wide variant reads reduced motion /
// save-data only inside an effect, so its first render is deterministic (prerender = client).
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { prefersReducedMotion, saveDataOn } from './timing.js'
import { useLoopActive } from './useLoopActive.js'
import './fieldScene.css'

const isStill = () => saveDataOn() || prefersReducedMotion()

/** Seeded pseudo-random numbers (the LCG of the approved preview): same seed, same field. */
export function seeded(seed) {
  let r = seed
  return () => {
    r = (r * 9301 + 49297) % 233280
    return r / 233280
  }
}

const r1 = (n) => Math.round(n * 10) / 10

// ── shared pieces ─────────────────────────────────────────────────────────────────────────

function Sun({ cx, cy, className, style }) {
  return (
    <g className={className} style={style}>
      <circle cx={cx} cy={cy} r="26" fill="var(--ks-saffron)" />
      {Array.from({ length: 12 }, (_, a) => <rect key={a} x={cx - 2} y={cy - 38} width="4" height="10" rx="2" fill="var(--ks-saffron)" transform={`rotate(${a * 30} ${cx} ${cy})`} />)}
    </g>
  )
}

function Tractor({ className, transform }) {
  return (
    <g className={className}>
      <g transform={transform}>
        <rect x="14" y="8" width="44" height="22" rx="4" fill="var(--ks-saffron)" />
        <rect x="38" y="-10" width="24" height="22" rx="4" fill="var(--ks-green)" />
        <rect x="52" y="-18" width="4" height="12" fill="var(--ks-ink)" />
        <rect x="2" y="14" width="14" height="10" rx="2" fill="var(--ks-ink)" />
        <g transform="translate(46,30)"><g className="ksg-wheel"><circle r="17" fill="var(--ks-ink)" /><rect x="-2" y="-15" width="4" height="13" fill="var(--ks-saffron)" /></g><circle r="5" fill="var(--ks-saffron)" /></g>
        <g transform="translate(10,36)"><g className="ksg-wheel"><circle r="10" fill="var(--ks-ink)" /><rect x="-1.5" y="-9" width="3" height="8" fill="var(--ks-saffron)" /></g><circle r="3" fill="var(--ks-saffron)" /></g>
      </g>
    </g>
  )
}

// ── hub (10C, unchanged) ──────────────────────────────────────────────────────────────────

const HubBody = memo(function HubBody() {
  const wheat = useMemo(() => {
    const out = []
    for (let x = 4; x < 800; x += 13) out.push({ x, h: 18 + ((x * 7) % 12), d: (x % 9) * 0.4 })
    return out
  }, [])
  return (
    <>
      <Sun cx={480} cy={52} className="ksg-sun" />
      <path d="M0 110 C120 70 220 90 330 100 C460 112 560 70 800 95 V150 H0Z" fill="var(--ks-green-tint)" />
      <g>
        {wheat.map(({ x, h, d }) => (
          <g key={x} className="ksg-st" style={{ animationDelay: `-${d}s` }}>
            <line x1={x} y1="150" x2={x} y2={150 - h} stroke="var(--ks-green)" strokeWidth="2" />
            <ellipse cx={x} cy={150 - h - 4} rx="2.6" ry="6" fill="var(--ks-saffron)" />
          </g>
        ))}
      </g>
      <Tractor className="ksg-trac" transform="translate(0,84)" />
    </>
  )
})

// ── wide (10D homepage band) ──────────────────────────────────────────────────────────────

/** One wheat row as `groups` interleaved groups; each group = one stem path + one ear path, and
 *  sways as a whole (skew about the row's ground line), so ~200 stalks cost only a few nodes. */
export function wheatRow({ base, step, x0, hMin, hMax, seed, groups }, width) {
  const rnd = seeded(seed)
  const g = Array.from({ length: groups }, () => ({ stems: '', ears: '', n: 0 }))
  let i = 0
  for (let x = x0; x < width; x += step, i += 1) {
    const h = r1(hMin + rnd() * (hMax - hMin))
    const top = r1(base - h)
    const o = g[i % groups]
    o.stems += `M${x} ${base}V${top}`
    // Ear: an ellipse rx 2.6, ry 6 centred 3 above the stem top, drawn as two arcs.
    o.ears += `M${x} ${r1(top - 9)}a2.6 6 0 1 0 0 12a2.6 6 0 1 0 0-12z`
    o.n += 1
  }
  return g
}

/** Total stalks a scene config draws (tests / docs). */
export const wheatCount = (scene) => scene.wheat.reduce((s, row) => s + wheatRow(row, scene.w).reduce((a, g) => a + g.n, 0), 0)

const WideBody = memo(function WideBody({ scene }) {
  const { w, h, sun, hills, wheat, tractor, clouds, skyId } = scene
  const rows = useMemo(() => wheat.map((row) => wheatRow(row, w)), [wheat, w])
  const sway = (row, gi) => ({ transformOrigin: `0 ${row.base}px`, animationDelay: `${-r1((gi * row.sway) / row.groups)}s` })
  const renderRow = (ri) => (
    <g>
      {rows[ri].map((g, gi) => (
        <g key={gi} className="ksf-sway" style={sway(wheat[ri], gi)}>
          <path d={g.stems} stroke={wheat[ri].stem} strokeOpacity={wheat[ri].stemOpacity} strokeWidth="1.8" fill="none" />
          <path d={g.ears} fill="var(--ks-saffron)" />
        </g>
      ))}
    </g>
  )
  return (
    <>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ks-blue-tint)" />
          <stop offset="1" stopColor="var(--ks-bg-soft)" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${skyId})`} />
      <Sun cx={sun.cx} cy={sun.cy} className="ksf-sun" style={{ transformOrigin: `${sun.cx}px ${sun.cy}px` }} />
      {clouds.map((c, i) => (
        <g key={i} className={i ? 'ksf-cloud ksf-c2' : 'ksf-cloud'} style={{ animationDelay: `${c.delay}s` }} fill="var(--ks-card)" fillOpacity=".85">
          {c.puffs.map(([cx, cy, rx, ry], j) => <ellipse key={j} cx={cx} cy={cy} rx={rx} ry={ry} />)}
        </g>
      ))}
      {hills.map((hl, i) => <path key={i} d={hl.d} fill="var(--ks-green)" fillOpacity={hl.opacity} />)}
      {renderRow(0)}
      <Tractor className="ksf-trac" transform={`translate(0,${tractor.y}) scale(${tractor.scale})`} />
      {renderRow(1)}
    </>
  )
})

// ── the component ─────────────────────────────────────────────────────────────────────────

export default function FieldScene({ variant = 'hub', scene, testId = 'guide-scene', className }) {
  const wide = variant === 'wide'
  const ref = useRef(null)
  const active = useLoopActive(ref)
  // Hub: read at first render, exactly as in 10C. Wide: false at first render, read in an effect.
  const [still, setStill] = useState(() => (wide ? false : isStill()))
  useEffect(() => {
    if (wide) setStill(isStill())
  }, [wide])

  const base = wide ? `ksf-svg${className ? ` ${className}` : ''}` : 'ksg-scene'
  const cls = `${base}${still ? ' ksg-static' : active ? '' : ' ksg-paused'}`
  return (
    <svg
      ref={ref}
      className={cls}
      viewBox={wide ? `0 0 ${scene.w} ${scene.h}` : '0 0 800 150'}
      preserveAspectRatio={wide ? scene.aspect : 'xMidYMax slice'}
      aria-hidden="true"
      focusable="false"
      data-testid={testId}
      data-motion={still ? 'static' : active ? 'on' : 'paused'}
    >
      {wide ? <WideBody scene={scene} /> : <HubBody />}
    </svg>
  )
}
