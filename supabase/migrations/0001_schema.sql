-- Kisan Sahyog — 0001 schema
-- Core tables: lookups (pincodes, crops, equipment_types), profiles, listings.
-- Region-agnostic by design: crops/pincodes carry region/state columns so more
-- regions can be added later with data rows only, no schema change.
--
-- gen_random_uuid() is built into Postgres 17 (pg_catalog); no extension needed.

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------

create table if not exists public.pincodes (
  pincode       text primary key,
  village_town  text,
  district      text,
  state         text,
  latitude      numeric not null,
  longitude     numeric not null
);

create table if not exists public.crops (
  id       serial primary key,
  name_hi  text not null,
  name_en  text not null,
  region   text not null default 'sagar_mp',
  unique (name_en, region)
);

create table if not exists public.equipment_types (
  id       serial primary key,
  name_hi  text not null,
  name_en  text not null,
  unique (name_en)
);

-- ---------------------------------------------------------------------------
-- profiles — application-level user table (NOT Supabase Auth users).
-- MVP auth is custom/trust-based (phone-only, no OTP). See src/lib/auth.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                     uuid primary key default gen_random_uuid(),
  full_name              text not null,
  phone                  text not null unique,
  village_town           text,
  pincode                text not null,
  latitude               numeric,
  longitude              numeric,
  preferred_language     text not null default 'hi'
                           check (preferred_language in ('hi', 'en')),
  disclaimer_accepted_at timestamptz,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- listings — Offers / Requirements across land / equipment / labor.
-- Category-specific fields live in `details` (jsonb); shapes documented in
-- PROJECT_CONTEXT.md and validated in the create_listing RPC + client.
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  listing_type  text not null check (listing_type in ('offer', 'requirement')),
  category      text not null check (category in ('land', 'equipment', 'labor')),
  status        text not null default 'active' check (status in ('active', 'closed')),
  latitude      numeric,
  longitude     numeric,
  pincode       text,
  details       jsonb not null,
  self_declared boolean not null default false,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days'),
  -- A land OFFER must carry an affirmative self-declaration. Enforced at the DB
  -- level (defense-in-depth) in addition to the UI checkbox.
  constraint land_offer_requires_self_declared
    check (self_declared = true or not (category = 'land' and listing_type = 'offer'))
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Browse query: active + unexpired, filtered by category / type.
create index if not exists listings_browse_idx
  on public.listings (category, listing_type, status, expires_at);

-- Bounding-box prefilter for 30km distance search.
create index if not exists listings_geo_idx
  on public.listings (latitude, longitude);

-- My Listings lookup by owner.
create index if not exists listings_user_idx
  on public.listings (user_id);
