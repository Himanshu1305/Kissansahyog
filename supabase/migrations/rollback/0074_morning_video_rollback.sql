-- Rollback for 0074 (optional, never run by a script): puts the functions back exactly as 0073 made them, removes
-- morning_post_video_upsert, morning_post_video_get and morning_post_voice_get and drops the two video columns (every stored video is lost;
-- messages, cards, polls and voices stay). Safe to run twice. Pure ASCII.
drop function if exists public.morning_post_video_upsert(text, date, text, jsonb);
drop function if exists public.morning_post_video_get(uuid, date);
drop function if exists public.morning_post_voice_get(text, date);

create or replace function public.morning_post_voice_upsert(
  p_secret text, p_date date, p_script text, p_mp3_b64 text, p_meta jsonb)
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
  if p_script is null or length(p_script) = 0 or p_mp3_b64 is null or length(p_mp3_b64) = 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  if length(p_script) > 2000 or length(p_mp3_b64) > 1400000 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  if not exists (select 1 from public.morning_posts where post_date = p_date) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if exists (select 1 from public.morning_posts where post_date = p_date and posted_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  update public.morning_posts
     set voice_script = p_script, voice_mp3_b64 = p_mp3_b64, voice_meta = p_meta
   where post_date = p_date and posted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

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
     set voice_script = case when m.message_text is distinct from excluded.message_text then null else m.voice_script end,
         voice_mp3_b64 = case when m.message_text is distinct from excluded.message_text then null else m.voice_mp3_b64 end,
         voice_meta = case when m.message_text is distinct from excluded.message_text then null else m.voice_meta end,
         message_text = excluded.message_text,
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
  v_q    text;
  v_pct  int;
  v_hash text;
begin
  if not public.morning_post_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select m.poll_question_id, m.poll_result_pct into v_q, v_pct from public.morning_posts m where m.post_date = p_date - 1;
  select encode(sha256(convert_to(m.voice_script, 'utf8')), 'hex') into v_hash
    from public.morning_posts m where m.post_date = p_date and m.voice_script is not null;
  return jsonb_build_object('ok', true,
    'yesterday', jsonb_build_object('poll_question_id', v_q, 'poll_result_pct', v_pct),
    'today', jsonb_build_object('voice_sha256', v_hash));
end;
$$;

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
    'poll_result_pct', r.poll_result_pct, 'source', r.source,
    'voice_script', r.voice_script, 'voice_mp3_b64', r.voice_mp3_b64, 'voice_meta', r.voice_meta));
end;
$$;

alter table public.morning_posts drop column if exists video_mp4_b64;
alter table public.morning_posts drop column if exists video_meta;

grant execute on function public.morning_post_voice_upsert(text, date, text, text, jsonb) to anon, authenticated;
grant execute on function public.morning_post_upsert(text, date, text, text, text, text, text) to anon, authenticated;
grant execute on function public.morning_post_context(text, date) to anon, authenticated;
grant execute on function public.morning_post_get(uuid, date) to anon, authenticated;
