// Phase 2 — FREE aggregator scraper (NO AI). Reads the "Upcoming" listings on TaazaBhav and
// kisaanhelpline, writes each as a `pending` lead in kisan_mela_candidates. Everything here is a
// LEAD only — nothing is written to the public kisan_mela table and no aggregator wording becomes
// the public description (that happens only after per-candidate verification, Phase 4).
//
// Parsing is a pure function of the HTML (testable with mocked pages). Fetch + robots + DB live in
// the orchestrator. On a structural mismatch the parser FAILS LOUD (throws ScraperError) so a
// broken scraper is never mistaken for "no events today" (2a-i).

export const UA = 'Kisan-Sahyog/1.0 (+https://kissansahyog.com; contact: usdvisionai@gmail.com)'

export class ScraperError extends Error {
  constructor(source, msg) { super(`[scraper:${source}] ${msg}`); this.source = source }
}

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// --- robots.txt (pure): is `path` allowed for our UA given the robots.txt body? -------------
export function robotsAllows(robotsTxt, path) {
  if (!robotsTxt) return true // no robots.txt → allowed
  // Consider only the '*' group (we don't masquerade as a named bot).
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim())
  let inStar = false
  const disallows = []
  for (const l of lines) {
    const m = l.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase(); const val = m[2].trim()
    if (key === 'user-agent') inStar = val === '*'
    else if (inStar && key === 'disallow' && val) disallows.push(val)
  }
  return !disallows.some((d) => path.startsWith(d))
}

// --- TaazaBhav: a clean JSON-LD ItemList of the upcoming calendar -----------------------------
export function parseTaazaBhav(html) {
  const blocks = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  let list = null
  for (const b of blocks) { try { const j = JSON.parse(b); if (j && j['@type'] === 'ItemList' && Array.isArray(j.itemListElement)) { list = j; break } } catch { /* skip */ } }
  if (!list) throw new ScraperError('taazabhav', 'JSON-LD ItemList of upcoming events not found — page structure may have changed')
  const leads = []
  for (const it of list.itemListElement) {
    const rawName = decode(it.name)
    const url = decode(it.url)
    if (!rawName || !url) continue
    // "Event Name, Location (…) — 3–6 Oct 2026" → split name / date on the em/en dash.
    const dash = rawName.split(/\s[—–-]\s/)
    const left = decode(dash[0])
    const dateText = dash.length > 1 ? decode(dash.slice(1).join(' - ')) : null
    // location hint = text after the last comma in the left part (strip trailing parens like "(120th)").
    const commaIdx = left.lastIndexOf(',')
    const venue = commaIdx >= 0 ? decode(left.slice(commaIdx + 1).replace(/\([^)]*\)/g, '')) : null
    leads.push({ source_name: 'taazabhav', source_url: url, raw_name: left, raw_venue: venue || null, raw_state: null, raw_district: null, raw_date_text: dateText, raw_highlights: null })
  }
  if (!leads.length) throw new ScraperError('taazabhav', 'ItemList present but yielded zero leads — parse assumptions may be stale')
  return leads
}

// --- kisaanhelpline: HTML event cards between "Current/Upcoming Events" and "Past Events" -----
export function parseKisaanHelpline(html) {
  const t = String(html)
  const curr = t.search(/Current Events/i)
  const up = t.search(/Upcoming Events/i)
  const past = t.search(/Past Events?/i)
  const start = [curr, up].filter((i) => i >= 0).sort((a, b) => a - b)[0]
  if (start == null) throw new ScraperError('kisaanhelpline', '"Current/Upcoming Events" section not found — page structure may have changed')
  const region = t.slice(start, past >= 0 ? past : t.length) // read ONLY upcoming, never Past
  // Each card: <a href="https://www.kisaanhelpline.com/<slug>"> … <img alt="Name" title="Name">
  const anchors = [...region.matchAll(/<a\s+href="(https:\/\/www\.kisaanhelpline\.com\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  const seen = new Set()
  const leads = []
  for (const a of anchors) {
    const url = decode(a[1])
    if (/\/(agriculture-events|about|contact|privacy|terms|login|register|category|tag)\b/i.test(url)) continue
    const inner = a[2]
    const alt = inner.match(/<img[^>]*\balt="([^"]+)"/i) || inner.match(/<img[^>]*\btitle="([^"]+)"/i)
    const name = alt ? decode(alt[1]) : ''
    if (!name || seen.has(url)) continue
    seen.add(url)
    // best-effort date + city from the card's text (not published verbatim; verification rewrites)
    const mDate = inner.match(/\b(\d{1,2})\b[\s\S]{0,40}?\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(20\d{2})/i)
    const dateText = mDate ? decode(`${mDate[1]} ${mDate[2]} ${mDate[3]}`) : null
    leads.push({ source_name: 'kisaanhelpline', source_url: url, raw_name: name, raw_venue: null, raw_state: null, raw_district: null, raw_date_text: dateText, raw_highlights: null })
  }
  if (!leads.length) throw new ScraperError('kisaanhelpline', 'upcoming section found but no event cards parsed — card structure may have changed')
  return leads
}

// Has a lead's meaningful text changed vs an existing candidate row? (2b-i re-verify trigger)
export function leadChanged(existing, lead) {
  const norm = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return norm(existing.raw_date_text) !== norm(lead.raw_date_text) || norm(existing.raw_venue) !== norm(lead.raw_venue) || norm(existing.raw_name) !== norm(lead.raw_name)
}

// --- Orchestrator: fetch + robots + parse + dedup-at-insertion --------------------------------
const AGGREGATORS = [
  { source: 'taazabhav', base: 'https://taazabhav.com', path: '/kisan-mela', parse: parseTaazaBhav },
  { source: 'kisaanhelpline', base: 'https://www.kisaanhelpline.com', path: '/agriculture-events', parse: parseKisaanHelpline },
]

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// Scrape all aggregators, upsert leads into kisan_mela_candidates. Returns a per-source summary.
// `db` is a service-role Supabase client. On a structural failure for one source, logs loudly and
// continues the others (never silently returns zero). 2b-i dedup: match on source_url; update
// scraped_at if unchanged, re-open to `pending` if the lead's text changed, insert only genuinely new.
export async function scrapeAggregators({ db, log = console.log }) {
  const summary = { inserted: 0, updated: 0, reopened: 0, failures: [] }
  for (const agg of AGGREGATORS) {
    try {
      let robots = ''
      try { robots = await fetchText(`${agg.base}/robots.txt`) } catch { /* no robots → allowed */ }
      if (!robotsAllows(robots, agg.path)) { log(`[scraper:${agg.source}] disallowed by robots.txt — skipping`); summary.failures.push(`${agg.source}:robots_disallow`); continue }
      const html = await fetchText(agg.base + agg.path)
      const leads = agg.parse(html) // throws ScraperError on structural mismatch (fail loud)
      log(`[scraper:${agg.source}] parsed ${leads.length} upcoming leads`)
      for (const lead of leads) {
        const { data: existing } = await db.from('kisan_mela_candidates').select('*').eq('source_url', lead.source_url).maybeSingle()
        if (!existing) {
          await db.from('kisan_mela_candidates').insert({ ...lead, verification_status: 'pending', scraped_at: new Date().toISOString() })
          summary.inserted += 1
        } else if (leadChanged(existing, lead)) {
          await db.from('kisan_mela_candidates').update({ ...lead, verification_status: 'pending', last_verification_attempt_at: null, scraped_at: new Date().toISOString() }).eq('id', existing.id)
          summary.reopened += 1
        } else {
          await db.from('kisan_mela_candidates').update({ scraped_at: new Date().toISOString() }).eq('id', existing.id)
          summary.updated += 1
        }
      }
    } catch (e) {
      // Fail LOUD — a broken scraper must not look like a quiet day (2a-i).
      log(`::error::[scraper:${agg.source}] SCRAPER FAILURE: ${e.message}`)
      summary.failures.push(`${agg.source}:${e.message}`)
    }
  }
  return summary
}
