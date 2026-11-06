// Batch 19 - CONTENT_FOR_REVIEW.md must be exactly what the generator makes from the content modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReviewDoc } from '../../scripts/batch19/make-review-doc.mjs'
import { ALL_PAGES } from '../../src/content/pashupalan/registry.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('CONTENT_FOR_REVIEW.md is up to date with the content modules', async () => {
  const onDisk = (await readFile(join(ROOT, 'docs/review/batch19/CONTENT_FOR_REVIEW.md'), 'utf8')).replace(/\r\n/g, '\n')
  assert.equal(onDisk, buildReviewDoc(), 'run: node scripts/batch19/make-review-doc.mjs')
})

test('every paragraph line in the review doc carries a FACTS id tag', () => {
  const doc = buildReviewDoc()
  for (const p of ALL_PAGES) assert.ok(doc.includes(p.path))
  const body = doc.split('\n').filter((l) => /^(- |\d+\. )/.test(l) && !l.includes('— पेज:') && !l.includes('→ /pashupalan') && !l.includes('https://'))
  assert.ok(body.length > 100)
  for (const l of body) assert.match(l, /\[(F-[A-Z]\d+|GEN)(, (F-[A-Z]\d+|GEN))*\]\s*$/, l.slice(0, 60))
})
