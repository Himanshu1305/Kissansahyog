// /guide — hub: hero field scene, the four demo cards, progress ring n / 4, tips, badge.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell } from '../../components/layout'
import { GUIDE_ORDER } from './config.js'
import { getDone, doneCount, getBadgeName, setBadgeName } from './progress.js'
import { prefersReducedMotion, saveDataOn } from './timing.js'
import { useLoopActive } from './useLoopActive.js'
import { CardIcon } from './icons.jsx'
import './guide.css'

const RING = 119.4 // 2πr, r = 19
const TIPS = ['guide_tip_1', 'guide_tip_2', 'guide_tip_3', 'guide_tip_4']

function FieldScene() {
  const ref = useRef(null)
  const active = useLoopActive(ref)
  const [still] = useState(() => saveDataOn() || prefersReducedMotion())
  const wheat = useMemo(() => {
    const out = []
    for (let x = 4; x < 800; x += 13) out.push({ x, h: 18 + ((x * 7) % 12), d: (x % 9) * 0.4 })
    return out
  }, [])
  const cls = `ksg-scene${still ? ' ksg-static' : active ? '' : ' ksg-paused'}`
  return (
    <svg ref={ref} className={cls} viewBox="0 0 800 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" data-testid="guide-scene" data-motion={still ? 'static' : active ? 'on' : 'paused'}>
      <g className="ksg-sun">
        <circle cx="480" cy="52" r="26" fill="var(--ks-saffron)" />
        {Array.from({ length: 12 }, (_, a) => <rect key={a} x="478" y="14" width="4" height="10" rx="2" fill="var(--ks-saffron)" transform={`rotate(${a * 30} 480 52)`} />)}
      </g>
      <path d="M0 110 C120 70 220 90 330 100 C460 112 560 70 800 95 V150 H0Z" fill="var(--ks-green-tint)" />
      <g>
        {wheat.map(({ x, h, d }) => (
          <g key={x} className="ksg-st" style={{ animationDelay: `-${d}s` }}>
            <line x1={x} y1="150" x2={x} y2={150 - h} stroke="var(--ks-green)" strokeWidth="2" />
            <ellipse cx={x} cy={150 - h - 4} rx="2.6" ry="6" fill="var(--ks-saffron)" />
          </g>
        ))}
      </g>
      <g className="ksg-trac">
        <g transform="translate(0,84)">
          <rect x="14" y="8" width="44" height="22" rx="4" fill="var(--ks-saffron)" />
          <rect x="38" y="-10" width="24" height="22" rx="4" fill="var(--ks-green)" />
          <rect x="52" y="-18" width="4" height="12" fill="var(--ks-ink)" />
          <rect x="2" y="14" width="14" height="10" rx="2" fill="var(--ks-ink)" />
          <g transform="translate(46,30)"><g className="ksg-wheel"><circle r="17" fill="var(--ks-ink)" /><rect x="-2" y="-15" width="4" height="13" fill="var(--ks-saffron)" /></g><circle r="5" fill="var(--ks-saffron)" /></g>
          <g transform="translate(10,36)"><g className="ksg-wheel"><circle r="10" fill="var(--ks-ink)" /><rect x="-1.5" y="-9" width="3" height="8" fill="var(--ks-saffron)" /></g><circle r="3" fill="var(--ks-saffron)" /></g>
        </g>
      </g>
    </svg>
  )
}

function Badge({ n }) {
  const { t } = useLang()
  const [name, setName] = useState(getBadgeName)
  if (n < 4) {
    return (
      <div className="ksg-badge" data-testid="guide-badge" data-unlocked="0">
        <h2 className="ksg-lock">{t('guide_badge_locked')}</h2>
        <p>{t('guide_badge_left').replace('{n}', String(4 - n))}</p>
      </div>
    )
  }
  const clean = name.trim()
  const href = `https://wa.me/?text=${encodeURIComponent(t('guide_share_text'))}`
  return (
    <div className="ksg-badge ksg-badge-on" data-testid="guide-badge" data-unlocked="1">
      <h2>{t('guide_badge_title')}</h2>
      <label className="ksg-badge-lbl" htmlFor="ksg-badge-name">{t('guide_badge_name')}</label>
      <input
        id="ksg-badge-name" data-testid="guide-badge-name" type="text" maxLength={30} autoComplete="off" value={name}
        onChange={(e) => { setName(e.target.value); setBadgeName(e.target.value) }}
      />
      <p className="ksg-badge-msg">{clean ? t('guide_badge_ready_name').replace('{name}', clean) : t('guide_badge_ready')}</p>
      <a className="ksg-b2 ksg-b-light" data-testid="guide-badge-share" href={href} target="_blank" rel="noopener noreferrer">{t('guide_share')} ↗</a>
    </div>
  )
}

export default function GuideHub() {
  const { t } = useLang()
  const [done, setDone] = useState(getDone)
  const [tip, setTip] = useState(0)
  const n = doneCount(done)

  // Progress can change in another tab / the sheet on another page: re-read on focus.
  useEffect(() => {
    const refresh = () => setDone(getDone())
    window.addEventListener('ks-guide-progress', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('ks-guide-progress', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return (
    <PageShell width="wide">
      <div className="ksg-hub" data-testid="guide-hub">
        <section className="ksg-hero">
          <div className="ksg-hero-in">
            <h1 className="ksg-h1">{t('guide_hub_h1')}</h1>
            <p className="ksg-lead">{t('guide_lead')}</p>
            <div className="ksg-meter" data-testid="guide-progress" data-done={n} role="img" aria-label={t('guide_progress').replace('{n}', String(n))}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle className="ksg-meter-tr" cx="24" cy="24" r="19" fill="none" strokeWidth="6" />
                <circle className="ksg-meter-fl" cx="24" cy="24" r="19" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - n / 4)} />
              </svg>
              <b>{t('guide_progress').replace('{n}', String(n))}</b>
            </div>
          </div>
          <FieldScene />
        </section>

        <div className="ksg-cards">
          {GUIDE_ORDER.map((id) => (
            <Link key={id} to={`/guide/${id}`} className={`ksg-card${done[id] ? ' ksg-dn' : ''}`} data-testid={`guide-card-${id}`} data-done={done[id] ? '1' : '0'}>
              <span className="ksg-card-ico"><CardIcon id={id} /></span>
              <span className="ksg-card-txt">
                <b>{t(`guide_${id}_h1`)}</b>
                <span>{t(`guide_${id}_sub`)}</span>
                <span className="ksg-card-tag">{t(done[id] ? 'guide_tag_done' : 'guide_tag_new')}</span>
              </span>
              <span className="ksg-card-go" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>

        <div className="ksg-row">
          <div className="ksg-tip">
            <p className="ksg-tip-lbl">{t('guide_tip_label')}</p>
            <p className="ksg-tip-txt" aria-live="polite">{t(TIPS[tip % TIPS.length])}</p>
            <button type="button" className="ksg-pill" data-testid="guide-tip-next" onClick={() => setTip((x) => x + 1)}>{t('guide_tip_next')}</button>
          </div>
          <Badge n={n} />
        </div>

        <p className="ksg-foot">
          {t('guide_samples_note')} {t('guide_written_help')} <Link to="/how-to-use">{t('nav_how_to_use')}</Link>
        </p>
      </div>
    </PageShell>
  )
}
