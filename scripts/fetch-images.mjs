// Downloads real farming photographs, resizes them (sharp, jpg q80), and self-hosts
// them under public/images/home/. Also writes manifest.json (attribution/licence).
// Every file MUST be viewed and verified by a human before shipping (Phase 2 rule).
//   node scripts/fetch-images.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'public', 'images', 'home')
mkdirSync(OUT, { recursive: true })

const PEXELS = 'Pexels License (free to use, no attribution required)'
const UNSPLASH = 'Unsplash License (free to use)'
const lic = (s) => (s === 'unsplash' ? UNSPLASH : s === 'wikimedia' ? 'Wikimedia Commons' : PEXELS)

// key → { url, w, h, pos, description, source, author, page }
const IMAGES = [
  { file: 'hero-farmer.jpg', url: 'https://images.pexels.com/photos/20445169/pexels-photo-20445169.jpeg', w: 1600, h: 720, pos: 'right', description: 'Indian farmer (woman) working in a lush green wheat field, upper body and face visible, warm light', source: 'pexels', author: 'EqualStock IN', page: 'https://www.pexels.com/photo/20445169/' },
  { file: 'cat-machines.jpg', url: 'https://images.pexels.com/photos/20327958/pexels-photo-20327958.jpeg', w: 640, h: 400, description: 'Indian farmers on a red tractor in a rural field', source: 'pexels', author: 'EqualStock IN', page: 'https://www.pexels.com/photo/farming-in-india-20327958/' },
  { file: 'cat-labour.jpg', url: 'https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg', w: 640, h: 400, description: 'Indian workers harvesting by hand in a sunlit field', source: 'pexels', author: 'anjan ghosh', page: 'https://www.pexels.com/photo/11070641' },
  { file: 'cat-drone.jpg', url: 'https://images.pexels.com/photos/34182367/pexels-photo-34182367.jpeg', w: 640, h: 400, description: 'Agricultural drone spraying a crop field', source: 'pexels', author: 'Magda Ehlers', page: 'https://www.pexels.com/photo/advanced-agricultural-drone-spraying-crops-34182367/' },
  { file: 'cat-straw.jpg', url: 'https://images.pexels.com/photos/289334/pexels-photo-289334.jpeg', w: 640, h: 400, description: 'Straw/hay bales in a harvested wheat field', source: 'pexels', author: 'Pixabay', page: 'https://www.pexels.com/photo/agriculture-arable-bale-countryside-289334/' },
  { file: 'cat-inputs.jpg', url: 'https://images.pexels.com/photos/34221784/pexels-photo-34221784.jpeg', w: 640, h: 400, description: 'Stacked burlap sacks of grain in a warehouse', source: 'pexels', author: 'Eyupcan Timur', page: 'https://www.pexels.com/photo/stack-of-burlap-sacks-in-a-warehouse-34221784/' },
  { file: 'cat-godown.jpg', url: 'https://images.pexels.com/photos/32851822/pexels-photo-32851822.jpeg', w: 640, h: 400, description: 'Grain warehouse interior in India with workers', source: 'pexels', author: 'Dptc India', page: 'https://www.pexels.com/photo/vast-grain-warehouse-with-workers-sorting-corn-32851822/' },
  { file: 'cat-expert.jpg', url: 'https://images.pexels.com/photos/20841297/pexels-photo-20841297.jpeg', w: 640, h: 400, description: 'Indian farmer standing amid lush green paddy crops, inspecting the field (Bolpur, India)', source: 'pexels', author: 'Pexels contributor', page: 'https://www.pexels.com/photo/20841297/' },
  { file: 'cat-land.jpg', url: 'https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg', w: 640, h: 400, description: 'Expansive flat green rice/paddy farmland plot', source: 'pexels', author: 'Pexels contributor', page: 'https://www.pexels.com/photo/13888402/' },
  { file: 'list-harvester.jpg', url: 'https://images.pexels.com/photos/17075355/pexels-photo-17075355.jpeg', w: 640, h: 400, description: 'Combine harvester in a golden wheat field', source: 'pexels', author: 'Wolfgang Weiser', page: 'https://www.pexels.com/photo/combine-harvester-in-a-field-17075355/' },
  { file: 'list-tractor.jpg', url: 'https://images.pexels.com/photos/20445171/pexels-photo-20445171.jpeg', w: 640, h: 400, description: 'Indian women farmers beside a blue tractor', source: 'pexels', author: 'EqualStock IN', page: 'https://www.pexels.com/photo/farmers-in-india-20445171/' },
  { file: 'list-drone.jpg', url: 'https://images.pexels.com/photos/34182370/pexels-photo-34182370.jpeg', w: 640, h: 400, description: 'Agricultural drone spraying a green crop field', source: 'pexels', author: 'Magda Ehlers', page: 'https://www.pexels.com/photo/high-tech-drone-spraying-crops-in-field-34182370/' },
  { file: 'list-straw.jpg', url: 'https://images.pexels.com/photos/38891102/pexels-photo-38891102.jpeg', w: 640, h: 400, description: 'Baled straw in a golden wheat field', source: 'pexels', author: 'Christina & Peter', page: 'https://www.pexels.com/photo/38891102' },
  { file: 'list-workers.jpg', url: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg', w: 640, h: 400, description: 'South-Asian farm workers harvesting by hand', source: 'pexels', author: 'Tamhasip Khan', page: 'https://www.pexels.com/photo/11688197' },
  { file: 'list-godown.jpg', url: 'https://images.pexels.com/photos/29948462/pexels-photo-29948462.jpeg', w: 640, h: 400, description: 'Worker with a sack in a warehouse of stacked grain sacks', source: 'pexels', author: 'Jubair Hosen Junet', page: 'https://www.pexels.com/photo/worker-handling-sacks-in-indoor-storage-facility-29948462/' },
  { file: 'list-land.jpg', url: 'https://images.pexels.com/photos/9709717/pexels-photo-9709717.jpeg', w: 640, h: 400, description: 'Flat open farmland fields under a blue sky', source: 'pexels', author: 'Tom Fisk', page: 'https://www.pexels.com/photo/9709717' },
  { file: 'list-shop.jpg', url: 'https://images.pexels.com/photos/28624931/pexels-photo-28624931.jpeg', w: 640, h: 400, description: 'Traditional Indian provision storefront with grain sacks', source: 'pexels', author: 'Paolosbg Vattelapesca', page: 'https://www.pexels.com/photo/traditional-indian-grocery-storefront-with-supplies-28624931/' },
  { file: 'list-thresher.jpg', url: 'https://images.pexels.com/photos/12058069/pexels-photo-12058069.jpeg', w: 640, h: 400, description: 'Farmer feeding wheat sheaves into an orange wheat thresher machine in a field', source: 'pexels', author: 'Pexels contributor', page: 'https://www.pexels.com/photo/12058069/' },
]

// YouTube thumbnails for the three Phase-3d videos (self-hosted, hqdefault 480x360).
// IDs verified via oembed (real, public). See src/content/videos.js for titles/durations.
const VIDEOS = [
  { file: 'video-1.jpg', youtubeId: '2fOVTX4mDZ8', description: 'Thumbnail — सोयाबीन में पीले मोज़ेक रोग का प्रबंधन (ICAR National Soybean Research Institute, Indore)', author: 'NATIONAL SOYBEAN RESEARCH INSTITUTE, INDORE' },
  { file: 'video-2.jpg', youtubeId: 'KI-K1O59mDo', description: 'Thumbnail — गेहूं की खेती कैसे करें, बुवाई से कटाई तक (Annadata, News18)', author: 'News18 Bihar Jharkhand' },
  { file: 'video-3.jpg', youtubeId: 'O0PMu9lfboY', description: 'Thumbnail — किसान ड्रोन की पूरी जानकारी, स्प्रे ड्रोन (Hindi)', author: 'omprakash ausar' },
]

// Belt-and-suspenders integrity gate: `file <path>` must report a real image.
// A saved HTML error page (or anything not JPEG/PNG) is deleted and reported so
// the caller re-searches instead of shipping a broken/placeholder asset.
function assertRealImage(path) {
  const desc = execFileSync('file', ['-b', path], { encoding: 'utf8' }).trim()
  if (!/^(JPEG image data|PNG image data)/.test(desc)) {
    try { rmSync(path) } catch { /* ignore */ }
    throw new Error(`not an image (file says: "${desc}") — deleted, re-search needed`)
  }
  return desc
}

async function run() {
  const manifest = []
  const failures = []
  for (const im of IMAGES) {
    const dest = join(OUT, im.file)
    try {
      const res = await fetch(`${im.url}?auto=compress&cs=tinysrgb&w=${im.w * 2}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await sharp(buf)
        .resize(im.w, im.h, { fit: 'cover', position: im.pos === 'right' ? sharp.gravity.east : sharp.strategy.attention })
        .jpeg({ quality: 80 })
        .toFile(dest)
      const desc = assertRealImage(dest) // reject HTML / non-image
      manifest.push({ file: im.file, description: im.description, source: im.source, author: im.author, license: lic(im.source), page: im.page })
      console.log(`OK  ${im.file}  (${desc})`)
    } catch (e) {
      failures.push(`${im.file}: ${e.message}`)
      console.log(`FAIL ${im.file}: ${e.message}`)
    }
  }
  for (const v of VIDEOS) {
    const dest = join(OUT, v.file)
    try {
      const res = await fetch(`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
      const desc = assertRealImage(dest)
      manifest.push({ file: v.file, description: v.description, source: 'youtube', author: v.author, license: 'YouTube thumbnail (video ID ' + v.youtubeId + ')', page: `https://www.youtube.com/watch?v=${v.youtubeId}` })
      console.log(`OK  ${v.file}  (${desc})`)
    } catch (e) {
      failures.push(`${v.file}: ${e.message}`)
      console.log(`FAIL ${v.file}: ${e.message}`)
    }
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\nmanifest.json written (${manifest.length} images)`)
  if (failures.length) {
    console.log(`\n${failures.length} FAILURE(S) — re-search these:`)
    for (const f of failures) console.log(`  - ${f}`)
    process.exitCode = 1
  }
}
run()
