# Batch 13A report
- Build: `npm run build:full` (staging mode) prerender 268/268; main chunk gzip 28,479 B (previous main chunk, from a stale local dist: 28,044 B). dist/index.html 104,495 B vs live 109,709 B (< 1.40x), no ticker rows. The only non-data text difference from live is the footer line (prices differ by day).
- Unit: 128/128 (includes new `tests/unit/browse-13a.test.mjs`, 8 tests).
- E2E: `e2e/browse-13a.spec.js` 13/13. Existing guide-10c-browse-etag, guide-10c, home-10f, collapsible-10f: 67 passed, 1 failed (collapsible-10f C5, see BACKLOG; unrelated page).
- Footer: now "· India" / "· भारत". Other places that still say Madhya Pradesh (NOT changed, legal/about content): `src/content/about.js:104-105` (owner line "... मध्य प्रदेश, भारत"), `scripts/verify-batch7a.mjs` (old assertions, historical script), README/PROJECT_CONTEXT pilot-region notes.
- Staging deploy: refused by the permission check; not run.
- Screens: docs/review/batch13a/evidence/screens/.
