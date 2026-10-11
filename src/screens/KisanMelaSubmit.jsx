import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { Screen, Field, TextInput, BigButton, Notice, Spinner, Select } from '../components/ui'
import { submitMela, MELA_TAGS } from '../lib/mela/melaApi'
import { CANONICAL_STATES, stateLabel } from '../content/states.js'

// Public submission form (Phase 4a) — same submit UX spirit as the Kisan Sawaal "ask" form.
// Lands as moderation_status='pending' (RLS-enforced), invisible until an admin approves.
export default function KisanMelaSubmit() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [f, setF] = useState({
    name_hi: '', organizer_name: '', venue: '', address: '', state: '', district: '',
    event_date_start: '', event_date_end: '', date_unknown: false, expected_period: '',
    contact_name: '', contact_number: '', source_url: '', relationship: 'aware',
  })
  const [tags, setTags] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggleTag = (tag) => setTags((s) => (s.includes(tag) ? s.filter((x) => x !== tag) : [...s, tag]))

  async function submit() {
    setErr(null); setBusy(true)
    try {
      await submitMela({ ...f, category_tags: tags })
      setOk(true)
    } catch (e) {
      setErr(t(e.i18nKey || 'err_unknown'))
    } finally { setBusy(false) }
  }

  return (
    <Screen title={t('mela_form_title')} onBack={() => navigate('/kisan-mela')}>
      {ok ? (
        <div className="py-6 text-center">
          <div className="text-5xl">✅</div>
          {/* ks-allow-width: submitted confirmation text */}
          <p className="mt-4 text-lg font-bold text-green-800">{t('mela_f_submitted')}</p>
          <BigButton className="mt-6" onClick={() => navigate('/kisan-mela')}>{t('mela_home_all')}</BigButton>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-stone-600">{t('mela_form_intro')}</p>
          {err && <Notice tone="error">{err}</Notice>}

          <Field label={t('mela_f_name')} htmlFor="m_name" required><TextInput id="m_name" value={f.name_hi} onChange={set('name_hi')} /></Field>
          <Field label={t('mela_f_organizer')} htmlFor="m_org"><TextInput id="m_org" value={f.organizer_name} onChange={set('organizer_name')} /></Field>
          <Field label={t('mela_f_venue')} htmlFor="m_venue" required><TextInput id="m_venue" value={f.venue} onChange={set('venue')} /></Field>
          <Field label={t('mela_f_address')} htmlFor="m_addr"><TextInput id="m_addr" value={f.address} onChange={set('address')} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('mela_f_state')} htmlFor="m_state" required>
              {/* Canonical dropdown (1b) so a submission can never introduce a new state-name variant. */}
              <Select id="m_state" value={f.state} onChange={set('state')} data-testid="m-state-select">
                <option value="">{t('mela_f_state_choose')}</option>
                {CANONICAL_STATES.slice().sort((a, b) => a.en.localeCompare(b.en)).map((st) => (
                  <option key={st.en} value={st.en}>{stateLabel(st.en, lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('mela_f_district')} htmlFor="m_dist"><TextInput id="m_dist" value={f.district} onChange={set('district')} /></Field>
          </div>

          {/* Dates — or "तारीख़ पक्की नहीं" → an expected period instead (never guess). */}
          <label className="my-2 flex items-center gap-2 text-base font-medium text-stone-800">
            <input type="checkbox" checked={f.date_unknown} onChange={set('date_unknown')} className="h-5 w-5 accent-green-700" data-testid="m-date-unknown" />
            {t('mela_f_date_unknown')}
          </label>
          {f.date_unknown ? (
            <Field label={t('mela_f_expected')} htmlFor="m_exp"><TextInput id="m_exp" value={f.expected_period} onChange={set('expected_period')} placeholder="e.g. Feb 2027" /></Field>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('mela_f_date_start')} htmlFor="m_ds"><TextInput id="m_ds" type="date" value={f.event_date_start} onChange={set('event_date_start')} /></Field>
              <Field label={t('mela_f_date_end')} htmlFor="m_de"><TextInput id="m_de" type="date" value={f.event_date_end} onChange={set('event_date_end')} /></Field>
            </div>
          )}

          {/* Category tags */}
          <Field label={t('mela_f_offering')}>
            <div className="flex flex-wrap gap-2">
              {MELA_TAGS.map((tag) => {
                const on = tags.includes(tag)
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-pressed={on}
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'}`}>
                    {t(`mela_tag_${tag}`)}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('mela_f_contact_name')} htmlFor="m_cn"><TextInput id="m_cn" value={f.contact_name} onChange={set('contact_name')} /></Field>
            <Field label={t('mela_f_contact_number')} htmlFor="m_cnum"><TextInput id="m_cnum" type="tel" inputMode="numeric" value={f.contact_number} onChange={set('contact_number')} /></Field>
          </div>
          <Field label={t('mela_f_source')} htmlFor="m_src"><TextInput id="m_src" value={f.source_url} onChange={set('source_url')} placeholder="https://…" /></Field>

          <Field label={t('mela_f_relationship')} htmlFor="m_rel">
            <div className="flex flex-wrap gap-4 pt-1">
              {[['hosting', t('mela_rel_hosting')], ['aware', t('mela_rel_aware')]].map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 text-base text-stone-800">
                  <input type="radio" name="m_rel" value={v} checked={f.relationship === v} onChange={set('relationship')} className="h-4 w-4 accent-green-700" />
                  {label}
                </label>
              ))}
            </div>
          </Field>

          {busy ? <Spinner /> : <BigButton className="mt-3" onClick={submit}>{t('mela_f_submit')}</BigButton>}
        </div>
      )}
    </Screen>
  )
}
