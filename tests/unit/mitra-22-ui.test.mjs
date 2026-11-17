// Batch 22 - the offer-form helper, the strings, and the wiring of the screens (read from the source; the browser checks are in
// tests/e2e20). Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { saveMitraOnOffer } from '../../src/lib/mitra/saveMitraOnOffer.js'
import { mitraStrings } from '../../src/lib/i18n/mitraStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { toAppError } from '../../src/lib/errors.js'

const quiet = { warn: () => {} }
const src = (f) => readFileSync(f, 'utf8')
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

// ---------- the best-effort save after the first offer ----------
test('saveMitraOnOffer: never called for "None", without a profile, or without a listing', async () => {
  let calls = 0
  const rpc = async () => { calls++; return { data: { status: 'set' } } }
  assert.equal(await saveMitraOnOffer(rpc, 'p1', '', 'l1', quiet), 'skipped')
  assert.equal(await saveMitraOnOffer(rpc, 'p1', null, 'l1', quiet), 'skipped')
  assert.equal(await saveMitraOnOffer(rpc, null, 'm1', 'l1', quiet), 'skipped')
  assert.equal(await saveMitraOnOffer(rpc, 'p1', 'm1', null, quiet), 'skipped')
  assert.equal(calls, 0)
})

test('saveMitraOnOffer: ONE call with the actor, the Mitra and the listing', async () => {
  const seen = []
  const rpc = async (name, args) => { seen.push([name, args]); return { data: { status: 'set' }, error: null } }
  assert.equal(await saveMitraOnOffer(rpc, 'p1', 'm1', 'l1', quiet), 'set')
  assert.deepEqual(seen, [['set_my_mitra_on_offer', { p_actor_id: 'p1', p_mitra_id: 'm1', p_listing_id: 'l1' }]])
})

test('saveMitraOnOffer: a database answer is final (already_set, not_first_offer ...) and is not an error', async () => {
  for (const status of ['already_set', 'not_first_offer', 'too_late', 'no_such_mitra', 'not_your_offer']) {
    let n = 0
    const warnings = []
    const rpc = async () => { n++; return { data: { status } } }
    assert.equal(await saveMitraOnOffer(rpc, 'p1', 'm1', 'l1', { warn: (...a) => warnings.push(a) }), status)
    assert.equal(n, 1)
    assert.equal(warnings.length, 0)
  }
})

test('saveMitraOnOffer: one retry on a network error, none on a database refusal', async () => {
  let n = 0
  const flaky = async () => { n++; if (n === 1) throw new TypeError('Failed to fetch'); return { data: { status: 'set' } } }
  assert.equal(await saveMitraOnOffer(flaky, 'p1', 'm1', 'l1', quiet), 'set')
  assert.equal(n, 2)
  let m = 0
  const refused = async () => { m++; return { error: { code: '42501', message: 'permission denied' } } }
  assert.equal(await saveMitraOnOffer(refused, 'p1', 'm1', 'l1', quiet), 'failed')
  assert.equal(m, 1)
  let k = 0
  const down = async () => { k++; throw new TypeError('Failed to fetch') }
  assert.equal(await saveMitraOnOffer(down, 'p1', 'm1', 'l1', quiet), 'failed')
  assert.equal(k, 2, 'exactly one retry')
})

test('saveMitraOnOffer: never throws; the warning has no personal data; a slow answer is not waited for', async () => {
  const warnings = []
  const boom = async () => { throw new Error('exploded for 9876543210') }
  assert.equal(await saveMitraOnOffer(boom, 'profile-123', 'mitra-9', 'listing-7', { warn: (...a) => warnings.push(a.join(' ')) }), 'failed')
  assert.equal(warnings.length, 1)
  assert.ok(!/9876543210|profile-123|mitra-9|listing-7/.test(warnings[0]))
  const slow = () => new Promise((r) => setTimeout(() => r({ data: { status: 'set' } }), 400))
  const t0 = Date.now()
  assert.equal(await saveMitraOnOffer(slow, 'p1', 'm1', 'l1', { ...quiet, waitMs: 50 }), 'pending')
  assert.ok(Date.now() - t0 < 300, 'the done screen is not kept waiting')
})

test('the wait is about one second', () => {
  assert.match(src('src/lib/mitra/saveMitraOnOffer.js'), /MITRA_OFFER_WAIT_MS = 1000/)
})

// ---------- strings ----------
test('the offer-form label is exactly the founder text in both languages; "None" stays; the old sign-up label is gone', () => {
  assert.equal(mitraStrings.mitra_offer_label.hi, 'इस सेवा के लिए किसी किसान मित्र ने आपकी मदद की? (वैकल्पिक)')
  assert.equal(mitraStrings.mitra_offer_label.en, 'Did a Kissan Mitra help you offer this? (optional)')
  assert.equal(mitraStrings.mitra_none.en, 'None')
  assert.equal(mitraStrings.mitra_field_label, undefined)
  assert.equal(strings.mitra_offer_label.hi, mitraStrings.mitra_offer_label.hi)
})

test('the ad field label and hint are the founder text; every new string has both languages and matching placeholders', () => {
  assert.equal(mitraStrings.mitra_ad_field_hint.hi, 'सिर्फ़ असली पेड विज्ञापन पर चुनें, त्योहार या जानकारी वाले कार्ड पर नहीं')
  assert.equal(mitraStrings.mitra_ad_field_hint.en, 'Choose only on a real paid ad, not on festival or info cards')
  assert.equal(mitraStrings.mitra_ad_field_label.en, 'Kissan Mitra who brought this ad')
  for (const k of ['mitra_offer_label', 'mitra_not_counted_yet', 'mitra_offers_count', 'mitra_first_offer', 'mitra_people_title', 'mitra_pay_once_note', 'mitra_ads_title', 'mitra_ads_none', 'mitra_ad_field_label', 'mitra_ad_field_hint', 'mitra_ad_paid_note', 'mitra_ad_save_failed', 'mitra_ad_chip']) {
    const v = mitraStrings[k]
    assert.ok(v && v.hi && v.en, k)
    assert.deepEqual((v.hi.match(/\{\w+\}/g) || []).sort(), (v.en.match(/\{\w+\}/g) || []).sort(), k)
    assert.ok(/[ऀ-ॿ]/.test(v.hi), `${k} Hindi is Devanagari`)
    assert.ok(!/[ऀ-ॿ]/.test(v.en), `${k} English has no Devanagari`)
    assert.ok(strings[k], `${k} is merged into strings.js`)
  }
  assert.match(mitraStrings.mitra_btn_regs.en, /ads/i)
  assert.match(mitraStrings.mitra_sum_attributed.en, /ads/i)
  assert.ok(!/registration/i.test(mitraStrings.mitra_btn_regs.en + mitraStrings.mitra_regs_title.en + mitraStrings.mitra_pay_counts.en), 'wording moved from registrations to service offers and ads')
})

test('Hindi text lives only in the string files', () => {
  for (const f of ['src/lib/mitra/saveMitraOnOffer.js', 'src/lib/mitra/mitraApi.js', 'src/screens/Post.jsx', 'src/screens/Signup.jsx', 'src/screens/admin/tabs/AnnouncementsPanel.jsx', 'src/screens/admin/tabs/MitraPanel.jsx', 'src/components/auth/MitraField.jsx']) {
    const code = noComments(src(f))
    // Post.jsx and the two panels pre-date this batch; only check that this batch added no Devanagari in the lines that mention Mitra.
    const mitraLines = code.split('\n').filter((l) => /mitra/i.test(l)).join('\n')
    assert.ok(!/[ऀ-ॿ]/.test(mitraLines), `${f}: Hindi text next to Mitra code`)
  }
})

// ---------- sign-up ----------
test('sign-up: no Mitra field, no mitra_id in the payload, no unused import; one short comment says where it went', () => {
  const s = src('src/screens/Signup.jsx')
  assert.ok(!/import MitraField/.test(s))
  assert.ok(!/<MitraField/.test(s))
  assert.ok(!/mitraId|setMitraId/.test(s))
  assert.ok(!/mitra_id/.test(s))
  assert.equal((s.match(/Batch 22/g) || []).length, 1, 'exactly one comment about the move')
  assert.match(s, /offer form/)
})

test('sign-up: the registration code still sends no Mitra and the old helpers stay in place (they skip when there is no mitra_id)', () => {
  const auth = src('src/lib/auth/authService.js')
  assert.match(auth, /saveMyMitra/)
  assert.ok(src('src/lib/mitra/saveMyMitra.js').includes("if (!profileId || !mitraId) return 'skipped'"))
})

test('the register demo in the guide has no Mitra step', () => {
  for (const f of ['src/features/guide']) {
    const out = readFileSync('src/features/guide/GuideHelpButton.jsx', 'utf8')
    assert.ok(!/mitra/i.test(out), f)
  }
})

// ---------- the offer form ----------
test('Post: the field is on step 3 for an OFFER only, before the consent checklist, and only when the database says the choice is open', () => {
  const s = src('src/screens/Post.jsx')
  assert.match(s, /\{listingType === 'offer' && mitraOpen && <MitraField value=\{mitraId\} onChange=\{setMitraId\} \/>\}/)
  const iField = s.indexOf('<MitraField')
  const iConsents = s.indexOf('<ConsentChecklist')
  assert.ok(iField > 0 && iField < iConsents, 'the field comes before the consent checklist')
  assert.ok(iField > s.indexOf("step === 3 &&"), 'inside step 3')
  assert.equal((s.match(/<MitraField/g) || []).length, 1, 'only one place in the whole screen')
  // the check runs only on step 3 of an offer, and a failure keeps it hidden (myMitraChoiceOpen answers false)
  assert.match(s, /if \(step !== 3 \|\| listingType !== 'offer' \|\| !user\?\.id\) \{ setMitraOpen\(false\); return undefined \}/)
  assert.match(s, /myMitraChoiceOpen\(user\.id\)\.then\(\(open\) => \{ if \(alive\) setMitraOpen\(open === true\) \}\)/)
})

test('myMitraChoiceOpen answers false on an error, on anything but true, and without an actor (the safe side)', async () => {
  const api = src('src/lib/mitra/mitraApi.js')
  assert.match(api, /return !error && data === true/)
  assert.match(api, /catch \{\s*return false/)
  assert.match(api, /if \(!actorId\) return false/)
  assert.match(api, /'my_mitra_choice_open', \{ p_actor_id: actorId \}/)
})

test('Post: the choice is saved only after createListing succeeded, with the new helper, for an offer only, and never changes the create call', () => {
  const s = src('src/screens/Post.jsx')
  const iCreate = s.indexOf('const listing = await createListing({')
  const iSave = s.indexOf('await saveMitraOnOffer(')
  const iDone = s.indexOf('setCreated(listing)')
  assert.ok(iCreate > 0 && iCreate < iSave && iSave < iDone, 'create, then save, then the done screen')
  assert.match(s, /if \(mitraOpen && listingType === 'offer' && mitraId\) await saveMitraOnOffer\(\(name, args\) => supabase\.rpc\(name, args\), user\.id, mitraId, listing\?\.id\)/)
  // the createListing arguments carry no Mitra, and the retry / duplicate protection lines are still there
  const call = s.slice(iCreate, s.indexOf('})', iCreate))
  assert.ok(!/mitra/i.test(call))
  assert.match(call, /clientRequestId: rid/)
  assert.match(s, /findListingByRequest/)
  assert.match(s, /sentOnce\.current/)
})

test('Post: the choice stays in form state only (never the URL, localStorage or analytics) and is cleared after posting and on reset', () => {
  const s = src('src/screens/Post.jsx')
  const lines = noComments(s).split('\n').filter((l) => /mitra/i.test(l)).join('\n')
  assert.ok(!/localStorage|sessionStorage|searchParams|setParams|navigate\(|track\(|gtag|analytics/i.test(lines))
  assert.match(s, /setMitraId\(''\); setMitraOpen\(false\)\n\s+setCreated\(listing\)/)
  assert.match(s, /function resetAll\(\) \{[\s\S]*?setMitraId\(''\); setMitraOpen\(false\)/)
})

test('the Mitra dropdown exists on the farmer Post form ONLY: no other screen renders it, and createListing has one caller', () => {
  const files = ['src/screens/Post.jsx', 'src/screens/Signup.jsx', 'src/screens/ListingDetail.jsx', 'src/screens/Browse.jsx', 'src/screens/admin/registry.js', 'src/screens/admin/tabs/PeopleTab.jsx']
  const users = files.filter((f) => /<MitraField/.test(src(f)))
  assert.deepEqual(users, ['src/screens/Post.jsx'])
  const callers = files.filter((f) => /createListing\(/.test(src(f)))
  assert.deepEqual(callers, ['src/screens/Post.jsx'])
})

// ---------- admin ----------
test('announcement form: an optional Mitra dropdown with None first, all Mitras, a read-only note when paid, saved by a second call', () => {
  const s = src('src/screens/admin/tabs/AnnouncementsPanel.jsx')
  assert.match(s, /<option value="">\{t\('mitra_none'\)\}<\/option>\s*\{mitras\.map/)
  assert.match(s, /adminListMitras\(actorId\)/)
  assert.ok(!/is_active\)\.map|filter\(\(m\) => m\.is_active/.test(s), 'inactive Mitras are listed too')
  assert.match(s, /ann-mitra-readonly/)
  assert.match(s, /mitra_ad_paid_note/)
  assert.match(s, /mitra_ad_field_hint/)
  assert.match(s, /adminSetAnnouncementMitra\(actorId, newId, want \|\| null\)/)
  // the announcement is saved first; a failed second call keeps the form open with a plain error and remembers the saved id
  assert.ok(s.indexOf('adminUpsertAnnouncement(actorId, id, data)') < s.indexOf('adminSetAnnouncementMitra('))
  assert.match(s, /savedId/)
  assert.match(s, /mitra_ad_save_failed/)
  assert.match(s, /ann-mitra-chip/)
})

test('announcement save keeps the public side untouched: no change to what the public sees or to listings', () => {
  const sql = src('supabase/migrations/0076_mitra_at_offer.sql').replace(/--.*$/gm, '')
  assert.ok(!/is_sponsored/.test(sql))
  assert.ok(!/update public\.listings/i.test(sql))
  const panel = src('src/screens/admin/tabs/AnnouncementsPanel.jsx')
  const payload = panel.slice(panel.indexOf('export function formToPayload'), panel.indexOf('function Counter'))
  assert.ok(!/mitra/i.test(payload), 'the Mitra is not part of the announcement payload')
})

test('Mitra panel: people (with the not-counted-yet marker and offers_count) and ads lists; phones stay masked; CSV unchanged', () => {
  const s = src('src/screens/admin/tabs/MitraPanel.jsx')
  assert.match(s, /adminListMitraAds\(actorId, mitra\.id\)/)
  assert.match(s, /r\.not_counted_yet/)
  assert.match(s, /r\.offers_count/)
  assert.match(s, /r\.masked_phone/)
  assert.ok(!/\.phone\b/.test(s))
  assert.match(s, /mitra_pay_once_note/)
  assert.ok(!/approve|reject|pending|waiting/i.test(s))
})

test('database error codes used by the ad call become messages', () => {
  assert.equal(toAppError({ message: 'already_paid' }).i18nKey, 'err_mitra_already_paid')
  assert.equal(toAppError({ message: 'session_required' }).i18nKey, 'err_admin_session')
})
