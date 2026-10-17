// Batch 10C Task F — unit checks for the guide demos (Node's built-in runner, no dependency).
// Run: node --test "tests/unit/*.test.mjs"   (Node 24 treats a bare directory as a file name)
// 1. OTP gate (HARD RULE 6): buildRegisterDemo({ otpLive:false }) has no OTP steps / nodes,
//    { otpLive:true } has Send OTP → code → verified. The shipped flag is false.
// 2. Every demo: each step target exists in the demo's screens, each reveal / hide / go id
//    exists, and every strings.js key the demo uses exists with both hi and en.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRegisterDemo } from '../../src/features/guide/demos/register.js'
import { DEMOS } from '../../src/features/guide/demos/index.js'
import { GUIDE_OTP_LIVE, GUIDE_ORDER } from '../../src/features/guide/config.js'
import { indexDemo, walkNodes, demoKeys, itemsOf, stateBefore, initialState } from '../../src/features/guide/engine.js'
import { strings } from '../../src/lib/i18n/strings.js'

const otpNodes = (demo) => {
  const out = []
  walkNodes(demo, (n) => { if (n.otp) out.push(n.id) })
  return out
}

test('shipped flag: GUIDE_OTP_LIVE is false and the shipped register demo has no OTP', () => {
  assert.equal(GUIDE_OTP_LIVE, false)
  assert.equal(DEMOS.register.steps.filter((s) => s.otp).length, 0)
  assert.deepEqual(otpNodes(DEMOS.register), [])
})

test('otpLive:false → zero OTP steps and zero OTP nodes', () => {
  const d = buildRegisterDemo({ otpLive: false })
  assert.equal(d.steps.filter((s) => s.otp).length, 0)
  assert.deepEqual(otpNodes(d), [])
  const ids = Object.keys(indexDemo(d))
  for (const id of ['otp_send', 'otp_code', 'otp_ok']) assert.ok(!ids.includes(id), `${id} must not exist`)
  assert.ok(!d.steps.some((s) => String(s.say).includes('otp')), 'no OTP caption')
})

test('otpLive:true → Send OTP, 6-digit code, verified steps (right after the mobile step)', () => {
  const d = buildRegisterDemo({ otpLive: true })
  const otpSteps = d.steps.filter((s) => s.otp)
  assert.equal(otpSteps.length, 2)
  assert.deepEqual(otpNodes(d).sort(), ['otp_code', 'otp_ok', 'otp_send'])
  // order: name, mobile, Send OTP, type code, …
  assert.equal(d.steps[1].target, 'mobile')
  assert.equal(d.steps[2].target, 'otp_send')
  assert.deepEqual(d.steps[2].reveal, ['otp_code'])
  assert.equal(d.steps[3].target, 'otp_code')
  assert.match(d.steps[3].text.raw, /^\d{6}$/)
  assert.deepEqual(d.steps[3].reveal, ['otp_ok'])
  // code field + verified line start hidden, appear after the steps
  const before = initialState(d)
  assert.equal(before.hidden.otp_code, true)
  assert.equal(before.hidden.otp_ok, true)
  const after = stateBefore(d, 4)
  assert.ok(!after.hidden.otp_code && !after.hidden.otp_ok)
  assert.equal(after.values.otp_code.raw, '482159')
  // every other step is unchanged versus the no-OTP build
  const off = buildRegisterDemo({ otpLive: false })
  assert.equal(d.steps.length, off.steps.length + 2)
  assert.deepEqual(d.steps.filter((s) => !s.otp).map((s) => s.say), off.steps.map((s) => s.say))
})

for (const otpLive of [false, true]) {
  test(`register (otpLive:${otpLive}) is internally consistent`, () => checkDemo(buildRegisterDemo({ otpLive })))
}
for (const id of Object.keys(DEMOS)) {
  test(`demo "${id}": targets exist in the screens, keys exist in strings.js`, () => checkDemo(DEMOS[id]))
}

test('GUIDE_ORDER covers the three scripted demos + the tour', () => {
  assert.deepEqual(GUIDE_ORDER, ['register', 'post', 'find', 'tour'])
  for (const id of GUIDE_ORDER.filter((x) => x !== 'tour')) assert.ok(DEMOS[id], id)
  // hub / page keys
  for (const id of GUIDE_ORDER) {
    for (const k of [`guide_${id}_h1`, `guide_${id}_sub`, `guide_${id}_fin`, `guide_${id}_seo_title`, `guide_${id}_seo_desc`]) {
      assert.ok(strings[k]?.hi && strings[k]?.en, `missing string ${k}`)
    }
  }
})

function checkDemo(demo) {
  const idx = indexDemo(demo)
  const screenIds = new Set(demo.screens.map((s) => s.id))
  assert.ok(screenIds.has(demo.first), `first screen ${demo.first}`)
  // step target must be on the screen that is showing when the step runs, and not hidden
  demo.steps.forEach((step, i) => {
    const st = stateBefore(demo, i, idx)
    for (const it of itemsOf(step)) {
      assert.ok(it.target, `${demo.id} step ${i}: no target`)
      const meta = idx[it.target]
      assert.ok(meta, `${demo.id} step ${i}: target "${it.target}" not in any screen`)
      assert.equal(meta.screen, st.screen, `${demo.id} step ${i}: target "${it.target}" is on ${meta.screen}, screen showing is ${st.screen}`)
      assert.ok(!st.hidden[it.target], `${demo.id} step ${i}: target "${it.target}" is hidden when its step runs`)
    }
    for (const id of [...(step.reveal || []), ...(step.hide || [])]) assert.ok(idx[id], `${demo.id} step ${i}: reveal/hide "${id}" missing`)
    if (step.go) assert.ok(screenIds.has(step.go), `${demo.id} step ${i}: go "${step.go}" missing`)
    assert.equal(typeof step.say, 'string', `${demo.id} step ${i}: caption`)
  })
  // last step leaves the demo on a real screen
  const end = stateBefore(demo, demo.steps.length, idx)
  assert.ok(screenIds.has(end.screen))
  // all strings keys exist in both languages
  const missing = demoKeys(demo).filter((k) => !(strings[k] && typeof strings[k].hi === 'string' && strings[k].hi && typeof strings[k].en === 'string' && strings[k].en))
  assert.deepEqual(missing, [], `${demo.id}: keys missing from strings.js`)
}
