#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractPageText } from './lib/page-text.mjs'

const [, , url, slug] = process.argv
if (!url || !slug) {
  console.error('Usage: node scripts/fetch-snapshot.mjs <url> <slug>')
  process.exit(2)
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshots = join(ROOT, 'docs', 'research', 'source_snapshots')
const log = join(ROOT, 'docs', 'research', 'BATCH5C_FETCH_LOG.md')
await mkdir(snapshots, { recursive: true })
const host = new URL(url).hostname.toLowerCase().replace(/[^a-z0-9.-]/g, '-')
const snapshot = join(snapshots, `${host}-${slug.replace(/[^a-z0-9.-]/gi, '-')}.txt`)
const record = async (status, error, bytes = 0, chars = 0, usable = false) => {
  await appendFile(log, `| ${new Date().toISOString()} | ${url} | ${status} | ${String(error || '').replace(/\|/g, '/')} | ${bytes} | ${chars} | ${usable ? 'usable' : 'unusable'} |\n`)
}
try {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'KissanSahyog citation verifier/1.0 (content research)' }, signal: AbortSignal.timeout(60000) })
      const body = Buffer.from(await response.arrayBuffer())
      if (response.status !== 200) {
        await record(response.status, `HTTP ${response.status}`, body.length, 0, false)
        if (attempt === 1) process.exitCode = 1
        continue
      }
      const { text, title } = await extractPageText(body, response.headers.get('content-type') || '')
      const shell = /enable javascript|javascript is required|please enable javascript/i.test(text) && text.length < 2000
      const usable = text.length >= 600 && !shell
      if (!usable) {
        await record(response.status, shell ? 'JavaScript shell' : 'extracted text under 600 characters', body.length, text.length, false)
        process.exitCode = 1
        break
      }
      const fetched = new Date().toISOString()
      const sha = createHash('sha256').update(body).digest('hex')
      await writeFile(snapshot, `${url} | HTTP ${response.status} | fetched at ${fetched} | sha256 ${sha} | ${title}\n${text}\n`, 'utf8')
      await record(response.status, '', body.length, text.length, true)
      console.log(`Saved ${snapshot} (${text.length} characters)`)
      process.exitCode = 0
      break
    } catch (error) {
      await record('ERROR', error.message, 0, 0, false)
      if (attempt === 1) { console.error(`${url}: ${error.message}`); process.exitCode = 1 }
    }
  }
} catch (error) {
  await record('ERROR', error.message, 0, 0, false)
  console.error(error.stack || error.message)
  process.exitCode = 1
}
