// Batch 20 - pure rules for the Kissan Mitra screens (no React, no network). The database does the real counting;
// these only format, validate and add up what the admin sees. scripts/batch20/mitra-model.mjs is the reference model of the SQL.

// Fill {x} marks of a string: fill('{n} total', { n: 4 }) -> '4 total'.
export const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])))
export const rupees = (n) => Number(n || 0).toLocaleString('en-IN')

// "Name - area" (the dropdown line and the cards).
export const mitraLabel = (m) => (m?.area ? `${m.display_name} — ${m.area}` : String(m?.display_name || ''))

// Phones shown to the admin are already masked by the database; this is the fallback for anything else (last 4 digits only).
export const maskPhone = (phone) => {
  const d = String(phone ?? '').replace(/\D/g, '')
  return d.length < 4 ? '' : `******${d.slice(-4)}`
}

// farmers x farmer rate + businesses x business rate. A blank rate for a kind that has people = rate not set.
export function suggestAmount({ farmers = 0, businesses = 0 }, { rate_farmer_rupees = null, rate_business_rupees = null }) {
  const rf = rate_farmer_rupees === '' ? null : rate_farmer_rupees
  const rb = rate_business_rupees === '' ? null : rate_business_rupees
  const rateNotSet = (farmers > 0 && rf == null) || (businesses > 0 && rb == null)
  return { amount: farmers * (rf == null ? 0 : Number(rf)) + businesses * (rb == null ? 0 : Number(rb)), rateNotSet }
}
export const dueFor = (m) => suggestAmount(
  { farmers: m.counted_unpaid_farmers || 0, businesses: m.counted_unpaid_businesses || 0 },
  { rate_farmer_rupees: m.rate_farmer_rupees, rate_business_rupees: m.rate_business_rupees },
)

export const blankMitraForm = () => ({ id: null, display_name: '', area: '', private_phone: '', rate_farmer_rupees: '', rate_business_rupees: '', is_active: true })
export const mitraToForm = (m) => ({
  id: m.id, display_name: m.display_name || '', area: m.area || '', private_phone: m.private_phone || '',
  rate_farmer_rupees: m.rate_farmer_rupees == null ? '' : String(m.rate_farmer_rupees),
  rate_business_rupees: m.rate_business_rupees == null ? '' : String(m.rate_business_rupees), is_active: m.is_active !== false,
})

const rateOk = (v) => v === '' || v == null || (/^[0-9]{1,6}$/.test(String(v).trim()) && Number(v) <= 100000)
// The form -> { error: <string key> } or { data } (what admin_upsert_mitra takes). Rates may be blank.
export function mitraFormToPayload(f) {
  const name = String(f.display_name || '').trim()
  if (!name) return { error: 'mitra_err_name' }
  if (name.length > 80 || String(f.area || '').trim().length > 80) return { error: 'mitra_err_long' }
  const phone = String(f.private_phone || '').trim()
  if (phone && !/^[0-9+ -]{1,20}$/.test(phone)) return { error: 'mitra_err_phone' }
  if (!rateOk(f.rate_farmer_rupees) || !rateOk(f.rate_business_rupees)) return { error: 'mitra_err_rate' }
  const rate = (v) => (v === '' || v == null ? '' : String(Number(v)))
  return {
    data: {
      display_name: name, area: String(f.area || '').trim(), private_phone: phone,
      rate_farmer_rupees: rate(f.rate_farmer_rupees), rate_business_rupees: rate(f.rate_business_rupees), is_active: !!f.is_active,
    },
  }
}

export function validPaidAmount(v) {
  const s = String(v ?? '').trim()
  return /^[0-9]{1,9}$/.test(s) && Number(s) <= 100000000
}

// CSV of the Mitra summary - one row per Mitra. NO phone numbers (the private phone is never included).
export const CSV_COLUMNS = ['name', 'area', 'active', 'farmers_total', 'businesses_total', 'today', 'last7', 'unpaid_farmers', 'unpaid_businesses', 'amount_due_rupees', 'paid_total_rupees']
const cell = (v) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}` // a spreadsheet must not read a name as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function mitraSummaryCsv(mitras) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const m of mitras) {
    const due = dueFor(m)
    lines.push([
      m.display_name, m.area || '', m.is_active ? 'yes' : 'no', m.farmers_total, m.businesses_total, m.today, m.last7,
      m.counted_unpaid_farmers, m.counted_unpaid_businesses, due.rateNotSet ? 'rate not set' : due.amount, m.payments_total_rupees,
    ].map(cell).join(','))
  }
  return `${lines.join('\n')}\n`
}

// The top strip.
export function summaryOf(data) {
  const ms = data?.mitras || []
  const sum = (k) => ms.reduce((a, m) => a + (Number(m[k]) || 0), 0)
  return {
    mitras: ms.length,
    attributed: sum('farmers_total') + sum('businesses_total'),
    unpaid: sum('counted_unpaid_farmers') + sum('counted_unpaid_businesses'),
    unattributed: Number(data?.unattributed_total) || 0,
  }
}
