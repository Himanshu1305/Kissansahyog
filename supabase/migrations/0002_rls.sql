-- Kisan Sahyog — 0002 Row Level Security + grants
--
-- AUTH MODEL (read before editing): MVP auth is custom/trust-based. Every app
-- request reaches the DB as the shared `anon` role (there is no per-user JWT
-- until Phase 2 OTP). Therefore:
--   * anon may READ active, unexpired listings and all lookup tables.
--   * anon may NOT directly write listings/profiles, and may NOT read profiles
--     wholesale (prevents dumping every user's phone number).
--   * All writes + the phone-reveal go through SECURITY DEFINER RPCs
--     (see 0003_functions.sql) which enforce ownership by the actor id passed in.
--
-- When Phase 2 real auth lands, swap the RPC actor-id argument for auth.uid()
-- and add auth.uid()-based row policies — see PROJECT_CONTEXT.md.

-- Schema usage (Supabase grants these by default; assert them explicitly).
grant usage on schema public to anon;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table (default-deny once enabled).
-- ---------------------------------------------------------------------------
alter table public.pincodes        enable row level security;
alter table public.crops           enable row level security;
alter table public.equipment_types enable row level security;
alter table public.profiles        enable row level security;
alter table public.listings        enable row level security;

-- ---------------------------------------------------------------------------
-- Lookup tables: public read, no anon writes.
-- ---------------------------------------------------------------------------
grant select on public.pincodes, public.crops, public.equipment_types to anon;

drop policy if exists pincodes_read on public.pincodes;
create policy pincodes_read on public.pincodes for select to anon using (true);

drop policy if exists crops_read on public.crops;
create policy crops_read on public.crops for select to anon using (true);

drop policy if exists equipment_types_read on public.equipment_types;
create policy equipment_types_read on public.equipment_types for select to anon using (true);

-- ---------------------------------------------------------------------------
-- listings: anon may read ONLY active + unexpired rows. No direct writes.
-- (Closed/expired rows are reachable by their owner via get_my_listings RPC.)
-- ---------------------------------------------------------------------------
grant select on public.listings to anon;

drop policy if exists listings_read_active on public.listings;
create policy listings_read_active on public.listings
  for select to anon
  using (status = 'active' and expires_at > now());

-- No INSERT/UPDATE/DELETE policies for anon on listings => all direct writes denied.

-- ---------------------------------------------------------------------------
-- profiles: fully locked to anon (no direct read/write). All access via RPCs.
-- ---------------------------------------------------------------------------
-- No grants, no policies for anon => every direct anon access is denied.
