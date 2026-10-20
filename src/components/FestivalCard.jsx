import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { activeFestival } from '../lib/festivals'

// Batch 12B — one-day festival greeting on the home page (Dussehra 2026, India date). Client-side only:
// it is decided after mount, so it is never part of the prerendered HTML and nothing stale is cached.
// No animation, no script, no tracking; the picture is served from our own site (public/festival/).
// Closing hides it for the rest of the day (localStorage, always in try/catch; works if storage is blocked).
const KEY = 'ks_festival_closed_v1'
const readClosed = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const writeClosed = (id) => { try { localStorage.setItem(KEY, id) } catch { /* storage blocked: it just comes back on reload */ } }

export default function FestivalCard() {
  const { t } = useLang()
  const [fest, setFest] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__KS_PRERENDER) return // the static prerender never carries it
    const f = activeFestival(new Date())
    if (f && readClosed() !== f.id) setFest(f)
  }, [])

  if (!fest) return null
  const close = () => { writeClosed(fest.id); setFest(null) }

  return (
    <section data-testid="festival-card" data-festival={fest.id} role="region" aria-label={t('fest_greeting_region')} className="ks-section-inner pt-2">
      <div className="mx-auto flex max-w-[720px] items-center gap-3 rounded-xl border-2 py-2 pl-2 pr-0 md:gap-4 md:py-3 md:pl-3" style={{ background: 'var(--ks-saffron-tint)', borderColor: 'var(--ks-saffron)' }}>
        <img
          src="/festival/neelkanth-112.webp"
          srcSet="/festival/neelkanth-112.webp 112w, /festival/neelkanth.webp 640w"
          sizes="(min-width: 768px) 88px, 56px"
          width="56" height="56" alt={t('fest_dussehra_alt')}
          className="h-14 w-14 shrink-0 rounded-xl object-cover md:h-[88px] md:w-[88px]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold leading-[1.25] md:text-[18px]" style={{ color: 'var(--ks-ink)' }}>{t('fest_dussehra_title')}</p>
          <p className="mt-0.5 text-[13px] leading-[1.25] md:text-[16px]" style={{ color: 'var(--ks-ink-2)' }}>{t('fest_dussehra_line')}</p>
          <p className="mt-1 hidden text-[14px] font-semibold md:block" style={{ color: 'var(--ks-ink-2)' }}>{t('fest_dussehra_from')}</p>
        </div>
        <button
          type="button" data-testid="festival-close" onClick={close} aria-label={t('fest_close')}
          className="grid h-12 w-12 shrink-0 place-items-center self-start rounded-full text-[22px] font-bold leading-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ks-green-dark)]"
          style={{ color: 'var(--ks-ink)' }}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  )
}
