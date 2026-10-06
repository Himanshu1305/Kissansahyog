-- V2 Phase 12 — expand kisan_sawaal.category to cover knowledge-base topics
-- (disease, nutrient, weed, variety, sowing, irrigation, harvest, soil, mandi,
-- storage) in addition to the legacy community categories.
alter table public.kisan_sawaal drop constraint if exists kisan_sawaal_category_check;
alter table public.kisan_sawaal add constraint kisan_sawaal_category_check
  check (category = any (array[
    'land','equipment','crop','pest','weather','market','scheme','drone_didi','general',
    'disease','nutrient','weed','variety','sowing','irrigation','harvest','soil','mandi','storage'
  ]));
