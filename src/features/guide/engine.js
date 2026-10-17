// Pure demo engine (no React, no DOM): the state of the mock phone screen and how each
// scripted step changes it. Used by DemoPlayer and importable from plain Node for tests.
//
// Demo descriptor (see demos/*.js):
//   { id, first: screenId, screens: [{ id, title, sheet?, nodes: [node…] }], steps: [step…] }
// Text value ("Txt") anywhere in a descriptor:
//   'string_key'        → t('string_key')           (strings.js)
//   { raw: '575 DI' }   → shown as-is (numbers, model codes, e-mail — never Hindi/English words)
//   { hi, en }          → a label reused from catalog.js / disclaimers.js (the app's own text)
//   [Txt, Txt, …]       → joined
// Node: { type, id?, hidden?, otp?, … } — types are rendered by MockScreen.jsx:
//   bar · pill · h · p · field · row · chips · tiles · check · checks · banner · button ·
//   buttons · card · kv · list · chosen · big · done
//   Containers hold `children` (row, checks, buttons, card); chips / tiles / list hold `items`
//   ([{ id, text, sel? }]) — one `items` group = one single choice (multi: true → many).
// Step: { do: 'type'|'pick'|'check'|'tap'|'look', target, text?, items?, say, reveal?, hide?,
//         go?, fx?, otp? }
//   items: [{ target, do?, text? }] runs several actions in one step (do defaults to step.do).
//   reveal / hide: node ids · go: screen id · fx: confetti · otp: true marks an OTP-only step.

// Walk every node of a demo (depth-first), calling fn(node, screen).
export function walkNodes(demo, fn) {
  const visit = (nodes, screen) => {
    for (const n of nodes || []) {
      fn(n, screen)
      if (n.children) visit(n.children, screen)
    }
  }
  for (const s of demo.screens) visit(s.nodes, s)
}

// id → { node, screen, group?, multi? } for every node and every chip/tile/list item.
export function indexDemo(demo) {
  const idx = {}
  walkNodes(demo, (n, screen) => {
    if (n.id) idx[n.id] = { node: n, screen: screen.id }
    for (const it of n.items || []) idx[it.id] = { node: it, screen: screen.id, group: n.id, multi: !!n.multi }
  })
  return idx
}

export function initialState(demo) {
  const st = { screen: demo.first, values: {}, sel: {}, checked: {}, hidden: {} }
  walkNodes(demo, (n) => {
    if (n.id && n.hidden) st.hidden[n.id] = true
    if (n.id && n.value !== undefined) st.values[n.id] = n.value
    if (n.id && n.on) st.checked[n.id] = true
    for (const it of n.items || []) if (it.sel) st.sel[it.id] = true
  })
  return st
}

export const itemsOf = (step) => step.items || [{ target: step.target, text: step.text }]
export const itemDo = (step, item) => item.do || step.do

// One action of a step, as a NEW state object (inputs are never mutated).
export function applyItem(state, step, item, index) {
  const kind = itemDo(step, item)
  const id = item.target
  if (kind === 'type') return { ...state, values: { ...state.values, [id]: item.text } }
  if (kind === 'check') return { ...state, checked: { ...state.checked, [id]: true } }
  if (kind === 'pick') {
    const meta = index[id]
    const sel = { ...state.sel }
    if (meta?.group && !meta.multi) {
      for (const it of index[meta.group]?.node.items || []) delete sel[it.id]
    }
    sel[id] = true
    return { ...state, sel }
  }
  return state // tap / look change nothing by themselves
}

// What happens after a step's actions: show / hide nodes, change screen.
export function applyEffects(state, step) {
  let st = state
  if (step.reveal || step.hide) {
    const hidden = { ...st.hidden }
    for (const id of step.reveal || []) delete hidden[id]
    for (const id of step.hide || []) hidden[id] = true
    st = { ...st, hidden }
  }
  if (step.go) st = { ...st, screen: step.go }
  return st
}

export function applyStep(state, step, index) {
  let st = state
  for (const it of itemsOf(step)) st = applyItem(st, step, it, index)
  return applyEffects(st, step)
}

// The state just before step i (all earlier steps applied) — used by "jump to step".
export function stateBefore(demo, i, index = indexDemo(demo)) {
  let st = initialState(demo)
  for (let k = 0; k < i && k < demo.steps.length; k++) st = applyStep(st, demo.steps[k], index)
  return st
}

// Every key of strings.js a demo uses (for tests / the Hindi caption sheet).
export function demoKeys(demo) {
  const keys = new Set()
  const add = (v) => {
    if (typeof v === 'string') keys.add(v)
    else if (Array.isArray(v)) v.forEach(add)
  }
  for (const s of demo.screens) add(s.title)
  walkNodes(demo, (n) => {
    for (const k of ['text', 'label', 'ph', 'hint', 'button', 'aside', 'action', 'title', 'line', 'place', 'value']) add(n[k])
    for (const it of n.items || []) { add(it.text); add(it.aside) }
    for (const r of n.rows || []) r.forEach(add)
    for (const p of n.pills || []) add(p)
  })
  for (const st of demo.steps) {
    add(st.say)
    for (const it of itemsOf(st)) add(it.text)
  }
  return [...keys]
}
