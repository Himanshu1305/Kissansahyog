# Batch 5B owner runbook

**Do not seed or deploy until you have reviewed `docs/review/QA_BATCH5B_FOR_REVIEW.md`.**

In Git Bash on the computer that holds `.env`:

```bash
git checkout codex/batch5b-qa
git pull origin codex/batch5b-qa
node scripts/verify-batch5b-citations.mjs
node scripts/verify-batch5b-citations.mjs --live
node --env-file=.env scripts/seed-sawaal.mjs
npm run build:full
node scripts/test/batch4_qa_facts.mjs
node scripts/test/batch3_style.mjs
node scripts/test/v11_phase6.mjs
node scripts/test/v2_citation_audit.mjs
node --env-file=.env scripts/db.mjs query "select count(*) as published_batch5b from kisan_sawaal where is_published = true and slug in (select slug from kisan_sawaal where slug like 'bis-%' or slug like 'enam-%' or slug like 'kusum-%' or slug like 'kcc-%' or slug like 'nabard-%' or slug like 'soil-health-card-%' or slug like 'sabzi-%');"
```

This repair contains 23 Q&As. To roll back only this batch, use the complete slug list in `docs/research/qa_raw/batch5b.json`:

```sql
update kisan_sawaal set is_published = false
where slug in ('bis-scheme-one-marks', 'enam-farmer-app-register', 'kusum-three-components');
```

The shown slugs are examples: include all 23. Do not rerun the seed after rollback unless those Q&As are marked `unpublish: true`.
