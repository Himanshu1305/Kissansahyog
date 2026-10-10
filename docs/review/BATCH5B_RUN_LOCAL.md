# Batch 5B owner runbook

**Do not deploy until you have reviewed `docs/review/QA_BATCH5B_FOR_REVIEW.md`.**

In Git Bash, after reviewing and merging the branch:

```bash
git checkout codex/batch5b-qa
git pull origin codex/batch5b-qa
npm ci
node --env-file=.env scripts/seed-sawaal.mjs
npm run build:full
node scripts/verify-batch5b-citations.mjs
node scripts/test/batch4_qa_facts.mjs
node scripts/test/batch3_style.mjs
node --env-file=.env scripts/db.mjs query "select count(*) as published_sawaal from kisan_sawaal where is_published = true and slug is not null;"
```

The staging deployment command documented in this repository is:

```bash
npm run build && npx wrangler pages deploy dist --project-name kissansahyog
```

After deploying, spot-check three new `/sawaal/` pages. To roll back only this batch, run this SQL through the `db.mjs query` command above, replacing the example slugs with the Batch 5B slugs in `batch5b.json`:

```sql
update kisan_sawaal set is_published = false
where slug in ('sabzi-mein-drip-ka-labh', 'tamatar-grading-mein-kharab-phal', 'pmkisan-ekyc');
```

Then rerun `node --env-file=.env scripts/seed-sawaal.mjs` only after marking the same Batch 5B entries `unpublish: true` in the raw file; otherwise the seed will republish them.
