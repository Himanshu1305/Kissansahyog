# Batch 6B progress

- [x] Verified the Batch 6A shared layout, ErrorBoundary and safe category helper are present.
- [x] Reworked `/post` into a compact responsive form plus sticky bento panel on desktop.
- [x] Added reusable `PromoBento`, central tile config, consent checklist, photo picker and map/location controls.
- [x] Added additive `0054_consents.sql`; it preserves the old `create_listing` signature and legacy disclaimer timestamp.
- [x] Added transport From/To, listing images/gallery, and the Land label/search synonyms.
- [x] Added verifier, report and UI string inventory. Build is environment-blocked by the checked-out Tailwind native binary; static verifier is used for this batch.
