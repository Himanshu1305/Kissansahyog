#!/usr/bin/env node
// Batch 7L-2 static verifier — one registration form, one sign-in screen, the login-rules and
// registration migration FILES, weather rounding, the Clear-location button, privacy wording.
//   node scripts/verify-batch7l2.mjs
// Reads source files, the two migration files and the built dist/ (run the build first) and,
// if present, docs/review/batch7l2/browser-check.json (written by scripts/shots-batch7l2.mjs).
// No network, no database, no .env. It checks what the SQL files SAY; the functions are only
// exercised for real in Stage B, after the migrations are applied.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lines = []
const say = (s) => { console.log(s); lines.push(s) }
let pass = 0, fail = 0
const check = (name, ok, detail = '') => { say(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`); ok ? (pass += 1) : (fail += 1) }
const has = (rel) => existsSync(join(ROOT, rel))
const read = (rel) => (has(rel) ? readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n') : '')
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ')
const sql = (s) => s.replace(/^\s*--.*$/gm, '').replace(/--[^\n']*$/gm, '')
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const walk = (dir) => (has(dir) ? readdirSync(join(ROOT, dir)).flatMap((n) => (statSync(join(ROOT, dir, n)).isDirectory() ? walk(`${dir}/${n}`) : [`${dir}/${n}`])) : [])
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)
const { strings } = await load('src/lib/i18n/strings.js')
const { privacyPolicy } = await load('src/lib/i18n/legal.js')

// ---- 1. One registration form ------------------------------------------------------------------
const signup = read('src/screens/Signup.jsx'), signupCode = code(signup)
// Batch 10A Task E: e-mail + password moved into their own block (EmailPasswordFields); checks that
// look for those inputs read the screen + that block together (signupForm).
const emailPw = read('src/components/auth/EmailPasswordFields.jsx'), emailPwCode = code(emailPw)
const signupForm = signupCode + ' ' + emailPwCode
const login = read('src/screens/Login.jsx'), loginCode = code(login)
const placeField = read('src/components/location/PlaceField.jsx')
const auth = read('src/lib/auth/authService.js'), authCode = code(auth)
const srcFiles = walk('src').filter((f) => /\.(js|jsx)$/.test(f))
check('1: the phone/email tabs are gone (component removed, nothing imports it, no role="tab" on either screen)', !has('src/components/AuthTabs.jsx') && !srcFiles.some((f) => /AuthTabs/.test(code(read(f)))) && !/role="tab/.test(signupCode + loginCode) && !strings.tab_phone && !strings.tab_email)
// Batch 10A Task E: the language dropdown is REMOVED (signup uses the app's active language).
check('1: one sign-up form with name, email, password, mobile, village/town; language = the active app language (no dropdown)', (signupCode.match(/<form /g) || []).length === 1 && /<EmailPasswordFields /.test(signupCode) && ['id="full_name"', 'id="phone"', '<PlaceField id="village_town"'].every((x) => signupCode.includes(x)) && ['id="email"', 'id="password"'].every((x) => emailPwCode.includes(x)) && !/id="language"/.test(signupCode) && /language: lang\b/.test(signupCode))
// Batch 10A Task E: the farmer block moved off signup (stays on Profile); signup sends the same empty kisan object.
check('1: farmer fields kept on Profile (land, crops, lease, equipment, preferred mandi, WhatsApp opt-in); signup sends the untouched-block kisan object', !/KisanFields/.test(signupCode) && /<KisanFields /.test(code(read('src/screens/Profile.jsx'))) && ['k_land', 'k_crops', 'k-interest-lease', 'k-interest-equipment', 'k-whatsapp-optin', 'k_mandi'].every((x) => read('src/components/KisanFields.jsx').includes(x)) && /EMPTY_KISAN = Object\.freeze\(\{ land_acres: '', main_crops: '', interest_lease: false, interest_equipment: false, whatsapp_opt_in: false, preferred_mandi: '' \}\)/.test(signupCode) && /kisan: \{ \.\.\.EMPTY_KISAN \}/.test(signupCode))
check('1: email, password (min 8) and mobile are all required before continuing', /isValidEmail\(form\.email\)/.test(signupCode) && /form\.password\.length < MIN_PASSWORD/.test(signupCode) && /isValidPhone\(form\.phone\)/.test(signupCode) && /MIN_PASSWORD = 8/.test(auth))
check('1: password has a show/hide toggle', /data-testid="password-toggle"/.test(signupForm) && /type=\{showPassword \? 'text' : 'password'\}/.test(signupForm))
check('1: no pincode field, check or wording in the registration form', !/pincode|isValidPincode/i.test(signupCode) && !/pincode/i.test(code(placeField)))
check('1: village/town uses the places list of the location flow (same matching functions)', ['suggestPlaces', 'closestPlaces', 'placesInDistrict', 'exactPlace'].every((f) => placeField.includes(f)) && /useUserLocation\(\)/.test(placeField))
// Batch 10A Task E: the acknowledgment is on the SAME page (no step state); Register is refused until ticked.
check('1: the existing acknowledgment is kept on the same page and gates Register', !/\bstep\b|setStep/.test(signupCode) && /DisclaimerBanner which="signup"/.test(signupCode) && /disclaimer_accept_label/.test(signupCode) && /data-testid="disclaimer-accept"/.test(signupCode) && /if \(!accepted\) setError\(t\('err_disclaimer_not_accepted'\)\)/.test(signupCode) && /if \(!ok \|\| !accepted\) \{/.test(signupCode) && signupCode.indexOf('data-testid="disclaimer-accept"') < signupCode.indexOf('<BigButton type="submit"'))
// Batch 10A Task E: one checkbox (ticked = show, default), unticked = hidden + the existing warning.
check('1: visibility choice — one checkbox, not disabled, "show" ticked by default, warning when unticked', /type="checkbox" data-testid="visibility-show" checked=\{showDetails\}/.test(signupCode) && /data-testid="visibility-choice" data-choice=\{showDetails \? 'show' : 'hidden'\}/.test(signupCode) && !/visibility-show"[^>]*disabled/.test(signupCode) && /const \[showDetails, setShowDetails\] = useState\(true\)/.test(signupCode) && /!showDetails && <p data-testid="visibility-warning"[^>]*>\{t\('vis_hidden_warning'\)\}/.test(signupCode))
check('1: visibility wording is the briefed wording (Hindi + English)', strings.vis_show.en === 'Show my details (recommended)' && strings.vis_show.hi === 'मेरी जानकारी दिखाएँ (सुझाया गया)' && strings.vis_hidden.en === 'Keep hidden' && strings.vis_hidden.hi === 'छिपी रहने दें')
check('1: the explanation says plainly that hidden details are NOT seen and opportunities may be missed', /will NOT see them/.test(strings.vis_explain.en) && /miss chances to sell or lease/.test(strings.vis_explain.en) && /नहीं देख पाएँगे/.test(strings.vis_explain.hi) && /मौके छूट सकते हैं/.test(strings.vis_explain.hi) && /data-testid="visibility-explain"[^>]*>\{t\('vis_explain'\)\}/.test(signupCode))
check('1: the choice is sent to app_register and nowhere invents a profile column', /p_show_details: show_details !== false/.test(authCode) && /show_details: showDetails/.test(signupCode))
check('1: the password is given only to Supabase Auth, never to an RPC of ours', !/rpc\([^)]*\{[^}]*password/is.test(authCode) && /supabaseAuth\.auth\.signUp\(creds\)/.test(authCode))
const friendly = ['err_email_exists', 'err_phone_exists', 'err_password_short', 'err_invalid_phone', 'err_place_required', 'err_too_many_attempts', 'err_registration_incomplete', 'err_contact_hidden', 'err_not_found', 'err_wrong_password']
const technical = /[a-z]{3,}_[a-z_]+|\bRPC\b|\bSQL\b|exception|constraint|null|undefined|\bserver\b|डेटाबेस|database/i
const badMsgs = friendly.filter((k) => !strings[k] || !strings[k].hi || !strings[k].en || technical.test(strings[k].en) || /[a-z]{3,}_[a-z_]+/.test(strings[k].hi))
check('1: error messages exist in Hindi and English and use no technical wording', badMsgs.length === 0, badMsgs.join(', '))

// ---- 2. One sign-in screen ---------------------------------------------------------------------
check('2: one screen, both ways rendered together (no mode switch)', /data-testid="login-email-form"/.test(loginCode) && /data-testid="login-phone-form"/.test(loginCode) && !/useState\('phone'\)|mode ===/.test(loginCode))
check('2: honest OTP note (Hindi + English)', strings.login_otp_soon.en === 'OTP verification is coming soon.' && /OTP/.test(strings.login_otp_soon.hi) && /data-testid="login-otp-note"/.test(loginCode))
check('2: ONE place to plug OTP in (startPhoneLogin / verifyPhoneOtp), and the screen already has the code step', /export const PHONE_OTP_ENABLED = false/.test(auth) && /export async function startPhoneLogin/.test(auth) && /export async function verifyPhoneOtp/.test(auth) && /res\.step === 'otp'/.test(loginCode) && /phoneStep === 'otp'/.test(loginCode) && (authCode.match(/rpc\('app_login'/g) || []).length === 1)
check('2: both ways end in the same session handling (storeSession)', /step: 'done', profile: storeSession\(data\)/.test(authCode) && /return storeSession\(profile\)/.test(authCode))
check('2: "no profile" from the server is treated exactly like "not found"', /if \(!data \|\| !data\.id\) throw new AppError\('not_found'\)/.test(authCode))
const usedKeys = [...new Set([...(signupForm + loginCode + code(placeField)).matchAll(/(?<![A-Za-z.])t\(\s*(?:[A-Za-z]+ \? )?'([a-z_0-9]+)'(?: : '([a-z_0-9]+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean))]
const missing = usedKeys.filter((k) => !strings[k] || !strings[k].hi || !strings[k].en)
check(`2: every string the two screens and the place field use exists in Hindi and English (${usedKeys.length} keys)`, missing.length === 0, missing.join(', '))

// ---- 3. Migration 0059 — login rules -----------------------------------------------------------
const m59raw = read('supabase/migrations/0059_login_rules.sql'), m59 = sql(m59raw)
const fnBody = (src, name) => { const i = src.indexOf(`function public.${name}(`); if (i < 0) return ''; const j = src.indexOf('$$;', i); return src.slice(i, j) }
const appLogin = fnBody(m59, 'app_login'), appLoginEmail = fnBody(m59, 'app_login_email'), guard = fnBody(m59, 'app_login_email_guard')
check('3: 0059_login_rules.sql exists', m59raw.length > 0)
check('3: login_attempts has identifier, attempted_at, success — and nothing that could hold a password', /create table if not exists public\.login_attempts \(\s*id[^,]*,\s*identifier\s+text\s+not null,\s*attempted_at\s+timestamptz[^,]*,\s*success\s+boolean\s+not null\s*\)/.test(m59) && !/password|secret|hash/i.test(m59))
check('3: RLS on, NO policy, everything revoked from anon / authenticated, no grant on the table', /alter table public\.login_attempts enable row level security/.test(m59) && !/create policy/i.test(m59) && /revoke all on table public\.login_attempts from public, anon, authenticated/.test(m59) && !/grant[^;]*on (table )?public\.login_attempts/i.test(m59))
check('3: the two helpers are not callable by anon / authenticated', /revoke all on function public\.login_is_locked\(text\) from public, anon, authenticated/.test(m59) && /revoke all on function public\.login_record_attempt\(text, boolean\) from public, anon, authenticated/.test(m59))
check('3: every login function is SECURITY DEFINER with a fixed search_path', [appLogin, appLoginEmail, guard].every((b) => /security definer\s+set search_path = public, pg_temp/.test(b)))
check('3: existing names and signatures kept via CREATE OR REPLACE (app_login(text), app_login_email())', /create or replace function public\.app_login\(p_phone text\)\s+returns public\.profiles/.test(m59) && /create or replace function public\.app_login_email\(\)\s+returns public\.profiles/.test(m59) && !/drop function/i.test(m59))
check('3: ADMINS NEVER VIA MOBILE — an is_admin profile gets the same answer as an unknown number', /if not found or v_profile\.is_admin is true then\s+perform public\.login_record_attempt\(v_phone, false\);\s+return null;/.test(appLogin) && !/admin/i.test(appLogin.replace(/v_profile\.is_admin is true/, '')))
check('3: failures are RETURNED not raised, so the count survives', !/raise exception 'not_found'/.test(appLogin) && /return null;/.test(appLogin))
check('3: throttle = 5 failures inside 15 minutes → refused for 15 minutes', /limit 5/.test(m59) && /count\(\*\) = 5/.test(m59) && (m59.match(/interval '15 minutes'/g) || []).length >= 2)
check('3: the lock is checked before the account is looked up (says nothing about existence)', appLogin.indexOf('login_is_locked') > 0 && appLogin.indexOf('login_is_locked') < appLogin.indexOf('from public.profiles') && /raise exception 'too_many_attempts'/.test(appLogin) && /raise exception 'too_many_attempts'/.test(guard) && !/profiles/.test(guard))
check('3: rows older than 30 days are cleaned up inside the function', /delete from public\.login_attempts where attempted_at < now\(\) - interval '30 days'/.test(m59))
check('3: email sign-in honours the lock and records success', /login_is_locked\(v_ident\)/.test(appLoginEmail) && /login_record_attempt\(v_ident, true\)/.test(appLoginEmail))
check('3: idempotent and safe on existing data (if not exists / or replace only; no profile row is changed)', /create table if not exists/.test(m59) && /create index if not exists/.test(m59) && !/\b(update|delete from|truncate|drop table|alter table) public\.profiles/i.test(m59) && !/insert into public\.profiles/i.test(m59))
check('3: no admin_* function is touched', !/function public\.admin_/i.test(m59) && !/require_admin/i.test(m59))
check('3: rollback note and anon grants restated', /ROLLBACK/.test(m59raw) && /grant execute on function public\.app_login\(text\) to anon;/.test(m59) && /grant execute on function public\.app_login_email\(\) to anon, authenticated;/.test(m59))

// ---- 3b. Migration 0060 — one registration -----------------------------------------------------
const m60raw = read('supabase/migrations/0060_one_registration.sql'), m60 = sql(m60raw)
const reg = fnBody(m60, 'app_register'), contact = fnBody(m60, 'get_listing_contact'), consents = fnBody(m60, 'accept_listing_consents')
check('3b: 0060_one_registration.sql exists; app_register is SECURITY DEFINER with a fixed search_path', m60raw.length > 0 && /security definer\s+set search_path = public, pg_temp/.test(reg))
check('3b: app_register identifies the caller from the session, requires mobile + acknowledgment, no pincode', /v_uid\s+uuid := auth\.uid\(\)/.test(reg) && /raise exception 'invalid_phone'/.test(reg) && /raise exception 'disclaimer_not_accepted'/.test(reg) && !/p_pincode|pincodes/.test(reg))
check('3b: the visibility choice goes into the EXISTING consents jsonb (no new column)', /'details_visibility', jsonb_build_object\(\s*'choice', case when p_show_details is false then 'hidden' else 'show' end/.test(reg) && !/add column/i.test(m60))
check('3b: friendly codes for mobile / email already used', /raise exception 'phone_exists'/.test(reg) && /raise exception 'email_exists'/.test(reg))
check('3b: only schema change is dropping NOT NULL on profiles.pincode; no existing row is changed', (m60.match(/alter table/gi) || []).length === 1 && /alter table public\.profiles alter column pincode drop not null/.test(m60) && !/update public\.profiles\s+set (?!consents)/i.test(m60) && !/delete from|truncate|drop table|drop column/i.test(m60))
check('3b: accept_listing_consents keeps the visibility choice', /consents \? 'details_visibility'/.test(consents))
check('3b: "keep hidden" is enforced where name + number are given out', /consents #>> '\{details_visibility,choice\}' = 'hidden'/.test(contact) && /raise exception 'contact_hidden'/.test(contact) && /returns table \(full_name text, phone text\)/.test(m60))
check('3b: older sign-up functions are left alone; rollback note present', !/function public\.app_signup\b|function public\.app_signup_email/.test(m60) && /ROLLBACK/.test(m60raw))
const nums = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => Number(f.slice(0, 4))).sort((a, b) => a - b)
check('3b: migration numbering is contiguous and ends at 0060', nums.at(-1) === 60 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1))

// ---- 4. Location privacy -----------------------------------------------------------------------
const wx = read('src/lib/weather/weatherApiV2.js'), wxCode = code(wx)
const cron = read('scripts/refresh-data.mjs'), cronCode = code(cron)
// 4a. Every code path that WRITES a weather coordinate. A new write site anywhere else, or one
// of these losing its rounding, fails the check.
const WRITE = /from\('(weather_cache_v2|weather_grid_requests|weather_cache)'\)\s*\.\s*(upsert|insert|update)|rpc\('cache_weather_cell'/g
const scan = [...srcFiles, ...walk('functions'), ...walk('scripts').filter((f) => /\.mjs$/.test(f) && !/scripts\/(test|verify-|shots)/.test(f) && !/copy-content-to-prod/.test(f))]
const sites = scan.flatMap((f) => [...code(read(f)).matchAll(WRITE)].map((m) => `${f}:${m[1] || 'cache_weather_cell'}`)).sort()
const EXPECTED = ['scripts/refresh-data.mjs:weather_cache_v2', 'src/lib/weather/weatherApiV2.js:cache_weather_cell', 'src/lib/weather/weatherApiV2.js:weather_grid_requests'].sort()
check('4a: the weather write paths are exactly the three known ones', JSON.stringify(sites) === JSON.stringify(EXPECTED), sites.join(' | '))
const fnSrc = (src, head) => { const i = src.indexOf(head); if (i < 0) return ''; const j = src.indexOf('\n}\n', i); return src.slice(i, j) }
const live = fnSrc(wxCode, 'export async function fetchLiveWeatherCell('), reqCell = fnSrc(wxCode, 'export async function requestGridCell('), cronCell = fnSrc(cronCode, 'async function refreshCell(')
const snapsFirst = (body, args) => new RegExp(`^[^\\n]*\\(${args}\\) \\{\\s*const \\{ lat, lon \\} = cellCentre\\(${args}\\)`).test(body)
check('4a: fetchLiveWeatherCell rounds to the cell centre BEFORE anything is requested or saved', snapsFirst(live, 'exactLat, exactLon') && !/exactLat|exactLon/.test(live.split('cellCentre(exactLat, exactLon)')[1] || 'exactLat') && /p_lat: lat, p_lon: lon/.test(live))
check('4a: requestGridCell rounds to the cell centre before the upsert', snapsFirst(reqCell, 'exactLat, exactLon') && !/exactLat|exactLon/.test(reqCell.split('cellCentre(exactLat, exactLon)')[1] || 'exactLat') && /latitude: lat, longitude: lon/.test(reqCell))
check('4a: the refresh job rounds too (so older exact rows are rewritten as cell centres)', /const lat = Math\.round\(Number\(rawLat\) \* 10\) \/ 10, lon = Math\.round\(Number\(rawLon\) \* 10\) \/ 10/.test(cronCell) && !/rawLat|rawLon/.test(cronCell.split('/ 10\n')[1] || 'rawLat') && /latitude: lat, longitude: lon/.test(cronCell))
// behaviour of the two pure helpers, taken from the source text
const helperSrc = (wx.match(/export const cellCentre = [^\n]+\nexport const gridKey = [^\n]+/) || [''])[0].replace(/export const/g, 'const')
let centreOk = false, worstKm = 0, detail = ''
try {
  const { cellCentre, gridKey } = new Function(`${helperSrc}; return { cellCentre, gridKey }`)()
  centreOk = true
  for (let i = 0; i < 4000; i++) {
    const lat = 21 + Math.random() * 6, lon = 74 + Math.random() * 9
    const c = cellCentre(lat, lon)
    const key = gridKey(lat, lon)
    const km = Math.hypot((lat - c.lat) * 111.2, (lon - c.lon) * 111.2 * Math.cos((lat * Math.PI) / 180))
    worstKm = Math.max(worstKm, km)
    const oneDecimal = Number(c.lat.toFixed(1)) === c.lat && Number(c.lon.toFixed(1)) === c.lon
    if (!oneDecimal || key !== `${c.lat.toFixed(1)}_${c.lon.toFixed(1)}` || gridKey(c.lat, c.lon) !== key || Math.abs(lat - c.lat) > 0.0500001 || Math.abs(lon - c.lon) > 0.0500001) { centreOk = false; detail = `${lat},${lon} → ${JSON.stringify(c)} ${key}`; break }
  }
} catch (e) { detail = e.message }
check(`4a: the saved point is the centre of the SAME cell grid_key names; a visitor is at most ${worstKm.toFixed(1)} km from it`, centreOk && worstKm < 8, detail)
// 4c. Clear button
const provider = read('src/lib/location/LocationProvider.jsx'), control = read('src/components/location/LocationControl.jsx'), userLoc = read('src/lib/location/userLocation.js')
check('4c: "Clear my location" wording (Hindi + English)', strings.loc_clear.hi === 'मेरी लोकेशन हटाएँ' && strings.loc_clear.en === 'Clear my location')
check('4c: the button sits in the banner that shows the current location, on every page that uses the control', /data-testid="location-banner"[\s\S]*data-testid="location-clear"[\s\S]*<\/p>/.test(control) && /clearLocation\(\)/.test(control))
check('4c: it removes the saved place from the device and nothing puts one back on its own', /localStorage\.removeItem\(KEY\)/.test(userLoc) && /setLoc\(null\)/.test(provider) && /if \(location \|\| isLocationCleared\(\)\) return/.test(provider) && /!isLocationCleared\(\)\) shareDevice/.test(provider))
check('4c: no confirm / alert dialog', !/confirm\(|alert\(/.test(code(control) + code(provider)))
// 4d. Privacy paragraph
const loc = privacyPolicy.find((p) => p.en.startsWith('Your location'))
check('4d: privacy paragraph says the saved weather position is rounded to ~10 km (Hindi + English)', !!loc && /rounded to an area of about 10 km/.test(loc.en) && /Your exact position is not saved for weather/.test(loc.en) && /लगभग 10 किमी के इलाके तक गोल/.test(loc.hi))
check('4d: it names the Clear button instead of "clear browser data"', !!loc && /"Clear my location"/.test(loc.en) && /"मेरी लोकेशन हटाएँ"/.test(loc.hi) && !/clear this site|साइट का डेटा साफ़/.test(loc.en + loc.hi))
check('4d: Terms / Privacy version not bumped; lawyer note added', /Version 1\.2/.test(read('src/lib/i18n/termsContent.js')) && !/Version 1\.3/.test(read('src/lib/i18n/termsContent.js')) && /Batch 7L-2/.test(read('docs/legal/TERMS_DRAFT_FOR_LAWYER.md')))
// 4e. pincode wording
const pinClaim = /pincode is used to show nearby|पिन कोड से आस-पास की लिस्टिंग/
check('4e: no text anywhere says the pincode is used to show nearby listings', !Object.values(strings).some((v) => pinClaim.test(`${v?.hi} ${v?.en}`)) && !pinClaim.test(signup))

// ---- 5. Built pages + browser check ------------------------------------------------------------
if (has('dist/privacy/index.html')) {
  const p = text(read('dist/privacy/index.html'))
  check('5: built /privacy carries the updated paragraph', /rounded to an area of about 10 km/.test(p) && /Clear my location/.test(p) && /मेरी लोकेशन हटाएँ/.test(p))
} else check('5: dist/ is built', false, 'run the build first')
if (has('docs/review/batch7l2/browser-check.json')) {
  const b = JSON.parse(read('docs/review/batch7l2/browser-check.json'))
  check(`5: Playwright (mocked) — ${b.passed}/${b.passed + b.failed} checks in Hindi + English at 390 and 1440`, b.failed === 0 && b.passed >= 100, (b.results || []).filter((r) => !r.ok).map((r) => r.name).join(' | '))
} else say('INFO  docs/review/batch7l2/browser-check.json not found — run scripts/shots-batch7l2.mjs')

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7l2'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7l2/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
