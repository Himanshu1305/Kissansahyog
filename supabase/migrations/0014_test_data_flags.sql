-- Kisan Sahyog — 0014 test-data flags + seed_log
--
-- Enables clearly-marked dummy data for demo/testing that can be bulk-deleted
-- later without touching real users. No behavior change: is_test_data defaults to
-- false so all existing rows remain real. seed_log records what was seeded and how
-- to remove it.

alter table public.profiles add column if not exists is_test_data boolean not null default false;
alter table public.listings add column if not exists is_test_data boolean not null default false;

create table if not exists public.seed_log (
  id           serial primary key,
  seed_name    text,
  seeded_at    timestamptz default now(),
  record_count integer,
  notes        text
);
