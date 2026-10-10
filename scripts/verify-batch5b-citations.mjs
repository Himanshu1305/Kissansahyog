#!/usr/bin/env node
// Batch 5B citation gate. Run: node scripts/verify-batch5b-citations.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const rawPath = join(ROOT, 'docs', 'research', 'qa_raw', 'batch5b.json')
const snapshotDir = join(ROOT, 'docs', 'research', 'source_snapshots')
const allowed = ['.gov.in', '.nic.in', '.ac.in', 'icar.org.in', 'bis.gov.in', 'fao.org', 'nabard.org']
const dev = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' }
const normal = (v) => String(v || '').toLowerCase().replace(/[०-९]/g, d => dev[d])
  .replace(/[“”‘’"']/g, '').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim()
const answerText = (q) => [q.short_hi, q.short_en, ...(q.blocks || []).flatMap(b => [b.text, ...(b.items || []).map(i => i.text)]), ...(q.blocks_en || []).flatMap(b => [b.text, ...(b.items || []).map(i => i.text)])].filter(Boolean).join(' ')
const citations = (q) => new Set([...(q.sources || []), ...(q.blocks || []).flatMap(b => [ ...(b.cites || []), ...(b.items || []).flatMap(i => i.cites || []) ]), ...(q.blocks_en || []).flatMap(b => [ ...(b.cites || []), ...(b.items || []).flatMap(i => i.cites || []) ])])
const allFiles = existsSync(snapshotDir) ? readdirSync(snapshotDir).filter(f => f.endsWith('.txt')).map(f => readFileSync(join(snapshotDir, f), 'utf8')) : []
const data = JSON.parse(readFileSync(rawPath, 'utf8'))
const sources = new Map(data.sources.map(s => [s.id, s]))
let pass = 0, fail = 0
const line = (ok, name, why = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${why ? ` — ${why}` : ''}`); ok ? pass++ : fail++ }
const existing = []
for (const file of readdirSync(join(ROOT, 'docs', 'research', 'qa_raw')).filter(f => f.endsWith('.json') && f !== 'batch5b.json')) {
  const other = JSON.parse(readFileSync(join(ROOT, 'docs', 'research', 'qa_raw', file), 'utf8'))
  existing.push(...(other.qas || []))
}
const usedSlugs = new Set(existing.map(q => q.slug))
const usedQuestions = new Set(existing.map(q => normal(q.question_hi)))
const publishers = new Set()
for (const q of data.qas) {
  const ids = citations(q)
  const errors = []
  if (usedSlugs.has(q.slug)) errors.push('duplicate slug')
  if (usedQuestions.has(normal(q.question_hi))) errors.push('duplicate question')
  const quoteText = []
  for (const id of ids) {
    const s = sources.get(id)
    if (!s) { errors.push(`unknown source ${id}`); continue }
    publishers.add(s.publisher)
    let host = ''
    try { host = new URL(s.url).hostname.toLowerCase() } catch { errors.push(`bad URL ${id}`) }
    if (!allowed.some(d => host === d.slice(1) || host.endsWith(d))) errors.push(`disallowed domain ${host}`)
    if (/mp.*agriculture|agriculture.*madhya pradesh/i.test(s.publisher)) errors.push(`MP Agriculture Department source ${id}`)
    const matches = allFiles.some(t => normal(t).includes(normal(s.url)))
    if (!matches) errors.push(`no snapshot for ${id}`)
    for (const quote of s.quotes || []) {
      if (String(quote).trim().split(/\s+/).length > 40) errors.push(`quote over 40 words ${id}`)
      if (!allFiles.some(t => normal(t).includes(normal(quote)))) errors.push(`quote not in snapshot ${id}`)
      quoteText.push(normal(quote))
    }
  }
  const hay = quoteText.join(' ')
  const numbers = [...new Set(normal(answerText(q)).match(/\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)*%?/g) || [])]
  for (const n of numbers) if (!hay.includes(n.replace('%', ''))) errors.push(`number ${n} absent from quotes`)
  line(errors.length === 0, q.slug, errors.join('; '))
}
line(data.qas.length >= 25, 'minimum Q&A count', `${data.qas.length}`)
line(publishers.size >= 6, 'minimum distinct publishers', `${publishers.size}`)
console.log(`\nSummary: ${data.qas.length} Q&As; ${publishers.size} publishers; ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
