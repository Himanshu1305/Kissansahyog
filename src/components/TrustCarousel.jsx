import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'

// Compact trust carousel (5 slides, 165px mobile / 200px desktop, 8s auto-scroll).
// Slide 1 is typographic; slides 2-5 are full-bleed images (opacity 0.5) under a
// dark gradient. PM/CM images are placeholders pending official PIB/MP-govt photos
// (see TODOs). Touch-swipe, arrows, dot indicators. All copy via i18n; source
// notes are attribution text (also i18n so no Devanagari is hardcoded here).
const SLIDES = [
  { key: 'welcome' },
  // TODO: Replace with official PIB photo once permission confirmed
  { key: 'pm', img: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=800', capKey: 'car_pm_cap', subKey: 'car_pm_sub', srcKey: 'car_pm_src' },
  // TODO: Replace with official MP govt photo
  { key: 'cm', img: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800', capKey: 'car_cm_cap', subKey: 'car_cm_sub', srcKey: 'car_cm_src' },
  { key: 'drone', img: 'https://images.pexels.com/photos/3735747/pexels-photo-3735747.jpeg?auto=compress&cs=tinysrgb&w=800', capKey: 'car_drone_cap', subKey: 'car_drone_sub', srcKey: 'car_drone_src' },
  { key: 'vision', img: 'https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=800', capKey: 'car_vision_cap', subKey: 'car_vision_sub' },
]
const OVERLAY = 'linear-gradient(90deg, rgba(5,20,10,0.88) 0%, rgba(5,20,10,0.30) 100%)'

export default function TrustCarousel() {
  const { t } = useLang()
  const [i, setI] = useState(0)
  const paused = useRef(false)
  const touchX = useRef(null)
  const n = SLIDES.length
  const go = (idx) => setI((idx + n) % n)

  useEffect(() => {
    const id = setInterval(() => { if (!paused.current) setI((p) => (p + 1) % n) }, 8000)
    return () => clearInterval(id)
  }, [n])

  const onTouchStart = (e) => { paused.current = true; touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1))
    touchX.current = null
    setTimeout(() => { paused.current = false }, 5000)
  }

  return (
    <div
      className="relative h-[165px] w-full overflow-hidden bg-[#0a2010] sm:h-[200px]"
      role="group"
      aria-roledescription="carousel"
      aria-label={t('car_aria')}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex h-full transition-transform duration-[400ms] ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s) => (
          <div key={s.key} className="relative h-full w-full shrink-0 overflow-hidden bg-[#0a2010]">
            {s.img && (
              <img
                src={s.img}
                alt=""
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
            )}
            {s.img && <div className="absolute inset-0" style={{ background: OVERLAY }} />}
            <div className={`relative z-[2] flex h-full flex-col justify-center px-4 ${s.key === 'welcome' ? 'items-center text-center' : ''}`}>
              {s.key === 'welcome' ? (
                <>
                  <h3 className="text-[15px] font-extrabold leading-snug text-white sm:text-lg">{t('car_welcome_title')}</h3>
                  <p className="mt-1 max-w-md text-[10.5px] leading-relaxed text-[#90c8a0] sm:text-xs">{t('car_welcome_sub')}</p>
                </>
              ) : (
                <>
                  <h3 className="text-[13px] font-bold leading-snug text-white">{t(s.capKey)}</h3>
                  <p className="mt-[3px] text-[10.5px] leading-[1.4] text-[#90c8a0]">{t(s.subKey)}</p>
                  {s.srcKey && <small className="mt-[2px] block text-[8.5px] text-[#5a8a6a]">{t(s.srcKey)}</small>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button type="button" aria-label={t('car_prev')} onClick={() => go(i - 1)} className="absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-lg text-white">‹</button>
      <button type="button" aria-label={t('car_next')} onClick={() => go(i + 1)} className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-lg text-white">›</button>

      {/* Dot indicators */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {SLIDES.map((s, idx) => (
          <button
            key={s.key}
            type="button"
            aria-label={`${idx + 1}`}
            onClick={() => go(idx)}
            className={idx === i ? 'h-[5px] w-[14px] rounded-[3px] bg-[#4caf70]' : 'h-[5px] w-[5px] rounded-full bg-white/30'}
          />
        ))}
      </div>
    </div>
  )
}
