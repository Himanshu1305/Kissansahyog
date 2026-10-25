-- 0070_morning_posts.sql - Batch 16B: the daily morning WhatsApp post (message, card, poll) saved by a scheduled job and
-- shown to the admin. STRICTLY ADDITIVE and IDEMPOTENT. Pure ASCII.
--
--   * morning_posts        one row per IST date. RLS on, NO policies, all privileges revoked: nobody reads or writes it
--                          through the API directly (same as admin_actions in 0067). Admins read it through
--                          morning_post_get / morning_post_history; the job writes it through morning_post_upsert.
--   * morning_post_secret  one row: the SHA-256 hash of the shared secret. RLS on, no policies, all privileges revoked.
--   * morning_post_upsert / morning_post_context   called by the GitHub job with the PUBLIC anon key plus the secret.
--                          Wrong, missing or unset secret: the same answer {"ok":false,"error":"forbidden"} in all three cases.
--   * morning_post_get / morning_post_history / morning_post_mark_posted / morning_post_set_poll_result
--                          admin only, same guard as the 14A console (require_admin_session); a non-admin gets
--                          {"ok":false,"error":"forbidden"}.
-- No existing object is altered. The auth switches (otp_required, session_enforced) are not touched.
-- Rollback (optional, never run by a script): supabase/migrations/rollback/0070_morning_posts_rollback.sql

-- 1. tables ----------------------------------------------------------------------------------------------------
create table if not exists public.morning_posts (
  post_date        date primary key,
  message_text     text not null,
  poll_text        text,
  poll_question_id text,
  card_png_b64     text,
  report_text      text,
  generated_at     timestamptz not null default now(),
  posted_at        timestamptz,
  poll_result_pct  int check (poll_result_pct between 0 and 100),
  source           text not null default 'github'
);
alter table public.morning_posts enable row level security;
revoke all on table public.morning_posts from public, anon, authenticated;

create table if not exists public.morning_post_secret (
  id            boolean primary key default true check (id),
  secret_sha256 text not null
);
alter table public.morning_post_secret enable row level security;
revoke all on table public.morning_post_secret from public, anon, authenticated;

-- 2. internal helper: does this secret match the stored hash? (null / empty / no stored row = false) ----------------
create or replace function public.morning_post_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select s.secret_sha256 = encode(sha256(convert_to(p_secret, 'utf8')), 'hex')
       from public.morning_post_secret s
      where s.id and p_secret is not null and p_secret <> ''),
    false);
$$;
revoke all on function public.morning_post_secret_ok(text) from public, anon, authenticated;

-- 3. job functions (anon key + shared secret) ------------------------------------------------------------------
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

create or replace function public.morning_post_mark_posted(p_actor uuid, p_date date, p_posted boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_at timestamptz;
  v_n  int;
begin
  begin
    perform public.require_admin_session(p_actor, false);
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end;
  update public.morning_posts
     set posted_at = case when coalesce(p_posted, false) then coalesce(posted_at, now()) else null end
   where post_date = p_date
  returning posted_at into v_at;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.log_admin_action(p_actor, 'morning_mark_posted', 'morning_post', p_date::text, jsonb_build_object('posted', coalesce(p_posted, false)));
  return jsonb_build_object('ok', true, 'posted_at', v_at);
end;
$$;

create or replace function public.morning_post_set_poll_result(p_actor uuid, p_date date, p_pct int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  begin
    perform public.require_admin_session(p_actor, false);
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end;
  if p_pct is not null and (p_pct < 0 or p_pct > 100) then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  update public.morning_posts set poll_result_pct = p_pct where post_date = p_date;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.log_admin_action(p_actor, 'morning_poll_result', 'morning_post', p_date::text, jsonb_build_object('pct', p_pct));
  return jsonb_build_object('ok', true);
end;
$$;

-- 5. grants ----------------------------------------------------------------------------------------------------
-- The site signs users in with its own sessions, not Supabase Auth, so every page call arrives as the anon role (see 0067:
-- the admin_* functions are granted to anon, authenticated). The guard is INSIDE each admin function (require_admin_session).
revoke all on function public.morning_post_upsert(text, date, text, text, text, text, text) from public;
revoke all on function public.morning_post_context(text, date) from public;
revoke all on function public.morning_post_get(uuid, date) from public;
revoke all on function public.morning_post_history(uuid, int) from public;
revoke all on function public.morning_post_mark_posted(uuid, date, boolean) from public;
revoke all on function public.morning_post_set_poll_result(uuid, date, int) from public;

grant execute on function public.morning_post_upsert(text, date, text, text, text, text, text) to anon, authenticated;
grant execute on function public.morning_post_context(text, date) to anon, authenticated;
grant execute on function public.morning_post_get(uuid, date) to anon, authenticated;
grant execute on function public.morning_post_history(uuid, int) to anon, authenticated;
grant execute on function public.morning_post_mark_posted(uuid, date, boolean) to anon, authenticated;
grant execute on function public.morning_post_set_poll_result(uuid, date, int) to anon, authenticated;
