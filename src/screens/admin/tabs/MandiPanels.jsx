// Batch 14A - the Mandi tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).
import { useEffect, useState, useCallback } from 'react'
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Notice,
  Spinner,
} from '../../../components/ui'
import {
  getAdminMsp,
  adminSetMspActive,
  adminUpsertMsp,
  getAdminProcurement,
  adminUpsertProcurement,
  adminDeleteProcurement,
} from '../../../lib/admin/adminApi'
import { getAdminInputPrices, adminSetInputPriceActive, adminUpsertInputPrice } from '../../../lib/inputs/inputsApi'
import Section from '../Section'

function MspPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminMsp(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(m) {
    try { await adminSetMspActive(actorId, m.id, !m.is_active); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertMsp(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  const seasonLabel = (s) => t(s === 'kharif' ? 'tab_kharif' : s === 'rabi' ? 'tab_rabi' : 'season_commercial')

  return (
    <Section
      title={t('admin_msp')}
      right={<button onClick={() => setEditing({ ...EMPTY_MSP })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('msp_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <MspForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} seasonLabel={seasonLabel} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('msp_col_crop')}</th>
                <th className="py-2 pr-3">{t('f_season')}</th>
                <th className="py-2 pr-3">{t('f_marketing_year')}</th>
                <th className="py-2 pr-3">{t('msp_col_price')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{(lang === 'hi' ? m.crop_hi : m.crop_en)}{m.variety ? ` (${m.variety})` : ''}</td>
                  <td className="py-2 pr-3">{seasonLabel(m.season)}</td>
                  <td className="py-2 pr-3">{m.marketing_year}</td>
                  <td className="py-2 pr-3">₹{Number(m.msp_per_quintal).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-3">{m.is_active ? t('expert_active') : t('expert_inactive')}</td>
                  <td className="py-2 pr-3">
                    <button onClick={() => toggle(m)} className="mr-1 rounded-lg border-2 border-stone-300 px-2 py-1 text-xs font-bold text-stone-700">{m.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button>
                    <button onClick={() => setEditing(m)} className="rounded-lg border-2 border-green-700 px-2 py-1 text-xs font-bold text-green-800">{t('action_edit')}</button>
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

function MspForm({ t, initial, onCancel, onSave, seasonLabel }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_crop_en')} htmlFor="msp_ce"><TextInput id="msp_ce" value={f.crop_en} onChange={set('crop_en')} /></Field>
        <Field label={t('f_crop_hi')} htmlFor="msp_ch"><TextInput id="msp_ch" value={f.crop_hi} onChange={set('crop_hi')} /></Field>
        <Field label={t('f_variety')} htmlFor="msp_v"><TextInput id="msp_v" value={f.variety || ''} onChange={set('variety')} /></Field>
        <Field label={t('f_season')} htmlFor="msp_s">
          <Select id="msp_s" value={f.season} onChange={set('season')}>
            <option value="kharif">{seasonLabel('kharif')}</option>
            <option value="rabi">{seasonLabel('rabi')}</option>
            <option value="commercial">{seasonLabel('commercial')}</option>
          </Select>
        </Field>
        <Field label={t('f_marketing_year')} htmlFor="msp_y"><TextInput id="msp_y" value={f.marketing_year} onChange={set('marketing_year')} /></Field>
        <Field label={t('f_msp_price')} htmlFor="msp_p"><TextInput id="msp_p" type="number" value={f.msp_per_quintal} onChange={set('msp_per_quintal')} /></Field>
        <Field label={t('f_increase')} htmlFor="msp_i"><TextInput id="msp_i" type="number" value={f.increase_from_previous ?? ''} onChange={set('increase_from_previous')} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} className="h-5 w-5 accent-green-700" />
        {t('expert_active')}
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

// --- Phase 6: input price tracker management ------------------------------
const EMPTY_INPUT = { item_hi: '', item_en: '', shop_name: '', location: 'Khurai', price: '', unit: '', is_active: true }


function InputPricesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminInputPrices(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(m) {
    try { await adminSetInputPriceActive(actorId, m.id, !m.is_active); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertInputPrice(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section
      title={t('admin_inputs_h')}
      right={<button onClick={() => setEditing({ ...EMPTY_INPUT })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('msp_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <InputPriceForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('inputs_col_item')}</th>
                <th className="py-2 pr-3">{t('inputs_col_shop')}</th>
                <th className="py-2 pr-3">{t('inputs_col_price')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{(lang === 'en' && m.item_en) ? m.item_en : m.item_hi}</td>
                  <td className="py-2 pr-3">{m.shop_name}{m.location ? ` · ${m.location}` : ''}</td>
                  <td className="py-2 pr-3">₹{Number(m.price).toLocaleString('en-IN')}/{m.unit}</td>
                  <td className="py-2 pr-3">{m.is_active ? t('expert_active') : t('expert_inactive')}</td>
                  <td className="py-2 pr-3">
                    <button onClick={() => toggle(m)} className="mr-1 rounded-lg border-2 border-stone-300 px-2 py-1 text-xs font-bold text-stone-700">{m.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button>
                    <button onClick={() => setEditing(m)} className="rounded-lg border-2 border-green-700 px-2 py-1 text-xs font-bold text-green-800">{t('action_edit')}</button>
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

function InputPriceForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('inputs_col_item')} (${t('label_suffix_hi')})`} htmlFor="ip_hi"><TextInput id="ip_hi" value={f.item_hi} onChange={set('item_hi')} /></Field>
        <Field label={`${t('inputs_col_item')} (EN)`} htmlFor="ip_en"><TextInput id="ip_en" value={f.item_en || ''} onChange={set('item_en')} /></Field>
        <Field label={t('inputs_col_shop')} htmlFor="ip_shop"><TextInput id="ip_shop" value={f.shop_name} onChange={set('shop_name')} /></Field>
        <Field label={t('loc_current')} htmlFor="ip_loc"><TextInput id="ip_loc" value={f.location || ''} onChange={set('location')} /></Field>
        <Field label={t('inputs_col_price')} htmlFor="ip_price"><TextInput id="ip_price" type="number" value={f.price} onChange={set('price')} /></Field>
        <Field label="unit" htmlFor="ip_unit"><TextInput id="ip_unit" value={f.unit} onChange={set('unit')} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} className="h-5 w-5 accent-green-700" />
        {t('expert_active')}
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

// --- Community: Kisan Sawaal (Q&A) management -----------------------------
// --- Kisan Mela moderation (pending submissions first) + management -------

function ProcurementPanel({ actorId, t }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(null); const [editing, setEditing] = useState(null)
  const load = useCallback(() => { getAdminProcurement(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  useEffect(() => { load() }, [load])
  async function save(f) { setErr(null); try { await adminUpsertProcurement(actorId, { ...f, crops: typeof f.crops === 'string' ? f.crops.split(',').map((s) => s.trim()).filter(Boolean) : f.crops }); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  return (
    <Section title={t('admin_procurement')} right={<button onClick={() => setEditing({ ...EMPTY_PROC })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+</button>}>
      {err && <Notice tone="error">{err}</Notice>}
      {editing && (
        <div className="mb-3 rounded-xl border-2 border-green-200 bg-green-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="name_hi" htmlFor="pc_n"><TextInput id="pc_n" value={editing.name_hi} onChange={(e) => setEditing((s) => ({ ...s, name_hi: e.target.value }))} /></Field>
            <Field label="location" htmlFor="pc_l"><TextInput id="pc_l" value={editing.location} onChange={(e) => setEditing((s) => ({ ...s, location: e.target.value }))} /></Field>
            <Field label="crops (comma)" htmlFor="pc_c"><TextInput id="pc_c" value={Array.isArray(editing.crops) ? editing.crops.join(', ') : editing.crops} onChange={(e) => setEditing((s) => ({ ...s, crops: e.target.value }))} /></Field>
            <Field label="season" htmlFor="pc_s"><Select id="pc_s" value={editing.season} onChange={(e) => setEditing((s) => ({ ...s, season: e.target.value }))}><option value="rabi">rabi</option><option value="kharif">kharif</option></Select></Field>
            <Field label="portal_url" htmlFor="pc_u"><TextInput id="pc_u" value={editing.portal_url} onChange={(e) => setEditing((s) => ({ ...s, portal_url: e.target.value }))} /></Field>
            <Field label="registration_open" htmlFor="pc_r"><TextInput id="pc_r" type="date" value={editing.registration_open || ''} onChange={(e) => setEditing((s) => ({ ...s, registration_open: e.target.value }))} /></Field>
          </div>
          <Field label="notes_hi" htmlFor="pc_no"><TextArea id="pc_no" value={editing.notes_hi} onChange={(e) => setEditing((s) => ({ ...s, notes_hi: e.target.value }))} /></Field>
          <div className="mt-2 flex gap-2"><button onClick={() => save(editing)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('save')}</button><button onClick={() => setEditing(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">{t('cancel')}</button></div>
        </div>
      )}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">{rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-2">
            <div className="min-w-0 flex-1"><div className="font-bold text-stone-900">{r.name_hi}</div><div className="text-xs text-stone-500">{(r.crops || []).join(', ')} · {r.season}</div></div>
            <button onClick={() => setEditing(r)} className="rounded border-2 border-green-700 px-2 py-0.5 text-xs font-bold text-green-800">{t('action_edit')}</button>
            <button onClick={() => adminDeleteProcurement(actorId, r.id).then(load)} className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">✕</button>
          </div>))}</div>
      )}
    </Section>
  )
}

// ---- 0024: page FAQs CRUD ----
const EMPTY_FAQ = { page_key: 'mausam', q_hi: '', q_en: '', a_hi: '', a_en: '', sort_order: 0 }

export { MspPanel, InputPricesPanel, ProcurementPanel }
