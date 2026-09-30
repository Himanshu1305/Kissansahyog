// Voice-search capability helpers. Two paths:
//  1) Web Speech API (SpeechRecognition) — free, client-side, no key. Primary path.
//  2) Gemini transcribe fallback via the /transcribe Pages Function — only for browsers
//     WITHOUT SpeechRecognition (Safari/Firefox), and only when the server has a key AND
//     MediaRecorder can produce a Gemini-supported audio format.
//
// The Gemini key is NEVER exposed to the browser: the client only ever talks to the
// same-origin /transcribe function, which holds the key server-side.

// --- Web Speech API detection ---
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}
export function speechRecognitionSupported() {
  return !!getSpeechRecognition()
}

// --- MediaRecorder detection + a Gemini-supported mime type ---
// Chrome/Android → audio/webm (Opus). Safari → audio/mp4 (AAC). Gemini's transcribe
// input list includes webm; mp4/m4a/aac are AAC-family and accepted in practice, but we
// flag mp4 as the less-certain path (see docs/review) since Safari is exactly the target
// browser here and its MediaRecorder history is inconsistent.
export function recorderMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return null
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']
  for (const m of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(m)) return m
    } catch { /* ignore */ }
  }
  // Some browsers support MediaRecorder without isTypeSupported — let the default be used.
  return window.MediaRecorder ? '' : null
}
export function mediaRecorderUsable() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    recorderMimeType() !== null
  )
}

// --- Probe the fallback function for whether a key is configured (no cost, no key leak).
// Cached for the session so we probe at most once.
let _probe = null
export async function transcribeConfigured() {
  if (_probe) return _probe
  _probe = (async () => {
    try {
      const res = await fetch('/transcribe', { method: 'GET' })
      if (!res.ok) return false
      const j = await res.json()
      return !!j.configured
    } catch {
      return false
    }
  })()
  return _probe
}

// Decide which voice mode a given browser should offer:
//   'webspeech' | 'gemini' | 'none'
export async function resolveVoiceMode() {
  if (speechRecognitionSupported()) return 'webspeech'
  // Unsupported browser: only offer the Gemini fallback if BOTH the server has a key
  // and this browser can actually record a usable format — otherwise no mic at all.
  if (!mediaRecorderUsable()) return 'none'
  const configured = await transcribeConfigured()
  return configured ? 'gemini' : 'none'
}
