# Batch 5A local run

Run these in Git Bash on the computer that has the real `.env`. Review the
uncommitted changes before doing anything else. Do not deploy until reviewed.

```bash
git branch --show-current
# Expected: codex/batch5a-categories

npm ci

# Apply the one additive migration using the repo's documented migration runner.
npm run db migrate

# This uses Supabase to rebuild the search index, prerender public pages, and write sitemaps.
npm run build:full

node scripts/verify-batch5a.mjs
node scripts/test/batch3_style.mjs
node scripts/test/batch4_ui_style.mjs
node scripts/test/batch4_bazaar.mjs
node scripts/test/v2_seo_audit.mjs
node scripts/test/v11_phase6.mjs
node scripts/test/v2_citation_audit.mjs

# Run only after migration + a reviewed preview deployment. This test creates and cleans up listings.
npm run test:e2e -- e2e/batch5a.spec.js
```

Do not deploy until the owner has reviewed the category flow, the two Bazaar pages,
and the migration. Keep the standard test suite separate from the E2E command above:
the E2E test writes temporary records.

## Rollback notes

- Preview rollback: redeploy the previously reviewed preview build. This removes the
  new UI without changing existing listings.
- Database rollback: `0053` is intentionally additive. Do **not** delete listings to
  roll it back. Before any Building materials listing exists, a reviewed follow-up
  migration can restore the prior category CHECK list and the `create_listing` body
  from `0050_provider_declaration_hotfix.sql`. Once a Building materials listing
  exists, leave the additive database support in place and roll back only the app.
