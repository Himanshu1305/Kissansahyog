// Batch 10C — Task I. Builds docs/review/batch10c/HINDI_CAPTIONS.md: every caption and
// on-screen label of the four guide demos (register, post, find, tour) in Hindi and English,
// plus every other guide_ string, so the founder can review the Hindi (DRAFT, HUMAN-REVIEW).
//
// Run: node scripts/batch10c/gen-hindi-captions.mjs
// Read-only on the app: imports the plain-JS demo data / strings / catalog / disclaimers;
// TourExplorer.jsx (JSX) is read as text and its keys pulled out with regexes.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/')
const imp = (p) => import(new URL(`file:///${join(ROOT, p).replace(/\\/g, '/')}`).href)

const { strings } = await imp('src/lib/i18n/strings.js')
const { disclaimers } = await imp('src/lib/i18n/disclaimers.js')
const catalog = await imp('src/lib/listings/catalog.js')
const { buildRegisterDemo } = await imp('src/features/guide/demos/register.js')
const { default: post } = await imp('src/features/guide/demos/post.js')
const { default: find } = await imp('src/features/guide/demos/find.js')
const { walkNodes, itemsOf } = await imp('src/features/guide/engine.js')

const OUT = join(ROOT, 'docs/review/batch10c/HINDI_CAPTIONS.md')
const TOUR_FILE = join(ROOT, 'src/features/guide/TourExplorer.jsx')

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
const missing = new Set() // keys referenced but absent from strings.js
const covered = new Set() // keys printed in the document
let rowCount = 0

const isKey = (v) => typeof v === 'string'
const hiOf = (k) => (strings[k] ? strings[k].hi : (missing.add(k), `⚠️ MISSING KEY ${k}`))
const enOf = (k) => (strings[k] ? strings[k].en : (missing.add(k), `⚠️ MISSING KEY ${k}`))

// Find where a {hi,en} object comes from (catalog.js / disclaimers.js): by identity first,
// then by equal Hindi + English (demo files copy some of them, e.g. the listing consents),
// including the per-type spec labels / placeholders catalog.js builds at run time for 'Tractor'.
const SPEC_CANDIDATES = [
  ...catalog.equipmentSpecFields('Tractor').map((f) => [f.label, `catalog.js equipmentSpecFields('Tractor') ${f.key} label`]),
  ...catalog.equipmentSpecFields('Tractor').map((f) => [catalog.specPlaceholder(f.key, 'Tractor'), `catalog.js specPlaceholder('${f.key}', 'Tractor')`]),
].filter(([o]) => o)
function findSource(obj) {
  const trees = [...Object.entries(catalog).map(([n, v]) => [v, n, 'catalog.js ']), [disclaimers, '', 'disclaimers.js ']]
  for (const sameFn of [(a, b) => a === b, (a, b) => a && b && typeof a === 'object' && a.hi === b.hi && a.en === b.en]) {
    const seen = new Set()
    const search = (val, path, depth) => {
      if (sameFn(val, obj)) return path
      if (!val || typeof val !== 'object' || depth > 3 || seen.has(val)) return null
      seen.add(val)
      for (const [k, v] of Object.entries(val)) {
        const p = Array.isArray(val) ? `${path}[${v && v.value ? v.value : v && v.id ? v.id : k}]` : `${path}${path ? '.' : ''}${k}`
        const r = search(v, p, depth + 1)
        if (r) return r
      }
      return null
    }
    for (const [val, name, file] of trees) {
      const r = search(val, name, 0)
      if (r) return file + r
    }
    for (const [o, label] of SPEC_CANDIDATES) if (sameFn(o, obj)) return label
  }
  return null
}

// Render a Txt value (key | {raw} | {hi,en} | array) in one language.
function render(v, lang) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map((x) => render(x, lang)).join('')
  if (isKey(v)) return lang === 'hi' ? hiOf(v) : enOf(v)
  if (v.raw !== undefined) return v.raw
  if (v.hi !== undefined || v.en !== undefined) return v[lang] ?? ''
  return ''
}
// The key(s) a Txt value uses, for the Key column.
function keysOf(v) {
  if (v == null) return []
  if (Array.isArray(v)) return v.flatMap(keysOf)
  if (isKey(v)) return [v]
  return []
}
// Flatten a Txt value into its atoms (keys and inline objects), for the screen-label table.
function atoms(v, out = []) {
  if (v == null) return out
  if (Array.isArray(v)) { v.forEach((x) => atoms(x, out)); return out }
  out.push(v)
  return out
}
const meaningfulRaw = (s) => /[\p{L}\p{N}]/u.test(s)
const status = (k) => (k.startsWith('guide_') ? 'NEW in Batch 10C — draft' : 'app text, already live')

// ---------- per-demo tables ----------
function stepsTable(demoName, steps, startAt = 1) {
  const lines = ['| Demo | Step | Hindi | English | Key |', '|---|---|---|---|---|']
  steps.forEach((st, i) => {
    keysOf(st.say).forEach((k) => covered.add(k))
    lines.push(`| ${demoName} | ${startAt + i} | ${esc(render(st.say, 'hi'))} | ${esc(render(st.say, 'en'))} | \`${keysOf(st.say).join(' + ') || '(inline)'}\` |`)
    rowCount++
  })
  return lines.join('\n')
}

// Every distinct atom on the demo's screens (and text typed in by steps), in order of appearance.
function collectScreenAtoms(demo) {
  const list = [] // { screen, atom, where }
  const add = (screen, v, where) => atoms(v).forEach((a) => list.push({ screen, atom: a, where }))
  for (const s of demo.screens) add(s, s.title, 'screen title')
  walkNodes(demo, (n, s) => {
    for (const k of ['label', 'ph', 'text', 'hint', 'button', 'aside', 'action', 'title', 'line', 'place', 'value']) add(s, n[k], `${n.type} ${k}`)
    for (const it of n.items || []) { add(s, it.text, `${n.type} item`); add(s, it.aside, `${n.type} item`) }
    for (const r of n.rows || []) r.forEach((c) => add(s, c, 'kv row'))
    for (const p of n.pills || []) add(s, p, 'tag')
    if (n.copy) list.push({ screen: s, atom: n.copy, where: 'banner (Hindi + English shown together)' })
  })
  const screenOfTarget = {}
  walkNodes(demo, (n, s) => { if (n.id) screenOfTarget[n.id] = s; for (const it of n.items || []) screenOfTarget[it.id] = s })
  for (const st of demo.steps) for (const it of itemsOf(st)) if (it.text) add(screenOfTarget[it.target] || demo.screens[0], it.text, 'typed in by the demo')
  return list
}

function screenTable(demoName, demo) {
  const lines = ['| Demo | Screen | Hindi | English | Key | Status |', '|---|---|---|---|---|---|']
  const seen = new Set()
  for (const { screen, atom, where } of collectScreenAtoms(demo)) {
    const scr = `${screen.id} (${esc(render(screen.title, 'en'))})`
    let id, hi, en, key, stat
    if (isKey(atom)) {
      id = `k:${atom}`; hi = hiOf(atom); en = enOf(atom); key = `\`${atom}\``; stat = status(atom)
      covered.add(atom)
    } else if (atom.raw !== undefined) {
      if (!meaningfulRaw(atom.raw)) continue
      id = `r:${atom.raw.trim()}`; hi = en = atom.raw.trim().replace(/^·\s*|\s*·$/g, ''); key = '(inline, raw)'; stat = 'sample value, shown as-is (not translated)'
    } else {
      const src = findSource(atom) || 'inline {hi,en} in the demo file'
      id = `o:${atom.hi}|${atom.en}`; hi = atom.hi; en = atom.en; key = `(inline) ${src}`
      stat = src.startsWith('inline') ? 'NEW in Batch 10C — draft' : 'app text, already live'
    }
    if (seen.has(id)) continue
    seen.add(id)
    lines.push(`| ${demoName} | ${scr} | ${esc(hi)} | ${esc(en)} | ${esc(key)} | ${stat}${where.startsWith('typed') ? ' (typed in by the demo)' : ''} |`)
    rowCount++
  }
  return lines.join('\n')
}

// ---------- tour (JSX → read as text) ----------
function tourData() {
  const src = readFileSync(TOUR_FILE, 'utf8')
  const tabs = [...src.matchAll(/\{\s*key:\s*'(\w+)',[^}]*?title:\s*'(\w+)',\s*sub:\s*'(\w+)',\s*say:\s*'(\w+)'/g)]
    .map((m) => ({ key: m[1], title: m[2], sub: m[3], say: m[4] }))
  // Split the screen-building code into one block per tab (if / else if / else).
  const body = src.slice(src.indexOf("if (tab.key === '"), src.indexOf('return (\n    <div className="ksg-player'))
  const parts = body.split(/\}\s*else\s*(?:if\s*\(tab\.key === '(\w+)'\))?\s*\{/)
  const blocks = {}
  const first = body.match(/if \(tab\.key === '(\w+)'\)/)[1]
  blocks[first] = parts[0]
  for (let i = 1; i < parts.length; i += 2) blocks[parts[i] || tabs[tabs.length - 1].key] = parts[i + 1]
  const shared = src.slice(src.indexOf('return (\n    <div className="ksg-player'))
  const consts = src.slice(0, src.indexOf('export default function TourExplorer'))
  const quoted = (txt) => [...txt.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((m) => m[1]).filter((k) => strings[k])
  // Template keys (t(`guide_tour_${y}`) etc.) — expanded from the arrays they loop over.
  const expand = (txt) => {
    const out = []
    for (const m of txt.matchAll(/\[((?:'\w+',?\s*)+)\]\.map\(\((\w+)(?:,\s*\w+)?\)\s*=>[\s\S]*?(?=\n\s{8}\)\)|\n\s{6}<\/div>)/g)) {
      const vals = [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])
      const v = m[2]
      for (const tm of m[0].matchAll(/t\(`([a-z_]*)\$\{(\w+)\}([a-z_]*)`\)/g)) if (tm[2] === v) vals.forEach((x) => out.push(tm[1] + x + tm[3]))
    }
    return out.filter((k) => strings[k] || missing.add(k))
  }
  const priceKeys = quoted((consts.match(/const PRICES = [^\n]*/) || [''])[0])
  const extra = {
    // computed keys TourExplorer builds at run time
    weather: [...Array.from({ length: 7 }, (_, i) => `wday_${i}`), ...[...new Set([...(consts.match(/const WEEK = [^\n]*/) || [''])[0].matchAll(/\[\d+,\s*(\d+)\]/g)].map((m) => m[1]))].map((c) => `wcode_${c}`)],
    mandi: priceKeys,
  }
  return { tabs, blocks, shared, quoted, expand, extra, src }
}

function tourSection() {
  const { tabs, blocks, shared, quoted, expand, extra } = tourData()
  const out = []
  out.push('### Steps (captions)\n')
  out.push('The tour is not a scripted demo: it shows five tabs, one caption per tab (it moves to the next tab every 6 seconds until the visitor taps something).\n')
  out.push(stepsTable('tour', tabs.map((t) => ({ say: t.say }))))
  out.push('\n### Screen labels\n')
  const lines = ['| Demo | Screen | Hindi | English | Key | Status |', '|---|---|---|---|---|---|']
  const seen = new Set()
  const row = (scr, k) => {
    if (seen.has(scr + k)) return
    seen.add(scr + k); covered.add(k)
    lines.push(`| tour | ${scr} | ${esc(hiOf(k))} | ${esc(enOf(k))} | \`${k}\` | ${status(k)} |`)
    rowCount++
  }
  const objRow = (scr, o, src) => {
    if (seen.has(scr + src)) return
    seen.add(scr + src)
    lines.push(`| tour | ${scr} | ${esc(o.hi)} | ${esc(o.en)} | (inline) ${esc(src)} | app text, already live |`)
    rowCount++
  }
  for (const t of tabs) {
    const scr = `${t.key} (${esc(enOf(t.title))})`
    row(scr, t.title); row(scr, t.sub)
    const block = blocks[t.key] || ''
    for (const k of [...quoted(block), ...expand(block), ...(extra[t.key] || [])]) row(scr, k)
    if (t.key === 'market') {
      for (const c of ['equipment', 'agri_inputs', 'building_materials']) objRow(scr, catalog.CATEGORY_META[c], `catalog.js CATEGORY_META.${c}`)
      for (const g of catalog.EQUIPMENT_TAGS) objRow(scr, g, `catalog.js EQUIPMENT_TAGS[${g.value}]`)
      objRow(scr, catalog.TRACTOR_BRANDS.find((b) => b.value === 'Mahindra'), 'catalog.js TRACTOR_BRANDS[Mahindra]')
      objRow(scr, catalog.RENTAL_BASIS.find((b) => b.value === 'per_hour'), 'catalog.js RENTAL_BASIS[per_hour]')
    }
  }
  for (const k of quoted(shared)) if (!tabs.some((t) => t.title === k || t.sub === k || t.say === k)) row('all tabs (side panel, footer, finish box)', k)
  out.push(lines.join('\n'))
  return out.join('\n')
}

// ---------- where a guide_ key is used (for the last section) ----------
function srcFiles(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) srcFiles(p, acc)
    else if (/\.(jsx?|mjs)$/.test(f) && !p.endsWith('strings.js')) acc.push(p)
  }
  return acc
}
const files = [...srcFiles(join(ROOT, 'src')), ...(() => { try { return srcFiles(join(ROOT, 'scripts')) } catch { return [] } })()]
  .filter((p) => !p.includes('batch10c'))
const fileText = Object.fromEntries(files.map((p) => [rel(p), readFileSync(p, 'utf8')]))
const usedIn = (k) => {
  const hits = Object.entries(fileText).filter(([, txt]) => new RegExp(`['"\`]${k}['"\`]`).test(txt)).map(([f]) => f.replace(/^src\//, ''))
  if (hits.length) return hits.join(', ')
  const tmpl = Object.entries(fileText).filter(([, txt]) => [...txt.matchAll(/`([a-z_]+)\$\{\w+\}([a-z0-9_]*)`/g)].some((m) => {
    const [, pre, suf] = m
    if (!pre.startsWith('guide_') || !k.startsWith(pre) || !k.endsWith(suf) || k.length <= pre.length + suf.length) return false
    return /^[a-z0-9]+$/.test(k.slice(pre.length, k.length - suf.length)) && (suf || pre !== 'guide_')
  })).map(([f]) => f.replace(/^src\//, ''))
  return tmpl.length ? `${tmpl.join(', ')} (built from a pattern)` : 'not found in code yet'
}

// ---------- assemble ----------
const regNormal = buildRegisterDemo({ otpLive: false })
const regOtp = buildRegisterDemo({ otpLive: true })
const otpSteps = regOtp.steps.map((s, i) => ({ s, n: i + 1 })).filter((x) => x.s.otp)

const md = []
md.push(`# Guide demos — Hindi and English text, for review

**DRAFT — HUMAN-REVIEW. The Hindi in this file is NOT final.** It was written by the build team and needs your eye before it is called final.

## What this is

The new **Guide** pages (\`/guide\`) teach the app with four short "watch how it works" demos on a pretend phone:
**Register** (how to sign up), **Post** (how to put up a listing), **Find** (how to find a number), and the **Tour** (a quick look at the other pages).
This file lists every sentence those demos show, in Hindi and in English, in the order a visitor sees them:

- **Steps (captions)** — the sentence shown above the phone at each step of a demo.
- **Screen labels** — the words written on the pretend phone screen (field names, example text, buttons, chips, notes).
- The last section lists the rest of the Guide's own text: the hub page, buttons, tips, the "sample" badge, links into the guide from other pages, and the search-engine (SEO) title and description.

## How to read the Status column

- **NEW in Batch 10C — draft** — new text written for the Guide. Change it freely; it only changes the Guide.
- **app text, already live** — the pretend screen reuses the real app's own wording so the demo looks exactly like the real page. **If you correct one of these, the real app will change too** (the same words are shown on the real page). That may be what you want — just know it.
- **sample value, shown as-is** — numbers, model codes, e-mail: never translated.

## How to send corrections

Reply with the **Key** (for example \`guide_reg_1\`) or quote the row, and write the Hindi you want. One line per correction is perfect.
Rows whose key says "(inline)" live in the demo file or the app's catalog, not in strings.js — quote the row and we will find it.

## About the sample data

The names, village, phone number (98765 43210), e-mail (ram@example.com), OTP code, prices and machines in the demos are **made up**. The phone screens carry a "sample" badge. Nothing in a demo is sent anywhere or saved.

_Generated by \`node scripts/batch10c/gen-hindi-captions.mjs\` from the code — re-run it after string changes; do not hand-edit this file._
`)

md.push('## 1. Register — how to sign up\n')
md.push('### Steps (captions)\n')
md.push('Today\'s signup (no OTP — `GUIDE_OTP_LIVE` is off):\n')
md.push(stepsTable('register', regNormal.steps))
md.push('\n### OTP steps (shown only when OTP signup goes live)\n')
md.push('These two steps are switched off today. When phone OTP signup goes live, they appear right after the mobile-number step (step numbers below are their place in that longer flow).\n')
{
  const lines = ['| Demo | Step | Hindi | English | Key |', '|---|---|---|---|---|']
  for (const { s, n } of otpSteps) {
    keysOf(s.say).forEach((k) => covered.add(k))
    lines.push(`| register (OTP) | ${n} | ${esc(render(s.say, 'hi'))} | ${esc(render(s.say, 'en'))} | \`${keysOf(s.say).join(' + ')}\` |`)
    rowCount++
  }
  md.push(lines.join('\n'))
}
md.push('\n### Screen labels\n')
md.push('Includes the OTP button and labels (marked by their `guide_otp_` keys), which also only show once OTP signup is live.\n')
md.push(screenTable('register', regOtp))

md.push('\n## 2. Post — how to put up a listing\n')
md.push('### Steps (captions)\n')
md.push(stepsTable('post', post.steps))
md.push('\n### Screen labels\n')
md.push(screenTable('post', post))

md.push('\n## 3. Find — how to find a number\n')
md.push('### Steps (captions)\n')
md.push(stepsTable('find', find.steps))
md.push('\n### Screen labels\n')
md.push(screenTable('find', find))

md.push('\n## 4. Tour — a quick look at the other pages\n')
md.push(tourSection())

// Everything else with the guide_ prefix.
const guideKeys = Object.keys(strings).filter((k) => k.startsWith('guide_'))
const rest = guideKeys.filter((k) => !covered.has(k))
md.push('\n## 5. Hub, buttons, tips, badge, entry points and SEO\n')
md.push('All other new Guide text (every `guide_` string not already listed above). "Used in" says which file shows it.\n')
{
  const lines = ['| Hindi | English | Key | Used in |', '|---|---|---|---|']
  for (const k of rest) {
    covered.add(k)
    lines.push(`| ${esc(strings[k].hi)} | ${esc(strings[k].en)} | \`${k}\` | ${esc(usedIn(k))} |`)
    rowCount++
  }
  md.push(lines.join('\n'))
}

const notCovered = guideKeys.filter((k) => !covered.has(k))
const unused = guideKeys.filter((k) => usedIn(k) === 'not found in code yet')
md.push(`
## Counts

- Table rows in this file: **${rowCount}**
- \`guide_\` keys in strings.js: **${guideKeys.length}**; covered in this file: **${guideKeys.filter((k) => covered.has(k)).length}**
- \`guide_\` keys NOT covered: ${notCovered.length ? notCovered.map((k) => `\`${k}\``).join(', ') : '**none**'}
- Keys used by the demos but missing from strings.js: ${missing.size ? [...missing].map((k) => `\`${k}\``).join(', ') : '**none**'}
- \`guide_\` keys in strings.js not found in any code file: ${unused.length ? unused.map((k) => `\`${k}\``).join(', ') : '**none**'}
`)

writeFileSync(OUT, md.join('\n'))
console.log(`wrote ${rel(OUT)}: ${rowCount} rows; guide_ keys ${guideKeys.filter((k) => covered.has(k)).length}/${guideKeys.length} covered`)
if (notCovered.length) console.log('NOT COVERED:', notCovered.join(', '))
if (missing.size) console.log('MISSING FROM strings.js:', [...missing].join(', '))
if (unused.length) console.log('guide_ keys not found in code:', unused.join(', '))
