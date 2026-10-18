// Batch 10E Phase 4 — the guide "post" demo follows the real post form after Phase 3:
// step 2 = category fields → date block (DateBlock) → extra-info box → photo picker → Continue.
// Also: the register demo matches the phone-only sign-up (no e-mail / password, no OTP).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEMOS } from '../../src/features/guide/demos/index.js'
import { indexDemo, walkNodes, itemsOf, stateBefore, initialState } from '../../src/features/guide/engine.js'
import { strings } from '../../src/lib/i18n/strings.js'

const post = DEMOS.post
const idx = indexDemo(post)
const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const nodeOrder = (demo, screenId) => {
  const out = []
  walkNodes(demo, (n, s) => { if (s.id === screenId && n.id) out.push(n.id) })
  return out
}
const stepOf = (target) => post.steps.findIndex((s) => itemsOf(s).some((it) => it.target === target))

test('post demo: the old availability chips are gone, the date block + photo picker are on step 2', () => {
  for (const id of ['avail_g', 'avail_now', 'avail_dates']) assert.ok(!idx[id], `${id} must not exist`)
  for (const id of ['dates', 'from_q', 'dq_0', 'dq_1', 'dq_2', 'dq_pick', 'from', 'to_q', 'open_end', 'to', 'extra', 'photos', 'photo_add', 'photo_thumb']) {
    assert.ok(idx[id], `${id} exists`)
    assert.equal(idx[id].screen, 's2', `${id} is on step 2 of the form`)
  }
  // same order as Post.jsx: … rate → dates → extra info → photos → Continue
  const order = nodeOrder(post, 's2')
  const at = (id) => order.indexOf(id)
  assert.ok(at('rate') < at('dates') && at('dates') < at('extra') && at('extra') < at('photos') && at('photos') < at('next2'), order.join(' '))
  const real = src('src/screens/Post.jsx')
  const r = (s) => real.indexOf(s)
  assert.ok(r('<mod.Fields') < r('<DateBlock') && r('<DateBlock') < r('<ExtraInfoField') && r('<ExtraInfoField') < r('<PhotoPicker') && r('<PhotoPicker') < real.indexOf('onClick={goConfirm}'), 'Post.jsx order changed: update the demo')
})

test('post demo: date block uses the real DateBlock labels and quick buttons', () => {
  const fields = src('src/components/categories/fields.jsx')
  const keys = {
    from_q: 'field_available_from', to_q: 'date_to_optional',
    dq_0: 'date_today', dq_1: 'date_tomorrow', dq_2: 'date_day_after', open_end: 'date_open_ended',
  }
  for (const [id, key] of Object.entries(keys)) {
    const n = idx[id].node
    const shown = [n.label, n.text].flat().filter((v) => typeof v === 'string')
    assert.ok(shown.includes(key), `${id} shows ${key}`)
    assert.ok(fields.includes(`'${key}'`), `DateBlock uses ${key}`)
  }
  assert.ok([idx.dq_pick.node.text].flat().includes('date_pick') && fields.includes("t('date_pick')"))
  assert.equal(idx.from_q.node.req, true, '"कब से उपलब्ध" is mandatory (*)')
  assert.ok(!idx.to_q.node.req, '"कब तक" is optional')
  assert.equal(strings.field_available_from.hi, 'कब से उपलब्ध')
  assert.equal(strings.date_to_optional.hi, 'कब तक (वैकल्पिक)')
  assert.equal(strings.date_open_ended.hi, 'जब तक चाहें')
  // "जब तक चाहें" starts pressed (no end date), as on the real form
  assert.equal(initialState(post).sel.open_end, true)
  // extra info: shown with its real label, but no step of its own (decision: demo length)
  assert.deepEqual([idx.extra.node.label], ['extra_info_label'])
  assert.equal(stepOf('extra'), -1)
})

test('post demo: the date step and the photo step exist, in form order, before Continue', () => {
  const d = stepOf('dq_0'), p = stepOf('photo_add'), rate = stepOf('rate'), next = stepOf('next2')
  assert.ok(d > rate && p === d + 1 && next === p + 1, `rate ${rate} → dates ${d} → photo ${p} → next ${next}`)
  assert.equal(post.steps[d].say, 'guide_post_dates')
  assert.equal(post.steps[p].say, 'guide_post_photo')
  // tapping "आज" presses the chip and fills the start box with the labelled sample
  const before = stateBefore(post, d, idx), after = stateBefore(post, d + 1, idx)
  assert.ok(!before.sel.dq_0 && before.values.from === undefined)
  assert.equal(after.sel.dq_0, true)
  assert.equal(after.values.from, 'guide_s_today_date')
  assert.equal(idx.from.node.sample, true, 'the date value carries the "नमूना" tag')
  assert.equal(after.sel.open_end, true, 'end stays "जब तक चाहें"')
  // the photo appears only after "फोटो जोड़ें"
  assert.equal(stateBefore(post, p, idx).hidden.photo_thumb, true)
  assert.ok(!stateBefore(post, p + 1, idx).hidden.photo_thumb)
  assert.equal(idx.photo_thumb.node.text, 'guide_example_photo')
  assert.equal(strings.guide_example_photo.hi, 'उदाहरण फोटो')
  for (const k of ['guide_post_dates', 'guide_post_photo', 'guide_s_today_date', 'guide_example_photo']) assert.ok(strings[k]?.hi && strings[k]?.en, k)
  assert.ok(post.steps.length === 16, `post demo has ${post.steps.length} steps (14 + 2)`)
})

test('post demo: the sample photo is drawn in code, no image file, no upload', () => {
  const mock = src('src/features/guide/MockScreen.jsx')
  assert.match(mock, /case 'thumb':[\s\S]*?<svg viewBox/)
  assert.doesNotMatch(src('src/features/guide/demos/post.js'), /\.(png|jpe?g|webp|gif|svg)['"]/i)
  assert.doesNotMatch(mock, /<img|uploadPhotos|createObjectURL|type="file"/)
})

test('register demo matches the phone-only sign-up: no e-mail, no password, no OTP', () => {
  const reg = DEMOS.register
  const ids = Object.keys(indexDemo(reg))
  for (const id of ['email', 'password', 'otp_send', 'otp_code', 'otp_ok']) assert.ok(!ids.includes(id), `${id} must not exist`)
  assert.deepEqual(reg.steps.slice(0, 2).map((s) => s.target), ['name', 'mobile'])
  assert.ok(!reg.steps.some((s) => s.say === 'guide_reg_3'), 'old e-mail/password caption not used')
})
