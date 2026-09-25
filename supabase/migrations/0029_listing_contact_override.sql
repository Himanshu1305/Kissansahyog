-- 0029_listing_contact_override.sql — Part B Phase 3b
-- Allow an OPTIONAL per-listing contact number (details.contact_phone) to override the
-- poster's profile phone when a farmer wants a different number for a specific listing
-- (e.g. a family member's). Blank/absent → fall back to the profile phone, unchanged.
create or replace function public.get_listing_contact(p_listing_id uuid)
returns table (full_name text, phone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select p.full_name,
         coalesce(nullif(trim(l.details->>'contact_phone'), ''), p.phone) as phone
  from public.listings l
  join public.profiles p on p.id = l.user_id
  where l.id = p_listing_id
    and l.status = 'active'
    and l.expires_at > now();
  if not found then
    raise exception 'not_available';
  end if;
end;
$$;
