-- Herzies Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Create table
create table if not exists public.herzies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  friend_code text unique not null,
  appearance jsonb not null default '{}',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1 and level <= 100),
  stage integer not null default 1 check (stage >= 1 and stage <= 3),
  total_minutes_listened real not null default 0 check (total_minutes_listened >= 0),
  genre_minutes jsonb not null default '{}',
  friend_codes text[] not null default '{}',
  last_craving_date text,
  last_craving_genre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create unique index if not exists idx_herzies_user_id on public.herzies(user_id);
create index if not exists idx_herzies_friend_code on public.herzies(friend_code);

-- Enable RLS
alter table public.herzies enable row level security;

-- Drop old policies (safe to run on fresh or existing db since table now exists)
drop policy if exists "Herzies are publicly readable" on public.herzies;
drop policy if exists "Users can insert their own herzie" on public.herzies;
drop policy if exists "Users can update their own herzie" on public.herzies;
drop policy if exists "Anyone can upsert by friend code" on public.herzies;
drop policy if exists "Public friend lookup" on public.herzies;
drop policy if exists "Authenticated users can insert own herzie" on public.herzies;
drop policy if exists "Authenticated users can update own herzie" on public.herzies;

-- SELECT: anyone can look up friend profiles
create policy "Public friend lookup"
  on public.herzies for select
  using (true);

-- INSERT: authenticated users can only create their own herzie
create policy "Authenticated users can insert own herzie"
  on public.herzies for insert
  with check (
    auth.uid() = user_id
    and auth.uid() is not null
  );

-- UPDATE: authenticated users can only update their own herzie
create policy "Authenticated users can update own herzie"
  on public.herzies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No DELETE policy — herzies can't be deleted via the API

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists herzies_updated_at on public.herzies;
create trigger herzies_updated_at
  before update on public.herzies
  for each row
  execute function update_updated_at();
