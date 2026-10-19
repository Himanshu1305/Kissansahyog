// /guide — hub: hero field scene, the four demo cards, progress ring n / 4, tips, badge.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import { GUIDE_ORDER } from './config.js'
import { getDone, doneCount, getBadgeName, setBadgeName } from './progress.js'
import FieldScene from './FieldScene.jsx'
import { CardIcon } from './icons.jsx'
import './guide.css'
import WhatsAppChannelCard from '../../components/WhatsAppChannelCard'

const RING = 119.4 // 2πr, r = 19
const TIPS = ['guide_tip_1', 'guide_tip_2', 'guide_tip_3', 'guide_tip_4']

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
      <Seo title={t('guide_hub_seo_title')} description={t('guide_hub_seo_desc')} path="/guide" />
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
      <WhatsAppChannelCard variant="inline" className="mx-auto max-w-3xl px-4" />
    </PageShell>
  )
}
