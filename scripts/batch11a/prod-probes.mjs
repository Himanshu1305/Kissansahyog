#!/usr/bin/env node
// Batch 11A — harmless production probes used by scripts/ship-prod-11a.sh and scripts/rollback-prod-11a.sh.
// The founder's ship runs them; the builder never runs the db/flags modes (production is off limits for it).
//
//   node scripts/batch11a/prod-probes.mjs flags          get_auth_flags() on production -> FLAGS=...
//   node scripts/batch11a/prod-probes.mjs db             is migration 0066 on production? -> RESULT=PRESENT|MISSING|UNEXPECTED
//   node scripts/batch11a/prod-probes.mjs live <site> [--expect-off]
//                                                        the deployed OTP functions answer (exit 0 = all PASS)
//
// db / flags read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.production (never printed) and refuse
// unless the URL is the production project. Nothing is written anywhere:
//   get_auth_flags()  read-only STABLE function.
//   app_login_otp('', <random ticket>)  its FIRST statement rejects the empty number ('invalid_phone') before
//     any lockout check, ticket lookup or insert; "Prefer: tx=rollback" as well.
//   POST <site>/api/otp/send {phone:'123'}  rejected by input validation (400 invalid_phone) before the rate
//     limit, the database or 2Factor are touched: no SMS, no credit, no key needed.
// Output: status codes and our own short error codes only — never a key, URL with a key, or provider text.
import { readFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const [mode, site] = process.argv.slice(2)
const expectOff = process.argv.includes('--expect-off')
const short = (t) => String(t || '').replace(/\s+/g, ' ').slice(0, 120)

function prodEnv() {
  if (!existsSync('.env.production')) { console.log('RESULT=NOENV'); process.exit(0) }
  const env = {}
  for (const l of readFileSync('.env.production', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key) { console.log('RESULT=NOENV'); process.exit(0) }
  if (!url.includes(PROD_REF) || url.includes(STAGING_REF)) { console.log('RESULT=NOTPROD'); process.exit(0) }
  return { url, key }
}
async function rpc(fn, body) {
  const { url, key } = prodEnv()
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'tx=rollback' },
    body: JSON.stringify(body),
  })
  const t = await r.text()
  let j = {}; try { j = JSON.parse(t) } catch { /* not json */ }
  return { status: r.status, j, t }
}
const flagsOk = (j) => j && typeof j.otp_required === 'boolean' && typeof j.session_enforced === 'boolean'

async function main() {
  if (mode === 'flags') {
    const r = await rpc('get_auth_flags', {})
    if (r.status === 200 && flagsOk(r.j)) console.log(`FLAGS=otp_required=${r.j.otp_required} session_enforced=${r.j.session_enforced}`)
    else if (r.status === 404 || r.j.code === 'PGRST202') console.log('FLAGS=none (migration 0066 not on production)')
    else console.log(`FLAGS=unknown (HTTP ${r.status})`)
    return
  }
  if (mode === 'db') {
    const a = await rpc('get_auth_flags', {})
    const ra = a.status === 200 && flagsOk(a.j) ? 'PRESENT' : (a.status === 404 || a.j.code === 'PGRST202') ? 'MISSING' : 'UNEXPECTED'
    console.log(`get_auth_flags: HTTP=${a.status} ${ra === 'PRESENT' ? `otp_required=${a.j.otp_required} session_enforced=${a.j.session_enforced}` : `CODE=${short(a.j.code)} MESSAGE=${short(a.j.message || a.t)}`} -> ${ra}`)
    const b = await rpc('app_login_otp', { p_phone: '', p_ticket: `kst1_${randomUUID().replace(/-/g, '')}` })
    const rb = b.status === 400 && /invalid_phone/.test(b.t) ? 'PRESENT' : (b.status === 404 || b.j.code === 'PGRST202') ? 'MISSING' : 'UNEXPECTED'
    console.log(`app_login_otp: HTTP=${b.status} CODE=${short(b.j.code)} MESSAGE=${short(b.j.message || b.t)} -> ${rb}`)
    if (ra === 'PRESENT') console.log(`FLAGS=otp_required=${a.j.otp_required} session_enforced=${a.j.session_enforced}`)
    console.log(`RESULT=${ra === 'PRESENT' && rb === 'PRESENT' ? 'PRESENT' : [ra, rb].includes('MISSING') ? 'MISSING' : 'UNEXPECTED'}`)
    return
  }
  if (mode === 'live') {
    if (!/^https:\/\//.test(site || '')) { console.log('usage: live https://<site> [--expect-off]'); process.exitCode = 2; return }
    let bad = 0
    const stamp = Date.now()
    const c = await fetch(`${site}/api/otp/config?ks_ship=${stamp}`, { headers: { accept: 'application/json' } })
    const ct = c.headers.get('content-type') || ''
    let cj = null; try { cj = JSON.parse(await c.text()) } catch { /* not json */ }
    const cfgPass = c.status === 200 && /json/.test(ct) && flagsOk(cj) && (!expectOff || (cj.otp_required === false && cj.session_enforced === false))
    console.log(`${cfgPass ? 'PASS' : 'FAIL'}  [11a_otp] GET /api/otp/config -> ${c.status} ${cj ? `otp_required=${cj.otp_required} session_enforced=${cj.session_enforced}` : '(not JSON)'}${expectOff ? ' (both must be false right after the first ship)' : ''}`)
    if (!cfgPass) bad++
    const s = await fetch(`${site}/api/otp/send`, { method: 'POST', headers: { 'content-type': 'application/json', origin: site }, body: JSON.stringify({ phone: '123', purpose: 'login' }) })
    const sct = s.headers.get('content-type') || ''
    let sj = null; try { sj = JSON.parse(await s.text()) } catch { /* not json */ }
    const sendPass = s.status === 400 && /json/.test(sct) && sj && sj.error === 'invalid_phone'
    console.log(`${sendPass ? 'PASS' : 'FAIL'}  [11a_otp] POST /api/otp/send {phone:'123'} -> ${s.status} ${sj ? `error=${short(sj.error)}` : '(not JSON)'} (expected 400 invalid_phone; no SMS sent)`)
    if (!sendPass) bad++
    process.exitCode = bad ? 1 : 0
    return
  }
  console.log('usage: prod-probes.mjs flags | db | live <site> [--expect-off]'); process.exitCode = 2
}
main().catch((e) => { console.log(`RESULT=NETWORK ${short(e && e.message)}`); process.exitCode = process.argv[2] === 'live' ? 1 : 0 })
