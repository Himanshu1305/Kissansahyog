// Batch 14A - the Overview tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).
import { useEffect, useState } from 'react'
import { Field, Select, Notice, Spinner } from '../../../components/ui'
import { CATEGORY_META } from '../../../lib/listings/catalog'
import { getAdminStats, getAdminDataHealth, getAdminAvailability, getAdminAvailabilityListings } from '../../../lib/admin/adminApi'
import { CATEGORIES } from '../../../lib/listings/catalog'
import Section from '../Section'

function StatsBar({ actorId, t }) {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    getAdminStats(actorId).then(setStats).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  if (err) return <Notice tone="error">{err}</Notice>
  if (!stats) return <Spinner />
  const cards = [
    ['stat_users', stats.users],
    ['stat_active_listings', stats.active_total],
    ['stat_closed', stats.closed],
    ['stat_removed', stats.removed],
    ['stat_experts', stats.experts],
    ['stat_articles', stats.articles_published],
  ]
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(([k, v]) => (
        <div key={k} className="rounded-2xl border-2 border-stone-100 bg-white p-4 text-center">
          <div className="text-3xl font-extrabold text-green-800">{v ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">{t(k)}</div>
        </div>
      ))}
    </div>
  )
}

// Best-effort short "key detail" for a vendor row from its details JSONB.

function AvailabilityPanel({ actorId, t, lang }) {
  const [counts, setCounts] = useState(null)
  const [rows, setRows] = useState(null)
  const [cat, setCat] = useState('all')
  const [err, setErr] = useState(null)

  useEffect(() => {
    getAdminAvailability(actorId).then(setCounts).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => {
    setRows(null)
    getAdminAvailabilityListings(actorId, cat === 'all' ? null : cat).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, cat, t])

  return (
    <Section title={`📊 ${t('admin_availability_title')}`}>
      <p id="availability" className="scroll-mt-16" />
      {err && <Notice tone="error">{err}</Notice>}
      {!counts ? <Spinner /> : (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((c) => (
            <div key={c.category} className="rounded-xl border-2 border-stone-100 bg-stone-50 p-3">
              <div className="font-bold text-stone-800">{CATEGORY_META[c.category]?.[lang] || c.category}</div>
              <div className="mt-1 text-sm text-stone-600">
                {t('avail_col_total')}: <span className="font-bold text-stone-900">{c.total}</span>
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-bold text-green-700">{c.available}</span> {t('avail_available')}
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-bold text-amber-700">{c.unavailable}</span> {t('avail_unavailable')}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('col_category')} htmlFor="av_cat">
          <Select id="av_cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">{t('vendor_filter_all_cat')}</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_META[c][lang]}</option>))}
          </Select>
        </Field>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_category')}</th>
                <th className="py-2 pr-3">{t('col_type')}</th>
                <th className="py-2 pr-3">{t('avail_col_village')}</th>
                <th className="py-2 pr-3">{t('avail_col_clicks')}</th>
                <th className="py-2 pr-3">{t('avail_col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{r.listing_type === 'offer' ? t('home_offer') : t('home_requirement')}</td>
                  <td className="py-2 pr-3">{r.village_name || '—'}</td>
                  <td className="py-2 pr-3">{r.contact_click_count}</td>
                  <td className="py-2 pr-3">
                    {r.is_available
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">{t('avail_available')}</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{t('avail_unavailable')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// Phase 6 — sortable/filterable admin table of किसान profiles (campaign planning).
// A separate section from the availability panel, per the prompt.

function DataHealthPanel({ actorId, t }) {
  const [data, setData] = useState(null); const [err, setErr] = useState(null)
  useEffect(() => { getAdminDataHealth(actorId).then(setData).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  return (
    <Section title={t('admin_data_health')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!data ? <Spinner /> : (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><div className="mb-1 font-bold text-stone-700">mandi (last date · rows)</div>
            {(data.mandi || []).map((m) => <div key={m.commodity_en} className="flex justify-between border-t border-stone-100 py-0.5"><span>{m.commodity_en}</span><span className="text-stone-500">{m.last_date} · {m.rows}</span></div>)}</div>
          <div><div className="mb-1 font-bold text-stone-700">weather cells (fetched_at)</div>
            {(data.weather || []).map((w) => <div key={w.grid_key} className="flex justify-between border-t border-stone-100 py-0.5"><span>{w.grid_key}</span><span className="text-stone-500">{String(w.fetched_at).slice(0, 16).replace('T', ' ')}</span></div>)}</div>
        </div>
      )}
    </Section>
  )
}

export { StatsBar, AvailabilityPanel, DataHealthPanel }
