// Batch 10D — draws one persona screen of the homepage live hero at tick k.
// Pure render (no effects, no window): the same component draws the static poster (persona 1,
// tick 0) in the first paint and every frame of the lazy live engine, so the swap from poster
// to live never changes a box size. Elements that are not "on" yet are transparent but keep
// their space (opacity / transform only).
import { memo, useMemo } from 'react'
import { graphemes, txt, typedAt } from './heroLive.logic.js'

const reveal = (cls, at, k) => `${cls} khl-r${k >= at ? ' on' : ''}`

const SearchIcon = () => (
  <svg className="khl-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M16 16l5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
)

// Weather codes as in the 10C tour: 0 clear (the sun turns), 2/3 cloud, 61 rain.
export function WeatherIcon({ code }) {
  if (code === 0) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g className="khl-sunr">
          <circle cx="12" cy="12" r="5" fill="var(--ks-saffron)" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2" stroke="var(--ks-saffron)" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {code === 2 && <circle cx="8" cy="9" r="4" fill="var(--ks-saffron)" />}
      <ellipse cx="13" cy="13" rx="8" ry="4.5" fill="#b9c8d2" />
      <ellipse cx="10" cy="10.5" rx="4.5" ry="4" fill="#cfdae2" />
      {code === 61 && <path d="M9 19l-1 3M13 19l-1 3M17 19l-1 3" stroke="var(--ks-blue)" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}

function Node({ n, k, t, g, today }) {
  switch (n.k) {
    case 'sub':
      return <p className="khl-sub">{txt(t, n.text)}</p>
    case 'inp': {
      const { text, caret } = typedAt(g, n.at, n.end, k)
      return (
        <div className="khl-inp">
          {n.search && <SearchIcon />}
          <span className={caret ? 'khl-caret' : undefined}>{text}</span>
        </div>
      )
    }
    case 'chips':
      return (
        <div className="khl-chips">
          {n.items.map((it, j) => <b key={j} className={reveal('', n.at + j * n.step, k)}>{txt(t, it)}</b>)}
        </div>
      )
    case 'lc':
      return (
        <div className={reveal('khl-lc', n.at, k)}>
          <i className={n.tone === 'b' ? 'khl-th khl-th-b' : 'khl-th'} />
          <div><strong>{txt(t, n.title)}</strong><small>{txt(t, n.sub)}</small></div>
        </div>
      )
    case 'btn':
      return <div className={reveal(n.pulse ? 'khl-btn khl-pulse' : 'khl-btn', n.at, k)}>{txt(t, n.text)}</div>
    case 'photo':
      return <div className={reveal('khl-photo', n.at, k)}>{txt(t, n.text)}</div>
    case 'done':
      return <div className={reveal('khl-done', n.at, k)}>{txt(t, n.text)}</div>
    case 'bars':
      return n.rows.map(([label, value, w], j) => (
        <div key={j} className={reveal('khl-bar', n.at + j * n.step, k)} style={{ '--w': w }}>
          <b>{txt(t, label)}</b><span className="khl-tr"><i /></span><em>{txt(t, value)}</em>
        </div>
      ))
    case 'big':
      return (
        <div className={reveal('khl-big', n.at, k)}>
          <WeatherIcon code={n.code} />
          <span><b>{n.temp}°</b><small>{t(`wcode_${n.code}`)}</small></span>
        </div>
      )
    case 'week':
      return (
        <div className="khl-wk">
          {n.days.map(([temp, code], j) => (
            <div key={j} className={reveal('', n.at + j * n.step, k)}>
              <small>{t(`wday_${((today ?? 0) + j) % 7}`)}</small>
              <WeatherIcon code={code} />
              <b>{temp}°</b>
            </div>
          ))}
        </div>
      )
    case 'card':
      return (
        <div className={reveal(n.slide ? 'khl-card khl-sx' : 'khl-card', n.at, k)}>
          <strong>{txt(t, n.title)}</strong><small>{txt(t, n.sub)}</small>
        </div>
      )
    case 'note':
      return <p className={reveal('khl-note', n.at, k)}>{txt(t, n.text)}</p>
    default:
      return null
  }
}

/** One phone screen. `screen` null = the frame only (the live engine is still loading). */
export const Screen = memo(function Screen({ screen, k, t, today }) {
  // Header split and the graphemes of every typed text: once per screen and language.
  const { head, body, typed } = useMemo(() => {
    const nodes = screen ? screen.nodes : []
    const h = nodes[0]?.k === 'h' ? nodes[0] : null
    const b = h ? nodes.slice(1) : nodes
    return { head: h, body: b, typed: b.map((n) => (n.k === 'inp' ? graphemes(txt(t, n.type)) : null)) }
  }, [screen, t])
  return (
    <div className="khl-scr" data-screen={screen ? screen.id : ''}>
      <div className="khl-hd">
        <span className="khl-sh">{head ? txt(t, head.text) : ''}</span>
        <span className="khl-tag">{t('home_live_example')}</span>
      </div>
      {body.map((n, i) => <Node key={i} n={n} k={k} t={t} g={typed[i]} today={today} />)}
    </div>
  )
})
