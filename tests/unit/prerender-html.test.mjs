// Batch 10E (B17) — unit checks for scripts/lib/prerender-html.mjs (Node's built-in runner).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rootRelativeAssetLinks as fix } from '../../scripts/lib/prerender-html.mjs'

test('local-origin link/script URLs become root-relative', () => {
  const out = fix('<head><link rel="modulepreload" as="script" crossorigin="" href="http://localhost:4178/assets/a.js">'
    + '<link rel="stylesheet" href="http://127.0.0.1:5173/assets/b.css"><script type="module" src="http://localhost:4178/assets/i.js"></script></head>')
  assert.ok(!/localhost|127\.0\.0\.1/.test(out), out)
  assert.match(out, /href="\/assets\/a\.js"/)
  assert.match(out, /href="\/assets\/b\.css"/)
  assert.match(out, /src="\/assets\/i\.js"/)
})

test('a link repeating an earlier one (same rel + href) is dropped; different rel is kept', () => {
  const out = fix('<link rel="modulepreload" crossorigin="" href="/assets/a.js">'
    + '<link rel="modulepreload" as="script" crossorigin="" href="http://localhost:4178/assets/a.js">'
    + '<link rel="stylesheet" href="/assets/a.css"><link rel="stylesheet" href="http://localhost:4178/assets/a.css">'
    + '<link rel="preload" as="image" href="/images/a.jpg">')
  assert.equal(out.match(/assets\/a\.js/g).length, 1)
  assert.equal(out.match(/assets\/a\.css/g).length, 1)
  assert.match(out, /rel="preload" as="image"/)
})

test('text, <a href>, <img src>, canonical and external URLs are untouched', () => {
  const html = '<link rel="canonical" href="https://kissansahyog.com/msp"><link rel="stylesheet" href="https://fonts.example/x.css">'
    + '<p>http://localhost:4178/x</p><a href="http://localhost:4178/y">y</a><img src="http://localhost:4178/z.jpg">'
  assert.equal(fix(html), html)
})
