import { useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import { ContentBlocks, CiteProvider, SourcesList, LastUpdated, buildContentJsonLd, collectCiteIds } from '../components/content'
import { grievancePage } from '../content/pages/grievance.js'
import { submitFeedback, validateFeedback, feedbackMailto, FEEDBACK_KINDS, PUBLIC_KINDS, FEEDBACK_MAX } from '../lib/feedback/feedbackApi'

// /grievance — Feedback & Grievance (Batch 7A, form reworked in 7B). A friendly form
// on top (one contact box that takes an e-mail address or a mobile number, a type
// and a message — nothing about who the person is), the general e-mail address, and a
// short collapsed "More information" section (how complaints work + FAQ; Batch 7E
// removed the officer, appeal and response-time content). The grievance address is
// only the destination of the form's e-mail fallback (feedbackMailto).
const GENERAL_EMAIL = 'hello@kissansahyog.com'
const field = 'w-full rounded-xl border-2 border-stone-300 bg-white p-3 text-[17px] text-stone-900 focus:border-[var(--ks-green)] focus:outline-none'
const label = 'mb-1 block text-[16px] font-bold text-stone-900'

export default function Grievance() {
  const { t, lang } = useLang()
  const p = (v) => v?.[lang] ?? v?.hi ?? ''
  const [contact, setContact] = useState('')
  const [kind, setKind] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [publicOk, setPublicOk] = useState(false) // opt-in, never pre-ticked
  const [contactErr, setContactErr] = useState(null)
  const [trap, setTrap] = useState('') // honeypot: people never see or fill this
  const [err, setErr] = useState(null)
  const [mailto, setMailto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setErr(null); setMailto(null); setContactErr(null)
    const invalid = validateFeedback({ contact, message })
    if (invalid?.field === 'contact') { setContactErr(t(invalid.key)); document.getElementById('fb-contact')?.focus(); return }
    if (invalid) { setErr(t(invalid.key)); return }
    // A filled honeypot is a bot: show the thank-you and store nothing.
    if (trap) { setDone(true); return }
    setBusy(true)
    try {
      await submitFeedback({ contact, kind, message, lang, publicOk: canBePublic && publicOk })
      setDone(true); setMessage(''); setPublicOk(false)
    } catch (ex) {
      setErr(t(ex.i18nKey || 'fb_err_unavailable'))
      if (ex.canEmail) setMailto(feedbackMailto({ kindLabel: t(`fb_type_${kind}`), message }))
    } finally {
      setBusy(false)
    }
  }

  // Only a suggestion / other may be shown publicly, and only if the person ticks the box.
  const canBePublic = PUBLIC_KINDS.includes(kind)

  return (
    <PageShell width="content" crumbs={[{ label: t('footer_grievance') }]}>
      <Seo
        title={p(grievancePage.title).slice(0, 60)}
        description={p(grievancePage.description).slice(0, 155)}
        path="/grievance"
        jsonLd={buildContentJsonLd(grievancePage.blocks, lang)}
      />

      <h1 className="text-3xl font-extrabold text-stone-900">{p(grievancePage.h1)}</h1>
      <p className="mt-3 text-[18px] leading-relaxed text-stone-700">{p(grievancePage.intro)}</p>

      {done ? (
        <div role="status" data-testid="feedback-done" className="mt-5 rounded-2xl border-2 border-green-200 bg-green-50 p-5">
          <p className="text-[20px] font-extrabold text-green-900">{t('fb_done_title')}</p>
          <p className="mt-2 text-[17px] leading-relaxed text-green-900">{t('fb_done_body')}</p>
          <button type="button" onClick={() => setDone(false)} className="mt-4 rounded-xl border-2 border-[var(--ks-green)] px-4 py-2 text-[16px] font-bold text-[var(--ks-green)]">
            {t('fb_done_again')}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate data-testid="feedback-form" className="mt-5 space-y-5 rounded-2xl border border-[var(--ks-border)] bg-white p-4 md:p-6">
          <div>
            <label htmlFor="fb-contact" className={label}>{t('fb_contact_label')}</label>
            {/* type="text": the box takes an e-mail address or a mobile number. */}
            <input
              id="fb-contact" name="contact" type="text" required autoComplete="off" autoCapitalize="none" spellCheck={false}
              value={contact} onChange={(e) => { setContact(e.target.value); if (contactErr) setContactErr(null) }}
              aria-invalid={contactErr ? 'true' : undefined}
              aria-describedby={contactErr ? 'fb-contact-error fb-contact-hint' : 'fb-contact-hint'}
              className={`${field} ${contactErr ? '!border-red-600' : ''}`}
            />
            {contactErr && <p id="fb-contact-error" role="alert" data-testid="feedback-contact-error" className="mt-1 text-[15px] font-semibold text-red-700">{contactErr}</p>}
            <p id="fb-contact-hint" className="mt-1 text-[14px] text-stone-600">{t('fb_contact_hint')}</p>
          </div>

          <fieldset>
            <legend className={label}>{t('fb_type_label')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_KINDS.map((k) => (
                <label key={k} className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-center text-[16px] font-bold focus-within:ring-2 focus-within:ring-[var(--ks-green)] ${kind === k ? 'border-[var(--ks-green)] bg-[var(--ks-green-tint)] text-[var(--ks-green-dark)]' : 'border-stone-300 bg-white text-stone-700'}`}>
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                  {t(`fb_type_${k}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="fb-message" className={label}>{t('fb_message_label')}</label>
            <textarea
              id="fb-message" name="message" required rows={6} maxLength={FEEDBACK_MAX}
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={t('fb_message_ph')} className={field}
            />
          </div>

          {/* Public display: opt-in for a suggestion / other; never for a problem. */}
          {canBePublic ? (
            <div data-testid="feedback-public">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-3">
                <input
                  type="checkbox" name="public_ok" checked={publicOk} onChange={(e) => setPublicOk(e.target.checked)}
                  aria-describedby="fb-public-note" className="mt-1 h-6 w-6 shrink-0 accent-green-700"
                />
                <span className="text-[16px] leading-relaxed text-stone-800">{t('fb_public_ok')}</span>
              </label>
              <p id="fb-public-note" className="mt-1 text-[14px] text-stone-600">{t('fb_public_note')}</p>
            </div>
          ) : (
            <p data-testid="feedback-private-note" className="rounded-xl bg-stone-100 px-3 py-2 text-[15px] text-stone-700">{t('fb_problem_note')}</p>
          )}

          {/* Honeypot — hidden from people and assistive tech; only bots fill it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="fb-leave-empty">Leave this empty</label>
            <input id="fb-leave-empty" name="ks_leave_empty" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </div>

          {err && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[16px] font-semibold text-red-800">
              <p>{err}</p>
              {mailto && (
                <a href={mailto} data-testid="feedback-mailto" className="mt-2 inline-block rounded-lg bg-[var(--ks-green)] px-4 py-2 font-bold text-white">
                  {t('fb_send_email')}
                </a>
              )}
            </div>
          )}

          <button type="submit" disabled={busy} className="min-h-[48px] w-full rounded-xl bg-[var(--ks-green)] px-5 text-[18px] font-extrabold text-white disabled:opacity-60 md:w-auto">
            {busy ? t('fb_sending') : t('fb_submit')}
          </button>
        </form>
      )}

      <p className="mt-4 text-[15px] text-stone-600">
        {t('fb_direct_email')} <a href={`mailto:${GENERAL_EMAIL}`} data-testid="feedback-direct-email" className="font-semibold text-green-800 underline">{GENERAL_EMAIL}</a>
      </p>

      {/* How complaints work + FAQ — folded away by default. */}
      <details data-testid="grievance-legal" className="mt-8 rounded-2xl border border-[var(--ks-border)] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-[17px] font-bold text-stone-900">{t('fb_legal_summary')}</summary>
        <div className="border-t border-[var(--ks-border)] px-4 pb-4 pt-3">
          <CiteProvider orderedIds={collectCiteIds(grievancePage.blocks)}>
            <article className="content-page">
              <h2 className="mb-2 text-2xl font-bold text-stone-900">{p(grievancePage.legal_h2)}</h2>
              {grievancePage.updated && <LastUpdated date={grievancePage.updated} checked={grievancePage.checked} className="mb-4" />}
              <ContentBlocks blocks={grievancePage.blocks} />
              <SourcesList />
            </article>
          </CiteProvider>
        </div>
      </details>
    </PageShell>
  )
}
