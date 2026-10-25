#!/usr/bin/env node
// Batch 9C — static gate for the equipment spec fields (no browser, no database writes).
//   node scripts/check-equipment-specs.mjs                 # catalog + migration + messages + i18n
//   node --env-file=.env scripts/check-equipment-specs.mjs --db   # + type names exist on STAGING (read-only)
//   ... --results <a.json,b.json>                           # fill the "tested" column from test results
// Writes docs/review/batch9/evidence/fix9c/COVERAGE_MATRIX.md (one row per type x mandatory field).
// The founder's table (BATCH9C prompt, Phase 1) is written out below on purpose: the catalog is checked
// against it, so a later edit of the catalog that breaks a founder rule fails here.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EQUIPMENT_SPECS, EQUIPMENT_NO_SPEC_TYPES, OUTPUT_UNITS, TRACTOR_BRANDS, SPEC_FIELDS,
  equipmentSpecFor, equipmentSpecFields, checkEquipmentSpec, equipmentSpecMessage, equipmentServerRules, specYearMax,
} from '../src/lib/listings/catalog.js'

const FOUNDER = {
  'Tractor': { extra: [], hp: true, unit: 'acre_hour', dropdown: true },
  'Pit Digging Tractor': { extra: ['spec_auger_size'], hp: true, unit: 'pits_hour', dropdown: true },
  'Crane Tractor': { extra: ['spec_lifting_capacity'], hp: true, unit: 'other', dropdown: true },
  'Thresher': { extra: ['spec_crop'], hp: true, unit: 'quintal_hour' },
  'Harvester': { extra: ['spec_cutting_width', 'spec_crop'], hp: true, unit: 'acre_hour' },
  'Rotavator': { extra: ['spec_working_width'], hp: true, unit: 'acre_hour' },
  'Seed Drill': { extra: ['spec_rows'], hp: true, unit: 'acre_hour', numeric: ['spec_rows'] },
  'Reaper': { extra: ['spec_working_width'], hp: true, unit: 'acre_hour' },
  'Paddy Planting Machine': { extra: ['spec_rows'], hp: true, unit: 'acre_hour', numeric: ['spec_rows'] },
  'Blower': { extra: [], hp: true, unit: 'quintal_hour' },
  'LCB (Straw Machine)': { extra: [], hp: true, unit: 'quintal_hour' },
  'JCB / Excavator': { extra: ['spec_bucket_size'], hp: true, unit: 'cum_hour' },
  'Drone': { extra: ['spec_tank_litres', 'spec_flight_minutes'], hp: false, unit: 'acre_hour', numeric: ['spec_tank_litres', 'spec_flight_minutes'] },
  'Other': { extra: ['spec_machine_name'], hp: true, hpZero: true, unit: 'other' },
}
const ALL_DB_TYPES = [...Object.keys(FOUNDER), 'Trolley', 'Water tanker']

const fails = []
let passes = 0
const ok = (cond, msg) => { if (cond) passes++; else fails.push(msg) }
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }

// A valid offer for a type (the same values the browser tests use).
export function validOffer(name) {
  const d = {}
  for (const f of equipmentSpecFields(name)) {
    d[f.key] = f.dropdown ? 'Swaraj' : f.kind === 'year' ? '2022' : f.kind === 'int' ? '9' : ['gt', 'ge'].includes(f.kind) ? (f.key === 'power_hp' ? '45' : '12') : `KSTEST ${f.key}`
  }
  return d
}

// ---- 1. catalog against the founder's table ----
ok(Object.keys(EQUIPMENT_SPECS).length === 14, `catalog has ${Object.keys(EQUIPMENT_SPECS).length} spec types, expected 14`)
for (const [name, want] of Object.entries(FOUNDER)) {
  const spec = equipmentSpecFor(name)
  ok(!!spec, `${name}: missing from EQUIPMENT_SPECS`)
  if (!spec) continue
  const keys = equipmentSpecFields(name).map((f) => f.key)
  const expected = ['brand', 'model', 'year', ...(want.hp ? ['power_hp'] : []), ...want.extra]
  ok(JSON.stringify(keys) === JSON.stringify(expected), `${name}: fields ${keys.join(',')} != founder ${expected.join(',')}`)
  ok(spec.unit === want.unit, `${name}: default unit ${spec.unit} != ${want.unit}`)
  ok(OUTPUT_UNITS.some((u) => u.value === spec.unit), `${name}: default unit ${spec.unit} not in OUTPUT_UNITS`)
  ok(!!spec.brandDropdown === !!want.dropdown, `${name}: brand dropdown ${!!spec.brandDropdown}, expected ${!!want.dropdown}`)
  ok((name === 'Drone') === !keys.includes('power_hp'), `${name}: HP field presence wrong`)
  const hp = equipmentSpecFields(name).find((f) => f.key === 'power_hp')
  if (hp) ok(hp.kind === (want.hpZero ? 'ge' : 'gt') && hp.lo === 0 && hp.hi === 500, `${name}: HP range wrong (${hp.kind} ${hp.lo}..${hp.hi})`)
  if (want.hpZero) ok(hp?.hint?.hi && hp?.hint?.en, `${name}: missing the "0 if it has no engine" hint`)
  for (const k of want.numeric || []) ok(equipmentSpecFields(name).find((f) => f.key === k)?.kind !== 'text', `${name}: ${k} must be a number field`)
  for (const f of equipmentSpecFields(name)) {
    ok(typeof f.label?.hi === 'string' && /[ऀ-ॿ]/.test(f.label.hi), `${name}.${f.key}: Hindi label missing`)
    ok(typeof f.label?.en === 'string' && /[A-Za-z]/.test(f.label.en), `${name}.${f.key}: English label missing`)
  }
}
for (const name of EQUIPMENT_NO_SPEC_TYPES) {
  ok(equipmentSpecFor(name) === null && equipmentSpecFields(name).length === 0, `${name}: must have no spec fields`)
}
ok(JSON.stringify(EQUIPMENT_NO_SPEC_TYPES) === JSON.stringify(['Trolley', 'Water tanker']), 'no-spec types must be Trolley and Water tanker')
for (const [k, f] of Object.entries(SPEC_FIELDS)) ok(f.label?.hi && f.label?.en, `SPEC_FIELDS.${k}: label missing`)
for (const list of [TRACTOR_BRANDS, OUTPUT_UNITS]) for (const o of list) ok(o.hi && o.en && o.value, `option ${o.value}: label missing`)
ok(TRACTOR_BRANDS.at(-1).value === 'other' && TRACTOR_BRANDS.length === 13, 'tractor brands: 12 brands + other')
ok(['acre_hour', 'quintal_hour', 'pits_hour', 'cum_hour', 'other'].every((u) => OUTPUT_UNITS.some((x) => x.value === u)), 'output units incomplete')

// ---- 2. rule checks (the same function the form uses) ----
const NOW = new Date()
for (const name of Object.keys(FOUNDER)) {
  const good = validOffer(name)
  ok(checkEquipmentSpec(good, name, 'offer', NOW) === null, `${name}: a valid offer is refused`)
  ok(checkEquipmentSpec({ ...good, output_per_hour: '' }, name, 'offer', NOW) === null, `${name}: empty output blocks the post`)
  ok(checkEquipmentSpec({ ...good, output_per_hour: '1.5', output_unit: 'acre_hour' }, name, 'offer', NOW) === null, `${name}: valid output refused`)
  ok(checkEquipmentSpec({}, name, 'requirement', NOW) === null, `${name}: requirement forced something`)
  for (const f of equipmentSpecFields(name)) {
    const r = checkEquipmentSpec({ ...good, [f.key]: '' }, name, 'offer', NOW)
    ok(r?.field === f.key && r?.reason === 'required', `${name}: empty ${f.key} not blocked (${JSON.stringify(r)})`)
    const msg = equipmentSpecMessage({ field: f.key, reason: 'required' }, name, 'hi', NOW)
    ok(msg.includes(f.label.hi), `${name}: message for ${f.key} does not name the field: ${msg}`)
    ok(equipmentSpecMessage({ field: f.key, reason: 'required' }, name, 'en', NOW).includes(f.label.en.toLowerCase()) || equipmentSpecMessage({ field: f.key, reason: 'required' }, name, 'en', NOW).includes(f.label.en), `${name}: English message for ${f.key} does not name the field`)
  }
  for (const y of ['1985', '3000', 'abc', String(specYearMax(NOW) + 1), '1989']) ok(checkEquipmentSpec({ ...good, year: y }, name, 'offer', NOW)?.field === 'year', `${name}: year ${y} not blocked`)
  for (const y of ['1990', String(specYearMax(NOW)), '२०२२']) ok(checkEquipmentSpec({ ...good, year: y }, name, 'offer', NOW) === null, `${name}: year ${y} wrongly blocked`)
  if (FOUNDER[name].hp) {
    for (const h of ['600', '4O', 'abc', '-5', '500.5']) ok(checkEquipmentSpec({ ...good, power_hp: h }, name, 'offer', NOW)?.field === 'power_hp', `${name}: HP ${h} not blocked`)
    ok((checkEquipmentSpec({ ...good, power_hp: '0' }, name, 'offer', NOW) === null) === !!FOUNDER[name].hpZero, `${name}: HP 0 handling wrong`)
    ok(checkEquipmentSpec({ ...good, power_hp: '500' }, name, 'offer', NOW) === null, `${name}: HP 500 wrongly blocked`)
    ok(checkEquipmentSpec({ min_hp: '40' }, name, 'requirement', NOW) === null && checkEquipmentSpec({ min_hp: '600' }, name, 'requirement', NOW)?.field === 'min_hp', `${name}: min HP check wrong`)
  }
  if (FOUNDER[name].dropdown) {
    ok(checkEquipmentSpec({ ...good, brand: 'other' }, name, 'offer', NOW)?.field === 'brand_other', `${name}: "Other brand" without text not blocked`)
    ok(checkEquipmentSpec({ ...good, brand: 'other', brand_other: 'KSTEST brand' }, name, 'offer', NOW) === null, `${name}: "Other brand" with text refused`)
  }
}
ok(checkEquipmentSpec({}, 'Trolley', 'offer', NOW) === null && checkEquipmentSpec({}, 'Water tanker', 'offer', NOW) === null, 'Trolley / tanker must not be checked')

// ---- 3. server migration carries exactly the catalog's rules ----
const MIG = resolve('supabase/migrations/0063_equipment_specs.sql')
const RB = resolve('supabase/migrations/rollback/0063_equipment_specs_rollback.sql')
const mig = existsSync(MIG) ? readFileSync(MIG, 'utf8') : ''
ok(!!mig, '0063 migration missing')
ok(existsSync(RB) && /create or replace function public\.create_listing_with_location/i.test(readFileSync(RB, 'utf8')), '0063 rollback missing or does not restore the function')
const m = mig.match(/v_rules\s+constant jsonb := '(.+?)'::jsonb;/)
let serverRules = null
try { serverRules = m ? JSON.parse(m[1]) : null } catch { serverRules = null }
ok(!!serverRules, '0063: rules JSON not found')
ok(serverRules && JSON.stringify(serverRules) === JSON.stringify(equipmentServerRules()), '0063: rules JSON differs from catalog equipmentServerRules()')
for (const keep of ['p_client_request_id', 'contact_consent_at', 'listing_private_contact', 'unique_violation']) ok(mig.includes(keep), `0063 dropped a Batch 9B part: ${keep}`)
ok(/spec_version', ''\) = '1'/.test(mig), "0063: check is not limited to spec_version = 1")
for (const f of ['scripts/ship-prod-9.sh', 'scripts/rollback-prod-9.sh']) ok(readFileSync(f, 'utf8').includes('0063_equipment_specs_rollback.sql'), `${f}: 0063 rollback not listed`)
ok(readFileSync('scripts/ship-prod-9.sh', 'utf8').includes('supabase/migrations/0063_equipment_specs.sql'), 'ship-prod-9.sh: 0063 not listed')

// ---- 4. i18n keys used by the equipment form exist in both languages ----
const strings = readFileSync('src/lib/i18n/strings.js', 'utf8')
const src = readFileSync('src/components/categories/equipment.jsx', 'utf8')
for (const key of new Set([...src.matchAll(/\bt\('([a-z0-9_]+)'\)/g)].map((x) => x[1]))) {
  const entry = strings.match(new RegExp(`\\n\\s*${key}: \\{([\\s\\S]*?)\\}`))
  ok(entry && /hi: ['"`]/.test(entry[1]) && /en: ['"`]/.test(entry[1]), `i18n key ${key}: missing hi/en`)
}
ok(/equipment_spec_invalid/.test(readFileSync('src/lib/errors.js', 'utf8')), 'errors.js does not map equipment_spec_invalid')

// ---- 5. (optional) type names exist on staging, read-only ----
if (process.argv.includes('--db')) {
  const { stagingSql } = await import('./fix9b/stagingSql.mjs')
  const rows = await stagingSql('select name_en from public.equipment_types')
  const names = rows.map((r) => r.name_en)
  for (const n of ALL_DB_TYPES) ok(names.includes(n), `staging equipment_types has no "${n}"`)
  for (const n of names) ok(ALL_DB_TYPES.includes(n), `staging has an equipment type the plan does not know: "${n}" (it gets no spec fields)`)
}

// ---- coverage matrix ----
const results = (arg('--results') || '').split(',').filter(Boolean).flatMap((f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []))
const statusOf = (id) => { const r = results.filter((x) => x.id === id); if (!r.length) return null; return r.at(-1).status }
const rules = equipmentServerRules()
const rows = []
let total = 0; let full = 0; const notFull = []
for (const name of Object.keys(FOUNDER)) {
  const fields = equipmentSpecFields(name)
  const list = [...fields.map((f) => ({ key: f.key, label: f.label, cond: false })), ...(FOUNDER[name].dropdown ? [{ key: 'brand_other', label: SPEC_FIELDS.brand_other.label, cond: true }] : [])]
  for (const f of list) {
    const exists = f.cond ? true : fields.some((x) => x.key === f.key)
    const form = f.cond ? checkEquipmentSpec({ ...validOffer(name), brand: 'other' }, name, 'offer', NOW)?.field === 'brand_other' : checkEquipmentSpec({ ...validOffer(name), [f.key]: '' }, name, 'offer', NOW)?.field === f.key
    const server = f.cond ? rules[name].brand === 'brand' && /brand_other:required/.test(mig) : !!rules[name][f.key]
    const slug = `${name}|${f.key}`
    const c1 = statusOf(`C1|${slug}`); const c11 = statusOf(`C11|${slug}`); const c5 = f.cond ? statusOf(`C5|${name}`) : null
    const parts = f.cond ? [c5] : [c1, c11]
    const tested = parts.every((s) => s === 'RAN-PASSED') ? 'pass' : parts.some((s) => s === 'RAN-FAILED') ? 'fail' : 'not run'
    const detail = f.cond ? `C5 ${c5 || 'not run'}` : `form C1 ${c1 || 'not run'} · server C11 ${c11 || 'not run'}`
    rows.push(`| ${name} | ${f.key}${f.cond ? ' (when brand = Other)' : ''} | ${f.label.hi} / ${f.label.en} | ${exists ? 'yes' : 'NO'} | ${form ? 'yes' : 'NO'} | ${server ? 'yes' : 'NO'} | ${tested} (${detail}) |`)
    if (!f.cond) { total++; if (exists && form && server && tested === 'pass') full++; else notFull.push(`${name}: ${f.key}`) }
  }
}
const EVD = resolve('docs/review/batch9/evidence/fix9c'); mkdirSync(EVD, { recursive: true })
writeFileSync(resolve(EVD, 'COVERAGE_MATRIX.md'), [
  '# Batch 9C — coverage matrix (generated by scripts/check-equipment-specs.mjs)',
  '',
  `Generated ${new Date().toISOString()}. One row per (type x mandatory field), plus the conditional "brand name" row of the 3 tractor types.`,
  '"enforced on server" = the field is in the rules JSON of migration 0063 (checked equal to the catalog). "tested" = the browser',
  'form case (C1: blocked when empty, posts when filled) AND the direct-API case (C11: refused when missing) both RAN-PASSED.',
  '',
  `**${full} of ${total} mandatory fields: created, enforced in the form, enforced on the server, tested and passing.**${notFull.length ? ` Not complete: ${notFull.join('; ')}.` : ''}`,
  '',
  '| Type | Field | Label (hi / en) | field exists | mandatory in form | enforced on server | tested |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
  'Not in the matrix (no spec fields by design): Trolley, Water tanker. Output per hour: optional for every type (C3b).',
  '',
].join('\n'))

console.log(`check-equipment-specs: ${passes} checks passed, ${fails.length} failed; matrix ${full}/${total} complete`)
for (const f of fails) console.log(`FAIL  ${f}`)
process.exitCode = fails.length ? 1 : 0
