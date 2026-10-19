# Batch 11A — prerendered text diff (SEO guard)

Baseline: `evidence/baseline-text/` (Phase 0 build). Final: `evidence/final-text/` (clean `build:full` of the Phase 4 head).
Tool: `node scripts/batch11a/text-snapshot.mjs diff` → `text-diff.json`.

Result: 268 pages both sides, none added or removed, **5 pages differ**: agro-forestry, articles, info, safalta, videos.
None is a page this batch touched (login / signup are not prerendered as content pages; no strings on public pages changed).
The same 5 pages differed in two separate clean builds.

Why: a pre-existing race in the prerender's "ready" marker — the snapshot can be taken while the page still shows
"थोड़ा रुकें…" or before its data block arrived. Proof, the prerender's own method (`__KS_PRERENDER`, wait for
`[data-prerender-ready="1"]`, read the page) run 3× on the FROZEN BASELINE build (:4211) and 3× on the FINAL build (:4212):

```
4211 0 /safalta:LOADING:675 /videos:ok:1744 /articles:LOADING:583 /info:ok:868 /agro-forestry:ok:2435
4211 1 /safalta:LOADING:675 /videos:LOADING:598 /articles:ok:1219 /info:ok:868 /agro-forestry:ok:2778
4211 2 /safalta:LOADING:675 /videos:LOADING:598 /articles:LOADING:583 /info:ok:1700 /agro-forestry:ok:3148
4212 0 /safalta:ok:786 /videos:LOADING:598 /articles:LOADING:583 /info:ok:868 /agro-forestry:ok:2435
4212 1 /safalta:LOADING:675 /videos:LOADING:598 /articles:LOADING:583 /info:ok:868 /agro-forestry:ok:3148
4212 2 /safalta:ok:786 /videos:LOADING:598 /articles:LOADING:583 /info:ok:868 /agro-forestry:ok:2435
```

The baseline build shows the same LOADING captures (/safalta, /videos, /articles) as the final build, and the text length
of /info and /agro-forestry varies run to run on both. A live render of /safalta (networkidle) is identical on both builds.
10G recorded the same effect for /safalta and /videos. **Intended changes in public prerendered text: none.** Fixing the
marker race is out of scope (BACKLOG).
