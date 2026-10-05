# V2 BASELINE (Phase 0)

Captured: 2026-10-05. Branch at start: `main` @ bd949af.

## Hard-stop checks (§0.8) — all clear
- Research files present: carbon_credit_dossier.md, greenhouse_dossier.md, jugaad_legal_dossier.md, mp_cold_storages.csv, mp_cold_storages_README.md ✓
- `mp_cold_storages.csv` = 244 lines = **243 data rows** + 1 header ✓
- `.env`: SUPABASE_ACCESS_TOKEN (len 44), SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY all set ✓
- `DATA_GOV_IN_API_KEY`: **missing** → not a hard stop; skip KCC API in Phase 12, use other demand sources, list as owner action.
- `GEMINI_API_KEY`: empty locally, but set in Cloudflare Pages (voice transcribe fallback) per prompt.
- `pdftoppm` (poppler) available at /opt/homebrew/bin/pdftoppm ✓

## Production build
- `npm run build` exit 0, built in ~1.3s. PWA precache 85 entries (1101 KiB).

## Bundle size (gzip) — the 15% cap reference
- **Total JS gzip across all chunks: 306,764 bytes (~299.6 KB)**
- Largest eager chunks (gzip): react-vendor 73.2 KB, supabase 53.3 KB, index 49.2 KB, shared 6.84 KB.
- **Initial eager bundle (index + react-vendor + supabase + shared) ≈ 182 KB gzip.**
- 15% cap on total → must stay below **352,778 bytes gzip**. (Primary guard used by bundle-size check.)

## Test baseline
- Backend suites: see `/tmp/v2_backend_baseline.log` captured output, summarised below in this file once complete.
- E2E suites: `npm run test:e2e` — captured below.
- No `npm test` runner (stub). No lint beyond `eslint .` (prompt says do not add a lint script; keep existing).

### Backend suite pass counts
**TOTAL: 690 passed / 0 failed** across all 41 `scripts/test/*.mjs` suites. Per-suite breakdown in `docs/review/v2_backend_baseline.log`. (Note: macOS has no `timeout`/`gtimeout`; run tests directly.)

### E2E pass counts
**77 passed / 0 failed** (`npm run test:e2e`, ~1.9 min, chromium Pixel-5 profile, serial).
