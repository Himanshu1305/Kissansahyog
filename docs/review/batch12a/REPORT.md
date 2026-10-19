# Batch 12A — report (WhatsApp channel card; staging deployed, production NOT shipped)

Branch `release-12a` from `release-11a` `169fb74` (safety tag `pre-12a-ship`). Ship tag `ship-12a` = final head. No migration, no switch, no database access.

| Requirement | Status | Evidence / notes |
|---|---|---|
| One source of truth `src/lib/social.js`; unit test greps `src/` | RAN-PASSED | `tests/unit/whatsapp-channel-12a.test.mjs` |
| `WhatsAppChannelCard` (hero / inline / link), safe link attributes, 48 px targets, inline-SVG icon | RAN-PASSED | unit (source) + e2e (rendered) |
| Button contrast: white on `#0F7A5F` | RAN-PASSED | **5.29 : 1** (AA needs 4.5) |
| Strings hi + en (5 keys) | RAN-PASSED | unit; wording HUMAN-REVIEW (`HINDI_CAPTIONS.md`) |
| Placements: home (hero card below the hero block), footer link (all pages except login / signup / admin / offline), /msp, /mausam, About, Contact, Guide hub, Profile (top), post-listing success | RAN-PASSED | e2e `whatsapp-channel-12a.spec.js` 15/15 on a frozen copy of `dist` |
| Max one card per page; none on login / signup / admin | RAN-PASSED | e2e |
| Organization JSON-LD `sameAs` has the channel URL | RAN-PASSED | e2e (+ unit-level import of the constant) |
| Home 360x640: big buttons not moved | RAN-PASSED | new build y 614.8 / 690.8; production y 615 / 691 (measured). The second button is below the 640 px fold on production too |
| No animation / no layout shift on the card | RAN-PASSED | e2e (no CSS animation on the card; static HTML, same place after hydration) |
| No horizontal overflow at 320 px, Hindi and English (home, msp, about) | RAN-PASSED | e2e |
| OTP flow untouched (no card or footer link on /login and /signup) | RAN-PASSED | e2e; `e2e/otp-11a.spec.js` NOT-RUN here (16 skipped: needs the local functions stack, as in 11A) |
| Unit suite | RAN-PASSED | **105/105** (`evidence/unit-final.txt`) |
| Existing home e2e (`home-10f.spec.js`) | RAN-PASSED | 19 passed, 16 skipped (the skipped are the OTP file) |
| Build `build:full` | RAN-PASSED | prerender **268/268** (1 via fallback, as baseline); localhost gate OK |
| Prerendered text vs baseline | RAN-PASSED | only the added strings differ; `videos` shows the known loading-state race (`evidence/text-diff.json`) |
| Main chunk gzip | RAN-PASSED | 27,850 B -> **28,600 B (+750 B**: the new strings and component) |
| Screenshots looked at | RAN-PASSED | home 360x640, home card 360, /msp card 360, footer 360 (Hindi); `evidence/screens/` |
| Android link handling | NOT-RUN on a device | no code change needed (DECISIONS 8); founder tests with a new APK |
| `npm run test:android` | NOT-RUN | needs an APK and the live site; not an offline unit test (DECISIONS 12) |
| Secret scan | RAN-PASSED | `evidence/secret-scan.txt` (only the public Cloudflare account id in the scripts and a pre-existing hash in `src/content/sources.js`) |
| Staging deploy (once) | RAN-PASSED | deployment `9abcb2ad`; `https://staging.kissansahyog.com` serves the new build; staging switches read-only: `otp_required=false`, `session_enforced=false` |
| `ship-prod-12a.sh` / `rollback-prod-12a.sh` | see dry run in the final summary | `evidence/ship-dryrun-final.txt` |

Tracked generated file changed: `public/search-index.json` (every build).
