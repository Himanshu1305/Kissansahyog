// One-time (idempotent) import of docs/research/mp_cold_storages.csv into the
// cold_storage_directory table. Re-running skips rows whose slug already exists
// (so admin edits / claims are never clobbered).
//   node --env-file=.env scripts/import_cold_storage.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CSV = new URL('../docs/research/mp_cold_storages.csv', import.meta.url)

// Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/newlines, "" escapes).
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* skip */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const slugify = (s) => String(s || '').trim().toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const text = readFileSync(CSV, 'utf8')
  const rows = parseCsv(text)
  const header = rows.shift().map((h) => h.trim())
  const col = (r, name) => { const i = header.indexOf(name); return i === -1 ? '' : (r[i] ?? '').trim() }
  const dataRows = rows.filter((r) => r.length >= header.length && col(r, 'name'))
  console.log(`Parsed ${dataRows.length} data rows (header: ${header.join(',')})`)

  const seen = new Set()
  const records = dataRows.map((r) => {
    const name = col(r, 'name')
    const district = col(r, 'district') || 'mp'
    let slug = `${slugify(name)}-${slugify(district)}`
    if (!slug || slug === '-') slug = `cs-${slugify(name)}`
    let s = slug, n = 2
    while (seen.has(s)) { s = `${slug}-${n++}` }
    seen.add(s)
    const notes = col(r, 'notes')
    return {
      name,
      city: col(r, 'city') || null,
      district: col(r, 'district') || null,
      address: col(r, 'address') || null,
      pincode: col(r, 'pincode') || null,
      phone: col(r, 'phone') || null,
      products: col(r, 'products') || null,
      capacity: col(r, 'capacity_mt') || null,
      type: col(r, 'type') || null,
      rating: col(r, 'rating') || null,
      source_type: col(r, 'source_type') || null,
      source_name: col(r, 'source_name') || null,
      source_url: col(r, 'source_url') || null,
      notes: notes || null,
      is_old_list: /OLD LIST/i.test(notes),
      slug: s,
      status: 'active',
    }
  })

  // Which slugs already exist? Skip those (idempotent; preserves claims/edits).
  const { data: existing } = await db.from('cold_storage_directory').select('slug')
  const have = new Set((existing || []).map((e) => e.slug))
  const toInsert = records.filter((r) => !have.has(r.slug))
  console.log(`${records.length} records, ${have.size} already present, inserting ${toInsert.length}`)

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200)
    const { error } = await db.from('cold_storage_directory').insert(batch)
    if (error) { console.error('insert error', error.message); process.exit(1) }
    inserted += batch.length
  }
  const { count } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true })
  console.log(`Inserted ${inserted}. Directory now has ${count} rows.`)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
