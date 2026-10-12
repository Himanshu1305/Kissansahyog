-- Batch 7A/7B — Feedback & Grievance form on /grievance.
-- NOT APPLIED by the batches that wrote it: review, then run the usual migrate step
-- (staging first, then production). Rewritten in place in Batch 7B; the 7A draft was
-- never applied anywhere, so there is nothing to alter or drop.
--
-- The person gives ONE way to reach them: an e-mail address OR a 10-digit Indian
-- mobile number. The table deliberately has no column for who they are.
--
-- Same pattern as carbon_suggestions (0043) and listing_reports (0039): RLS on, no
-- direct anon read/write, SECURITY DEFINER RPCs do every read and write.
--   submit_feedback          anon      constrained insert, soft rate limit, returns the id
--   mark_feedback_notified   service   stamps notified_at after the notification e-mail
--   get_public_feedback      anon      approved + consented suggestions, message text only
--   get_feedback_messages    admin     inbox
--   moderate_feedback        admin     approve / reject for public display
--   set_feedback_status      admin     open / replied / closed
-- Rollback note: additive only (create ... if not exists / create or replace). The
-- site works before this is applied: the form falls back to an e-mail link and the
-- /about "What farmers say" section stays hidden.

create table if not exists public.feedback_messages (
  id              bigserial primary key,
  contact_email   text,
  contact_mobile  text check (contact_mobile is null or contact_mobile ~ '^[6-9][0-9]{9}$'),
  kind            text not null default 'suggestion' check (kind in ('suggestion','problem','other')),
  message         text not null check (char_length(message) between 5 and 4000),
  lang            text check (lang is null or lang in ('hi','en')),
  device_id       text,
  -- The person allowed anonymous public display (never honoured for 'problem').
  public_ok       boolean not null default false,
  moderation      text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  status          text not null default 'open' check (status in ('open','replied','closed')),
  notified_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint feedback_messages_contact_present check (contact_email is not null or contact_mobile is not null),
  constraint feedback_messages_problem_private check (kind <> 'problem' or public_ok = false)
);
create index if not exists feedback_messages_status_idx on public.feedback_messages (status, created_at desc);
create index if not exists feedback_messages_moderation_idx on public.feedback_messages (moderation, created_at desc);
create index if not exists feedback_messages_device_idx on public.feedback_messages (device_id, created_at);
create index if not exists feedback_messages_email_idx on public.feedback_messages (contact_email, created_at);
create index if not exists feedback_messages_mobile_idx on public.feedback_messages (contact_mobile, created_at);

-- RLS on with no policies: anon and authenticated can neither read nor write the
-- table directly. The explicit revoke makes that hold even without RLS.
alter table public.feedback_messages enable row level security;
revoke all on table public.feedback_messages from public, anon, authenticated;
revoke all on sequence public.feedback_messages_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------------
-- submit_feedback — anonymous, constrained insert. Returns the new row id.
-- ---------------------------------------------------------------------------------
create or replace function public.submit_feedback(
  p_email     text,
  p_mobile    text,
  p_kind      text,
  p_message   text,
  p_lang      text,
  p_device    text,
  p_public_ok boolean default false
) returns bigint
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_email  text := nullif(lower(trim(coalesce(p_email, ''))), '');
  -- Mobile: drop spaces and hyphens, then a leading +91 / 91 / 0.
  v_mobile text := nullif(regexp_replace(coalesce(p_mobile, ''), '[[:space:]-]', '', 'g'), '');
  v_kind   text := coalesce(nullif(trim(p_kind), ''), 'suggestion');
  v_msg    text := trim(coalesce(p_message, ''));
  v_dev    text := coalesce(nullif(trim(p_device), ''), 'unknown');
  v_public boolean;
  v_count  int;
  v_id     bigint;
begin
  if v_email is null and v_mobile is null then raise exception 'feedback_contact_required'; end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'feedback_email_invalid';
  end if;

  if v_mobile is not null then
    if v_mobile ~ '^\+91' then v_mobile := substr(v_mobile, 4);
    elsif v_mobile ~ '^91[0-9]{10}$' then v_mobile := substr(v_mobile, 3);
    end if;
    if v_mobile ~ '^0[0-9]{10}$' then v_mobile := substr(v_mobile, 2); end if;
    if v_mobile !~ '^[6-9][0-9]{9}$' then raise exception 'feedback_mobile_invalid'; end if;
  end if;

  if v_kind not in ('suggestion','problem','other') then raise exception 'feedback_kind_invalid'; end if;
  if char_length(v_msg) < 5 then raise exception 'feedback_message_required'; end if;
  if char_length(v_msg) > 4000 then raise exception 'feedback_message_too_long'; end if;

  -- Public display is the person's choice, and never applies to a problem/complaint.
  v_public := coalesce(p_public_ok, false) and v_kind in ('suggestion','other');

  -- Soft rate limit: at most 5 messages an hour per device, per e-mail and per mobile.
  select count(*) into v_count from public.feedback_messages
    where created_at > now() - interval '1 hour'
      and (
        (v_dev <> 'unknown' and device_id = v_dev)
        or (v_email is not null and contact_email = v_email)
        or (v_mobile is not null and contact_mobile = v_mobile)
      );
  if v_count >= 5 then raise exception 'feedback_too_many'; end if;

  insert into public.feedback_messages (contact_email, contact_mobile, kind, message, lang, device_id, public_ok)
  values (v_email, v_mobile, v_kind, v_msg, case when p_lang in ('hi','en') then p_lang else null end, v_dev, v_public)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_feedback(text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_feedback(text, text, text, text, text, text, boolean) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- mark_feedback_notified — called by the Pages Function (service role) once the
-- notification e-mail has been accepted. Not callable from the browser.
-- ---------------------------------------------------------------------------------
create or replace function public.mark_feedback_notified(p_id bigint)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.feedback_messages set notified_at = now() where id = p_id and notified_at is null;
end;
$$;
revoke all on function public.mark_feedback_notified(bigint) from public, anon, authenticated;
grant execute on function public.mark_feedback_notified(bigint) to service_role;

-- ---------------------------------------------------------------------------------
-- get_public_feedback — the only public read. Message text, type, language and date
-- of rows that the person allowed AND an admin approved. No contact details, no
-- device id, no status, no row id.
-- ---------------------------------------------------------------------------------
create or replace function public.get_public_feedback(p_limit int default 20)
returns table (message text, kind text, lang text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select f.message, f.kind, f.lang, f.created_at
  from public.feedback_messages f
  where f.moderation = 'approved'
    and f.public_ok
    and f.kind in ('suggestion','other')
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke all on function public.get_public_feedback(int) from public;
grant execute on function public.get_public_feedback(int) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- Admin (require_admin pattern, as in 0012/0043). No admin screen uses these yet.
-- ---------------------------------------------------------------------------------
create or replace function public.get_feedback_messages(
  p_actor_id   uuid,
  p_moderation text default null,
  p_status     text default 'open',
  p_limit      int default 100
) returns setof public.feedback_messages
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
    select * from public.feedback_messages
    where (p_moderation is null or moderation = p_moderation)
      and (p_status is null or status = p_status)
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;
grant execute on function public.get_feedback_messages(uuid, text, text, int) to anon, authenticated;

create or replace function public.moderate_feedback(p_actor_id uuid, p_id bigint, p_action text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_row public.feedback_messages%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_action not in ('approve','reject') then raise exception 'feedback_action_invalid'; end if;
  select * into v_row from public.feedback_messages where id = p_id;
  if not found then raise exception 'feedback_not_found'; end if;
  if p_action = 'approve' then
    -- Only what the person agreed to show, and never a problem/complaint.
    if not v_row.public_ok or v_row.kind = 'problem' then raise exception 'feedback_not_public'; end if;
    update public.feedback_messages set moderation = 'approved' where id = p_id;
  else
    update public.feedback_messages set moderation = 'rejected' where id = p_id;
  end if;
end;
$$;
grant execute on function public.moderate_feedback(uuid, bigint, text) to anon, authenticated;

create or replace function public.set_feedback_status(p_actor_id uuid, p_id bigint, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  if p_status not in ('open','replied','closed') then raise exception 'feedback_status_invalid'; end if;
  update public.feedback_messages set status = p_status where id = p_id;
  if not found then raise exception 'feedback_not_found'; end if;
end;
$$;
grant execute on function public.set_feedback_status(uuid, bigint, text) to anon, authenticated;
