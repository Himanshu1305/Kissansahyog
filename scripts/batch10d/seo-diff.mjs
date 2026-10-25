// Batch 10D — prove the prerendered homepage kept every word of its baseline SEO text (Task D; rerun in E/F).
//
// Usage: node scripts/batch10d/seo-diff.mjs <baselineDir> <afterDir> [--json <out.json>] [--dist <distDir>]
//   <baselineDir>, <afterDir>: folders written by scripts/batch10d/seo-text.mjs (home-text.txt + home-seo.json).
//   --json   write the machine-readable result (default <afterDir>/seo-diff.json)
//   --dist   also check that nothing from design/ was shipped (default: dist)
// Exit code 0 = NOTHING LOST, 1 = something lost / changed, 2 = usage error.
//
// Method
//   1. Both texts are split into lines (one text node per line, from seo-text.mjs).
//   2. Data-driven lines (filled from the staging DB / live APIs at build time, so they legitimately
//      change between builds) are cut out of BOTH texts by region anchors (DATA_REGIONS) and single-line
//      patterns (DATA_LINES). Everything else is static copy.
//   3. The old page rendered the hero twice (desktop <p> instance + mobile <h1> instance); the new page
//      renders it once. The second baseline copy (from the 2nd occurrence of the hero eyebrow up to the
//      search h2) is checked to be a line-for-line repeat of lines in the first copy and is then taken
//      out of the required multiset ("expected 2 -> 1"). Each of its lines must still appear >= 1 time.
//   4. Words = whitespace-separated tokens, exact (no stemming, punctuation kept). Every baseline static
//      word must appear in the full after text at least as many times as in the baseline static text
//      (minus the expected hero duplicate). Also every baseline static LINE must still exist as a line.
//   5. Data regions are compared too and reported (equal / changed) but never fail the check.
//   6. home-seo.json: title, meta description, canonical, html lang, robots, og, hreflang, JSON-LD
//      (verbatim strings, byte-identical), h1 (exact, exactly one), h2 list (all present, same order),
//      h3, FAQ (baseline null -> must stay null), sitemapsSha256NoLastmod equal.
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const pos = args.filter((a, i) => !a.startsWith('--') && !['--json', '--dist'].includes(args[i - 1]))
const [baseDir, afterDir] = pos
if (!baseDir || !afterDir) { console.error('usage: node scripts/batch10d/seo-diff.mjs <baselineDir> <afterDir> [--json out] [--dist dist]'); process.exit(2) }
const outJson = opt('--json', path.join(afterDir, 'seo-diff.json'))
const distDir = opt('--dist', 'dist')

const readLines = (d) => fs.readFileSync(path.join(d, 'home-text.txt'), 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '')
const readSeo = (d) => JSON.parse(fs.readFileSync(path.join(d, 'home-seo.json'), 'utf8'))
const B = readLines(baseDir), A = readLines(afterDir)
const bSeo = readSeo(baseDir), aSeo = readSeo(afterDir)

// ---- data-driven text: regions [start, end) located by static anchor lines ----------------------
// start: first line INSIDE the region is the one after `after` (searched from `from`); end: line `until`.
const DATA_REGIONS = [
  { id: 'mandi-ticker', source: 'components/MandiTicker.jsx (fetchMandiPrices, staging DB)',
    reason: 'crop / price / APMC list of the latest mandi day; prices and markets change daily',
    after: '📊 मंडी भाव', until: 'बिना लॉगिन के सारी जानकारी देखें' },
  { id: 'listings', source: 'Homepage.jsx "ताज़ा लिस्टिंग" (fetchHomeFeed -> HomeListingCard, staging DB)',
    reason: 'newest listings in the DB (test listings on staging)',
    from: 'ताज़ा लिस्टिंग', after: 'सभी देखें →', until: 'आज की 2 मिनट की वीडियो सलाह' },
  { id: 'videos', source: 'Homepage.jsx video section (fetchFeaturedVideos(3), staging DB)',
    reason: 'featured video titles / durations / channels from the DB',
    from: 'आज की 2 मिनट की वीडियो सलाह', after: 'सभी देखें →', until: 'किसान सवाल' },
  { id: 'sawaal', source: 'Homepage.jsx "किसान सवाल" (fetchFeaturedSawaal(3), staging DB)',
    reason: 'featured question / answer items from the DB (the "पूरा उत्तर पढ़ें" link label repeats per item)',
    from: 'किसान सवाल', after: 'सभी सवाल देखें →', until: '📷 फोटो भेजकर सवाल पूछें' },
  { id: 'melas', source: 'Homepage.jsx "आस-पास के किसान मेले" (fetchUpcomingMelas(3) + melaStatus by date, staging DB)',
    reason: 'next three melas from the DB; status ("चल रहा है") depends on the build date',
    from: 'आस-पास के किसान मेले', after: 'सभी मेले देखें →', until: 'सरकारी मदद' },
  { id: 'articles', source: 'Homepage.jsx "किसान लेख" (fetchPublishedArticles, staging DB)',
    reason: 'published article titles from the DB',
    from: 'किसान लेख', after: 'सभी देखें →', until: 'किसान सहयोग' },
]
// Single data lines outside the regions.
const DATA_LINES = [
  { id: 'ticker-day', re: /^कल का भाव \(\d{1,2}\/\d{1,2}\)$|^आज का भाव \(\d{1,2}\/\d{1,2}\)$/, source: 'MandiTicker day label', reason: 'date of the latest mandi day' },
  { id: 'today-price', re: /^\S+ ₹[\d,]+$/, source: 'hero InfoTile "आज का भाव" (getTodayForFarmer: fetchMandiPrices + fetchMsp)', reason: 'crop and modal price of the day', near: 'आज का भाव' },
  { id: 'today-msp', re: /^MSP ₹[\d,]+ से ₹[\d,]+ (ऊपर|नीचे) · /, source: 'hero InfoTile "आज का भाव" (MSP vs mandi)', reason: 'difference between that price and MSP' },
]

function regionsOf(lines) {
  const mark = new Array(lines.length).fill(null)
  const found = []
  for (const r of DATA_REGIONS) {
    let i = 0
    if (r.from) { i = lines.indexOf(r.from); if (i < 0) { found.push({ id: r.id, ok: false }); continue } }
    const s = lines.indexOf(r.after, i)
    const e = s < 0 ? -1 : lines.indexOf(r.until, s + 1)
    if (s < 0 || e < 0) { found.push({ id: r.id, ok: false }); continue }
    for (let k = s + 1; k < e; k++) mark[k] = r.id
    found.push({ id: r.id, ok: true, lines: lines.slice(s + 1, e) })
  }
  lines.forEach((l, k) => {
    if (mark[k]) return
    for (const d of DATA_LINES) {
      if (!d.re.test(l)) continue
      if (d.near && lines[k - 1] !== d.near) continue
      mark[k] = d.id
    }
  })
  return { mark, found }
}
const bR = regionsOf(B), aR = regionsOf(A)

// ---- hero duplicate in the baseline --------------------------------------------------------------
const EYEBROW = '🌾 किसान की आय बढ़ाना · रोज़गार के अवसर'
const heroStarts = B.reduce((acc, l, k) => (l === EYEBROW ? [...acc, k] : acc), [])
const searchH2 = B.indexOf('क्या खोज रहे हैं?')
let dup = { found: false }
if (heroStarts.length >= 2 && searchH2 > heroStarts[1]) {
  const first = B.slice(heroStarts[0], heroStarts[1])
  const second = B.slice(heroStarts[1], searchH2)
  const firstSet = new Set(first)
  dup = { found: true, startLine: heroStarts[1] + 1, endLine: searchH2, lines: second,
    allRepeatFirstCopy: second.every((l) => firstSet.has(l)), firstCopyLines: first.length }
}
const dupIdx = new Set()
if (dup.found) for (let k = heroStarts[1]; k < searchH2; k++) dupIdx.add(k)

// ---- word multisets ------------------------------------------------------------------------------
const words = (lines) => { const m = new Map(); for (const l of lines) for (const w of l.split(/\s+/)) if (w) m.set(w, (m.get(w) || 0) + 1); return m }
const bStaticLines = B.filter((_, k) => !bR.mark[k])
const bRequiredLines = B.filter((_, k) => !bR.mark[k] && !dupIdx.has(k))
const bStaticW = words(bStaticLines), bReqW = words(bRequiredLines), aAllW = words(A)
const aStaticW = words(A.filter((_, k) => !aR.mark[k]))
const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0)

const lost = []
for (const [w, n] of bReqW) { const have = aAllW.get(w) || 0; if (have < n) lost.push({ word: w, required: n, after: have }) }
// 2 -> 1 (or n -> n-k) drops explained by the removed duplicate hero copy
const expectedDrops = []
for (const [w, n] of bStaticW) {
  const have = aAllW.get(w) || 0
  if (have < n) expectedDrops.push({ word: w, baseline: n, after: have, requiredWithoutDuplicate: bReqW.get(w) || 0 })
}
// line-level: every static baseline line still exists as a line
const aLineSet = new Set(A)
const lostLines = [...new Set(bStaticLines)].filter((l) => !aLineSet.has(l))
const count = (arr, x) => arr.filter((y) => y === x).length
const dupLineReport = dup.found ? [...new Set(dup.lines)].map((l) => ({ line: l, baseline: count(B, l), after: count(A, l), data: bR.mark[B.indexOf(l)] || null, stillPresent: count(A, l) >= 1 })) : []

// data regions: report only
const dataReport = DATA_REGIONS.map((r) => {
  const b = bR.found.find((f) => f.id === r.id), a = aR.found.find((f) => f.id === r.id)
  return { id: r.id, source: r.source, reason: r.reason, baselineLines: b?.lines?.length ?? null, afterLines: a?.lines?.length ?? null,
    locatedInBaseline: !!b?.ok, locatedInAfter: !!a?.ok, identical: !!(b?.ok && a?.ok && JSON.stringify(b.lines) === JSON.stringify(a.lines)) }
})
const dataLineReport = DATA_LINES.map((d) => ({ id: d.id, source: d.source, reason: d.reason,
  baseline: B.filter((_, k) => bR.mark[k] === d.id), after: A.filter((_, k) => aR.mark[k] === d.id) }))

// added text (information only)
const bAllLineSet = new Set(B)
const addedLines = A.filter((l, k) => !aR.mark[k] && !bAllLineSet.has(l))

// ---- SEO head / structure ------------------------------------------------------------------------
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y)
const checks = []
const chk = (name, ok, detail) => checks.push({ name, ok: !!ok, ...(detail ? { detail } : {}) })
for (const k of ['title', 'metaDescription', 'canonical', 'htmlLang', 'robots', 'ogTitle', 'ogDescription', 'hreflang'])
  chk(k, eq(bSeo[k], aSeo[k]), { baseline: bSeo[k], after: aSeo[k] })
const bLd = (bSeo.jsonld || []).map((j) => j.verbatim), aLd = (aSeo.jsonld || []).map((j) => j.verbatim)
chk('jsonld byte-identical', bLd.length === aLd.length && bLd.every((v, i) => v === aLd[i]), { baselineBlocks: bLd.length, afterBlocks: aLd.length, types: (aSeo.jsonld || []).map((j) => j.parsed?.['@type'] ?? null) })
chk('h1 exactly one, same text', aSeo.h1.length === 1 && eq(bSeo.h1, aSeo.h1), { baseline: bSeo.h1, after: aSeo.h1 })
const bH2 = bSeo.h2, aH2 = aSeo.h2
let p = 0; for (const h of aH2) if (p < bH2.length && h === bH2[p]) p++
chk('h2 all baseline present, same order', p === bH2.length, { baseline: bH2.length, after: aH2.length, extraInAfter: aH2.filter((h) => !bH2.includes(h)) })
chk('h3 unchanged', eq(bSeo.h3, aSeo.h3), { baseline: bSeo.h3, after: aSeo.h3 })
chk('FAQ unchanged (baseline none)', eq(bSeo.faq, aSeo.faq), { baseline: bSeo.faq, after: aSeo.faq })
chk('headings order (h1 + h2) unchanged', eq(bSeo.headingsInOrder, aSeo.headingsInOrder), { baseline: bSeo.headingsInOrder, after: aSeo.headingsInOrder })
chk('sitemaps equal without <lastmod>', eq(bSeo.sitemapsSha256NoLastmod, aSeo.sitemapsSha256NoLastmod), { files: Object.keys(aSeo.sitemapsSha256NoLastmod || {}).length })
const bLinks = new Set(bSeo.links || []), aLinks = new Set(aSeo.links || [])
const lostLinks = [...bLinks].filter((l) => !aLinks.has(l))
chk('every baseline link still present', lostLinks.length === 0, { baseline: bLinks.size, after: aLinks.size, lost: lostLinks, added: [...aLinks].filter((l) => !bLinks.has(l)) })

// design/ must not ship
const designFiles = fs.existsSync('design') ? fs.readdirSync('design', { recursive: true }).filter((f) => fs.statSync(path.join('design', f)).isFile()) : []
const shipped = []
if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir, { recursive: true }).map((f) => String(f).replace(/\\/g, '/'))
  const names = new Set(designFiles.map((f) => path.basename(String(f))))
  for (const f of distFiles) if (names.has(path.basename(f)) || /^design\//.test(f) || /home-options-preview|guide-demo-preview/.test(f)) shipped.push(f)
}
chk('nothing from design/ in dist', shipped.length === 0, { designFiles: designFiles.length, shipped })

const verdictOk = lost.length === 0 && lostLines.length === 0 && dup.found && dup.allRepeatFirstCopy && dupLineReport.every((d) => d.stillPresent) && checks.every((c) => c.ok)
const result = {
  verdict: verdictOk ? 'NOTHING LOST' : 'LOST',
  method: 'whitespace-token multiset; data-driven regions excluded from the requirement; baseline 2nd hero copy taken out of the requirement but each of its lines must still exist once',
  counts: {
    baselineLines: B.length, afterLines: A.length,
    baselineDataLines: B.length - bStaticLines.length, afterDataLines: A.filter((_, k) => aR.mark[k]).length,
    baselineStaticLines: bStaticLines.length, baselineDuplicateHeroLines: dupIdx.size,
    baselineWordsTotal: sum(words(B)), afterWordsTotal: sum(aAllW),
    baselineStaticWords: sum(bStaticW), requiredWords: sum(bReqW), distinctRequiredWords: bReqW.size,
    afterStaticWords: sum(aStaticW), lostWords: lost.length, lostStaticLines: lostLines.length,
    expectedDropWords: expectedDrops.length, addedLines: addedLines.length,
  },
  lost, lostLines, expectedDuplicateDrops: { heroCopy: dup, lines: dupLineReport, words: expectedDrops },
  dataDriven: { regions: dataReport, lines: dataLineReport },
  checks, addedLines,
}
fs.writeFileSync(outJson, JSON.stringify(result, null, 2))
console.log(`${result.verdict}: required words ${result.counts.requiredWords} (${result.counts.distinctRequiredWords} distinct), lost ${lost.length}, lost static lines ${lostLines.length}, expected 2->1 words ${expectedDrops.length}, data lines excluded ${result.counts.baselineDataLines}/${result.counts.afterDataLines}`)
for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}`)
for (const d of dataReport) console.log(`data ${d.id}: ${d.identical ? 'identical' : 'changed'} (${d.baselineLines} -> ${d.afterLines} lines)`)
if (lost.length) console.log('LOST words:', lost)
if (lostLines.length) console.log('LOST lines:', lostLines)
process.exit(verdictOk ? 0 : 1)
