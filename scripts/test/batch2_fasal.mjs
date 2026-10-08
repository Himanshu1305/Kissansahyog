// Batch 2 item E — Fasal Salah that does something.
// Static checks: crop cards are buttons that open a crop panel with today's call
// (actionWindows), this season's work (cropadv_<slug>), common problems (crop Q&A
// links, hidden when none), and nearby help (Browse + Drone Didi + equipment + KVK).
// Run: node scripts/test/batch2_fasal.mjs
import { readFileSync } from 'node:fs'
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
let pass = 0, fail = 0
const ok = (n, c) => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n}`) } }

const f = read('src/screens/FasalSalah.jsx')
ok('crop cards are buttons (tappable)', f.includes('data-testid={`fasal-crop-') && f.includes('onClick={() => openCrop'))
ok('crop panel renders', f.includes('fasal-crop-panel') && f.includes('CropPanel'))
ok("today's call uses actionWindows (spray/irrigate/harvest)", f.includes('actionWindows') && f.includes('windows.spray') && f.includes('windows.irrigation') && f.includes('windows.harvest'))
ok("season work uses existing cropadv_<slug> only", f.includes('cropadv_${c.slug}') && f.includes('fasal_season_work'))
// Batch 4 item C: cropadv rendered as 3–5 short bullet points, with a "पूरा जवाब पढ़ें →" link.
ok('season work renders as bullet list (adviceBullets)', f.includes('adviceBullets') && f.includes('fasal-season-bullets') && f.includes('<li'))
ok('read-full Q&A link under bullets', f.includes('fasal-read-full') && f.includes('fasal_read_full'))
ok('common problems: crop Q&A links + samasya hub, hidden when none', f.includes('fetchRelatedSawaal') && f.includes('/sawaal/${q.slug}') && f.includes('/fasal/${kbCrop(c)}/samasya') && f.includes('hasProblems'))
ok('nearby help: browse + drone + equipment + KVK/resources', f.includes('/browse?cat=agri_inputs') && f.includes('/browse?cat=drone_didi') && f.includes('/browse?cat=equipment') && f.includes("to=\"/resources\""))
ok('location control stays at top (public, no login)', f.includes('<LocationControl'))
ok('no new /fasal-salah/:crop route (panel approach)', !read('src/App.jsx').includes('/fasal-salah/:crop'))

// Batch 4 item C: each rabi crop's cropadv splits into 3–5 bullets (no padding/invention).
const bullets = (text) => String(text || '').split(/[।;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
const strings = (await import('../../src/lib/i18n/strings.js')).strings
for (const slug of ['gehun', 'chana', 'masoor', 'sarson']) {
  const n = bullets(strings[`cropadv_${slug}`]?.hi).length
  ok(`rabi crop ${slug} yields 3–5 bullets (got ${n})`, n >= 3 && n <= 5)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
