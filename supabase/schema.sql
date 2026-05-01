-- Herzies Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Herzies table: stores all herzie profiles
create table if not exists public.herzies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  friend_code text unique not null,
  appearance jsonb not null default '{}',
  xp integer not null default 0,
  level integer not null default 1,
  stage integer not null default 1,
  total_minutes_listened real not null default 0,
  genre_minutes jsonb not null default '{}',
  friend_codes text[] not null default '{}',
  last_craving_date text,
  last_craving_genre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for friend code lookups
create index if not exists idx_herzies_friend_code on public.herzies(friend_code);
create index if not exists idx_herzies_user_id on public.herzies(user_id);

-- Row Level Security
alter table public.herzies enable row level security;

-- Anyone can read herzies (for friend lookups)
create policy "Herzies are publicly readable"
  on public.herzies for select
  using (true);

-- Users can insert their own herzie
create policy "Users can insert their own herzie"
  on public.herzies for insert
  with check (auth.uid() = user_id);

-- Users can update their own herzie
create policy "Users can update their own herzie"
  on public.herzies for update
  using (auth.uid() = user_id);

-- Also allow upsert by friend_code for anonymous/offline registration
create policy "Anyone can upsert by friend code"
  on public.herzies for insert
  with check (user_id is null);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger herzies_updated_at
  before update on public.herzies
  for each row
  execute function update_updated_at();
