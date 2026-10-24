import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { PageShell } from '../components/layout'
import Seo from '../components/layout/Seo'
import { getMorningPost, getMorningHistory, markMorningPosted, setMorningPollResult } from '../lib/admin/morningApi'
import { istToday, pickDate, shiftDate, pollResultDate, pctOk, cardFileName, copyText, canShareFile, base64ToBytes } from '../lib/admin/morningLogic'
import { istText } from './admin/common'
import MorningView, { MorningDenied } from './admin/MorningView'

// Batch 16B - /admin/morning: the day's WhatsApp post (message, card, poll) made by the scheduled job, for the founder's
// phone at 6 AM. Same gate as /admin: logged out -> login (AdminOnly in App.jsx); not an admin -> the same Access denied
// block. Never indexed (noindex here, Disallow /admin in robots.txt, not in the sitemap, not prerendered, not in the search
// index). No analytics on this page. The data comes from admin-checked database functions (migration 0070).

const errKey = (e) => e?.i18nKey || 'err_unknown'

export default function AdminMorning() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = istToday()
  const date = pickDate(params.get('date'), today)

  const [post, setPost] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [pollCopied, setPollCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState('')
  const [pctMsg, setPctMsg] = useState(null)
  const [pctError, setPctError] = useState(null)
  const msgRef = useRef(null)
  const canShare = useMemo(() => {
    try { return typeof File !== 'undefined' && canShareFile(navigator, new File([new Uint8Array(1)], 'x.png', { type: 'image/png' })) } catch { return false }
  }, [])

  const load = useCallback(async () => {
    if (!user?.is_admin) return
    setState('loading'); setError(null); setCopied(false); setCopyFailed(false); setPollCopied(false)
    try {
      const [p, h] = await Promise.all([getMorningPost(user.id, date), getMorningHistory(user.id, 14)])
      setPost(p); setRows(h || []); setState('ready')
      const y = (h || []).find((r) => r.post_date === pollResultDate(date))
      setPct(y && y.poll_result_pct != null ? String(y.poll_result_pct) : '')
    } catch (e) { setPost(null); setError(errKey(e)); setState('error') }
  }, [user?.id, user?.is_admin, date])
  useEffect(() => { load() }, [load])

  if (!user?.is_admin) {
    return <PageShell width="content"><Seo title="Admin" path="/admin/morning" noindex /><MorningDenied t={t} onHome={() => navigate('/home')} /></PageShell>
  }

  const go = (d) => setParams(d === today ? {} : { date: d })
  const flash = (set) => { set(true); setTimeout(() => set(false), 2500) }
  const dateText = (() => {
    try { return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`)) } catch { return date }
  })()
  const resultDateText = pollResultDate(date)

  const on = {
    prev: () => go(shiftDate(date, -1)),
    next: () => go(shiftDate(date, 1)),
    today: () => go(today),
    open: (d) => go(d),
    cardName: cardFileName(date),
    selectAll: () => { msgRef.current?.focus(); msgRef.current?.select(); msgRef.current?.setSelectionRange?.(0, 99999) },
    copyMsg: async () => {
      const r = await copyText(post.message_text, { textarea: msgRef.current })
      if (r === 'copied') { setCopyFailed(false); flash(setCopied) } else { setCopyFailed(true); msgRef.current?.select() }
    },
    copyPoll: async () => { const r = await copyText(post.poll_text); if (r === 'copied') flash(setPollCopied) },
    share: async () => {
      try {
        const file = new File([base64ToBytes(post.card_png_b64)], cardFileName(date), { type: 'image/png' })
        if (canShareFile(navigator, file)) await navigator.share({ files: [file] })
      } catch { /* the person closed the share sheet */ }
    },
    mark: async () => {
      setBusy(true)
      try { await markMorningPosted(user.id, date, !post.posted_at); await load() } catch (e) { setError(errKey(e)); setState('error') } finally { setBusy(false) }
    },
    pct: (e) => { setPct(e.target.value); setPctMsg(null); setPctError(null) },
    savePct: async () => {
      if (!pctOk(pct)) { setPctError('mp_pct_bad'); return }
      setBusy(true); setPctError(null)
      try { await setMorningPollResult(user.id, pollResultDate(date), Number(pct)); setPctMsg('mp_saved'); const h = await getMorningHistory(user.id, 14); setRows(h || []) } catch (e) { setPctError(errKey(e)) } finally { setBusy(false) }
    },
  }

  return (
    <PageShell width="content">
      <Seo title="Admin" path="/admin/morning" noindex />
      <MorningView
        t={t} date={date} dateText={dateText} today={today} post={post}
        history={{ state, error: state === 'error' ? error : null }} historyRows={rows}
        prevDisabled={date <= shiftDate(today, -60)} nextDisabled={date >= shiftDate(today, 1)}
        copied={copied} copyFailed={copyFailed} pollCopied={pollCopied} canShare={canShare} busy={busy}
        pctValue={pct} pctMsg={pctMsg} pctError={pctError} resultDateText={resultDateText}
        postedText={post?.posted_at ? istText(post.posted_at, lang) : ''} generatedText={post?.generated_at ? istText(post.generated_at, lang) : ''}
        refs={{ msg: msgRef }} on={on}
      />
    </PageShell>
  )
}
