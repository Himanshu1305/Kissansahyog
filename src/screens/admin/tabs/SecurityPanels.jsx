// Batch 14A - "Security & log" tab: security switches, OTP / SMS usage, admin action log, admin roles.
import { useCallback, useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, Notice, Spinner } from '../../../components/ui'
import { adminGetSecurityStatus, adminSetSecurityFlag, adminGetOtpUsage, adminListActions, adminListUserStatus, adminSetAdminRole } from '../../../lib/admin/adminApi'
import { requiredPhrase, securityChangeOk, LOG_ACTIONS, shortDetails } from '../../../lib/admin/consoleRules'
import { SMS_LOW_THRESHOLD } from '../../../lib/announcements/announcements'
import { getSessionToken, SESSION_HEADER } from '../../../lib/auth/sessionToken'
import { apiUrl } from '../../../lib/apiBase'
import Section from '../Section'
import { useAdmin, AdminError, Dialog, Chip, SuperOnlyNote, istText, btnGreen, btnRed, btnPlain } from '../common'

const FLAGS = [
  { key: 'otp_required', title: 'adm_sec_otp', help: 'adm_sec_otp_help' },
  { key: 'session_enforced', title: 'adm_sec_session', help: 'adm_sec_session_help' },
]

function SecuritySwitchesPanel({ actorId, t, lang }) {
  const { isSuper } = useAdmin()
  const [status, setStatus] = useState(null)
  const [err, setErr] = useState(null)
  const [dlg, setDlg] = useState(null) // { key, value }
  const [reason, setReason] = useState('')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { adminGetSecurityStatus(actorId).then((s) => { setStatus(s); setErr(null) }).catch(setErr) }, [actorId])
  useEffect(() => { if (isSuper) load() }, [isSuper, load])

  const open = (key, value) => { setDlg({ key, value }); setReason(''); setPhrase(''); setErr(null) }
  const need = dlg ? requiredPhrase(dlg.key, dlg.value) : null
  const ok = dlg && securityChangeOk({ key: dlg.key, value: dlg.value, reason, phrase })
  const submit = async () => {
    setBusy(true)
    try { await adminSetSecurityFlag(actorId, dlg.key, dlg.value, reason.trim(), phrase); setDlg(null); load() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <Section title={t('adm_p_security')}>
      {!isSuper ? <SuperOnlyNote t={t} /> : (
        <>
          {!dlg && <AdminError error={err} t={t} />}
          {!status ? (!err && <Spinner />) : FLAGS.map((f) => {
            const s = status[f.key] || {}
            return (
              <div key={f.key} data-testid={`sec-${f.key}`} className="mb-3 rounded-xl border-2 border-stone-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-stone-900">{t(f.title)}</span>
                  <Chip tone={s.value ? 'green' : 'amber'} testId={`sec-${f.key}-state`}>{s.value ? t('adm_on') : t('adm_off')}</Chip>
                </div>
                <p className="mt-1 text-sm text-stone-700">{t(f.help)}</p>
                <p className="mt-1 text-xs text-stone-500">{s.changed_at ? t('adm_sec_changed').replace('{who}', s.changed_by || '-').replace('{when}', istText(s.changed_at, lang)) : t('adm_sec_never')}</p>
                <button type="button" data-testid={`sec-${f.key}-flip`} onClick={() => open(f.key, !s.value)} className={`mt-2 ${s.value ? btnRed : btnGreen}`}>{s.value ? t('adm_turn_off') : t('adm_turn_on')}</button>
              </div>
            )
          })}
        </>
      )}
      {dlg && (
        <Dialog title={t('adm_sec_confirm_title')} onClose={() => setDlg(null)} testId="sec-dialog">
          {dlg.key === 'otp_required' && dlg.value === false && <Notice tone="error">{t('adm_warn_otp_off')}</Notice>}
          {dlg.key === 'session_enforced' && dlg.value === true && <Notice tone="error">{t('adm_warn_sessions_on')}</Notice>}
          <Field label={t('adm_reason')} htmlFor="sec-reason" hint={t('adm_reason_hint')}>
            <TextArea id="sec-reason" data-testid="sec-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {need && (
            <Field label={t('adm_type_phrase').replace('{phrase}', need)} htmlFor="sec-phrase">
              <TextInput id="sec-phrase" data-testid="sec-phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
            </Field>
          )}
          <AdminError error={err} t={t} />
          <div className="flex gap-2">
            <button type="button" className={btnPlain} onClick={() => setDlg(null)}>{t('adm_cancel')}</button>
            <button type="button" data-testid="sec-confirm" disabled={!ok || busy} onClick={submit} className={btnRed}>{t('adm_confirm')}</button>
          </div>
        </Dialog>
      )}
    </Section>
  )
}

function SmsUsagePanel({ actorId, t }) {
  const { isSuper } = useAdmin()
  const [u, setU] = useState(null)
  const [err, setErr] = useState(null)
  const [bal, setBal] = useState(undefined) // undefined = loading, null = unavailable
  useEffect(() => {
    if (!isSuper) return
    adminGetOtpUsage(actorId).then(setU).catch(setErr)
    const token = getSessionToken()
    fetch(apiUrl('/api/admin/sms-balance'), { headers: token ? { [SESSION_HEADER]: token } : {}, signal: AbortSignal.timeout(10000) })
      .then((r) => r.json()).then((j) => setBal(j && typeof j.balance === 'number' ? j.balance : null)).catch(() => setBal(null))
  }, [isSuper, actorId])
  const row = (label, v, id) => <div className="flex justify-between border-t border-stone-100 py-1"><span>{label}</span><span data-testid={id} className="font-bold">{v == null ? t('adm_not_tracked') : v}</span></div>
  return (
    <Section title={t('adm_p_smsusage')}>
      {!isSuper ? <SuperOnlyNote t={t} /> : (
        <>
          <AdminError error={err} t={t} />
          <div className="mb-3 rounded-xl border-2 border-stone-200 p-3" data-testid="sms-balance">
            <div className="text-sm text-stone-600">{t('adm_sms_balance')}</div>
            <div className="text-2xl font-extrabold text-stone-900" data-testid="sms-balance-value">{bal === undefined ? '...' : bal === null ? t('adm_balance_unavailable') : bal}</div>
            {typeof bal === 'number' && bal < SMS_LOW_THRESHOLD && <p data-testid="sms-low" className="mt-1 rounded-lg bg-amber-100 p-2 text-sm font-semibold text-amber-900">{t('adm_sms_low').replace('{n}', String(SMS_LOW_THRESHOLD))}</p>}
          </div>
          {!u ? (!err && <Spinner />) : (
            <div className="text-sm">
              {row(t('adm_sms_today'), u.sent_today, 'sms-today')}
              {row(t('adm_sms_7d'), u.sent_7d, 'sms-7d')}
              {row(t('adm_sms_30d'), u.sent_30d, 'sms-30d')}
              {row(t('adm_sms_verified'), u.verified_30d, 'sms-verified')}
              {row(t('adm_sms_failed'), u.failed_30d, 'sms-failed')}
              {row(t('adm_sms_unregistered'), u.unregistered_30d, 'sms-unreg')}
              {row(t('adm_sms_ratelimited'), u.rate_limited_30d, 'sms-rl')}
              {row(t('adm_sms_login'), u.by_purpose?.login ?? 0, 'sms-login')}
              {row(t('adm_sms_register'), u.by_purpose?.register ?? 0, 'sms-register')}
            </div>
          )}
        </>
      )}
    </Section>
  )
}

const PAGE = 50
function ActionLogPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [action, setAction] = useState('')
  const [admin, setAdmin] = useState('')
  const [admins, setAdmins] = useState([])
  const [page, setPage] = useState(0)
  useEffect(() => { adminListUserStatus(actorId, { status: 'admin', limit: 100 }).then(setAdmins).catch(() => {}) }, [actorId])
  useEffect(() => {
    setRows(null)
    adminListActions(actorId, { limit: PAGE, offset: page * PAGE, action, admin }).then((r) => { setRows(r); setErr(null) }).catch(setErr)
  }, [actorId, action, admin, page])
  const label = (a) => { const k = `adm_act_${a}`; const s = t(k); return s === k ? a : s }
  return (
    <Section title={t('adm_p_actionlog')}>
      <AdminError error={err} t={t} />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <Select data-testid="log-filter-action" aria-label={t('adm_log_action')} value={action} onChange={(e) => { setAction(e.target.value); setPage(0) }}>
          <option value="">{t('adm_log_all_actions')}</option>
          {LOG_ACTIONS.map((a) => <option key={a} value={a}>{label(a)}</option>)}
        </Select>
        <Select data-testid="log-filter-admin" aria-label={t('adm_log_admin')} value={admin} onChange={(e) => { setAdmin(e.target.value); setPage(0) }}>
          <option value="">{t('adm_log_all_admins')}</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </Select>
      </div>
      {!rows ? (!err && <Spinner />) : rows.length === 0 ? <p className="text-stone-500">{t('adm_log_empty')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="log-table">
            <thead><tr className="border-b-2 border-stone-100 text-stone-500">
              <th className="py-2 pr-3">{t('adm_log_when')}</th><th className="py-2 pr-3">{t('adm_log_admin')}</th>
              <th className="py-2 pr-3">{t('adm_log_action')}</th><th className="py-2 pr-3">{t('adm_log_target')}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid="log-row" data-action={r.action} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{istText(r.created_at, lang)}</td>
                  <td className="py-2 pr-3">{r.actor_name || '-'}{r.actor_role && <> <Chip tone={r.actor_role === 'super' ? 'blue' : 'stone'}>{r.actor_role}</Chip></>}</td>
                  <td className="py-2 pr-3 font-semibold">{label(r.action)}</td>
                  <td className="py-2 pr-3 text-stone-600">{r.target_type ? `${r.target_type}${r.target_id ? ` ${String(r.target_id).slice(0, 8)}` : ''}` : ''}<div className="text-xs text-stone-500">{shortDetails(r.details)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className={btnPlain}>{t('adm_prev')}</button>
        <span className="text-sm text-stone-600">{page + 1}</span>
        <button type="button" data-testid="log-next" disabled={!rows || rows.length < PAGE} onClick={() => setPage((p) => p + 1)} className={btnPlain}>{t('adm_next')}</button>
      </div>
    </Section>
  )
}

function RolesPanel({ actorId, t }) {
  const { isSuper } = useAdmin()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => { adminListUserStatus(actorId, { status: 'admin', limit: 100 }).then((r) => { setRows(r); setErr(null) }).catch(setErr) }, [actorId])
  useEffect(() => { load() }, [load])
  const change = async (id, role) => { try { await adminSetAdminRole(actorId, id, role); load() } catch (e) { setErr(e); load() } }
  return (
    <Section title={t('adm_p_roles')}>
      {!isSuper && <SuperOnlyNote t={t} />}
      <AdminError error={err} t={t} />
      <p className="mb-2 text-sm text-stone-600">{t('adm_roles_help')}</p>
      {!rows ? (!err && <Spinner />) : rows.map((a) => (
        <div key={a.id} data-testid="role-row" className="flex flex-wrap items-center gap-2 border-t border-stone-100 py-2">
          <span className="font-semibold">{a.full_name}</span>
          <Chip tone={a.admin_role === 'super' ? 'blue' : 'stone'}>{a.admin_role}</Chip>
          {isSuper && a.id !== actorId && (
            <Select data-testid="role-select" aria-label={t('adm_role')} className="!w-auto" value={a.admin_role || 'editor'} onChange={(e) => change(a.id, e.target.value)}>
              <option value="super">super</option><option value="editor">editor</option>
            </Select>
          )}
          {a.id === actorId && <span className="text-xs text-stone-500">{t('adm_you')}</span>}
        </div>
      ))}
    </Section>
  )
}

export { SecuritySwitchesPanel, SmsUsagePanel, ActionLogPanel, RolesPanel }
