// Batch 9 Phase 5C.1 — write docs/review/batch9/ROUTE_COVERAGE.md from src/App.jsx patterns, the earlier
// test runs (hand-mapped from the harness sources, see APP/WEB below) and tonight's results-routes.json.
import { readFileSync, writeFileSync } from 'node:fs'
const app = readFileSync('src/App.jsx', 'utf8')
const patterns = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1])
const R = JSON.parse(readFileSync('docs/review/batch9/evidence/phase5c/results-routes.json', 'utf8')).results
// Earlier IN-APP visits (emulator, RAN-PASSED runs): batch8b prod run1/run2 (T1–T18), batch8b staging runs (S/O),
// batch9 phase1 runs (K1/H1/C1/L1/T9/T10/T14, S4–S8). Mapping source: scripts/android/expected.mjs ROUTES (T5),
// run-tests.mjs (T6 /yojana/central + a /sawaal/<slug>; T12 /resources /yojana/central /kisan-mela /contact;
// T14/K1 /search /grievance /post /profile /signup /login), staging-tests.mjs (S4 /signup /home, S5 /login,
// S6 /post /my, S7 /listing/<id>, S8 /profile /my, O2/O3 /, /mausam, /msp, /browse, /listing/<id>).
const APP = {
  '/': 'T5 T7 T10 O2/O3', '/browse': 'T5 O2/O3', '/bazaar': 'T5 T11', '/mausam': 'T5 T7 O2/O3', '/msp': 'T5 O2/O3', '/yojana': 'T5', '/sawaal': 'T5',
  '/search': 'T5 T14', '/about': 'T5', '/privacy': 'T5', '/terms': 'T5', '/contact': 'T5 T12', '/login': 'T5 S5 K1', '/cold-storage': 'T5 C1',
  '/kisan-mela': 'T5 T12', '*': 'T5 (invalid path)', '/yojana/central': 'T6 T12', '/sawaal/:slug': 'T6', '/resources': 'T12', '/grievance': 'K1 S11',
  '/post': 'K1 L1 S6', '/profile': 'K1 S8', '/signup': 'K1 S4', '/home': 'S4', '/my': 'S6 S8', '/listing/:id': 'S7 O2/O3',
}
// Earlier WEB visits: phase4 staging gates (verify-batch9-live.mjs), phase2 real-SW test, phase1 C1-web, phase5b scripts.
const WEB = {
  '/': 'P4 gates', '/about': 'P4', '/browse': 'P4 P2 P5B', '/cold-storage': 'P4 C1-web', '/grievance': 'P4 P5B', '/mausam': 'P4 P2 P5B', '/msp': 'P4',
  '/privacy': 'P4', '/sawaal': 'P4 P5B', '/terms': 'P4', '/yojana': 'P4', '*': 'P2', '/home': 'P5B', '/login': 'P5B', '/signup': 'P5B', '/my': 'P5B',
  '/post': 'P5B', '/profile': 'P5B', '/listing/:id': 'P5B', '/carbon-credit': 'P5B', '/kisan-mela': 'P5B', '/kisan-mela/submit': 'P5B', '/safalta': 'P5B',
}
const rows = patterns.map((p) => ({ p, app: APP[p] || '', web: WEB[p] || '', r: R.find((x) => x.pattern === p && !x.id.startsWith('guard:')) }))
const total = rows.length
const inApp = rows.filter((x) => x.app).length
const webTonight = rows.filter((x) => x.r && x.r.status !== 'NOT-RUN').length
const webPass = rows.filter((x) => x.r?.status === 'RAN-PASSED').length
const webEver = rows.filter((x) => x.web || (x.r && x.r.status !== 'NOT-RUN')).length
const unvisitable = rows.filter((x) => !x.app && !(x.r && x.r.status !== 'NOT-RUN'))
const guards = R.filter((x) => x.id.startsWith('guard:'))
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|')
const L = []
L.push('# Batch 9 — route coverage map (Phase 5C.1)', '')
L.push(`**Route patterns in \`src/App.jsx\`: ${total}** (incl. the \`*\` 404 route)`)
L.push(`- **Visited in the APP (emulator), earlier runs: ${inApp} / ${total}** — batch 8B and batch 9 Phase 1/5 emulator runs only. Tonight NO emulator ran (low PC memory), so this number did not grow; the 5C target "100 % in the app" is **NOT met** (${total - inApp} patterns never opened inside the app).`)
L.push(`- **Visited on the WEB tonight (staging website, phone viewport, web stand-in): ${webTonight} / ${total}** — ${webPass} RAN-PASSED, ${webTonight - webPass} RAN-FAILED. Visited on the web at any time in batch 9: ${webEver} / ${total}.`)
L.push(`- **Unvisitable: ${unvisitable.length}**${unvisitable.length ? ' — ' + unvisitable.map((x) => x.p).join(', ') : ' (every pattern was opened at least once, in the app or on the web)'}.`)
L.push(`- Guard checks (extra, not patterns): ${guards.filter((g) => g.status === 'RAN-PASSED').length} / ${guards.length} RAN-PASSED.`, '')
L.push('"Web stand-in, not the app": the website serves the same React bundle the app wraps in an Android WebView, against the same staging Supabase project. Possible differences in the app: WebView version, native back button (NativeShell), links opened outside the app (T12), offline cache layer (app only), status/navigation-bar insets.', '')
L.push('Each web visit (`scripts/phase5c/routes.mjs`, results in `evidence/phase5c/results-routes.json`): real id from the live parent page or a known real slug; assertions = real content (> 150 characters), no ErrorBoundary ("This page could not open"), not the 404 page (except `*`), stays on the route, no spinner left, no new console error or page error (allowlist: the known CSP block of Supabase-Storage photos from Phase 4), and **browser Back**: an in-app link on the page is followed (SPA navigation) and Back must return to the same route with its content. Logged-out visits use a fresh browser; logged-in visits use KEEP persona P2 (read-only; nothing submitted).', '')
L.push('| # | Route pattern | Earlier in the APP | Earlier on the WEB | Tonight (web) | Concrete path | Result detail |', '|---|---|---|---|---|---|---|')
rows.forEach((x, i) => {
  const r = x.r, d = r?.detail || {}
  const det = r ? (r.status === 'NOT-RUN' ? d.reason : [d.h1 ? `h1 "${d.h1}"` : '', d.failedChecks?.length ? `FAILED: ${d.failedChecks.join(', ')}` : '', d.back?.tried ? `back via ${d.back.via} → ${d.back.ok ? 'OK' : 'NOT OK'}` : 'back: not tried (no in-app link / leaves the app)', d.landedPath && d.landedPath !== r.path ? `landed ${d.landedPath}` : '', d.note || ''].filter(Boolean).join('; ')) : ''
  L.push(`| ${i + 1} | \`${x.p}\` | ${x.app || '—'} | ${x.web || '—'} | ${r ? r.status + (r.auth === 'in' ? ' (logged in)' : ' (logged out)') : 'not visited'} | ${r?.path ? '`' + cell(r.path) + '`' : ''} | ${cell(det)} |`)
})
L.push('', 'App test ids: T* = prod-flavour suite (8B / 9), S*/O* = staging-flavour suite, K1/H1/C1/L1 = batch 9 Phase 1. Web: P4 = Phase 4 staging gates, P2 = Phase 2 service-worker test, P5B = Phase 5B web runs, C1-web = Phase 1 web cold-storage test.', '')
L.push('## Guard checks (tonight, web)', '', '| Check | Expected (from the code) | Result | Landed on |', '|---|---|---|---|')
for (const g of guards) {
  const exp = g.id.includes(':out:') ? (g.pattern === '/admin' ? 'AdminOnly → /login' : 'Protected → / (App.jsx `Protected` uses `<Navigate to="/">`)') : g.title.includes('content') ? 'page renders for a logged-in user' : 'PublicOnly → /home'
  L.push(`| ${cell(g.title)} | ${exp} | ${g.status} | \`${g.detail.landed}\` |`)
}
L.push('', '## Notes and findings from the sweep',
  '- **Logged-out /post, /home, /my, /profile, /experts send the visitor to the homepage (`/`), not to the login page** (App.jsx `Protected`). Works as coded (RAN-PASSED against the code), but a logged-out farmer tapping "Post" lands on the homepage without being told to log in — HUMAN-REVIEW (founder decision; /admin goes to /login instead). My first guard run expected /login and failed; the expectation was corrected to the code, not the code to the test.',
  '- `/resources` is answered by the server with **308 → `/resources/`** (the only route with a trailing-slash redirect; content renders fine). Low; check the canonical URL / sitemap entry.',
  '- `/join` (WhatsApp channel join) writes a row to `join_clicks` on every visit and then leaves for the channel, or goes to `/` when no channel is configured (staging: `/`). Visited with `?src=ks5c-route-sweep` so the row is identifiable (recorded in staging-test-data.json).',
  '- `/sawaal/vishay/:category`: no page links to a category hub when the Q&A has a crop (SawaalDetail links the crop hub instead) and the staging sitemap lists no category hub, so a real category key (`disease`, from `scat_*` in strings.js) was used; the hub rendered with content.',
  '- `/experts/:id` was reached by tapping the first expert card on `/experts` (logged in).',
  '- `/admin` as a non-admin KEEP persona shows the "no access" screen (not a crash, not a 404) — as designed.',
  '- The first sweep run had two harness problems, fixed and re-run: a moving ticker link could not be clicked for the Back test (now a DOM click on a main/footer link), and three data routes had no link on their parent page (real slugs from the search index / sitemap used instead).', '')
writeFileSync('docs/review/batch9/ROUTE_COVERAGE.md', L.join('\n'))
console.log({ total, inApp, webTonight, webPass, webEver, unvisitable: unvisitable.length, guards: guards.length })
