# BATCH 6C — Content: rewrite the 17 thin Sawaal answers + a full Terms draft

You are the builder. The architect/reviewer (Claude) reviews afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).
Start from the branch the owner tells you (after 6A and 6B are merged). Create `codex/batch6c-content`.

## 0. Rules

- Do NOT `git commit`, do NOT deploy, do NOT run migrations, do NOT write to the database.
  (The owner re-runs `node --env-file=.env scripts/seed-sawaal.mjs` himself afterwards.)
- Never read/print/commit `.env` or secrets.
- No made-up facts. This is the most important rule of this batch. Every factual statement
  (eligibility, amounts, deadlines, documents, steps, portal names, helpline numbers, languages
  supported, who to contact) must come from an OFFICIAL source (government/ICAR/NABARD/bank/KVK
  portal/PIB/gazette). Fetch the source URLs already present in each record's `sources`, and search
  for the official page if needed (you have network access in the sandbox). If you cannot confirm a
  detail from an official source, LEAVE IT OUT — never guess. Where a rule varies by state or
  changes often, say so and tell the farmer where to confirm (e.g. "अपने जिले के KVK / कृषि विभाग से
  पुष्टि करें").
- No legal, financial or investment advice. For bank/NABARD/loan/subsidy topics describe the
  official process only and tell the farmer to confirm with the bank/office.
- Hindi first, plain farmer-friendly Hindi (short sentences, no heavy Sanskritised words), with the
  English text alongside as the repo requires. No "under review" labels in the UI.
- Pre-existing failing tests to leave alone: `v11_phase6`, `v2_citation_audit`, `batch4_ui_style`.
  Do not delete/skip/loosen tests. Windows: use `pathToFileURL(...).href` for dynamic imports.
- Keep `docs/review/BATCH6C_PROGRESS.md` updated. At the end write `docs/review/BATCH6C_REPORT.md`
  (done / not done and why / per-Q&A table: slug, word count, sources used, anything you could
  NOT verify) and a verifier `scripts/verify-batch6c.mjs` (PASS/FAIL), output saved UTF-8 to
  `docs/review/BATCH6C_VERIFY_OUTPUT.txt`.

## 1. Task C1 — Rewrite all 17 Q&As in place

Where: source of truth is `docs/research/qa_raw/batch5b.json`; `scripts/build-qa.mjs` generates
`src/content/qa/batch5b.js` from it. Edit the JSON, then run the builder. KEEP every `slug`
(the URLs must not change), the question, the category and the ids. Today every record has
`short_hi` of only 13–25 words and 0 `blocks`, so the pages look empty.

Owner's complaint (quote): pages like `/sawaal/enam-trader-registration-ways`,
`/sawaal/soil-health-card-languages`, `/sawaal/soil-health-card-recommendations` are "thin and
useless". Do these three FIRST as the model for the rest.

For EACH of the 17 records produce:

1. `short_hi` / short English: a direct 1–2 sentence answer (this is what search snippets and the
   homepage card show).
2. `blocks` (check `src/screens/SawaalDetail.jsx` and existing records in other batches for the
   block types the renderer supports; if a needed type — numbered steps, bullet list, callout —
   is missing, add it to the renderer in the same visual style). Target 250–400 words of Hindi
   body in total, structured as:
   - "यह क्या है" (what it is, 2–3 sentences)
   - "कौन ले सकता है" (who is eligible) — only if relevant
   - "कैसे करें" (numbered steps, each step one action)
   - "कौन-से कागज़ चाहिए" (documents list) — only if relevant
   - "कहाँ जाएँ / किससे मिलें" (portal, office, helpline — only verified ones, with the link)
   - "ध्यान रखें" (1–3 short cautions: scams, state differences, dates that change)
   Leave out any section that does not apply instead of padding.
3. `sources`: at least 1 official source with URL and title, plus a "last verified" date
   (today's date in ISO). Keep the existing source entries unless wrong.
4. `related`: 2–3 related Sawaal slugs from the same set, and where natural, 1 internal tool link
   (mandi prices, schemes, KVK, weather) using routes that exist in the router. Render them as a
   "ये भी देखें" block (internal linking is a goal).
5. English version of the same content (shorter is fine, but complete: same sections).

Handle the 3 NABARD / bank-facing Q&As with extra care: describe only the official process and
include "बैंक या NABARD कार्यालय से पुष्टि करें". List these three slugs in the report under
"Needs owner decision before publishing" (the owner has not yet decided whether to publish them).
Do NOT change their `published` status yourself.

PM-KUSUM / any scheme whose status you cannot confirm as currently open: write what the official
page says today, with its date, and say that the farmer must check the official portal for
current status. Do not claim it is open or closed unless the official source says so.

After editing: run `node scripts/build-qa.mjs`, rebuild nothing else (the owner runs the seed and
full build). Verify the generated `src/content/qa/batch5b.js` matches the JSON.

## 2. Task C2 — Verifier for content quality

`scripts/verify-batch6c.mjs` must FAIL if any of the 17 records: has fewer than 250 Hindi words in
total (`short_hi` + blocks), has fewer than 3 blocks, has no source with a URL, has no English
text, lacks a last-verified date, changed its slug, or contains any of these banned words/phrases
in Hindi or English: "guaranteed", "100%", "pakka milega", "गारंटी", "पक्का मिलेगा", "सबसे अच्छा
बैंक". Also fail if two records share the same first 80 characters of body (copy-paste padding).
Print the word count per slug.

## 3. Task C3 — A proper Terms of Use (draft)

`src/screens/Terms.jsx` renders `termsOfUse` from `src/lib/i18n/legal.js` (10 short clauses,
~270 words) plus a "legal review pending" banner. Owner: "very thin; add more."

1. Rewrite `termsOfUse` as about 15–18 numbered clauses in Hindi and English, at roughly 1,200–1,800
   words per language, in plain language. Cover: what Kisan Sahyog is (a free notice board that
   connects people; not a party to deals); who may use it; accounts and phone/OTP; what may be
   posted and what may not (illegal items, fraud, misleading photos/prices, other people's
   details without consent); no verification of listings or users; no payments through the
   platform and the user's responsibility to check before paying; categories with special care
   (building materials/sand/gravel: seller must hold permissions; equipment/transport safety;
   labour: wages are between the parties; land: no title verification, check records yourself;
   warehouse/greenhouse; agri inputs: only licensed items); photos you upload (you confirm they
   are yours); how we may remove or hide a listing; reporting a listing or grievance (link to the
   existing Grievance page); privacy (link to `/privacy`) and what contact details are shown to
   whom; advice and information on the site (Sawaal, schemes, mandi) is general information, not
   professional/legal/financial advice, check official sources; availability and changes to the
   service; limitation of liability (no promise of earnings or availability); governing law
   (Indian law, courts at Sagar, Madhya Pradesh — mark this exact clause with a comment for the
   lawyer to confirm); contact details; effective date and version.
   Use ONLY facts about the platform that are true in this repo today (free service, pilot in
   Sagar, no payment processing). Do not invent company registration numbers or addresses; use
   only "USD Vision AI LLP" and the existing contact email/phone already shown elsewhere in the
   repo.
2. Remove the "legal review pending" banner from the Terms page UI (the owner does not want
   "under review" labels). Instead create `docs/legal/TERMS_DRAFT_FOR_LAWYER.md`: the full text in
   both languages plus a short list of open points for the lawyer (governing law/jurisdiction,
   limitation of liability wording, sand/gravel permission wording, land listings wording, labour
   wording, data retention).
3. The Terms page uses the wide shared frame from 6A with a readable text column inside, a
   sticky table of contents on desktop (anchor links for each clause), and a "last updated"
   line. The consent item #4 on /post links to `/terms`; make sure that link works.
4. Add a verifier check: Terms has at least 15 clauses in both languages, no empty clause, and
   no hard-coded Devanagari in `Terms.jsx` (text comes from `legal.js`).

## 4. Definition of done

- `node scripts/verify-batch6c.mjs` passes 0 failed; existing tests unchanged.
- Report has the per-Q&A table and the "could not verify" list.
- Nothing committed, nothing deployed, DB untouched, no secrets touched.
- Owner will run: `node --env-file=.env scripts/seed-sawaal.mjs`, then `npm run build:full`,
  then deploy to the preview.
