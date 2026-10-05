-- V2 Phase 8 — Carbon credit page: public opinion poll + suggestions box.
-- Both: RLS on, no anon direct read/write; access via SECURITY DEFINER RPCs with
-- constrained anonymous insert. One vote per device; suggestions unpublished
-- until admin approval.

-- Poll — one row per device.
create table if not exists public.carbon_poll_votes (
  id         bigserial primary key,
  device_id  text not null unique,
  choice     text not null check (choice in ('yes','no','unsure')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.carbon_poll_votes enable row level security;

create or replace function public.vote_carbon_poll(p_device text, p_choice text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_dev text := coalesce(nullif(trim(p_device), ''), 'unknown');
begin
  if p_choice not in ('yes','no','unsure') then raise exception 'invalid_choice'; end if;
  insert into public.carbon_poll_votes (device_id, choice) values (v_dev, p_choice)
    on conflict (device_id) do update set choice = excluded.choice, updated_at = now();
end;
$$;
grant execute on function public.vote_carbon_poll(text, text) to anon, authenticated;

create or replace function public.get_carbon_poll_results()
returns table (choice text, votes bigint)
language sql security definer set search_path = public, pg_temp
as $$
  select choice, count(*)::bigint from public.carbon_poll_votes group by choice;
$$;
grant execute on function public.get_carbon_poll_results() to anon, authenticated;

-- Suggestions — name + village optional, text required; stored unpublished.
create table if not exists public.carbon_suggestions (
  id         bigserial primary key,
  name       text,
  village    text,
  body       text not null,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  device_id  text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists carbon_sugg_status_idx on public.carbon_suggestions (status, created_at);
alter table public.carbon_suggestions enable row level security;

create or replace function public.submit_carbon_suggestion(p_name text, p_village text, p_body text, p_device text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_dev text := coalesce(nullif(trim(p_device), ''), 'unknown'); v_count int;
begin
  if coalesce(nullif(trim(p_body), ''), '') = '' then raise exception 'suggestion_body_required'; end if;
  delete from public.carbon_suggestions where created_at < now() - interval '180 days' and status <> 'approved';
  select count(*) into v_count from public.carbon_suggestions where device_id = v_dev and created_at > now() - interval '1 hour';
  if v_count >= 5 then raise exception 'rate_limited'; end if;
  insert into public.carbon_suggestions (name, village, body, device_id)
    values (nullif(trim(p_name), ''), nullif(trim(p_village), ''), trim(p_body), v_dev);
end;
$$;
grant execute on function public.submit_carbon_suggestion(text, text, text, text) to anon, authenticated;

-- Public: approved suggestions only.
create or replace function public.get_carbon_suggestions_public(p_limit int default 50)
returns table (id bigint, name text, village text, body text, created_at timestamptz)
language sql security definer set search_path = public, pg_temp
as $$
  select id, name, village, body, created_at from public.carbon_suggestions
  where status = 'approved' order by created_at desc limit greatest(p_limit, 1);
$$;
grant execute on function public.get_carbon_suggestions_public(int) to anon, authenticated;

-- Admin: moderate suggestions.
create or replace function public.get_carbon_suggestions_admin(p_actor_id uuid, p_status text default 'pending')
returns setof public.carbon_suggestions
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.carbon_suggestions where (p_status is null or status = p_status) order by created_at desc;
end;
$$;
grant execute on function public.get_carbon_suggestions_admin(uuid, text) to anon, authenticated;

create or replace function public.resolve_carbon_suggestion(p_actor_id uuid, p_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  update public.carbon_suggestions set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now(), resolved_by = p_actor_id where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$$;
grant execute on function public.resolve_carbon_suggestion(uuid, bigint, boolean) to anon, authenticated;
