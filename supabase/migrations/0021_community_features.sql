-- Kisan Sahyog — 0021 Community features: Kisan Sawaal (Q&A), Kisan Safalta
-- (success stories), Sarkari Yojana (government schemes directory).
--
-- Same admin-managed-CMS pattern as `articles`/`resources` (0012/0013/0016):
--   * public read of published/active rows via anon RLS SELECT policies
--   * admin writes via is_admin-checked SECURITY DEFINER RPCs (require_admin, 0012)
-- PLUS a constrained anon INSERT path for the two public submission forms
-- (Sawaal "ask a question", Safalta "share your story"): anon may INSERT but the
-- WITH CHECK forces is_published = false, so submissions are never publicly visible
-- until an admin reviews + publishes them (anti-spam). No new listing/marketplace
-- logic. Fully idempotent (create if not exists / or replace / on conflict do
-- nothing) so it doubles as the paste-into-SQL-editor script.

-- ===========================================================================
-- Table 1: kisan_sawaal (farmer Q&A)
-- ===========================================================================
create table if not exists public.kisan_sawaal (
  id              uuid primary key default gen_random_uuid(),
  question_hi     text not null,
  question_en     text,
  asked_by_name   text not null default 'किसान',
  asked_by_village text,
  category        text check (category in (
    'land', 'equipment', 'crop', 'pest', 'weather',
    'market', 'scheme', 'drone_didi', 'general'
  )),
  is_published    boolean not null default false,
  answer_hi       text,
  answer_en       text,
  answered_by     text,
  answered_at     timestamptz,
  view_count      integer not null default 0,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.kisan_sawaal enable row level security;
grant select on public.kisan_sawaal to anon;
grant insert on public.kisan_sawaal to anon;

drop policy if exists sawaal_public_read on public.kisan_sawaal;
create policy sawaal_public_read on public.kisan_sawaal
  for select to anon
  using (is_published = true);

-- Anon may submit a question, but it MUST arrive unpublished (admin reviews).
drop policy if exists sawaal_public_insert on public.kisan_sawaal;
create policy sawaal_public_insert on public.kisan_sawaal
  for insert to anon
  with check (is_published = false);
-- No anon UPDATE/DELETE => moderation only via admin RPCs below.

-- ===========================================================================
-- Table 2: kisan_safalta (success stories)
-- ===========================================================================
create table if not exists public.kisan_safalta (
  id              uuid primary key default gen_random_uuid(),
  farmer_name     text not null,
  village         text not null,
  district        text not null default 'Sagar',
  crop_or_activity text not null,
  story_hi        text not null,
  story_en        text,
  income_before   text,
  income_after    text,
  how_helped_hi   text not null,
  how_helped_en   text,
  photo_url       text,
  contact_phone   text,
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.kisan_safalta enable row level security;
grant select on public.kisan_safalta to anon;
grant insert on public.kisan_safalta to anon;

drop policy if exists safalta_public_read on public.kisan_safalta;
create policy safalta_public_read on public.kisan_safalta
  for select to anon
  using (is_published = true);

-- Anon may submit a story for review; forced unpublished + unfeatured.
drop policy if exists safalta_public_insert on public.kisan_safalta;
create policy safalta_public_insert on public.kisan_safalta
  for insert to anon
  with check (is_published = false and is_featured = false);

-- ===========================================================================
-- Table 3: sarkari_yojana (government schemes directory)
-- ===========================================================================
create table if not exists public.sarkari_yojana (
  id              uuid primary key default gen_random_uuid(),
  scheme_name_hi  text not null,
  scheme_name_en  text not null,
  ministry_hi     text,
  ministry_en     text,
  category        text not null check (category in (
    'income_support', 'crop_insurance', 'credit',
    'equipment', 'solar', 'storage', 'women', 'general', 'market'
  )),
  description_hi  text not null,
  description_en  text not null,
  benefit_hi      text not null,
  benefit_en      text not null,
  eligibility_hi  text not null,
  eligibility_en  text not null,
  how_to_apply_hi text,
  how_to_apply_en text,
  official_website text,
  helpline        text,
  deadline_note_hi text,
  deadline_note_en text,
  is_active       boolean not null default true,
  is_featured     boolean not null default false,
  sort_order      integer default 0,
  created_at      timestamptz not null default now()
);

alter table public.sarkari_yojana enable row level security;
grant select on public.sarkari_yojana to anon;

drop policy if exists yojana_public_read on public.sarkari_yojana;
create policy yojana_public_read on public.sarkari_yojana
  for select to anon
  using (is_active = true);
-- No anon writes => admin RPCs / service role only.

-- ===========================================================================
-- Admin RPCs (require_admin from 0012 enforces is_admin server-side).
-- ===========================================================================

-- --- Sawaal ---------------------------------------------------------------
create or replace function public.get_admin_sawaal(p_actor_id uuid)
returns setof public.kisan_sawaal
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_sawaal order by created_at desc;
end;
$$;

-- Write the answer and (optionally) publish in one step.
create or replace function public.admin_answer_sawaal(
  p_actor_id uuid, p_id uuid, p_answer_hi text, p_answer_en text,
  p_answered_by text, p_is_published boolean
) returns public.kisan_sawaal
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_sawaal%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set
    answer_hi = p_answer_hi, answer_en = p_answer_en,
    answered_by = coalesce(nullif(trim(p_answered_by), ''), 'Team Kisan Sahyog'),
    answered_at = case when coalesce(trim(p_answer_hi), '') <> '' then now() else answered_at end,
    is_published = v_pub
  where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_set_sawaal_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
returns public.kisan_sawaal
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_sawaal%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_set_sawaal_published(p_actor_id uuid, p_id uuid, p_published boolean)
returns public.kisan_sawaal
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_sawaal%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set is_published = p_published where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_delete_sawaal(p_actor_id uuid, p_id uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_sawaal where id = p_id;
  return true;
end;
$$;

-- --- Safalta ---------------------------------------------------------------
create or replace function public.get_admin_safalta(p_actor_id uuid)
returns setof public.kisan_safalta
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_safalta order by created_at desc;
end;
$$;

create or replace function public.admin_upsert_safalta(
  p_actor_id uuid, p_id uuid, p_farmer_name text, p_village text, p_district text,
  p_crop_or_activity text, p_story_hi text, p_story_en text, p_income_before text,
  p_income_after text, p_how_helped_hi text, p_how_helped_en text, p_photo_url text,
  p_is_published boolean, p_is_featured boolean
) returns public.kisan_safalta
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_safalta%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_farmer_name), '') = '' or coalesce(trim(p_story_hi), '') = ''
     or coalesce(trim(p_how_helped_hi), '') = '' then
    raise exception 'story_fields_required';
  end if;
  if p_id is null then
    insert into public.kisan_safalta (farmer_name, village, district, crop_or_activity, story_hi, story_en,
      income_before, income_after, how_helped_hi, how_helped_en, photo_url, is_published, is_featured, published_at)
    values (p_farmer_name, p_village, coalesce(nullif(trim(p_district), ''), 'Sagar'), p_crop_or_activity,
      p_story_hi, p_story_en, p_income_before, p_income_after, p_how_helped_hi, p_how_helped_en, p_photo_url,
      v_pub, coalesce(p_is_featured, false), case when v_pub then now() else null end)
    returning * into v;
  else
    update public.kisan_safalta set
      farmer_name = p_farmer_name, village = p_village, district = coalesce(nullif(trim(p_district), ''), 'Sagar'),
      crop_or_activity = p_crop_or_activity, story_hi = p_story_hi, story_en = p_story_en,
      income_before = p_income_before, income_after = p_income_after,
      how_helped_hi = p_how_helped_hi, how_helped_en = p_how_helped_en, photo_url = p_photo_url,
      is_published = v_pub, is_featured = coalesce(p_is_featured, false),
      published_at = case when v_pub and published_at is null then now() when not v_pub then null else published_at end
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

create or replace function public.admin_set_safalta_published(p_actor_id uuid, p_id uuid, p_published boolean)
returns public.kisan_safalta
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_safalta%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_safalta set is_published = p_published,
    published_at = case when p_published and published_at is null then now() when not p_published then null else published_at end
  where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_set_safalta_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
returns public.kisan_safalta
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_safalta%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_safalta set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_delete_safalta(p_actor_id uuid, p_id uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_safalta where id = p_id;
  return true;
end;
$$;

-- --- Yojana ---------------------------------------------------------------
create or replace function public.get_admin_yojana(p_actor_id uuid)
returns setof public.sarkari_yojana
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.sarkari_yojana order by sort_order, scheme_name_en;
end;
$$;

create or replace function public.admin_set_yojana_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns public.sarkari_yojana
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.sarkari_yojana set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_set_yojana_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
returns public.sarkari_yojana
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.sarkari_yojana set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_upsert_yojana(
  p_actor_id uuid, p_id uuid, p_scheme_name_hi text, p_scheme_name_en text,
  p_ministry_hi text, p_ministry_en text, p_category text,
  p_description_hi text, p_description_en text, p_benefit_hi text, p_benefit_en text,
  p_eligibility_hi text, p_eligibility_en text, p_how_to_apply_hi text, p_how_to_apply_en text,
  p_official_website text, p_helpline text, p_deadline_note_hi text, p_deadline_note_en text,
  p_is_active boolean, p_is_featured boolean, p_sort_order integer
) returns public.sarkari_yojana
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_scheme_name_hi), '') = '' or coalesce(trim(p_scheme_name_en), '') = ''
     or coalesce(trim(p_description_hi), '') = '' or coalesce(trim(p_benefit_hi), '') = ''
     or coalesce(trim(p_eligibility_hi), '') = '' then
    raise exception 'scheme_fields_required';
  end if;
  if p_category not in ('income_support','crop_insurance','credit','equipment','solar','storage','women','general','market') then
    raise exception 'invalid_scheme_category';
  end if;
  if p_id is null then
    insert into public.sarkari_yojana (scheme_name_hi, scheme_name_en, ministry_hi, ministry_en, category,
      description_hi, description_en, benefit_hi, benefit_en, eligibility_hi, eligibility_en,
      how_to_apply_hi, how_to_apply_en, official_website, helpline, deadline_note_hi, deadline_note_en,
      is_active, is_featured, sort_order)
    values (p_scheme_name_hi, p_scheme_name_en, p_ministry_hi, p_ministry_en, p_category,
      p_description_hi, p_description_en, p_benefit_hi, p_benefit_en, p_eligibility_hi, p_eligibility_en,
      p_how_to_apply_hi, p_how_to_apply_en, p_official_website, p_helpline, p_deadline_note_hi, p_deadline_note_en,
      coalesce(p_is_active, true), coalesce(p_is_featured, false), coalesce(p_sort_order, 0))
    returning * into v;
  else
    update public.sarkari_yojana set
      scheme_name_hi = p_scheme_name_hi, scheme_name_en = p_scheme_name_en, ministry_hi = p_ministry_hi, ministry_en = p_ministry_en,
      category = p_category, description_hi = p_description_hi, description_en = p_description_en,
      benefit_hi = p_benefit_hi, benefit_en = p_benefit_en, eligibility_hi = p_eligibility_hi, eligibility_en = p_eligibility_en,
      how_to_apply_hi = p_how_to_apply_hi, how_to_apply_en = p_how_to_apply_en, official_website = p_official_website,
      helpline = p_helpline, deadline_note_hi = p_deadline_note_hi, deadline_note_en = p_deadline_note_en,
      is_active = coalesce(p_is_active, true), is_featured = coalesce(p_is_featured, false), sort_order = coalesce(p_sort_order, 0)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

-- Grants (each function enforces is_admin internally).
grant execute on function public.get_admin_sawaal(uuid) to anon, authenticated;
grant execute on function public.admin_answer_sawaal(uuid, uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_set_sawaal_featured(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_set_sawaal_published(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_sawaal(uuid, uuid) to anon, authenticated;
grant execute on function public.get_admin_safalta(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_safalta(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.admin_set_safalta_published(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_set_safalta_featured(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_safalta(uuid, uuid) to anon, authenticated;
grant execute on function public.get_admin_yojana(uuid) to anon, authenticated;
grant execute on function public.admin_set_yojana_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_set_yojana_featured(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_upsert_yojana(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean, integer) to anon, authenticated;

-- ===========================================================================
-- Seed: 8 verified 2026 government schemes (plain, class-8-readable Hindi).
-- Fixed ids => idempotent (on conflict (id) do nothing).
-- ===========================================================================
insert into public.sarkari_yojana (id, scheme_name_hi, scheme_name_en, ministry_hi, ministry_en, category, description_hi, description_en, benefit_hi, benefit_en, eligibility_hi, eligibility_en, how_to_apply_hi, how_to_apply_en, official_website, helpline, deadline_note_hi, deadline_note_en, is_active, is_featured, sort_order) values

('00000000-0000-4000-c000-000000000001',
'पीएम किसान सम्मान निधि', 'PM Kisan Samman Nidhi',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'income_support',
'सरकार हर साल ₹6,000 तीन किस्तों में सीधे किसान के बैंक खाते में भेजती है। यह पैसा किसी भी काम के लिए उपयोग किया जा सकता है।',
'The government sends ₹6,000 per year in 3 installments directly to the farmer''s bank account. No middleman, no paperwork after registration.',
'₹6,000 प्रति वर्ष — तीन किस्तों में (₹2,000 प्रत्येक)', '₹6,000/year in 3 installments of ₹2,000 each',
'सभी छोटे और सीमांत किसान जिनके पास खेती योग्य ज़मीन है। आयकर देने वाले, सरकारी कर्मचारी और पेंशनधारी पात्र नहीं।',
'All small and marginal farmers with cultivable land. Income tax payers, government employees and pensioners are not eligible.',
'1. pmkisan.gov.in पर जाएं
2. "New Farmer Registration" पर क्लिक करें
3. आधार नंबर और बैंक खाता जानकारी भरें
4. ज़मीन के कागज़ अपलोड करें
5. पंजीकरण के बाद किस्त आना शुरू हो जाएगी',
'1. Visit pmkisan.gov.in
2. Click "New Farmer Registration"
3. Enter Aadhaar and bank account details
4. Upload land records
5. Installments begin after registration',
'https://pmkisan.gov.in', '155261',
'पूरे साल पंजीकरण खुला है', 'Registration open throughout the year',
true, true, 1),

('00000000-0000-4000-c000-000000000002',
'प्रधानमंत्री फसल बीमा योजना (PMFBY)', 'PM Fasal Bima Yojana (PMFBY)',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'crop_insurance',
'फसल खराब होने पर बीमा का पैसा मिलता है — बाढ़, सूखा, ओले, कीट, किसी भी कारण से। किसान को केवल 2% प्रीमियम देना होता है।',
'Get insurance payout if crop is damaged by flood, drought, hail, pest or any reason. Farmer pays only 2% premium for Kharif, 1.5% for Rabi.',
'खरीफ में 2%, रबी में 1.5% प्रीमियम — बाकी सरकार देती है। नुकसान होने पर पूरी राशि मिलती है।',
'Only 2% premium (Kharif) or 1.5% (Rabi) — government pays the rest. Full claim paid on loss.',
'सभी किसान — ज़मीन मालिक, किरायेदार और बटाईदार। अधिसूचित फसल और अधिसूचित क्षेत्र में खेती होनी चाहिए।',
'All farmers — landowners, tenants and sharecroppers. Crop and area must be notified by the state government.',
'1. pmfby.gov.in पर जाएं या नज़दीकी बैंक/CSC जाएं
2. खरीफ के लिए 31 जुलाई से पहले आवेदन करें
3. आधार, बैंक खाता और खसरा नंबर साथ रखें
4. नुकसान होने पर 72 घंटे में 14447 पर सूचित करें',
'1. Visit pmfby.gov.in or nearest bank/CSC
2. Apply before 31 July for Kharif
3. Keep Aadhaar, bank account and Khasra number ready
4. Report crop damage within 72 hours by calling 14447',
'https://pmfby.gov.in', '14447',
'खरीफ: 31 जुलाई | रबी: 31 दिसंबर', 'Kharif: 31 July | Rabi: 31 December',
true, true, 2),

('00000000-0000-4000-c000-000000000003',
'पीएम कुसुम योजना (सोलर पंप)', 'PM KUSUM Yojana (Solar Pump)',
'नवीन एवं नवीकरणीय ऊर्जा मंत्रालय', 'Ministry of New and Renewable Energy',
'solar',
'खेत में सोलर पंप लगाएं — सरकार 60% सब्सिडी देती है, 30% लोन मिलता है, सिर्फ 10% आपको देना है। डीज़ल का खर्च हमेशा के लिए खत्म।',
'Install solar pump in your field — government gives 60% subsidy, 30% as loan, you pay only 10%. End diesel costs forever and earn by selling extra solar power.',
'60% सब्सिडी + 30% लोन — किसान का खर्च केवल 10%। बिजली बेचकर अतिरिक्त कमाई भी हो सकती है।',
'60% subsidy + 30% loan — farmer pays only 10%. Can also earn extra income by selling electricity.',
'सभी किसान, किसान समूह, पंचायत और सहकारी समितियां। खेती योग्य ज़मीन होना ज़रूरी है।',
'Individual farmers, farmer groups, panchayats and cooperatives. Agricultural land required.',
'1. pmkusum.mnre.gov.in पर जाएं
2. Farmer Registration पर क्लिक करें
3. ज़मीन, आधार और बैंक जानकारी भरें
4. आवेदन के बाद राज्य विभाग संपर्क करेगा',
'1. Visit pmkusum.mnre.gov.in
2. Click Farmer Registration
3. Fill land, Aadhaar and bank details
4. State department will contact after application',
'https://pmkusum.mnre.gov.in', '1800-180-3333',
'योजना 31 मार्च 2027 तक बढ़ाई गई है', 'Scheme extended till 31 March 2027',
true, true, 3),

('00000000-0000-4000-c000-000000000004',
'किसान क्रेडिट कार्ड (KCC)', 'Kisan Credit Card (KCC)',
'वित्त मंत्रालय / कृषि मंत्रालय', 'Ministry of Finance / Agriculture',
'credit',
'खेती के लिए सस्ता लोन पाएं — 3 लाख रुपये तक केवल 4% ब्याज पर (सरकार बाकी ब्याज देती है)। बीज, खाद, उपकरण — जो चाहें उस पर खर्च करें।',
'Get cheap farm loan — up to ₹3 lakh at only 4% interest (government pays rest). Use for seeds, fertilizer, equipment — anything farm-related.',
'₹3 लाख तक केवल 4% ब्याज। समय पर चुकाने पर और सस्ता हो सकता है।',
'Up to ₹3 lakh at 4% interest. Can be even cheaper if repaid on time.',
'सभी किसान — ज़मीन मालिक, बटाईदार और किरायेदार। पशुपालक और मछुआरे भी पात्र हैं।',
'All farmers — landowners, sharecroppers and tenants. Animal husbandry and fishery farmers also eligible.',
'1. नज़दीकी बैंक (SBI, PNB, को-ऑपरेटिव बैंक) में जाएं
2. KCC आवेदन फॉर्म भरें
3. आधार, ज़मीन के कागज़ और पासपोर्ट फोटो साथ ले जाएं
4. 2 सप्ताह में कार्ड मिल जाएगा',
'1. Visit nearest bank (SBI, PNB, cooperative bank)
2. Fill KCC application form
3. Bring Aadhaar, land documents and passport photo
4. Card issued within 2 weeks',
'https://www.pmkisan.gov.in/KCC.aspx', '1800-180-1111',
null, null,
true, false, 4),

('00000000-0000-4000-c000-000000000005',
'ड्रोन दीदी योजना', 'Drone Didi Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'women',
'महिला स्वयं सहायता समूहों को ड्रोन दिए जाते हैं — खेतों में कीटनाशक और खाद का छिड़काव करके कमाई करें। सरकार ट्रेनिंग और सब्सिडी देती है।',
'Women SHGs get drones — earn by spraying pesticide and fertilizer on fields. Government provides training, subsidy and support.',
'ड्रोन पर 80% सब्सिडी + मुफ्त ट्रेनिंग। ड्रोन छिड़काव से ₹1,000-1,500 प्रति एकड़ की कमाई।',
'80% subsidy on drone + free training. Earn ₹1,000-1,500 per acre from drone spraying service.',
'महिला स्वयं सहायता समूह (SHG) जो NRLM के तहत पंजीकृत हैं। कम से कम 8वीं पास और 18-45 वर्ष की उम्र।',
'Women SHGs registered under NRLM. Minimum class 8 pass, age 18-45 years.',
'1. नज़दीकी आजीविका मिशन कार्यालय से संपर्क करें
2. SHG के नाम पर आवेदन करें
3. ट्रेनिंग पूरी करें और ड्रोन लाइसेंस लें
4. अपनी सेवा किसान सहयोग पर लिस्ट करें',
'1. Contact nearest Aajeevika Mission office
2. Apply in SHG name
3. Complete training and get drone license
4. List your service on Kisan Sahyog',
'https://agriwelfare.gov.in', '1800-180-1551',
null, null,
true, true, 5),

('00000000-0000-4000-c000-000000000006',
'मृदा स्वास्थ्य कार्ड योजना', 'Soil Health Card Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'general',
'अपनी मिट्टी की जांच कराएं — मुफ्त में। पता चलेगा कि किस फसल के लिए कितनी खाद चाहिए। सही खाद डालने से खर्च कम और उपज ज़्यादा।',
'Get your soil tested — for free. Know exactly what fertilizer your soil needs for each crop. Right fertilizer means less cost and higher yield.',
'मुफ्त मिट्टी जांच + खाद की सटीक सलाह। ऑनलाइन Soil Health Card मिलता है।',
'Free soil testing + precise fertilizer advice. Get Soil Health Card online.',
'सभी किसान। हर 2 साल में एक बार जांच करवा सकते हैं।',
'All farmers. Can get tested once every 2 years.',
'1. नज़दीकी मृदा परीक्षण प्रयोगशाला जाएं (देखें: किसान सहयोग → उपयोगी संपर्क)
2. खेत के अलग हिस्सों से 500 ग्राम मिट्टी लेकर जाएं
3. 2-4 सप्ताह में Soil Health Card मिलेगा
4. कार्ड पर लिखी सलाह के अनुसार खाद डालें',
'1. Visit nearest soil testing lab (see: Kisan Sahyog → Useful Contacts)
2. Bring 500 grams soil from different parts of your field
3. Soil Health Card issued in 2-4 weeks
4. Apply fertilizer as per card recommendation',
'https://soilhealth.dac.gov.in', '1800-180-1551',
null, null,
true, false, 6),

('00000000-0000-4000-c000-000000000007',
'e-NAM (राष्ट्रीय कृषि बाज़ार)', 'e-NAM (National Agriculture Market)',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'market',
'अपनी फसल ऑनलाइन बेचें — पूरे देश के खरीदारों को। मंडी के बाहर भी दाम मिलेगा, बिचौलिया नहीं होगा, सीधे पैसा खाते में।',
'Sell your crop online to buyers across India. Get better prices outside local mandi, no middleman, money directly to your account.',
'ऑनलाइन नीलामी से बेहतर दाम। सीधे खाते में भुगतान।',
'Better prices through online auction. Direct payment to account.',
'सभी किसान जो e-NAM से जुड़ी मंडी में रजिस्टर्ड हैं।',
'All farmers registered with an e-NAM connected mandi.',
'1. enam.gov.in पर जाएं
2. Farmer Registration करें
3. नज़दीकी e-NAM मंडी में जाकर उपज लाएं
4. ऑनलाइन नीलामी में भाग लें',
'1. Visit enam.gov.in
2. Complete Farmer Registration
3. Bring produce to nearest e-NAM connected mandi
4. Participate in online auction',
'https://enam.gov.in', '1800-270-0224',
null, null,
true, false, 7),

('00000000-0000-4000-c000-000000000008',
'पीएम आशा योजना', 'PM-AASHA Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'income_support',
'अगर मंडी में फसल का दाम MSP से कम मिल रहा है तो सरकार अंतर की राशि सीधे खाते में देती है। किसान को घाटे में बेचने की ज़रूरत नहीं।',
'If mandi price falls below MSP, government pays the difference directly to your account. No need to sell at a loss.',
'MSP और मंडी भाव के बीच का अंतर सीधे खाते में।',
'Difference between MSP and mandi price paid directly to account.',
'राज्य सरकार द्वारा अधिसूचित फसल और क्षेत्र के किसान। e-NAM या सरकारी खरीद केंद्र पर रजिस्टर्ड होना ज़रूरी।',
'Farmers of notified crops in notified areas. Must be registered at e-NAM or government procurement centre.',
'1. नज़दीकी कृषि विभाग कार्यालय से संपर्क करें
2. PM-AASHA के तहत पंजीकरण कराएं
3. MSP से कम दाम मिलने पर आवेदन करें',
'1. Contact nearest Agriculture Department office
2. Register under PM-AASHA
3. Apply when market price falls below MSP',
'https://agricoop.gov.in', '1800-180-1551',
null, null,
true, false, 8)
on conflict (id) do nothing;

-- ===========================================================================
-- Seed: 3 example Q&As (published + answered by Team Kisan Sahyog).
-- ===========================================================================
insert into public.kisan_sawaal (id, question_hi, question_en, asked_by_name, asked_by_village, category, is_published, answer_hi, answer_en, answered_by, answered_at, is_featured) values

('00000000-0000-4000-c000-000000000101',
'सोयाबीन की फसल में पीले पत्ते क्यों हो रहे हैं? क्या करें?',
'Why are soybean leaves turning yellow? What should I do?',
'रामलाल पटेल', 'खुरई', 'pest',
true,
'सोयाबीन में पत्ते पीले होने के कई कारण हो सकते हैं:

1. **आयरन की कमी:** पत्तियां हल्की पीली हों तो फेरस सल्फेट (FeSO4) का 0.5% घोल बनाकर छिड़काव करें।

2. **पीला मोज़ेक वायरस:** पत्तियों पर पीले-हरे धब्बे हों तो यह वायरस है — संक्रमित पौधे तुरंत निकाल दें, सफेद मक्खी को नियंत्रित करें।

3. **जड़ सड़न:** पौधे की जड़ें काली हों तो जल निकासी सुधारें और Carbendazim का उपचार करें।

KVK सागर (07582-288228) से अपनी फसल की जांच करवाएं।',
'Why are soybean leaves turning yellow?

1. **Iron deficiency:** If leaves are light yellow, spray 0.5% Ferrous Sulphate solution.

2. **Yellow Mosaic Virus:** If leaves have yellow-green patches, this is a virus — remove infected plants immediately and control whitefly.

3. **Root rot:** If plant roots are black, improve drainage and treat with Carbendazim.

Contact KVK Sagar (07582-288228) for field diagnosis.',
'Team Kisan Sahyog', now(),
true),

('00000000-0000-4000-c000-000000000102',
'गेहूं की बुवाई के लिए कौन सा बीज सबसे अच्छा है सागर जिले के लिए?',
'Which wheat seed variety is best for Sagar district?',
'मोहन सिंह', 'रेहली', 'crop',
true,
'सागर जिले की जलवायु और मिट्टी के लिए ये गेहूं किस्में उपयुक्त हैं:

1. **HI-8498 (मालव रत्न):** JNKVV द्वारा विकसित, MP के लिए विशेष रूप से अनुशंसित। अच्छी उपज, रस्ट प्रतिरोधी।

2. **GW-496:** सिंचित और असिंचित दोनों के लिए उपयुक्त।

3. **K-9107:** देर से बुवाई के लिए अच्छा विकल्प।

बुवाई का सही समय: 1-25 नवंबर। बीज दर: 40-50 किलो प्रति एकड़।

KVK सागर-I (09425854876) से मुफ्त परामर्श लें।',
'Best wheat varieties for Sagar district:

1. **HI-8498 (Malav Ratna):** Developed by JNKVV, specifically recommended for MP. Good yield, rust resistant.

2. **GW-496:** Suitable for both irrigated and rainfed conditions.

3. **K-9107:** Good option for late sowing.

Best sowing time: 1-25 November. Seed rate: 40-50 kg per acre.

Free consultation from KVK Sagar-I: 09425854876',
'Team Kisan Sahyog', now(),
true),

('00000000-0000-4000-c000-000000000103',
'किसान क्रेडिट कार्ड के लिए कौन से कागज़ात चाहिए?',
'What documents are needed for Kisan Credit Card?',
'सुरेश यादव', 'मालथोन', 'scheme',
true,
'किसान क्रेडिट कार्ड के लिए ये कागज़ात लेकर बैंक जाएं:

**ज़रूरी दस्तावेज़:**
- आधार कार्ड
- ज़मीन के कागज़ (खसरा/खतौनी)
- पासपोर्ट साइज़ 2 फोटो
- बैंक खाता नंबर और IFSC कोड

**प्रक्रिया:**
1. SBI, PNB या ज़िला सहकारी बैंक में जाएं
2. KCC आवेदन फॉर्म मांगें और भरें
3. कागज़ात जमा करें
4. 7-15 दिन में कार्ड मिल जाएगा

₹3 लाख तक केवल 4% ब्याज पर लोन मिलता है। समय पर चुकाने पर 3% की अतिरिक्त छूट भी मिल सकती है।',
'Documents needed for Kisan Credit Card:

**Required documents:**
- Aadhaar Card
- Land records (Khasra/Khatauni)
- 2 passport size photos
- Bank account number and IFSC code

**Process:**
1. Visit SBI, PNB or District Cooperative Bank
2. Ask for KCC application form and fill it
3. Submit documents
4. Card issued in 7-15 days

Loan up to ₹3 lakh at only 4% interest. Additional 3% discount for timely repayment.',
'Team Kisan Sahyog', now(),
false)
on conflict (id) do nothing;

-- ===========================================================================
-- Seed: 2 placeholder success stories (unpublished — replace with real ones).
-- ===========================================================================
insert into public.kisan_safalta (id, farmer_name, village, district, crop_or_activity, story_hi, story_en, income_before, income_after, how_helped_hi, how_helped_en, is_published, is_featured) values

('00000000-0000-4000-c000-000000000201',
'[नाम — वास्तविक कहानी जल्द आ रही है]', 'खुरई', 'Sagar',
'ट्रैक्टर किराया',
'[यह एक उदाहरण है। वास्तविक किसान सफलता की कहानियां जल्द जोड़ी जाएंगी। क्या आपके पास किसी किसान की सफलता की कहानी है? admin@kissansahyog.com पर लिखें।]',
'[This is a placeholder. Real farmer success stories coming soon. Do you know a farmer with a success story? Write to admin@kissansahyog.com]',
null, null,
'किसान सहयोग पर उपकरण लिस्ट करके किसानों ने अपनी खाली मशीनरी से कमाई शुरू की।',
'By listing equipment on Kisan Sahyog, farmers started earning from idle machinery.',
false, false),

('00000000-0000-4000-c000-000000000202',
'[Name — Real story coming soon]', 'Sagar', 'Sagar',
'Land leasing',
'[Placeholder — real stories coming soon]',
'[Placeholder — real stories coming soon]',
null, null,
'Kisan Sahyog helped connect landowners with farmers looking for land.',
'Kisan Sahyog helped connect landowners with farmers looking for land.',
false, false)
on conflict (id) do nothing;
