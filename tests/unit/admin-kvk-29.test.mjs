// Batch 29 - the admin "KVK questions" tab: registry wiring, strings, the question cards and the answer form (rendered with react-dom/server), the API calls.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'
import { adminStrings } from '../../src/lib/i18n/adminStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { TABS, PANELS, searchPanels, tabOf, validTab, SUPER_ONLY } from '../../src/screens/admin/registry.js'
import { toAppError } from '../../src/lib/errors.js'
import { cleanAnswer, cleanMeta } from '../../src/lib/kvk/kvkRules.js'

const src = (f) => readFileSync(f, 'utf8')
let M
async function load() {
  if (M) return M
  const dir = join(process.cwd(), 'node_modules', '.cache', 'kvk-29'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/tabs/KvkPanel.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/, /^react-router/], transform: { jsx: { runtime: 'automatic' }, define: { 'import.meta.env': '({VITE_SUPABASE_URL:"https://x.supabase.co",VITE_SUPABASE_ANON_KEY:"k",MODE:"test",DEV:false})' } } })
  await b.write({ dir, format: 'esm', entryFileNames: 'panel.mjs' })
  M = await import(`file://${join(dir, 'panel.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return M
}
const tFor = (lang) => (k) => (adminStrings[k] ? adminStrings[k][lang] : `MISSING:${k}`)
const Q = (over = {}) => ({ id: 'id1', slug: 'wheat-irr2-days', kind: 'stage_days', target: 'irr2', question_hi: 'हिंदी सवाल', question_en: 'English question', help_hi: 'हिंदी मदद', help_en: 'English help', ask_who: 'KVK Sagar', ask_phone: '07582-288228', state: 'open', answer: null, source_name: null, source_date: null, valid_until: null, ...over })
const card = async (q, props = {}, lang = 'en') => { const { QuestionCard } = await load(); return renderToStaticMarkup(createElement(QuestionCard, { q, t: tFor(lang), lang, editing: false, busy: false, error: null, onEdit() {}, onCancel() {}, onSave() {}, onRemove() {}, ...props })) }
const form = async (q, lang = 'en') => { const { AnswerForm } = await load(); return renderToStaticMarkup(createElement(AnswerForm, { q, t: tFor(lang), busy: false, error: null, onSave() {}, onCancel() {} })) }

test('registry: a KVK tab with one panel; every user can open it (not super-only); search finds it in English and Hindi', () => {
  assert.ok(validTab('kvk')); assert.deepEqual(TABS.map((t) => t.id), ['overview', 'content', 'mandi', 'kvk', 'moderation', 'people', 'security'])
  assert.equal(tabOf('kvk'), 'kvk'); assert.equal(PANELS.filter((p) => p.tab === 'kvk').length, 1); assert.ok(!SUPER_ONLY.has('kvk'))
  const names = (p) => `${strings[p.label].hi} ${strings[p.label].en}`
  for (const q of ['KVK', 'kvk', 'केवीके', 'सिंचाई', 'irrigation', 'insurance', 'बीमा']) assert.ok(searchPanels(q, names).some((p) => p.key === 'kvk'), q)
  assert.ok(strings.adm_tab_kvk && strings.adm_p_kvk)
})

test('Admin.jsx loads the KVK tab like the others', () => {
  assert.match(src('src/screens/Admin.jsx'), /kvk: lazy\(\(\) => import\('\.\/admin\/tabs\/KvkTab'\)\)/)
  for (const t of TABS) assert.match(src('src/screens/Admin.jsx'), new RegExp(`${t.id}: lazy`), t.id)
})

test('every adm_kvk_* key used by the panel and the rules exists in Hindi and English; the six error codes map to messages', () => {
  const used = new Set()
  for (const f of ['src/screens/admin/tabs/KvkPanel.jsx', 'src/lib/kvk/kvkRules.js']) for (const m of src(f).matchAll(/adm_kvk_[a-z_]+/g)) used.add(m[0])
  for (const k of used) if (!k.endsWith('_')) assert.ok(adminStrings[k] && adminStrings[k].hi && adminStrings[k].en, k)
  for (const state of ['open', 'answered', 'expired']) assert.ok(adminStrings[`adm_kvk_state_${state}`], state)
  for (const c of ['range', 'date', 'seed', 'source', 'told', 'valid']) assert.equal(toAppError(new Error(`kvk_invalid_${c}`)).i18nKey, `adm_kvk_err_${c}`, c)
  // an error the rules return is always a string that exists
  for (const e of [cleanAnswer('stage_days', {}).error, cleanAnswer('date', {}).error, cleanAnswer('late_sowing', { last_date: '2027-01-05', seed_extra_pct: 'x' }, { sourceDate: '2026-11-27' }).error, cleanMeta({}, '2026-11-27').error]) assert.ok(adminStrings[e], e)
})

test('an open question: question, help, who to ask with a tap-to-call link, state chip, a big "Enter the answer" button, no answer box', async () => {
  const h = await card(Q())
  assert.ok(h.includes('English question') && h.includes('English help') && h.includes('KVK Sagar'))
  assert.match(h, /href="tel:07582288228"/); assert.ok(h.includes('Call 07582-288228'))
  assert.match(h, /data-state="open"/); assert.ok(h.includes('Answer needed')); assert.ok(h.includes('Enter the answer')); assert.ok(!h.includes('data-testid="kvk-answer"')); assert.ok(!h.includes('Remove the answer'))
  assert.ok(h.includes('min-h-[48px]'), 'buttons are at least 48 px high')
  const hi = await card(Q(), {}, 'hi'); assert.ok(hi.includes('हिंदी सवाल') && hi.includes('हिंदी मदद') && !hi.includes('English question'))
  assert.ok(!(await card(Q({ ask_phone: '' }))).includes('tel:'), 'no phone -> no call link')
})

test('an answered question shows the answer, who told us and until when, and offers change / remove; an expired one says ask again', async () => {
  const a = Q({ state: 'answered', answer: { das_from: 52, das_to: 57 }, source_name: 'KVK Sagar, Dr X', source_date: '2026-11-27', valid_until: '2027-03-01' })
  const h = await card(a)
  assert.ok(h.includes('52 to 57 days after sowing') && h.includes('KVK Sagar, Dr X') && h.includes('27 Nov 2026') && h.includes('1 Mar 2027'), h)
  assert.ok(h.includes('Answered, in use') && h.includes('Change the answer') && h.includes('Remove the answer'))
  assert.ok((await card({ ...a, state: 'expired' })).includes('Answer expired, ask again'))
  const date = await card(Q({ kind: 'date', target: 'pmfby-rabi', state: 'answered', answer: { date: '2026-12-31' }, source_name: 'Office', source_date: '2026-11-27', valid_until: '2027-03-01' }))
  assert.ok(date.includes('Last date: 31 Dec 2026'), date)
  const late = await card(Q({ kind: 'late_sowing', target: 'wheat', state: 'answered', answer: { last_date: '2027-01-05', seed_extra_pct: 25 }, source_name: 'KVK', source_date: '2026-11-27', valid_until: '2027-03-01' }))
  assert.ok(late.includes('Last date for late sowing: 5 Jan 2027') && late.includes('seed 25% extra'), late)
  const lateNo = await card(Q({ kind: 'late_sowing', target: 'wheat', state: 'answered', answer: { last_date: '2027-01-05' }, source_name: 'KVK', source_date: '2026-11-27', valid_until: '2027-03-01' }))
  assert.ok(!lateNo.includes('seed'))
  assert.ok((await card(a, {}, 'hi')).includes('बुवाई के 52 से 57 दिन बाद'))
})

test('the answer form has the right typed fields for each kind, plus who told you, the day, and valid-until (defaults: today and today + 120 days)', async () => {
  const stage = await form(Q()); assert.ok(stage.includes('data-testid="kvk-from"') && stage.includes('data-testid="kvk-to"') && !stage.includes('kvk-date') && !stage.includes('kvk-seed'))
  const date = await form(Q({ kind: 'date', target: 'pmfby-rabi' })); assert.ok(date.includes('data-testid="kvk-date"') && date.includes('type="date"') && !date.includes('kvk-from'))
  const late = await form(Q({ kind: 'late_sowing', target: 'wheat' })); assert.ok(late.includes('data-testid="kvk-last"') && late.includes('data-testid="kvk-seed"'))
  for (const h of [stage, date, late]) assert.ok(h.includes('data-testid="kvk-who"') && h.includes('data-testid="kvk-told"') && h.includes('data-testid="kvk-valid"') && h.includes('data-testid="kvk-save"') && h.includes('Save the answer'))
  const { startForm } = await load()
  const f = startForm(Q(), '2026-11-27'); assert.equal(f.source_date, '2026-11-27'); assert.equal(f.valid_until, '2027-03-27')
  const g = startForm(Q({ answer: { das_from: 52, das_to: 57 }, source_name: 'KVK Sagar' }), '2026-12-01'); assert.deepEqual([g.das_from, g.das_to, g.source_name], [52, 57, 'KVK Sagar'])
})

test('the API calls the right database functions with the right argument names', () => {
  const s = src('src/lib/admin/adminApi.js')
  assert.match(s, /rpc\('admin_kvk_list', \{ p_actor: actorId \}\)/)
  assert.match(s, /rpc\('admin_kvk_answer', \{ p_actor: actorId, p_id: id, p_answer: answer, p_source_name: meta\.source_name, p_source_date: meta\.source_date, p_valid_until: meta\.valid_until \}\)/)
  assert.match(s, /rpc\('admin_kvk_reopen', \{ p_actor: actorId, p_id: id \}\)/)
  const sql = src('supabase/migrations/0079_kvk_questions.sql')
  assert.match(sql, /function public\.admin_kvk_list\(p_actor uuid\)/)
  assert.match(sql, /function public\.admin_kvk_answer\(p_actor uuid, p_id uuid, p_answer jsonb, p_source_name text, p_source_date date, p_valid_until date\)/)
  assert.match(sql, /function public\.admin_kvk_reopen\(p_actor uuid, p_id uuid\)/)
})
