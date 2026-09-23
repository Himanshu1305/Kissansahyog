import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { CatIcon } from './CatIcon'

// Lightweight, dependency-free auto-scrolling trust carousel (6 slides). Slides 2
// & 3 are placeholders for official photos (added later with permission); slides
// 4-6 use gradients + captions as licensed imagery is sourced. Touch-swipe, dots,
// desktop arrows, pause on hover/touch.
const SLIDES = [
  { key: 'welcome', bg: 'from-green-800 to-green-600' },
  // TODO: Replace placeholder with official photo after permission obtained
  { key: 'pm', bg: 'from-green-700 to-emerald-600', placeholder: '[ PM Modi farmer photo — to be added with permission ]', captionKey: 'car_pm_caption' },
  // TODO: Replace placeholder with official photo after permission obtained
  { key: 'cm', bg: 'from-green-700 to-lime-600', placeholder: '[ MP CM farmer photo — to be added with permission ]', captionKey: 'car_cm_caption' },
  { key: 'drone', bg: 'from-sky-700 to-indigo-600', icon: 'drone', captionKey: 'car_drone_caption', sourceKey: 'car_drone_source' },
  { key: 'khurai', bg: 'from-amber-600 to-green-700', emoji: '🌾', captionKey: 'car_khurai_caption' },
  { key: 'equip', bg: 'from-stone-700 to-green-700', emoji: '🚜', captionKey: 'car_equip_caption' },
]

export default function TrustCarousel() {
  const { t } = useLang()
  const [i, setI] = useState(0)
  const paused = useRef(false)
  const touchX = useRef(null)
  const n = SLIDES.length
  const go = (idx) => setI((idx + n) % n)

  useEffect(() => {
    const id = setInterval(() => { if (!paused.current) setI((p) => (p + 1) % n) }, 6000)
    return () => clearInterval(id)
  }, [n])

  const onTouchStart = (e) => { paused.current = true; touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1))
    touchX.current = null
    setTimeout(() => { paused.current = false }, 4000)
  }

  return (
    <div
      className="relative h-[200px] w-full overflow-hidden sm:h-[280px]"
      role="group"
      aria-roledescription="carousel"
      aria-label={t('car_aria')}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex h-full transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s) => (
          <div key={s.key} className={`relative flex h-full w-full shrink-0 flex-col items-center justify-center bg-gradient-to-br ${s.bg} px-6 text-center text-white`}>
            {s.key === 'welcome' ? (
              <>
                <h2 className="text-2xl font-extrabold sm:text-3xl">{t('car_welcome_title')}</h2>
                <p className="mt-2 max-w-md text-sm text-green-50 sm:text-base">{t('hero_headline')}</p>
              </>
            ) : (
              <>
                {s.placeholder && <div className="mb-2 rounded-lg bg-black/20 px-3 py-6 text-xs font-semibold text-white/90">{s.placeholder}</div>}
                {s.icon === 'drone' && <CatIcon category="drone_didi" className="text-6xl" />}
                {s.emoji && <span className="text-6xl" aria-hidden="true">{s.emoji}</span>}
                {/* bottom gradient so caption stays readable over any future image */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                  <p className="text-sm font-bold sm:text-base">{t(s.captionKey)}</p>
                  {s.sourceKey && <p className="mt-0.5 text-[10px] text-white/70">{t(s.sourceKey)}</p>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Arrows (desktop) */}
      <button type="button" aria-label={t('car_prev')} onClick={() => go(i - 1)} className="absolute left-1 top-1/2 hidden -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-xl text-white sm:grid">‹</button>
      <button type="button" aria-label={t('car_next')} onClick={() => go(i + 1)} className="absolute right-1 top-1/2 hidden -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-xl text-white sm:grid">›</button>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1.5">
        {SLIDES.map((s, idx) => (
          <button key={s.key} type="button" aria-label={`${idx + 1}`} onClick={() => go(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
        ))}
      </div>
    </div>
  )
}
