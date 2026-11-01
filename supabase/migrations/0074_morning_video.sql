-- 0074_morning_video.sql - Batch 17E: the short MP4 "card with the voice as its sound" stored next to the daily morning post.
-- STRICTLY ADDITIVE and IDEMPOTENT (safe to run twice). Pure ASCII. Builds on 0070 and 0073.
--
--   * morning_posts              two new nullable columns: video_mp4_b64, video_meta. Same privileges as before
--                                (RLS on, no policies, nothing granted to public/anon/authenticated).
--   * morning_post_video_upsert  NEW. Called by the GitHub job with the anon key plus the shared secret.
--                                Wrong, missing or unset secret: {"ok":false,"error":"forbidden"} in all cases.
--                                Refuses (bad_input) a post that has no card or no voice yet. It stores the video and adds
--                                src_sha256 to video_meta: the SHA-256 of card_png_b64 || '|' || voice_mp3_b64 as stored,
--                                computed inside the database, never taken from the client.
--   * morning_post_upsert        same signature, checks and answers as 0073, with ONE more change: the stored video is cleared
--                                when the card or the message text differs from the stored one (the voice rule of 0073 is kept).
--   * morning_post_voice_upsert  same signature, checks and answers as 0073, with ONE more change: the stored video is cleared
--                                when the new mp3 differs from the stored one. An unchanged re-save keeps the video.
--   * morning_post_context       same answer as 0073 plus today.has_video (boolean).
--   * morning_post_get           same answer as 0073 plus has_video (boolean). The video bytes are NOT returned here.
--   * morning_post_video_get     NEW admin read (same guard as morning_post_get): {ok:true, video_mp4_b64, video_meta}.
--   * morning_post_voice_get     NEW job read (anon key plus the shared secret, like the other job functions): returns the stored
--                                voice mp3 of a post so a later try of the job can build the video without paying for the
--                                voice again. forbidden / bad_date / {ok:true, voice_mp3_b64 (null if none)}.
-- The auth switches (otp_required, session_enforced) are not touched.
-- Rollback (optional, never run by a script): supabase/migrations/rollback/0074_morning_video_rollback.sql

-- 1. columns ---------------------------------------------------------------------------------------------------
alter table public.morning_posts add column if not exists video_mp4_b64 text;
alter table public.morning_posts add column if not exists video_meta jsonb;
alter table public.morning_posts enable row level security;
revoke all on table public.morning_posts from public, anon, authenticated;

-- 2. job function: save the video of an existing post ------------------------------------------------------------------
create or replace function public.morning_post_video_upsert(
  p_secret text, p_date date, p_mp4_b64 text, p_meta jsonb)
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
  if p_mp4_b64 is null or length(p_mp4_b64) = 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  if length(p_mp4_b64) > 3000000 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  if not exists (select 1 from public.morning_posts where post_date = p_date) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if exists (select 1 from public.morning_posts where post_date = p_date and posted_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  if not exists (select 1 from public.morning_posts
                  where post_date = p_date
                    and coalesce(length(card_png_b64), 0) > 0 and coalesce(length(voice_mp3_b64), 0) > 0) then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  update public.morning_posts m
     set video_mp4_b64 = p_mp4_b64,
         video_meta = coalesce(p_meta, '{}'::jsonb)
                      || jsonb_build_object('src_sha256',
                           encode(sha256(convert_to(m.card_png_b64 || '|' || m.voice_mp3_b64, 'utf8')), 'hex'))
   where m.post_date = p_date and m.posted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 3. morning_post_voice_upsert: identical to 0073 except the video is cleared when the mp3 changes ----------------------
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
     set video_mp4_b64 = case when voice_mp3_b64 is distinct from p_mp3_b64 then null else video_mp4_b64 end,
         video_meta = case when voice_mp3_b64 is distinct from p_mp3_b64 then null else video_meta end,
         voice_script = p_script, voice_mp3_b64 = p_mp3_b64, voice_meta = p_meta
   where post_date = p_date and posted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_posted');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 4. morning_post_upsert: identical to 0073 except the video is cleared when the card or the message text changes -------
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
         video_mp4_b64 = case when m.message_text is distinct from excluded.message_text
                                or m.card_png_b64 is distinct from excluded.card_png_b64 then null else m.video_mp4_b64 end,
         video_meta = case when m.message_text is distinct from excluded.message_text
                             or m.card_png_b64 is distinct from excluded.card_png_b64 then null else m.video_meta end,
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

-- 5. morning_post_context: all 0073 keys plus today.has_video ----------------------------------------------------------
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
  v_vid  boolean;
begin
  if not public.morning_post_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select m.poll_question_id, m.poll_result_pct into v_q, v_pct from public.morning_posts m where m.post_date = p_date - 1;
  select encode(sha256(convert_to(m.voice_script, 'utf8')), 'hex') into v_hash
    from public.morning_posts m where m.post_date = p_date and m.voice_script is not null;
  select exists (select 1 from public.morning_posts m where m.post_date = p_date and m.video_mp4_b64 is not null) into v_vid;
  return jsonb_build_object('ok', true,
    'yesterday', jsonb_build_object('poll_question_id', v_q, 'poll_result_pct', v_pct),
    'today', jsonb_build_object('voice_sha256', v_hash, 'has_video', v_vid));
end;
$$;

-- 6. admin reads: same guard as 0070 (require_admin_session) ---------------------------------------------------------
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
    'voice_script', r.voice_script, 'voice_mp3_b64', r.voice_mp3_b64, 'voice_meta', r.voice_meta,
    'has_video', (r.video_mp4_b64 is not null)));
end;
$$;

create or replace function public.morning_post_video_get(p_actor uuid, p_date date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_b64  text;
  v_meta jsonb;
begin
  begin
    perform public.require_admin_session(p_actor, false);
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end;
  select m.video_mp4_b64, m.video_meta into v_b64, v_meta from public.morning_posts m where m.post_date = p_date;
  if v_b64 is null then
    return jsonb_build_object('ok', true, 'video_mp4_b64', null);
  end if;
  return jsonb_build_object('ok', true, 'video_mp4_b64', v_b64, 'video_meta', v_meta);
end;
$$;

-- 6b. job read: the stored voice of a post (so a retry builds the video from it instead of buying the voice again) ------
create or replace function public.morning_post_voice_get(p_secret text, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_b64   text;
begin
  if not public.morning_post_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_date is null or p_date < v_today - 1 or p_date > v_today + 1 then
    return jsonb_build_object('ok', false, 'error', 'bad_date');
  end if;
  select m.voice_mp3_b64 into v_b64 from public.morning_posts m where m.post_date = p_date;
  return jsonb_build_object('ok', true, 'voice_mp3_b64', v_b64);
end;
$$;

-- 7. grants: same pattern as 0070 / 0073 -------------------------------------------------------------------------------
revoke all on function public.morning_post_video_upsert(text, date, text, jsonb) from public;
revoke all on function public.morning_post_voice_upsert(text, date, text, text, jsonb) from public;
revoke all on function public.morning_post_upsert(text, date, text, text, text, text, text) from public;
revoke all on function public.morning_post_context(text, date) from public;
revoke all on function public.morning_post_get(uuid, date) from public;
revoke all on function public.morning_post_video_get(uuid, date) from public;
revoke all on function public.morning_post_voice_get(text, date) from public;

grant execute on function public.morning_post_video_upsert(text, date, text, jsonb) to anon, authenticated;
grant execute on function public.morning_post_voice_upsert(text, date, text, text, jsonb) to anon, authenticated;
grant execute on function public.morning_post_upsert(text, date, text, text, text, text, text) to anon, authenticated;
grant execute on function public.morning_post_context(text, date) to anon, authenticated;
grant execute on function public.morning_post_get(uuid, date) to anon, authenticated;
grant execute on function public.morning_post_video_get(uuid, date) to anon, authenticated;
grant execute on function public.morning_post_voice_get(text, date) to anon, authenticated;
