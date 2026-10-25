# Batch 10D — progress

- [x] Precondition: release-10c has src/features/guide, SHIP.md, ship-prod-10c.sh; prod-10c tag exists (10C shipped and closed). Branch release-10d created from release-10c head 0c7379f.
- [x] A baseline (subagent; verified BASELINE.md): LCP 9880 ms, CLS 0.661, TBT 552 ms, main 27,576 B gz, e2e 76/47 (old 70/23 + guide 6/24 from B17). Scripts in scripts/batch10d/.
- [x] B + B2 live hero (subagent; verified: diff, 1280x720 + 412 screenshots): I-need y 1490 (≤1504), main +70 B gz, LiveStage 820 B gz, photo phone 0 / desktop 1, no overflow 320–1440. Decisions 8–19.
- [x] C band + crops + facts + reveal (subagent; verified band 360/1280 screenshots): facts 11/10/6/4 from repo files (decisions 20–27), main entry +108 B gz total, /guide scene byte-identical.
- [x] D SEO safety (subagent; rerun by me: seo-diff exit 0): nothing lost; title/meta/canonical/JSON-LD/h1/h2/sitemaps unchanged; hero copy 2→1 duplicates expected; all new text in strings.js.
- [x] E tests + perf gates (subagent): home-10d spec 32/32; LCP 3,024 vs 7,092 ms (same-session baseline), CLS 0.0098 vs 0.860, 0 long tasks in auto-play, main +182 B gz, LiveStage 821 B gz; fixes: hero CSS into main stylesheet (dec 28), CLS preload fix in main.jsx/App.jsx (dec 29); full e2e 155: 109/46, no new failures. REPORT.md: content handed to orchestrator (subagent write blocked). F NOT-RUN.
- [x] F staging af949ffd (home spec 32/32 on staging, perf recorded), ship/rollback scripts + dry runs OK, SHIP.md. Real ship NOT-RUN (founder).
