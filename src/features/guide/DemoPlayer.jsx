// The phone demo player (port of design/guide-demo-preview.html, React, data-driven).
//
// Props (also used by the GuideSheet that embeds it on Signup / Post / Browse):
//   demoId      'register' | 'post' | 'find'   (the tour is TourExplorer.jsx)
//   embedded    false → full page (finish card: next demo, watch again, try in the real app)
//               true  → inside a sheet on the real page (finish card: watch again + Close;
//                       no "next demo" and no real-app link — the person is already there)
//   autoStart   true  → starts in Watch mode shortly after mount
//   onFinish    (demoId) => void   called once each time the demo reaches its end
//   onClose     () => void         shows a Close button on the finish card (embedded)
//
// Watch: finger moves, taps, types; captions in an aria-live region. Try it: the step's
// target glows and waits for a tap (or Enter / Space) on it; taps elsewhere do nothing.
// Jumping to a step fast-applies every earlier step first (engine.stateBefore).
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { getDemo } from './demos/index.js'
import { indexDemo, initialState, stateBefore, applyItem, applyEffects, itemsOf, itemDo } from './engine.js'
import { sleep, dur, nextFrame, prefersReducedMotion } from './timing.js'
import { markDone } from './progress.js'
import { GUIDE_ORDER, GUIDE_REAL } from './config.js'
import MockScreen, { makeTxt } from './MockScreen.jsx'
import { Sprout, PlayIcon, PauseIcon, RedoIcon, SpeakerIcon } from './icons.jsx'
import './phone.css'
import './guide.css'

const CONFETTI = ['#f0a500', '#24733F', '#e0603a', '#2b8fd1', '#8bc34a']

function speechSupported() {
  try { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' } catch { return false }
}
function stopSpeech() {
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}

export default function DemoPlayer({ demoId, embedded = false, autoStart = true, onFinish, onClose }) {
  const demo = getDemo(demoId)
  if (!demo) return null
  return <Player key={demoId} demo={demo} demoId={demoId} embedded={embedded} autoStart={autoStart} onFinish={onFinish} onClose={onClose} />
}

function Player({ demo, demoId, embedded, autoStart, onFinish, onClose }) {
  const { t, lang } = useLang()
  const index = useMemo(() => indexDemo(demo), [demo])
  const steps = demo.steps

  const [st, setSt] = useState(() => initialState(demo))
  const [idx, setIdx] = useState(0)
  const [mode, setMode] = useState('watch')
  const [status, setStatus] = useState('idle') // idle | playing | paused | finished
  const [typing, setTyping] = useState(null) // { id, text }
  const [flashId, setFlashId] = useState(null)
  const [targetId, setTargetId] = useState(null)
  const [finger, setFinger] = useState({ x: 0, y: 0, on: false, tap: 0 })
  const [burst, setBurst] = useState(0)
  const [canSpeak] = useState(speechSupported)

  const tokenRef = useRef(0)
  const autoRef = useRef(null)
  const waitRef = useRef(null)
  const targetRef = useRef(null)
  const modeRef = useRef('watch')
  const phoneRef = useRef(null)
  const screenRef = useRef(null)
  const txtRef = useRef(null)
  const finishRef = useRef(onFinish)
  txtRef.current = makeTxt(t, lang)
  finishRef.current = onFinish
  const txt = txtRef.current

  const sync = (fn) => flushSync(fn)
  const alive = (t0) => t0 === tokenRef.current
  const reduced = () => prefersReducedMotion()
  const findEl = (id) => screenRef.current?.querySelector(`[data-node="${id}"]`) || null

  function cancelWait() {
    const r = waitRef.current
    waitRef.current = null
    if (r) r(false)
  }

  // Scroll the mock screen so `el` sits in its middle (instant when motion is reduced).
  function scrollToEl(el, t0) {
    const scr = screenRef.current
    if (!scr || !el) return Promise.resolve()
    const r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect()
    const to = Math.max(0, Math.min(scr.scrollHeight - scr.clientHeight, scr.scrollTop + (r.top - sr.top) - (sr.height / 2 - r.height / 2)))
    const from = scr.scrollTop, d = to - from
    if (Math.abs(d) < 4) return Promise.resolve()
    if (reduced() || dur(380) < 20) { scr.scrollTop = to; return Promise.resolve() }
    return new Promise((res) => {
      const s = performance.now(), D = dur(380)
      const f = (n) => {
        const k = Math.min(1, (n - s) / D)
        scr.scrollTop = from + d * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
        if (k < 1 && alive(t0)) requestAnimationFrame(f)
        else res()
      }
      requestAnimationFrame(f)
    })
  }

  async function moveFinger(el) {
    if (reduced()) return
    const p = phoneRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!p) return
    const x = r.left - p.left + Math.min(r.width * 0.6, r.width - 14)
    const y = r.top - p.top + r.height / 2
    setFinger((f) => ({ ...f, x, y, on: true }))
    await sleep(760)
  }
  async function tapFx() {
    if (reduced()) return
    setFinger((f) => ({ ...f, tap: f.tap + 1 }))
    await sleep(300)
  }

  async function typeInto(item, fast, t0, perChar) {
    const text = txtRef.current(item.text)
    if (!fast && !reduced()) {
      const chars = Array.from(text)
      for (let i = 1; i <= chars.length; i++) {
        if (!alive(t0)) return
        sync(() => setTyping({ id: item.target, text: chars.slice(0, i).join('') }))
        await sleep(perChar)
      }
      if (!alive(t0)) return
    }
    sync(() => setTyping(null))
  }

  async function doItem(step, item, fast, t0, perChar = 75) {
    const kind = itemDo(step, item)
    if (kind === 'type') await typeInto(item, fast, t0, perChar)
    else if (kind === 'look') {
      if (!fast) {
        sync(() => setFlashId(item.target))
        await sleep(1700)
        if (alive(t0)) sync(() => setFlashId(null))
      }
    } else if (!fast) await tapFx()
    if (!alive(t0)) return false
    sync(() => setSt((s) => applyItem(s, step, item, index)))
    if (kind === 'type' && !fast) await sleep(220)
    return alive(t0)
  }

  function finishStep(step, fast) {
    sync(() => setSt((s) => applyEffects(s, step)))
    if (step.go && screenRef.current) screenRef.current.scrollTop = 0
    if (step.fx && !fast && !reduced()) setBurst((b) => b + 1)
  }

  // Watch mode: the finger does it.
  async function perform(step, t0) {
    for (const item of itemsOf(step)) {
      const el = findEl(item.target)
      if (el) {
        await scrollToEl(el, t0)
        if (!alive(t0)) return false
        await moveFinger(el)
        if (!alive(t0)) return false
      }
      if (!(await doItem(step, item, false, t0))) return false
    }
    finishStep(step, false)
    await nextFrame()
    return alive(t0)
  }

  // Try-it mode: ring the target, wait for the person's tap on it.
  async function tryStep(step, t0) {
    setFinger((f) => ({ ...f, on: false }))
    for (const item of itemsOf(step)) {
      const el = findEl(item.target)
      if (el) await scrollToEl(el, t0)
      if (!alive(t0)) return false
      if (itemDo(step, item) === 'look') {
        if (!(await doItem(step, item, false, t0))) return false
        continue
      }
      const hadFocusInPhone = phoneRef.current?.contains(document.activeElement)
      targetRef.current = item.target
      sync(() => setTargetId(item.target))
      if (hadFocusInPhone) findEl(item.target)?.focus({ preventScroll: true })
      const ok = await new Promise((res) => { waitRef.current = res })
      targetRef.current = null
      if (!alive(t0)) return false
      sync(() => setTargetId(null))
      if (!ok) return false
      if (!(await doItem(step, item, false, t0, 35))) return false
    }
    finishStep(step, false)
    await nextFrame()
    return alive(t0)
  }

  async function run(from, t0) {
    for (let k = from; k < steps.length; k++) {
      if (!alive(t0)) return
      setIdx(k)
      const ok = modeRef.current === 'try' ? await tryStep(steps[k], t0) : await perform(steps[k], t0)
      if (!ok || !alive(t0)) return
      if (modeRef.current === 'watch') {
        await sleep(steps[k].hold || 950)
        if (!alive(t0)) return
      }
    }
    if (!alive(t0)) return
    setFinger((f) => ({ ...f, on: false }))
    setStatus('finished')
    markDone(demoId)
    if (!reduced()) setBurst((b) => b + 1)
    try { finishRef.current?.(demoId) } catch { /* caller's problem */ }
  }

  // Jump to step i: cancel whatever runs, fast-apply steps 0..i-1, then play from i.
  function jump(i) {
    clearTimeout(autoRef.current) // a person's own tap wins over the pending auto-start
    tokenRef.current += 1
    const t0 = tokenRef.current
    cancelWait()
    targetRef.current = null
    sync(() => {
      setSt(stateBefore(demo, i, index))
      setTyping(null)
      setFlashId(null)
      setTargetId(null)
      setFinger((f) => ({ ...f, on: false }))
      setIdx(i)
      setStatus('playing')
    })
    if (screenRef.current) screenRef.current.scrollTop = 0
    run(i, t0)
  }

  function pause() {
    clearTimeout(autoRef.current)
    tokenRef.current += 1
    cancelWait()
    targetRef.current = null
    stopSpeech()
    setTargetId(null)
    setTyping(null)
    setFlashId(null)
    setFinger((f) => ({ ...f, on: false }))
    setStatus('paused')
  }

  function onTap(id) {
    if (targetRef.current && id === targetRef.current && waitRef.current) {
      const r = waitRef.current
      waitRef.current = null
      r(true)
    }
  }

  function setModeAndRestart(m) {
    modeRef.current = m
    setMode(m)
    jump(0)
  }

  function listen() {
    if (!canSpeak) return
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new window.SpeechSynthesisUtterance(t(steps[Math.min(idx, steps.length - 1)].say))
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
      synth.speak(u)
    } catch { /* speech not available: nothing to do */ }
  }

  // Auto-start (Watch) shortly after mount; stop everything on unmount.
  useEffect(() => {
    if (autoStart) autoRef.current = setTimeout(() => jump(0), dur(450))
    const tokens = tokenRef
    const auto = autoRef
    return () => {
      clearTimeout(auto.current)
      tokens.current += 1
      cancelWait()
      stopSpeech()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Confetti pieces disappear on their own.
  useEffect(() => {
    if (!burst) return undefined
    const id = setTimeout(() => setBurst(0), dur(2300) + 50)
    return () => clearTimeout(id)
  }, [burst])

  const finished = status === 'finished'
  const playing = status === 'playing'
  const cur = Math.min(idx, steps.length - 1)
  const nextId = GUIDE_ORDER[GUIDE_ORDER.indexOf(demoId) + 1]

  return (
    <div
      className={`ksg-player${embedded ? ' ksg-embedded' : ''}`}
      data-testid="demo-player"
      data-demo={demoId}
      data-step={cur}
      data-mode={mode}
      data-state={status}
    >
      <div className="ksg-stage">
        <div className="ksg-pcol">
          <div className="ksg-say-row">
            <span className="ksg-av"><Sprout /></span>
            <p className="ksg-say" aria-live="polite" key={`${cur}-${finished}`}>{finished ? t(`guide_${demoId}_fin`) : t(steps[cur].say)}</p>
          </div>
          <div className="ksg-phone" ref={phoneRef}>
            <div className="ksg-screen" ref={screenRef} data-testid="demo-screen" data-screen={st.screen}>
              <MockScreen demo={demo} state={st} txt={txt} t={t} typing={typing} flashId={flashId} targetId={targetId} onTap={onTap} />
            </div>
            <span
              className={`ksg-finger${finger.on ? ' ksg-on' : ''}`}
              style={{ transform: `translate(${finger.x}px, ${finger.y}px)`, transitionDuration: `${Math.round(dur(700))}ms, ${Math.round(dur(300))}ms` }}
              aria-hidden="true"
            >
              <span key={finger.tap} className={finger.tap ? 'ksg-finger-dot ksg-tapfx' : 'ksg-finger-dot'} />
            </span>
            {burst > 0 && (
              <span className="ksg-confetti" aria-hidden="true" key={burst}>
                {Array.from({ length: 26 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      left: `${8 + ((i * 37) % 84)}%`,
                      background: CONFETTI[i % 5],
                      animationDelay: `${((i * 7) % 10) * 30}ms`,
                      animationDuration: `${Math.round(dur(1800))}ms`,
                      '--dx': `${((i * 53) % 140) - 70}px`,
                      '--r': `${(i * 97) % 720}deg`,
                    }}
                  />
                ))}
              </span>
            )}
          </div>
          <p className="ksg-fine">{t('guide_samples_note')}</p>
        </div>

        <div className="ksg-side">
          <div className="ksg-seg" role="group" aria-label={`${t('guide_watch')} / ${t('guide_try')}`}>
            <button type="button" data-testid="demo-mode-watch" aria-pressed={mode === 'watch'} className={mode === 'watch' ? 'ksg-on' : ''} onClick={() => setModeAndRestart('watch')}>{t('guide_watch')}</button>
            <button type="button" data-testid="demo-mode-try" aria-pressed={mode === 'try'} className={mode === 'try' ? 'ksg-on' : ''} onClick={() => setModeAndRestart('try')}>{t('guide_try')}</button>
          </div>
          <div className="ksg-ctl">
            {mode === 'watch' && (
              <button type="button" data-testid="demo-play" className="ksg-b1" onClick={() => (playing ? pause() : jump(finished ? 0 : cur))}>
                {playing ? <PauseIcon /> : <PlayIcon />}{t(playing ? 'guide_pause' : 'guide_play')}
              </button>
            )}
            <button type="button" data-testid="demo-again" className="ksg-b2" onClick={() => jump(0)}><RedoIcon />{t('guide_again')}</button>
            {canSpeak && <button type="button" data-testid="demo-listen" className="ksg-b2" onClick={listen}><SpeakerIcon />{t('guide_listen')}</button>}
          </div>
          {mode === 'try' && !finished && <p className="ksg-hint">{t('guide_try_hint')}</p>}

          {finished && (
            <div className="ksg-fin" data-testid="demo-finish">
              <h2>{t(`guide_${demoId}_fin`)}</h2>
              <p>{t('guide_well_done')}</p>
              <div className="ksg-finbtns">
                {!embedded && (
                  <Link data-testid="demo-next" className="ksg-b1 ksg-b-sun" to={nextId ? `/guide/${nextId}` : '/guide'}>
                    {t(nextId ? 'guide_next' : 'guide_all_demos')} →
                  </Link>
                )}
                <button type="button" data-testid="demo-watch-again" className="ksg-b2 ksg-b-light" onClick={() => { modeRef.current = 'watch'; setMode('watch'); jump(0) }}><RedoIcon />{t('guide_watch_again')}</button>
                {!embedded && <Link data-testid="demo-real-app" className="ksg-b2 ksg-b-light" to={GUIDE_REAL[demoId]}>{t('guide_real_app')} →</Link>}
                {embedded && onClose && <button type="button" data-testid="demo-close" className="ksg-b1 ksg-b-sun" onClick={onClose}>{t('guide_sheet_close')}</button>}
              </div>
            </div>
          )}

          <ol className="ksg-steps" aria-label={t('guide_steps')}>
            {steps.map((s, i) => {
              const isCur = !finished && i === cur
              const done = finished || i < cur
              return (
                <li key={i} className={isCur ? 'ksg-cur' : done ? 'ksg-dn' : ''}>
                  <button type="button" data-testid={`demo-step-${i}`} aria-current={isCur ? 'step' : undefined} onClick={() => jump(i)} {...(s.otp ? { 'data-otp': '1' } : {})}>
                    <span className="ksg-n">{done && !isCur ? '✓' : i + 1}</span>
                    <span>{t(s.say)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
