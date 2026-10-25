# Google Play Console — step-by-step checklist (DRAFT)

For: Himanshu (founder). Nothing has been submitted; no account was touched tonight.
Package: `com.kissansahyog.app` (production flavour), version 0.1.0 / versionCode 1,
targetSdk 36, minSdk 24 (`android/app/build.gradle:18-23`, `android/variables.gradle`).
The staging package `com.kissansahyog.app.staging` must **never** be uploaded to the store listing
you want to keep (a package name, once uploaded, belongs to that app forever).

Legend: **[BLOCKED-ORG]** = needs the Play **organisation** account (needs the D-U-N-S number —
request `DR1013202634704819920`, pending, backlog B5 `docs/review/batch9/BACKLOG.md:25,152-161`).
**[TODAY]** = can be done today without any Play account. **[PERSONAL-OK]** = could be done today
with a *personal* developer account if you decide to use one (see section 0).
**[FIX-FIRST]** = a code/legal item that should be finished before submitting.

---------------------------------------------------------------------

## 0. Personal vs organisation account — decide first

| | Organisation account (planned) | Personal account (possible today) |
|---|---|---|
| Needs | D-U-N-S number for USD Vision AI LLP (pending) — legal name/address must match D&B | Your own ID verification |
| Testing rule before production | No mandatory closed test | New personal accounts must run a **closed test with at least 12 testers opted in for 14 days in a row** before production access is granted (rule as described in `BACKLOG.md:159-160`; check the current number in Play Console) |
| Developer name on the store | USD Vision AI LLP | Your personal name |
| Later | — | App can be moved to the organisation account with Play's "app transfer" — extra paperwork |

**Safest recommendation:** wait for the organisation account for the real `com.kissansahyog.app`
listing. Use today for everything marked [TODAY]. If you want testers on real phones sooner,
the APKs can be side-loaded (no store needed).

---------------------------------------------------------------------

## 1. Before opening Play Console  — [TODAY]

| # | Action | Who | Where |
|---|---|---|---|
| 1.1 | Send Terms + Privacy + `docs/store/data-safety-answers.md` + `docs/store/privacy-policy-additions.md` to the lawyer | Me → Lawyer | backlog L1 `BACKLOG.md:26,167-179` |
| 1.2 | After lawyer OK: update `/privacy` (Hindi + English) with the app paragraphs, remove the "legal review pending" banner, deploy to production | Lawyer → Claude Code → Me | `privacy-policy-additions.md` §B; backlog L2 |
| 1.3 | Decide brand spelling: launcher label "Kisan Sahyog" (`android/app/build.gradle:19`, `android/app/src/main/res/values/strings.xml:3`) vs website English "Kissan Sahyog" (`src/lib/i18n/strings.js:10`). Store title draft uses "Kissan Sahyog" (EN) / "किसान सहयोग" (HI). | Me | `listing-en.md` |
| 1.4 | Decide contact e-mail for store + privacy: `usdvisionai@gmail.com` (this pack) vs `hello@kissansahyog.com` (live privacy page, `src/lib/i18n/legal.js:46,50`) | Me | — |
| 1.5 **[FIX-FIRST]** | Account deletion must really delete: also delete the Supabase Auth user and the user's photo files | Claude Code + migration you apply | `data-safety-answers.md` §5 |
| 1.6 **[FIX-FIRST]** | A web page/URL where people can ask for account deletion without the app (Play requires it). Simplest: a short section on `/privacy` or `/grievance` with steps + e-mail | Claude Code | `data-safety-answers.md` §1 |
| 1.7 **[FIX-FIRST]** | Backlog B9 — round the Post-form position before saving on public listings | Me decides → Claude Code | `BACKLOG.md:31,229-236` |
| 1.8 **[FIX-FIRST]** | Hide `kisan_safalta.contact_phone` from public reads (submitter's private number is readable on published stories) | Claude Code + migration you apply | `data-safety-answers.md` §3 |
| 1.9 **[FIX-FIRST]** | Security P0s that a reviewer or attacker can hit: B1 (admin functions), B2 (weather table writes), B3/B4 (mobile login without OTP) | see backlog | `BACKLOG.md:21-24` |
| 1.10 | Gemini API key: confirm it is on a **paid** tier (affects the Data-safety "shared" answer for voice) | Me | `permissions-justification.md` §2 |
| 1.11 | Add a "not a government app" line inside the app (e.g. About / Yojana page). The store description already has it; Play's policy for apps showing government information expects a clear disclaimer and source links. Only an IMD-specific disclaimer exists today (`src/lib/i18n/strings.js:1586`). | Claude Code | — |
| 1.12 | Phase 3 of tonight's run: release keystore + signed AAB (`C:\Users\usdvi\ks-release-keys\`, never in git). Check `docs/review/batch9/PROGRESS.md` for its status. | Claude Code | — |
| 1.13 | Phase 6.6 graphics — DONE except real app screenshots. Icon and feature graphics are ready; the phone screenshots are **web stand-ins** from kissansahyog.com (no emulator tonight). **Before submission:** replace them with real emulator or phone shots of the PROD app if the app looks different. Exact commands in the README. | Me (morning) | `graphics/README.md` |
| 1.14 | A **reviewer login** on PRODUCTION (for "App access") — you create it yourself in the morning (tonight's rules forbid test sign-ups on production). Use a real e-mail you control; never put the password in git. | Me | — |

---------------------------------------------------------------------

## 2. Account and app creation

| # | Field / action | Value | Status |
|---|---|---|---|
| 2.1 | Create developer account (one-time registration fee) | Organisation: USD Vision AI LLP + D-U-N-S | **[BLOCKED-ORG]** (or [PERSONAL-OK]) |
| 2.2 | Verify identity / organisation, phone, e-mail | — | **[BLOCKED-ORG]** |
| 2.3 | Create app → App name | `किसान सहयोग: मंडी भाव और मौसम` (29 chars) | `listing-hi.md` |
| 2.4 | Default language | Hindi – hi-IN | — |
| 2.5 | App or game | App | — |
| 2.6 | Free or paid | **Free** (cannot be changed to paid later) | — |
| 2.7 | Declarations | Developer Program Policies ✔, US export laws ✔ | — |

---------------------------------------------------------------------

## 3. "Set up your app" — App content (Policy → App content)

| # | Section | Value to choose / paste | Source |
|---|---|---|---|
| 3.1 | Privacy policy | `https://kissansahyog.com/privacy` — only after step 1.2 | — |
| 3.2 | App access | "All or some functionality is restricted" → add instructions: browsing needs no login; to test Post/Profile/Delete use the reviewer login from 1.14 (mobile login has no OTP yet — explain). | `src/App.jsx:168-177` (`Protected` routes) |
| 3.3 | Ads | **No, my app does not contain ads** | `data-safety-answers.md` §4 |
| 3.4 | Content rating | Fill the IARC questionnaire | `content-rating-answers.md` |
| 3.5 | Target audience and content | 18 and over | `content-rating-answers.md` (last table) |
| 3.6 | News app | No | — |
| 3.7 | COVID-19 contact tracing / status | No | — |
| 3.8 | Data safety | Paste from the tables | `data-safety-answers.md` §1–2 |
| 3.9 | Data deletion URL (inside Data safety) | URL from step 1.6 | — |
| 3.10 | Government apps | **No** — not developed by or for a government | store description disclaimer |
| 3.11 | Financial features | **None** — no loans, payments, banking | `src/lib/i18n/legal.js:23` |
| 3.12 | Health apps | No health features | — |
| 3.13 | Advertising ID | **No** — the app does not use the advertising ID and declares no `AD_ID` permission (`AndroidManifest.xml:39-54`). After the AAB is built (Phase 3), confirm in the *merged* manifest / Play's App bundle explorer that no library added `com.google.android.gms.permission.AD_ID`. | — |
| 3.14 | Permissions declarations | None needed: no background location, no SMS/call log, no all-files access, no photo/video media permission | `permissions-justification.md` |

---------------------------------------------------------------------

## 4. Store presence

| # | Field | Value | Source |
|---|---|---|---|
| 4.1 | Store settings → App category | Business (suggestion) | `listing-hi.md` |
| 4.2 | Tags (up to 5, from Play's list) | closest to agriculture, weather, marketplace, prices, government info (HUMAN-REVIEW) | `listing-hi.md` |
| 4.3 | Contact e-mail | usdvisionai@gmail.com (or the address chosen in 1.4) | — |
| 4.4 | Website | https://kissansahyog.com | — |
| 4.5 | Phone (optional) | leave empty unless you want it public | — |
| 4.6 | Main store listing (hi-IN): name / short / full | paste the FIELD blocks | `listing-hi.md` (counts in `listing-limits.json`) |
| 4.7 | Add translation: English (en-IN) | paste the FIELD blocks | `listing-en.md` |
| 4.8 | App icon 512×512 PNG | READY: upload `icon-512.png` (32-bit PNG, 396 KB, same artwork as the launcher icon) | `docs/store/graphics/icon-512.png` |
| 4.9 | Feature graphic 1024×500 | READY: `feature-graphic-hi.png` for the hi-IN listing, `feature-graphic-en.png` for the en-IN translation (24-bit, no alpha) | `docs/store/graphics/feature-graphic-{hi,en}.png` |
| 4.10 | Phone screenshots (2–8, 1080×2400) | STAND-IN: 8 per language (hi to the hi-IN listing, en to en-IN), taken from the public website, checked for staging and personal data. HUMAN-REVIEW: replace them with real app shots before final submission if the app looks different (see 1.13). | `docs/store/graphics/screens/{hi,en}/01-home.png … 08-about.png` |
| 4.11 | Tablet screenshots | Optional — skip for 0.1.0 | — |

---------------------------------------------------------------------

## 5. Release

| # | Step | Value | Status |
|---|---|---|---|
| 5.1 | Play App Signing | Accept Google-managed app signing key; upload the AAB signed with **your upload key** from Phase 3 (keystore in `C:\Users\usdvi\ks-release-keys\`, backed up somewhere safe offline) | **[BLOCKED-ORG]** |
| 5.2 | Internal testing track first | Upload `com.kissansahyog.app` AAB, add your own Gmail as tester, install from the Play link, test on your phone | **[BLOCKED-ORG]** ([PERSONAL-OK]) |
| 5.3 | Release name / notes | `0.1.0 (1)` / paste `release_notes` FIELD (hi + en) | `listing-hi.md`, `listing-en.md` |
| 5.4 | Closed testing 12 testers × 14 days | Only if a personal account is used | [PERSONAL-OK] |
| 5.5 | Countries | India only (start) | — |
| 5.6 | Production rollout | Staged rollout (e.g. 20 %) after internal test passes | **[BLOCKED-ORG]** |
| 5.7 | After review: record the IARC rating and any policy feedback in `docs/review/` | Me / Claude Code | — |

---------------------------------------------------------------------

## 6. Quick status summary

- **Blocked until the organisation account exists (D-U-N-S pending):** 2.1–2.2, everything inside
  Play Console (3.x, 4.x upload, 5.x).
- **Can be done today, no account:** 1.1–1.14 (lawyer, privacy update, fixes, brand/e-mail decisions,
  reviewer login, AAB + graphics from the overnight run), and the listing/data-safety texts in this folder are ready.
- **Possible today only if you choose a personal account:** creating the app, all forms, internal
  test upload, starting the 14-day closed test. Not recommended for the final listing (section 0).
