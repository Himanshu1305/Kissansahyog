-- V2 Phase 13 — WhatsApp groundwork (NO sending in this build).
--   * profiles: whatsapp_opt_in (+ timestamp) + preferred_mandi (main_crops exists).
--   * join_clicks: /join?src= redirect logging (constrained anon insert, no anon read).
--   * whatsapp_channel_url lives in site_settings (admin-set, public read). Empty => nothing shows.

alter table public.profiles add column if not exists whatsapp_opt_in     boolean not null default false;
alter table public.profiles add column if not exists whatsapp_opt_in_at  timestamptz;
alter table public.profiles add column if not exists preferred_mandi     text;

-- --- join_clicks: source-attribution for the "WhatsApp पर जुड़ें" links ---
create table if not exists public.join_clicks (
  id         bigserial primary key,
  src        text,
  device_id  text,
  created_at timestamptz not null default now()
);
alter table public.join_clicks enable row level security;  -- RPC-only (no anon read)

create or replace function public.log_join_click(p_src text, p_device text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_dev text := coalesce(nullif(trim(p_device), ''), 'unknown');
begin
  -- light rate limit: max 30 rows per device per hour
  if (select count(*) from public.join_clicks where device_id = v_dev and created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;
  insert into public.join_clicks (src, device_id) values (nullif(trim(p_src), ''), v_dev);
end;
$$;
grant execute on function public.log_join_click(text, text) to anon, authenticated;

-- --- extend update_kisan_profile with WhatsApp opt-in + preferred mandi ---
drop function if exists public.update_kisan_profile(uuid, numeric, text, boolean, boolean);
create or replace function public.update_kisan_profile(
  p_actor_id uuid,
  p_land_acres numeric default null,
  p_main_crops text default null,
  p_interest_lease boolean default false,
  p_interest_equipment boolean default false,
  p_whatsapp_opt_in boolean default null,
  p_preferred_mandi text default null
) returns profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_profile public.profiles%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'not_authorized'; end if;
  update public.profiles set
    land_acres         = p_land_acres,
    main_crops         = nullif(trim(coalesce(p_main_crops, '')), ''),
    interest_lease     = coalesce(p_interest_lease, false),
    interest_equipment = coalesce(p_interest_equipment, false),
    whatsapp_opt_in    = coalesce(p_whatsapp_opt_in, whatsapp_opt_in),
    whatsapp_opt_in_at = case
      when p_whatsapp_opt_in is true  and whatsapp_opt_in is distinct from true then now()
      when p_whatsapp_opt_in is false then null
      else whatsapp_opt_in_at end,
    preferred_mandi    = coalesce(nullif(trim(coalesce(p_preferred_mandi, '')), ''), preferred_mandi)
  where id = p_actor_id
  returning * into v_profile;
  return v_profile;
end;
$$;
grant execute on function public.update_kisan_profile(uuid, numeric, text, boolean, boolean, boolean, text) to authenticated, anon;

-- --- admin-only export of opted-in users ---
create or replace function public.get_whatsapp_optins(p_actor_id uuid)
returns table (full_name text, phone text, village_town text, pincode text, preferred_mandi text, main_crops text, whatsapp_opt_in_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin(p_actor_id) then raise exception 'not authorized'; end if;
  return query
    select p.full_name, p.phone, p.village_town, p.pincode, p.preferred_mandi, p.main_crops, p.whatsapp_opt_in_at
    from public.profiles p where p.whatsapp_opt_in = true order by p.whatsapp_opt_in_at desc nulls last;
end;
$$;
grant execute on function public.get_whatsapp_optins(uuid) to authenticated;
