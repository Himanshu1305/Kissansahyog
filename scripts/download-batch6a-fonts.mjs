// Self-host the exact Noto Sans Devanagari weights used by the UI.
import { mkdir, writeFile } from 'node:fs/promises'
const weights = [400, 600, 700, 800]
await mkdir('public/fonts', { recursive: true })
for (const subset of ['devanagari', 'latin']) {
  for (const weight of weights) {
    const file = `noto-sans-devanagari-${subset}-${weight}-normal.woff2`
    const url = `https://unpkg.com/@fontsource/noto-sans-devanagari@5.2.7/files/${file}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${file}: ${response.status}`)
    await writeFile(`public/fonts/${file}`, Buffer.from(await response.arrayBuffer()))
    console.log(`saved ${file}`)
  }
}
