import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import {
  getSpeechRecognition, speechRecognitionSupported, resolveVoiceMode, recorderMimeType, cleanTranscript,
} from '../lib/voice/voiceSearch'

// A mic button attached to a search input. On tap it captures speech and calls
// onTranscript(text) so the field fills live (primary) or on completion (fallback).
//
// Primary: Web Speech API (hi-IN), free + client-side. Fallback (browsers without
// SpeechRecognition, e.g. Safari/Firefox): record with MediaRecorder → POST to the
// same-origin /transcribe function (Gemini, key server-side) — offered ONLY when that
// function reports a key is configured. If neither path is usable the mic is not shown,
// leaving the normal text input untouched. Failures never leave the button stuck.
export default function VoiceSearchButton({ onTranscript, lang = 'hi-IN', className = '' }) {
  const { t } = useLang()
  // 'pending' until we know; 'webspeech' | 'gemini' | 'none'. Web Speech is known sync.
  const [mode, setMode] = useState(() => (speechRecognitionSupported() ? 'webspeech' : 'pending'))
  const [active, setActive] = useState(false) // listening / recording
  const [busy, setBusy] = useState(false) // transcribing (fallback)
  const [msg, setMsg] = useState(null) // transient status/error line
  const recRef = useRef(null)
  const mrRef = useRef(null)
  const streamRef = useRef(null)
  const msgTimer = useRef(null)
  const stopTimer = useRef(null)

  useEffect(() => {
    let alive = true
    if (mode === 'pending') resolveVoiceMode().then((m) => alive && setMode(m))
    return () => { alive = false }
  }, [mode])

  // Cleanup on unmount — never leave a recogniser/recorder/stream running.
  useEffect(() => () => {
    try { recRef.current?.abort?.() } catch { /* ignore */ }
    try { mrRef.current?.stop?.() } catch { /* ignore */ }
    try { streamRef.current?.getTracks?.().forEach((tr) => tr.stop()) } catch { /* ignore */ }
    if (msgTimer.current) clearTimeout(msgTimer.current)
    if (stopTimer.current) clearTimeout(stopTimer.current)
  }, [])

  function flash(key) {
    setMsg(t(key))
    if (msgTimer.current) clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => setMsg(null), 4000)
  }

  // ---- Primary: Web Speech API ----
  function startWebSpeech() {
    const SR = getSpeechRecognition()
    if (!SR) { flash('voice_err_unavailable'); return }
    const rec = new SR()
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i += 1) txt += e.results[i][0].transcript
      const cleaned = cleanTranscript(txt)
      if (cleaned) onTranscript(cleaned)
    }
    rec.onerror = (e) => {
      const err = e?.error
      if (err === 'not-allowed' || err === 'service-not-allowed') flash('voice_err_denied')
      else if (err === 'no-speech' || err === 'aborted') flash('voice_err_nomatch')
      else flash('voice_err_nomatch')
      setActive(false)
    }
    rec.onnomatch = () => { flash('voice_err_nomatch'); setActive(false) }
    rec.onend = () => setActive(false)
    try {
      rec.start()
      setMsg(null)
      setActive(true)
    } catch {
      // start() throws if already started — reset defensively.
      setActive(false)
      flash('voice_err_nomatch')
    }
  }
  function stopWebSpeech() {
    try { recRef.current?.stop?.() } catch { /* ignore */ }
    setActive(false)
  }

  // ---- Fallback: MediaRecorder → /transcribe (Gemini) ----
  async function startRecording() {
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      flash('voice_err_denied')
      return
    }
    streamRef.current = stream
    const mime = recorderMimeType()
    let mr
    try {
      mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((tr) => tr.stop())
      flash('voice_err_unavailable')
      return
    }
    mrRef.current = mr
    const chunks = []
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    mr.onstop = async () => {
      if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null }
      streamRef.current?.getTracks?.().forEach((tr) => tr.stop())
      setActive(false)
      const blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' })
      if (!blob.size) { flash('voice_err_nomatch'); return }
      setBusy(true)
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'clip')
        const res = await fetch('/transcribe', { method: 'POST', body: fd })
        if (!res.ok) { flash('voice_err_unavailable'); return }
        const j = await res.json()
        const text = cleanTranscript(j && j.text ? j.text : '')
        if (text) onTranscript(text)
        else flash('voice_err_nomatch')
      } catch {
        flash('voice_err_unavailable')
      } finally {
        setBusy(false)
      }
    }
    try {
      mr.start()
      setMsg(null)
      setActive(true)
      // Safety auto-stop after 15s so the button can never stay stuck "recording".
      stopTimer.current = setTimeout(() => { try { mr.state === 'recording' && mr.stop() } catch { /* ignore */ } }, 15000)
    } catch {
      stream.getTracks().forEach((tr) => tr.stop())
      flash('voice_err_unavailable')
      setActive(false)
    }
  }
  function stopRecording() {
    try { mrRef.current?.stop?.() } catch { /* ignore */ }
  }

  function toggle() {
    if (busy) return
    // Both paths need the network (Web Speech routes audio to the OS/cloud; the Gemini
    // fallback POSTs to /transcribe). Fail with a clear message rather than a stuck mic.
    if (!active && typeof navigator !== 'undefined' && navigator.onLine === false) { flash('voice_err_offline'); return }
    if (mode === 'webspeech') { active ? stopWebSpeech() : startWebSpeech(); return }
    if (mode === 'gemini') { active ? stopRecording() : startRecording() }
  }

  if (mode === 'pending' || mode === 'none') return null

  const label = active ? t('voice_stop_aria') : t('voice_search_aria')
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        data-testid="voice-search-btn"
        data-voice-mode={mode}
        data-voice-active={active ? '1' : '0'}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${
          active ? 'border-red-500 bg-red-50 text-red-600' : 'border-[var(--ks-border-strong)] bg-white text-[var(--ks-primary)]'
        }`}
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        ) : (
          <span className="text-lg leading-none" aria-hidden="true">{active ? '⏹' : '🎤'}</span>
        )}
      </button>
      {(active || busy || msg) && (
        <span
          role="status"
          aria-live="polite"
          data-testid="voice-status"
          className="absolute right-0 top-full z-10 mt-1 w-max max-w-[70vw] rounded-md bg-stone-800 px-2 py-1 text-xs font-semibold text-white shadow"
        >
          {msg || (busy ? t('voice_transcribing') : mode === 'gemini' ? t('voice_recording') : t('voice_listening'))}
        </span>
      )}
    </span>
  )
}
