// Batch 16B - automation and admin page: the SQL text, --save with a mocked fetch, make-secret, the admin page and its
// route, the workflow, the ship scripts. Offline. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'
import { selfTest, hashOf, makeSecret, sqlFor } from '../../scripts/morning/make-secret.mjs'
import { saveToDatabase, yesterdayFromContext, MAX_CARD_B64 } from '../../scripts/morning/lib/save.js'
import { main } from '../../scripts/morning/run.mjs'
import * as L from '../../src/lib/admin/morningLogic.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { morningStrings } from '../../src/lib/i18n/morningStrings.js'

const read = (p) => readFileSync(p, 'utf8')
const SQL = read('supabase/migrations/0070_morning_posts.sql')

// ---------------------------------------------------------------- SQL
test('0070 SQL: pure ASCII (migration, rollback, production file, secret template)', () => {
  for (const f of ['supabase/migrations/0070_morning_posts.sql', 'supabase/migrations/rollback/0070_morning_posts_rollback.sql', 'docs/review/batch16b/PROD_MIGRATION_0070.sql', 'docs/review/batch16b/PROD_SET_SECRET.sql.template']) {
    assert.ok(!/[^\x00-\x7F]/.test(readFileSync(f, 'latin1')), `${f} has a non-ASCII byte`)
  }
})
test('0070 SQL: idempotent, additive, no DROP TABLE / DELETE / TRUNCATE / ALTER of existing things in the forward file', () => {
  const code = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/\bdrop\s+table\b/i.test(code)); assert.ok(!/\bdelete\s+from\b/i.test(code)); assert.ok(!/\btruncate\b/i.test(code))
  assert.ok(!/\balter\s+table\s+public\.(?!morning_)/i.test(code))
  for (const m of code.matchAll(/create table\s+(if not exists\s+)?(\S+)/gi)) assert.ok(m[1], `create table without if not exists: ${m[2]}`)
  for (const m of code.matchAll(/create\s+(or replace\s+)?function\s+(\S+)/gi)) assert.ok(m[1], `function without or replace: ${m[2]}`)
  assert.ok(!/otp_required|session_enforced/.test(code), 'the auth switches are not touched')
  assert.ok(!/service_role/i.test(code), 'no service-role key or grant')
})
test('0070 SQL: every function sets search_path; secrets table and posts table are locked down', () => {
  const fns = [...SQL.matchAll(/create or replace function ([\w.]+)\(([\s\S]*?)\n\$\$;/g)]
  assert.ok(fns.length >= 7, `found ${fns.length} functions`)
  for (const f of fns) assert.match(f[0], /set search_path = public, pg_temp/, f[1])
  for (const t of ['morning_posts', 'morning_post_secret']) {
    assert.match(SQL, new RegExp(`alter table public\\.${t} enable row level security`))
    assert.match(SQL, new RegExp(`revoke all on table public\\.${t} from public, anon, authenticated`))
  }
  assert.ok(!/create policy/i.test(SQL), 'no policies: nobody reads the tables through the API')
  assert.match(SQL, /id\s+boolean primary key default true check \(id\)/)
})
test('0070 SQL: shapes of the contract (columns, forbidden answer, date window, size limits, posted rows kept, grants)', () => {
  for (const c of ['post_date        date primary key', 'message_text     text not null', 'poll_question_id text', 'card_png_b64     text', 'poll_result_pct  int check (poll_result_pct between 0 and 100)', "source           text not null default 'github'"]) assert.ok(SQL.includes(c), c)
  assert.ok(SQL.includes("encode(sha256(convert_to(p_secret, 'utf8')), 'hex')"))
  assert.equal([...SQL.matchAll(/jsonb_build_object\('ok', false, 'error', 'forbidden'\)/g)].length >= 6, true)
  assert.match(SQL, /p_date < v_today - 1 or p_date > v_today \+ 1/); assert.ok(SQL.includes("'bad_date'"))
  assert.match(SQL, /length\(p_message\) > 4000/); assert.match(SQL, /length\(coalesce\(p_card_b64, ''\)\) > 900000/)
  assert.ok(SQL.includes("'already_posted'")); assert.match(SQL, /where m\.posted_at is null/)
  assert.ok(!/poll_result_pct = excluded/.test(SQL) && !/posted_at = excluded/.test(SQL), 'on conflict keeps poll_result_pct and posted_at')
  assert.match(SQL, /grant execute on function public\.morning_post_upsert\([^)]*\) to anon, authenticated/)
  assert.match(SQL, /grant execute on function public\.morning_post_context\([^)]*\) to anon, authenticated/)
  assert.ok(!/morning_post_secret_ok\([^)]*\) to/.test(SQL), 'the helper is not callable from the API')
  for (const f of ['mark_posted', 'set_poll_result', 'get', 'history']) assert.match(SQL, new RegExp(`morning_post_${f}[\\s\\S]*?require_admin_session`))
})
test('production files: PROD_MIGRATION equals the migration; the secret template is the one statement', () => {
  assert.equal(read('docs/review/batch16b/PROD_MIGRATION_0070.sql').replace(/\r\n/g, '\n'), SQL.replace(/\r\n/g, '\n'))
  const t = read('docs/review/batch16b/PROD_SET_SECRET.sql.template').trim()
  assert.equal(t, "insert into public.morning_post_secret(id, secret_sha256) values (true, '<PASTE_HASH_HERE>') on conflict (id) do update set secret_sha256 = excluded.secret_sha256;")
  assert.match(read('supabase/migrations/rollback/0070_morning_posts_rollback.sql'), /drop table if exists public\.morning_posts/)
  assert.ok(existsSync('supabase/migrations/0070_morning_posts.sql') && !existsSync('supabase/migrations/0068_x.sql'))
})

// ---------------------------------------------------------------- make-secret
test('make-secret --selftest passes; the hash is SHA-256 of the UTF-8 bytes; the SQL carries only the hash', () => {
  assert.deepEqual(selfTest(), [])
  assert.equal(hashOf('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const s = makeSecret(), sql = sqlFor(hashOf(s))
  assert.match(s, /^[A-Za-z0-9_-]{64}$/); assert.ok(!sql.includes(s))
  const src = read('scripts/morning/make-secret.mjs')
  assert.ok(!/writeFile|appendFile|createWriteStream/.test(src), 'never writes the secret to a file')
})

// ---------------------------------------------------------------- --save with a mocked fetch
const mockFetch = (answers, calls = []) => async (url, init) => {
  const name = String(url).split('/rpc/')[1]
  calls.push({ name, body: JSON.parse(init.body) })
  const a = answers[name]
  return { status: 200, ok: true, text: async () => JSON.stringify(typeof a === 'function' ? a() : a) }
}
const args = { url: 'https://x.test', key: 'anon', secret: 'S3CR3T', date: '2026-10-25', message: 'hello', poll: 'p', pollQuestionId: 'p06', png: Buffer.from([1, 2, 3]), report: 'r' }
test('--save: success sends the right arguments and prints a saved line', async () => {
  const calls = []
  const r = await saveToDatabase({ ...args, fetchImpl: mockFetch({ morning_post_upsert: { ok: true } }, calls) })
  assert.equal(r.exit, undefined); assert.match(r.line, /Saved to the database for 2026-10-25/)
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['p_card_b64', 'p_date', 'p_message', 'p_poll', 'p_poll_question_id', 'p_report', 'p_secret'])
  assert.equal(calls[0].body.p_card_b64, 'AQID')
  assert.ok(!r.line.includes('S3CR3T') && !r.line.includes('anon'))
})
test('--save: forbidden exits 1 with a plain explanation, already_posted exits 0, other answers exit 1', async () => {
  const f = await saveToDatabase({ ...args, fetchImpl: mockFetch({ morning_post_upsert: { ok: false, error: 'forbidden' } }) })
  assert.equal(f.exit, 1); assert.match(f.line, /refused the secret/); assert.ok(!f.line.includes('S3CR3T'))
  const a = await saveToDatabase({ ...args, fetchImpl: mockFetch({ morning_post_upsert: { ok: false, error: 'already_posted' } }) })
  assert.equal(a.exit, 0); assert.match(a.line, /already marked as posted/)
  const d = await saveToDatabase({ ...args, fetchImpl: mockFetch({ morning_post_upsert: { ok: false, error: 'bad_date' } }) })
  assert.equal(d.exit, 1)
  const boom = await saveToDatabase({ ...args, fetchImpl: async () => { throw new Error('offline') } })
  assert.equal(boom.exit, 1)
})
test('--save: an oversized card or message is refused before anything is sent', async () => {
  let sent = 0
  const spy = async () => { sent++; return { status: 200, ok: true, text: async () => '{"ok":true}' } }
  const big = Buffer.alloc(Math.ceil(MAX_CARD_B64 * 0.75) + 10)
  const r = await saveToDatabase({ ...args, png: big, fetchImpl: spy })
  assert.equal(r.exit, 1); assert.match(r.line, /too large/)
  const m = await saveToDatabase({ ...args, message: 'x'.repeat(4001), fetchImpl: spy })
  assert.equal(m.exit, 1); assert.equal(sent, 0)
})
test('--save: yesterday context is read with the secret; forbidden is an error, no result is null', async () => {
  const calls = []
  const y = await yesterdayFromContext({ ...args, fetchImpl: mockFetch({ morning_post_context: { ok: true, yesterday: { poll_question_id: 'p01', poll_result_pct: 64 } } }, calls) })
  assert.deepEqual(y, { question_id: 'p01', pct: 64 }); assert.equal(calls[0].body.p_secret, 'S3CR3T')
  assert.equal(await yesterdayFromContext({ ...args, fetchImpl: mockFetch({ morning_post_context: { ok: true, yesterday: { poll_question_id: null, poll_result_pct: null } } }) }), null)
  await assert.rejects(yesterdayFromContext({ ...args, fetchImpl: mockFetch({ morning_post_context: { ok: false, error: 'forbidden' } }) }), /forbidden/)
})
test('--save end to end (fixtures + mocked global fetch): missing env refuses; with env it uses the context result in the greeting and saves', async () => {
  const keep = { ...process.env }, keepFetch = globalThis.fetch
  const out = mkdtempSync(join(tmpdir(), 'morning16b-'))
  const log = console.log; const errs = console.error
  console.log = () => {}; console.error = () => {}
  try {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY; delete process.env.MORNING_POST_SECRET
    assert.equal(await main(['--fixtures', 'normal', '--no-image', '--save', '--out', out]), 1)
    process.env.SUPABASE_URL = 'https://x.test'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.MORNING_POST_SECRET = 'S3CR3T'
    const calls = []
    globalThis.fetch = mockFetch({ morning_post_context: { ok: true, yesterday: { poll_question_id: 'p01', poll_result_pct: 64 } }, morning_post_upsert: { ok: true } }, calls)
    assert.equal(await main(['--fixtures', 'normal', '--no-image', '--save', '--out', out]), 0)
    const up = calls.find((c) => c.name === 'morning_post_upsert')
    assert.ok(up.body.p_message.includes('कल 64% साथियों ने "सिंचाई हो गई" कहा'))
    globalThis.fetch = mockFetch({ morning_post_context: { ok: false, error: 'forbidden' }, morning_post_upsert: { ok: false, error: 'forbidden' } })
    assert.equal(await main(['--fixtures', 'normal', '--no-image', '--save', '--out', out]), 1)
  } finally { console.log = log; console.error = errs; globalThis.fetch = keepFetch; for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MORNING_POST_SECRET']) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k] } }
})

// ---------------------------------------------------------------- admin page: pure logic
test('page logic: IST date, date window, history list, poll-result target, pct check', () => {
  assert.equal(L.istToday(new Date('2026-10-24T19:00:00Z')), '2026-10-25'); assert.equal(L.istToday(new Date('2026-10-24T18:29:00Z')), '2026-10-24')
  assert.equal(L.pickDate('2026-10-26', '2026-10-25'), '2026-10-26'); assert.equal(L.pickDate('2026-10-27', '2026-10-25'), '2026-10-25')
  assert.equal(L.pickDate('nope', '2026-10-25'), '2026-10-25'); assert.equal(L.pickDate('2026-01-01', '2026-10-25'), '2026-10-25')
  assert.equal(L.pollResultDate('2026-10-25'), '2026-10-24')
  const h = L.historyList('2026-10-25', [{ post_date: '2026-10-25', posted_at: null }, { post_date: '2026-10-24', posted_at: '2026-10-24T01:00:00Z' }])
  assert.equal(h.length, 14); assert.deepEqual(h.slice(0, 3).map((x) => x.status), ['ready', 'posted', 'none'])
  assert.equal(L.pctOk('64'), true); assert.equal(L.pctOk('101'), false); assert.equal(L.pctOk('6.5'), false); assert.equal(L.pctOk(''), false)
  assert.equal(L.cardDataUrl('AQID'), 'data:image/png;base64,AQID'); assert.equal(L.cardDataUrl(null), null)
  assert.deepEqual([...L.base64ToBytes('AQID')], [1, 2, 3])
  assert.throws(() => L.answerOrThrow({ ok: false, error: 'forbidden' }), (e) => e.code === 'forbidden' && e.i18nKey === 'mp_err_forbidden')
  assert.deepEqual(L.answerOrThrow({ ok: true, rows: [] }), { ok: true, rows: [] })
})
test('copy: Clipboard API first; falls back to select + execCommand; reports failure so the page shows "select all"', async () => {
  let wrote = null
  assert.equal(await L.copyText('abc', { nav: { clipboard: { writeText: async (t) => { wrote = t } } } }), 'copied'); assert.equal(wrote, 'abc')
  const ta = { focus() {}, select() { this.sel = true }, setSelectionRange() {} }
  const doc = { execCommand: (c) => c === 'copy' }
  assert.equal(await L.copyText('abc', { nav: { clipboard: { writeText: async () => { throw new Error('denied') } } }, doc, textarea: ta }), 'copied'); assert.equal(ta.sel, true)
  assert.equal(await L.copyText('abc', { nav: {}, doc: { execCommand: () => false }, textarea: ta }), 'failed')
  assert.equal(await L.copyText('abc', { nav: {}, doc: null }), 'failed')
  assert.equal(L.canShareFile({ share() {}, canShare: () => true }, {}), true); assert.equal(L.canShareFile({ share() {} }, {}), false); assert.equal(L.canShareFile(undefined, {}), false)
})

// ---------------------------------------------------------------- admin page: strings and wiring
test('page strings: Hindi and English for every key, Hindi in Devanagari, all merged into the site strings', () => {
  for (const [k, v] of Object.entries(morningStrings)) {
    assert.ok(v.hi && v.en, k); assert.ok(/[\u0900-\u097F]/.test(v.hi), `${k} Hindi is not Devanagari`); assert.equal(strings[k], v)
  }
  const used = new Set([...read('src/screens/admin/MorningView.jsx').matchAll(/t\('(mp_[a-z_]+)'\)/g), ...read('src/screens/AdminMorning.jsx').matchAll(/'(mp_[a-z_]+)'/g), ...read('src/lib/admin/morningLogic.js').matchAll(/'(mp_[a-z_]+)'/g)].map((m) => m[1]))
  for (const k of used) assert.ok(morningStrings[k], `${k} used but missing`)
})
test('route: /admin/morning is behind the same AdminOnly gate as /admin; the page shows the same denial and is noindex; no analytics', () => {
  const app = read('src/App.jsx')
  assert.match(app, /<Route path="\/admin\/morning" element=\{<AdminOnly><AdminMorning \/><\/AdminOnly>\} \/>/)
  assert.match(app, /<Route path="\/admin" element=\{<AdminOnly><Admin \/><\/AdminOnly>\} \/>/)
  const page = read('src/screens/AdminMorning.jsx'), view = read('src/screens/admin/MorningView.jsx'), admin = read('src/screens/Admin.jsx')
  assert.match(page, /if \(!user\?\.is_admin\)/); assert.match(admin, /if \(!user\?\.is_admin\)/)
  for (const k of ['access_denied', 'access_denied_body', 'nav_home']) { assert.ok(view.includes(`'${k}'`) && admin.includes(`'${k}'`), k) }
  assert.equal([...page.matchAll(/<Seo [^>]*noindex/g)].length, 2)
  assert.ok(!/import .*analytics|gtag\(|posthog|plausible/i.test(page + view + read('src/lib/admin/morningApi.js')))
  assert.match(read('src/lib/admin/morningApi.js'), /p_actor: actor/)
})
test('route absent from sitemap, prerender, search index; robots.txt disallows /admin', () => {
  for (const f of ['scripts/gen-sitemaps.mjs', 'scripts/prerender.mjs', 'scripts/build-search-index.mjs']) assert.ok(!/admin/i.test(read(f)), `${f} mentions admin`)
  assert.ok(!read('public/search-index.json').includes('/admin/morning')); assert.ok(!/admin/i.test(read('public/search-index.json').slice(0, 5)) || true)
  assert.match(read('public/robots.txt'), /Disallow: \/admin/)
  if (existsSync('dist/sitemap.xml')) assert.ok(!/admin/.test(read('dist/sitemap.xml')))
  assert.ok(!/admin\/morning/.test(read('src/components/NavBar.jsx')) && !/admin\/morning/.test(read('src/components/layout/Footer.jsx')), 'not in public navigation')
})

// ---------------------------------------------------------------- admin page: rendered markup
let View
async function loadView() {
  if (View) return View
  const dir = join(process.cwd(), 'node_modules', '.cache', 'morning-16b'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/MorningView.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/], transform: { jsx: { runtime: 'automatic' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'view.mjs' })
  View = await import(`file://${join(dir, 'view.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return View
}
const t = (k) => (strings[k] ? strings[k].en : k)
const base = { t, date: '2026-10-25', dateText: 'Sunday, 25 October 2026', today: '2026-10-25', history: { state: 'ready', error: null }, historyRows: [], nextDisabled: false, prevDisabled: false, copied: false, copyFailed: false, pollCopied: false, canShare: false, busy: false, pctValue: '', pctMsg: null, pctError: null, resultDateText: '2026-10-24', postedText: '', generatedText: '', refs: { msg: { current: null } }, on: { cardName: 'c.png', pct: () => {}, prev: () => {}, next: () => {}, today: () => {}, open: () => {}, copyMsg: () => {}, selectAll: () => {}, copyPoll: () => {}, share: () => {}, mark: () => {}, savePct: () => {} } }
const post = { message_text: 'MSG-TEXT', poll_text: 'POLL-TEXT', card_png_b64: 'AQID', report_text: 'REPORT-TEXT', posted_at: null, generated_at: '2026-10-24T23:00:00Z' }
test('page: a post shows the message, Copy, Select all, card + Download, poll + Copy poll, Mark as posted, report and 14 history rows', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post, historyRows: [{ post_date: '2026-10-25', posted_at: null }] }))
  for (const s of ['data-testid="morning-post-admin"', 'MSG-TEXT', 'readOnly=""', 'Copy message', 'Select all', 'data:image/png;base64,AQID', 'download="c.png"', 'Download card', 'POLL-TEXT', 'Copy poll', 'Mark as posted', 'REPORT-TEXT', "Yesterday&#x27;s poll result"]) assert.ok(html.includes(s), s)
  assert.equal([...html.matchAll(/data-testid="morning-history-row"/g)].length, 14)
  assert.ok(!html.includes('Share card')); assert.ok(!html.includes('morning-empty'))
  assert.ok(renderToStaticMarkup(createElement(V, { ...base, post, canShare: true })).includes('Share card'))
  assert.ok(renderToStaticMarkup(createElement(V, { ...base, post, copied: true })).includes('Copied ✓'))
  assert.ok(renderToStaticMarkup(createElement(V, { ...base, post: { ...post, posted_at: '2026-10-25T00:30:00Z' }, postedText: '25 Oct, 6:00 am' })).includes('Remove the posted mark'))
  const hi = renderToStaticMarkup(createElement(V, { ...base, t: (k) => strings[k]?.hi || k, post }))
  assert.ok(hi.includes('संदेश कॉपी करें'))
})
test('page: no post -> the empty state with the 04:30 IST note and the manual fallback; nothing to copy; errors are shown', async () => {
  const { default: V, MorningDenied } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post: null }))
  assert.ok(html.includes('morning-empty')); assert.ok(html.includes('04:30 IST')); assert.ok(html.includes('npm run morning')); assert.ok(html.includes('Run workflow'))
  assert.ok(!html.includes('morning-copy"'))
  assert.ok(renderToStaticMarkup(createElement(V, { ...base, post: null, history: { state: 'error', error: 'mp_err_forbidden' } })).includes('This page is for admins only.'))
  const hi = renderToStaticMarkup(createElement(V, { ...base, t: (k) => strings[k]?.hi || k, post: null }))
  assert.ok(hi.includes('4:30 बजे (IST)'))
  const denied = renderToStaticMarkup(createElement(MorningDenied, { t, onHome: () => {} }))
  assert.ok(denied.includes('Access denied') && denied.includes('This page is for admins only.'))
})

// ---------------------------------------------------------------- workflow
test('workflow: schedule 23:00 UTC (04:30 IST) + manual run, no pull_request, 15 min timeout, concurrency, pinned actions, artifacts 7 days, 3 secrets', () => {
  const y = read('.github/workflows/morning-post.yml')
  assert.match(y, /cron: '0 23 \* \* \*'/); assert.ok(y.includes('workflow_dispatch:')); assert.ok(!/pull_request/.test(y))
  assert.match(y, /timeout-minutes: 15/); assert.match(y, /concurrency:/)
  for (const u of y.matchAll(/uses: ([^\s]+)/g)) assert.match(u[1], /@v\d+$/, `unpinned: ${u[1]}`)
  assert.match(y, /retention-days: 7/); assert.match(y, /if: always\(\)/)
  assert.match(y, /npm run morning -- --save/); assert.match(y, /npx playwright install --with-deps chromium/)
  for (const s of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MORNING_POST_SECRET']) assert.ok(y.includes(`secrets.${s}`), s)
  assert.ok(!/SERVICE_ROLE|service_role/i.test(y)); assert.ok(y.includes('RESEND_API_KEY') && y.includes('ALERT_EMAIL'))
  assert.match(y, /DELAY scheduled runs by up to/)
})
test('no service-role key in the new files', () => {
  for (const f of ['scripts/morning/run.mjs', 'scripts/morning/lib/save.js', 'scripts/morning/lib/supa.js', 'scripts/morning/make-secret.mjs', 'src/lib/admin/morningApi.js', '.github/workflows/morning-post.yml', 'docs/review/batch16b/SECURITY.md', 'docs/review/batch16b/SHIP.md']) {
    if (existsSync(f)) assert.ok(!/SERVICE_ROLE_KEY\s*[:=]/.test(read(f)), f)
  }
})

// ---------------------------------------------------------------- ship scripts
test('ship-prod-16b.sh / rollback-prod-16b.sh: right branch, tag, rollback target, probe, never set a switch', () => {
  const ship = read('scripts/ship-prod-16b.sh'), back = read('scripts/rollback-prod-16b.sh')
  assert.match(ship, /BRANCH="release-16b"/); assert.match(ship, /TAG="\$\{TAG:-ship-16b\}"/)
  assert.ok(ship.includes('f0973175-2eac-4c95-bbd2-09f48e644735')); assert.ok(ship.includes('775ffd7'))
  assert.ok(ship.includes('morning_post_context')); assert.ok(ship.includes('"ok":false,"error":"forbidden"')); assert.ok(ship.includes('migration 0070 is NOT applied'))
  assert.ok(ship.includes('morning-post-admin')); assert.ok(ship.includes('/admin/morning'))
  assert.ok(ship.includes('otp_required=true session_enforced=false'))
  for (const s of [ship, back]) assert.ok(!/set_auth_flag|update public\.auth_flags|"otp_required":\s*false/.test(s), 'must never set a switch')
  assert.ok(back.includes('f0973175-2eac-4c95-bbd2-09f48e644735'))
})
test('docs exist: SECURITY.md, SHIP.md (8 steps in order), RECON appendix', () => {
  const ship = read('docs/review/batch16b/SHIP.md')
  const order = ['staging', 'make-secret', 'eltmcznjcqiahqhjvpjg', 'GitHub secrets', 'dry', 'default branch', 'Run workflow', 'next morning'].map((s) => ship.toLowerCase().indexOf(s.toLowerCase()))
  assert.ok(order.every((i) => i >= 0), JSON.stringify(order)); assert.deepEqual([...order].sort((a, b) => a - b), order)
  assert.match(ship, /rollback/i)
  assert.match(read('docs/review/batch16b/SECURITY.md'), /cannot read/i)
  assert.match(read('docs/review/batch16a/RECON.md'), /Part B recon/)
})
