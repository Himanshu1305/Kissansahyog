// Batch 20 - a fake backend for the browser checks. NO network, NO real database: every Supabase REST call and every /api/otp call
// of the built app is answered here, and the Kissan Mitra answers are produced by the reference model
// (scripts/batch20/mitra-model.mjs), so the screens are exercised against the same rules as the SQL.
import {
  countsFor, setMyMitra, setMyMitraOnOffer, choiceOpen, setAnnouncementMitra, reassign, markPaid, sameNameVillage, maskPhone, kindOf, firstOfferAt, offersCount, notCountedYet, unattributedTotal, statementFor,
} from '../../scripts/batch20/mitra-model.mjs'

export const SUPABASE = 'https://mock.supabase.test'
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-max-age': '600' }
const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) })

// Test people only: names start with "TEST", phones are made-up placeholders in the reserved 90000xxxxx range.
export function seedState() {
  const ago = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()
  const P = (id, name, village, h, o = {}) => ({ id: `p${id}`, full_name: name, village_town: village, phone: `90000${String(10000 + id).slice(1)}`, created_at: ago(h), is_blocked: false, mitra_id: null, mitra_paid_id: null, ...o })
  return {
    mitras: [
      { id: 'm-asha', display_name: 'Asha Devi', area: 'Khurai', private_phone: '9000099001', rate_farmer_rupees: 1, rate_business_rupees: 5, is_active: true, created_at: ago(500) },
      { id: 'm-bholu', display_name: 'Bholu Ram', area: 'Bina', private_phone: null, rate_farmer_rupees: null, rate_business_rupees: null, is_active: true, created_at: ago(400) },
      { id: 'm-old', display_name: 'Purana Mitra', area: null, private_phone: null, rate_farmer_rupees: 1, rate_business_rupees: null, is_active: false, created_at: ago(300) },
    ],
    profiles: [
      P(1, 'TEST Ram Lal', 'Khurai', 2, { mitra_id: 'm-asha' }),
      P(2, 'TEST Ram Lal', 'Khurai', 30, { mitra_id: 'm-asha' }),
      P(3, 'TEST Sita Bai', 'Rahatgarh', 50, { mitra_id: 'm-asha' }),
      P(4, 'TEST Mohan', 'Bina', 80, { mitra_id: 'm-asha', mitra_paid_id: 'pay-seed' }),
      P(5, 'TEST Geeta', 'Bina', 3, { mitra_id: 'm-bholu' }),
      P(6, 'TEST Kishan', 'Sagar', 400, { mitra_id: 'm-bholu', is_blocked: true }),
      P(7, 'TEST Plain', 'Sagar', 5),
      P(8, 'TEST Not Yet', 'Sagar', 10, { mitra_id: 'm-old' }), // attributed at registration (Batch 20) but has never offered: not counted yet
      P(9, 'TEST Newcomer', 'Sagar', 1), // a registered farmer with no Mitra and no offer (sees the dropdown)
    ],
    // Batch 22: a farmer counts after offering a service. Every seeded person with a Mitra (and TEST Plain) offered at registration time.
    listings: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `l-seed-${n}`, user_id: `p${n}`, listing_type: 'offer', status: 'active', admin_disabled_at: null, category: ['equipment', 'labor', 'drone_didi', 'bhusa', 'warehouse', 'transport', 'land'][n - 1], created_at: ago([2, 30, 50, 80, 3, 400, 5][n - 1]) })),
    announcements: [
      { id: 'ad-1', title_hi: 'TEST ad one', title_en: 'TEST ad one', mitra_id: 'm-asha', mitra_paid_id: null, created_at: ago(20), start_at: ago(20), end_at: ago(-200), is_active: true, style: 'info', priority: 0, dismissible: true },
      { id: 'ad-2', title_hi: 'TEST festival card', title_en: 'TEST festival card', mitra_id: null, mitra_paid_id: null, created_at: ago(40), start_at: ago(40), end_at: ago(-200), is_active: true, style: 'festival', priority: 0, dismissible: true },
      { id: 'ad-3', title_hi: 'TEST paid ad', title_en: 'TEST paid ad', mitra_id: 'm-asha', mitra_paid_id: 'pay-seed', created_at: ago(90), start_at: ago(90), end_at: ago(-200), is_active: true, style: 'info', priority: 0, dismissible: true },
    ],
    payments: [{ id: 'pay-seed', mitra_id: 'm-asha', amount_rupees: 1, paid_on: '2026-11-01', note: 'UPI', farmer_count: 1, business_count: 0, created_at: ago(100) }],
  }
}

export async function installMock(page, { mitras, otp = false, listStatus = 200, setMitraStatus = 200, admin = false, state = seedState(), choiceStatus = 200, user = null, annMitraStatus = 200, statementStatus = 200 } = {}) {
  const calls = []
  const b = { state, calls, nextId: 100, listCalls: 0 }
  if (mitras) b.state = { ...b.state, mitras }
  b.choiceCalls = 0
  const profileOf = (p) => ({ id: p.id, full_name: p.full_name, phone: p.phone, village_town: p.village_town, preferred_language: 'hi', is_admin: false, email: null, auth_provider: 'phone', mitra_id: p.mitra_id })

  await page.route(/\/api\/otp\//, async (route) => {
    const url = route.request().url()
    if (url.endsWith('/config')) return json(route, { otp_required: otp, session_enforced: false })
    if (url.endsWith('/send')) return json(route, { ok: true, challenge: 'ch-1', resendAfter: 30 })
    if (url.endsWith('/verify')) return json(route, { ok: true, ticket: 'ticket-1' })
    return json(route, { ok: false }, 404)
  })

  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const m = req.url().match(/\/rest\/v1\/rpc\/([a-z_0-9]+)/)
    if (!m) return json(route, [])
    const name = m[1]
    const args = req.postDataJSON() || {}
    calls.push({ name, args })
    const s = b.state
    switch (name) {
      case 'list_active_mitras':
        b.listCalls++
        if (listStatus !== 200) return json(route, { message: 'boom' }, listStatus)
        return json(route, s.mitras.filter((x) => x.is_active).sort((a, c) => a.display_name.localeCompare(c.display_name)).map(({ id, display_name, area }) => ({ id, display_name, area })))
      case 'get_auth_flags': return json(route, { otp_required: otp, session_enforced: false })
      case 'app_register_phone': {
        const p = { id: `p${b.nextId++}`, full_name: args.p_full_name, village_town: args.p_village_town, phone: args.p_phone, created_at: new Date().toISOString(), is_blocked: false, mitra_id: null, mitra_paid_id: null }
        b.state = { ...b.state, profiles: [...b.state.profiles, p] }
        return json(route, profileOf(p))
      }
      case 'app_register_phone_otp': {
        const p = { id: `p${b.nextId++}`, full_name: args.p_full_name, village_town: args.p_village_town, phone: args.p_phone, created_at: new Date().toISOString(), is_blocked: false, mitra_id: null, mitra_paid_id: null }
        b.state = { ...b.state, profiles: [...b.state.profiles, p] }
        return json(route, { profile: profileOf(p), session_token: 'tok-1' })
      }
      case 'set_my_mitra': {
        if (setMitraStatus !== 200) return json(route, { message: 'server error' }, setMitraStatus)
        const r = setMyMitra(b.state, args.p_actor_id, args.p_mitra_id)
        b.state = r.state
        return json(route, { status: r.status })
      }
      case 'admin_whoami': return json(route, { role: 'super', is_super: true })
      case 'admin_list_mitras': {
        const rows = b.state.mitras.map((x) => ({
          ...x, ...countsFor(b.state, x.id),
          paid_total_registrations: countsFor(b.state, x.id).paid_total_registrations,
          payments_total_rupees: b.state.payments.filter((p) => p.mitra_id === x.id).reduce((a, p) => a + p.amount_rupees, 0),
        }))
        rows.sort((a, c) => Number(c.is_active) - Number(a.is_active) || a.display_name.localeCompare(c.display_name))
        return json(route, { mitras: rows, unattributed_total: unattributedTotal(b.state) })
      }
      case 'admin_upsert_mitra': {
        const d = args.p_data
        const name = String(d.display_name || '').trim()
        const area = String(d.area || '').trim()
        if (b.state.mitras.some((x) => x.id !== args.p_id && x.display_name.toLowerCase() === name.toLowerCase() && String(x.area || '').toLowerCase() === area.toLowerCase())) return json(route, { message: 'mitra_duplicate' }, 400)
        const row = { display_name: name, area: area || null, private_phone: d.private_phone || null, rate_farmer_rupees: d.rate_farmer_rupees === '' ? null : Number(d.rate_farmer_rupees), rate_business_rupees: d.rate_business_rupees === '' ? null : Number(d.rate_business_rupees), is_active: !!d.is_active }
        if (args.p_id) b.state = { ...b.state, mitras: b.state.mitras.map((x) => (x.id === args.p_id ? { ...x, ...row } : x)) }
        else b.state = { ...b.state, mitras: [...b.state.mitras, { id: `m-new-${b.nextId++}`, created_at: new Date().toISOString(), ...row }] }
        return json(route, row)
      }
      case 'admin_list_mitra_registrations': {
        const all = b.state.profiles.filter((p) => p.mitra_id === args.p_mitra_id).sort((a, c) => Date.parse(c.created_at) - Date.parse(a.created_at))
        const rows = all.slice(args.p_offset, args.p_offset + args.p_limit).map((p) => ({
          id: p.id, full_name: p.full_name, village_town: p.village_town, kind: kindOf(p), masked_phone: maskPhone(p.phone), registered_at: p.created_at,
          paid: p.mitra_paid_id != null, blocked: p.is_blocked, same_name_village: sameNameVillage(b.state, p),
          first_offer_at: firstOfferAt(b.state, p) == null ? null : new Date(firstOfferAt(b.state, p)).toISOString(), offers_count: offersCount(b.state, p), not_counted_yet: notCountedYet(b.state, p),
        }))
        return json(route, { total: all.length, rows })
      }
      case 'admin_reassign_registration': {
        try { b.state = reassign(b.state, args.p_profile_id, args.p_new_mitra_id); return json(route, { ok: true }) } catch (e) { return json(route, { message: e.message }, 400) }
      }
      case 'admin_mark_mitra_paid': {
        try { b.state = markPaid(b.state, args.p_mitra_id, args.p_amount_rupees, args.p_paid_on, args.p_note); return json(route, { ok: true }) } catch (e) { return json(route, { message: e.message }, 400) }
      }
      case 'my_mitra_choice_open':
        b.choiceCalls++
        if (choiceStatus !== 200) return json(route, { message: 'boom' }, choiceStatus)
        return json(route, choiceOpen(b.state, args.p_actor_id))
      case 'create_listing_with_location': {
        const l = { id: `l-new-${b.nextId++}`, user_id: args.p_actor_id, listing_type: args.p_listing_type, status: 'active', admin_disabled_at: null, created_at: new Date().toISOString() }
        b.state = { ...b.state, listings: [...b.state.listings, l] }
        return json(route, { id: l.id, geocoding_status: 'done', wide_visibility: false })
      }
      case 'accept_listing_consents': return json(route, true)
      case 'set_my_mitra_on_offer': {
        if (setMitraStatus !== 200) return json(route, { message: 'server error' }, setMitraStatus)
        const r = setMyMitraOnOffer(b.state, args.p_actor_id, args.p_mitra_id, args.p_listing_id)
        b.state = r.state
        return json(route, { status: r.status })
      }
      case 'admin_list_announcements': return json(route, b.state.announcements.map((a) => ({ ...a })))
      case 'admin_get_announcement_mitras':
        return json(route, Object.fromEntries(b.state.announcements.filter((a) => a.mitra_id).map((a) => [a.id, { mitra_id: a.mitra_id, paid: a.mitra_paid_id != null }])))
      case 'admin_upsert_announcement': {
        const id = args.p_id || `ad-new-${b.nextId++}`
        const row = { ...(b.state.announcements.find((a) => a.id === id) || { mitra_id: null, mitra_paid_id: null, created_at: new Date().toISOString() }), ...args.p_data, id }
        b.state = { ...b.state, announcements: args.p_id ? b.state.announcements.map((a) => (a.id === id ? row : a)) : [...b.state.announcements, row] }
        return json(route, row)
      }
      case 'admin_set_announcement_mitra': {
        if (annMitraStatus !== 200) return json(route, { message: 'boom' }, annMitraStatus)
        try { b.state = setAnnouncementMitra(b.state, args.p_announcement_id, args.p_mitra_id); return json(route, { ok: true }) } catch (e) { return json(route, { message: e.message }, 400) }
      }
      case 'admin_list_mitra_ads':
        return json(route, b.state.announcements.filter((a) => a.mitra_id === args.p_mitra_id).map((a) => ({ id: a.id, title_hi: a.title_hi, created_at: a.created_at, paid: a.mitra_paid_id != null })))
      case 'admin_mitra_statement': {
        b.statementCalls = (b.statementCalls || 0) + 1
        if (statementStatus !== 200) return json(route, { message: 'boom' }, statementStatus)
        try { return json(route, statementFor(b.state, args.p_mitra_id, { limit: args.p_limit, offset: args.p_offset })) } catch (e) { return json(route, { message: e.message }, 400) }
      }
      case 'admin_list_mitra_payments':
        return json(route, b.state.payments.filter((p) => p.mitra_id === args.p_mitra_id).map((p) => ({ ...p, created_at: p.created_at || new Date().toISOString() })).reverse())
      default: return json(route, [])
    }
  })

  if (user) {
    await page.addInitScript((u) => {
      localStorage.setItem('ks_session_v1', JSON.stringify({ full_name: 'TEST Farmer', is_admin: false, phone: '9000000000', village_town: 'Sagar', preferred_language: 'hi', ...u }))
    }, user)
  }
  if (admin) {
    await page.addInitScript(() => {
      localStorage.setItem('ks_session_v1', JSON.stringify({ id: 'admin-1', full_name: 'TEST Admin', is_admin: true, admin_role: 'super', phone: '9000000000', preferred_language: 'hi' }))
      localStorage.setItem('ks_session_token_v1', 'tok-admin')
    })
  }
  return b
}
