-- 0079_kvk_questions.sql - Batch 29: the admin "KVK questions" tab.
-- WHY: some facts in the morning post (the days of the 2nd and 3rd wheat irrigation, the late-sowing date, the crop-insurance last date) must be
--   confirmed with KVK Sagar or the agriculture office. Before this, an answer had to go through Claude and a code change. Now an admin enters the
--   answer in the admin console and the next morning post uses it by itself (scripts/morning/lib/kvk.js).
-- WHAT IT ADDS (nothing existing is changed):
--   table  public.kvk_questions                  the questions (seeded below) and, once answered, the typed answer + who told us + until when it is valid
--   fn     public.ks_kvk_clean(...)              checks one answer (numbers and dates in range); the same limits live in src/lib/kvk/kvkRules.js
--   fn     public.admin_kvk_list(p_actor)        admin only: all questions with their state (open / answered / expired)
--   fn     public.admin_kvk_answer(...)          admin only: save an answer (goes live in the next post; written to the admin action log)
--   fn     public.admin_kvk_reopen(...)          admin only: remove an answer (the post goes back to the repo's own data)
--   fn     public.morning_kvk_answers()          read by the morning job with the public key: ONLY the answered, still-valid rows, no names of admins
-- Same guard as every admin function: require_admin_session (a live admin session; editors may use it, no super needed).
-- Idempotent: safe to run twice (the seed never overwrites an answer). Rollback: supabase/migrations/rollback/0079_kvk_questions_rollback.sql

do $guard$
begin
  if to_regprocedure('public.require_admin_session(uuid, boolean)') is null then
    raise exception 'Batch 29 stopped: require_admin_session is missing (migration 0067 not applied). Nothing was changed.';
  end if;
  if to_regprocedure('public.log_admin_action(uuid, text, text, text, jsonb)') is null then
    raise exception 'Batch 29 stopped: log_admin_action is missing (migration 0067 not applied). Nothing was changed.';
  end if;
end
$guard$;

create table if not exists public.kvk_questions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  kind          text not null check (kind in ('stage_days', 'date', 'late_sowing')),
  target        text not null check (length(target) between 1 and 60),   -- stage id (irr2), scheme id (pmfby-rabi) or crop (wheat)
  sort_order    int  not null default 100,
  question_hi   text not null,
  question_en   text not null,
  help_hi       text not null default '',
  help_en       text not null default '',
  ask_who       text not null default '',
  ask_phone     text not null default '',
  status        text not null default 'open' check (status in ('open', 'answered')),
  answer        jsonb,
  source_name   text,
  source_date   date,
  valid_until   date,
  answered_by   uuid references public.profiles (id) on delete set null,
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.kvk_questions enable row level security;
revoke all on public.kvk_questions from public, anon, authenticated;   -- no direct access: only the functions below

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Checks one answer. Returns the cleaned answer, or raises: kvk_invalid_range / kvk_invalid_date / kvk_invalid_seed / kvk_invalid_source /
-- kvk_invalid_told / kvk_invalid_valid. Limits (keep equal to LIMITS in src/lib/kvk/kvkRules.js, a test compares them):
--   days after sowing 10..150, "from" < "to", at most 20 days apart; a date within 400 days after the day it was told;
--   extra seed 0..100 %; who-told 3..120 characters; told on today or in the last 60 days; valid until after today, at most 400 days ahead.
create or replace function public.ks_kvk_clean(p_kind text, p_answer jsonb, p_source_name text, p_source_date date, p_valid_until date)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  a jsonb := coalesce(p_answer, '{}'::jsonb);
  v_from int; v_to int; v_d date; v_pct int;
begin
  if p_source_name is null or length(btrim(p_source_name)) < 3 or length(btrim(p_source_name)) > 120 then raise exception 'kvk_invalid_source'; end if;
  if p_source_date is null or p_source_date > v_today or p_source_date < v_today - 60 then raise exception 'kvk_invalid_told'; end if;
  if p_valid_until is null or p_valid_until <= v_today or p_valid_until > v_today + 400 then raise exception 'kvk_invalid_valid'; end if;

  if p_kind = 'stage_days' then
    begin
      if coalesce(a->>'das_from', '') !~ '^[0-9]{1,3}$' or coalesce(a->>'das_to', '') !~ '^[0-9]{1,3}$' then raise exception 'kvk_invalid_range'; end if;
      v_from := (a->>'das_from')::int; v_to := (a->>'das_to')::int;
    exception when others then raise exception 'kvk_invalid_range';
    end;
    if v_from < 10 or v_to > 150 or v_from >= v_to or v_to - v_from > 20 then raise exception 'kvk_invalid_range'; end if;
    return jsonb_build_object('das_from', v_from, 'das_to', v_to);
  elsif p_kind = 'date' or p_kind = 'late_sowing' then
    begin
      if coalesce(a->>(case when p_kind = 'date' then 'date' else 'last_date' end), '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'kvk_invalid_date'; end if;
      v_d := (a->>(case when p_kind = 'date' then 'date' else 'last_date' end))::date;
    exception when others then raise exception 'kvk_invalid_date';
    end;
    if v_d < p_source_date or v_d > p_source_date + 400 then raise exception 'kvk_invalid_date'; end if;
    if p_kind = 'date' then return jsonb_build_object('date', v_d); end if;
    if coalesce(a->>'seed_extra_pct', '') <> '' then
      begin
        if coalesce(a->>'seed_extra_pct', '') !~ '^[0-9]{1,3}$' then raise exception 'kvk_invalid_seed'; end if;
        v_pct := (a->>'seed_extra_pct')::int;
      exception when others then raise exception 'kvk_invalid_seed';
      end;
      if v_pct < 0 or v_pct > 100 then raise exception 'kvk_invalid_seed'; end if;
      return jsonb_build_object('last_date', v_d, 'seed_extra_pct', v_pct);
    end if;
    return jsonb_build_object('last_date', v_d);
  end if;
  raise exception 'kvk_invalid_range';
end
$fn$;
revoke all on function public.ks_kvk_clean(text, jsonb, text, date, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Admin: all questions, with the state computed on the India date: open | answered | expired (an expired answer is no longer used by the post).
create or replace function public.admin_kvk_list(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  perform public.require_admin_session(p_actor, false);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', q.id, 'slug', q.slug, 'kind', q.kind, 'target', q.target,
      'question_hi', q.question_hi, 'question_en', q.question_en, 'help_hi', q.help_hi, 'help_en', q.help_en,
      'ask_who', q.ask_who, 'ask_phone', q.ask_phone,
      'state', case when q.status = 'open' then 'open' when q.valid_until < v_today then 'expired' else 'answered' end,
      'answer', q.answer, 'source_name', q.source_name, 'source_date', q.source_date, 'valid_until', q.valid_until, 'answered_at', q.answered_at
    ) order by q.sort_order, q.created_at)
    from public.kvk_questions q
  ), '[]'::jsonb);
end
$fn$;

-- Admin: save (or change) an answer. It is used by the next morning post automatically.
create or replace function public.admin_kvk_answer(p_actor uuid, p_id uuid, p_answer jsonb, p_source_name text, p_source_date date, p_valid_until date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_kind text; v_slug text; v_clean jsonb;
begin
  perform public.require_admin_session(p_actor, false);
  select kind, slug into v_kind, v_slug from public.kvk_questions where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  v_clean := public.ks_kvk_clean(v_kind, p_answer, p_source_name, p_source_date, p_valid_until);
  update public.kvk_questions
     set status = 'answered', answer = v_clean, source_name = btrim(p_source_name), source_date = p_source_date, valid_until = p_valid_until,
         answered_by = p_actor, answered_at = now(), updated_at = now()
   where id = p_id;
  perform public.log_admin_action(p_actor, 'kvk_answer', 'kvk_question', p_id::text, jsonb_build_object('slug', v_slug, 'valid_until', p_valid_until));
  return jsonb_build_object('id', p_id, 'slug', v_slug, 'answer', v_clean);
end
$fn$;

-- Admin: take an answer away (the morning post goes back to the data in the repository).
create or replace function public.admin_kvk_reopen(p_actor uuid, p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare v_slug text;
begin
  perform public.require_admin_session(p_actor, false);
  update public.kvk_questions
     set status = 'open', answer = null, source_name = null, source_date = null, valid_until = null, answered_by = null, answered_at = null, updated_at = now()
   where id = p_id returning slug into v_slug;
  if not found then raise exception 'not_found'; end if;
  perform public.log_admin_action(p_actor, 'kvk_reopen', 'kvk_question', p_id::text, jsonb_build_object('slug', v_slug));
end
$fn$;

-- The morning job (public key, read only): answered rows that are still valid on the India date. No admin id, no phone number.
create or replace function public.morning_kvk_answers()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', q.slug, 'kind', q.kind, 'target', q.target, 'answer', q.answer,
    'source_name', q.source_name, 'source_date', q.source_date, 'valid_until', q.valid_until
  ) order by q.sort_order, q.created_at), '[]'::jsonb)
  from public.kvk_questions q
  where q.status = 'answered' and q.answer is not null and q.valid_until >= (now() at time zone 'Asia/Kolkata')::date
$fn$;

revoke all on function public.admin_kvk_list(uuid) from public, anon, authenticated;
revoke all on function public.admin_kvk_answer(uuid, uuid, jsonb, text, date, date) from public, anon, authenticated;
revoke all on function public.admin_kvk_reopen(uuid, uuid) from public, anon, authenticated;
revoke all on function public.morning_kvk_answers() from public, anon, authenticated;
grant execute on function public.admin_kvk_list(uuid) to anon, authenticated;
grant execute on function public.admin_kvk_answer(uuid, uuid, jsonb, text, date, date) to anon, authenticated;
grant execute on function public.admin_kvk_reopen(uuid, uuid) to anon, authenticated;
grant execute on function public.morning_kvk_answers() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- The first questions. Running this again only refreshes the question and help wording; it never touches an answer.
insert into public.kvk_questions (slug, kind, target, sort_order, question_hi, question_en, help_hi, help_en, ask_who, ask_phone) values
('wheat-irr2-days', 'stage_days', 'irr2', 10,
 'गेहूं (सिंचित, समय पर बोया) में दूसरी सिंचाई बुवाई के कितने दिन बाद करें? सागर के लिए दिनों की सीमा बताइए, जैसे 50 से 55।',
 'Wheat (irrigated, timely sown), Sagar: how many days after sowing should the 2nd irrigation be given? Ask for the range, for example 50 to 55.',
 'अभी पोस्ट में 50 से 55 दिन है (एक वेबसाइट से; दूसरे स्रोत अलग कहते हैं)। केवीके जो सीमा बताए वही भरें।',
 'The posts now say 50 to 55 days (from one website; other sources differ). Enter the range KVK advises.',
 'KVK Sagar (Krishi Vigyan Kendra)', '07582-288228'),
('wheat-irr3-days', 'stage_days', 'irr3', 20,
 'गेहूं में तीसरी सिंचाई बुवाई के कितने दिन बाद करें? सागर के लिए दिनों की सीमा बताइए, जैसे 80 से 85।',
 'Wheat (irrigated, timely sown), Sagar: how many days after sowing should the 3rd irrigation be given? Ask for the range, for example 80 to 85.',
 'अभी पोस्ट में 80 से 85 दिन है (एक वेबसाइट से, पक्का नहीं)। केवीके जो सीमा बताए वही भरें।',
 'The posts now say 80 to 85 days (one website, not confirmed). Enter the range KVK advises.',
 'KVK Sagar (Krishi Vigyan Kendra)', '07582-288228'),
('pmfby-rabi-last-date', 'date', 'pmfby-rabi', 30,
 'रबी 2026-27 में फसल बीमा (PMFBY) कराने की आख़िरी तारीख़ क्या है? (सागर, गेहूं और चना)',
 'Rabi 2026-27 crop insurance (PMFBY): what is the last date to enrol in Sagar (wheat and gram)?',
 'अभी पोस्ट में 31 दिसंबर 2026 है, जो एक समाचार लेख (हरदा) से लिया है। ज़िला कृषि कार्यालय या बैंक से पक्का करें।',
 'The posts now say 31 Dec 2026, taken from one news article (Harda). Confirm with the district agriculture office or a bank.',
 'Deputy Director of Agriculture, Sagar (district agriculture office)', ''),
('wheat-late-sowing', 'late_sowing', 'wheat', 40,
 'गेहूं की देर से बुवाई: सागर में आख़िरी बुवाई की तारीख़ क्या है, और बीज कितने प्रतिशत ज़्यादा डालें?',
 'Late-sown wheat, Sagar: what is the last date for sowing, and how much extra seed (in %) should be used?',
 'अभी पोस्ट में "गेहूं की देर से बुवाई" 1 दिसंबर से 5 जनवरी तक दिखती है, जो सिर्फ़ एक वेबसाइट (कृषि सेवा) से है, पक्की नहीं। केवीके की बताई आख़िरी तारीख़ भरें, वही पोस्ट में आ जाएगी; बीज का प्रतिशत न बताया हो तो खाली छोड़ें।',
 'The posts now show "late sowing of wheat" from 1 Dec to 5 Jan, from one website only (Krishisewa), not confirmed. Enter the last date KVK gives and the posts will use it; leave the seed % empty if not told.',
 'KVK Sagar (Krishi Vigyan Kendra)', '07582-288228')
on conflict (slug) do update set question_hi = excluded.question_hi, question_en = excluded.question_en, help_hi = excluded.help_hi, help_en = excluded.help_en;
