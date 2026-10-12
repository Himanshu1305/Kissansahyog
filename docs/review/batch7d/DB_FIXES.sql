-- Batch 7D — database content fixes. NOT APPLIED. Review, then run by hand
-- (staging first, then production). Every block is independent; run the SELECT
-- under each heading first to see exactly which rows it will touch.
-- Written from the STAGING database as read on 12 Oct 2026 (read-only SELECTs).
-- Production was not read: row ids there may differ, so the statements match on
-- slug / text, never on id alone, and each UPDATE is a no-op where nothing matches.

begin;

-- =====================================================================================
-- 4c. Kisan Sawaal — English of the Soil Health Card answers (table: kisan_sawaal)
-- =====================================================================================
-- Only English wording is changed; no fact, number or source is touched. The same
-- edits were made in src/content/qa/schemes.js and legacy.js so a re-seed keeps them.
-- Left alone on purpose: "Bo" for boron and "(physical properties)" for pH/OC/EC in the
-- 12-parameter line — that is how the scheme's own description words it.
--
-- Preview:
--   select slug, question_en, answer_en from public.kisan_sawaal
--   where slug in ('soil-health-card-kya-hai','soil-health-card-kaise','soil-health-card-languages',
--                  'soil-health-card-recommendations','mere-kheta-mitti-kaali-chikani-soyaabina-bone');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises which fertiliser to use and how much.',
                                      'A Soil Health Card is a report on your soil, given to farmers every two years free of cost. It shows the condition of your soil on 12 parameters and advises which fertiliser to use and how much.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises which fertiliser to use and how much.',
                                                        'A Soil Health Card is a report on your soil, given to farmers every two years free of cost. It shows the condition of your soil on 12 parameters and advises which fertiliser to use and how much.')::jsonb
 where slug = 'soil-health-card-kya-hai'
   and (answer_en like '%The Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises which fertiliser to use and how much.%' or answer_blocks_en::text like '%The Soil Health Card is a report card given to farmers every two years, free of cost. It tells the state of your soil on 12 parameters and advises which fertiliser to use and how much.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The Soil Health Card (SHC) is a report card given to farmers free every two years. It tells the state of their soil on 12 parameters.',
                                      'A Soil Health Card (SHC) is a report on a farmer''s soil, given every two years free of cost. It shows the condition of the soil on 12 parameters.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The Soil Health Card (SHC) is a report card given to farmers free every two years. It tells the state of their soil on 12 parameters.',
                                                        'A Soil Health Card (SHC) is a report on a farmer''s soil, given every two years free of cost. It shows the condition of the soil on 12 parameters.')::jsonb
 where slug = 'soil-health-card-kya-hai'
   and (answer_en like '%The Soil Health Card (SHC) is a report card given to farmers free every two years. It tells the state of their soil on 12 parameters.%' or answer_blocks_en::text like '%The Soil Health Card (SHC) is a report card given to farmers free every two years. It tells the state of their soil on 12 parameters.%');

update public.kisan_sawaal set question_en = 'How do I get my soil tested and read the Soil Health Card?'
 where slug = 'soil-health-card-kaise' and question_en = 'How to get soil tested and read the Soil Health Card?';

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The card states the status of each nutrient and how much fertiliser to use. Add fertiliser as per that.',
                                      'The card shows the level of each nutrient and how much fertiliser to use. Apply fertiliser as the card advises.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The card states the status of each nutrient and how much fertiliser to use. Add fertiliser as per that.',
                                                        'The card shows the level of each nutrient and how much fertiliser to use. Apply fertiliser as the card advises.')::jsonb
 where slug = 'soil-health-card-kaise'
   and (answer_en like '%The card states the status of each nutrient and how much fertiliser to use. Add fertiliser as per that.%' or answer_blocks_en::text like '%The card states the status of each nutrient and how much fertiliser to use. Add fertiliser as per that.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The card states the status of each nutrient and the fertiliser amount for the crop. Add fertiliser as per that advice.',
                                      'The card shows the level of each nutrient and the amount of fertiliser for the crop. Apply fertiliser as the card advises.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The card states the status of each nutrient and the fertiliser amount for the crop. Add fertiliser as per that advice.',
                                                        'The card shows the level of each nutrient and the amount of fertiliser for the crop. Apply fertiliser as the card advises.')::jsonb
 where slug = 'soil-health-card-kaise'
   and (answer_en like '%The card states the status of each nutrient and the fertiliser amount for the crop. Add fertiliser as per that advice.%' or answer_blocks_en::text like '%The card states the status of each nutrient and the fertiliser amount for the crop. Add fertiliser as per that advice.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'Agriculture staff take a soil sample from the field and it is tested in a lab.',
                                      'Agriculture staff take a soil sample from your field, and it is tested in a laboratory.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'Agriculture staff take a soil sample from the field and it is tested in a lab.',
                                                        'Agriculture staff take a soil sample from your field, and it is tested in a laboratory.')::jsonb
 where slug = 'soil-health-card-kaise'
   and (answer_en like '%Agriculture staff take a soil sample from the field and it is tested in a lab.%' or answer_blocks_en::text like '%Agriculture staff take a soil sample from the field and it is tested in a lab.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The card gives your soil''s status on 12 parameters and the fertiliser amount for the crop. It is free, every two years.',
                                      'The card shows the condition of your soil on 12 parameters and the amount of fertiliser for the crop. It is issued every two years, free of cost.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The card gives your soil''s status on 12 parameters and the fertiliser amount for the crop. It is free, every two years.',
                                                        'The card shows the condition of your soil on 12 parameters and the amount of fertiliser for the crop. It is issued every two years, free of cost.')::jsonb
 where slug = 'mere-kheta-mitti-kaali-chikani-soyaabina-bone'
   and (answer_en like '%The card gives your soil''s status on 12 parameters and the fertiliser amount for the crop. It is free, every two years.%' or answer_blocks_en::text like '%The card gives your soil''s status on 12 parameters and the fertiliser amount for the crop. It is free, every two years.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The Soil Health Card (SHC) is a report card that tells your soil''s status on 12 parameters. It is given to farmers free every two years.',
                                      'A Soil Health Card (SHC) is a report that shows the condition of your soil on 12 parameters. It is given to farmers every two years, free of cost.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The Soil Health Card (SHC) is a report card that tells your soil''s status on 12 parameters. It is given to farmers free every two years.',
                                                        'A Soil Health Card (SHC) is a report that shows the condition of your soil on 12 parameters. It is given to farmers every two years, free of cost.')::jsonb
 where slug = 'mere-kheta-mitti-kaali-chikani-soyaabina-bone'
   and (answer_en like '%The Soil Health Card (SHC) is a report card that tells your soil''s status on 12 parameters. It is given to farmers free every two years.%' or answer_blocks_en::text like '%The Soil Health Card (SHC) is a report card that tells your soil''s status on 12 parameters. It is given to farmers free every two years.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'The portal facilitates Soil Health Card generation in 22 languages and 5 dialects, with local units.',
                                      'The portal can generate a Soil Health Card in 22 languages and 5 dialects, using local units.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'The portal facilitates Soil Health Card generation in 22 languages and 5 dialects, with local units.',
                                                        'The portal can generate a Soil Health Card in 22 languages and 5 dialects, using local units.')::jsonb
 where slug = 'soil-health-card-languages'
   and (answer_en like '%The portal facilitates Soil Health Card generation in 22 languages and 5 dialects, with local units.%' or answer_blocks_en::text like '%The portal facilitates Soil Health Card generation in 22 languages and 5 dialects, with local units.%');

update public.kisan_sawaal
   set answer_en = replace(answer_en, 'A Soil Health Card provides nutrient status and recommendations on dosages of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments.',
                                      'A Soil Health Card shows the nutrient status of your soil and recommends doses of fertilisers, bio-fertilisers, organic fertilisers and soil amendments.'),
       answer_blocks_en = replace(answer_blocks_en::text, 'A Soil Health Card provides nutrient status and recommendations on dosages of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments.',
                                                        'A Soil Health Card shows the nutrient status of your soil and recommends doses of fertilisers, bio-fertilisers, organic fertilisers and soil amendments.')::jsonb
 where slug = 'soil-health-card-recommendations'
   and (answer_en like '%A Soil Health Card provides nutrient status and recommendations on dosages of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments.%' or answer_blocks_en::text like '%A Soil Health Card provides nutrient status and recommendations on dosages of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments.%');

-- One more English slip in the same answer: "the nearby" office.
update public.kisan_sawaal
   set answer_en = replace(replace(answer_en, 'at the nearby agriculture office', 'at your nearest agriculture office'), 'at the nearby Krishi Vigyan Kendra', 'at your nearest Krishi Vigyan Kendra'),
       answer_blocks_en = replace(replace(answer_blocks_en::text, 'at the nearby agriculture office', 'at your nearest agriculture office'), 'at the nearby Krishi Vigyan Kendra', 'at your nearest Krishi Vigyan Kendra')::jsonb
 where slug in ('soil-health-card-kaise', 'mere-kheta-mitti-kaali-chikani-soyaabina-bone');

-- =====================================================================================
-- 4d. Kisan Mela — a card that reads "India, Uttar Pradesh" (table: kisan_mela)
-- =====================================================================================
-- Cause: the discovery job stored the COUNTRY as the venue (or as the state). The site
-- printed venue + state, so the card read "India, Uttar Pradesh".
-- Fixed in code: cards now drop a country-only part and show the district
-- (src/lib/mela/melaFormat.js melaPlace), and the job refuses such rows from now on
-- (scripts/mela/pipeline.mjs). The rows already stored still need correcting.
--
-- Find every affected row (run this on production too):
--   select id, name_en, name_hi, venue, district, state, source_url
--   from public.kisan_mela
--   where lower(trim(venue)) in ('india','bharat','भारत') or lower(trim(state)) in ('india','bharat','भारत');
--
-- Staging has two:
--  (1) "Vibrant Krishika Expo 2026" — venue 'India', district Gorakhpur, state Uttar Pradesh.
--      Its own description and coordinates (26.74, 83.42) say Gorakhpur, Uttar Pradesh, so on
--      staging this is NOT a Madhya Pradesh mela. Only the venue is wrong.
update public.kisan_mela set venue = 'Gorakhpur'
 where name_en = 'Vibrant Krishika Expo 2026' and lower(trim(venue)) = 'india';
--  (2) "Rashtriya Krishi Mela, Raipur" — venue Raipur, state stored as 'India'. Raipur is in
--      Chhattisgarh. CHECK the source page before running: I did not open it.
update public.kisan_mela set state = 'Chhattisgarh', district = coalesce(district, 'Raipur')
 where name_hi = 'Rashtriya Krishi Mela, Raipur' and lower(trim(state)) = 'india';
-- If production shows a mela that is really in Madhya Pradesh under the wrong state, it is
-- a different row from these two: correct it the same way, e.g.
--   update public.kisan_mela set state = 'Madhya Pradesh', district = '<district>', venue = '<venue>' where id = '<id>';

-- =====================================================================================
-- 4f. Article byline (table: articles, column: author_name)
-- =====================================================================================
-- Affected: ONE row.
--   slug 'intercropping-madhya-pradesh'  ("Intercropping: A Practical Guide for Madhya Pradesh
--   Farmers"), id on staging 225c6f6f-7c2e-4662-83eb-93a2908ec277.
--   Current value (stored in Devanagari): 'श्री ए.के. दीक्षित'  — i.e. "A.K. Dixit".
-- Preview:  select id, slug, author_name from public.articles order by created_at;
update public.articles set author_name = 'USD Vision AI Team'
 where slug = 'intercropping-madhya-pradesh';
-- NOTE: the other two published articles ('parali-pollution-kisaan-ki-majboori',
-- 'kisaan-carbon-credit-kya-hai') and the admin form default use 'Team Kissan Sahyog', not
-- 'USD Vision AI Team'. If you want one byline everywhere, use ONE of these instead:
--   update public.articles set author_name = 'Team Kissan Sahyog' where slug = 'intercropping-madhya-pradesh';
--   update public.articles set author_name = 'USD Vision AI Team';   -- all three articles

-- =====================================================================================
-- 1. "Free" wording that lives in the database (found in the seed migrations)
-- =====================================================================================
-- One row makes a claim about OUR service: the /mausam page FAQ about the WhatsApp
-- update says "free during the pilot" (table page_faqs, seeded by migration 0024).
-- Preview:
--   select page_key, q_hi, a_hi, a_en from public.page_faqs
--   where a_hi like '%पायलट के दौरान यह मुफ़्त है%' or a_en like '%It is free during the pilot.%';
update public.page_faqs
   set a_hi = replace(a_hi, ' पायलट के दौरान यह मुफ़्त है।', ''),
       a_en = replace(a_en, ' It is free during the pilot.', '')
 where a_hi like '%पायलट के दौरान यह मुफ़्त है%' or a_en like '%It is free during the pilot.%';
-- Everything else "free" in the database describes a government scheme or helpline
-- (soil testing, drone training, KVK advice, PM-KISAN registration) and is kept.

-- Look at the row counts reported above, then:
commit;
-- or: rollback;
