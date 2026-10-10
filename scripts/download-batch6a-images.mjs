// One-off, reproducible Batch 6A image download and optimization.
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const images = [
  ['cat-rotavator.jpg', 'https://sysadmin.captaintractors.com/uploads/rotary_tiller_c5fef010_10e4_406c_9943_892089c82909_52a26ac6eb.jpg'],
  ['cat-seeds.jpg', 'https://static.euronews.com/articles/stories/07/90/33/48/1536x864_cmsv2_949b3afd-90d4-5d14-8949-f056dbb900b0-7903348.jpg'],
  ['cat-building-materials.jpg', 'https://selvamadera.co/_next/image?q=75&url=%2Fimages%2Fblog%2Fmano-obra-vs-materiales-remodelacion%2Fmateriales-construccion-antioquia.webp&w=3840'],
  ['cat-greenhouse.jpg', 'https://feeds.abplive.com/onecms/images/uploaded-images/2023/07/22/0b19a23e1713b1aa97ca9ef1c92723c0e5e94.jpg?impolicy=abp_cdn&imwidth=720'],
  ['cat-jugaad.jpg', 'https://gumlet.assettype.com/downtoearth%2F2025-12-12%2Fxjn0d82b%2FJugaad-2.jpg?auto=format%2Ccompress&w=1200'],
  ['cat-tanker.jpg', 'https://static.toiimg.com/thumb/msid-119492627%2Cwidth-1280%2Cheight-720%2Cresizemode-72/119492627.jpg'],
  ['cat-transport.jpg', 'https://mapsandmagnets.files.wordpress.com/2015/10/1-img_4358.jpg'],
  ['cat-carbon.jpg', 'https://plantnative.today/plants/babul.jpg'],
  ['cat-cold-storage.jpg', 'https://nwccindia.com/assets/images/cold-storage2.jpg'],
]

await mkdir('public/images/home', { recursive: true })
for (const [file, url] of images) {
  const response = await fetch(url, { headers: { 'user-agent': 'KissanSahyog asset preparation' } })
  if (!response.ok) throw new Error(`${file}: ${response.status} ${response.statusText}`)
  const input = Buffer.from(await response.arrayBuffer())
  await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(`public/images/home/${file}`)
  console.log(`saved ${file}`)
}
