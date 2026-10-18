// The tour: five tabs, each a sample screen of a REAL page of the app (link opens it).
// Auto-rotates every 6 s; any tap stops it. No auto-rotation with data saver or reduced
// motion, and it pauses while the page is hidden or the tour is off screen (rule F.11).
// Visiting all five tabs finishes the tour (marks it done).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { CATEGORY_META, EQUIPMENT_TAGS, RENTAL_BASIS, TRACTOR_BRANDS } from '../../lib/listings/catalog'
import { markDone, getDone } from './progress.js'
import { dur, prefersReducedMotion, saveDataOn } from './timing.js'
import { useLoopActive } from './useLoopActive.js'
import { Sprout } from './icons.jsx'
import './phone.css'
import './guide.css'

const TABS = [
  { key: 'mandi', icon: '₹', title: 'nav_mandi', sub: 'guide_tour_mandi_sub', say: 'guide_tour_mandi_say', to: '/msp' },
  { key: 'weather', icon: '☀', title: 'nav_weather', sub: 'guide_tour_weather_sub', say: 'guide_tour_weather_say', to: '/mausam' },
  { key: 'schemes', icon: '✓', title: 'nav_schemes', sub: 'guide_tour_schemes_sub', say: 'guide_tour_schemes_say', to: '/yojana' },
  { key: 'questions', icon: '?', title: 'sawaal_nav', sub: 'guide_tour_questions_sub', say: 'guide_tour_questions_say', to: '/sawaal' },
  { key: 'market', icon: '⇄', title: 'guide_tour_market', sub: 'guide_tour_market_sub', say: 'guide_tour_market_say', to: '/browse' },
]
const ROTATE_MS = 6000
// Sample prices (₹ / quintal) and a sample week — always labelled "sample".
const PRICES = [['crop_gehun', '2,450', 0.42], ['crop_soyabean', '4,600', 0.78], ['crop_chana', '5,500', 0.94]]
const WEEK = [[28, 0], [29, 0], [27, 2], [25, 61], [26, 3], [28, 0], [29, 0]] // [°C, weather code]

function WeatherIcon({ code }) {
  if (code === 0) return (
    <svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="11" fill="#f0a500" /><path d="M30 6v6M30 48v6M6 30h6M48 30h6M13 13l4 4M43 43l4 4M47 13l-4 4M17 43l-4 4" stroke="#f0a500" strokeWidth="4" strokeLinecap="round" /></svg>
  )
  if (code === 61) return (
    <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 34a10 10 0 0 1 1-20 13 13 0 0 1 25 3 8.5 8.5 0 0 1-1 17z" fill="#8aa4bd" /><path d="M20 42l-3 8M30 42l-3 8M40 42l-3 8" stroke="#2b8fd1" strokeWidth="3.5" strokeLinecap="round" /></svg>
  )
  return <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 42a10 10 0 0 1 1-20 13 13 0 0 1 25 3 8.5 8.5 0 0 1-1 17z" fill="#9fb3c8" /></svg>
}

export default function TourExplorer() {
  const { t, lang } = useLang()
  const rootRef = useRef(null)
  const loopOn = useLoopActive(rootRef)
  const [cur, setCur] = useState(0)
  const [auto, setAuto] = useState(() => !saveDataOn() && !prefersReducedMotion())
  const [visited, setVisited] = useState({ 0: 1 })
  const [day, setDay] = useState(0)
  const [open, setOpen] = useState({})
  const [finished, setFinished] = useState(() => !!getDone().tour)
  const [chips, setChips] = useState({ c: 'equipment', g: 'vegetable_farming' })

  const running = auto && loopOn
  // Rotation: one timer per tab; re-armed (full 6 s) whenever it resumes.
  useEffect(() => {
    if (!running) return undefined
    const id = setTimeout(() => select((cur + 1) % TABS.length, false), dur(ROTATE_MS))
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, cur])

  function select(i, manual) {
    if (manual) setAuto(false)
    setCur(i)
    setVisited((v) => (v[i] ? v : { ...v, [i]: 1 }))
  }
  // Every tab seen → the tour is done.
  const seenAll = Object.keys(visited).length === TABS.length
  useEffect(() => {
    if (!seenAll) return
    if (!getDone().tour) markDone('tour')
    setFinished(true)
  }, [seenAll])
  const stop = () => setAuto(false)

  const tab = TABS[cur]
  const today = new Date().getDay()
  const wday = (i) => t(`wday_${(today + i) % 7}`)
  const mahindra = TRACTOR_BRANDS.find((b) => b.value === 'Mahindra')[lang]
  const perHour = RENTAL_BASIS.find((r) => r.value === 'per_hour')[lang]
  const sampleTag = <span className="ksg-m-sample">{t('guide_sample')}</span>

  let screen
  if (tab.key === 'mandi') {
    screen = (
      <div className="ksg-m-body">
        <p className="ksg-m-h ksg-m-h-big">{t('col_modal')} · ₹ / {t('qtl')} {sampleTag}</p>
        {PRICES.map(([k, price, w]) => (
          <div key={k} className="ksg-bar">
            <div className="ksg-bar-t"><span>{t(k)}</span><b>₹{price}</b></div>
            <div className="ksg-bar-tr"><i style={{ transform: `scaleX(${w})` }} /></div>
          </div>
        ))}
        <p className="ksg-m-note">{t('guide_tour_mandi_note')}</p>
      </div>
    )
  } else if (tab.key === 'weather') {
    const [temp, code] = WEEK[day]
    screen = (
      <div className="ksg-m-body">
        <p className="ksg-m-h">{t('mausam_7day')} {sampleTag}</p>
        <div className="ksg-wbig">
          <WeatherIcon code={code} />
          <div><b>{temp}°</b><span>{wday(day)} · {t(`wcode_${code}`)}</span></div>
        </div>
        <div className="ksg-days">
          {WEEK.map(([tp], i) => (
            <button key={i} type="button" data-testid={`tour-day-${i}`} aria-pressed={day === i} className={day === i ? 'ksg-m-sel' : ''} onClick={() => { stop(); setDay(i) }}>
              <span>{wday(i)}</span><b>{tp}°</b>
            </button>
          ))}
        </div>
      </div>
    )
  } else if (tab.key === 'schemes') {
    screen = (
      <div className="ksg-m-body">
        <p className="ksg-m-h">{t('guide_tour_schemes_sub')} {sampleTag}</p>
        {['y1', 'y2', 'y3'].map((y) => (
          <div key={y} className="ksg-yc"><b>{t(`guide_tour_${y}`)}</b><span>{t(`guide_tour_${y}_d`)}</span></div>
        ))}
        <p className="ksg-m-note">{t('guide_tour_schemes_note')}</p>
      </div>
    )
  } else if (tab.key === 'questions') {
    screen = (
      <div className="ksg-m-body">
        {['q1', 'q2', 'q3'].map((q, i) => (
          <div key={q} className={`ksg-qa${open[i] ? ' ksg-open' : ''}`}>
            <button type="button" data-testid={`tour-faq-${i}`} aria-expanded={!!open[i]} onClick={() => { stop(); setOpen((o) => ({ ...o, [i]: !o[i] })) }}>
              {t(`guide_tour_${q}`)}<span aria-hidden="true">{open[i] ? '−' : '+'}</span>
            </button>
            {open[i] && <p>{t('guide_tour_qa_a')}</p>}
          </div>
        ))}
      </div>
    )
  } else {
    const catChip = (c) => (
      <button key={c} type="button" className={`ksg-m-chip${chips.c === c ? ' ksg-m-sel' : ''}`} aria-pressed={chips.c === c} onClick={() => { stop(); setChips((s) => ({ ...s, c })) }}>
        {CATEGORY_META[c].icon} {CATEGORY_META[c][lang]}
      </button>
    )
    screen = (
      <div className="ksg-m-body">
        <div className="ksg-m-chips">{['equipment', 'agri_inputs', 'building_materials'].map(catChip)}</div>
        {chips.c === 'equipment' && (
          <div className="ksg-m-chips">
            {EQUIPMENT_TAGS.map((g) => (
              <button key={g.value} type="button" className={`ksg-m-chip${chips.g === g.value ? ' ksg-m-sel' : ''}`} aria-pressed={chips.g === g.value} onClick={() => { stop(); setChips((s) => ({ ...s, g: g.value })) }}>{g[lang]}</button>
            ))}
          </div>
        )}
        <div className="ksg-m-card">
          <div className="ksg-m-cardtop">{sampleTag}</div>
          <b className="ksg-m-cardtitle">{mahindra} 575 DI · 2021 · 45 HP</b>
          <span className="ksg-m-cardline">{t('guide_s_tractor')} · {perHour} · ₹600</span>
          <span className="ksg-m-cardline">📍 {t('guide_s_village')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ksg-player ksg-tour" data-testid="tour-explorer" data-tab={tab.key} data-auto={running ? 'on' : 'off'} ref={rootRef}>
      <div className="ksg-stage">
        <div className="ksg-pcol">
          <div className="ksg-say-row">
            <span className="ksg-av"><Sprout /></span>
            <p className="ksg-say" aria-live="polite" key={cur}>{t(tab.say)}</p>
          </div>
          <div className="ksg-phone">
            <div className="ksg-screen" data-testid="demo-screen" data-screen={tab.key} onClick={stop}>
              <div className="ksg-app">
                <div className="ksg-m-top"><span aria-hidden="true">‹</span><b>{t(tab.title)}</b></div>
                {screen}
              </div>
            </div>
          </div>
          <p className="ksg-fine">{t('guide_samples_note')}</p>
        </div>
        <div className="ksg-side">
          <p className="ksg-hint">{t('guide_tour_hint')}</p>
          <div className="ksg-tabs" role="group" aria-label={t('guide_tour_h1')}>
            {TABS.map((x, i) => (
              <button key={x.key} type="button" data-testid={`tour-tab-${x.key}`} aria-pressed={i === cur} className={`ksg-tab${i === cur ? ' ksg-on' : ''}${visited[i] ? ' ksg-seen' : ''}`} onClick={() => select(i, true)}>
                <span className="ksg-ti" aria-hidden="true">{x.icon}</span>
                <span className="ksg-tt"><b>{t(x.title)}</b><span>{t(x.sub)}</span></span>
                {i === cur && running && <span className="ksg-pg" key={`${cur}-run`} style={{ animationDuration: `${Math.round(dur(ROTATE_MS))}ms` }} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <Link className="ksg-b2 ksg-reallink" to={tab.to} data-testid="tour-real-link">{t('guide_open_page')}: {t(tab.title)} →</Link>
          {finished && (
            <div className="ksg-fin" data-testid="demo-finish">
              <h2>{t('guide_tour_fin')}</h2>
              <p>{t('guide_well_done')}</p>
              <div className="ksg-finbtns">
                <Link data-testid="demo-next" className="ksg-b1 ksg-b-sun" to="/guide">{t('guide_all_demos')} →</Link>
                <Link data-testid="demo-real-app" className="ksg-b2 ksg-b-light" to="/">{t('guide_real_app')} →</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
