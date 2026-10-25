#!/usr/bin/env node
// Batch 11A — a local stand-in for the 2Factor SMS API (tests only; nothing is ever sent).
//   node scripts/batch11a/mock-2factor.mjs <port>
// Same URL shapes and JSON answers as the real API:
//   GET /API/V1/{key}/SMS/{phone}/AUTOGEN/{template}  → {"Status":"Success","Details":"<session>"}
//   GET /API/V1/{key}/SMS/VERIFY/{session}/{otp}      → "OTP Matched" | 400 "OTP Mismatch" | 400 "OTP Expired"
// Test controls (what a phone would show):
//   GET  /__mock/last?phone=9xxxxxxxxx  → { code, session, sends }   the last "SMS" to that number
//   GET  /__mock/stats                  → { sends, verifies }
//   POST /__mock/down?on=1|0            provider answers HTTP 500 to everything
//   POST /__mock/expire?phone=…         the last code to that number is expired
//   POST /__mock/reset
import http from 'node:http'

const PORT = Number(process.argv[2] || 8799)
const KEY = process.env.MOCK_2F_KEY || 'KSTEST-MOCK-2FACTOR-KEY'
let state
const reset = () => { state = { sessions: new Map(), lastByPhone: new Map(), sends: 0, verifies: 0, down: false } }
reset()

const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }

http.createServer((req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const p = u.pathname.split('/').filter(Boolean)
  if (p[0] === '__mock') {
    if (p[1] === 'last') { const s = state.lastByPhone.get(u.searchParams.get('phone')); return send(res, 200, s ? { code: s.code, session: s.session, sends: s.sends } : {}) }
    if (p[1] === 'stats') return send(res, 200, { sends: state.sends, verifies: state.verifies })
    if (p[1] === 'down') { state.down = u.searchParams.get('on') === '1'; return send(res, 200, { down: state.down }) }
    if (p[1] === 'expire') { const s = state.lastByPhone.get(u.searchParams.get('phone')); if (s) state.sessions.get(s.session).expired = true; return send(res, 200, { ok: !!s }) }
    if (p[1] === 'reset') { reset(); return send(res, 200, { ok: true }) }
    return send(res, 404, {})
  }
  if (state.down) return send(res, 500, { Status: 'Error', Details: 'Mock provider down' })
  // /API/V1/{key}/SMS/...
  if (p[0] !== 'API' || p[1] !== 'V1' || p[3] !== 'SMS') return send(res, 404, { Status: 'Error', Details: 'Not found' })
  if (decodeURIComponent(p[2]) !== KEY) return send(res, 200, { Status: 'Error', Details: 'Invalid API Key' })
  if (p[4] === 'VERIFY') {
    state.verifies++
    const s = state.sessions.get(decodeURIComponent(p[5] || ''))
    if (!s) return send(res, 400, { Status: 'Error', Details: 'Invalid Session' })
    if (s.expired) return send(res, 400, { Status: 'Error', Details: 'OTP Expired' })
    if (p[6] === s.code) return send(res, 200, { Status: 'Success', Details: 'OTP Matched' })
    return send(res, 400, { Status: 'Error', Details: 'OTP Mismatch' })
  }
  if (p[5] === 'AUTOGEN' && /^\d{10}$/.test(p[4] || '')) {
    state.sends++
    const session = `mock-${Date.now().toString(36)}-${state.sends}`
    const code = String(100000 + Math.floor(Math.random() * 900000))
    const prev = state.lastByPhone.get(p[4])
    state.sessions.set(session, { code, expired: false })
    state.lastByPhone.set(p[4], { session, code, sends: (prev?.sends || 0) + 1 })
    return send(res, 200, { Status: 'Success', Details: session })
  }
  return send(res, 400, { Status: 'Error', Details: 'Bad request' })
}).listen(PORT, '127.0.0.1', () => console.log(`mock-2factor listening on 127.0.0.1:${PORT}`))
