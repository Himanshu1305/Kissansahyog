# Batch 14A progress
- [x] Phase 0 start (branch release-14a, tag pre-14a-ship)
- [x] Phase 1 database: 0067 + rollback, applied to STAGING twice; 189 existing functions unchanged; 24 new (evidence/apply-0067-staging.txt)
- [x] Phases 2-7 code (functions, shell, announcements, security, users, log) + unit tests 19/19 (admin-console-14a). Next: DB checks on staging, e2e, screenshots, build gates, ship scripts
- [x] DB checks on staging 55/55; catalog test 9/9; unit 141/141; new e2e 10/10; existing admin/mela/home/whatsapp e2e 64/64 (home H4 re-run on the prerendered dist)
- [x] Build: prerender 268/268 (1 via fallback, same as baseline); main chunk gzip 28.77 kB (baseline) -> 19.51 kB; dist/index.html 104704 -> 105078 B; 4 prerender pages differ only by the "loading" capture flake (ship script re-prerenders)
- [x] Staging deploy 1b100db0 (https://1b100db0.kissansahyog.pages.dev)
- [x] Ship + rollback scripts, PROD SQL copies, SHIP.md, close prompt
