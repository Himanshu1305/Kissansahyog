import { cardDataUrl, historyList, voiceDataUrl, voiceFileName, whatsappTextUrl } from '../../lib/admin/morningLogic'

// Batch 16B - the look of /admin/morning. Stateless: the container (screens/AdminMorning.jsx) owns the data and the handlers,
// so this file can be rendered in a unit test with a fake t(). Mobile first: one column, 48 px buttons, big Copy button.
// Marker for the ship check: data-testid="morning-post-admin".

// same classes as the console buttons (screens/admin/common.jsx), kept here so this file imports nothing but pure helpers
const btn = 'inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 text-base font-bold'
const btnGreen = `${btn} bg-green-700 text-white disabled:opacity-50`
const btnPlain = `${btn} bg-stone-200 text-stone-800`
const field = 'w-full rounded-xl border-2 border-stone-300 bg-white p-3 text-base leading-relaxed text-stone-900'

export function MorningDenied({ t, onHome }) {
  return (
    <div className="py-20 text-center" data-testid="morning-denied">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">{t('access_denied')}</h1>
      <p className="mt-2 text-stone-600">{t('access_denied_body')}</p>
      <button onClick={onHome} className="mt-6 font-bold text-green-800 underline">{t('nav_home')}</button>
    </div>
  )
}

export function EmptyState({ t }) {
  return (
    <div data-testid="morning-empty" className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4">
      <p className="text-lg font-bold text-stone-900">{t('mp_empty_title')}</p>
      <p className="mt-2 text-stone-700">{t('mp_empty_body')}</p>
      <p className="mt-2 text-sm text-stone-600">{t('mp_empty_manual')}</p>
    </div>
  )
}

export default function MorningView({
  t, date, dateText, today, post, history, historyRows, nextDisabled, prevDisabled,
  copied, copyFailed, pollCopied, canShare, canShareAll, busy, pctValue, pctMsg, pctError, resultDateText, postedText, generatedText,
  refs, on,
}) {
  const img = cardDataUrl(post?.card_png_b64)
  const voice = voiceDataUrl(post?.voice_mp3_b64)
  return (
    <div data-testid="morning-post-admin" data-date={date}>
      <h1 className="mb-3 text-2xl font-bold text-stone-900">{t('mp_title')}</h1>

      <div className="mb-4 flex items-center gap-2" data-testid="morning-datenav">
        <button type="button" data-testid="morning-prev" aria-label={t('mp_prev')} disabled={prevDisabled} onClick={on.prev} className={`${btnPlain} min-w-[48px] disabled:opacity-40`}>◀</button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-extrabold text-stone-900" data-testid="morning-date">{dateText}</div>
          {date !== today && <button type="button" onClick={on.today} className="text-sm font-bold text-green-800 underline">{t('mp_go_today')}</button>}
        </div>
        <button type="button" data-testid="morning-next" aria-label={t('mp_next')} disabled={nextDisabled} onClick={on.next} className={`${btnPlain} min-w-[48px] disabled:opacity-40`}>▶</button>
      </div>

      {history.state === 'loading' && <p className="mb-4 text-stone-600">{t('mp_loading')}</p>}
      {history.error && <p className="mb-4 rounded-xl bg-red-50 p-3 font-semibold text-red-800" data-testid="morning-error">{t(history.error)}</p>}

      {!post && history.state === 'ready' && <EmptyState t={t} />}

      {post && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-lg font-bold text-stone-800">{t('mp_message')}</h2>
            <textarea ref={refs.msg} readOnly rows={14} data-testid="morning-message" value={post.message_text} className={field} onFocus={(e) => e.target.select()} />
            <button type="button" data-testid="morning-copy" onClick={on.copyMsg} className={`${btnGreen} mt-2 w-full min-h-[56px] text-lg`}>{copied ? t('mp_copied') : t('mp_copy_msg')}</button>
            <p role="status" aria-live="polite" className="mt-1 min-h-[1.5rem] text-sm font-semibold text-green-800" data-testid="morning-copied">{copied ? t('mp_copied') : ''}</p>
            {copyFailed && <p className="mt-1 text-sm font-semibold text-amber-900" data-testid="morning-copyfail">{t('mp_copy_failed')}</p>}
            <button type="button" data-testid="morning-selectall" onClick={on.selectAll} className={`${btnPlain} mt-1 w-full`}>{t('mp_select_all')}</button>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-stone-800">{t('mp_card')}</h2>
            {img ? (
              <>
                <img src={img} alt={t('mp_card')} width="1080" height="1350" data-testid="morning-card" className="mx-auto w-full max-w-sm rounded-xl border-2 border-stone-200" />
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <a href={img} download={on.cardName} data-testid="morning-download" className={`${btnGreen} flex-1`}>{t('mp_download')}</a>
                  {canShare && <button type="button" data-testid="morning-share" onClick={on.share} className={`${btnPlain} flex-1`}>{t('mp_share')}</button>}
                </div>
              </>
            ) : <p className="text-stone-600">{t('mp_card_missing')}</p>}
          </section>

          <section data-testid="morning-voice-section">
            <h2 className="mb-2 text-lg font-bold text-stone-800">{t('mp_voice')}</h2>
            {voice ? (
              <>
                <audio controls preload="none" src={voice} data-testid="morning-voice" aria-label={t('mp_voice_player')} className="w-full" />
                <a href={voice} download={voiceFileName(date)} data-testid="morning-voice-download" aria-label={t('mp_voice_download')} className={`${btnGreen} mt-2 w-full`}>{t('mp_voice_download')}</a>
              </>
            ) : <p className="rounded-xl bg-amber-50 p-3 font-semibold text-amber-900" data-testid="morning-voice-missing">{t('mp_voice_missing')}</p>}
            {post.voice_script && (
              <details data-testid="morning-voice-script" className="mt-2 rounded-2xl border-2 border-stone-200 bg-white p-3">
                <summary className="min-h-[44px] cursor-pointer font-bold text-stone-800">{t('mp_voice_script')}</summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-stone-800">{post.voice_script}</p>
              </details>
            )}
          </section>

          <section data-testid="morning-send">
            <a href={whatsappTextUrl(post.message_text)} target="_blank" rel="noopener noreferrer" data-testid="morning-wa-text" aria-label={t('mp_wa_text')} className={`${btnGreen} w-full min-h-[56px]`}>{t('mp_wa_text')}</a>
            {canShareAll
              ? <button type="button" data-testid="morning-share-all" aria-label={t('mp_share_all')} onClick={on.shareAll} className={`${btnGreen} mt-2 w-full min-h-[56px]`}>{t('mp_share_all')}</button>
              : <p className="mt-2 text-sm text-stone-600" data-testid="morning-share-all-hint">{t('mp_share_all_hint')}</p>}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-stone-800">{t('mp_poll')}</h2>
            {post.poll_text ? (
              <>
                <textarea readOnly rows={5} data-testid="morning-poll" value={post.poll_text} className={field} onFocus={(e) => e.target.select()} />
                <button type="button" data-testid="morning-copy-poll" onClick={on.copyPoll} className={`${btnGreen} mt-2 w-full`}>{pollCopied ? t('mp_copied') : t('mp_copy_poll')}</button>
              </>
            ) : <p className="text-stone-600">{t('mp_poll_missing')}</p>}
          </section>

          <section className="rounded-2xl border-2 border-stone-200 bg-white p-3">
            <p className="mb-2 font-semibold text-stone-800" data-testid="morning-posted-text">{post.posted_at ? t('mp_posted_at').replace('{t}', postedText) : t('mp_not_posted')}</p>
            <button type="button" data-testid="morning-mark" disabled={busy} onClick={on.mark} className={`${post.posted_at ? btnPlain : btnGreen} w-full`}>{post.posted_at ? t('mp_unmark_posted') : t('mp_mark_posted')}</button>
          </section>

          <details data-testid="morning-report" className="rounded-2xl border-2 border-stone-200 bg-white p-3">
            <summary className="min-h-[44px] cursor-pointer font-bold text-stone-800">{t('mp_report')}</summary>
            {generatedText && <p className="mt-2 text-sm text-stone-600">{t('mp_generated_at').replace('{t}', generatedText)}</p>}
            <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-800">{post.report_text || ''}</pre>
          </details>
        </div>
      )}

      <section className="mt-6 rounded-2xl border-2 border-stone-200 bg-white p-3" data-testid="morning-pollresult">
        <h2 className="text-lg font-bold text-stone-800">{t('mp_poll_result_h')} <span className="text-sm font-semibold text-stone-500">({resultDateText})</span></h2>
        <p className="mt-1 text-sm text-stone-600">{t('mp_poll_result_help')}</p>
        <label className="mt-2 block text-sm font-bold text-stone-800" htmlFor="morning-pct">{t('mp_poll_result_label')}</label>
        <input id="morning-pct" data-testid="morning-pct" type="number" inputMode="numeric" min="0" max="100" step="1" value={pctValue} onChange={on.pct} className={`${field} mt-1`} />
        {pctError && <p className="mt-1 text-sm font-semibold text-red-800" data-testid="morning-pct-error">{t(pctError)}</p>}
        <button type="button" data-testid="morning-pct-save" disabled={busy} onClick={on.savePct} className={`${btnGreen} mt-2 w-full`}>{t('mp_poll_result_save')}</button>
        {pctMsg && <p role="status" className="mt-1 text-sm font-semibold text-green-800">{t(pctMsg)}</p>}
      </section>

      <section className="mt-6" data-testid="morning-history">
        <h2 className="mb-2 text-lg font-bold text-stone-800">{t('mp_history')}</h2>
        <ul className="divide-y divide-stone-200 rounded-2xl border-2 border-stone-200 bg-white">
          {historyList(today, historyRows).map((h) => (
            <li key={h.date}>
              <a href={`?date=${h.date}`} onClick={(e) => { e.preventDefault(); on.open(h.date) }} data-testid="morning-history-row" data-status={h.status} aria-current={h.date === date ? 'date' : undefined}
                className={`flex min-h-[48px] items-center justify-between gap-2 px-3 ${h.date === date ? 'bg-green-50 font-extrabold' : ''}`}>
                <span>{h.date}</span>
                <span className={h.status === 'posted' ? 'font-bold text-green-800' : h.status === 'ready' ? 'font-bold text-amber-800' : 'text-stone-500'}>
                  {h.status === 'posted' ? `✓ ${t('mp_status_posted')}` : h.status === 'ready' ? t('mp_status_ready') : t('mp_status_none')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
