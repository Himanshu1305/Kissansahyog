// Field scene of the /guide hub (10C): turning sun, swaying wheat, a tractor crossing slowly.
// Inline SVG, CSS motion only. Pauses when off-screen or when the tab is hidden (useLoopActive) and is
// still on prefers-reduced-motion / save-data. data-motion = on | paused | static (tests).
// Batch 10F: the homepage "wide" variant (10D "Morning Field" band) was removed with the band
// (founder: no animation on the homepage for now); the hub is unchanged.
import { memo, useMemo, useRef, useState } from 'react'
import { prefersReducedMotion, saveDataOn } from './timing.js'
import { useLoopActive } from './useLoopActive.js'
import './fieldScene.css'

const isStill = () => saveDataOn() || prefersReducedMotion()

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

export default function FieldScene({ testId = 'guide-scene' }) {
  const ref = useRef(null)
  const active = useLoopActive(ref)
  const [still] = useState(isStill)
  const cls = `ksg-scene${still ? ' ksg-static' : active ? '' : ' ksg-paused'}`
  return (
    <svg
      ref={ref}
      className={cls}
      viewBox="0 0 800 150"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      data-testid={testId}
      data-motion={still ? 'static' : active ? 'on' : 'paused'}
    >
      <HubBody />
    </svg>
  )
}
