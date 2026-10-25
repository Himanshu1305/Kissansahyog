// Batch 14A - the People tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).
import { useEffect, useState, useCallback } from 'react'
import {
  Field,
  TextInput,
  Select,
  Notice,
  Spinner,
  BigButton,
} from '../../../components/ui'
import { CATEGORY_META } from '../../../lib/listings/catalog'
import {
  getAdminUsers,
  getAdminSourceStats,
  getAdminVendorListings,
  getAdminSubscriptions,
  adminSetSubscriptionActive,
  getAdminFarmerProfiles,
  getSearchMisses,
} from '../../../lib/admin/adminApi'
import { CATEGORIES } from '../../../lib/listings/catalog'
import Section from '../Section'
import { vendorKeyDetail } from '../shared'
import WhatsAppAdminPanel from '../../../components/admin/WhatsAppAdminPanel'

function UsersPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const load = useCallback((q) => {
    getAdminUsers(actorId, { search: q ?? '' }).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load('') }, [load])

  return (
    <Section title={t('admin_users')}>
      {err && <Notice tone="error">{err}</Notice>}
      <div className="mb-3 flex gap-2">
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('user_search_ph')} />
        <BigButton className="!w-auto !py-2" onClick={() => load(search)}>{t('browse')}</BigButton>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_name')}</th>
                <th className="py-2 pr-3">{t('col_contact')}</th>
                <th className="py-2 pr-3">{t('col_village')}</th>
                <th className="py-2 pr-3">{t('col_pincode')}</th>
                <th className="py-2 pr-3">{t('col_listings')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{u.full_name}</td>
                  <td className="py-2 pr-3">{u.phone || u.email || '—'}</td>
                  <td className="py-2 pr-3">{u.village_town || '—'}</td>
                  <td className="py-2 pr-3">{u.pincode}</td>
                  <td className="py-2 pr-3">{u.listing_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// ---- Phase 4: complaints queue (shows age, flags old items; remove / dismiss) ----

function FarmerProfilesPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [interest, setInterest] = useState('all') // all | lease | equipment
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })

  useEffect(() => {
    getAdminFarmerProfiles(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const filtered = (rows || [])
    .filter((r) => {
      if (q && !String(r.village_town || '').toLowerCase().includes(q.toLowerCase())) return false
      if (interest === 'lease' && !r.interest_lease) return false
      if (interest === 'equipment' && !r.interest_equipment) return false
      return true
    })
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const av = a[sort.key], bv = b[sort.key]
      if (sort.key === 'land_acres') return ((Number(av) || 0) - (Number(bv) || 0)) * dir
      return String(av || '').localeCompare(String(bv || '')) * dir
    })

  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')
  const Th = ({ k, children }) => (
    <th className="cursor-pointer py-2 pr-3 select-none" onClick={() => toggleSort(k)}>{children}{arrow(k)}</th>
  )

  return (
    <Section title={`👨‍🌾 ${t('admin_farmers_title')}`}>
      <p id="farmers" className="scroll-mt-16" />
      {err && <Notice tone="error">{err}</Notice>}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('farmer_col_village')} htmlFor="fp_q"><TextInput id="fp_q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('farmer_search_ph')} /></Field>
        <Field label={t('farmer_filter_all')} htmlFor="fp_int">
          <Select id="fp_int" value={interest} onChange={(e) => setInterest(e.target.value)}>
            <option value="all">{t('farmer_filter_all')}</option>
            <option value="lease">{t('farmer_filter_lease')}</option>
            <option value="equipment">{t('farmer_filter_equipment')}</option>
          </Select>
        </Field>
      </div>
      {!rows ? <Spinner /> : (
        <>
          <p className="mb-2 text-sm font-semibold text-stone-700">{t('farmer_count')}: <span className="text-green-800">{filtered.length}</span></p>
          {filtered.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-stone-100 text-stone-500">
                    <Th k="full_name">{t('farmer_col_name')}</Th>
                    <Th k="village_town">{t('farmer_col_village')}</Th>
                    <Th k="land_acres">{t('farmer_col_land')}</Th>
                    <th className="py-2 pr-3">{t('farmer_col_crops')}</th>
                    <th className="py-2 pr-3">{t('farmer_col_lease')}</th>
                    <th className="py-2 pr-3">{t('farmer_col_equipment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100">
                      <td className="py-2 pr-3">{r.full_name || '—'}</td>
                      <td className="py-2 pr-3">{r.village_town || '—'}</td>
                      <td className="py-2 pr-3">{r.land_acres != null ? r.land_acres : '—'}</td>
                      <td className="py-2 pr-3">{r.main_crops || '—'}</td>
                      <td className="py-2 pr-3">{r.interest_lease ? '✅' : '—'}</td>
                      <td className="py-2 pr-3">{r.interest_equipment ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  )
}


function VendorReportPanel({ actorId, t, lang }) {
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [cat, setCat] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    getAdminSourceStats(actorId).then(setStats).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
    getAdminVendorListings(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])

  const filtered = (rows || []).filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false
    const d = r.created_at ? r.created_at.slice(0, 10) : ''
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  function exportCsv() {
    const head = ['Category', 'Type', 'Detail', 'Vendor', 'Phone', 'Email', 'Pincode', 'Village', 'Created', 'Status']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [head.join(',')]
    for (const r of filtered) {
      lines.push([r.category, r.listing_type, vendorKeyDetail(r.details), r.poster_name, r.poster_phone, r.poster_email, r.pincode, r.village_town, r.created_at?.slice(0, 10), r.status].map(esc).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vendor-listings.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Section title={t('admin_vendor_report')}>
      {err && <Notice tone="error">{err}</Notice>}
      {stats && (
        <p className="mb-3 text-sm font-semibold text-stone-700">
          {t('stat_farmer_listings')}: <span className="text-green-800">{stats.farmer_total}</span>
          <span className="mx-2 text-stone-300">|</span>
          {t('stat_vendor_listings')}: <span className="text-amber-700">{stats.vendor_total}</span>
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('col_category')} htmlFor="vr_cat">
          <Select id="vr_cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">{t('vendor_filter_all_cat')}</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_META[c][lang]}</option>))}
          </Select>
        </Field>
        <Field label={t('vendor_from')} htmlFor="vr_from"><TextInput id="vr_from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t('vendor_to')} htmlFor="vr_to"><TextInput id="vr_to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <button onClick={exportCsv} className="mb-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">⬇ {t('vendor_export_csv')}</button>
      </div>
      {!rows ? <Spinner /> : filtered.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_category')}</th>
                <th className="py-2 pr-3">{t('col_detail')}</th>
                <th className="py-2 pr-3">{t('col_vendor')}</th>
                <th className="py-2 pr-3">{t('col_contact')}</th>
                <th className="py-2 pr-3">{t('col_location')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{vendorKeyDetail(r.details)}</td>
                  <td className="py-2 pr-3">{r.poster_name}</td>
                  <td className="py-2 pr-3">{r.poster_phone || r.poster_email || '—'}</td>
                  <td className="py-2 pr-3">{[r.village_town, r.pincode].filter(Boolean).join(' · ')}</td>
                  <td className="py-2 pr-3">{r.status === 'removed' ? t('status_removed') : r.status === 'closed' ? t('badge_found') : t('badge_active')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}


function SubscriptionsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => { getAdminSubscriptions(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  useEffect(() => { load() }, [load])
  function exportCsv() {
    const head = ['phone', 'pincode', 'crops', 'alert_types', 'source_page', 'consented_at', 'is_active']
    const lines = [head.join(',')].concat((rows || []).map((r) => head.map((k) => `"${String(Array.isArray(r[k]) ? r[k].join('|') : (r[k] ?? '')).replace(/"/g, '""')}"`).join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subscriptions.csv'; a.click()
  }
  return (
    <Section title={t('admin_subscriptions')} right={<button onClick={exportCsv} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">CSV</button>}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="p-1">phone</th><th className="p-1">pincode</th><th className="p-1">crops</th><th className="p-1">page</th><th className="p-1"> </th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-stone-100">
              <td className="p-1 font-semibold">{r.phone}</td><td className="p-1">{r.pincode}</td>
              <td className="p-1 text-stone-500">{(r.crops || []).join(', ')}</td><td className="p-1">{r.source_page}</td>
              <td className="p-1"><button onClick={() => adminSetSubscriptionActive(actorId, r.id, !r.is_active).then(load)} className="rounded border px-2 py-0.5 text-xs font-bold">{r.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button></td>
            </tr>))}</tbody>
        </table></div>
      )}
    </Section>
  )
}

// ---- 0024: procurement centres CRUD ----
const EMPTY_PROC = { name_hi: '', location: '', district: 'Sagar', crops: [], season: 'rabi', portal_url: '', notes_hi: '', registration_open: '', is_active: true }

function SearchMissesPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { getSearchMisses(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  return (
    <Section title={t('admin_search_misses')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_search_misses_empty')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-stone-100">
                  <td className="py-1.5 font-semibold text-stone-800">{r.query}</td>
                  <td className="py-1.5 text-right text-stone-500">{r.misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// ---- 0024: alert subscriptions (list, CSV, deactivate) ----

export { UsersPanel, FarmerProfilesPanel, VendorReportPanel, SubscriptionsPanel, SearchMissesPanel, WhatsAppAdminPanel }
