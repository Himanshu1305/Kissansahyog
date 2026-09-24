// Equipment availability calendar (Phase 7a). A simple month view. The owner
// (logged in, viewing their own listing) taps dates to toggle busy/free; everyone
// else sees busy dates greyed with a "बुक्ड" label. No booking/approval flow —
// just an owner-maintained busy/free view so callers know before they call.
import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchUnavailableDates, setUnavailableDate } from '../lib/listings/listingsApi'

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function AvailabilityCalendar({ listingId, isOwner, actorId }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(() => new Set())
  const [saving, setSaving] = useState(null)
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let alive = true
    fetchUnavailableDates(listingId).then((ds) => alive && setBusy(new Set(ds))).catch(() => {})
    return () => { alive = false }
  }, [listingId])

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay()
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < first; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    return cells
  }, [view])

  async function toggle(d) {
    if (!isOwner || !d) return
    const ds = iso(view.y, view.m, d)
    const nowBusy = busy.has(ds)
    setSaving(ds)
    try {
      await setUnavailableDate(actorId, listingId, ds, !nowBusy)
      setBusy((prev) => { const n = new Set(prev); if (nowBusy) n.delete(ds); else n.add(ds); return n })
    } catch { /* ignore; state unchanged */ } finally { setSaving(null) }
  }

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const step = (delta) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  return (
    <div style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '12px' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>📆 {t('cal_title')}</h3>
        <div className="flex items-center gap-2 text-[13px]">
          <button type="button" onClick={() => step(-1)} className="rounded px-2 py-1 font-bold" style={{ background: 'var(--ks-bg-soft)' }}>‹ {t('cal_prev')}</button>
          <span className="font-bold" style={{ color: 'var(--ks-ink-2)' }}>{monthLabel}</span>
          <button type="button" onClick={() => step(1)} className="rounded px-2 py-1 font-bold" style={{ background: 'var(--ks-bg-soft)' }}>{t('cal_next')} ›</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[11px] font-bold" style={{ color: 'var(--ks-ink-3)' }}>{d}</div>)}
        {grid.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = iso(view.y, view.m, d)
          const isBusy = busy.has(ds)
          const past = ds < todayStr
          return (
            <button key={i} type="button" disabled={!isOwner || past || saving === ds} onClick={() => toggle(d)}
              className="flex h-9 items-center justify-center rounded text-[13px] font-bold"
              title={isBusy ? t('cal_busy') : t('cal_free')}
              style={{
                background: isBusy ? 'var(--ks-border-strong)' : 'var(--ks-green-tint)',
                color: isBusy ? 'var(--ks-ink-3)' : 'var(--ks-green-dark)',
                opacity: past ? 0.4 : 1,
                textDecoration: isBusy ? 'line-through' : 'none',
                cursor: isOwner && !past ? 'pointer' : 'default',
              }}>
              {d}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: 'var(--ks-green-tint)' }} /> {t('cal_free')}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: 'var(--ks-border-strong)' }} /> {t('cal_busy')}</span>
        {isOwner && <span>· {t('cal_owner_hint')}</span>}
      </div>
    </div>
  )
}
