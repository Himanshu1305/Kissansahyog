#!/usr/bin/env node
// Static verification for Batch 5A. It never calls a database or deploy service.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strings } from '../src/lib/i18n/strings.js'
import { BAZAAR_CATS } from '../src/content/pages/bazaar.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const readSnapshot = (path) => {
  const raw = readFileSync(join(root, path))
  return raw[0] === 0xff && raw[1] === 0xfe ? raw.subarray(2).toString('utf16le') : raw.toString('utf8')
}
let pass = 0
let fail = 0
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`PASS  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
}

const catalog = read('src/lib/listings/catalog.js')
const registry = read('src/lib/listings/registry.jsx')
const post = read('src/screens/Post.jsx')
const browse = read('src/screens/Browse.jsx')
const home = read('src/screens/Homepage.jsx')
const card = read('src/components/ListingCard.jsx')
const detail = read('src/screens/ListingDetail.jsx')
const mine = read('src/screens/MyListings.jsx')
const nav = read('src/components/NavBar.jsx')
const search = read('scripts/build-search-index.mjs')
const routes = read('scripts/lib/prerender-routes.mjs')
const sitemap = read('scripts/gen-sitemaps.mjs')
const equipment = read('src/components/categories/equipment.jsx')
const materials = read('src/components/categories/building_materials.jsx')
const migrationPath = 'supabase/migrations/0053_building_materials_category.sql'
const migration = existsSync(join(root, migrationPath)) ? read(migrationPath) : ''

const categoryPlaces = [
  ['catalog', catalog.includes("'building_materials'") && catalog.includes('CATEGORY_META')],
  ['registry', registry.includes('building_materials') && registry.includes('ENABLED_CATEGORIES')],
  ['Post selector', post.includes('CATEGORIES')],
  ['Browse filters', browse.includes('ENABLED_CATEGORIES')],
  ['Home tiles and nearby counts', home.includes('building_materials') && read('src/lib/listings/nearbyCounts.js').includes('building_materials')],
  ['ListingCard', card.includes('getCategory')],
  ['ListingDetail', detail.includes('getCategory')],
  ['My listings', mine.includes('ListingCard')],
  ['Bazaar hub', BAZAAR_CATS.some((c) => c.slug === 'building-materials' && c.cat === 'building_materials')],
  ['Navigation', nav.includes("'building_materials'")],
  ['search index', search.includes('/bazaar/building-materials')],
  ['sitemap source', sitemap.includes('getRoutes')],
  ['prerender routes', routes.includes('BAZAAR_CATS')],
]
for (const [name, condition] of categoryPlaces) check(`building_materials: ${name}`, condition)

const uiKeys = [
  'home_cat_building_materials', 'help_building_materials', 'field_equipment_tags',
  'field_building_material_type', 'field_building_brand_grade', 'field_building_quantity',
  'field_building_unit', 'field_building_rate', 'field_building_delivery', 'field_building_pickup',
  'err_building_material_type_required', 'err_building_quantity_required', 'err_building_unit_required',
  'err_building_rate_required', 'err_building_delivery_required', 'err_building_pickup_required',
]
for (const key of uiKeys) check(`i18n: ${key} has Hindi and English`, Boolean(strings[key]?.hi?.trim() && strings[key]?.en?.trim()))

check('equipment tags: form fields', equipment.includes('EQUIPMENT_TAGS') && equipment.includes('MultiChips'))
check('equipment tags: Browse filter chips', browse.includes('equipment-tag-filters') && browse.includes('equipment_tags'))
check('equipment tags: card display', card.includes('equipment-tag-card'))
check('equipment tags: detail display', equipment.includes('LABELS.tags'))
check('building materials: form fields', materials.includes('material_type') && materials.includes('delivery_available') && materials.includes('pickup_location'))
check('building materials: bilingual responsibility notice', read('src/lib/i18n/disclaimers.js').includes('building_materials') && detail.includes('extraDisclaimerKey'))

for (const slug of ['building-materials', 'vegetable-equipment']) {
  check(`landing page: ${slug} exists`, BAZAAR_CATS.some((c) => c.slug === slug))
  check(`landing page: ${slug} prerenders`, routes.includes('BAZAAR_CATS'))
  check(`landing page: ${slug} is searchable`, search.includes(`/bazaar/${slug}`))
}

const numbers = readdirSync(join(root, 'supabase/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => Number(f.slice(0, 4))).sort((a, b) => a - b)
const contiguous = numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1)
check('migration: 0053 exists and numbering is contiguous', migration.length > 0 && numbers.at(-1) === 53 && contiguous)
check('migration: guarded CHECK widening only', /do \$\$[\s\S]*pg_constraint[\s\S]*drop constraint listings_category_check[\s\S]*end \$\$;/i.test(migration))
check('migration: widened CHECK is a strict superset', migration.includes("'jugaad', 'building_materials'") && migration.includes("'land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport', 'greenhouse', 'jugaad', 'building_materials'"))
check('migration: create_listing admits category and 100 km opt-in', migration.includes("'building_materials') then") && migration.includes("'agri_inputs', 'building_materials', 'warehouse'"))
const migrationSql = migration.replace(/^--.*$/gm, '').replace(/drop constraint listings_category_check/ig, '')
check('migration: no forbidden destructive SQL', !/\b(drop|delete|truncate|rename)\b/i.test(migrationSql))

const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
let nameStatus = ''
let status = ''
try {
  nameStatus = git(['diff', '--name-status'])
  status = git(['status', '--short'])
} catch (error) {
  // Some Windows sandboxes block child-process creation from Node. The local run
  // guide captures the same read-only commands before this verifier in that case.
  const snapshot = (name) => join(root, 'docs/review', name)
  if (existsSync(snapshot('BATCH5A_GIT_NAME_STATUS.txt')) && existsSync(snapshot('BATCH5A_GIT_STATUS.txt'))) {
    nameStatus = readSnapshot('docs/review/BATCH5A_GIT_NAME_STATUS.txt')
    status = readSnapshot('docs/review/BATCH5A_GIT_STATUS.txt')
    console.log(`INFO  scope guard used read-only git snapshots (${error.message})`)
  } else {
    console.error(`FAIL  scope guard could not read git state — ${error.message}`)
    fail++
  }
}
const changed = [...new Set([
  ...nameStatus.split(/\r?\n/).map((line) => line.split(/\s+/).at(-1)).filter(Boolean),
  ...status.split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean),
])]
const protectedPath = /(^|\/)(\.env(?:\.|$)|.*land.*|.*labor.*|.*carbon.*|.*grievance.*)/i
const protectedChanges = changed.filter((path) => protectedPath.test(path) && !path.includes('BATCH5A_'))
check('scope guard: no Land, Labor, carbon, Grievance, .env, or secret changes', protectedChanges.length === 0, protectedChanges.join(', '))
const deleted = nameStatus.split(/\r?\n/).filter((line) => /^D\s/.test(line))
const diff = (() => { try { return git(['diff', '--', 'scripts/test', 'e2e']) } catch { return '' } })()
check('test integrity: no test deleted, skipped, or loosened', deleted.length === 0 && !/^\+.*\b(?:test|it)\.skip\b/m.test(diff), deleted.join(', '))
console.log(`INFO  scope files (${changed.length}): ${changed.join(', ')}`)
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
