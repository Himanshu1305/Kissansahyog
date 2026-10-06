# BATCH 1 — Progress checklist

Build order: 0 → 2 → 3 + 3A → 4 → 5 → 1. Items 0,2,3,3A,4,5 are must-do.

- [x] **Item 0** — migration 0050 provider-declaration hotfix + backend test (batch1_item0.mjs, 3 cases). Updated 4 stale negative assertions in v2_phase4/7/9 to provider_declared:false.
- [x] **Item 2** — Screen now renders inside PageShell (NavBar + slim title row); global fixed mobile BottomTabBar (logged-in: होम/खोजें/पोस्ट करें/मेरी लिस्टिंग/प्रोफ़ाइल; logged-out: होम/खोजें/पोस्ट करें→login/लॉगिन); body gets mobile bottom padding + safe-area. Admin already had NavBar. Welcome/Join left standalone (not in item-2 list).
- [ ] **Item 3** — Browse: all 10 chips no h-scroll; Most-viewed filtered by category; agri_inputs investigation
- [ ] **Item 3A** — public browsing (no login to look); phone behind login w/ return path
- [ ] **Item 4** — Call + WhatsApp on every ListingCard and ListingDetail
- [ ] **Item 5** — Posting in 3 steps
- [ ] **Item 1** — one layout, edge to edge (PageShell default wide; remove per-page widths) — lowest priority
- [ ] **Verification** — full test suite, screenshots, preview deploy
- [ ] **Report** — BATCH1_REPORT.md + PROJECT_CONTEXT.md + KNOWN_ISSUES.md

## Judgement calls / notes
- (recorded as work proceeds)
