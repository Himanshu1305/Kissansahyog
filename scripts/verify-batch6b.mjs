import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')
let failed = 0
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`)
  if (!condition) failed += 1
}

const post = read('src/screens/Post.jsx')
const promo = read('src/components/PromoBento.jsx')
const photo = read('src/components/PhotoPicker.jsx')
const photosApi = read('src/lib/listings/photos.js')
const consent = read('src/components/ConsentChecklist.jsx')
const migration = read('supabase/migrations/0054_consents.sql')
const catalog = read('src/lib/listings/catalog.js')
const synonyms = read('src/content/searchSynonyms.js')

check('B1: Post uses responsive desktop two-column layout', post.includes('lg:grid-cols-3') && post.includes('lg:col-span-2') && post.includes('lg:sticky lg:top-24'))
check('B2: reusable promo config and bento exist', existsSync(resolve(root, 'src/content/promoTiles.js')) && promo.includes('PROMO_TILES') && promo.includes('fetchKbSawaal') && promo.includes('fetchUpcomingMelas'))
check('B3: checklist has four separate checkboxes and gates submit', consent.includes('listingConsents.map') && post.includes('allConsentsAccepted') && post.includes('acceptListingConsents'))
check('B4: central picker, catalog limits, compression and prescribed path exist', photo.includes('accept="image/*"') && catalog.includes('PHOTO_LIMITS') && photosApi.includes('createImageBitmap') && photosApi.includes("pathPrefix = 'listings'") && photosApi.includes('${pathPrefix}/${batchId}/${index}.jpg'))
check('B5: click-only browser geolocation and Maps validation exist', post.includes('navigator.geolocation') && post.includes('isGoogleMapsUrl') && read('src/screens/ListingDetail.jsx').includes('maps/search/?api=1'))
check('B6: transport stores From/To and displays route', post.includes('from_location') && post.includes('to_location') && read('src/components/categories/transport.jsx').includes("L('route')"))
check('B7: land label and search synonyms updated', catalog.includes('भूमि / रकबा') && catalog.includes('Land (Bhoomi / Rakba)') && synonyms.includes("'रकबा'") && synonyms.includes("'भूमि'"))
check('migration: 0054 is additive with rollback, consents and 5 MB bucket limit', migration.includes('Rollback note') && migration.includes('add column if not exists consents') && migration.includes('file_size_limit = 5242880'))
check('migration: no forbidden destructive SQL', !/\b(drop\s+table|truncate\s+table|delete\s+from|alter\s+table[^;]*\bdrop\s+column)\b/i.test(migration))
check('migration: old create_listing signature remains untouched; compatible wrapper exists', migration.includes('create_listing_with_location') && !migration.includes('drop function'))
console.log(`${failed ? 'FAIL' : 'PASS'}  batch6b total: ${failed} failed`)
process.exitCode = failed ? 1 : 0
