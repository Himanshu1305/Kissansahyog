// Batch 10D — homepage hero "Kisan Studio" (design A "Live Studio").
//
// First render (prerender + first client render) is fully deterministic: persona 1 at tick 0,
// the static poster. window / matchMedia / IntersectionObserver / navigator are touched only
// inside effects (and inside the 10C useLoopActive hook's effects).
// After the page is idle the live engine (LiveStage.jsx, its own chunk) loads and swaps in with
// the same box sizes. ONE timer (in LiveStage) drives the one reducer here; the hero pauses when
// it is off-screen or the tab is hidden (useLoopActive from 10C), CSS loops pause with it.
// prefers-reduced-motion / save-data: no timer, every persona fully drawn, tabs still switch.
// Sizes: heroLive.config.js (CSS variables). Text: strings.js (home_live_*). Colours: --ks-*.
import { memo, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { useLoopActive } from '../guide/useLoopActive.js'
import { prefersReducedMotion, saveDataOn } from '../guide/timing.js'
import { Sprout } from '../guide/icons.jsx'
import { HERO_CSS_VARS, HERO_TIMING as T } from './heroLive.config.js'
import { HERO_INITIAL, heroEnded, heroReducer, keyTarget, timeLeft } from './heroLive.logic.js'
import { PERSONAS, RENT_SCREEN } from './personas.js'
import { Screen } from './Screen.jsx'
import '../guide/phone.css'
import './homeLive.css'

const PANEL_ID = 'khl-panel'
const tabId = (i) => `khl-tab-${PERSONAS[i].id}`

// ── Static parts (memoised: a tick never re-renders them) ────────────────────────────────

const Intro = memo(function Intro({ t, showFreeReg, badge }) {
  return (
    <>
      <div>
        <span className="inline-block rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }}>
          🌾 {t('tf_eyebrow')}
        </span>
        {/* The free-registration badge (Batch 7D; drawn by Homepage.jsx), logged-out visitors only. */}
        {showFreeReg && badge}
      </div>
      <h1 className="khl-h1">{t('tf_title')}</h1>
      <p className="khl-lead">{t('tf_subline')}</p>
    </>
  )
})

const Ctas = memo(function Ctas({ t, isLoggedIn }) {
  return (
    <div className="khl-ctas">
      {/* Logged-in visitors are sent away from /signup, so they get the app's "Post" instead. */}
      <Link to={isLoggedIn ? '/post' : '/signup'} className="khl-cta khl-cta-p" data-testid="home-live-register">
        {isLoggedIn ? t('tab_post') : t('home_live_cta_register')}
      </Link>
      <Link to="/guide" className="khl-cta khl-cta-s" data-testid="home-live-demo">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        {t('home_live_cta_demo')}
      </Link>
    </div>
  )
})

// The five captions are stacked in one grid cell: the bubble keeps the height of the longest,
// so a persona change never moves anything below it.
const Bubble = memo(function Bubble({ t, idx, anim }) {
  return (
    <div className="khl-say">
      <span className="ksg-av khl-ava" aria-hidden="true"><Sprout /></span>
      <p className="khl-bubble" data-testid="home-live-caption">
        <span className="sr-only">{t('home_live_sr_example')} </span>
        {PERSONAS.map((p, i) => (
          <span key={p.id} className={i === idx ? (anim ? 'khl-cap on khl-anim' : 'khl-cap on') : 'khl-cap'}>{t(p.cap)}</span>
        ))}
      </p>
    </div>
  )
})

// ── Tabs ─────────────────────────────────────────────────────────────────────────────────

function Tabs({ t, idx, left, onPick }) {
  const rowRef = useRef(null)
  const btnRefs = useRef([])

  // Phones: the row scrolls sideways; keep the active tab in view by scrolling the ROW only
  // (never the page: rotation can happen while the visitor reads lower down).
  useEffect(() => {
    const row = rowRef.current
    const btn = btnRefs.current[idx]
    if (!row || !btn || row.scrollWidth <= row.clientWidth + 1) return
    const l = btn.offsetLeft // the row is position: relative
    const r = l + btn.offsetWidth
    if (l >= row.scrollLeft && r <= row.scrollLeft + row.clientWidth) return
    const target = Math.max(0, l - (row.clientWidth - btn.offsetWidth) / 2)
    row.scrollTo({ left: target, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [idx])

  const onKeyDown = (e) => {
    const next = keyTarget(e.key, idx)
    if (next < 0) return
    e.preventDefault()
    onPick(next)
    btnRefs.current[next]?.focus()
  }

  return (
    <div ref={rowRef} role="tablist" aria-label={t('home_live_tabs_label')} className="khl-tabs" onKeyDown={onKeyDown} data-testid="home-live-tabs">
      {PERSONAS.map((p, i) => {
        const on = i === idx
        return (
          <button
            key={p.id}
            ref={(el) => { btnRefs.current[i] = el }}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={PANEL_ID}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(i)}
            data-testid={`home-live-tab-${p.id}`}
            className="khl-tab"
            style={on ? { '--p': left } : undefined}
          >
            {t(p.tab)}
            <span aria-hidden="true" className="khl-tab-bar" />
          </button>
        )
      })}
    </div>
  )
}

// ── The hero ─────────────────────────────────────────────────────────────────────────────

export default function HomeLiveHero({ showFreeReg, isLoggedIn, badge, children }) {
  const { t } = useLang()
  const [s, dispatch] = useReducer(heroReducer, HERO_INITIAL)
  // 'poster' (first render, no effects yet) → 'live' or 'static' (reduced motion / save-data).
  const [mode, setMode] = useState('poster')
  const [Live, setLive] = useState(null)
  const stageRef = useRef(null)
  const loadRef = useRef(null)
  // Off-screen = the phone panel is out of view (the tiles below it do not keep it running).
  const active = useLoopActive(stageRef)

  useEffect(() => {
    // The prerenderer snapshots the poster: no engine, no timer (scripts/prerender.mjs).
    if (window.__KS_PRERENDER) return undefined
    setMode(prefersReducedMotion() || saveDataOn() ? 'static' : 'live')
    let started = false
    const load = () => {
      if (started) return
      started = true
      import('./LiveStage.jsx').then((m) => setLive(() => m.default)).catch(() => { started = false })
    }
    loadRef.current = load
    let idleId, timer
    if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(load, { timeout: T.idleTimeoutMs })
    else timer = window.setTimeout(load, T.idleFallbackMs)
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  const onPick = useCallback((i) => {
    loadRef.current?.() // a tap before the engine arrived: load it now
    dispatch({ type: 'pick', idx: i })
  }, [])

  const isStatic = mode === 'static'
  const ended = heroEnded(s)
  const running = !!Live && mode === 'live' && active && !ended
  const loops = !!Live && mode === 'live' && active
  const motion = isStatic ? 'static' : running ? 'on' : Live && mode === 'live' && ended ? 'ended' : 'paused'
  // Static: every persona fully drawn. Otherwise the reducer's tick.
  const k = isStatic ? T.cycleTicks : s.tick
  const auto = !isStatic && s.auto
  const cls = `khl${isStatic ? ' khl-static' : loops ? '' : ' khl-paused'}`

  return (
    <section
      className={cls}
      style={HERO_CSS_VARS}
      data-testid="home-live"
      data-persona={PERSONAS[s.idx].id}
      data-tick={k}
      data-auto={auto ? 'on' : 'off'}
      data-motion={motion}
      data-rot={s.rot}
      data-live={Live ? '1' : '0'}
    >
      <div className="khl-in">
        <div className="khl-text">
          <Intro t={t} showFreeReg={showFreeReg} badge={badge} />
          <Tabs t={t} idx={s.idx} left={timeLeft(s.tick)} onPick={onPick} />
          <Ctas t={t} isLoggedIn={isLoggedIn} />
        </div>

        <div ref={stageRef} id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(s.idx)} tabIndex={0} className="khl-stage" data-testid="home-live-stage">
          <div className="ksg-phone khl-phone" aria-hidden="true">
            <div className="ksg-screen khl-screen">
              {Live
                ? <Live idx={s.idx} k={k} running={running} dispatch={dispatch} t={t} />
                : <Screen screen={s.idx === 0 ? RENT_SCREEN : null} k={k} t={t} />}
            </div>
          </div>
          {/* The caption fades in on a persona change only (never on the first paint). */}
          <Bubble t={t} idx={s.idx} anim={s.idx !== 0 || s.rot > 0} />
        </div>

        {/* The existing hero tiles and the "I need / I have" buttons (unchanged). */}
        <div className="khl-more">{children}</div>
      </div>
    </section>
  )
}
