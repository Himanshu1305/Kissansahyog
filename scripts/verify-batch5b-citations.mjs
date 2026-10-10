#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { extractPageText } from './lib/page-text.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const raw = JSON.parse(readFileSync(join(ROOT, 'docs/research/qa_raw/batch5b.json'), 'utf8'))
const evidence = JSON.parse(readFileSync(join(ROOT, 'docs/research/qa_raw/batch5b.evidence.json'), 'utf8'))
const allowed = ['.gov.in', '.nic.in', '.ac.in', 'icar.org.in', 'bis.gov.in', 'fao.org', 'nabard.org']
const dev = { '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9' }
const normal = v => String(v ?? '').toLowerCase().replace(/[०-९]/g, d => dev[d]).replace(/[“”‘’"']/g, '').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim()
const numbers = v => [...new Set(normal(v).match(/\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)*%?/g) || [])]
const words = v => normal(v).split(/\s+/).filter(Boolean).length
const sources = new Map(raw.sources.map(s => [s.id, s]))
const snapDir = join(ROOT, 'docs/research/source_snapshots')
const snapshots = existsSync(snapDir) ? readdirSync(snapDir).filter(n => n.endsWith('.txt')).map(n => readFileSync(join(snapDir, n), 'utf8')) : []
const snapshotFor = url => snapshots.find(t => normal(t.split('\n', 1)[0]).includes(normal(url)) && validHeader(t))
const validHeader = t => /^https?:\/\/[^|]+\| HTTP 200 \| fetched at (?![^|]*00:00:00Z)[^|]+Z \| sha256 [a-f0-9]{64} \|/i.test(t.split('\n', 1)[0])
const items = q => {
  const out = []
  if (q.short_hi || q.short_en) out.push({ item: 'short', text: `${q.short_hi || ''} ${q.short_en || ''}` })
  for (const block of [...(q.blocks || []), ...(q.blocks_en || [])]) {
    if (block.text) out.push({ item: `block:${out.length}`, text: block.text })
    for (const entry of block.items || []) out.push({ item: `item:${out.length}`, text: entry.text || '' })
  }
  return out
}
const others = []
for (const file of readdirSync(join(ROOT, 'docs/research/qa_raw')).filter(f => f.endsWith('.json') && !f.startsWith('batch5b.'))) others.push(...(JSON.parse(readFileSync(join(ROOT, 'docs/research/qa_raw', file), 'utf8')).qas || []))
const oldSlugs = new Set(others.map(q => q.slug)); const oldQuestions = new Set(others.map(q => normal(q.question_hi)))
const live = process.argv.includes('--live'); const liveText = new Map()
if (live) for (const source of raw.sources) {
  try {
    const response = await fetch(source.url, { headers: { 'user-agent': 'KissanSahyog citation verifier/1.0 (live check)' }, signal: AbortSignal.timeout(60000) })
    const body = Buffer.from(await response.arrayBuffer())
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
    const page = await extractPageText(body, response.headers.get('content-type') || '')
    if (page.text.length < 600 || (/enable javascript|javascript is required|please enable javascript/i.test(page.text) && page.text.length < 2000)) throw new Error('unusable static text')
    liveText.set(source.id, normal(page.text))
  } catch (error) { liveText.set(source.id, `__ERROR__ ${error.message}`) }
}
let pass = 0, fail = 0
const quoteOwners = new Map(), sourceCounts = new Map(), publishers = new Set()
for (const q of raw.qas) {
  const errors = []; const rows = evidence[q.slug]
  if (oldSlugs.has(q.slug)) errors.push('duplicate slug')
  if (oldQuestions.has(normal(q.question_hi))) errors.push('duplicate question')
  if (!Array.isArray(rows) || !rows.length) errors.push('no evidence rows')
  for (const answer of items(q)) {
    const own = (rows || []).filter(row => row.item === answer.item)
    if (!own.length) { errors.push(`no evidence for ${answer.item}`); continue }
    const material = own.map(row => `${row.quote || ''} ${row.derived || ''}`).join(' ')
    for (const n of numbers(answer.text)) if (!normal(material).includes(n.replace('%', ''))) errors.push(`${answer.item}: number ${n} absent from its evidence`)
  }
  const cited = new Set(q.sources || [])
  for (const row of rows || []) {
    const source = sources.get(row.source); cited.add(row.source)
    if (!source) { errors.push(`unknown source ${row.source}`); continue }
    if (!row.claim || !row.quote) errors.push(`incomplete evidence for ${row.item}`)
    if (words(row.quote) > 40) errors.push(`quote over 40 words for ${row.item}`)
    const snapshot = snapshotFor(source.url)
    if (!snapshot) errors.push(`no snapshot for ${row.source}`)
    else { if (!validHeader(snapshot)) errors.push(`invalid snapshot header for ${row.source}`); if (!normal(snapshot).includes(normal(row.quote))) errors.push(`quote missing from snapshot for ${row.item}`) }
    if (live) { const page = liveText.get(row.source) || ''; if (page.startsWith('__ERROR__')) errors.push(`live fetch failed for ${row.source}: ${page.slice(10)}`); else if (!page.includes(normal(row.quote))) errors.push(`quote missing from live page for ${row.item}`) }
    const owner = quoteOwners.get(normal(row.quote)); if (owner && owner !== q.slug) errors.push(`quote reused by ${owner}`); else quoteOwners.set(normal(row.quote), q.slug)
  }
  for (const id of cited) {
    const source = sources.get(id); if (!source) continue
    const host = new URL(source.url).hostname.toLowerCase()
    if (!allowed.some(domain => host === domain.slice(1) || host.endsWith(domain))) errors.push(`disallowed domain ${host}`)
    if (/mp agriculture department|agriculture.*madhya pradesh/i.test(source.publisher)) errors.push(`MP Agriculture Department source ${id}`)
    publishers.add(source.publisher); sourceCounts.set(id, (sourceCounts.get(id) || 0) + 1)
  }
  console.log(`${errors.length ? 'FAIL' : 'PASS'}  ${q.slug}${errors.length ? ` — ${errors.join('; ')}` : ''}`); errors.length ? fail++ : pass++
}
for (const [id, count] of sourceCounts) if (count > 3) { console.log(`FAIL  source ${id} — supports ${count} Q&As (limit 3)`); fail++ }
console.log(`TARGET 25 Q&As: ${raw.qas.length >= 25 ? 'MET' : 'NOT MET'} (${raw.qas.length})`)
console.log(`TARGET 6 publishers: ${publishers.size >= 6 ? 'MET' : 'NOT MET'} (${publishers.size})`)
console.log(`\nSummary: ${raw.qas.length} Q&As; ${publishers.size} publishers; ${pass} passed, ${fail} failed${live ? '; live mode' : ''}`)
process.exit(fail ? 1 : 0)
