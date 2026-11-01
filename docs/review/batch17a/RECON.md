# Batch 17A - RECON (step 0)

Branch `release-17a` created from `origin/main` (a73d82c, has 16G and 16H). Checked on the branch, all present:

- `scripts/morning/run.mjs`, `scripts/morning/card/render.mjs`, `scripts/morning/card/template.html` (and bundled Noto Sans Devanagari fonts, both devanagari and latin faces).
- Admin page: `src/screens/AdminMorning.jsx`, `src/screens/admin/MorningView.jsx`, `src/lib/admin/morningApi.js`, `src/lib/admin/morningLogic.js`, `src/lib/i18n/morningStrings.js`.
- `morning_post_get`, `morning_post_history`, `morning_post_context`, `morning_post_upsert` bodies in `supabase/migrations/0070_morning_posts.sql`. Migrations 0071 and 0072 do not touch them.
- Workflow `.github/workflows/morning-post.yml` pins `MORNING_REF: release-16b` (to be removed in Part F).
- Baseline tests before any change: the only failure is the known `morning-16a` "no Devanagari text in the logic files" test (mandi.js has Devanagari outside comments).
- Staging SQL: the Supabase connector answered "You do not have permission to perform this action" for project wzxtqbqlahyahsnoqqva. Not worked around. Production was never accessed.
