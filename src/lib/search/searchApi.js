// Phase 10 — runtime search. Combines the static content index
// (public/search-index.json, built by scripts/build-search-index.mjs) with LIVE
// farmer listings fetched via an RPC at query time, scored by synonym-expanded
// substring matching, grouped by type and capped per group.
import { supabase } from '../supabaseClient'
import { expandQuery } from '../../content/searchSynonyms'
import { CATEGORY_META } from '../listings/catalog'

// Popular-search chip VALUES. ASCII only — this is a src/lib file (NOT a sanctioned
// Devanagari location); the screen resolves these to display labels via synonyms/t().
export const POPULAR_SEARCHES = ['wheat', 'soybean', 'tractor', 'cold storage', 'greenhouse', 'water tanker']

let _indexPromise = null
let _index = null

// Fetch the static index once (cached for the session). Any failure → [].
export async function loadSearchIndex() {
  if (_index) return _index
  if (!_indexPromise) {
    _indexPromise = fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => {
        _index = Array.isArray(arr) ? arr : []
        return _index
      })
      .catch(() => {
        _index = []
        return _index
      })
  }
  return _indexPromise
}

// Score an index item: number of expanded terms that appear as a substring of its
// combined searchable text. 0 means no match.
function scoreItem(item, terms) {
  const hay = `${item.title_hi || ''} ${item.title_en || ''} ${item.subtitle_hi || ''} ${item.subtitle_en || ''} ${item.keywords || ''}`.toLowerCase()
  let score = 0
  for (const term of terms) {
    if (term && hay.includes(term)) score += 1
  }
  return score
}

// Map a live listing row from the search_listings RPC into a result item.
function mapListing(row) {
  const meta = CATEGORY_META[row.category] || {}
  return {
    type: 'listing',
    title_hi: meta.hi || row.category || '',
    title_en: meta.en || row.category || '',
    subtitle_hi: row.village || '',
    subtitle_en: row.village || '',
    url: `/listing/${row.id}`,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    details: row.details ?? null,
    is_sponsored: !!row.is_sponsored,
    _score: 2, // live listings rank above static content of equal textual relevance
  }
}

// Run a full search. Returns { groups: { [type]: items[] }, total }.
export async function searchAll(query) {
  const q = String(query || '').trim()
  if (!q) return { groups: {}, total: 0 }

  const terms = expandQuery(q)

  // Static index scoring.
  const index = await loadSearchIndex()
  const scored = []
  for (const item of index) {
    const score = scoreItem(item, terms)
    if (score > 0) scored.push({ ...item, _score: score })
  }

  // Live listings via RPC (best-effort — ignore failures).
  try {
    const { data, error } = await supabase.rpc('search_listings', { p_query: q, p_limit: 24 })
    if (!error && Array.isArray(data)) {
      for (const row of data) scored.push(mapListing(row))
    }
  } catch { /* ignore live-listing failures */ }

  // Group by type, sort each group by score desc, cap 12.
  const groups = {}
  for (const item of scored) {
    (groups[item.type] ||= []).push(item)
  }
  let total = 0
  for (const type of Object.keys(groups)) {
    groups[type].sort((a, b) => (b._score || 0) - (a._score || 0))
    groups[type] = groups[type].slice(0, 12)
    total += groups[type].length
  }
  return { groups, total }
}

// Log a zero-result query (device-scoped, rate-limited server-side). Never throws.
export async function logSearchMiss(query) {
  try {
    const { getDeviceId } = await import('../device')
    await supabase.rpc('log_search_miss', { p_query: String(query || ''), p_device: getDeviceId() })
  } catch { /* ignore */ }
}
