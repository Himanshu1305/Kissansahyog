# Batch 6C report

## Done

- Rewrote all 17 Batch 5C Q&As in the JSON source and regenerated `src/content/qa/batch5b.js`.
- Added bilingual structured blocks, citations, official source verification dates, related Sawaal links and one internal tool link per record.
- Added a 16-clause bilingual Terms draft, wide readable page layout and sticky desktop table of contents.
- `node scripts/verify-batch6c.mjs` passes.

## Per-Q&A audit

| slug | Hindi word count | official source used | could not verify |
|---|---:|---|---|
| bis-complaint-channels | 305 | BIS consumer FAQ | No additional claim included. |
| sabzi-low-cost-postharvest | 348 | Small-Scale Postharvest Handling Practices | No additional claim included. |
| sabzi-packing-chot | 336 | Small-Scale Postharvest Handling Practices | No additional claim included. |
| enam-farmer-app-register | 355 | e-NAM Farmers Module | No additional claim included. |
| enam-my-lots-history | 367 | e-NAM Farmers Module | No additional claim included. |
| enam-auction-accept-reject | 351 | e-NAM Farmers Module | No additional claim included. |
| enam-trader-registration-ways | 345 | e-NAM Traders | No additional claim included. |
| enam-trader-registration-fee | 352 | e-NAM Traders | No additional claim included. |
| enam-transparent-bidding | 352 | e-NAM Traders | No additional claim included. |
| kcc-timely-flexible-credit | 384 | Modified Interest Subvention Scheme | Individual eligibility, terms, or approval; confirm with bank/NABARD. |
| kcc-warehouse-receipt-credit | 380 | Modified Interest Subvention Scheme | Individual eligibility, terms, or approval; confirm with bank/NABARD. |
| nabard-production-credit | 382 | NABARD Department of Refinance | Individual eligibility, terms, or approval; confirm with bank/NABARD. |
| nabard-credit-drawal-period | 376 | NABARD Department of Refinance | Individual eligibility, terms, or approval; confirm with bank/NABARD. |
| nabard-calamity-conversion | 378 | NABARD Department of Refinance | Individual eligibility, terms, or approval; confirm with bank/NABARD. |
| soil-health-card-languages | 344 | Soil Health Card Portal | No additional claim included. |
| soil-health-card-recommendations | 356 | Soil Health Card Portal | No additional claim included. |
| soil-health-card-workflow | 360 | Soil Health Card Portal | No additional claim included. |

## Needs owner decision before publishing

- `kcc-timely-flexible-credit`
- `kcc-warehouse-receipt-credit`
- `nabard-production-credit`

These are the three bank/NABARD-facing Q&As requested for owner decision. The two additional NABARD refinance records stay published as previously configured; their unverified operating detail is recorded in the audit table. No `published` status was changed.

## Not done and why

- No database seed, migration, deployment, commit, or full build was run, as required. The owner will run the seed and full build.
