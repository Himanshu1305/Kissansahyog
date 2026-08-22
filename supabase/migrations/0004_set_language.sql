-- Kisan Sahyog — 0004 set_language RPC
-- Persists a user's preferred language to their profile so it survives a
-- logout/login cycle (login reloads the profile from the DB). Owner-scoped:
-- only updates the row whose id == p_actor_id.

create or replace function public.set_language(p_actor_id uuid, p_language text)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_language not in ('hi', 'en') then
    raise exception 'invalid_language';
  end if;
  update public.profiles
    set preferred_language = p_language
    where id = p_actor_id
    returning * into v_profile;
  if not found then
    raise exception 'not_found';
  end if;
  return v_profile;
end;
$$;

grant execute on function public.set_language(uuid, text) to anon;
