**Verdict:** 7 tests — 6 RAN-PASSED / 0 RAN-FAILED / 1 NOT-RUN / 0 HUMAN-REVIEW

Source: `docs/review/batch9/evidence/phase1/results-prod-run1.json` · run 2026-10-14T21:17:18.421Z → 2026-10-14T21:23:24.294Z · device emulator-5554 (API 36, WebView —)

| ID | Test | Status | Assertion | Evidence |
|---|---|---|---|---|
| T9 | Edge-to-edge / safe areas | **RAN-PASSED** | API 36 portrait: NavBar below the status bar, tab bar buttons above the navigation bar and not covered, offline banner below the status bar, last footer link fully visible above the tab bar | docs/review/batch9/evidence/phase1/prod-run1/T9/ (9 files) |
| T10 | Offline | **RAN-PASSED** | Airplane mode + cold launch: app shell renders (not a browser error page), offline banner visible, no crash; /, /browse, /mausam, /msp, /about show content or an in-app failure state; back online the banner goes within 15 s and /mausam loads data | docs/review/batch9/evidence/phase1/prod-run1/T10/ (10 files) |
| T14 | Keyboard + search | **RAN-PASSED** | On /search a real tap brings up a DRAWN on-screen keyboard (IME frame visible + screenshot differs), the focused input is fully visible above the keyboard and not covered, and a query known to have results renders results | docs/review/batch9/evidence/phase1/prod-run1/T14/ (4 files) |
| K1 | Keyboard never hides a field | **RAN-PASSED** | For /login, /signup, /search, the feedback form (/grievance), Profile edit and every /post step: the LOWEST text field, tapped with a real on-screen keyboard drawn, is fully visible above the keyboard (a), its submit/next button scrolls into view with the keyboard up (b), and after closing the keyboard nothing stays covered (c). Forms needing an account are NOT-RUN where no login is allowed (prod) | docs/review/batch9/evidence/phase1/prod-run1/K1/ (10 files) |
| H1 | Home shows one "last updated" time offline | **RAN-PASSED** | Online visit fills the cache; airplane mode + cold launch: Home shows the offline banner with its time and NO second stamp under the ticker (exactly one timestamp). Online-but-saved-data (banner gone, data still from the phone): the stamp is shown | docs/review/batch9/evidence/phase1/prod-run1/H1/ (4 files) |
| C1 | /cold-storage failed load (app) | **RAN-PASSED** | Cache emptied, airplane mode, cold launch: /cold-storage shows the "could not load" notice with "try again" (no ErrorBoundary, no uncaught error, no spinner left); back online, "try again" loads the list | docs/review/batch9/evidence/phase1/prod-run1/C1/ (4 files) |
| L1 | Post page location fallback | **NOT-RUN** | Logged in, /post step 3, "use my current location": GPS on → coordinates near the emulator position (which step: cached ≤ 10 min / fresh ≤ 20 s recorded); GPS off → within ~25 s the clear fallback message and the cursor in the village field, no crash | — |

**Not a plain pass — read these:**

- **L1 NOT-RUN** — needs a logged-in account (Post is behind login); the prod flavour is read-only — no account may be created or used there. Run in the staging suite after S4.
