#!/usr/bin/env node
// Batch 7B verifier — Feedback & Grievance backend: contact by e-mail OR mobile,
// notification e-mail, approval before public display.
//   node scripts/verify-batch7b.mjs
// Reads source files and the built dist/ (run the staging build + prerender first),
// and runs the Pages Function in-process with `fetch` replaced by a stub. No network,
// no database, no .env. Prints PASS/FAIL lines, saves them to
// docs/review/batch7b/VERIFY_OUTPUT.txt and exits non-zero on any failure.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lines = []
const say = (s) => { console.log(s); lines.push(s) }
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  say(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
  if (ok) pass += 1
  else fail += 1
}
const has = (relative) => existsSync(join(ROOT, relative))
const read = (relative) => (has(relative) ? readFileSync(join(ROOT, relative), 'utf8') : '')
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '')
const load = (relative) => import(pathToFileURL(join(ROOT, relative)).href)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(jsx?|mjs)$/.test(e.name) ? [`${dir}/${e.name}`] : []))

const { strings } = await load('src/lib/i18n/strings.js')
const { privacyPolicy } = await load('src/lib/i18n/legal.js')
const { grievancePage } = await load('src/content/pages/grievance.js')
const contact = await load('src/lib/feedback/contact.js')
const fn = await load('functions/api/feedback.js')
const sqlRaw = read('supabase/migrations/0055_feedback.sql')
const sql = sqlRaw.replace(/--[^\n]*/g, '')
const sql56Raw = read('supabase/migrations/0056_feedback_server_only.sql')
const sql56 = sql56Raw.replace(/--[^\n]*/g, '')
const fnSrc = read('functions/api/feedback.js')
const api = read('src/lib/feedback/feedbackApi.js')
const grievance = read('src/screens/Grievance.jsx')
const aboutScreen = read('src/screens/About.jsx')
const headers = read('public/_headers')
const distGrievance = read('dist/grievance/index.html')
const distAbout = read('dist/about/index.html')
const distPrivacy = read('dist/privacy/index.html')

// ---- 1. migration 0055 ---------------------------------------------------------
const table = (sql.match(/create table if not exists public\.feedback_messages \(([\s\S]*?)\n\);/) || ['', ''])[1]
const cols = [...table.matchAll(/^\s{2}([a-z_]+)\s+(?!check)([a-z]+)/gm)].map((m) => m[1]).filter((c) => c !== 'constraint')
const WANT = ['id', 'contact_email', 'contact_mobile', 'kind', 'message', 'lang', 'device_id', 'public_ok', 'moderation', 'status', 'notified_at', 'created_at']
check('1: 0055 holds the feedback table and functions (rewritten in place); 0056 only changes who may call submit_feedback', has('supabase/migrations/0055_feedback.sql') && !has('supabase/migrations/0056_feedback.sql') && has('supabase/migrations/0056_feedback_server_only.sql'))
check('1: table has exactly the required columns', same(cols, WANT), cols.join(','))
check('1: no column for who the person is', !/\b(full_)?name\b|phone/i.test(sql))
check('1: contact columns are nullable; mobile is stored as 10 digits', /contact_email\s+text,/.test(table) && /contact_mobile\s+text check \(contact_mobile is null or contact_mobile ~ '\^\[6-9\]\[0-9\]\{9\}\$'\)/.test(table))
check('1: CHECK that at least one of e-mail / mobile is present', /check \(contact_email is not null or contact_mobile is not null\)/.test(table))
check('1: kind / moderation / status / public_ok values and defaults',
  /kind\s+text not null default 'suggestion' check \(kind in \('suggestion','problem','other'\)\)/.test(table)
  && /public_ok\s+boolean not null default false/.test(table)
  && /moderation\s+text not null default 'pending' check \(moderation in \('pending','approved','rejected'\)\)/.test(table)
  && /status\s+text not null default 'open' check \(status in \('open','replied','closed'\)\)/.test(table)
  && /notified_at\s+timestamptz,/.test(table))
check('1: message length 5 to 4000 enforced in the table and the RPC', /char_length\(message\) between 5 and 4000/.test(table) && /char_length\(v_msg\) < 5/.test(sql) && /char_length\(v_msg\) > 4000/.test(sql))
check('1: RLS on, no policy, no direct anon/authenticated access', /alter table public\.feedback_messages enable row level security/.test(sql) && !/create policy/i.test(sql)
  && /revoke all on table public\.feedback_messages from public, anon, authenticated/.test(sql) && !/grant\s+(select|insert|update|delete|all)[^;]*feedback_messages/i.test(sql))
check('1: additive and idempotent (if not exists / create or replace only)', !/\bdrop\b|\btruncate\b|alter table [^;]*\b(drop|rename)\b/i.test(sql)
  && (sql.match(/create (table|index)\b/g) || []).length === (sql.match(/create (table|index) if not exists/g) || []).length
  && (sql.match(/create (or replace )?function/g) || []).length === (sql.match(/create or replace function/g) || []).length)

const fnBody = (name) => (sql.match(new RegExp(`create or replace function public\\.${name}\\(([\\s\\S]*?)\\$\\$;`)) || [''])[0]
const submit = fnBody('submit_feedback')
check('1: submit_feedback is SECURITY DEFINER with a pinned search_path and returns bigint', /returns bigint/.test(submit) && /security definer set search_path = public, pg_temp/.test(submit) && /returning id into v_id/.test(submit))
check('1: submit_feedback validates e-mail, mobile (strip spaces, +91, leading 0; 6-9 + 9 digits), kind and message',
  /feedback_email_invalid/.test(submit) && /feedback_mobile_invalid/.test(submit) && /feedback_kind_invalid/.test(submit) && /feedback_contact_required/.test(submit)
  && /\[\[:space:\]-\]/.test(submit) && /\^\\\+91/.test(submit) && /\^0\[0-9\]\{10\}\$/.test(submit) && /v_mobile !~ '\^\[6-9\]\[0-9\]\{9\}\$'/.test(submit))
check('1: public_ok is forced false for a problem', /v_public := coalesce\(p_public_ok, false\) and v_kind in \('suggestion','other'\)/.test(submit) && /check \(kind <> 'problem' or public_ok = false\)/.test(table))
check('1: soft rate limit of 5 an hour per device, per e-mail and per mobile', /interval '1 hour'/.test(submit) && /device_id = v_dev/.test(submit) && /contact_email = v_email/.test(submit) && /contact_mobile = v_mobile/.test(submit) && /v_count >= 5/.test(submit))
check('1: mark_feedback_notified is service-role only', /revoke all on function public\.mark_feedback_notified\(bigint\) from public, anon, authenticated/.test(sql)
  && /grant execute on function public\.mark_feedback_notified\(bigint\) to service_role;/.test(sql) && /set notified_at = now\(\)/.test(fnBody('mark_feedback_notified')))

// Batch 7G — migration 0056: the browser can no longer save directly.
const SUBMIT_SIG = 'public\\.submit_feedback\\(text, text, text, text, text, text, boolean\\)'
const statements56 = sql56.split(';').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean)
check('1: 0056 revokes submit_feedback from public, anon and authenticated', new RegExp(`^revoke execute on function ${SUBMIT_SIG} from public, anon, authenticated$`).test(statements56[0] || ''), statements56[0])
check('1: 0056 keeps submit_feedback for service_role only', new RegExp(`^grant execute on function ${SUBMIT_SIG} to service_role$`).test(statements56[1] || '') && !/\bto\b[^;]*\b(anon|authenticated|public)\b/i.test(sql56), statements56[1])
check('1: 0056 does nothing else (get_public_feedback and the admin functions untouched)', statements56.length === 2 && !/get_public_feedback|get_feedback_messages|moderate_feedback|set_feedback_status|mark_feedback_notified|feedback_messages|\b(create|drop|alter|truncate)\b/i.test(sql56), String(statements56.length))
check('1: 0056 header says what it does, staging first then production, and how to roll back', /apply to staging first, then production/i.test(sql56Raw) && /Rollback note: re-grant to anon, authenticated/.test(sql56Raw) && /--\s+grant execute on function public\.submit_feedback\(text, text, text, text, text, text, boolean\) to anon, authenticated;/.test(sql56Raw))

const pub = fnBody('get_public_feedback')
const pubReturns = (pub.match(/returns table \(([^)]*)\)/) || ['', ''])[1].split(',').map((c) => c.trim().split(/\s+/)[0])
const pubSelect = (pub.match(/select ([\s\S]*?)\s+from public\.feedback_messages/) || ['', ''])[1].split(',').map((c) => c.trim().replace(/^f\./, ''))
check('1: get_public_feedback returns only message, kind, lang, created_at', same(pubReturns, ['message', 'kind', 'lang', 'created_at']) && same(pubSelect, pubReturns), `${pubReturns} / ${pubSelect}`)
check('1: get_public_feedback never mentions contact details, device id or status', !/contact_|device_id|\bstatus\b|notified_at|\bid\b/.test(pub.replace(/get_public_feedback\(p_limit int default 20\)/, '')))
check('1: get_public_feedback shows only approved + consented suggestion/other, and anon may call it',
  /f\.moderation = 'approved'/.test(pub) && /and f\.public_ok/.test(pub) && /f\.kind in \('suggestion','other'\)/.test(pub)
  && /grant execute on function public\.get_public_feedback\(int\) to anon, authenticated, service_role;/.test(sql))
const admin = ['get_feedback_messages', 'moderate_feedback', 'set_feedback_status']
check('1: admin functions all call require_admin', admin.every((n) => /perform public\.require_admin\(p_actor_id\);/.test(fnBody(n))), admin.filter((n) => !/require_admin/.test(fnBody(n))).join(','))
check('1: get_feedback_messages filters on moderation and status', /p_moderation is null or moderation = p_moderation/.test(fnBody('get_feedback_messages')) && /p_status is null or status = p_status/.test(fnBody('get_feedback_messages')))
check('1: moderate_feedback approves only consented, non-problem messages', /p_action not in \('approve','reject'\)/.test(fnBody('moderate_feedback')) && /if not v_row\.public_ok or v_row\.kind = 'problem' then raise exception 'feedback_not_public'/.test(fnBody('moderate_feedback')))
check('1: set_feedback_status accepts open / replied / closed only', /p_status not in \('open','replied','closed'\)/.test(fnBody('set_feedback_status')))

// ---- 2. validators (unit tests) --------------------------------------------------
const MOBILE_OK = [['9876543210', '9876543210'], ['+91 98765 43210', '9876543210'], ['+919876543210', '9876543210'], ['919876543210', '9876543210'], ['09876543210', '9876543210'], ['98765-43210', '9876543210'], ['  6000000000 ', '6000000000'], ['+91 09876543210', '9876543210']]
const MOBILE_BAD = ['', '12345', '5876543210', '1234567890', '98765432101', '987654321', '+1 9876543210', 'abcdefghij', '98765 4321x', '0000000000', '+91', null, undefined]
const EMAIL_OK = [['kisan@example.com', 'kisan@example.com'], ['  Ram.Kumar@Example.IN ', 'ram.kumar@example.in'], ['a+b@sub.domain.org', 'a+b@sub.domain.org']]
const EMAIL_BAD = ['', 'kisan', 'kisan@', '@example.com', 'kisan@example', 'ki san@example.com', 'kisan@@example.com', `${'a'.repeat(250)}@x.co`, null]
for (const [label, mod] of [['client contact.js', contact], ['server function', fn]]) {
  const mBad = MOBILE_OK.filter(([i, o]) => mod.normalizeMobile(i) !== o).map(([i]) => i).concat(MOBILE_BAD.filter((i) => mod.normalizeMobile(i) !== null).map(String))
  check(`2: mobile validator, ${label} (${MOBILE_OK.length} good, ${MOBILE_BAD.length} bad)`, mBad.length === 0, mBad.join(' | '))
  const eBad = EMAIL_OK.filter(([i, o]) => mod.normalizeEmail(i) !== o).map(([i]) => i).concat(EMAIL_BAD.filter((i) => mod.normalizeEmail(i) !== null).map(String))
  check(`2: e-mail validator, ${label} (${EMAIL_OK.length} good, ${EMAIL_BAD.length} bad)`, eBad.length === 0, eBad.join(' | '))
}
check('2: the contact box detects which one was typed', same(contact.parseContact('Kisan@Example.com'), { email: 'kisan@example.com' }) && same(contact.parseContact('+91 98765 43210'), { mobile: '9876543210' })
  && contact.parseContact('').error === 'required' && contact.parseContact('kisan@').error === 'email' && contact.parseContact('12345').error === 'mobile' && contact.parseContact('ram kumar').error === 'unknown')
const good = { email: 'kisan@example.com', kind: 'suggestion', message: 'मंडी भाव का पेज बहुत काम का है।', lang: 'hi', device: 'dev-1', public_ok: true }
check('2: server validate() accepts e-mail only, mobile only, and both', fn.validate(good).value?.email === 'kisan@example.com' && fn.validate({ ...good, email: '', mobile: '09876543210' }).value?.mobile === '9876543210' && !!fn.validate({ ...good, mobile: '9876543210' }).value)
check('2: server validate() refuses missing contact, bad contact, bad kind, short and long messages',
  fn.validate({ ...good, email: '' }).error === 'feedback_contact_required' && fn.validate({ ...good, email: 'x@' }).error === 'feedback_email_invalid' && fn.validate({ ...good, email: '', mobile: '123' }).error === 'feedback_mobile_invalid'
  && fn.validate({ ...good, kind: 'praise' }).error === 'feedback_kind_invalid' && fn.validate({ ...good, message: 'hi' }).error === 'feedback_message_required' && fn.validate({ ...good, message: 'x'.repeat(4001) }).error === 'feedback_message_too_long')
check('2: public_ok is honoured for suggestion/other only, and only when literally true', fn.validate(good).value.public_ok === true && fn.validate({ ...good, kind: 'other' }).value.public_ok === true
  && fn.validate({ ...good, kind: 'problem' }).value.public_ok === false && fn.validate({ ...good, public_ok: 'yes' }).value.public_ok === false && fn.validate({ ...good, public_ok: undefined }).value.public_ok === false)

// ---- 3. the Pages Function, run in-process with a stubbed fetch ---------------------
const SECRETS = { SUPABASE_URL: 'https://secret-project-ref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-SECRET-7b', RESEND_API_KEY: 're_SECRET_7b' }
const realFetch = globalThis.fetch
const realWarn = console.warn
async function run({ body, env = SECRETS, handlers = {}, headers: h = {}, method = 'POST' }) {
  const calls = []
  const warnings = []
  const pending = []
  console.warn = (...a) => warnings.push(a.join(' '))
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    const call = { url: u, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null }
    calls.push(call)
    const key = u.includes('api.resend.com') ? 'resend' : u.split('/rpc/')[1]
    const h2 = handlers[key]
    if (!h2) throw new Error(`unexpected fetch ${u}`)
    return h2(call)
  }
  try {
    const request = new Request('https://staging.kissansahyog.com/api/feedback', { method, headers: { 'content-type': 'application/json', origin: 'https://staging.kissansahyog.com', ...h }, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined })
    const handler = method === 'POST' ? fn.onRequestPost : fn.onRequest
    const res = await handler({ request, env, waitUntil: (p) => pending.push(p) })
    await Promise.all(pending)
    const raw = await res.text()
    return { status: res.status, raw, json: (() => { try { return JSON.parse(raw) } catch { return null } })(), calls, warnings }
  } finally {
    globalThis.fetch = realFetch
    console.warn = realWarn
  }
}
const ok = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
const leaks = (r) => Object.values(SECRETS).filter((s) => r.raw.includes(s) || r.raw.includes('secret-project-ref'))

const happy = await run({ body: good, handlers: { submit_feedback: () => ok(41), resend: () => ok({ id: 'e1' }), mark_feedback_notified: () => new Response(null, { status: 204 }) } })
const order = happy.calls.map((c) => (c.url.includes('resend') ? 'resend' : c.url.split('/rpc/')[1]))
check('3: success path → 200 {ok:true}; stores, then e-mails, then marks notified', happy.status === 200 && same(happy.json, { ok: true }) && same(order, ['submit_feedback', 'resend', 'mark_feedback_notified']), order.join(' > '))
const sub = happy.calls[0]
check('3: submit_feedback is called with the service role key from the function env', sub.url === `${SECRETS.SUPABASE_URL}/rest/v1/rpc/submit_feedback` && sub.headers.apikey === SECRETS.SUPABASE_SERVICE_ROLE_KEY && sub.headers.authorization === `Bearer ${SECRETS.SUPABASE_SERVICE_ROLE_KEY}`
  && same(sub.body, { p_email: 'kisan@example.com', p_mobile: null, p_kind: 'suggestion', p_message: good.message, p_lang: 'hi', p_device: 'dev-1', p_public_ok: true }), JSON.stringify(sub.body))
const mail = happy.calls[1]
check('3: e-mail goes through the Resend REST API with from / to / reply_to as briefed', mail.url === 'https://api.resend.com/emails' && mail.headers.authorization === `Bearer ${SECRETS.RESEND_API_KEY}`
  && mail.body.from === 'Kisan Sahyog <hello@kissansahyog.com>' && same(mail.body.to, ['grievance@kissansahyog.com']) && mail.body.reply_to === 'kisan@example.com', JSON.stringify({ from: mail.body.from, to: mail.body.to, reply_to: mail.body.reply_to }))
check('3: subject is "[Feedback/Grievance] <type> — <first 60 chars>"', mail.body.subject === `[Feedback/Grievance] Suggestion — ${good.message.slice(0, 60)}`, mail.body.subject)
check('3: body (text + HTML) carries type, message, contact, language, time and the public-display answer',
  ['Type: Suggestion', 'Contact: Email: kisan@example.com', 'Language: Hindi', 'Time: ', ' IST', 'Public display allowed: Yes', good.message].every((s) => mail.body.text.includes(s))
  && ['Suggestion', 'kisan@example.com', 'Hindi', 'Public display allowed', good.message].every((s) => mail.body.html.includes(s)))
check('3: mark_feedback_notified gets the id returned by submit_feedback', same(happy.calls[2].body, { p_id: 41 }))

const evil = '<script>alert(1)</script> & "quoted" \'single\' <img src=x onerror=1>'
const esc = fn.buildEmail(fn.validate({ mobile: '9876543210', kind: 'problem', message: evil, public_ok: true }).value, new Date('2026-10-12T06:30:00Z'))
check('3: all user text is escaped in the HTML part', !/<script|<img/.test(esc.html) && esc.html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot; &#39;single&#39;'))
check('3: mobile-only message has no reply_to; a problem is reported as never public', esc.reply_to === undefined && esc.text.includes('Contact: Mobile: 9876543210') && /Public display allowed: No \(problems are never shown publicly\)/.test(esc.text) && esc.text.includes('12 Oct 2026'))
check('3: a long first line is cut to 60 characters in the subject, newlines flattened', fn.buildEmail(fn.validate({ ...good, message: `line one\nline two ${'x'.repeat(100)}` }).value).subject === `[Feedback/Grievance] Suggestion — ${`line one line two ${'x'.repeat(100)}`.slice(0, 60)}`)

const noKey = await run({ body: good, env: { ...SECRETS, RESEND_API_KEY: undefined }, handlers: { submit_feedback: () => ok(42) } })
check('3: RESEND_API_KEY missing → still saved, still success, clear server warning, not marked notified', noKey.status === 200 && same(noKey.json, { ok: true }) && noKey.calls.length === 1 && /RESEND_API_KEY is not set/.test(noKey.warnings.join(' ')))
const mailDown = await run({ body: good, handlers: { submit_feedback: () => ok(43), resend: () => ok({ message: 'invalid api key re_SECRET_7b' }, 401) } })
check('3: e-mail send fails → still saved, still success, warning logged, not marked notified', mailDown.status === 200 && same(mailDown.json, { ok: true }) && mailDown.calls.length === 2 && /e-mail failed: Resend HTTP 401/.test(mailDown.warnings.join(' ')))
const mailThrows = await run({ body: good, handlers: { submit_feedback: () => ok(44), resend: () => { throw new Error('network down') } } })
check('3: e-mail request throws → still success', mailThrows.status === 200 && same(mailThrows.json, { ok: true }))

const pot = await run({ body: { ...good, ks_leave_empty: 'http://spam.example' } })
check('3: honeypot filled → looks like success, nothing stored, nothing e-mailed', pot.status === 200 && same(pot.json, { ok: true }) && pot.calls.length === 0)
const bad = await run({ body: { ...good, email: 'nope' } })
check('3: invalid input is refused before any upstream call', bad.status === 400 && same(bad.json, { error: 'feedback_email_invalid' }) && bad.calls.length === 0)
const garbage = await run({ body: '{not json' })
check('3: malformed JSON → 400 bad_request', garbage.status === 400 && same(garbage.json, { error: 'bad_request' }) && garbage.calls.length === 0)
const limited = await run({ body: good, handlers: { submit_feedback: () => ok({ code: 'P0001', message: 'feedback_too_many' }, 400) } })
check('3: rate limit from the RPC → 429 feedback_too_many, no e-mail', limited.status === 429 && same(limited.json, { error: 'feedback_too_many' }) && limited.calls.length === 1)
const noRpc = await run({ body: good, handlers: { submit_feedback: () => ok({ code: 'PGRST202', message: `Could not find the function public.submit_feedback at ${SECRETS.SUPABASE_URL}` }, 404) } })
check('3: migration not applied → 503 unavailable (browser offers the e-mail link), never a success', noRpc.status === 503 && same(noRpc.json, { error: 'unavailable' }) && noRpc.calls.length === 1)
const dbDown = await run({ body: good, handlers: { submit_feedback: () => { throw new Error(`connect ECONNREFUSED ${SECRETS.SUPABASE_URL} key=${SECRETS.SUPABASE_SERVICE_ROLE_KEY}`) } } })
check('3: database unreachable → 503 unavailable', dbDown.status === 503 && same(dbDown.json, { error: 'unavailable' }))
const noEnv = await run({ body: good, env: {} })
check('3: Supabase env missing → 503 unavailable, nothing called', noEnv.status === 503 && noEnv.calls.length === 0 && /SUPABASE_SERVICE_ROLE_KEY are not set/.test(noEnv.warnings.join(' ')))
const foreign = await run({ body: good, headers: { origin: 'https://evil.example' } })
check('3: a cross-site caller is refused', foreign.status === 403 && foreign.calls.length === 0)
const get = await run({ method: 'GET' })
check('3: GET /api/feedback → 405 JSON (not the page shell)', get.status === 405 && same(get.json, { error: 'method_not_allowed' }))
const all = { happy, noKey, mailDown, mailThrows, pot, bad, garbage, limited, noRpc, dbDown, noEnv, foreign, get }
const leaky = Object.entries(all).filter(([, r]) => leaks(r).length > 0).map(([n]) => n)
check(`3: no response ever contains an env value or the upstream error text (${Object.keys(all).length} scenarios)`, leaky.length === 0, leaky.join(', '))
const logLeaks = Object.entries(all).filter(([, r]) => Object.values(SECRETS).slice(1).some((s) => r.warnings.join(' ').includes(s))).map(([n]) => n)
check('3: server warnings never print a key', logLeaks.length === 0, logLeaks.join(', '))
check('3: function reads only the expected env names and has no hard-coded secret', same([...new Set([...fnSrc.matchAll(/env\.([A-Z_]+)/g)].map((m) => m[1]))].sort(), ['RESEND_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL', 'VITE_SUPABASE_URL']) && !/re_[A-Za-z0-9]{8,}|eyJ[A-Za-z0-9_-]{10,}/.test(fnSrc))
check('3: client and server validators are the same code', ['normalizeEmail', 'normalizeMobile'].every((n) => {
  const grab = (s) => (s.match(new RegExp(`export function ${n}\\(value\\) \\{[\\s\\S]*?\\n\\}`)) || [''])[0]
  return grab(fnSrc) && grab(fnSrc) === grab(read('src/lib/feedback/contact.js'))
}))

// ---- 4. routing and CSP -----------------------------------------------------------
const csp = (headers.match(/Content-Security-Policy:[^\n]*/) || [''])[0]
check('4: function file is functions/api/feedback.js → /api/feedback, same convention as /transcribe', has('functions/api/feedback.js') && has('functions/transcribe.js') && !has('public/_routes.json') && !/^\/api\//m.test(read('public/_redirects')))
check("4: CSP already allows the same-origin call (connect-src 'self') and was not weakened", /connect-src 'self' /.test(csp) && !/api\.resend\.com/.test(csp) && !/connect-src[^;]*\*(?!\.supabase\.co)/.test(csp) && /default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp))
check('4: the browser never talks to Resend and never sees a key', !/resend/i.test(api + grievance) && !/SERVICE_ROLE|RESEND/.test(api + grievance))
const apiCode = stripComments(api)
const srcFiles = walk('src')
const rpcInBrowser = srcFiles.filter((f) => /submit_feedback|viaRpc/.test(stripComments(read(f))))
check(`4: no direct submit_feedback RPC call anywhere in browser code (${srcFiles.length} files under src/)`, srcFiles.length > 50 && rpcInBrowser.length === 0
  && [...apiCode.matchAll(/\.rpc\(\s*'([a-z_]+)'/g)].every((m) => m[1] === 'get_public_feedback'), rpcInBrowser.join(', '))
check('4: the form posts only to /api/feedback, and success needs {ok:true}', /const ENDPOINT = '\/api\/feedback'/.test(apiCode) && (apiCode.match(/\bfetch\(/g) || []).length === 1 && /fetch\(ENDPOINT, \{ method: 'POST'/.test(apiCode)
  && /await viaServer\(payload\)\s+\}/.test(apiCode) && /if \(res\.ok && body\?\.ok === true\) return\s/.test(apiCode))
const viaServerSrc = (apiCode.match(/async function viaServer\(payload\) \{[\s\S]*?\n\}/) || [''])[0]
check('4: 503 or a network failure → "could not send" with the e-mail fallback, never a thank-you', /catch \{\s+throw unavailable\(\)\s+\}/.test(viaServerSrc) && /throw unavailable\(\)\s+\}$/.test(viaServerSrc) && !/return (true|false)/.test(viaServerSrc)
  && /function unavailable\(\) \{[\s\S]*?err\.i18nKey = 'fb_err_unavailable'\s+err\.canEmail = true/.test(apiCode))
check('4: 400 and 429 refusals keep their own message and offer no e-mail link', /if \(body\?\.error && CODE_TO_KEY\[body\.error\]\) throw refused\(body\.error\)/.test(viaServerSrc) && /feedback_too_many: 'fb_err_too_many'/.test(apiCode) && /function refused\(code\) \{[\s\S]*?err\.canEmail = false/.test(apiCode))
check('4: mailto fallback to grievance@kissansahyog.com is still there, worded in Hindi and English', /FEEDBACK_EMAIL = 'grievance@kissansahyog\.com'/.test(apiCode) && /`mailto:\$\{FEEDBACK_EMAIL\}\?subject=/.test(apiCode) && /if \(ex\.canEmail\) setMailto\(feedbackMailto\(/.test(grievance) && /data-testid="feedback-mailto"/.test(grievance)
  && /ईमेल/.test(strings.fb_err_unavailable.hi) && /email/i.test(strings.fb_err_unavailable.en))

// ---- 5. form -------------------------------------------------------------------------
const g = stripComments(grievance)
const formSrc = (g.match(/<form[\s\S]*?<\/form>/) || [''])[0]
const names = [...formSrc.matchAll(/\bname="([^"]+)"/g)].map((m) => m[1])
check('5: form fields are contact, kind, message, public_ok (+ honeypot); no name field', same(names, ['contact', 'kind', 'message', 'public_ok', 'ks_leave_empty']) && !/full_name|"name"|type="tel"/.test(formSrc), names.join(','))
check('5: one "ईमेल या मोबाइल नंबर / Email or mobile number" box with the helper line', strings.fb_contact_label.hi === 'ईमेल या मोबाइल नंबर' && strings.fb_contact_label.en === 'Email or mobile number' && strings.fb_contact_hint.hi === 'हम आपसे इसी पर संपर्क करेंगे।'
  && /t\('fb_contact_label'\)/.test(formSrc) && /t\('fb_contact_hint'\)/.test(formSrc) && !strings.fb_email_label)
check('5: inline contact error next to the field (role=alert, aria-invalid)', /data-testid="feedback-contact-error"/.test(formSrc) && /role="alert"/.test(formSrc) && /aria-invalid/.test(formSrc))
check('5: checkbox text and review note as briefed, unchecked by default', strings.fb_public_ok.hi === 'इस सुझाव को बिना नाम और संपर्क के वेबसाइट पर दिखाने की अनुमति देता/देती हूँ।' && /जाँच के बाद/.test(strings.fb_public_note.hi) && /useState\(false\) \/\/ opt-in/.test(grievance))
check('5: checkbox only for suggestion / other; a problem gets the "never shown publicly" note instead',
  /const canBePublic = PUBLIC_KINDS\.includes\(kind\)/.test(g) && /\{canBePublic \? \([\s\S]*name="public_ok"[\s\S]*\) : \([\s\S]*t\('fb_problem_note'\)[\s\S]*\)\}/.test(formSrc)
  && /PUBLIC_KINDS = \['suggestion', 'other'\]/.test(api) && /publicOk: canBePublic && publicOk/.test(g) && /public_ok: !!publicOk && PUBLIC_KINDS\.includes\(safeKind\)/.test(api))
check('5: honeypot, client validation, collapsed legal section and mailto fallback are kept', /ks_leave_empty/.test(formSrc) && /validateFeedback\(\{ contact, message \}\)/.test(g) && /<details data-testid="grievance-legal"/.test(g) && /data-testid="feedback-mailto"/.test(g))
const doneCopy = [strings.fb_done_title.hi, strings.fb_done_title.en, strings.fb_done_body.hi, strings.fb_done_body.en].join(' ')
check('5: warm confirmation, with no promised reply time', /धन्यवाद/.test(strings.fb_done_title.hi) && !/[0-9०-९]|घंटे|घंटा|दिन|hour|day|within|जल्द|soon/i.test(doneCopy), doneCopy)
const distForm = (distGrievance.match(/<form[^>]*data-testid="feedback-form"[\s\S]*?<\/form>/) || [''])[0]
check('5: prerendered /grievance shows the new box, the unchecked checkbox and no e-mail-only field', /name="contact"/.test(distForm) && /name="public_ok"/.test(distForm) && !/name="public_ok"[^>]*checked/.test(distForm) && !/name="email"/.test(distForm) && text(distForm).includes('ईमेल या मोबाइल नंबर') && text(distForm).includes('हम आपसे इसी पर संपर्क करेंगे।'))

// ---- 6. privacy line -------------------------------------------------------------------
const LINE_HI = 'इस फ़ॉर्म में दिया गया ईमेल या मोबाइल नंबर केवल आपके संदेश का जवाब देने के लिए रखा जाता है और सार्वजनिक रूप से नहीं दिखाया जाता।'
const LINE_EN = 'stored only to reply to your message and is not shown publicly'
const legalBlock = grievancePage.blocks.find((b) => b.type === 'paragraph' && b.text.hi === LINE_HI)
check('6: privacy line is in the grievance legal content (Hindi + English)', !!legalBlock && legalBlock.text.en.includes(LINE_EN))
check('6: privacy line is in the privacy policy (Hindi + English)', privacyPolicy.some((p) => p.hi.includes(LINE_HI) && p.en.includes(LINE_EN)))
const distLegal = (distGrievance.match(/<details[\s\S]*?<\/details>/) || [''])[0]
check('6: prerendered /grievance has the line inside the collapsed legal section', text(distLegal).includes(LINE_HI))
check('6: prerendered /privacy has the line', text(distPrivacy).includes(LINE_HI) && text(distPrivacy).includes(LINE_EN))

// ---- 7. public display on /about ---------------------------------------------------------
const a = stripComments(aboutScreen)
check('7: /about has a "किसानों की राय / What farmers say" section fed by get_public_feedback', strings.about_voices_title.hi === 'किसानों की राय' && strings.about_voices_title.en === 'What farmers say' && /fetchPublicFeedback\(/.test(a) && /rpc\('get_public_feedback'/.test(api))
check('7: the whole section is hidden when there are none', /if \(rows\.length === 0\) return null/.test(a) && /useState\(\[\]\)/.test(a))
const voices = (a.match(/function FarmerVoices\(\) \{[\s\S]*?\n\}/) || [''])[0]
check('7: it renders the message text and type label only', /\{r\.message\}/.test(voices) && /t\(`fb_type_\$\{r\.kind\}`\)/.test(voices) && !/contact|email|mobile|device|created_at|r\.id\b/.test(voices))
check('7: the client keeps only message / kind / lang and never throws', /\.map\(\(r\) => \(\{ message: r\.message\.trim\(\), kind: r\.kind, lang: r\.lang \|\| null \}\)\)/.test(api) && /catch \{\s+return \[\]/.test(api) && /if \(error \|\| !Array\.isArray\(data\)\) return \[\]/.test(api))
check('7: no placeholder or invented testimonials anywhere in the source', !/testimonial/i.test(a + read('src/content/about.js')) && !/about-voices/.test(read('src/content/about.js')))
check('7: prerendered /about has no empty "What farmers say" heading (nothing approved yet)', distAbout.length > 0 && !text(distAbout).includes('किसानों की राय') && !/data-testid="about-voices"/.test(distAbout))

// ---- 8. wording ----------------------------------------------------------------------------
const FREE = /मुफ़्त|मुफ्त|निःशुल्क|नि:शुल्क|\bfree\b/i
const newKeys = ['fb_contact_label', 'fb_contact_hint', 'fb_err_contact_required', 'fb_err_contact', 'fb_err_mobile', 'fb_public_ok', 'fb_public_note', 'fb_problem_note', 'about_voices_title', 'fb_done_body']
const missing = newKeys.filter((k) => !(strings[k]?.hi?.trim() && strings[k]?.en?.trim()))
check(`8: every new string has Hindi and English (${newKeys.length})`, missing.length === 0, missing.join(', '))
const newCopy = [
  ...newKeys.flatMap((k) => [strings[k]?.hi, strings[k]?.en]),
  legalBlock?.text.hi, legalBlock?.text.en, ...privacyPolicy.filter((p) => p.hi.includes(LINE_HI)).flatMap((p) => [p.hi, p.en]),
  grievancePage.description.hi, grievancePage.description.en,
  fnSrc, sqlRaw, api, read('src/lib/feedback/contact.js'), g, a,
].join('\n')
check('8: no "मुफ़्त" / "free" in anything added or rewritten by this batch', !FREE.test(newCopy), (newCopy.match(FREE) || [''])[0])
const used = [...new Set([grievance, aboutScreen].flatMap((s) => [...s.matchAll(/\bt\('([a-z0-9_]+)'\)/g)].map((m) => m[1])))]
const keysInApi = [...api.matchAll(/'((?:fb_|err_)[a-z_]+)'/g)].map((m) => m[1])
const undefinedKeys = [...used, ...keysInApi].filter((k) => !strings[k])
check('8: every i18n key used by the form, the API layer and /about exists', undefinedKeys.length === 0, undefinedKeys.join(', '))
check('8: no Devanagari literals in the touched components', !/[ऀ-ॿ]/.test(g + a + stripComments(api)))

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7b'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7b/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n', 'utf8')
process.exit(fail ? 1 : 0)
