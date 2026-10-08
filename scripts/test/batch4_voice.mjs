#!/usr/bin/env node
// Batch 4 item E — voice search. Unit test for transcript clean-up + static checks that
// the /transcribe abuse guards (Origin allow-list, size cap, rate limit, no audio logging)
// and the Privacy voice line are in place. Run: node scripts/test/batch4_voice.mjs
import { readFileSync } from 'node:fs'
import { cleanTranscript } from '../../src/lib/voice/voiceSearch.js'
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${d}`) } }

// ---- transcript clean-up (unit) ----
ok('clean: trims + collapses whitespace', cleanTranscript('  गेहूं   का   भाव  ') === 'गेहूं का भाव')
ok('clean: strips wrapping double quotes', cleanTranscript('"गेहूं का भाव"') === 'गेहूं का भाव')
ok('clean: strips curly quotes', cleanTranscript('“tractor”') === 'tractor')
ok('clean: drops a trailing danda', cleanTranscript('गेहूं का भाव।') === 'गेहूं का भाव')
ok('clean: drops a trailing full-stop', cleanTranscript('wheat price.') === 'wheat price')
ok('clean: keeps inner words/punctuation intact', cleanTranscript('सोयाबीन का भाव, सागर') === 'सोयाबीन का भाव, सागर')
ok('clean: empty/nullish → empty string', cleanTranscript('') === '' && cleanTranscript(null) === '' && cleanTranscript(undefined) === '')

// ---- /transcribe abuse guards (static) ----
const fn = read('functions/transcribe.js')
ok('transcribe: has an Origin/Referer allow-list guard', fn.includes('originOk') && fn.includes('forbidden_origin'))
ok('transcribe: allows kissansahyog.com + www + *.pages.dev + localhost',
  fn.includes("'kissansahyog.com'") && fn.includes("'www.kissansahyog.com'") &&
  fn.includes('.kissansahyog.pages.dev') && fn.includes("'localhost'"))
ok('transcribe: guard runs before the key/quota work', fn.indexOf('originOk(request)') < fn.indexOf('GEMINI_API_KEY', fn.indexOf('onRequestPost')))
ok('transcribe: has a hard size cap', /byteLength > \d+ \* 1024 \* 1024/.test(fn) && fn.includes('too_large'))
ok('transcribe: has a per-IP rate limit', fn.includes('underRateLimit') && fn.includes('check_transcribe_rate') && fn.includes('rate_limited'))
ok('transcribe: does not log/store audio (no console.log of bytes/blob)', !/console\.(log|info|warn)\([^)]*(bytes|b64|audio|blob)/i.test(fn))

// ---- mic button wiring (static) ----
const btn = read('src/components/VoiceSearchButton.jsx')
ok('button: mic is >=44px (h-11 w-11)', btn.includes('h-11 w-11'))
ok('button: uses cleanTranscript on both paths', (btn.match(/cleanTranscript\(/g) || []).length >= 2)
ok('button: Hindi aria-label (voice_search_aria=बोलकर खोजें)', read('src/lib/i18n/strings.js').includes("voice_search_aria: { hi: 'बोलकर खोजें'"))
ok('button: offline message handled', btn.includes('voice_err_offline') && btn.includes('navigator.onLine'))
ok('button: aria-live status region', btn.includes('aria-live="polite"') && btn.includes('voice-status'))

// ---- mic appears in every existing search box ----
for (const f of ['src/components/SearchBar.jsx', 'src/screens/Search.jsx', 'src/screens/Sawaal.jsx']) {
  ok(`mic wired in ${f}`, read(f).includes('VoiceSearchButton'))
}

// ---- Privacy voice line (honest about OS/cloud speech services) ----
const legal = read('src/lib/i18n/legal.js')
ok('privacy: Hindi voice line (never saved + Google/Apple may process)',
  legal.includes('आवाज़ से खोज') && legal.includes('कभी सेव नहीं करता') && legal.includes('Google'))
ok('privacy: English voice line', legal.includes('Voice search:') && legal.includes('never saves it') && legal.includes('Apple'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
