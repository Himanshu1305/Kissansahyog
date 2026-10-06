# KISSAN SAHYOG — BATCH 3: Content in natural Hindi and English (preview only)

Repo: `~/projects/Kissansahyog` (Mac, macOS Terminal). **Launch is in about 1 day.** Read `docs/review/BATCH2_REPORT.md` first. Batches 1 and 2 (structure, layout, marketplace pages) are done. Do not change layout or features in this batch. This batch is **words only**.

## The problem to fix
The owner called the content "pathetic":
- The Hindi reads like a translation of English: bookish, long sentences, essay-like padding.
- The English reads like a translation of the Hindi.
- Pages are long, but give the reader little they can act on.

The readers are farmers, vendors and machine owners around Sagar (Bundelkhand, MP), mostly on phones. Some are officials, for the carbon page.

## Hard rules
1. **Preview only.** The only deploy allowed is:
   `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview`
2. **No new facts from memory.** Every number, date, ₹ amount, scheme rule, chemical name or dose, law, or court ruling must come from `docs/research/SOURCES.md` / `src/content/sources.js` and keep its `cites`. `v2_citation_audit` must stay green.
   - **Rewording is allowed. Changing a fact is not.**
   - If a paragraph has a fact you cannot trace to a source, delete that fact.
   - To add a new fact (new Q&As only), open the source, quote it into `SOURCES.md`, then use it. This is the fetch-and-quote rule in `MASTER_BUILD_V2_PROMPT.md` §0.2(4).
3. **Do-not-publish lists still apply:** `MASTER_BUILD_V2_PROMPT.md` §0.7 and the dossiers. Never say or hint that carbon trading was "allowed" anywhere. The byline is **Team Kissan Sahyog**. No "under review" labels.
4. No layout, route, feature or database schema changes. The only database writes are Q&A rows: content, English fields, and new Q&As. Commit and push after each item (`Batch3 item N: …`), and keep `docs/review/BATCH3_PROGRESS.md` (resume from the first unticked item). Work autonomously.
5. **Priority order:** 1 → 2 → 3 → 4 → 5 → 6 → 7. Commit after every item. **Write `BATCH3_REPORT.md` only when items 1–6 and the review pack are complete** (item 7 is optional). The runner treats the report as "batch finished".
8. **The live site shares this database.** kissansahyog.com still runs the old (pre-V2) app against the same Supabase project. **Every database change must keep the live app working:** additive columns only; RPC changes only with new parameters that have defaults; never make an existing parameter or `details` field newly required; never rename or remove anything the old app reads. (A V2 change already broke posting on the live site once; it was hot-fixed by migration 0050.) Before applying each migration, check the old app's calls with `git show ba455ae:src/...`, and record in the progress file why the migration is safe.
9. **Tests:** if a feature is intentionally removed (for example, the claim UI), you may delete or replace its tests. Write each change and the reason in the progress file. Otherwise, counts must not drop.
10. **Hard stop:** if you are truly blocked (missing credentials, a failing migration you cannot fix safely, the build impossible to recover), write the reason to `docs/review/BATCH3_BLOCKED.md`, commit and stop.
11. **Q&A rows are live:** the live site reads `kisan_sawaal` too, so rewritten answers appear there immediately. That is fine. But only unpublish a row when its facts truly cannot be sourced, and list every unpublished row in the report so the owner knows.

## Item 1: Style guide, then a sweep of all UI text
Create `docs/content/STYLE_GUIDE.md` and follow it for every word in this batch.

**Hindi (write it first, never translate it from English):**
- Write the way an educated person from Sagar talks to a farmer: simple everyday Hindi, with common English words where people actually use them (ट्रैक्टर, मशीन, ऑनलाइन, पोर्टल, सब्सिडी, लोन, मोबाइल).
- Address the reader as **आप**. Use active voice and short sentences: aim for 15 words or fewer, and never more than 22. One idea per sentence.
- **Avoid these words; use the plain word instead:**

  | Avoid | Use |
  |---|---|
  | सूचीबद्ध करें | डालें / लिस्ट करें |
  | उपयुक्त | सही |
  | प्रस्तुत | रखना |
  | एकरूपता | (drop it) |
  | मूल विचार | (drop it) |
  | बशर्ते | अगर |
  | अत्यधिक | बहुत |
  | उपलब्ध कराना | देना |
  | सुनिश्चित करें | पक्का करें |
  | क्रियान्वयन | लागू करना |
  | हेतु | के लिए |
  | एवं | और |
  | तथा | और |
  | द्वारा | (rephrase) |
  | जुगत | (drop it) |
  | मिसाल | उदाहरण |
  | नवाचार | नया जुगाड़ / नई मशीन (in plain text) |

  Add more pairs as you find them.
- Each paragraph answers a real question a farmer would ask: what is it, how much will I get, where do I apply, what papers are needed, what can go wrong, who do I call. **Cut any paragraph that doesn't answer something.**
- Prefer lists, small tables and steps over long paragraphs. Put numbers in Indian format (₹1,50,000).

**English (written separately, for an English reader):**
- Plain, short and direct. Write it from the same facts, not by translating the Hindi sentence by sentence.

**The read-aloud test:** before committing any page, read 5 random paragraphs aloud in your head. If any sounds like a government circular or a translation, rewrite it.

**Then sweep `src/lib/i18n/strings.js`:** fix every Hindi and English UI string that breaks the guide. Buttons, labels, errors, empty states and disclaimers stay short. Keep keys unchanged. Examples already flagged by the owner include ungrammatical or stiff phrases. Search for the avoid-list words above.

## Item 2: Kisan Sawaal answers
- **English for every published Q&A:** fill `question_en`, `answer_en` and `answer_blocks_en`, written fresh from the same cited facts. Keep the same `cites`.
- **The 19 legacy rows:** rewrite each into the structured format:
  1. Short answer.
  2. Signs / how to identify.
  3. What to do, in order: cultural → biological → chemical.
  4. Prevention.
  5. When to call KVK Sagar.

  Only keep facts you can source: fetch and quote a source into `SOURCES.md` (ICAR, KVK, state agriculture department, SAU or TNAU pages). **Name chemicals and doses only exactly as written in the cited source**, always with "लेबल पर लिखी मात्रा ही उपयोग करें". If a fact cannot be sourced, remove it. If a whole answer cannot be sourced, unpublish that row and list it in the report.
- **The 40 V2 Q&As:** rewrite their Hindi to the style guide. Same facts and cites.
- Add a **"संक्षेप में"** short answer of at most 50 words to every Q&A (in Hindi and English).

## Item 3: Greenhouse guide (`/greenhouse/subsidy`) — target 1,000–1,500 Hindi words
Rewrite in this order:
1. Is a polyhouse right for me? A 6-point checklist.
2. What it costs and what subsidy you get (MP state scheme and MIDH): a table with the cites. Keep the calculator.
3. **How to apply on MPFSTS, step by step** (numbered), including documents and timelines as verified.
4. The NHB central change (50% to 35%), stated clearly as separate from the MP scheme.
5. Before paying any vendor: the safety checklist, plus the Khargone fraud in two lines.
6. Vendor lists by year, as currently labelled.
7. Up to 10 FAQs.

Write the English separately.

## Item 4: Jugaad guide (`/jugaad/jankari`) — target 800–1,200 Hindi words
1. What you can list here, with examples.
2. Where to get help: NIF, MVIF, NIDHI-PRAYAS, Seed Fund, MP Startup Policy and CFMTTI Budni. One short card each: what it is, who it's for, and the link.
3. Safety and law in plain words: the road-vehicle rule (the two Supreme Court cases, one line each), machine safety, the seller's responsibility, and patents explained in two lines with no offer of help.
4. How Kissan Sahyog will try to help, in the soft wording already agreed (no named institutions).
5. Up to 8 FAQs.

Cut everything else.

## Item 5: Carbon credit page (`/carbon-credit`) and brief (`/carbon-credit/niti-sujhav`) — target 1,500–2,000 Hindi words
Keep the question format and the owner's purpose: thought-provoking, a balanced case for MP, and readable by officials. Rewrite in this order:
1. What a carbon credit is: 5 lines, with one Sagar-relevant example.
2. What has happened in India: the verified examples, each with its `<PastExampleNote/>` / `<Calc/>`.
3. What can work in Sagar / Bundelkhand.
4. Arguments for and against, as a two-column table.
5. Risks and red flags before signing anything: a checklist.
6. What MP could do: the policy options.
7. The poll and suggestions box (unchanged).
8. Up to 10 FAQs.

The printable brief stays at 1–2 pages and matches the new wording. The English is written separately.

## Item 6: Smaller pages and lines
- `/cold-storage` intro, the "how to choose" bullets, and the district intros.
- `/fasal-salah`: the `cropadv_<slug>` lines. Reword them only, keeping the same facts. Each crop gets 3–5 short bullet points for this season.
- The homepage hero and section intros, `/grievance`, the Terms and Privacy wording (keep the legal meaning, use simpler words), and the intros for `/greenhouse`, `/jugaad` and `/bazaar/*`.

## Item 7: New Q&As (only if time allows)
- Take the next most-asked questions from `docs/research/QA_DEMAND.md`. Target **up to 40** more, prioritised by crop and season: rabi sowing now, so wheat, chana, masoor and mustard first.
- Fetch and quote every fact. Skip any question you cannot source, and list it.
- Write the Hindi and English from the start, following the style guide, with meaningful slugs.
- Update the sitemap and search index.

## Owner review pack (required)
Write `docs/review/CONTENT_FOR_REVIEW.md` for a local Hindi reader (the owner's family member) to check before launch:
- A list of every page or Q&A changed, with its preview URL.
- For each one, the 3 sentences you are **least sure** sound natural.
- The words or phrases you chose where two options were close, so the reader can pick.

## Verification (before deploying)
- Run `v2_citation_audit`, `v2_seo_audit`, `v11_phase6`, the full backend suite, `npm run test:e2e` and `npm run build:full`. All green. Titles and meta descriptions must still be within their length limits and unique.
- Add `scripts/test/batch3_style.mjs`:
  - It fails if any avoid-list word appears in Hindi text in `src/content/**`, `strings.js` or the Q&A seed files. Allow exceptions with a marker comment.
  - It reports average and maximum sentence length per page. Fail if any page averages more than 18 words per sentence.
- Take screenshots of the rewritten pages at 375×812 and 1280×800 (`docs/review/shots-batch3/`), and check that headings, tables and lists render well.
- Deploy the preview and check that the routes return 200 and that the prerendered HTML contains the new text.

## Report
Write `docs/review/BATCH3_REPORT.md` with these sections:
- What was rewritten, with word counts before and after per page.
- How many Q&As now have English.
- Legacy Q&As fixed or unpublished.
- New Q&As added and skipped.
- Style-test results.
- The preview URL.
- An **8-point phone checklist** for the owner.
