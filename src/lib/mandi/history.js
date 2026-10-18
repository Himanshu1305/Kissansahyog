// Batch 10E — pure helpers behind the /msp trend read (no network, no React; unit-tested in
// tests/unit/mandi-history.test.mjs).
//
// Why paging: PostgREST caps every response at the project's `max_rows` (1,000 on staging),
// whatever `.limit()` asks for. After the 120-day backfill a crop can have more rows than that
// in 90 days (wheat ≈ 2,200), so one request silently lost part of the window. Pages are read
// NEWEST FIRST: if the page cap is ever reached, it is the oldest days that are left out,
// never the latest ones.

export const PAGE_SIZE = 1000 // = staging/production PostgREST max_rows; a shorter page means "last page"
export const MAX_PAGES = 10 // hard stop (10,000 rows) so a bad filter can never loop

// fetchPage(from, to) must return { data, error } for the inclusive row range [from, to]
// (a Supabase query ending in `.range(from, to)` does). Returns { data, error, truncated }.
// Any error fails the whole read (no half chart that silently stops early).
export async function fetchAllPages(fetchPage, { pageSize = PAGE_SIZE, maxPages = MAX_PAGES } = {}) {
  const out = []
  for (let p = 0; p < maxPages; p++) {
    const from = p * pageSize
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) return { data: null, error, truncated: false }
    const rows = data || []
    out.push(...rows)
    if (rows.length < pageSize) return { data: out, error: null, truncated: false }
  }
  return { data: out, error: null, truncated: true }
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

// rows [{price_date, modal_price}] in any order → [{date, price}] ascending by date, the price
// being the median modal price of all mandis that reported that day (unchanged rule).
export function medianByDate(rows) {
  const byDate = {}
  for (const r of rows || []) {
    if (r.modal_price == null || r.price_date == null) continue
    ;(byDate[r.price_date] ||= []).push(Number(r.modal_price))
  }
  return Object.entries(byDate)
    .map(([date, arr]) => ({ date, price: median(arr) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
