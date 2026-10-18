// Batch 10D C — "Morning Field": the band directly under the homepage hero.
//   1. the field scene (shared 10C FieldScene, wide variant), decorative, with a short sr-only line;
//   2. a slow crop strip (decorative, aria-hidden, no numbers);
//   3. a facts row: numbers counted from repo data at build time (homeFacts.js), counting up once
//      when it scrolls into view;
//   4. a gentle rise-and-fade for the homepage sections that come after this band and start
//      below the first screen (one IntersectionObserver).
// First render is deterministic (prerender = first client render): final numbers, everything
// visible, motion "on". window / matchMedia / IntersectionObserver / navigator are touched only
// inside effects. Prerender (window.__KS_PRERENDER), prefers-reduced-motion and save-data: no
// count-up, no reveal, static band and strip. Sizes and timings: homeField.config.js.
import { memo, useEffect, useRef, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { strings } from '../../lib/i18n/strings'
import FieldScene from '../guide/FieldScene.jsx'
import { useLoopActive } from '../guide/useLoopActive.js'
import { dur, prefersReducedMotion, saveDataOn } from '../guide/timing.js'
import { FIELD_CSS_VARS, FIELD_MOTION, FIELD_SCENE } from './homeField.config.js'
import { HOME_FACTS } from './homeFacts.js'
import './homeField.css'

const CROPS = ['wheat', 'soybean', 'gram', 'maize', 'mustard', 'lentil', 'onion', 'potato']
// Two lists per half, two halves: translating the row by -50% loops without a seam, and one half
// is wider than a 1440 px screen.
const STRIP = [...CROPS, ...CROPS, ...CROPS, ...CROPS]

const stillNow = () => prefersReducedMotion() || saveDataOn()
// Count-up and reveal only for a real visitor whose browser can tell what is on screen.
const enhanceOff = () => !!window.__KS_PRERENDER || stillNow() || typeof IntersectionObserver === 'undefined'

// ── crop strip ────────────────────────────────────────────────────────────────────────────

const CropStrip = memo(function CropStrip() {
  const ref = useRef(null)
  const active = useLoopActive(ref)
  const [still, setStill] = useState(false)
  useEffect(() => { setStill(stillNow()) }, [])
  return (
    <div
      ref={ref}
      className={`ksf-crops${still ? ' ksg-static' : active ? '' : ' ksg-paused'}`}
      aria-hidden="true"
      data-testid="home-crops"
      data-motion={still ? 'static' : active ? 'on' : 'paused'}
    >
      <div className="ksf-crops-row">
        {STRIP.map((k, i) => {
          const s = strings[`home_crops_${k}`]
          return <span key={i}>{s.hi} <i>{s.en}</i></span>
        })}
      </div>
    </div>
  )
})

// ── facts ─────────────────────────────────────────────────────────────────────────────────

function Facts({ t }) {
  const ref = useRef(null)
  // null = the final numbers (prerender, no JS, reduced motion, already on screen); else 0…1.
  const [p, setP] = useState(null)
  const [state, setState] = useState('final')

  useEffect(() => {
    const el = ref.current
    if (!el || enhanceOff()) return undefined
    // Already on screen: never swap a number someone may be reading.
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined
    setP(0)
    setState('armed')
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      setState('counting')
      const t0 = performance.now()
      const ms = dur(FIELD_MOTION.countUpMs)
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms)
        if (k < 1) {
          setP(1 - (1 - k) ** 3)
          raf = requestAnimationFrame(step)
        } else {
          setP(null)
          setState('done')
        }
      }
      raf = requestAnimationFrame(step)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <ul ref={ref} className="ksf-facts" aria-label={t('home_facts_label')} data-testid="home-facts" data-count={state}>
      {HOME_FACTS.map((f) => (
        <li key={f.id} className="ksf-fact" data-testid={`home-fact-${f.id}`} data-value={f.n}>
          <b className="ksf-fact-n" aria-hidden="true" data-testid="home-fact-num">{p == null ? f.n : Math.round(f.n * p)}</b>
          <span className="ksf-fact-l"><span className="sr-only">{f.n} </span>{t(f.label)}</span>
        </li>
      ))}
    </ul>
  )
}

// ── section reveal ────────────────────────────────────────────────────────────────────────

/** The homepage blocks after `startRef` that start below the first screen rise and fade in once
 *  when they scroll into view. Visible in the HTML; only hidden here, after hydration, and only
 *  while off-screen. Blocks that appear later (data) are left alone. */
function useSectionReveal(startRef) {
  useEffect(() => {
    const start = startRef.current
    if (!start || enhanceOff()) return undefined
    const fold = window.innerHeight
    const els = []
    for (let el = start.nextElementSibling; el; el = el.nextElementSibling) {
      if (el.getBoundingClientRect().top > fold) els.push(el)
    }
    if (!els.length) return undefined
    const show = (el) => {
      el.classList.add('ksr-in')
      el.classList.remove('ksr-pre')
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target)
          show(e.target)
        }
      }
    })
    const { rise, ms } = FIELD_MOTION.reveal
    for (const el of els) {
      el.style.setProperty('--ksr-rise', `${rise}px`)
      el.style.setProperty('--ksr-ms', `${ms}ms`)
      el.classList.add('ksr-pre')
      io.observe(el)
    }
    return () => {
      io.disconnect()
      els.forEach(show)
    }
  }, [startRef])
}

// ── the band ──────────────────────────────────────────────────────────────────────────────

function HomeField() {
  const { t } = useLang()
  const ref = useRef(null)
  useSectionReveal(ref)
  return (
    <div ref={ref} className="ksf-wrap" style={FIELD_CSS_VARS} data-testid="home-band">
      <div className="ksf">
        <FieldScene variant="wide" scene={FIELD_SCENE} testId="home-field" />
      </div>
      <p className="sr-only">{t('home_field_sr')}</p>
      <CropStrip />
      <div className="ksf-facts-in">
        <Facts t={t} />
      </div>
    </div>
  )
}

export default memo(HomeField)
