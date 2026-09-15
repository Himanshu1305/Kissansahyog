-- Kisan Sahyog — 0011 (Phase 3) profile edit + account deletion RPCs
--
-- Both SECURITY DEFINER and owner-scoped by the passed profile id (same trust
-- model as the rest of the RPC surface). update_profile re-derives coordinates
-- from the (possibly changed) pincode. delete_account removes the profile, whose
-- listings cascade via the existing FK (listings.user_id -> profiles on delete cascade).

create or replace function public.update_profile(
  p_actor_id     uuid,
  p_full_name    text,
  p_village_town text,
  p_pincode      text,
  p_language     text
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor   public.profiles%rowtype;
  v_pin     public.pincodes%rowtype;
  v_lang    text;
  v_profile public.profiles%rowtype;
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  select * into v_pin from public.pincodes where pincode = p_pincode;
  if not found then
    raise exception 'pincode_not_found';
  end if;
  v_lang := case when p_language in ('hi', 'en') then p_language else v_actor.preferred_language end;

  update public.profiles set
    full_name          = trim(p_full_name),
    village_town       = nullif(trim(coalesce(p_village_town, '')), ''),
    pincode            = p_pincode,
    latitude           = v_pin.latitude,
    longitude          = v_pin.longitude,
    preferred_language = v_lang
  where id = p_actor_id
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.delete_account(p_actor_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  select true into v_exists from public.profiles where id = p_actor_id;
  if not found then
    raise exception 'not_authorized';
  end if;
  delete from public.profiles where id = p_actor_id; -- cascades listings
  return true;
end;
$$;

grant execute on function public.update_profile(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_account(uuid) to anon, authenticated;
