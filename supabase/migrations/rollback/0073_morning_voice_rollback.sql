-- Rollback for 0073 (optional, never run by a script): puts the four morning functions back exactly as 0070 made them,
-- removes morning_post_voice_upsert and drops the three voice columns (every stored voice is lost; messages, cards and polls stay).
-- Safe to run twice. Pure ASCII.
drop function if exists public.morning_post_voice_upsert(text, date, text, text, jsonb);

create or replace function public.morning_post_upsert(
  p_secret text, p_date date, p_message text, p_poll text, p_poll_question_id text, p_card_b64 text, p_report text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_rows  int;
begin
  if not public.morning_post_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_date is null or p_date < v_today - 1 or p_date > v_today + 1 then
    return jsonb_build_object('ok', false, 'error', 'bad_date');
  end if;
  if p_message is null or length(p_message) = 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  if length(p_message) > 4000 or length(coalesce(p_card_b64, '')) > 900000
     or length(coalesce(p_poll, '')) > 2000 or length(coalesce(p_report, '')) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  if exists (select 1 from public.morning_posts where post_date = p_date and posted_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  insert into public.morning_posts as m (post_date, message_text, poll_text, poll_question_id, card_png_b64, report_text, generated_at, source)
  values (p_date, p_message, p_poll, p_poll_question_id, p_card_b64, p_report, now(), 'github')
  on conflict (post_date) do update
     set message_text = excluded.message_text,
         poll_text = excluded.poll_text,
         poll_question_id = excluded.poll_question_id,
         card_png_b64 = excluded.card_png_b64,
         report_text = excluded.report_text,
         generated_at = now(),
         source = excluded.source
   where m.posted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.morning_post_context(p_secret text, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_q   text;
  v_pct int;
begin
  if not public.morning_post_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select m.poll_question_id, m.poll_result_pct into v_q, v_pct from public.morning_posts m where m.post_date = p_date - 1;
  return jsonb_build_object('ok', true, 'yesterday', jsonb_build_object('poll_question_id', v_q, 'poll_result_pct', v_pct));
end;
$$;

-- 4. admin functions (same guard as the 14A console: first parameter the acting profile, require_admin_session) -----
create or replace function public.morning_post_get(p_actor uuid, p_date date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  r public.morning_posts;
begin
  begin
    perform public.require_admin_session(p_actor, false);
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end;
  select * into r from public.morning_posts where post_date = p_date;
  if not found then
    return jsonb_build_object('ok', true, 'post', null);
  end if;
  return jsonb_build_object('ok', true, 'post', jsonb_build_object(
    'post_date', r.post_date, 'message_text', r.message_text, 'poll_text', r.poll_text, 'poll_question_id', r.poll_question_id,
    'card_png_b64', r.card_png_b64, 'report_text', r.report_text, 'generated_at', r.generated_at, 'posted_at', r.posted_at,
    'poll_result_pct', r.poll_result_pct, 'source', r.source));
end;
$$;

create or replace function public.morning_post_history(p_actor uuid, p_days int default 14)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_days  int := least(greatest(coalesce(p_days, 14), 1), 60);
  v_rows  jsonb;
begin
  begin
    perform public.require_admin_session(p_actor, false);
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end;
  select coalesce(jsonb_agg(jsonb_build_object('post_date', m.post_date, 'posted_at', m.posted_at, 'generated_at', m.generated_at,
                                               'poll_result_pct', m.poll_result_pct) order by m.post_date desc), '[]'::jsonb)
    into v_rows
    from public.morning_posts m
   where m.post_date >= v_today - (v_days - 1);
  return jsonb_build_object('ok', true, 'rows', v_rows);
end;
$$;

alter table public.morning_posts drop column if exists voice_script;
alter table public.morning_posts drop column if exists voice_mp3_b64;
alter table public.morning_posts drop column if exists voice_meta;

grant execute on function public.morning_post_upsert(text, date, text, text, text, text, text) to anon, authenticated;
grant execute on function public.morning_post_context(text, date) to anon, authenticated;
grant execute on function public.morning_post_get(uuid, date) to anon, authenticated;
grant execute on function public.morning_post_history(uuid, int) to anon, authenticated;
