import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Field, TextInput, Select, BigButton, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import { changePassword } from '../lib/auth/authService'
import { getMyListings } from '../lib/listings/listingsApi'
import { CATEGORY_META, CATEGORIES } from '../lib/listings/catalog'

// Authenticated user profile: edit info, listings summary, account management.
export default function Profile() {
  const { t, lang, setLang } = useLang()
  const { user, updateProfile, deleteAccount } = useAuth()
  const navigate = useNavigate()

  const isEmail = user?.auth_provider === 'email'

  const [form, setForm] = useState({
    full_name: user?.full_name || '', village_town: user?.village_town || '', pincode: user?.pincode || '', language: user?.preferred_language || lang,
  })
  const [saveMsg, setSaveMsg] = useState(null)
  const [saveErr, setSaveErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const [counts, setCounts] = useState(null)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwErr, setPwErr] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [delBusy, setDelBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getMyListings(user.id)
      .then((rows) => {
        if (!alive) return
        const active = rows.filter((r) => r.status === 'active' && !r.is_expired)
        const byCat = {}
        for (const c of CATEGORIES) byCat[c] = active.filter((r) => r.category === c).length
        setCounts({ total: active.length, byCat })
      })
      .catch(() => alive && setCounts({ total: 0, byCat: {} }))
    return () => { alive = false }
  }, [user.id])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaveErr(null); setSaveMsg(null); setSaving(true)
    try {
      await updateProfile(form)
      setLang(form.language)
      setSaveMsg(t('profile_saved'))
    } catch (err) {
      setSaveErr(t(err.i18nKey || 'err_unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function submitPassword() {
    setPwErr(null); setPwMsg(null)
    if (pw.next !== pw.confirm) { setPwErr(t('err_password_mismatch')); return }
    setPwBusy(true)
    try {
      await changePassword({ email: user.email, currentPassword: pw.current, newPassword: pw.next })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg(t('password_changed'))
    } catch (err) {
      setPwErr(t(err.i18nKey || 'err_unknown'))
    } finally {
      setPwBusy(false)
    }
  }

  async function doDelete() {
    setDelBusy(true)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch {
      setDelBusy(false)
      setConfirmDelete(false)
    }
  }

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : ''

  return (
    <Screen title={t('my_profile')} onBack={() => navigate('/home')} right={<LanguageToggle />}>
      {/* 3a — editable profile info */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-stone-800">{t('profile_info_title')}</h2>
        {saveErr && <Notice tone="error">{saveErr}</Notice>}
        {saveMsg && <Notice tone="success">{saveMsg}</Notice>}

        <Field label={t('full_name')} htmlFor="pf_name" required>
          <TextInput id="pf_name" value={form.full_name} onChange={set('full_name')} />
        </Field>

        {isEmail ? (
          <Field label={t('email_label')} htmlFor="pf_email">
            <TextInput id="pf_email" value={user.email || ''} readOnly className="bg-stone-100 text-stone-500" />
          </Field>
        ) : (
          <Field label={t('phone_number')} htmlFor="pf_phone">
            <TextInput id="pf_phone" value={user.phone || ''} readOnly className="bg-stone-100 text-stone-500" />
          </Field>
        )}

        <Field label={t('village_town')} htmlFor="pf_village">
          <TextInput id="pf_village" value={form.village_town} onChange={set('village_town')} placeholder={t('village_ph')} />
        </Field>

        <Field label={t('pincode')} htmlFor="pf_pincode" required hint={t('pincode_help')}>
          <TextInput id="pf_pincode" type="tel" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} />
        </Field>

        <Field label={t('language')} htmlFor="pf_lang">
          <Select id="pf_lang" value={form.language} onChange={set('language')}>
            <option value="hi">{t('hindi')}</option>
            <option value="en">{t('english')}</option>
          </Select>
        </Field>

        {saving ? <Spinner /> : <BigButton onClick={save}>{t('save_changes')}</BigButton>}
      </section>

      {/* 3b — listings summary */}
      <section className="mb-6 rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-bold text-stone-800">{t('my_listings')}</h2>
        {counts === null ? (
          <Spinner />
        ) : (
          <>
            <p className="text-stone-700">
              <span className="text-2xl font-extrabold text-green-800">{counts.total}</span> {t('active_listings_summary')}
            </p>
            {counts.total > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {CATEGORIES.filter((c) => counts.byCat[c] > 0).map((c) => (
                  <span key={c} className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">
                    {CATEGORY_META[c].icon} {CATEGORY_META[c][lang]}: {counts.byCat[c]}
                  </span>
                ))}
              </div>
            )}
            <button type="button" onClick={() => navigate('/my')} className="mt-3 text-sm font-bold text-green-800 underline">
              {t('my_listings')} →
            </button>
            {joined && <p className="mt-3 text-sm text-stone-500">{t('member_since')} {joined}</p>}
          </>
        )}
      </section>

      {/* 3c — account management */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-stone-800">{t('account_section')}</h2>

        {isEmail && (
          <div className="mb-4 rounded-2xl border-2 border-stone-200 bg-white p-4">
            <h3 className="mb-2 font-bold text-stone-800">{t('change_password')}</h3>
            {pwErr && <Notice tone="error">{pwErr}</Notice>}
            {pwMsg && <Notice tone="success">{pwMsg}</Notice>}
            <Field label={t('current_password')} htmlFor="pw_cur">
              <TextInput id="pw_cur" type="password" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} autoComplete="current-password" />
            </Field>
            <Field label={t('new_password')} htmlFor="pw_new">
              <TextInput id="pw_new" type="password" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} placeholder={t('password_ph')} autoComplete="new-password" />
            </Field>
            <Field label={t('confirm_password')} htmlFor="pw_confirm">
              <TextInput id="pw_confirm" type="password" value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} autoComplete="new-password" />
            </Field>
            {pwBusy ? <Spinner /> : <BigButton variant="secondary" onClick={submitPassword}>{t('change_password')}</BigButton>}
          </div>
        )}

        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          {!confirmDelete ? (
            <BigButton variant="danger" onClick={() => setConfirmDelete(true)}>{t('delete_account')}</BigButton>
          ) : (
            <div>
              <p className="mb-3 font-semibold text-red-800">{t('delete_account_confirm')}</p>
              {delBusy ? (
                <Spinner />
              ) : (
                <div className="flex gap-2">
                  <BigButton variant="danger" onClick={doDelete}>{t('delete_account_yes')}</BigButton>
                  <BigButton variant="plain" onClick={() => setConfirmDelete(false)}>{t('cancel')}</BigButton>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Screen>
  )
}
