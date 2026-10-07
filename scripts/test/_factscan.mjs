// Temp helper (Batch 3): dump distinct cites + numeric/fact tokens from a content page.
//   node scripts/test/_factscan.mjs <pagefile.js>
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const file = process.argv[2]
if (!file) { console.log('usage: node scripts/test/_factscan.mjs <content-page.js>  (dev helper, not a test)'); process.exit(0) }
const mod = await import(pathToFileURL(join(process.cwd(), file)).href)
const page = mod.default || Object.values(mod)[0]
const cites = new Set(), nums = new Set(), hiWords = []
const str = (t) => typeof t === 'string' ? t : (t && (t.hi || t.en)) ? `${t.hi || ''} ${t.en || ''}` : ''
const hi = (t) => typeof t === 'string' ? '' : (t && t.hi) ? t.hi : ''
const NUM = /₹[\d,]+|\d+(?:\.\d+)?\s*[–-]\s*\d+(?:\.\d+)?%?|\d+(?:\.\d+)?%|\b\d{4}\b|\d{1,3}(?:,\d{2,3})+/g
function scan(b) {
  if (!b || typeof b !== 'object') return
  for (const c of b.cites || []) cites.add(c)
  for (const key of ['text', 'title', 'formula', 'result']) {
    const s = str(b[key]); if (s.trim()) { (s.match(NUM) || []).forEach((n) => nums.add(n.replace(/\s+/g, ''))) }
    const h = hi(b[key]); if (h) hiWords.push(...h.split(/\s+/).filter(Boolean))
  }
  for (const it of b.items || []) { if (typeof it === 'object') { for (const c of it.cites || []) cites.add(c); const s = str(it.text ?? it); (s.match(NUM) || []).forEach((n) => nums.add(n.replace(/\s+/g, ''))); const h = hi(it.text ?? it); if (h) hiWords.push(...h.split(/\s+/).filter(Boolean)); if (it.items) scan(it) } }
  for (const row of b.rows || []) for (const cell of row) { if (cell && typeof cell === 'object') for (const c of cell.cites || []) cites.add(c); const s = str(cell && cell.text != null ? cell.text : cell); (s.match(NUM) || []).forEach((n) => nums.add(n.replace(/\s+/g, ''))); const h = hi(cell && cell.text != null ? cell.text : cell); if (h) hiWords.push(...h.split(/\s+/).filter(Boolean)) }
  for (const f of b.faqs || []) { for (const c of f.cites || []) cites.add(c); for (const key of ['q', 'a']) { const s = str(f[key]); (s.match(NUM) || []).forEach((n) => nums.add(n.replace(/\s+/g, ''))); const h = hi(f[key]); if (h) hiWords.push(...h.split(/\s+/).filter(Boolean)) } }
  for (const inp of b.inputs || []) scan(inp)
}
for (const b of page.blocks || []) scan(b)
console.log('HIWORDS', hiWords.length)
console.log('CITES', [...cites].sort().join(','))
console.log('NUMS', [...nums].sort().join(' '))
