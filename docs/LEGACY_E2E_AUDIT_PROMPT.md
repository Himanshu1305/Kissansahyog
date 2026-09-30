# Kisan Sahyog — Legacy E2E Test Audit (Catalog Only, No Fixes)

DO NOT ask for approval or questions. Decide and proceed. Read KNOWN_ISSUES.md for the existing note on these 23 pre-existing failures (legacy v1 E2E specs, phase2–phase9) before starting.

**Repo:** https://github.com/Himanshu1305/Kissansahyog

**This prompt produces an audit document only. Do not rewrite, fix, retire, or modify any test code, any application code, or any test file in this prompt.** The goal is a clear catalog the owner can review and make case-by-case decisions from — not a fix.

---

## Task

**Before starting: run a fresh build (`npm run build`) and observe test failures against that fresh output — not against any existing `dist/` folder that may already be present.** This project has previously drawn a wrong conclusion by comparing new work against a stale, git-ignored `dist/` build during a baseline check; do not repeat that here.

**For each of the 23 failing tests: do not assume it's a harmless stale-selector issue just because it's old.** This project has twice already mislabeled a real functional regression as "pre-existing, unrelated" (a mandi-price API filter bug, and a misclassified PWA test) — only to find on closer inspection that the failure was pointing at an actual bug. Before writing the recommendation for each test, actually exercise the current live/preview behavior it's testing (click through the real flow, don't just read the code) to rule out a genuine regression hiding behind an assumed "it's just outdated" framing.

For each of the 23 currently-failing legacy E2E tests across `phase2` through `phase9`, produce an entry with:

1. **Test name/file and what it asserts** — read the actual test code, state plainly what user flow or behavior it was written to verify (e.g. "asserts a button labeled 'नया खाता बनाएं' exists on the landing screen to start registration").

2. **Why it currently fails** — the specific, concrete reason (e.g. "the button now uses `t('new_user')` and different styling after the homepage redesign", or "the screen/step this test targets no longer exists in the current registration flow", or "the flow exists but the DOM structure/selector changed"). Where possible, note which build/redesign the drift traces back to (a quick `git log`/`git blame` check on the relevant app file is enough — this isn't required to be exhaustive, just directionally useful).

3. **Does the underlying flow still exist today, in some form?** — Yes/No/Partially, confirmed by actually testing it live, not just inferring from code. If yes or partially, briefly describe how the equivalent flow works now and where in the current codebase it lives.

4. **Is this flow already covered by a newer, currently-passing test?** — check the existing permanent test suite (the p_00xx and phase10+ specs added across all the builds this session) for overlap. If a newer test already covers the same user-facing behavior, say so explicitly and name it.

5. **Recommendation — pick exactly one:**
   - **Rewrite** — the flow still exists and matters, but this test's selectors/assertions are stale; it should be updated to match current reality, not retired.
   - **Retire** — the flow it tests has been genuinely superseded or removed by later builds (the homepage redesign, geofencing/location rework, the rules-compliance checkbox, Land acreage changes, etc.); keeping or patching this test would mean testing something that no longer conceptually exists.
   - **Merge** — a newer test already covers this exact behavior; this one is redundant and should be removed rather than duplicated.
   - **Uncertain — flag for owner decision** — genuinely unclear which of the above applies; explain the ambiguity plainly rather than guessing.
   - **Real bug found** — the investigation in the caution above turned up an actual functional regression, not just a stale test. Flag this clearly and separately from the other four categories — this is the most important possible outcome of this audit and must not get buried in a "retire" or "rewrite" label.

**Be honest and specific in every entry — no generic "outdated, needs update" placeholders.** Each entry should be detailed enough that the owner can make a real decision without re-reading the test code themselves.

---

## Output

Write `docs/review/LEGACY_E2E_AUDIT.md` with:
- A summary table at the top: test name | current flow exists? | already covered elsewhere? | recommendation (including a clearly visible flag on any "Real bug found" entries)
- The full detailed entry (points 1-5 above) for each of the 23 tests below the table
- A short closing section grouping the recommendations by count (e.g. "14 recommended for rewrite, 6 for retirement, 3 for merge, 0 real bugs found") so the scale of each category is clear at a glance — call out explicitly if any real bugs were found, since that changes what happens next

Do not create a follow-up prompt, do not start implementing any recommendation, do not touch any test or application file. Stop after writing the audit document and report the summary counts back.
