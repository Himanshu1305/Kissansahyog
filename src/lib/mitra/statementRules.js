// Batch 22D - pure rules for the Kissan Mitra statement screen (no React, no network). The database builds the statement
// (supabase/migrations/0077_mitra_statement.sql); these only filter, format, page and write the CSV.
// Amounts are the Mitra's CURRENT rate (the payment itself is one lump sum), see DECISIONS.md.
import { CATEGORY_META } from '../listings/catalog.js'
import { cell } from './mitraRules.js'

export const STATEMENT_PAGE = 50 // rows per request in the screen
export const STATEMENT_CSV_PAGE = 500 // rows per request when downloading (the function allows up to 500)
export const STATEMENT_CSV_COLUMNS = ['date', 'kind', 'name', 'village', 'category', 'amount_rupees', 'status', 'paid_on']

// "18 Nov 2026" in India time. A date-only value (paid_on is a date, not a moment) is read as that calendar day.
export function istDate(value, lang = 'en') {
  if (!value) return ''
  try {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    const d = new Date(dateOnly ? `${value}T00:00:00+05:30` : value)
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  } catch { return '' }
}
// 2026-11-18 (India time) - the sortable form used in the CSV and the file name.
export const istIso = (value) => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value)) } catch { return '' }
}

// The readable name of a listing category; an unknown key gives '' (the screen then shows plain "Service offer"), never the raw key.
export const categoryName = (key, lang = 'en') => {
  const m = key ? CATEGORY_META[key] : null
  return m ? (lang === 'hi' ? m.hi : m.en) : ''
}

// The chips All / Unpaid / Paid (client side, on the rows already loaded).
export const filterRows = (rows, which) => (which === 'paid' ? rows.filter((r) => r.paid) : which === 'unpaid' ? rows.filter((r) => !r.paid) : rows)

export const slugName = (name) => {
  const s = String(name || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'mitra'
}
export const statementFileName = (name, todayIso) => `kissan-mitra-${slugName(name)}-${todayIso}.csv`

// CSV of the statement. Columns: date, kind, name, village, category, amount_rupees, status, paid_on. NO phone numbers at all.
// A blank amount means the rate was not set. Cells go through the same spreadsheet-safe function as the Mitra summary CSV.
export function statementCsv(rows, lang = 'en') {
  const lines = [STATEMENT_CSV_COLUMNS.join(',')]
  for (const r of rows) {
    lines.push([
      istIso(r.on_date), r.kind === 'ad' ? 'ad' : 'farmer', r.name || '', r.village || '', r.kind === 'ad' ? '' : categoryName(r.category, lang),
      r.amount_rupees == null ? '' : r.amount_rupees, r.paid ? 'paid' : 'unpaid', r.paid_on || '',
    ].map(cell).join(','))
  }
  return `${lines.join('\n')}\n`
}

// Fetch every page: fetchPage(limit, offset) -> { rows, totals }. Stops at the total, at a short page, or at an empty page (never loops).
export async function fetchAllRows(fetchPage, pageSize = STATEMENT_CSV_PAGE) {
  const out = []
  for (let guard = 0; guard < 1000; guard++) {
    const res = await fetchPage(pageSize, out.length)
    const rows = Array.isArray(res?.rows) ? res.rows : []
    out.push(...rows)
    const total = (Number(res?.totals?.farmers) || 0) + (Number(res?.totals?.ads) || 0)
    if (rows.length === 0 || rows.length < pageSize || out.length >= total) break
  }
  return out
}
