// Batch 14A - People tab: users with block / unblock (super only) and role chips.
import { useCallback, useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, Spinner } from '../../../components/ui'
import { adminListUserStatus, adminSetUserBlocked, adminSetAdminRole } from '../../../lib/admin/adminApi'
import { blockReasonOk } from '../../../lib/admin/consoleRules'
import Section from '../Section'
import { useAdmin, AdminError, Dialog, Chip, istText, btnGreen, btnRed, btnPlain } from '../common'

const PAGE = 25

export default function UserStatusPanel({ actorId, t, lang }) {
  const { isSuper } = useAdmin()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [dlg, setDlg] = useState(null) // { user, block }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    adminListUserStatus(actorId, { search: q, status, limit: PAGE, offset: page * PAGE }).then((r) => { setRows(r); setErr(null) }).catch((e) => { setErr(e); setRows([]) })
  }, [actorId, q, status, page])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    setBusy(true)
    try { await adminSetUserBlocked(actorId, dlg.user.id, dlg.block, reason.trim()); setDlg(null); setReason(''); load() } catch (e) { setErr(e); setDlg(null) } finally { setBusy(false) }
  }
  const setRole = async (id, role) => { try { await adminSetAdminRole(actorId, id, role); load() } catch (e) { setErr(e); load() } }

  return (
    <Section title={t('adm_p_userstatus')}>
      <AdminError error={err} t={t} />
      <form className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); setPage(0); setQ(search) }}>
        <TextInput data-testid="us-search" aria-label={t('user_search_ph')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('user_search_ph')} />
        <Select data-testid="us-status" aria-label={t('adm_us_status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} className="!w-auto">
          <option value="all">{t('adm_us_all')}</option><option value="active">{t('adm_us_active')}</option>
          <option value="blocked">{t('adm_us_blocked')}</option><option value="admin">{t('adm_us_admins')}</option>
        </Select>
        <button type="submit" className={btnGreen}>{t('browse')}</button>
      </form>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="us-table">
            <thead><tr className="border-b-2 border-stone-100 text-stone-500">
              <th className="py-2 pr-3">{t('col_name')}</th><th className="py-2 pr-3">{t('col_village')}</th>
              <th className="py-2 pr-3">{t('adm_us_status')}</th><th className="py-2 pr-3" />
            </tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} data-testid="us-row" data-blocked={u.is_blocked ? '1' : '0'} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-3"><div className="font-semibold">{u.full_name}</div><div className="text-xs text-stone-500">{u.phone_last4 ? `****${u.phone_last4}` : ''}</div></td>
                  <td className="py-2 pr-3">{u.village_town || '-'}<div className="text-xs text-stone-500">{u.pincode}</div></td>
                  <td className="py-2 pr-3">
                    <Chip tone={u.is_blocked ? 'red' : 'green'} testId="us-chip">{u.is_blocked ? t('adm_us_blocked_chip') : t('adm_us_active_chip')}</Chip>
                    {u.admin_role && <> <Chip tone={u.admin_role === 'super' ? 'blue' : 'stone'}>{u.admin_role}</Chip></>}
                    {u.is_blocked && <div className="mt-1 text-xs text-stone-600" data-testid="us-reason">{u.blocked_reason}{u.blocked_at ? ` (${istText(u.blocked_at, lang)})` : ''}</div>}
                  </td>
                  <td className="py-2 pr-0">
                    {isSuper && !u.admin_role && (u.is_blocked
                      ? <button type="button" data-testid="us-unblock" onClick={() => { setReason(''); setDlg({ user: u, block: false }) }} className={btnGreen}>{t('adm_unblock')}</button>
                      : <button type="button" data-testid="us-block" onClick={() => { setReason(''); setDlg({ user: u, block: true }) }} className={btnRed}>{t('adm_block')}</button>)}
                    {isSuper && u.admin_role && u.id !== actorId && (
                      <Select data-testid="us-role" aria-label={t('adm_role')} className="!w-auto" value={u.admin_role} onChange={(e) => setRole(u.id, e.target.value)}>
                        <option value="super">super</option><option value="editor">editor</option>
                      </Select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className={btnPlain}>{t('adm_prev')}</button>
        <span className="text-sm text-stone-600">{page + 1}</span>
        <button type="button" disabled={!rows || rows.length < PAGE} onClick={() => setPage((p) => p + 1)} className={btnPlain}>{t('adm_next')}</button>
      </div>
      {dlg && (
        <Dialog title={dlg.block ? t('adm_block_title') : t('adm_unblock_title')} onClose={() => setDlg(null)} testId="us-dialog">
          <p className="mb-2 font-semibold">{dlg.user.full_name}</p>
          <Field label={t('adm_reason')} htmlFor="us-reason-in" hint={t('adm_reason_hint_short')}>
            <TextArea id="us-reason-in" data-testid="us-reason-input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button type="button" className={btnPlain} onClick={() => setDlg(null)}>{t('adm_cancel')}</button>
            <button type="button" data-testid="us-confirm" disabled={!blockReasonOk(reason) || busy} onClick={submit} className={dlg.block ? btnRed : btnGreen}>{t('adm_confirm')}</button>
          </div>
        </Dialog>
      )}
    </Section>
  )
}
